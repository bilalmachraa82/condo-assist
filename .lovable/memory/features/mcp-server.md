---
name: MCP Server for Claude Desktop / ChatGPT
description: Edge function mcp-server exposing Agent API as 128 MCP tools via mcp-lite + Hono, full read/write parity with the website. v1.3.2 — search aceita 'q' OU 'query', list_email_pendencies/list_assistances normalizam status (open/closed/enum real, 400 em vez de 500 para inválidos), lookup_building_by_email procura em building_administrators E condominium_contacts com fallback por domínio.
type: feature
---

## MCP Server (`supabase/functions/mcp-server`)

Servidor Model Context Protocol que expõe **128 ferramentas** cobrindo TODA a informação da app (read + write). Cliente acede via Claude Desktop, ChatGPT Apps SDK ou MCP Inspector.

### Stack
- **mcp-lite** v0.10.0 (npm:) — biblioteca MCP fetch-first
- **Hono** v4 — routing
- **Transport:** Streamable HTTP (`/mcp-server` aceita POST/GET/DELETE JSON-RPC)

### Arquitetura
Camada fina que faz proxy para `agent-api` via fetch interna (mantém toda a lógica de negócio, validação, idempotência e rate limiting num único sítio).

```
Claude Desktop / ChatGPT → mcp-server (MCP/JSON-RPC) → agent-api (REST /v1/*) → Supabase
```

### Auth
Mesma `EXTERNAL_API_KEY` da agent-api. Aceita `x-api-key`, `Authorization: Bearer`, ou `?api_key=`.

#### ⚠️ Auth header priority (regressão histórica — não inverter)
`agent-api/extractToken` DEVE ler `x-api-key` **antes** de `Authorization`. A plataforma Supabase injecta `Authorization: Bearer <anon>` em cada chamada server-to-server; se for lido primeiro, é comparado contra a `EXTERNAL_API_KEY` e devolve **401** em todas as operações. O `mcp-server/callAgentApi` também NÃO envia `Authorization` (apenas `x-api-key` + `apikey` para routing).

Cobertura: `supabase/functions/agent-api/auth_regression_test.ts` corre live contra 4 endpoints e valida que `x-api-key` ganha mesmo com `Authorization` inválido presente.

### Endpoints
- `POST /mcp-server` — JSON-RPC MCP "full" (Claude Desktop, MCP Inspector) → 128 tools
- `POST /mcp-server/chatgpt` — JSON-RPC MCP "chatgpt-safe" → só `search` + `fetch`
- `GET /mcp-server/info` — metadata pública (sem auth) → `{ tools: 128, version: "1.3.2" }`

### v1.3.2 — bugfixes operacionais (Jun 2026)
- **`lookup_building_by_email`** agora procura em `building_administrators` E `condominium_contacts` (com `lower(trim(email))`). Sem match exacto faz fallback por domínio (`%@dominio`). Devolve `{found, building_id, building_code, name, match_type: administrator|contact|domain, contact, matches[]}`.
- **`list_email_pendencies`** aceita `status` como alias `open` (→ aberto/aguarda_resposta/resposta_recebida/precisa_decisao/escalado) ou `closed` (→ resolvido/cancelado), ou enum directo. Status inválido devolve **400 INVALID_STATUS** com `valid_values[]`, NUNCA 500.
- **`list_assistances`** mesmo tratamento: `open`/`closed`/enum exacto; inválido → 400.
- **`search`** aceita `q` OU `query` como termo. Sem termo devolve `{results:[]}` (não erro). Variante `/chatgpt` mantém `query` estrito (spec ChatGPT).
- `errorResponse(...)` aceita `extra` opcional para campos como `valid_values` e `details`.

### Inventário de tools (resumo)

**Core (5)** · **Assistências (11, inclui `add_assistance_internal_note`)** · **Edifícios + estrutura (24: buildings, fractions, inspections, insurances, categories)** · **Administradores (4)** · **Contactos do condomínio (4: list + CRUD)** · **Fornecedores (4)** · **Actas items simples (5)** · **Assembleias módulo completo (21: assemblies, agenda, resolutions, action_items, attendees, dispatches, minutes_versions)** · **Pendências Email (13: pendencies, notes, attachments, reminders)** · **Orçamentos (5)** · **Sinistros (9, inclui anexos + insurance_fraction_status)** · **Chaves (3)** · **Documentos do edifício (3)** · **Knowledge Base (5)** · **Fotos (2)** · **Respostas Fornecedor (2)** · **Follow-ups & Notificações (4)** · **Activity Log (1)** · **Observabilidade (3: list_mcp_health_checks, list_email_unsubscribes, list_app_settings)** · **Import contactos (1)** · **ChatGPT SDK (2: search, fetch)**

### Search/fetch ChatGPT
`search` agrega buildings, suppliers, knowledge, assembly_items, **email_pendencies** e **assemblies**.
`fetch` resolve types: `assistance | building | supplier | knowledge | assembly_item | assembly | email_pendency` (formato `type:uuid`).

### Config
- `supabase/config.toml`: `verify_jwt = false` para `mcp-server`, `agent-api`, `mcp-health-cron`
- `supabase/functions/mcp-server/deno.json`: imports para hono, mcp-lite

### IMPORTANTE: API mcp-lite
Usa `mcp.tool("name", { description, inputSchema, handler })` — assinatura posicional (name + config). NÃO usa `mcp.tool({ name, ... })`.

### Sincronização — regra de ouro
**Nunca alterar o nome ou URL de uma tool existente** (quebra a config já feita no Claude Desktop). Só ADICIONAR novas tools e endpoints. Sempre que adicionar novo endpoint REST em agent-api, adicionar tool MCP correspondente e actualizar contador `tools: N` em `mcp-server/index.ts` linha do `/info` e em `version`.

---

## Health monitoring

Pipeline contínuo de validação para garantir que as tools críticas continuam vivas.

### Tabela `mcp_health_checks`
Colunas: `id`, `run_id`, `tool_name`, `status` (`ok`/`fail`), `http_status`, `latency_ms`, `error`, `response_size`, `checked_at`. RLS: SELECT apenas para admins (`has_role`); INSERT apenas via service_role. Acessível também via MCP através de `list_mcp_health_checks`.

### Edge function `mcp-health-cron`
Corre 8 probes contra `agent-api` com a `EXTERNAL_API_KEY`:
`health_check`, `list_buildings`, `list_intervention_types`, `list_assistances` (path dinâmico — usa primeiro building real), `list_follow_ups`, `list_activity_log`, `list_email_pendencies`, `list_assemblies`.

Persiste 1 linha por probe em `mcp_health_checks` (mesmo `run_id`). Dispara email para `geral@luvimg.com` via Resend **só** quando ≥1 falha E o run imediatamente anterior estava limpo — evita spam em falhas persistentes.

### Cron schedule
`pg_cron` job `mcp-health-cron-5min` corre `*/5 * * * *` via `net.http_post` para a edge function.

### Dashboard `/mcp-health`
Página protegida que (a) corre os probes ao vivo com a key colada no browser e (b) lê o histórico server-side da tabela. Mostra estado por tool, latência, contagem de registos, uptime 24h e tabela com últimos 120 runs.

### Páginas relacionadas
- `/mcp-health` — dashboard com testes ao vivo + histórico do cron
- `/mcp-test` — validador das tools
- `/mcp-diagnostics` — contrato `/chatgpt` retrievable
