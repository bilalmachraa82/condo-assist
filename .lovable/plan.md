

# Plan: Expandir Agent API + MCP para acesso completo à app

## Objectivo
Garantir que **tudo o que se consulta ou cria na app** está acessível via Agent API REST e via MCP (Claude Desktop). Actualmente faltam: Seguimento de Actas, Fornecedores, Orçamentos, Edifícios (CRUD), Follow-ups, Notificações, Fotos, Listagem de comunicações/contactos, e update de assistências.

## Alterações em `supabase/functions/agent-api/index.ts`

Adicionar **22 novos endpoints** REST (segue padrão existente: `matchRoute` + handler + validação UUID + PII masking + idempotency onde aplicável):

### Edifícios
- `GET /v1/buildings` — listar (filtros: q, is_active, limit, offset)
- `GET /v1/buildings/:id` — detalhe
- `POST /v1/buildings` — criar (idempotent)
- `PATCH /v1/buildings/:id` — actualizar

### Assistências (complementar)
- `PATCH /v1/assistances/:id` — actualizar (status, supplier, dates, priority, description, etc.)
- `GET /v1/assistances/:id/communications` — listar log
- `GET /v1/assistances/:id/photos` — listar fotos (com signed URLs)
- `GET /v1/assistances/:id/progress` — timeline de progresso

### Fornecedores
- `GET /v1/suppliers` — listar (filtros: q, specialization, is_active)
- `GET /v1/suppliers/:id` — detalhe
- `POST /v1/suppliers` — criar
- `PATCH /v1/suppliers/:id` — actualizar

### Seguimento de Actas (assembly_items)
- `GET /v1/assembly-items` — listar (filtros: building_id, building_code, status, category, year, q)
- `GET /v1/assembly-items/:id` — detalhe
- `POST /v1/assembly-items` — criar (idempotent)
- `PATCH /v1/assembly-items/:id` — actualizar
- `DELETE /v1/assembly-items/:id` — eliminar

### Orçamentos
- `GET /v1/quotations` — listar (filtros: assistance_id, supplier_id, status)
- `GET /v1/quotations/:id` — detalhe

### Contactos
- `GET /v1/buildings/:id/contacts` — listar contactos do edifício

### Follow-ups & Notificações
- `GET /v1/follow-ups` — listar agendamentos
- `GET /v1/notifications` — listar (filtro: assistance_id, supplier_id)

### Tipos de intervenção (CRUD)
- `POST /v1/intervention-types` — criar
- `PATCH /v1/intervention-types/:id` — actualizar

## Alterações em `supabase/functions/mcp-server/index.ts`

Adicionar uma **MCP tool por endpoint** novo (~22 tools), seguindo o padrão `mcp.tool("name", { description PT, inputSchema, handler → callAgentApi })`. Total final: **~37 tools**.

Agrupar por área no description (ex: `[Fornecedores]`, `[Actas]`, `[Orçamentos]`) para Claude as encontrar facilmente.

## Atualizações de documentação

- `supabase/functions/agent-api/openapi.yaml` — adicionar specs dos 22 endpoints novos
- `supabase/functions/mcp-server/README.md` — listar novas tools por categoria
- `mem://features/mcp-server` — actualizar contagem (15 → 37) e lista de áreas cobertas

## Sem alterações de DB
Todas as tabelas já existem e têm RLS. A Agent API usa service_role (bypass RLS), o que é o comportamento já estabelecido e auditado.

## Validação pós-deploy
- Curl `/v1/health` para confirmar deploy
- Curl 2-3 endpoints novos (ex: `GET /v1/suppliers`, `GET /v1/assembly-items`) com `x-api-key`
- `GET /mcp-server/info` — confirmar `tools: 37`
- Sem alterações ao auth, rate-limit, idempotency ou CORS (mantêm-se)

