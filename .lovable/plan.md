## Confirmação feita online e no servidor publicado

Pesquisei a documentação atual da OpenAI/ChatGPT Apps SDK e MCP:

- OpenAI Apps SDK recomenda MCP por HTTPS, discovery via `tools/list`, execução via `tools/call`, descritores com `name`, `description`, `inputSchema`, `outputSchema` quando aplicável e `annotations.readOnlyHint`.
- A página “Connect from ChatGPT” confirma que, ao criar o connector, o ChatGPT deve chamar o endpoint MCP e mostrar a lista de tools anunciadas.
- A especificação MCP permite `tools/list` devolver tools com `name`, `title`, `description`, `inputSchema`, `outputSchema` e `annotations`.
- Encontrei também relatos recentes de falhas específicas do Agent Builder com MCP HTTP customizado, incluindo casos em que o Builder inicializa mas não lista tools, ou falha com “search action not found”.

## Estado atual confirmado em produção

Endpoint testado:

```text
https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server
```

Com `Accept: application/json`, o endpoint publicado devolve:

- `tools/list` com 66 tools.
- Tool chamada exatamente `search`.
- Tool chamada exatamente `fetch`.
- `search.annotations.readOnlyHint: true`.
- `fetch.annotations.readOnlyHint: true`.
- `search.inputSchema.required: ["query"]`.
- `fetch.inputSchema.required: ["id"]`.
- `search.inputSchema.additionalProperties: false`.
- `fetch.inputSchema.additionalProperties: false`.
- `tools/call search` devolve só:

```json
{
  "content": [
    { "type": "text", "text": "{...json...}" }
  ]
}
```

- `tools/call search` não devolve `structuredContent`.

## Problemas reais encontrados

1. **Diferença crítica de transporte/conteúdo**

Quando testado com o header típico MCP:

```text
Accept: application/json, text/event-stream
```

o `mcp-lite` responde `tools/list` como:

```text
Content-Type: text/event-stream

data: {"jsonrpc":"2.0", ...}
```

Quando testado com:

```text
Accept: application/json
```

o mesmo `tools/list` responde JSON normal:

```text
Content-Type: application/json
{"jsonrpc":"2.0", ...}
```

Isto é provavelmente a incompatibilidade: o Agent Builder pode estar a enviar o header misto MCP mas a falhar ao processar o `text/event-stream` do `mcp-lite`, resultando em zero actions.

2. **`fetch` não tem `outputSchema` publicado**

Apesar da intenção anterior, o `tools/list` real publicado mostra que `fetch` ainda não inclui `outputSchema`. Não é obrigatório para retorno sem `structuredContent`, mas é recomendado pela OpenAI para discovery/model reasoning.

3. **Catálogo demasiado grande e schemas não estritos**

Mesmo com `search`/`fetch` corretas, as outras 64 tools têm vários schemas sem `additionalProperties: false`. Clientes OpenAI/Agent Builder parecem mais sensíveis a catálogos grandes ou descriptors menos estritos. Isto pode fazer o Builder rejeitar a lista inteira antes de mostrar actions.

## Plano de correção

### 1. Normalizar respostas MCP para JSON no endpoint usado pelo ChatGPT

Alterar `supabase/functions/mcp-server/index.ts` para que chamadas JSON-RPC `POST` como:

- `initialize`
- `notifications/initialized`
- `tools/list`
- `tools/call`

respondam em `application/json` sempre que possível, mesmo quando o cliente envia:

```text
Accept: application/json, text/event-stream
```

Isto continua compatível com MCP Streamable HTTP porque o cliente aceita `application/json`, e remove a ambiguidade do `data: ...` SSE que pode estar a quebrar o Agent Builder.

### 2. Adicionar `outputSchema` explícito a `search` e `fetch`

Publicar no descriptor real:

- `search.outputSchema`:

```json
{
  "type": "object",
  "properties": {
    "results": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "title": { "type": "string" },
          "url": { "type": "string" }
        },
        "required": ["id", "title", "url"],
        "additionalProperties": false
      }
    }
  },
  "required": ["results"],
  "additionalProperties": false
}
```

- `fetch.outputSchema`:

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "title": { "type": "string" },
    "text": { "type": "string" },
    "url": { "type": "string" },
    "metadata": { "type": "object", "additionalProperties": true }
  },
  "required": ["id", "title", "text", "url"],
  "additionalProperties": false
}
```

Manter o resultado de execução sem `structuredContent`, só com `content` JSON text, como pediste.

### 3. Criar modo ChatGPT-safe para discovery

Para evitar que o Agent Builder rejeite as 66 tools por causa de uma tool não estrita, fazer o endpoint principal publicar inicialmente uma lista segura para ChatGPT:

- `search`
- `fetch`
- `health_check` opcional

Todas com schemas estritos, `additionalProperties: false`, `readOnlyHint: true` e responses simples.

As restantes 64 tools podem continuar disponíveis internamente/para clientes menos restritivos numa rota ou modo separado, mas o conector ChatGPT deve primeiro ficar operacional com o catálogo obrigatório `search`/`fetch`.

### 4. Garantir que `tools/list` e `tools/call` usam exatamente o mesmo endpoint

Não depender do `/debug/tools` para validação. O mesmo endpoint:

```text
/functions/v1/mcp-server
```

deve responder corretamente a:

```json
{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}
```

e deve executar:

```json
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search","arguments":{"query":"teste"}}}
```

### 5. Adicionar logs de diagnóstico sem expor segredos

Adicionar logs temporários/seguros para cada chamada MCP:

- método JSON-RPC (`initialize`, `tools/list`, `tools/call`)
- user-agent resumido
- status HTTP
- content-type devolvido
- se `tools/list` incluiu `search`/`fetch`

Isto permite confirmar se o Agent Builder está realmente a chamar `tools/list` ou se fica parado depois do `initialize`.

### 6. Atualizar documentação operacional

Atualizar `supabase/functions/mcp-server/README.md` com:

- Configuração correta para ChatGPT Agent Builder.
- Nota de que o endpoint responde JSON mesmo com `Accept: application/json, text/event-stream`.
- Testes curl para `initialize`, `tools/list`, `tools/call search`, `tools/call fetch`.
- Nota sobre `x-api-key`.

### 7. Deploy e validação final

Depois da implementação, validar em produção:

- `GET /info` confirma versão nova.
- `POST initialize` responde 200 JSON.
- `POST tools/list` com `Accept: application/json, text/event-stream` responde `Content-Type: application/json`.
- `tools/list` contém `search` e `fetch` com nomes exatos.
- `readOnlyHint: true` em ambas.
- `required` e `additionalProperties: false` corretos.
- `search` e `fetch` têm `outputSchema`.
- `tools/call search` devolve apenas `content` e sem `structuredContent`.
- `tools/call fetch` devolve apenas `content` e sem `structuredContent`.
- Confirmar nos logs se o ChatGPT Agent Builder chamou `tools/list`.