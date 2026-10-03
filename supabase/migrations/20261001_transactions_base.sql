-- Base table for the transaction CRUD API. RoastScan metadata is added separately.
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  amount numeric not null check (amount > 0),
  type text not null check (type in ('income', 'expense')),
  category text not null default 'Other',
  transaction_date date not null default current_date,
  description text,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

create index if not exists transactions_user_transaction_date_idx
  on public.transactions (user_id, transaction_date desc);

create index if not exists transactions_user_created_at_idx
  on public.transactions (user_id, created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'transactions'
      and policyname = 'Users manage own transactions'
  ) then
    create policy "Users manage own transactions"
      on public.transactions
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;
