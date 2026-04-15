

## Plano Final: 12 Pontos de Correcção (3 Blockers + 4 Menores + 5 v2)

### Resultados da Auditoria

**RLS:** Todas as 21 tabelas têm `rowsecurity=true`. OK.

**Policies permissivas (qual=true ou with_check=true):**
1. `email_logs` — `"System can insert email logs"` WITH CHECK (true) — **v2-E confirmado**
2. `security_events` — `"System can insert security events"` WITH CHECK (true) — mesma vulnerabilidade
3. `intervention_types` — `"Everyone can view intervention types"` USING (true) — aceitável (dados não sensíveis, readonly)

**Profiles:** Existe com `id uuid NOT NULL` — FK `approved_by uuid references profiles(id)` é segura.

**moddatetime:** Extensão NÃO instalada — precisa de `create extension if not exists moddatetime`.

---

### Migração SQL (1 ficheiro)

```sql
-- 1. Extensão moddatetime (Ajuste menor 2)
create extension if not exists moddatetime;

-- 2. Tabela condominium_contacts (Blocker 1 — deny-all, sem policy explícita)
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
-- Deny-all. Service role bypassa RLS nativamente.
create trigger set_updated_at before update on condominium_contacts
  for each row execute function moddatetime(updated_at);

-- 3. assistances.source
alter table assistances add column if not exists source text
  check (source in ('manual','email_agent','phone_agent','web_form')) default 'manual';

-- 4. assistances.idempotency_key (Blocker 3 + v2-D)
alter table assistances add column if not exists idempotency_key text;
alter table assistances add column if not exists idempotency_key_expires_at timestamptz;
create unique index on assistances (idempotency_key) where idempotency_key is not null;

-- 5. email_logs — AI columns + idempotency (v2-C + v2-D)
alter table email_logs add column if not exists ai_draft_status text
  check (ai_draft_status in ('pending_review','approved','rejected','sent','auto_sent'));
alter table email_logs add column if not exists approved_by uuid references profiles(id);
alter table email_logs add column if not exists approved_at timestamptz;
alter table email_logs add column if not exists idempotency_key text;
alter table email_logs add column if not exists idempotency_key_expires_at timestamptz;
create unique index on email_logs (idempotency_key) where idempotency_key is not null;

-- 6. Rate limit table (Blocker 1 — deny-all, Blocker 2 — coluna é hash)
create table agent_api_rate_limit (
  api_key_hash text not null,
  request_at timestamptz not null default now()
);
create index on agent_api_rate_limit (api_key_hash, request_at desc);
alter table agent_api_rate_limit enable row level security;
-- Deny-all. Service role bypassa RLS nativamente.

-- 7. v2-E — Dropar policies permissivas perigosas
drop policy if exists "System can insert email logs" on public.email_logs;
create policy "Admins can insert email logs" on public.email_logs
  for insert to authenticated
  with check (public.is_admin(auth.uid()));

drop policy if exists "System can insert security events" on public.security_events;
create policy "Admins can insert security events" on public.security_events
  for insert to authenticated
  with check (public.is_admin(auth.uid()));
```

---

### Edge Function `agent-api/index.ts` (~500 linhas)

Uma única função com router interno. Implementa todos os 12 pontos:

**Auth (Correcção 2 — dual headers):**
- Aceita `Authorization: Bearer <key>` E `x-api-key`
- Valida contra `EXTERNAL_API_KEY`

**Rate limit (Blocker 2 — hash real):**
- SHA-256 do token via `crypto.subtle.digest`
- Insert em `agent_api_rate_limit`, count últimos 60s, 429 se > 100
- Sem cleanup probabilístico (removido conforme ajuste menor 1)

**PII masking (Correcção 4):**
- Helper `maskPII()` usado em todos os `console.error`

**Input validation (Ajuste menor 4):**
- Helper `requireString()` para campos obrigatórios

**10 Endpoints:**

| # | Método | Path | Notas |
|---|--------|------|-------|
| 1 | GET | `/v1/health` | Sem auth |
| 2 | POST | `/v1/lookup-building-by-email` | Query `condominium_contacts` case-insensitive |
| 3 | GET | `/v1/buildings/:id/assistances` | Filtro `status=open/closed/exacto` |
| 4 | GET | `/v1/assistances/:id` | **Promise.all** para queries paralelas (Correcção 3) |
| 5 | GET | `/v1/intervention-types` | Lista simples |
| 6 | POST | `/v1/assistances` | **Idempotency-Key header** (Blocker 3) + TTL 24h (v2-D) |
| 7 | POST | `/v1/assistances/:id/communications` | sender_type `ai_agent` |
| 8 | POST | `/v1/assistances/:id/email-log` | **Idempotency obrigatória** (v2-C) + TTL |
| 9 | PATCH | `/v1/email-log/:id/status` | approved/rejected/sent/auto_sent |
| 10 | POST | `/v1/import-contacts` | Upsert por `lower(email)`, 1:1 building MVP |

---

### Cron job para cleanup (Ajuste menor 1 + v2-D)

Via SQL insert (não migração):
```sql
select cron.schedule('cleanup-rate-limit', '0 3 * * *',
  $$delete from agent_api_rate_limit where request_at < now() - interval '24 hours'$$);

select cron.schedule('cleanup-idempotency', '0 4 * * *', $$
  update assistances set idempotency_key = null where idempotency_key_expires_at < now();
  update email_logs set idempotency_key = null where idempotency_key_expires_at < now();
$$);
```

---

### Ficheiros de teste

1. **`supabase/functions/agent-api/test-api.http`** — REST Client VSCode com variáveis `@API_URL` e `@API_KEY`, 10 endpoints documentados
2. **`scripts/test-api.sh`** — bash + curl, testa 200/201/401/429, exit 1 em falha

---

### Checklist dos 12 pontos

| # | Ponto | Estado |
|---|-------|--------|
| B1 | RLS deny-all (sem `auth.role()='service_role'`) | Na migração |
| B2 | api_key_hash SHA-256 real | No edge function |
| B3 | Idempotency POST assistances | No edge function + migração |
| M1 | Cleanup cron (não probabilístico) | Via SQL insert |
| M2 | moddatetime extension | Na migração |
| M3 | profiles existe (confirmado) | FK mantida |
| M4 | Input validation helper | No edge function |
| v2-A | Auditoria RLS — todas com rowsecurity=true | Confirmado ✓ |
| v2-B | profiles existe | Confirmado ✓ |
| v2-C | Idempotency email-log obrigatória | No edge function + migração |
| v2-D | TTL em idempotency_key | Na migração + edge function |
| v2-E | Drop policy permissiva email_logs + security_events | Na migração |

### Ficheiros a criar/alterar

| Ficheiro | Acção |
|----------|-------|
| Migração SQL | Criar via migration tool |
| `supabase/functions/agent-api/index.ts` | Criar |
| `supabase/functions/agent-api/test-api.http` | Criar |
| `scripts/test-api.sh` | Criar |
| `mem://features/external-api-access` | Actualizar |

### O que NÃO se toca
- `api-assistances` e `api-references` — intactas
- `QuickElevatorForm` — intacto
- `src/pages/Assistencias.tsx` — intacto
- MCP server, seed script — fora de scope

