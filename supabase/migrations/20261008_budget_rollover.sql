-- Rollover settings are stored now; rollover processing is implemented separately.
alter table public.budgets
  add column if not exists rollover boolean not null default false,
  add column if not exists alert_threshold integer not null default 80;
