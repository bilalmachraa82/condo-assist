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

## Ferramentas expostas (15)

| Ferramenta | Descrição |
|-----------|-----------|
| `health_check` | Verifica se a Agent API está operacional |
| `lookup_building_by_email` | Procura edifício pelo email do condómino |
| `list_assistances` | Lista assistências de um edifício (com filtros) |
| `get_assistance` | Detalhe completo de uma assistência |
| `list_intervention_types` | Lista tipos de intervenção disponíveis |
| `create_assistance` | Cria nova assistência (com idempotência) |
| `add_communication` | Adiciona comunicação ao log |
| `save_email_draft` | Guarda rascunho de email para revisão |
| `update_email_status` | Aprova/rejeita/marca rascunho como enviado |
| `import_contacts` | Bulk upsert de contactos de condóminos |
| `search_knowledge` | Pesquisa full-text na base de conhecimento |
| `get_knowledge_article` | Detalhe de artigo da KB |
| `create_knowledge_article` | Cria artigo na KB |
| `update_knowledge_article` | Atualiza artigo existente |
| `delete_knowledge_article` | Elimina artigo |

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
2. Clica no ícone do martelo 🔨 (ferramentas) — deves ver as 15 ferramentas listadas.
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
