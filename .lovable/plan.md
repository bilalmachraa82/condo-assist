## Bugs confirmados (e causa real)

**BUG 1 — `lookup_building_by_email` ignora administradores**
`agent-api` linha 280-311 (`handleLookupBuilding`) só procura em `condominium_contacts`. A tabela `building_administrators` (que tem coluna `email` e é onde estão os admins do edifício 175) nunca é consultada. Mesmo o `condominium_contacts` está a usar `.ilike(email, normalized)` (sem `lower(trim())` no lado da BD), correcto para emails simples mas falha em variações com espaços.

**BUG 2 — `list_email_pendencies` 500 em `status="open"`**
Confirmado com query directa: o enum real é `pendency_status` com valores **`aberto, aguarda_resposta, resposta_recebida, precisa_decisao, escalado, resolvido, cancelado`** (40 + 18 linhas em `aberto`/`aguarda_resposta`). Em `agent-api` linha 1850 faz `q.eq("status", status)` directo; quando o agente envia `"open"` o Postgres rejeita o cast para o enum e devolve erro → handler converte em 500 genérico.

**BUG 3 — `search` exige `query`, agente envia `q`**
`searchDef` (mcp-server linha 1756-1772) só aceita `query`. Outras tools usam `q`. Validação automática do wrapper acusa "Parâmetro obrigatório em falta: query".

## Bugs adicionais detectados durante a auditoria

**BUG 4 — Aliases de status em `list_assistances` também são frágeis**
A tool documenta `status: open/closed/...` mas `assistances.status` é também enum próprio (`pending/in_progress/completed/...`). Hoje passa só por tal e qual; se o agente mandar um alias inglês explode com 500 igual ao bug 2. Aplicar a mesma normalização (alias → lista de estados reais + 400 se inválido).

**BUG 5 — `.single()` residual em `create/update` handlers de pendências e administrators**
Linhas 1674/1685/1894/1906 ainda usam `.single()`; em insert/update normalmente devolve 1 linha, mas se um trigger filtrar via RLS dá 500. Trocar por `.maybeSingle()` + erro descritivo.

**BUG 6 — Inputs do agente com `status` em maiúsculas/acentos**
Normalizar `status?.trim().toLowerCase()` em todos os filtros enum antes da query.

## Plano de correção (sem renomear tools)

### 1. `supabase/functions/agent-api/index.ts` — `handleLookupBuilding`

Reescrever para procurar em paralelo nas duas tabelas, com email normalizado:

- `email_norm = email.trim().toLowerCase()`
- Query 1: `building_administrators` `.select("building_id, name, email, role, buildings(id,code,name,address)").ilike("email", email_norm)`
- Query 2: `condominium_contacts` `.select("first_name,last_name,fraction,role,email, buildings(id,code,name,address)").ilike("email", email_norm)`
- Se 0 resultados → 404 `NOT_FOUND` (mcp-server já trata como `{found:false}`).
- Se ≥1 → devolver `{ found:true, matches:[{building_id, building_code, name, address, match_type:"administrator"|"contact", role, contact:{...}}] }` ordenado por `match_type` (admin primeiro).
- Fallback opcional por domínio: se 0 matches por email exacto, tentar `email.split('@')[1]` em ambas as tabelas via `ilike('email', '%@'+domain)` e marcar `match_type:"domain"`.

### 2. `supabase/functions/agent-api/index.ts` — `handleListEmailPendencies`

Adicionar mapa de aliases imediatamente antes de `q.eq("status", status)`:

```
const PENDENCY_STATUS = ["aberto","aguarda_resposta","resposta_recebida","precisa_decisao","escalado","resolvido","cancelado"];
const OPEN_STATES = ["aberto","aguarda_resposta","resposta_recebida","precisa_decisao","escalado"];
const CLOSED_STATES = ["resolvido","cancelado"];
```

- `status === "open"` → `q.in("status", OPEN_STATES)`
- `status === "closed"` → `q.in("status", CLOSED_STATES)`
- enum válido → `q.eq("status", status)`
- inválido → `400 { error, code:"INVALID_STATUS", valid_values:[...,"open","closed"] }` (NUNCA 500).

Envolver a query em try/catch e devolver 400 com `details` se o Postgres ainda assim rejeitar.

### 3. Aplicar a mesma normalização em `handleListAssistances` (status assistências)

Construir alias map equivalente para o enum `assistance_status` (`pending/in_progress/completed/...`) e devolver 400 em vez de 500 quando alias é desconhecido.

### 4. `supabase/functions/mcp-server/index.ts` — `searchDef`

- `inputSchema.properties` aceita `query` E `q` (ambos string).
- `required: []` (validação manual no handler).
- Handler: `const term = (args.query ?? args.q ?? "").toString().trim();` — se vazio devolver `{results:[]}`, sem erro.
- Manter `additionalProperties:false` removido ou alargado (para passar `q`).
- Repetir igual em `chatgptSearchDescriptor` (variant `/chatgpt`) para consistência.

### 5. Substituir `.single()` por `.maybeSingle()` nos handlers de write

`handleCreate/Update/UpsertBuildingAdministrator`, `handleCreateEmailPendency`, `handleUpdateEmailPendency`, `handleCreateCondominiumContact`, `handleUpdateCondominiumContact` (linhas 1674/1685/2454/2463/1894/1906). Em null → 404; em erro → 400/500 com mensagem clara.

### 6. Verificação end-to-end

Após deploy, executar via `curl` (REST) e via JSON-RPC (`tools/call`):

1. `lookup_building_by_email` com um dos 3 emails de admins do edifício 175 → devolve `building_code:"175"` e `match_type:"administrator"`.
2. `list_email_pendencies` com `status="open"` → 200 com ≥58 pendências; com `status="lixo"` → 400 limpo; sem `status` → 200 com todas.
3. `search` com `{q:"175"}` → 200 com resultados; com `{query:"175"}` → idem; sem nada → `{results:[]}`.
4. `list_assistances` com `status="lixo"` → 400 (não 500).
5. Re-correr `auth_regression_test.ts` e o `mcp-health-cron` para confirmar 0 regressões.

### 7. Documentação

Bump `mcp-server` versão para `1.3.2`. Actualizar `supabase/functions/mcp-server/README.md` (notas sobre alias `q`/`query` no search, aliases de status em `list_email_pendencies` e `list_assistances`, e que `lookup_building_by_email` cobre admins + contactos). Actualizar `.lovable/memory/features/mcp-server.md` com a mesma informação.

## Não-objectivos (preserva a config dos clientes MCP já ligados)

- Não renomear nenhuma das 128 tools.
- Não alterar URLs do endpoint `/mcp-server` nem do `/chatgpt`.
- Não remover propriedades existentes — só adicionar (`q` ao lado de `query`).
