-- Captured transactions await a user's review before becoming transactions.
create table if not exists public.pending_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  source text not null,
  raw_text text not null,
  package_name text,
  merchant text,
  amount numeric check (amount > 0),
  type text check (type in ('income', 'expense')),
  transaction_date date,
  transaction_time text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.pending_transactions enable row level security;

create index if not exists pending_transactions_user_status_idx
  on public.pending_transactions (user_id, status);

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pending_transactions'
      and policyname = 'Users manage own pending transactions'
  ) then
    create policy "Users manage own pending transactions"
      on public.pending_transactions
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;
