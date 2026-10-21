-- =============================================================================
-- Debts grouped by person
--
-- * debt_people: one row per person (names unique per user, case-insensitive)
-- * debts.person_id replaces the free-text debts.person
-- * debt_payments belong to a person + kind (taken/given) instead of one debt,
--   so a person can lend/borrow many times and be paid back in installments
-- * a deferred trigger keeps payments <= debts for every person and kind
--
-- Existing data is migrated: people are created from distinct debt names and
-- each payment inherits the person and kind of the debt it was linked to.
-- Run once in Supabase Dashboard > SQL Editor after the initial migration.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- debt_people
-- -----------------------------------------------------------------------------
create table public.debt_people (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  name       text not null check (length(trim(name)) between 1 and 100),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create unique index debt_people_user_name_key on public.debt_people (user_id, lower(trim(name)));

alter table public.debt_people enable row level security;

create policy "debt_people: owner select" on public.debt_people
  for select to authenticated using (user_id = (select auth.uid()));
create policy "debt_people: owner insert" on public.debt_people
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "debt_people: owner update" on public.debt_people
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "debt_people: owner delete" on public.debt_people
  for delete to authenticated using (user_id = (select auth.uid()));

-- One person per distinct (case-insensitive) name already used in debts.
insert into public.debt_people (user_id, name, created_at)
select distinct on (user_id, lower(trim(person)))
       user_id, trim(person), created_at
  from public.debts
 order by user_id, lower(trim(person)), created_at;

-- -----------------------------------------------------------------------------
-- Old guard and views depend on the columns being replaced
-- -----------------------------------------------------------------------------
drop view public.debt_balances;
drop view public.pool_totals;
drop trigger debt_payments_not_overpaid on public.debt_payments;
drop trigger debts_not_below_paid on public.debts;
drop function public.check_debt_not_overpaid();

-- -----------------------------------------------------------------------------
-- debts: person_id (+ optional note) instead of person text
-- -----------------------------------------------------------------------------
alter table public.debts
  add column person_id uuid,
  add column note text check (length(note) <= 500);

update public.debts d
   set person_id = p.id
  from public.debt_people p
 where p.user_id = d.user_id
   and lower(trim(p.name)) = lower(trim(d.person));

alter table public.debts
  alter column person_id set not null,
  add constraint debts_person_fkey
    foreign key (person_id, user_id) references public.debt_people (id, user_id) on delete cascade,
  drop column person;

-- -----------------------------------------------------------------------------
-- debt_payments: person_id + kind instead of debt_id
-- -----------------------------------------------------------------------------
alter table public.debt_payments
  add column person_id uuid,
  add column kind text check (kind in ('taken', 'given'));

update public.debt_payments pay
   set person_id = d.person_id,
       kind = d.kind
  from public.debts d
 where d.id = pay.debt_id;

alter table public.debt_payments
  alter column person_id set not null,
  alter column kind set not null,
  add constraint debt_payments_person_fkey
    foreign key (person_id, user_id) references public.debt_people (id, user_id) on delete cascade,
  drop column debt_id;

create index debts_person_kind_idx         on public.debts (person_id, kind);
create index debt_payments_person_kind_idx on public.debt_payments (person_id, kind);

-- -----------------------------------------------------------------------------
-- Guard: for every person and kind, total paid <= total borrowed/lent.
-- Deferred to commit so cascades (deleting a person or the account) never trip it.
-- -----------------------------------------------------------------------------
create function public.check_person_balance()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_person uuid;
  v_kind   text;
  v_total  numeric;
  v_paid   numeric;
begin
  for v_person, v_kind in
    select x.person_id, x.kind
      from (values
        (case when tg_op <> 'INSERT' then old.person_id end, case when tg_op <> 'INSERT' then old.kind end),
        (case when tg_op <> 'DELETE' then new.person_id end, case when tg_op <> 'DELETE' then new.kind end)
      ) as x(person_id, kind)
     where x.person_id is not null
  loop
    select coalesce(sum(amount_pkr), 0) into v_total
      from public.debts where person_id = v_person and kind = v_kind;
    select coalesce(sum(amount_pkr), 0) into v_paid
      from public.debt_payments where person_id = v_person and kind = v_kind;
    if v_paid > v_total then
      if tg_table_name = 'debt_payments' then
        raise exception 'Payment is more than the remaining amount' using errcode = 'P0001';
      else
        raise exception 'Payments for this person are more than the debt. Remove a payment first.' using errcode = 'P0001';
      end if;
    end if;
  end loop;
  return null;
end;
$$;

create constraint trigger debt_payments_within_debt
  after insert or update or delete on public.debt_payments
  deferrable initially deferred
  for each row execute function public.check_person_balance();

create constraint trigger debts_cover_payments
  after insert or update or delete on public.debts
  deferrable initially deferred
  for each row execute function public.check_person_balance();

-- -----------------------------------------------------------------------------
-- Views (security_invoker so RLS applies)
-- -----------------------------------------------------------------------------

-- Same as before, except the debt pool is used by payments on debts you took.
create view public.pool_totals
with (security_invoker = true) as
with allocated as (
  select user_id, 'charity' as pool,
         sum(charity_qar) as allocated_qar,
         sum(round(charity_qar * rate_qar_pkr, 2)) as allocated_pkr
    from public.sends group by user_id
  union all
  select user_id, 'debt', sum(debt_qar), sum(round(debt_qar * rate_qar_pkr, 2))
    from public.sends group by user_id
  union all
  select user_id, 'installments', sum(installments_qar), sum(round(installments_qar * rate_qar_pkr, 2))
    from public.sends group by user_id
  union all
  select user_id, 'others', sum(others_qar), sum(round(others_qar * rate_qar_pkr, 2))
    from public.sends group by user_id
),
used as (
  select user_id, 'charity' as pool, sum(amount_pkr) as used_pkr
    from public.charity_entries group by user_id
  union all
  select user_id, 'debt', sum(amount_pkr)
    from public.debt_payments where kind = 'taken' group by user_id
  union all
  select user_id, 'installments', sum(amount_pkr)
    from public.installments group by user_id
  union all
  select user_id, 'others', sum(amount_pkr)
    from public.other_entries group by user_id
)
select
  coalesce(a.user_id, u.user_id)                         as user_id,
  coalesce(a.pool, u.pool)                               as pool,
  coalesce(a.allocated_qar, 0)                           as allocated_qar,
  coalesce(a.allocated_pkr, 0)                           as allocated_pkr,
  coalesce(u.used_pkr, 0)                                as used_pkr,
  coalesce(a.allocated_pkr, 0) - coalesce(u.used_pkr, 0) as remaining_pkr
from allocated a
full join used u on u.user_id = a.user_id and u.pool = a.pool;

-- Per person and kind: total, paid, remaining and activity dates.
create view public.debt_balances
with (security_invoker = true) as
select
  p.id                                           as person_id,
  p.user_id,
  p.name,
  d.kind,
  d.total_pkr,
  coalesce(pay.paid_pkr, 0)                      as paid_pkr,
  d.total_pkr - coalesce(pay.paid_pkr, 0)        as remaining_pkr,
  d.entries,
  d.first_date,
  greatest(d.last_date, pay.last_paid)           as last_activity
from public.debt_people p
join (
  select person_id, kind, sum(amount_pkr) as total_pkr, count(*) as entries,
         min(debt_date) as first_date, max(debt_date) as last_date
    from public.debts group by person_id, kind
) d on d.person_id = p.id
left join (
  select person_id, kind, sum(amount_pkr) as paid_pkr, max(paid_on) as last_paid
    from public.debt_payments group by person_id, kind
) pay on pay.person_id = p.id and pay.kind = d.kind;

grant select on public.pool_totals, public.debt_balances to authenticated;
revoke all on public.pool_totals, public.debt_balances from anon;
