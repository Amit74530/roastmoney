-- RoastScan Phase 2: optional metadata on existing transactions.
-- Apply in the Supabase SQL editor or with `supabase db push`.
-- Safe to re-run: uses IF NOT EXISTS / nullable columns only.

alter table public.transactions
  add column if not exists merchant text,
  add column if not exists payment_method text,
  add column if not exists reference_id text,
  add column if not exists transaction_time text,
  add column if not exists source text,
  add column if not exists scan_confidence numeric;

comment on column public.transactions.merchant is 'Payee or merchant name from RoastScan or manual entry.';
comment on column public.transactions.payment_method is 'UPI, Card, Net banking, Wallet, Cash, or Other.';
comment on column public.transactions.reference_id is 'UPI/UTR/transaction reference when present.';
comment on column public.transactions.transaction_time is 'Local time HH:MM when known.';
comment on column public.transactions.source is 'manual or roastscan.';
comment on column public.transactions.scan_confidence is 'RoastScan extractor confidence from 0 to 1.';
