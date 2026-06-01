
## Causa raiz (hipótese forte, a confirmar com logs)

`POST /functions/v1/mcp-server/chatgpt` responde **401** sem `x-api-key` já no `initialize`/`tools/list`. O ChatGPT Agent Builder **pode** estar a fazer discovery/indexação numa fase em que as credenciais ainda não estão a ser aplicadas ao request. Se isso acontecer, um 401 em `initialize` ou `tools/list` explica o estado de "0 actions" no catálogo. Tratamos isto como **hipótese principal muito forte**, a confirmar com logs observáveis após o deploy.

O shape dos descriptors está correto — não é a causa principal, mas tem ruído (`title`, `outputSchema`, `idempotentHint`) que vale limpar na mesma iteração.

## Fase 1 — Correção mínima no `/chatgpt`

### 1.1 Discovery sem auth, execution com auth (bypass mínimo)

No middleware Hono (`supabase/functions/mcp-server/index.ts`, linhas ~1605–1682), antes de validar `x-api-key`:

- se `pathname` termina em `/chatgpt` E método HTTP é `POST` E body JSON-RPC tem `method ∈ { "initialize", "tools/list", "ping" }` → deixar passar **sem auth**.
- **Tudo o resto continua com auth**, incluindo `tools/call`, `notifications/*` e qualquer outro método. Não alargamos o bypass além do estritamente necessário nesta iteração.
- Suportar batch JSON-RPC (array): só passa sem auth se TODAS as entradas estiverem na whitelist acima; qualquer outra entrada força exigência de `x-api-key`.

Implementação: ler o body uma vez (clone do Request), fazer peek do(s) `method`, reconstruir um novo `Request` com o mesmo body para o `chatgptRpcHandler`.

### 1.2 Descriptors no contrato mínimo retrievable

Em `chatgptSearchDescriptor` e `chatgptFetchDescriptor` (linhas ~1351–1393):

- remover `title`
- remover `outputSchema` do descriptor publicado (manter a implementação interna, que continua a devolver `structuredContent` no shape esperado)
- remover `annotations.idempotentHint`
- manter exatamente: `name`, `description`, `inputSchema { type, properties, required, additionalProperties: false }`, `annotations { readOnlyHint: true, openWorldHint: false, destructiveHint: false }`

## Fase 2 — Verificação no endpoint real (não no /debug)

Após o deploy, correr 4 testes contra `/functions/v1/mcp-server/chatgpt` e anexar os resultados:

```text
POST initialize        sem auth → 200 (protocolVersion + serverInfo)
POST tools/list        sem auth → 200 (tools = [search, fetch], shape mínimo)
POST tools/call search sem auth → 401
POST tools/call search com x-api-key → 200 (content[0].text JSON + structuredContent.results)
```

Só avançamos para a Fase 3 se os 4 baterem certo.

## Fase 3 — Atualizar `/mcp-diagnostics`

- Painel "Endpoint real (sem auth)": faz `initialize` e `tools/list` diretos a `/chatgpt` (não ao `/debug/tools`) e mostra status, content-type e body cru.
- Painel "Tool call autenticado": input para colar a `EXTERNAL_API_KEY` (só client-side, nunca persistido) e botões para `tools/call search` / `tools/call fetch` contra `/chatgpt`.
- Manter os painéis atuais para comparação histórica.

## Fase 4 — Builder + confirmação observável

1. No ChatGPT Agent Builder: **apagar** o conector "Condo Assist".
2. **Recriar** com URL `https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server/chatgpt` e `x-api-key`.
3. Verificar que aparecem 2 actions (`search`, `fetch`) no catálogo.
4. Abrir `Edge Function Logs` do `mcp-server` e procurar requests vindos do Builder com `correlationId` — confirmar (ou refutar) se o Builder está a fazer `initialize` / `tools/list` **sem** header `x-api-key`. Isso fecha a hipótese.

## Notas de segurança

- O bypass sem auth expõe apenas: nome do servidor, versão de protocolo e o shape dos 2 descriptors públicos. Não expõe dados de negócio, não permite executar tools, não toca `tools/call`.
- Toda a execução (`tools/call`), o handler `/mcp-server` completo e todos os outros endpoints continuam protegidos por `x-api-key`.
- Sem alterações a tabelas, RLS, ou outros endpoints.
