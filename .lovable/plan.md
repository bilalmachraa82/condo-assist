# Integração Grok Live + página /mcp-setup

## Contexto

O utilizador está a tentar adicionar o nosso MCP server ao Grok Live. O formulário que o Grok mostra é para **OAuth credentials** (Client ID, Client secret, Authorization endpoint, Token endpoint, Scopes). No entanto, o nosso `mcp-server` actual usa autenticação por **API key simples** (`x-api-key` header) e `verify_jwt = false`.

A chave `b0951bfc0fd7360286c3123197bb87a1ccd2e6769adb35d67ffa62f345ec32da` é a `EXTERNAL_API_KEY` do projeto.

Objectivo: garantir que o Grok Live consegue ligar-se ao nosso MCP server sem quebrar as ligações já configuradas, e criar uma página `/mcp-setup` que documenta exactamente o que colocar em cada campo.

## Fases

### 1. Explorar opções do Grok Live

- Verificar se o Grok Live oferece uma alternativa ao OAuth para MCP servers personalizados (e.g. "API key", "Custom headers", "Static headers").
- Se existir essa opção, a solução é só documentar: URL do servidor + header `x-api-key` marcado como Secret.
- Se não existir, é necessário adicionar suporte OAuth ao nosso `mcp-server`.

### 2. Adicionar suporte OAuth ao mcp-server (se necessário)

Mantendo sempre a compatibilidade com o método `x-api-key` actual:

- Implementar no `supabase/functions/mcp-server/index.ts` um segundo modo de autenticação: validação de bearer token Supabase (JWT).
- O fluxo OAuth 2.1 será gerido pelo Supabase Auth (authorization server); o `mcp-server` passa a atuar como **resource server** que valida tokens.
- O endpoint continua a aceitar `x-api-key` como auth primária para clientes que já usam essa chave.
- Adicionar endpoint `GET /.well-known/oauth-protected-resource` (ou similar) se exigido pelo Grok Live para descoberta.
- Garantir que as 133 tools continuam acessíveis e que a validação de input/erros estruturados do v1.4.1 se mantém.
- Não alterar os nomes das tools nem os endpoints da `agent-api`.

### 3. Criar página /mcp-setup

Novo ecrã `src/pages/McpSetup.tsx`, rota `/mcp-setup` no `App.tsx`, dentro de `ProtectedRoute` + `DashboardLayout`.

A página mostra:

1. **Server URL**
   - Modo completo: `https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server`
   - Modo ChatGPT-safe: `.../mcp-server/chatgpt`
   - Botões de copiar.

2. **HTTP headers (modo API key)**
   | Header | Valor | Secret |
   |---|---|---|
   | `x-api-key` | `<EXTERNAL_API_KEY>` | sim |
   | `accept` | `application/json, text/event-stream` | não |

   Aviso explícito: não adicionar `Authorization: Bearer ...`.

3. **OAuth credentials (modo OAuth, se aplicável)**
   - Client ID: `x-api-key` (ou o valor indicado pelo Supabase OAuth)
   - Client secret: `<EXTERNAL_API_KEY>`
   - Authorization endpoint: URL do Supabase Auth authorize
   - Token endpoint: URL do Supabase Auth token
   - Scopes: deixar vazio ou conforme documentação
   - Token auth method: `none (PKCE only, recommended)`

4. **Verificação de estado**
   - Botão que faz `GET /mcp-server/info` e mostra `tools` e `version`.

5. **Instruções passo-a-passo para Grok Live**
   - Se API key for possível: Name → Server URL → adicionar header `x-api-key` marcado como Secret → guardar → testar.
   - Se só OAuth: preencher os campos OAuth conforme indicado.

6. **Ligações rápidas**
   - Botões para `/mcp-test`, `/mcp-health` e `/mcp-diagnostics`.

### 4. Testes e validação

- Testar o endpoint `/mcp-server/info` sem auth.
- Testar chamadas com `x-api-key` (regressão).
- Se OAuth for implementado, testar com um token JWT válido.
- Validar que as tools `list_buildings`, `search`, `fetch` continuam a funcionar.

## Detalhes técnicos

- Reutilizar `MCP_BASE`, `CHATGPT_URL` e `FULL_URL` de `src/lib/mcpClient.ts`.
- Usar componentes shadcn existentes (Card, Button, Badge, Table, Input).
- Copiar via `navigator.clipboard.writeText` + toast (sonner).
- Não hardcodar a chave real no frontend; mostrar placeholder e indicar Project Settings → Secrets.
