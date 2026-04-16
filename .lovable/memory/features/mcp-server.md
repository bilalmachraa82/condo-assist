---
name: MCP Server for Claude Desktop
description: Edge function mcp-server exposing Agent API as MCP tools via mcp-lite + Hono, Streamable HTTP transport
type: feature
---

## MCP Server (`supabase/functions/mcp-server`)

Servidor Model Context Protocol que expõe as 15 operações da Agent API como ferramentas MCP, para uso direto no Claude Desktop ou MCP Inspector.

### Stack
- **mcp-lite** v0.10.0 (npm:) — biblioteca MCP fetch-first
- **Hono** v4 — routing
- **Transport:** Streamable HTTP (`/mcp-server` aceita POST/GET/DELETE JSON-RPC)

### Arquitetura
Camada fina que faz proxy para `agent-api` via fetch interna (mantém toda a lógica de negócio, validação, idempotência e rate limiting num único sítio).

```
Claude Desktop → mcp-server (MCP/JSON-RPC) → agent-api (REST /v1/*) → Supabase
```

### Auth
Mesma `EXTERNAL_API_KEY` da agent-api. Aceita `x-api-key`, `Authorization: Bearer`, ou `?api_key=`.

### Endpoints
- `POST /mcp-server` — JSON-RPC MCP (requer auth)
- `GET /mcp-server/info` — metadata pública (sem auth)

### 15 Tools expostas
health_check, lookup_building_by_email, list_assistances, get_assistance, list_intervention_types, create_assistance, add_communication, save_email_draft, update_email_status, import_contacts, search_knowledge, get_knowledge_article, create_knowledge_article, update_knowledge_article, delete_knowledge_article.

### Config
- `supabase/config.toml`: `verify_jwt = false` para `mcp-server` (auth feita na camada da app via EXTERNAL_API_KEY)
- `supabase/functions/mcp-server/deno.json`: imports para hono, mcp-lite, zod
- README completo em `supabase/functions/mcp-server/README.md` com instruções para Claude Desktop (configuração direta + via `mcp-remote`)

### IMPORTANTE: API mcp-lite
Usa `mcp.tool("name", { description, inputSchema, handler })` — assinatura posicional (name + config). NÃO usa `mcp.tool({ name, ... })`.
