Vou corrigir especificamente o endpoint configurado no Builder:

`https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server/chatgpt`

## Diagnóstico atual

- O `/debug/tools?variant=chatgpt` mostra que o handler interno consegue listar `search` e `fetch`.
- Mas isso ainda não prova que o Builder recebe exatamente a mesma resposta no endpoint real `/mcp-server/chatgpt`.
- A documentação oficial atual da OpenAI para MCP/deep research diz que servidores retrievable devem implementar duas tools read-only: `search` e `fetch`, com output schema, e que as respostas devem incluir o objeto em `structuredContent` e também o mesmo JSON serializado em `content[].text`.
- Isto contradiz a hipótese anterior de remover `structuredContent`; para passar conformance, vou alinhar o `/chatgpt` com a documentação oficial da OpenAI.

## Alteração principal

Substituir o `/chatgpt` por um handler MCP JSON-RPC mínimo e explícito, sem depender do wrapper `mcp-lite` nesse sub-endpoint.

O endpoint `/mcp-server` completo continua como está para outros clientes, mas `/mcp-server/chatgpt` passa a responder diretamente a:

1. `initialize`
2. `notifications/initialized`
3. `tools/list`
4. `tools/call`

## Tools publicadas no `/chatgpt`

Publicar apenas duas tools no `tools/list` real do endpoint `/chatgpt`:

- `search`
- `fetch`

Sem `health_check`, sem aliases, sem catálogo extra.

Cada descriptor terá:

- `name` exatamente `search` ou `fetch`
- `annotations.readOnlyHint: true`
- `annotations.openWorldHint: false`
- `annotations.destructiveHint: false`
- `inputSchema.type: "object"`
- `inputSchema.required` correto
  - `search`: `["query"]`
  - `fetch`: `["id"]`
- `inputSchema.additionalProperties: false`
- `outputSchema` explícito para validar o resultado

## Respostas de execução

Atualizar `tools/call` de `search` e `fetch` no `/chatgpt` para devolver o formato oficial recomendado pela OpenAI:

```json
{
  "structuredContent": { "results": [] },
  "content": [
    {
      "type": "text",
      "text": "{\"results\":[]}"
    }
  ]
}
```

Para `fetch`, o `structuredContent` terá:

```json
{
  "id": "...",
  "title": "...",
  "text": "...",
  "url": "...",
  "metadata": {}
}
```

## Debug e logs

Reforçar os logs e o `/debug/tools` para comparar Builder vs testes manuais:

- correlationId por request
- log de `initialize`, `tools/list`, `tools/call`
- método HTTP, path real, user-agent, accept, content-type
- se a chamada foi para `chatgpt` ou `full`
- tool chamada
- resultado da validação do `tools/list`
- snippet da resposta enviada
- header `x-correlation-id` exposto

Atualizar `/debug/tools?variant=chatgpt` para chamar o mesmo handler direto usado por `/mcp-server/chatgpt`, devolvendo:

- endpoint validado
- raw `initialize`
- raw `tools/list`
- descriptors de `search` e `fetch`
- validações booleanas (`hasSearch`, `hasFetch`, schemas estritos, readOnlyHint)
- últimas requests capturadas no isolamento atual

## Validação final

Depois de implementar e publicar a edge function, testar em produção:

1. `POST /mcp-server/chatgpt` com `initialize`
2. `POST /mcp-server/chatgpt` com `tools/list`
3. Confirmar que `tools/list.result.tools[0].name === "search"`
4. Confirmar que existe `fetch`
5. `POST /mcp-server/chatgpt` com `tools/call search`
6. `POST /mcp-server/chatgpt` com `tools/call fetch`
7. Confirmar logs com `correlationId`
8. Confirmar `/debug/tools?variant=chatgpt` mostra a resposta exata do handler real

Isto isola o problema do Builder: se continuar a mostrar `search action not found`, os logs vão provar se o Builder está ou não a chamar `tools/list` no endpoint `/chatgpt` e que payload recebeu.