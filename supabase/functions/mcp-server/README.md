# MCP Server — Condo Assist

Servidor **Model Context Protocol** que expõe a Agent API como ferramentas MCP,
para integração direta com o **Claude Desktop**, MCP Inspector, ou qualquer outro
cliente compatível com Streamable HTTP.

## URL

```
https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server
```

Health/info (sem auth):
```
GET https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server/info
```

## Autenticação

Usa a mesma `EXTERNAL_API_KEY` da Agent API. Aceita:

- Header: `x-api-key: <KEY>`
- Header: `Authorization: Bearer <KEY>`
- Query param: `?api_key=<KEY>`

## Ferramentas expostas — inventário completo (133, v1.4.0)

Paridade completa com a app web. Lista extraída diretamente de `index.ts`.

### Notas v1.4.1 (write-path hardening — Jun 2026)
- **Erros estruturados em TODAS as write tools.** Removidos os 22 `throw HttpError(500, "Failed to …")` opacos remanescentes; agora todos os `create_*`/`update_*`/`delete_*` passam pelo `pgErrorToHttp`, que devolve `{ error, code, field?, allowed_values?, pg_code, details }` (nunca 500).
- **Validação de enum antes do INSERT/UPDATE** via novos helpers `requireEnum` / `validateEnumIfPresent`. Aplicado em `update_assistance` (`status`, `priority`) — input `'ac'` ou outro valor fora do enum responde **400 `INVALID_ENUM`** com `allowed_values: [...]`, em vez de 500 opaco.
- **`delete_building` confirmado como soft-delete real** (`is_active=false`) e devolve `{ deleted, soft, id, is_active }`; equivalente para `delete_supplier`.
- **Valores válidos por enum (write tools):**
  - `assistance_status`: pending, awaiting_quotation, quotation_rejected, in_progress, completed, cancelled, accepted, scheduled
  - `assistance_priority`: normal, urgent, critical
  - `pendency_status`: aberto, aguarda_resposta, resposta_recebida, precisa_decisao, escalado, resolvido, cancelado
  - `quotation_status`: pending, submitted, approved, rejected, expired
  - `insurance_claim_status`: aberto, em_analise, aguarda_peritagem, peritagem_realizada, aguarda_pagamento, pago, recusado, arquivado
  - `assembly_status`: draft, processing_audio, awaiting_review, approved, archived, failed
- **Campos obrigatórios por create tool (mínimos verificados):**
  - `create_building`: `code`, `name`, `address`, `postal_code`
  - `create_building_insurance`: `building_id` (path) — `coverage_type` usa default `'multirisco'` na BD
  - `create_follow_up`: `assistance_id`, `follow_up_type`, `scheduled_for` (priority default `'normal'`, status default `'pending'`)
  - `create_email_pendency`: `title`, `building_id` (status default `'aberto'`)
  - `create_assistance`: `building_id`, `title`, `description`, `intervention_type_id`
- **Regression suite** `supabase/functions/agent-api/write_audit_test.ts` cobre ciclo create → update → delete em insurances, follow-ups, pendencies, building (soft-delete) e valida 400 estruturado em inputs inválidos.

### Notas v1.4.0 (auditoria 2026-11)
- **Validação UUID** em todos os `get_*` por id → não-UUID devolve **400 `INVALID_INPUT`** (nunca 500).
- **Status filters** centralizados em `resolveStatusFilter` (enum real + aliases `open`/`closed`) para `list_assistances`, `list_email_pendencies`, `list_insurance_claims`, `list_assemblies`, `list_quotations`. Status inválido → **400 `INVALID_STATUS`** com `valid_values[]`.
- **Erros Postgres mapeados** via `pgErrorToHttp` (22P02→400, 23502→400 `MISSING_FIELD`, 23503→400 `FK_NOT_FOUND`, 23505→409 `DUPLICATE`, enum→400 `INVALID_ENUM`).
- **Deletes em falta adicionados:** `delete_building` (soft), `delete_assistance`, `delete_insurance_claim`, `delete_supplier` (soft), `delete_follow_up`.


### Notas v1.3.2 (bugfixes anteriores)
- `search` aceita **`q` ou `query`** (alias). Sem termo devolve `{results:[]}`.
- `lookup_building_by_email` procura em **`building_administrators` E `condominium_contacts`** com fallback por domínio.

### Sistema & Pesquisa (4)
- `health_check` — verifica disponibilidade da Agent API
- `lookup_building_by_email` — encontra edifício a partir de email (admins + contactos + domínio)
- `search` — pesquisa global (ChatGPT Apps SDK); aceita `q` ou `query`
- `fetch` — obtém recurso por tipo+id (ChatGPT Apps SDK)

### Assistências (10)
- `list_assistances`, `get_assistance`, `create_assistance`, `update_assistance`
- `add_assistance_internal_note` — append timestamped a `admin_notes`
- `list_assistance_communications`, `list_assistance_photos`, `list_assistance_progress`
- `upload_assistance_photo`, `delete_assistance_photo`

### Comunicações / Email da Assistência (4)
- `add_communication`, `save_email_draft`, `update_email_status`, `import_contacts`

### Tipos de Intervenção (3)
- `list_intervention_types`, `create_intervention_type`, `update_intervention_type`

### Knowledge Base (5)
- `search_knowledge`, `get_knowledge_article`, `create_knowledge_article`, `update_knowledge_article`, `delete_knowledge_article`

### Edifícios (4)
- `list_buildings`, `get_building`, `create_building`, `update_building`

### Contactos do Condomínio (4)
- `list_building_contacts`, `create_building_contact`, `update_building_contact`, `delete_building_contact`

### Administradores de Edifício (4)
- `list_building_administrators`, `create_building_administrator`, `update_building_administrator`, `delete_building_administrator`

### Frações (4)
- `list_building_fractions`, `create_building_fraction`, `update_building_fraction`, `delete_building_fraction`

### Inspeções (4)
- `list_building_inspections`, `create_building_inspection`, `update_building_inspection`, `delete_building_inspection`

### Categorias de Inspeção (4)
- `list_inspection_categories`, `create_inspection_category`, `update_inspection_category`, `delete_inspection_category`

### Seguros de Edifício (4)
- `list_building_insurances`, `create_building_insurance`, `update_building_insurance`, `delete_building_insurance`

### Documentos de Edifício (3)
- `list_building_documents`, `upload_building_document`, `delete_building_document`

### Entrega de Chaves (3)
- `list_key_handovers`, `create_key_handover`, `update_key_handover`

### Fornecedores (4)
- `list_suppliers`, `get_supplier`, `create_supplier`, `update_supplier`

### Orçamentos / Cotações (5)
- `list_quotations`, `get_quotation`, `create_quotation`, `update_quotation`, `delete_quotation`

### Respostas de Fornecedor (2)
- `submit_supplier_response`, `list_supplier_responses`

### Follow-ups & Notificações (4)
- `list_follow_ups`, `create_follow_up`, `list_notifications`, `update_notification`

### Sinistros / Insurance Claims (9)
- `list_insurance_claims`, `get_insurance_claim`, `create_insurance_claim`, `update_insurance_claim`
- `add_claim_note`
- `list_insurance_claim_attachments`, `delete_insurance_claim_attachment`
- `list_insurance_fraction_status`, `update_insurance_fraction_status`

### Pendências de Email (13)
- `list_email_pendencies`, `get_email_pendency`, `create_email_pendency`, `update_email_pendency`, `delete_email_pendency`
- `list_email_pendency_notes`, `add_email_pendency_note`
- `list_email_pendency_attachments`, `delete_email_pendency_attachment`
- `list_pendency_reminders`, `create_pendency_reminder`, `update_pendency_reminder`, `delete_pendency_reminder`

### Assembleias — Itens (atas) (5)
- `list_assembly_items`, `get_assembly_item`, `create_assembly_item`, `update_assembly_item`, `delete_assembly_item`

### Assembleias — Gestão (5)
- `list_assemblies`, `get_assembly`, `create_assembly`, `update_assembly`, `delete_assembly`

### Assembleias — Agenda (4)
- `list_assembly_agenda_items`, `create_assembly_agenda_item`, `update_assembly_agenda_item`, `delete_assembly_agenda_item`

### Assembleias — Deliberações (4)
- `list_assembly_resolutions`, `create_assembly_resolution`, `update_assembly_resolution`, `delete_assembly_resolution`

### Assembleias — Ações de Seguimento (4)
- `list_assembly_action_items`, `create_assembly_action_item`, `update_assembly_action_item`, `delete_assembly_action_item`

### Assembleias — Presenças (3)
- `list_assembly_attendees`, `add_assembly_attendee`, `delete_assembly_attendee`

### Assembleias — Envios e Atas (2)
- `list_assembly_dispatches`, `list_assembly_minutes_versions`

### Activity Log (1)
- `list_activity_log`

### Observabilidade (3)
- `list_mcp_health_checks`, `list_email_unsubscribes`, `list_app_settings`

### Deletes top-level (5, v1.4.0)
- `delete_building` (soft — `is_active=false`), `delete_assistance`, `delete_insurance_claim`, `delete_supplier` (soft), `delete_follow_up`

**Total: 133 tools.**

## Conectar ao Claude Desktop

O Claude Desktop suporta servidores MCP **remotos** via configuração no ficheiro
`claude_desktop_config.json`. A localização varia por SO:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

### Opção A — Servidor remoto direto (Claude Desktop ≥ 0.10 / Pro)

```json
{
  "mcpServers": {
    "condo-assist": {
      "url": "https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server",
      "headers": {
        "x-api-key": "COLE_AQUI_A_EXTERNAL_API_KEY"
      }
    }
  }
}
```

### Opção B — Via `mcp-remote` (compatível com qualquer versão)

Se a tua versão do Claude Desktop ainda não suportar URLs remotos diretamente,
usa o adaptador oficial `mcp-remote`:

```json
{
  "mcpServers": {
    "condo-assist": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server",
        "--header",
        "x-api-key:COLE_AQUI_A_EXTERNAL_API_KEY"
      ]
    }
  }
}
```

> **Importante:** depois de guardar o ficheiro, reinicia totalmente o Claude
> Desktop (Quit + reabrir).

### Verificar conexão

1. No Claude Desktop, abre uma nova conversa.
2. Clica no ícone do martelo 🔨 (ferramentas) — deves ver as 128 ferramentas listadas.
3. Pergunta: *"Faz health check ao servidor condo-assist."* — Claude deve invocar `health_check`.
4. Pergunta: *"Lista os tipos de intervenção disponíveis."*

## Testar com MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

No Inspector:
- **Transport:** Streamable HTTP
- **URL:** `https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server`
- **Header:** `x-api-key: <EXTERNAL_API_KEY>`

## Testar com curl

Initialize:
```bash
curl -X POST https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server \
  -H "x-api-key: $EXTERNAL_API_KEY" \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'
```

Listar ferramentas:
```bash
curl -X POST https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server \
  -H "x-api-key: $EXTERNAL_API_KEY" \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":2}'
```

## Arquitetura

```
Claude Desktop (MCP client)
       ↓ Streamable HTTP + JSON-RPC
mcp-server (edge function, mcp-lite + Hono)
       ↓ HTTP fetch
agent-api (edge function, REST /v1/*)
       ↓ service_role
Supabase (Postgres)
```

O servidor MCP é uma camada fina sobre a Agent API existente — toda a lógica
de negócio, validação, idempotência, rate limiting e PII masking continua na
`agent-api`, garantindo um único ponto de verdade.
