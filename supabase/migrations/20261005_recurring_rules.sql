-- Recurring rules describe future transactions without creating them yet.
create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  amount numeric not null check (amount > 0),
  category text not null default 'Other',
  type text not null check (type in ('income', 'expense')),
  frequency text not null default 'monthly',
  day_of_month integer check (day_of_month between 1 and 31),
  next_date date not null,
  is_active boolean not null default true,
  account_id uuid references public.accounts(id) on delete set null
);

alter table public.recurring_rules enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'recurring_rules'
      and policyname = 'Users manage own recurring rules'
  ) then
    create policy "Users manage own recurring rules"
      on public.recurring_rules
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;
