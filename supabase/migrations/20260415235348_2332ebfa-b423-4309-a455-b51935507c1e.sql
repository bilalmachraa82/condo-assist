-- 1. Extensão moddatetime
create extension if not exists moddatetime;

-- 2. Tabela condominium_contacts (deny-all RLS, service role bypassa nativamente)
create table condominium_contacts (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references buildings(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  phone text,
  fraction text,
  role text check (role in ('owner','tenant','admin','other')) default 'owner',
  is_primary_contact boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index condominium_contacts_email_idx on condominium_contacts (lower(email));
create index condominium_contacts_building_idx on condominium_contacts (building_id);
alter table condominium_contacts enable row level security;
-- Deny-all by default. Service role (Edge Functions with SUPABASE_SERVICE_ROLE_KEY) bypasses RLS automatically.
-- When admin UI access is needed, add explicit policy with role verification.

create trigger set_condominium_contacts_updated_at before update on condominium_contacts
  for each row execute function moddatetime(updated_at);

-- 3. assistances.source
alter table assistances add column if not exists source text
  check (source in ('manual','email_agent','phone_agent','web_form')) default 'manual';

-- 4. assistances idempotency (Blocker 3 + v2-D TTL)
alter table assistances add column if not exists idempotency_key text;
alter table assistances add column if not exists idempotency_key_expires_at timestamptz;
create unique index if not exists assistances_idempotency_key_idx on assistances (idempotency_key) where idempotency_key is not null;

-- 5. email_logs — AI draft columns + idempotency (v2-C + v2-D)
alter table email_logs add column if not exists ai_draft_status text
  check (ai_draft_status in ('pending_review','approved','rejected','sent','auto_sent'));
alter table email_logs add column if not exists approved_by uuid references profiles(id);
alter table email_logs add column if not exists approved_at timestamptz;
alter table email_logs add column if not exists idempotency_key text;
alter table email_logs add column if not exists idempotency_key_expires_at timestamptz;
create unique index if not exists email_logs_idempotency_key_idx on email_logs (idempotency_key) where idempotency_key is not null;

-- 6. Rate limit table (deny-all RLS, api_key_hash stores SHA-256)
create table agent_api_rate_limit (
  api_key_hash text not null,
  request_at timestamptz not null default now()
);
create index agent_api_rate_limit_lookup_idx on agent_api_rate_limit (api_key_hash, request_at desc);
alter table agent_api_rate_limit enable row level security;
-- Deny-all by default. Service role bypasses RLS automatically.

-- 7. v2-E — Drop permissive INSERT policies on email_logs and security_events
-- These WITH CHECK (true) policies allow ANY role (including anon) to insert arbitrary records.
-- Service role already bypasses RLS, so Edge Functions continue working without explicit policies.
drop policy if exists "System can insert email logs" on public.email_logs;
create policy "Admins can insert email logs" on public.email_logs
  for insert to authenticated
  with check (public.is_admin(auth.uid()));

drop policy if exists "System can insert security events" on public.security_events;
create policy "Admins can insert security events" on public.security_events
  for insert to authenticated
  with check (public.is_admin(auth.uid()));