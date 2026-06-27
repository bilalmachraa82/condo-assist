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

## Ferramentas expostas — inventário completo (128, v1.3.2)

Paridade completa com a app web. Lista extraída diretamente de `index.ts`.

### Notas v1.3.2 (bugfixes)
- `search` aceita **`q` ou `query`** (alias). Sem termo devolve `{results:[]}`.
- `list_email_pendencies` e `list_assistances` aceitam `status` em **alias inglês** (`open`/`closed`) ou enum real (`aberto`, `aguarda_resposta`, … / `pending`, `in_progress`, …). Status inválido → **400 `INVALID_STATUS`** com `valid_values[]`, nunca 500.
- `lookup_building_by_email` procura em **`building_administrators` E `condominium_contacts`** (email normalizado `lower(trim)`); sem match faz fallback por **domínio** (`%@dominio`). Devolve `{found, building_id, building_code, match_type: administrator|contact|domain, contact, matches[]}`.

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

**Total: 128 tools.**

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
