## Diagnóstico confirmado

- O endpoint correto é `https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server`.
- A função publicada responde em produção: `GET /info` devolve `tools: 66` e `transport: streamable-http`.
- O segredo `EXTERNAL_API_KEY` existe.
- O código tem uma tool chamada exatamente `search`, mas há fortes sinais de incompatibilidade no discovery do Agent Builder:
  - O servidor usa `mcp-lite` e atualmente regista tools com `inputSchema` em JSON Schema direto.
  - A documentação atual do `mcp-lite` recomenda `schemaAdapter` quando há schemas de validação; sem isso, algumas serializações podem não sair no formato esperado por clientes mais estritos.
  - `search` e `fetch` têm `structuredContent` via helper global, mas o standard OpenAI para search/fetch exige retorno com exatamente um item `content: [{ type: "text", text: JSON.stringify(...) }]`; para o Builder, convém não adicionar campos extra nestas duas tools.
  - O `fetch` não declara `outputSchema`, enquanto o Agent Builder tende a validar descriptors mais estritamente.
  - O erro “search action not found” pode acontecer quando `tools/list` existe mas o descriptor de `search` não corresponde ao formato esperado, fazendo o Builder ignorá-lo.

## Plano de correção

1. **Ajustar compatibilidade do servidor MCP**
   - Em `supabase/functions/mcp-server/index.ts`, inicializar o `McpServer` com `schemaAdapter` do Zod para garantir JSON Schema consistente.
   - Importar `zod` já presente no `deno.json`.
   - Rever o wrapper global de `mcp.tool` para preservar `title`, `description`, `inputSchema`, `outputSchema`, `_meta` e `annotations` sem alterar indevidamente o descriptor.

2. **Tornar `search` e `fetch` estritamente compatíveis com OpenAI/ChatGPT**
   - Manter os nomes exatos: `search` e `fetch`.
   - Marcar ambas como read-only com `annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false }`.
   - Garantir input schemas simples e exatos:
     - `search`: `{ query: string }`
     - `fetch`: `{ id: string }`
   - Adicionar `outputSchema` ao `fetch` com `id`, `title`, `text`, `url`, `metadata` opcional.
   - Fazer `search` e `fetch` devolverem apenas um content item JSON text, sem `structuredContent`, para cumprir o standard de search/fetch usado por ChatGPT connectors, company knowledge e deep research.

3. **Adicionar rota de diagnóstico compatível com Builder**
   - Adicionar um endpoint público ou protegido tipo `/debug/tools` que devolva um resumo dos descriptors publicados (`name`, `inputSchema`, `outputSchema`, `annotations`) para confirmar rapidamente se `search` aparece exatamente como o Builder deveria ver.
   - Não expor dados sensíveis nem a API key.

4. **Atualizar documentação operacional**
   - Atualizar `supabase/functions/mcp-server/README.md` para `66 tools`, ChatGPT Agent Builder, Streamable HTTP, header `x-api-key`, e comandos de validação.
   - Corrigir referências antigas a “48 tools”.

5. **Deploy e validação em produção**
   - Deploy da edge function `mcp-server`.
   - Validar em produção com:
     - `initialize`
     - `tools/list`
     - presença exata de `search`
     - schema de `search`
     - `tools/call` de `search`
     - `tools/call` de `fetch` quando houver um ID retornado
   - Confirmar se o resultado publicado é o mesmo endpoint `zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server`.

## Resultado esperado

Depois da implementação, o ChatGPT Agent Builder deverá deixar de mostrar “search action not found” e passar a listar pelo menos as actions `search` e `fetch`, além das restantes tools elegíveis.