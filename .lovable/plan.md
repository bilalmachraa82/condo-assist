

# Plano: Fechar lacunas de paridade MCP/API ↔ site

Adicionar 8 endpoints REST + 8 tools MCP correspondentes para garantir paridade total entre o que o utilizador faz no site e o que um agente IA pode fazer via MCP/API.

## 1. Photos (assistências) — upload e delete

**REST** (`agent-api/index.ts`):
- `POST /v1/assistances/:id/photos` — upload de foto (multipart ou base64 + caption + photo_type) → reusa lógica de `upload-assistance-photo`
- `DELETE /v1/photos/:id` — eliminar foto (admin)

**MCP**: `upload_assistance_photo`, `delete_assistance_photo`

## 2. Quotations — write completo

**REST**:
- `POST /v1/quotations` — submeter orçamento (assistance_id, supplier_id, amount, description, validity_days)
- `PATCH /v1/quotations/:id` — actualizar status (approved/rejected/pending), notes, approved_by
- `DELETE /v1/quotations/:id` — eliminar (admin)

**MCP**: `create_quotation`, `update_quotation`, `delete_quotation`

## 3. Supplier responses — aceitar/recusar assistência

**REST**:
- `POST /v1/assistances/:id/supplier-response` — registar resposta (response_type: accepted/declined, decline_reason, scheduled dates)
- `GET /v1/assistances/:id/supplier-responses` — listar histórico

**MCP**: `submit_supplier_response`, `list_supplier_responses`

## 4. Notifications & Follow-ups — write básico

**REST**:
- `PATCH /v1/notifications/:id` — actualizar status (sent/cancelled)
- `POST /v1/follow-ups` — agendar follow-up manual

**MCP**: `update_notification`, `create_follow_up`

## 5. Activity log — read

**REST**: `GET /v1/activity-log` (filtros: assistance_id, supplier_id, user_id, limit, offset)
**MCP**: `list_activity_log`

## Padrão a seguir
- Mesmo padrão dos endpoints existentes: `matchRoute` + handler + validação Zod-like + PII masking + `EXTERNAL_API_KEY` auth + rate limit
- Idempotency-Key em todos os novos POST
- MCP tools agrupadas por área no description (`[Fotos]`, `[Orçamentos]`, `[Respostas]`)

## Sem alterações de DB
Todas as tabelas, RLS e edge functions auxiliares (`upload-assistance-photo`, `sign-assistance-photos`) já existem.

## Documentação
- Actualizar `openapi.yaml` (+10 endpoints)
- Actualizar `mcp-server/README.md` (37 → 47 tools)
- Actualizar memória `mem://features/external-api-access` e `mem://features/mcp-server`

## Validação pós-deploy
- `curl POST /v1/quotations` com `x-api-key` → confirma criação
- `GET /mcp-server/info` → confirma `tools: 47`
- Testar via MCP Inspector: `create_quotation` + `update_quotation` + `submit_supplier_response`

**Total final**: 42 endpoints REST + 47 tools MCP — paridade completa com o site.

