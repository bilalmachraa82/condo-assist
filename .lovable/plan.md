## Diagnóstico — estado actual

Acabei de auditar o `mcp-server` em produção. Resultados:

| Teste | Resultado |
|---|---|
| `GET /functions/v1/mcp-server/info` | ✅ HTTP 200 — `{"name":"condo-assist-mcp","version":"1.0.0","transport":"streamable-http","tools":63}` |
| `POST` sem auth | ✅ HTTP 401 (rejeita correctamente) |
| `POST` com chave errada | ✅ HTTP 401 |
| `EXTERNAL_API_KEY` em Edge Function Secrets | ✅ presente |
| Middleware auth aceita `x-api-key`, `Authorization: Bearer`, e `?api_key=` | ✅ |
| CORS expõe `mcp-session-id` e aceita headers do MCP | ✅ |
| `verify_jwt = false` em `config.toml` | ✅ |

**Conclusão:** o servidor MCP está ligado e a responder. O problema **não é o servidor** — é a forma como o ChatGPT/Codex está a falar com ele.

## Causa provável da falha no ChatGPT

O conector "Custom MCP" do **ChatGPT (Apps SDK / Developer mode)** exige que o servidor exponha **duas ferramentas obrigatórias**: `search` e `fetch`. Sem elas o conector liga-se mas o ChatGPT recusa-se a usá-lo nas conversas (silenciosamente, ou com mensagem genérica de "no compatible tools").

O nosso servidor tem 63 ferramentas mas **nenhuma chamada `search` nem `fetch`** — por isso o ChatGPT vê-o como inválido.

Para o **Codex CLI** o problema é diferente: o Codex só suporta MCP **stdio**, por isso tem de usar o adaptador `mcp-remote`. A config TOML já fornecida está correcta; resta confirmar que a chave foi colada sem quebras de linha.

## Plano

### 1. Adicionar tools `search` e `fetch` ao `mcp-server` (compatibilidade ChatGPT)

No `supabase/functions/mcp-server/index.ts`, antes do bloco `corsHeaders`, registar:

- **`search`** — input `{ query: string }`. Pesquisa transversal em:
  - assistências (por título/descrição)
  - edifícios (por código/nome)
  - fornecedores (por nome)
  - base de conhecimento (full-text)

  Devolve no formato esperado pelo Apps SDK:
  ```json
  { "results": [{ "id": "...", "title": "...", "url": "..." }, ...] }
  ```

- **`fetch`** — input `{ id: string }`. Recebe um id no formato `tipo:uuid` (ex: `assistance:abc-...`, `building:...`, `supplier:...`, `knowledge:...`) e devolve o documento completo via agent-api correspondente, no formato:
  ```json
  { "id": "...", "title": "...", "text": "...", "url": "...", "metadata": {...} }
  ```

Actualizar contador `tools: 63 → 65` no endpoint `/info`.

### 2. Verificação pós-deploy

Após deploy automático, correr:

```bash
curl -X POST https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server \
  -H "x-api-key: <CHAVE>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq '.result.tools | map(.name) | .[0:5], length'
```

Deve mostrar `65` e incluir `search` + `fetch`.

### 3. Reconfigurar o conector no ChatGPT

No formulário "Adicionar conector":
- **URL:** `https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server`
- **Autenticação:** Cabeçalho personalizado
- **Nome:** `x-api-key`  
- **Valor:** colar `EXTERNAL_API_KEY` (do dashboard Supabase → Edge Function Secrets, sem espaços/quebras)
- **Aviso "Compreendo e quero continuar":** marcado
- Criar → abrir nova conversa → o conector deve listar 65 ferramentas.

### 4. Codex CLI — verificação rápida

Confirmar que o `~/.codex/config.toml` tem **uma única linha** no header (sem espaços à volta de `:` no `--header`):

```toml
"--header","x-api-key:<CHAVE_SEM_ESPACOS>"
```

E que `npx -y mcp-remote` consegue arrancar (basta correr o comando à mão uma vez para aceitar a instalação).

## Notas técnicas

- `search` e `fetch` são apenas **camadas finas** sobre a agent-api existente — sem nova lógica de negócio, sem migrations, sem novos secrets.
- A chave continua a ser a mesma (`EXTERNAL_API_KEY`), não há rotação.
- O contador `tools` em `/info` é meramente informativo; o número real vem sempre de `tools/list`.

Confirmas que avanço com a implementação?