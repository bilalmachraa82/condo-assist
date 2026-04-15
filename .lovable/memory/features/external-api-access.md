---
name: Agent API for External AI
description: Edge function agent-api with 10 REST endpoints for AI agent integration, dual auth, rate limiting, idempotency
type: feature
---

## Edge Functions for External API Access

### api-assistances (legacy)
- GET/POST/PATCH for assistances, authenticated via `x-api-key` header against `EXTERNAL_API_KEY` secret

### api-references (legacy)
- GET for buildings, suppliers, intervention_types

### agent-api (new — AI agent integration)
Single edge function with 10 endpoints, all under `/v1/`:

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 1 | GET | /v1/health | None | Smoke test |
| 2 | POST | /v1/lookup-building-by-email | Yes | Lookup condómino → edifício via condominium_contacts |
| 3 | GET | /v1/buildings/:id/assistances | Yes | List assistances (status=open/closed/exact) |
| 4 | GET | /v1/assistances/:id | Yes | Full detail with comms, progress, emails (parallel queries) |
| 5 | GET | /v1/intervention-types | Yes | List valid types |
| 6 | POST | /v1/assistances | Yes | Create assistance (idempotency via header) |
| 7 | POST | /v1/assistances/:id/communications | Yes | Add communication (sender_type: ai_agent) |
| 8 | POST | /v1/assistances/:id/email-log | Yes | Save email draft (idempotency, pending_review) |
| 9 | PATCH | /v1/email-log/:id/status | Yes | Approve/reject/send draft |
| 10 | POST | /v1/import-contacts | Yes | Bulk upsert condóminos by email |

**Authentication:** Dual headers — `Authorization: Bearer <key>` or `x-api-key: <key>`, validated against `EXTERNAL_API_KEY` secret.

**Rate limiting:** Postgres-backed via `agent_api_rate_limit` table, SHA-256 hashed key, 100 req/min.

**Idempotency:** `Idempotency-Key` header on POST /assistances and POST /email-log, with 24h TTL.

**PII masking:** All console.error calls use maskPII() helper (emails → ***@***, phones → +***).

### Database tables added
- `condominium_contacts` — building resident contacts, unique email, deny-all RLS
- `agent_api_rate_limit` — rate limit tracking, deny-all RLS

### Columns added
- `assistances.source` — manual/email_agent/phone_agent/web_form
- `assistances.idempotency_key` + `idempotency_key_expires_at`
- `email_logs.ai_draft_status` — pending_review/approved/rejected/sent/auto_sent
- `email_logs.approved_by` (FK to profiles) + `approved_at`
- `email_logs.idempotency_key` + `idempotency_key_expires_at`

### Security fixes applied
- Dropped permissive `WITH CHECK (true)` policies on email_logs and security_events
- Replaced with admin-only insert policies
