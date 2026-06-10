
# Plano: Debug MCP + Health-check periódico + Atualização da documentação

Três entregas paralelas para fechar o ciclo do fix 401 com observabilidade contínua.

## 1. Página de debug MCP (`/mcp-health`)

Nova página React (rota protegida por admin) que executa em tempo real os 6 testes operacionais críticos e mostra estado verde/vermelho por tool.

**Tools testadas (mesma EXTERNAL_API_KEY, via `/mcp-server` JSON-RPC):**
- `health_check`
- `list_buildings`
- `list_intervention_types`
- `list_assistances` (usa primeiro `building_id` devolvido)
- `list_follow_ups`
- `list_activity_log`

**UI:**
- Cards por tool com: HTTP status, latência (ms), nº de registos devolvidos, erro (se houver), timestamp do último run
- Botão "Re-executar tudo" + auto-refresh opcional (30s)
- Badge global "Todos OK / X falhas"
- Link para os logs da edge function quando uma tool falha

**Ficheiros:**
- `src/pages/McpHealthDashboard.tsx` (novo)
- `src/App.tsx` — registar rota `/mcp-health` (protegida)
- `src/components/layout/AppSidebar.tsx` — entrada "MCP Health" na secção admin

## 2. Health-check periódico server-side

Edge function nova `mcp-health-cron` que corre os mesmos 6 testes a cada 5 min via `pg_cron`, persiste resultados e dispara alerta se algum falhar.

**Tabela nova `mcp_health_checks`:**
```
id uuid pk, checked_at timestamptz, tool_name text,
status text ('ok'|'fail'), http_status int,
latency_ms int, error text, response_size int
```
Com RLS (só admins leem via `has_role`) e GRANTs apropriados.

**Edge function `mcp-health-cron/index.ts`:**
- Lê `EXTERNAL_API_KEY` dos secrets
- Para cada tool faz POST ao `/mcp-server` com JSON-RPC `tools/call`
- Insere uma linha por tool em `mcp_health_checks`
- Se ≥1 falha → envia email para `geral@luvimg.com` via Resend (assunto: `[Condo] MCP health-check falhou: <N> tools`) com tabela resumo
- Deduplicação: só envia email se a falha for nova (último run anterior estava OK) — evita spam

**`pg_cron` job:**
- Schedule: `*/5 * * * *`
- Invoca `mcp-health-cron` via `net.http_post` com `service_role` key

**Dashboard `/mcp-health` consome também esta tabela:**
- Gráfico de uptime últimas 24h por tool (% sucesso)
- Histórico das últimas 20 execuções com estado

## 3. Atualização do documento MCP

Atualizar `.lovable/memory/features/mcp-server.md` para refletir o que mudou desde o 401:

- **Secção nova "Auth header priority"**: documenta a ordem correta `x-api-key → Authorization` no `agent-api/extractToken` + nota de que `mcp-server` já não envia `Authorization: Bearer <anon>`. Inclui referência ao teste de regressão `auth_regression_test.ts`.
- **Secção nova "Health monitoring"**: descreve a tabela `mcp_health_checks`, o cron `mcp-health-cron`, a página `/mcp-health` e o fluxo de alertas.
- **Atualizar "Validação"**: lista das 6 tools cobertas pelo monitor + link para o dashboard.
- **Manter** as 48 tools, stack, endpoints (sem mudanças).

## Detalhes técnicos

- A página `/mcp-health` usa o mesmo padrão de `McpDiagnostics.tsx` (fetch direto JSON-RPC, badges shadcn, ScrollArea para JSON cru).
- A EXTERNAL_API_KEY na página de debug é introduzida pelo admin (nunca persistida client-side) — igual ao `/mcp-test`.
- O cron usa a key dos secrets do edge function, nunca exposta ao browser.
- Alertas por email reutilizam o Resend já configurado (`geral@luvimg.com` from address).

## Ordem de implementação

1. Migration: tabela `mcp_health_checks` + RLS + GRANTs
2. Edge function `mcp-health-cron` + secret check (Resend já existe)
3. `pg_cron` job schedule
4. Página `/mcp-health` + rota + sidebar
5. Atualizar `.lovable/memory/features/mcp-server.md`
6. Confirmar 1ª execução do cron e ver linhas na tabela
