-- Accounts group transactions without requiring an account assignment.
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null default 'cash',
  balance numeric not null default 0,
  currency text not null default 'INR',
  color text,
  is_default boolean not null default false
);

alter table public.accounts enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'accounts'
      and policyname = 'Users manage own accounts'
  ) then
    create policy "Users manage own accounts"
      on public.accounts
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

alter table public.transactions
  add column if not exists account_id uuid references public.accounts(id) on delete set null;
