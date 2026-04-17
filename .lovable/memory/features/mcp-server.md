---
name: MCP Server for Claude Desktop
description: Edge function mcp-server exposing Agent API as 37 MCP tools via mcp-lite + Hono, Streamable HTTP transport, full app coverage
type: feature
---

## MCP Server (`supabase/functions/mcp-server`)

Servidor Model Context Protocol que expõe as 37 operações da Agent API como ferramentas MCP, para uso direto no Claude Desktop ou MCP Inspector. Cobre toda a app: assistências, edifícios, fornecedores, orçamentos, actas, contactos, follow-ups, notificações, knowledge base, tipos de intervenção e email logs.

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

### 37 Tools (agrupadas por área no description)

**Core (5):** health_check, lookup_building_by_email, list_intervention_types, create_intervention_type, update_intervention_type

**Assistências (9):** list_assistances, get_assistance, create_assistance, update_assistance, add_communication, list_assistance_communications, list_assistance_photos, list_assistance_progress, save_email_draft, update_email_status

**Edifícios (5):** list_buildings, get_building, create_building, update_building, list_building_contacts

**Fornecedores (4):** list_suppliers, get_supplier, create_supplier, update_supplier

**Actas / Seguimento (5):** list_assembly_items, get_assembly_item, create_assembly_item, update_assembly_item, delete_assembly_item

**Orçamentos (2):** list_quotations, get_quotation

**Knowledge Base (5):** search_knowledge, get_knowledge_article, create_knowledge_article, update_knowledge_article, delete_knowledge_article

**Follow-ups & Notificações (2):** list_follow_ups, list_notifications

**Contactos (1):** import_contacts

### Config
- `supabase/config.toml`: `verify_jwt = false` para `mcp-server` (auth feita na camada da app via EXTERNAL_API_KEY)
- `supabase/functions/mcp-server/deno.json`: imports para hono, mcp-lite
- README completo em `supabase/functions/mcp-server/README.md`

### IMPORTANTE: API mcp-lite
Usa `mcp.tool("name", { description, inputSchema, handler })` — assinatura posicional (name + config). NÃO usa `mcp.tool({ name, ... })`.
