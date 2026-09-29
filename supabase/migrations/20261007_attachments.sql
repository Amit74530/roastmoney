-- Receipt files are stored privately under <user-id>/<filename> in the receipts bucket.
create table if not exists public.transaction_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  transaction_id uuid references public.transactions(id) on delete cascade not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint check (size_bytes >= 0),
  created_at timestamptz not null default now()
);

alter table public.transaction_attachments enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'transaction_attachments'
      and policyname = 'Users manage own transaction attachments'
  ) then
    create policy "Users manage own transaction attachments"
      on public.transaction_attachments
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users manage own receipt objects'
  ) then
    create policy "Users manage own receipt objects"
      on storage.objects
      for all
      using (
        bucket_id = 'receipts'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id = 'receipts'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end
$$;
