# RoastScan Phase 2 — Supabase setup

RoastScan sends a compressed screenshot from the signed-in Android app to the `roastscan-extract` Edge Function. The function calls a vision model with a **server-side** `OPENAI_API_KEY`. The React app and APK never receive that key.

## 1. Apply the database migration

In the Supabase SQL editor, run:

`supabase/migrations/20260905_roastscan_transaction_fields.sql`

This only **adds nullable columns** to `public.transactions`:

- `merchant`
- `payment_method`
- `reference_id`
- `transaction_time`
- `source`
- `scan_confidence`

Existing CRUD keeps working if these columns are absent, as long as the client does not send them. RoastScan save **requires** the migration.

## 2. Deploy the Edge Function

```bash
supabase functions deploy roastscan-extract
```

`verify_jwt` is enabled in `supabase/config.toml`.

## 3. Set secrets (dashboard or CLI)

```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

Do not put this value in the frontend, Capacitor config, or git.

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are provided automatically to Edge Functions.

## 4. Frontend env (optional)

If you are not using the existing public anon fallback in `supabaseClient.js`:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The anon key is a public client key. It is not the OpenAI secret.
