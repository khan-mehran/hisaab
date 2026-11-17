-- When the user last pressed "Clear month" on each page, keyed by section
-- (expenses, sent, charity, installments, others, personal-savings,
-- family-savings). Entries created at or before that time are shown under
-- History instead of on the page. Nothing is deleted or moved.
alter table public.profiles
  add column history_cleared_at jsonb not null default '{}'::jsonb;
