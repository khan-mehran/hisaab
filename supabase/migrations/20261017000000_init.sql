-- =============================================================================
-- Expense Tracker: initial schema
--
-- Every user-owned table:
--   * has user_id defaulting to auth.uid(), so clients never send it
--   * has Row Level Security enabled with a single owner-only policy
--   * cascades on account deletion (auth.users -> everything)
--
-- Run this whole file once in Supabase Dashboard > SQL Editor, or with
-- `supabase db push` if you use the Supabase CLI.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- profiles: one row per auth user (id = auth.users.id)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id              uuid primary key references auth.users on delete cascade,
  name            text not null default '',
  phone           text unique,
  salary_currency text not null default 'QAR' check (salary_currency in ('QAR', 'PKR', 'USD')),
  -- en-US = 1,234,567 ; en-IN = 12,34,567 (lakh grouping, common in Pakistan)
  number_locale   text not null default 'en-US' check (number_locale in ('en-US', 'en-IN')),
  created_at      timestamptz not null default now()
);

-- Create the profile automatically on signup from the metadata passed to
-- supabase.auth.signUp({ options: { data: { name, phone } } }).
-- Runs as definer so it works before the user has a session.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- incomes: salary per month (month = first day of the month)
-- -----------------------------------------------------------------------------
create table public.incomes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  month        date not null check (extract(day from month) = 1),
  amount       numeric(14,2) not null check (amount > 0),
  currency     text not null default 'QAR' check (currency in ('QAR', 'PKR', 'USD')),
  -- Salary converted to QAR at save time, so balance maths is always in QAR.
  amount_qar   numeric(14,2) not null check (amount_qar > 0),
  rate_qar_pkr numeric(14,6) not null check (rate_qar_pkr > 0),
  created_at   timestamptz not null default now(),
  unique (user_id, month)
);

-- -----------------------------------------------------------------------------
-- exchange_rates: global cache, readable by signed-in users, written only
-- through record_exchange_rate() below.
-- -----------------------------------------------------------------------------
create table public.exchange_rates (
  id         uuid primary key default gen_random_uuid(),
  base       text not null,
  quote      text not null,
  rate       numeric(14,6) not null check (rate > 0),
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- expenses
-- -----------------------------------------------------------------------------
create table public.expenses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  period     text not null check (period in ('daily', 'weekly', 'monthly')),
  date_from  date not null,
  date_to    date,  -- only used for weekly
  category   text not null check (length(trim(category)) between 1 and 60),
  amount_qar numeric(14,2) not null check (amount_qar > 0),
  reason     text check (length(reason) <= 500),
  created_at timestamptz not null default now(),
  check (
    (period = 'weekly' and date_to is not null and date_to >= date_from)
    or (period <> 'weekly' and date_to is null)
  )
);

-- -----------------------------------------------------------------------------
-- sends: money sent home, with optional allocations (all in QAR)
-- -----------------------------------------------------------------------------
create table public.sends (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users on delete cascade,
  sent_date        date not null,
  amount_qar       numeric(14,2) not null check (amount_qar > 0),
  charity_qar      numeric(14,2) not null default 0 check (charity_qar >= 0),
  debt_qar         numeric(14,2) not null default 0 check (debt_qar >= 0),
  installments_qar numeric(14,2) not null default 0 check (installments_qar >= 0),
  others_qar       numeric(14,2) not null default 0 check (others_qar >= 0),
  bank             text not null check (bank in ('BAHL', 'HBL', 'ABL')),
  -- Rate locked at the time of sending so history never changes.
  rate_qar_pkr     numeric(14,6) not null check (rate_qar_pkr > 0),
  created_at       timestamptz not null default now(),
  check (charity_qar + debt_qar + installments_qar + others_qar <= amount_qar),
  -- Lets child tables reference (id, user_id) so they can't point at another user's send.
  unique (id, user_id)
);

-- -----------------------------------------------------------------------------
-- family_transfers: how the family portion was split (PKR)
-- -----------------------------------------------------------------------------
create table public.family_transfers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users on delete cascade,
  send_id       uuid,
  relation      text not null check (relation in ('Father', 'Mother', 'My Family', 'Brother')),
  amount_pkr    numeric(14,2) not null check (amount_pkr > 0),
  transfer_date date not null,
  created_at    timestamptz not null default now(),
  foreign key (send_id, user_id) references public.sends (id, user_id) on delete cascade
);

-- -----------------------------------------------------------------------------
-- charity_entries (PKR)
-- -----------------------------------------------------------------------------
create table public.charity_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  entry_date   date not null,
  name         text not null check (length(trim(name)) between 1 and 100),
  amount_pkr   numeric(14,2) not null check (amount_pkr > 0),
  relationship text not null check (relationship in ('Relative', 'Neighbour', 'Other')),
  created_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- debts and debt_payments (PKR)
-- -----------------------------------------------------------------------------
create table public.debts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  kind       text not null check (kind in ('taken', 'given')),
  person     text not null check (length(trim(person)) between 1 and 100),
  amount_pkr numeric(14,2) not null check (amount_pkr > 0),
  debt_date  date not null,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.debt_payments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  debt_id    uuid not null,
  amount_pkr numeric(14,2) not null check (amount_pkr > 0),
  paid_on    date not null,
  created_at timestamptz not null default now(),
  foreign key (debt_id, user_id) references public.debts (id, user_id) on delete cascade
);

-- Guard: total payments can never exceed the debt amount. Also blocks
-- lowering a debt's amount below what has already been paid.
create function public.check_debt_not_overpaid()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_debt_id uuid;
  v_amount  numeric;
  v_paid    numeric;
begin
  -- Separate branches: NEW has no debt_id column when fired from debts.
  if tg_table_name = 'debts' then
    v_debt_id := new.id;
  else
    v_debt_id := new.debt_id;
  end if;
  select d.amount_pkr into v_amount from public.debts d where d.id = v_debt_id;
  select coalesce(sum(p.amount_pkr), 0) into v_paid
    from public.debt_payments p where p.debt_id = v_debt_id;
  if v_paid > v_amount then
    raise exception 'Payment exceeds remaining debt' using errcode = 'P0001';
  end if;
  return null;
end;
$$;

create constraint trigger debt_payments_not_overpaid
  after insert or update on public.debt_payments
  deferrable initially immediate
  for each row execute function public.check_debt_not_overpaid();

create constraint trigger debts_not_below_paid
  after update of amount_pkr on public.debts
  deferrable initially immediate
  for each row execute function public.check_debt_not_overpaid();

-- -----------------------------------------------------------------------------
-- installments, other_entries (PKR)
-- -----------------------------------------------------------------------------
create table public.installments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  entry_date date not null,
  title      text not null check (length(trim(title)) between 1 and 100),
  amount_pkr numeric(14,2) not null check (amount_pkr > 0),
  note       text check (length(note) <= 500),
  created_at timestamptz not null default now()
);

create table public.other_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  entry_date date not null,
  batch_id   uuid not null,  -- groups rows saved together from one modal
  label      text not null check (length(trim(label)) between 1 and 100),
  amount_pkr numeric(14,2) not null check (amount_pkr > 0),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- savings (QAR)
-- -----------------------------------------------------------------------------
create table public.savings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  kind       text not null check (kind in ('personal', 'family')),
  saved_date date not null,
  amount_qar numeric(14,2) not null check (amount_qar > 0),
  bank       text not null check (bank in ('BAHL', 'HBL', 'ABL')),
  created_at timestamptz not null default now()
);

-- =============================================================================
-- Indexes
-- =============================================================================
create index incomes_user_month_idx          on public.incomes (user_id, month desc);
create index exchange_rates_pair_idx         on public.exchange_rates (base, quote, fetched_at desc);
create index expenses_user_date_idx          on public.expenses (user_id, date_from);
create index expenses_user_period_idx        on public.expenses (user_id, period, date_from);
create index sends_user_date_idx             on public.sends (user_id, sent_date);
create index family_transfers_user_date_idx  on public.family_transfers (user_id, transfer_date);
create index family_transfers_send_idx       on public.family_transfers (send_id);
create index charity_entries_user_date_idx   on public.charity_entries (user_id, entry_date);
create index debts_user_kind_date_idx        on public.debts (user_id, kind, debt_date);
create index debt_payments_user_date_idx     on public.debt_payments (user_id, paid_on);
create index debt_payments_debt_idx          on public.debt_payments (debt_id);
create index installments_user_date_idx      on public.installments (user_id, entry_date);
create index other_entries_user_date_idx     on public.other_entries (user_id, entry_date);
create index savings_user_kind_date_idx      on public.savings (user_id, kind, saved_date);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles         enable row level security;
alter table public.incomes          enable row level security;
alter table public.exchange_rates   enable row level security;
alter table public.expenses         enable row level security;
alter table public.sends            enable row level security;
alter table public.family_transfers enable row level security;
alter table public.charity_entries  enable row level security;
alter table public.debts            enable row level security;
alter table public.debt_payments    enable row level security;
alter table public.installments     enable row level security;
alter table public.other_entries    enable row level security;
alter table public.savings          enable row level security;

-- profiles: owner can read and update; inserts come from the signup trigger,
-- deletes from the auth.users cascade.
create policy "profiles: owner select" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: owner update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- exchange_rates: read-only for signed-in users.
create policy "exchange_rates: read" on public.exchange_rates
  for select to authenticated using (true);

-- All other tables: owner-only select / insert / update / delete.
do $$
declare
  t text;
begin
  foreach t in array array[
    'incomes', 'expenses', 'sends', 'family_transfers', 'charity_entries',
    'debts', 'debt_payments', 'installments', 'other_entries', 'savings'
  ]
  loop
    execute format(
      'create policy "%1$s: owner select" on public.%1$I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "%1$s: owner insert" on public.%1$I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "%1$s: owner update" on public.%1$I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "%1$s: owner delete" on public.%1$I for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end;
$$;

-- =============================================================================
-- Functions callable by the app
-- =============================================================================

-- Save a freshly fetched rate. Users can't insert into exchange_rates directly;
-- this function rejects absurd values (more than 25% away from the last saved
-- rate) and writes at most one row per pair every 30 minutes, so a single user
-- can't poison or flood the shared cache.
create function public.record_exchange_rate(p_base text, p_quote text, p_rate numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last public.exchange_rates;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_rate is null or p_rate <= 0 then
    raise exception 'Invalid rate';
  end if;

  select * into v_last from public.exchange_rates
   where base = p_base and quote = p_quote
   order by fetched_at desc limit 1;

  if found then
    if v_last.fetched_at > now() - interval '30 minutes' then
      return;
    end if;
    if abs(p_rate - v_last.rate) / v_last.rate > 0.25 then
      raise exception 'Rate change too large';
    end if;
  end if;

  insert into public.exchange_rates (base, quote, rate, fetched_at)
  values (p_base, p_quote, p_rate, now());
end;
$$;

revoke all on function public.record_exchange_rate(text, text, numeric) from public, anon;
grant execute on function public.record_exchange_rate(text, text, numeric) to authenticated;

-- Delete the signed-in user's account; every table cascades from auth.users.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- =============================================================================
-- Views for totals. security_invoker makes them respect the caller's RLS,
-- so each user only ever sums their own rows.
-- =============================================================================

-- Per-month totals that feed the dashboard balance (all QAR).
-- Expenses are attributed to the month of date_from.
create view public.monthly_totals
with (security_invoker = true) as
select
  user_id,
  month,
  sum(expenses_qar)          as expenses_qar,
  sum(sent_qar)              as sent_qar,
  sum(personal_savings_qar)  as personal_savings_qar,
  sum(family_savings_qar)    as family_savings_qar
from (
  select user_id, date_trunc('month', date_from)::date as month,
         amount_qar as expenses_qar, 0 as sent_qar,
         0 as personal_savings_qar, 0 as family_savings_qar
    from public.expenses
  union all
  select user_id, date_trunc('month', sent_date)::date,
         0, amount_qar, 0, 0
    from public.sends
  union all
  select user_id, date_trunc('month', saved_date)::date,
         0, 0,
         case when kind = 'personal' then amount_qar else 0 end,
         case when kind = 'family'   then amount_qar else 0 end
    from public.savings
) t
group by user_id, month;

-- Pool cards: allocated (from sends, at each send's locked rate) vs used.
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
  -- Debt pool is spent by repaying debts you took.
  select p.user_id, 'debt', sum(p.amount_pkr)
    from public.debt_payments p
    join public.debts d on d.id = p.debt_id and d.kind = 'taken'
   group by p.user_id
  union all
  select user_id, 'installments', sum(amount_pkr)
    from public.installments group by user_id
  union all
  select user_id, 'others', sum(amount_pkr)
    from public.other_entries group by user_id
)
select
  coalesce(a.user_id, u.user_id)                     as user_id,
  coalesce(a.pool, u.pool)                           as pool,
  coalesce(a.allocated_qar, 0)                       as allocated_qar,
  coalesce(a.allocated_pkr, 0)                       as allocated_pkr,
  coalesce(u.used_pkr, 0)                            as used_pkr,
  coalesce(a.allocated_pkr, 0) - coalesce(u.used_pkr, 0) as remaining_pkr
from allocated a
full join used u on u.user_id = a.user_id and u.pool = a.pool;

-- Family portion of each send (amount minus allocations) in PKR, and how much
-- of it has been split in the family table.
create view public.family_portion
with (security_invoker = true) as
select
  s.user_id,
  sum(round((s.amount_qar - s.charity_qar - s.debt_qar - s.installments_qar - s.others_qar)
            * s.rate_qar_pkr, 2)) as portion_pkr,
  coalesce((select sum(f.amount_pkr) from public.family_transfers f
             where f.user_id = s.user_id), 0) as allocated_pkr
from public.sends s
group by s.user_id;

-- Per-debt paid and remaining amounts.
create view public.debt_balances
with (security_invoker = true) as
select
  d.id,
  d.user_id,
  d.kind,
  d.person,
  d.amount_pkr,
  d.debt_date,
  coalesce(sum(p.amount_pkr), 0)                as paid_pkr,
  d.amount_pkr - coalesce(sum(p.amount_pkr), 0) as remaining_pkr
from public.debts d
left join public.debt_payments p on p.debt_id = d.id
group by d.id;

grant select on public.monthly_totals, public.pool_totals,
                public.family_portion, public.debt_balances to authenticated;
revoke all on public.monthly_totals, public.pool_totals,
              public.family_portion, public.debt_balances from anon;
