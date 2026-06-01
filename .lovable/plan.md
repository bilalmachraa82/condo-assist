## Diagnóstico atual

O servidor **está live** e responde corretamente no endpoint real:

```text
GET /functions/v1/mcp-server/chatgpt                  -> 200
POST initialize sem auth                              -> 200
POST tools/list sem auth                              -> 200, devolve search + fetch
```

Os logs também mostram `mcp.request` e `mcp.response` com `status: 200`, portanto o problema já **não parece ser deploy, base de dados, nem 401 no discovery**.

A nova hipótese mais forte é: **o ChatGPT/Builder está a rejeitar ou não indexar o descriptor porque removemos `outputSchema`, mas a documentação oficial atual para data-only/deep research recomenda/espera `outputSchema` em `search` e `fetch`.**

## O que vou alterar

### 1. Repor `outputSchema` nos descriptors do `/chatgpt`

Em `supabase/functions/mcp-server/index.ts`, nos descriptors públicos:

- `search.outputSchema`:
  - objeto com `results`
  - `results[]` com `id`, `title`, `url`
  - `additionalProperties: false`

- `fetch.outputSchema`:
  - objeto com `id`, `title`, `text`, `url`, `metadata`
  - `id`, `title`, `text`, `url` obrigatórios
  - `metadata` opcional
  - `additionalProperties: false`

Vou manter fora os campos mais suspeitos/ruidosos:

- não repor `title`
- não repor `idempotentHint`

### 2. Validar que a execução já devolve shape compatível

Confirmar que `tools/call search` e `tools/call fetch` devolvem:

```text
structuredContent
content[0].type = "text"
content[0].text = JSON string do mesmo payload
```

Se faltar algum campo obrigatório, ajustar apenas o `/chatgpt` para cumprir o contrato.

### 3. Deploy do edge function

Deploy imediato de:

```text
supabase/functions/mcp-server
```

Sem migrações de base de dados, porque a listagem de ferramentas não depende da DB.

### 4. Testes no endpoint real

Testar de novo:

```text
GET /chatgpt                    -> 200 com tools + outputSchema
POST initialize sem auth         -> 200
POST tools/list sem auth         -> 200 com search + fetch + outputSchema
POST tools/call search sem auth  -> 401
```

Se existir `EXTERNAL_API_KEY` disponível nos secrets, testar também:

```text
POST tools/call search com x-api-key -> 200
```

### 5. Atualizar diagnóstico visual, se necessário

Atualizar `/mcp-diagnostics` para deixar de marcar `outputSchema` como erro e passar a validá-lo como esperado.

## Passo obrigatório depois da correção

Depois do deploy, no ChatGPT Builder:

1. Apagar totalmente o conector/app **Condominio v8**.
2. Criar um novo, não editar o antigo.
3. Usar exatamente:

```text
https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server/chatgpt
```

4. Transport: HTTP / Streamable HTTP.
5. Auth: custom header `x-api-key` com o valor de `EXTERNAL_API_KEY`.

## Se ainda aparecer 0 actions depois disto

Aí o mais provável passa a ser uma destas causas externas ao endpoint:

- estás a configurar em **Actions/OpenAPI** e não em **MCP app/connector**;
- a conta/plano/workspace ainda não tem MCP apps/full connectors ativo;
- cache/recache do Builder mesmo após edição, exigindo delete + novo nome;
- o Builder está a chamar outro URL que não `/chatgpt`.

Os logs por `correlationId` vão confirmar qual destes casos está a acontecer.