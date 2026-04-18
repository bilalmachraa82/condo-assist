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

## Ferramentas expostas (48)

Paridade completa com a app web — read e write em todas as áreas.

**Core (5):** `health_check`, `lookup_building_by_email`, `list_intervention_types`, `create_intervention_type`, `update_intervention_type`

**Assistências (10):** `list_assistances`, `get_assistance`, `create_assistance`, `update_assistance`, `add_communication`, `list_assistance_communications`, `list_assistance_photos`, `list_assistance_progress`, `save_email_draft`, `update_email_status`

**Edifícios (5):** `list_buildings`, `get_building`, `create_building`, `update_building`, `list_building_contacts`

**Fornecedores (4):** `list_suppliers`, `get_supplier`, `create_supplier`, `update_supplier`

**Actas (5):** `list_assembly_items`, `get_assembly_item`, `create_assembly_item`, `update_assembly_item`, `delete_assembly_item`

**Orçamentos (5):** `list_quotations`, `get_quotation`, `create_quotation`, `update_quotation`, `delete_quotation`

**Knowledge Base (5):** `search_knowledge`, `get_knowledge_article`, `create_knowledge_article`, `update_knowledge_article`, `delete_knowledge_article`

**Fotos (2):** `upload_assistance_photo`, `delete_assistance_photo`

**Respostas Fornecedor (2):** `submit_supplier_response`, `list_supplier_responses`

**Follow-ups & Notificações (4):** `list_follow_ups`, `create_follow_up`, `list_notifications`, `update_notification`

**Activity Log (1):** `list_activity_log`

**Contactos (1):** `import_contacts`

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
2. Clica no ícone do martelo 🔨 (ferramentas) — deves ver as 48 ferramentas listadas.
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
