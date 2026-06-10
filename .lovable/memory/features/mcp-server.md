---
name: MCP Server for Claude Desktop
description: Edge function mcp-server exposing Agent API as 48 MCP tools via mcp-lite + Hono, full read/write parity with the website. Includes auth header priority fix and continuous health monitoring.
type: feature
---

## MCP Server (`supabase/functions/mcp-server`)

Servidor Model Context Protocol que expõe **48 ferramentas** cobrindo TODAS as operações da Agent API (read + write). Paridade total com o que o utilizador faz na app web.

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

#### ⚠️ Auth header priority (regressão histórica — não inverter)
`agent-api/extractToken` DEVE ler `x-api-key` **antes** de `Authorization`. A plataforma Supabase injecta `Authorization: Bearer <anon>` em cada chamada server-to-server; se for lido primeiro, é comparado contra a `EXTERNAL_API_KEY` e devolve **401** em todas as operações. O `mcp-server/callAgentApi` também NÃO envia `Authorization` (apenas `x-api-key` + `apikey` para routing).

Cobertura: `supabase/functions/agent-api/auth_regression_test.ts` corre live contra 4 endpoints e valida que `x-api-key` ganha mesmo com `Authorization` inválido presente.

### Endpoints
- `POST /mcp-server` — JSON-RPC MCP (requer auth)
- `GET /mcp-server/info` — metadata pública (sem auth) → `{ tools: 48 }`

### 48 Tools (agrupadas por área no description)

**Core (5):** health_check, lookup_building_by_email, list_intervention_types, create_intervention_type, update_intervention_type

**Assistências (10):** list_assistances, get_assistance, create_assistance, update_assistance, add_communication, list_assistance_communications, list_assistance_photos, list_assistance_progress, save_email_draft, update_email_status

**Edifícios (5):** list_buildings, get_building, create_building, update_building, list_building_contacts

**Fornecedores (4):** list_suppliers, get_supplier, create_supplier, update_supplier

**Actas / Seguimento (5):** list_assembly_items, get_assembly_item, create_assembly_item, update_assembly_item, delete_assembly_item

**Orçamentos (5):** list_quotations, get_quotation, create_quotation, update_quotation, delete_quotation

**Knowledge Base (5):** search_knowledge, get_knowledge_article, create_knowledge_article, update_knowledge_article, delete_knowledge_article

**Fotos (2):** upload_assistance_photo (base64, máx 10MB), delete_assistance_photo

**Respostas Fornecedor (2):** submit_supplier_response (accepted/declined/needs_info — auto-promove assistência para 'scheduled' quando aplicável), list_supplier_responses

**Follow-ups & Notificações (4):** list_follow_ups, create_follow_up, list_notifications, update_notification

**Activity Log (1):** list_activity_log

**Contactos (1):** import_contacts

### Config
- `supabase/config.toml`: `verify_jwt = false` para `mcp-server`, `agent-api`, `mcp-health-cron`
- `supabase/functions/mcp-server/deno.json`: imports para hono, mcp-lite

### IMPORTANTE: API mcp-lite
Usa `mcp.tool("name", { description, inputSchema, handler })` — assinatura posicional (name + config). NÃO usa `mcp.tool({ name, ... })`.

### Sincronização
Sempre que adicionar novo endpoint REST em agent-api, adicionar tool MCP correspondente e actualizar contador `tools: N` em `mcp-server/index.ts` linha do `/info`.

---

## Health monitoring

Pipeline contínuo de validação para garantir que as tools críticas continuam vivas.

### Tabela `mcp_health_checks`
Colunas: `id`, `run_id`, `tool_name`, `status` (`ok`/`fail`), `http_status`, `latency_ms`, `error`, `response_size`, `checked_at`. RLS: SELECT apenas para admins (`has_role`); INSERT apenas via service_role.

### Edge function `mcp-health-cron`
Corre 6 probes contra `agent-api` com a `EXTERNAL_API_KEY`:
`health_check`, `list_buildings`, `list_intervention_types`, `list_assistances`, `list_follow_ups`, `list_activity_log`.

Persiste 1 linha por probe em `mcp_health_checks` (mesmo `run_id`). Dispara email para `geral@luvimg.com` via Resend **só** quando ≥1 falha E o run imediatamente anterior estava limpo — evita spam em falhas persistentes.

### Cron schedule
`pg_cron` job `mcp-health-cron-5min` corre `*/5 * * * *` via `net.http_post` para a edge function.

### Dashboard `/mcp-health`
Página protegida que (a) corre os 6 probes ao vivo com a key colada no browser e (b) lê o histórico server-side da tabela. Mostra estado por tool, latência, contagem de registos, uptime 24h e tabela com últimos 120 runs.

### Páginas relacionadas
- `/mcp-health` — dashboard com testes ao vivo + histórico do cron
- `/mcp-test` — validador completo das 48 tools
- `/mcp-diagnostics` — contrato `/chatgpt` retrievable
