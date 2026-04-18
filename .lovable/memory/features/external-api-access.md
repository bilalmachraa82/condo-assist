---
name: Agent API for External AI
description: Edge function agent-api with 43 REST endpoints — full read/write parity with website covering assistances, buildings, suppliers, assembly items, quotations, contacts, follow-ups, notifications, knowledge base, photos, supplier responses, activity log
type: feature
---

## Edge Functions for External API Access

### agent-api (AI agent integration — 43 endpoints under `/v1/`)

**Authentication:** Dual headers — `Authorization: Bearer <key>` or `x-api-key: <key>`, validated against `EXTERNAL_API_KEY` secret.

**Rate limiting:** Postgres-backed via `agent_api_rate_limit` table, SHA-256 hashed key, 100 req/min.

**Idempotency:** `Idempotency-Key` header on POST /assistances, /email-log, /photos, /quotations, /follow-ups (24h TTL).

**PII masking:** All console.error calls use maskPII() helper.

#### Endpoints by area

**Core / Health**
- GET /v1/health (no auth)
- POST /v1/lookup-building-by-email
- GET /v1/intervention-types
- POST /v1/intervention-types
- PATCH /v1/intervention-types/:id

**Assistances**
- GET /v1/buildings/:id/assistances
- GET /v1/assistances/:id
- POST /v1/assistances (idempotent)
- PATCH /v1/assistances/:id
- POST /v1/assistances/:id/communications
- GET /v1/assistances/:id/communications
- GET /v1/assistances/:id/photos
- GET /v1/assistances/:id/progress
- POST /v1/assistances/:id/email-log (idempotent)
- PATCH /v1/email-log/:id/status

**Photos**
- POST /v1/assistances/:id/photos (idempotent, base64 upload, máx 10MB) — uses `assistance-photos` storage bucket
- DELETE /v1/photos/:id (admin)

**Buildings**
- GET /v1/buildings
- GET /v1/buildings/:id
- POST /v1/buildings
- PATCH /v1/buildings/:id
- GET /v1/buildings/:id/contacts

**Suppliers**
- GET /v1/suppliers
- GET /v1/suppliers/:id
- POST /v1/suppliers
- PATCH /v1/suppliers/:id

**Supplier Responses**
- POST /v1/assistances/:id/supplier-response (response_type accepted/declined/needs_info; auto-promotes assistance to 'scheduled' if accepted+scheduled_start_date)
- GET /v1/assistances/:id/supplier-responses

**Assembly Items (Actas)**
- GET /v1/assembly-items (filtros: building_id, building_code, status, category, year, q)
- GET /v1/assembly-items/:id
- POST /v1/assembly-items
- PATCH /v1/assembly-items/:id
- DELETE /v1/assembly-items/:id

**Quotations**
- GET /v1/quotations
- GET /v1/quotations/:id
- POST /v1/quotations (idempotent)
- PATCH /v1/quotations/:id (status approved auto-sets approved_at)
- DELETE /v1/quotations/:id

**Follow-ups & Notifications**
- GET /v1/follow-ups
- POST /v1/follow-ups (idempotent)
- GET /v1/notifications
- PATCH /v1/notifications/:id

**Knowledge Base**
- GET /v1/knowledge (full-text search)
- GET /v1/knowledge/:id
- POST /v1/knowledge
- PATCH /v1/knowledge/:id
- DELETE /v1/knowledge/:id

**Activity Log**
- GET /v1/activity-log (filtros: assistance_id, supplier_id, user_id, action)

**Contacts**
- POST /v1/import-contacts (bulk upsert by email, max 500)

### Database tables
- `condominium_contacts` — building resident contacts, unique email
- `agent_api_rate_limit` — rate limit tracking
- `assembly_items.building_code` (int) — main filter for actas

### Columns relevant
- `assistances.source` — manual/email_agent/phone_agent/web_form
- `assistances.idempotency_key` + `idempotency_key_expires_at`
- `email_logs.ai_draft_status` — pending_review/approved/rejected/sent/auto_sent
- `email_logs.idempotency_key` + `idempotency_key_expires_at`

### Service role
agent-api uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS) — single trust boundary at the EXTERNAL_API_KEY check.
