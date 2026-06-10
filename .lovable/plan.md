# Corrigir 401 nas chamadas operacionais MCP → agent-api

## Causa raiz (confirmada no código)

O bug está na combinação destes dois trechos:

`mcp-server/index.ts` **(callAgentApi, linhas 33–39)** envia 3 headers:

```ts
"x-api-key": EXTERNAL_API_KEY,          // ✅ chave correcta
"apikey": SUPABASE_ANON_KEY,
"Authorization": `Bearer ${SUPABASE_ANON_KEY}`,  // ❌ anon key no Authorization
```

`agent-api/index.ts` **(extractToken, linhas 67–73)** dá **prioridade ao header** `Authorization`:

```ts
req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? req.headers.get("x-api-key")
```

Resultado: a agent-api compara a **anon key** (do Authorization) com a `EXTERNAL_API_KEY` → falha → 401 em todos os `/v1/...` autenticados. O `x-api-key` correcto nunca chega a ser lido.

**Porque é que health_check "passa":** `/v1/health` não exige auth — mascara completamente o problema. O `/debug/key-check` valida a key recebida pelo MCP, não a propagação para a agent-api.

A `EXTERNAL_API_KEY` é a mesma nos dois lados (ambos lêem o mesmo secret) — o problema é só a ordem de prioridade dos headers.

## Correcção (2 alterações pequenas)

1. `agent-api/index.ts` **— extractToken:** dar prioridade ao `x-api-key` antes do `Authorization`:

```ts
return req.headers.get("x-api-key")
  ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  ?? null;
```

Isto também torna a API robusta para qualquer cliente que envie ambos os headers.

2. `mcp-server/index.ts` **— callAgentApi:** remover o header `Authorization: Bearer <anon>` (a agent-api tem `verify_jwt = false`; o header `apikey` mantém-se para o routing do Supabase). Defesa em profundidade — mesmo que alguém reverta a alteração 1, deixa de haver conflito.

## Validação (após deploy)

Chamar via `tools/call` no `/mcp-server` com a mesma key e confirmar HTTP 200 + dados reais:

- `list_buildings`
- `list_intervention_types`
- `list_assistances` (com um building_id real devolvido por list_buildings)
- `get_assistance`
- `list_follow_ups`
- `list_activity_log`

Confirmo também que o validador na página `/mcp-test` passa de ponta a ponta.

## Sem alterações em

- Base de dados, secrets, frontend (excepto nada — só os 2 edge functions)