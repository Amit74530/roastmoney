create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category text not null,
  monthly_limit numeric not null check (monthly_limit > 0),
  period_month date not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, category, period_month)
);

create index budgets_user_period_idx
  on public.budgets (user_id, period_month);

alter table public.budgets enable row level security;

create policy "Users manage own budgets"
  on public.budgets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on column public.budgets.period_month is
  'First day of the month this budget applies to. e.g. 2026-10-01';