## Objetivo
1. Garantir que as edge functions modificadas (mcp-server v1.4.0, agent-api) estão de facto deployadas.
2. Mostrar o código do edifício na página **Chaves**.
3. Trocar a ordem das linhas nos cards de **Pendências Email**: morada (com código do edifício) no topo, assunto por baixo.

## 1. Deploy das Edge Functions
- Executar deploy explícito de `mcp-server` e `agent-api` via `supabase--deploy_edge_functions`.
- Validar com `supabase--curl_edge_functions`:
  - `GET /mcp-server/` → confirmar `version: "1.4.0"` e `toolCount: 133`.
  - `POST /agent-api/v1/...` com `x-api-key` em endpoint que tenha sofrido alteração (ex.: `list_assistances` com `status=open`) → confirmar 200 e não 500.
- Reportar versão deployada ao utilizador.

## 2. Página Chaves (`src/pages/Keys.tsx`)
- Substituir `formatBuildingAddress` por `formatBuildingLabel` na coluna **Edifício** (tabela e PDF de impressão) para passar a mostrar `CÓDIGO - Nome` em vez de só a morada.
- Atualizar também a função `buildingLabel(h)` para devolver o label completo (código + nome). Mantém-se a ordenação por código.

## 3. Pendências Email (`src/pages/EmailPendencies.tsx`)
Atualmente cada card mostra:
```
[topo]   Assunto
[abaixo] 🏢 CÓDIGO - Morada
```
Passa a mostrar:
```
[topo]   🏢 CÓDIGO - Morada
[abaixo] Assunto
```
- Trocar a ordem dos dois `<div>` no card: o `buildingLabel` (com ícone Building2) passa para o topo com estilo `font-semibold truncate`; o `primaryLabel` (assunto) fica em baixo com `text-sm text-muted-foreground`.
- Não alterar lógica de filtros, ordenação, badges nem `cleanPendencyTitle` / `ensureBuildingCodeInSubject`.
- Avaliar se o Kanban (`PendencyKanban`) deve seguir o mesmo padrão — confirmar com o utilizador se quer aplicar lá também (por agora, apenas na vista Lista, que é o que foi pedido).

## Validação
- Build automático passa.
- Verificar `/chaves` mostra coluna Edifício como `CÓDIGO - Nome`.
- Verificar `/pendencias-email` mostra morada+código no topo e assunto abaixo.
- `mcp-server` responde com versão 1.4.0.

## Notas técnicas
- Nenhuma alteração de schema, RLS ou endpoints MCP.
- Nenhum nome de tool MCP é alterado.