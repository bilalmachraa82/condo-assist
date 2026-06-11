
## Objetivo

Dar ao MCP `condo-assist-mcp` acesso a **toda** a informação da app, com foco em **Pendências de Email**, **Notas Internas** e **Assistências**, sem alterar a URL nem os nomes das tools já existentes (para não ter de reconfigurar o MCP no Claude/ChatGPT).

## Regra de ouro

- **Não mexer** em rotas/tools existentes (mantêm path, nome, schema).
- Só **adicionar** novos endpoints em `supabase/functions/agent-api/index.ts` e novas tools em `supabase/functions/mcp-server/index.ts`.
- Continuar a usar o mesmo prefixo `/v1/...` e a mesma autenticação (API key).

## Inventário — o que está e o que falta

### Já acessível via MCP (não tocar)
assistances (list/get/create/update), photos, progress, communications, supplier_responses, intervention_types, buildings, condominium_contacts (read-only via `list_building_contacts`), suppliers, assembly_items (módulo antigo "Actas" simples), quotations, follow_ups, notifications, activity_log, building_administrators, key_handovers, building_documents, insurance_claims (+ notes), knowledge_articles, email_logs.

### Em falta (a adicionar)

**Pendências de Email** (pedido explícito)
- `email_pendencies` — sem qualquer endpoint
- `email_pendency_notes` — notas internas
- `email_pendency_attachments` — anexos (metadados)
- `pendency_reminders` — lembretes agendados

**Notas internas de assistências**
- `assistances.admin_notes` — coluna já existe e já é editável via `PATCH /v1/assistances/:id`, mas a tool MCP `update_assistance` não a inclui no schema. Adicionar campo + dedicar tool `add_assistance_internal_note` (append seguro com timestamp/autor).

**Assembleias (módulo completo, hoje só `assembly_items`)**
- `assemblies` (cabeçalho da reunião)
- `assembly_agenda_items`, `assembly_resolutions`, `assembly_action_items`
- `assembly_attendees`, `assembly_dispatches`, `assembly_minutes_versions`

**Edifício — dados estruturais**
- `building_fractions` (frações)
- `building_inspections` + `inspection_categories` (inspeções periódicas)
- `building_insurances` (seguros do edifício, diferente de claims)

**Sinistros — complementos**
- `insurance_claim_attachments` (metadados)
- `insurance_fraction_status`

**Contactos do condomínio (CRUD completo)**
- `condominium_contacts` — hoje só leitura via `list_building_contacts`; faltam create/update/delete.

**Operacional/observabilidade (read-only)**
- `mcp_health_checks` (saúde do próprio MCP)
- `email_unsubscribes` (lista de descadastros)
- `app_settings` (configurações públicas seguras)

## Novos endpoints (agent-api) e tools MCP

Todos seguem o padrão existente: validação Zod, paginação `limit/offset`, filtros simples, RLS-safe (service role).

### Pendências de Email
| Método | Path | Tool MCP |
|---|---|---|
| GET | `/v1/email-pendencies` | `list_email_pendencies` (filtros: status, building_id, assigned_to, priority, search) |
| GET | `/v1/email-pendencies/:id` | `get_email_pendency` (inclui notes + attachments + reminders) |
| POST | `/v1/email-pendencies` | `create_email_pendency` |
| PATCH | `/v1/email-pendencies/:id` | `update_email_pendency` (status, prioridade, assigned_to, due_date…) |
| DELETE | `/v1/email-pendencies/:id` | `delete_email_pendency` |
| GET | `/v1/email-pendencies/:id/notes` | `list_email_pendency_notes` |
| POST | `/v1/email-pendencies/:id/notes` | `add_email_pendency_note` |
| GET | `/v1/email-pendencies/:id/attachments` | `list_email_pendency_attachments` |
| DELETE | `/v1/email-pendency-attachments/:id` | `delete_email_pendency_attachment` |
| GET | `/v1/email-pendencies/:id/reminders` | `list_pendency_reminders` |
| POST | `/v1/email-pendencies/:id/reminders` | `create_pendency_reminder` |
| PATCH | `/v1/pendency-reminders/:id` | `update_pendency_reminder` |
| DELETE | `/v1/pendency-reminders/:id` | `delete_pendency_reminder` |

### Notas internas de assistências
- Estender `update_assistance` para aceitar `admin_notes` (substitui).
- Nova tool `add_assistance_internal_note` → `POST /v1/assistances/:id/internal-notes` (append com `\n--- [data, autor] ---\n`).

### Assembleias (módulo cheio)
- `GET/POST /v1/assemblies`, `GET/PATCH/DELETE /v1/assemblies/:id`
- `GET/POST /v1/assemblies/:id/agenda-items` + `PATCH/DELETE /v1/agenda-items/:id`
- `GET/POST /v1/assemblies/:id/resolutions` + `PATCH/DELETE /v1/resolutions/:id`
- `GET/POST /v1/assemblies/:id/action-items` + `PATCH/DELETE /v1/action-items/:id`
- `GET/POST /v1/assemblies/:id/attendees` + `PATCH/DELETE /v1/attendees/:id`
- `GET /v1/assemblies/:id/dispatches`, `GET /v1/assemblies/:id/minutes-versions`
- Tools equivalentes: `list_assemblies`, `get_assembly`, `create_assembly`, `update_assembly`, `delete_assembly`, `list_assembly_resolutions`, `create_assembly_resolution`, `update_assembly_resolution`, `list_assembly_action_items`, `create_assembly_action_item`, `update_assembly_action_item`, `list_assembly_attendees`, `add_assembly_attendee`, `list_assembly_agenda_items`, `add_assembly_agenda_item`, `list_assembly_dispatches`, `list_assembly_minutes_versions`.

### Edifício
- `GET/POST /v1/buildings/:id/fractions`, `PATCH/DELETE /v1/fractions/:id`
- `GET/POST /v1/buildings/:id/inspections`, `PATCH/DELETE /v1/inspections/:id`
- `GET/POST /v1/buildings/:id/insurances`, `PATCH/DELETE /v1/insurances/:id`
- `GET /v1/inspection-categories` (+ POST/PATCH/DELETE)
- Tools: `list_building_fractions`, `create_building_fraction`, `update_building_fraction`, `delete_building_fraction`, `list_building_inspections`, `create_building_inspection`, `update_building_inspection`, `delete_building_inspection`, `list_building_insurances`, `create_building_insurance`, `update_building_insurance`, `delete_building_insurance`, `list_inspection_categories`, `create_inspection_category`, `update_inspection_category`, `delete_inspection_category`.

### Sinistros (complementos)
- `GET /v1/insurance-claims/:id/attachments`, `DELETE /v1/insurance-claim-attachments/:id`
- `GET /v1/insurance-fraction-status?building_id=...`, `PATCH /v1/insurance-fraction-status/:id`
- Tools: `list_insurance_claim_attachments`, `delete_insurance_claim_attachment`, `list_insurance_fraction_status`, `update_insurance_fraction_status`.

### Contactos do condomínio (CRUD)
- `POST /v1/buildings/:id/contacts`, `PATCH /v1/contacts/:id`, `DELETE /v1/contacts/:id`
- Tools: `create_building_contact`, `update_building_contact`, `delete_building_contact` (já existe `list_building_contacts`).

### Observabilidade (read-only)
- `GET /v1/mcp-health` → `list_mcp_health_checks`
- `GET /v1/email-unsubscribes` → `list_email_unsubscribes`
- `GET /v1/app-settings` → `list_app_settings` (filtra apenas chaves marcadas como públicas)

## Detalhes técnicos

1. **Sem versão nova de API**: continua tudo em `/v1/...`. URL do MCP (`/mcp-server`) e o `tools/list` ficam mais ricos automaticamente — o Claude apanha as novas tools sem reconfiguração.
2. **Search global**: estender a tool `search` (ChatGPT mode) para incluir `email_pendencies` e `assemblies` nos resultados, mantendo o mesmo schema.
3. **`fetch` tool**: adicionar suporte a `type` `email_pendency` e `assembly` no resolver de URLs.
4. **Documentação**:
   - Atualizar `supabase/functions/agent-api/openapi.yaml` com todas as novas rotas.
   - Atualizar `supabase/functions/mcp-server/README.md` com a lista completa de tools (de ~50 para ~110).
   - Atualizar memória `mem://features/mcp-server.md` com o novo inventário.
5. **Health check cron** (`mcp-health-cron`): adicionar uma chamada a `list_email_pendencies` para detetar regressões cedo.
6. **Sem migrações de schema** — só código de edge functions e docs.

## Entregáveis

- `supabase/functions/agent-api/index.ts` — +~60 handlers e entradas em `matchRoute`.
- `supabase/functions/mcp-server/index.ts` — +~60 `mcp.tool(...)` e atualização do contador (`tools: 66` → novo total).
- `supabase/functions/agent-api/openapi.yaml` — sincronizado.
- `supabase/functions/mcp-server/README.md` — lista atualizada.
- `supabase/functions/mcp-health-cron/index.ts` — adicionar smoke test às pendências.
- `mem://features/mcp-server.md` — inventário atualizado.

## Fora de âmbito

- Não criar tabelas novas.
- Não alterar autenticação nem URL do MCP.
- Não expor `user_roles`, `profiles`, `magic_code_attempts`, `rate_limits`, `security_events`, `supplier_magic_codes`, `supplier_access_log` (sensíveis/segurança).
