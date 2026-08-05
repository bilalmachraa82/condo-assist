# Página de configuração MCP (/mcp-setup)

Criar um ecrã na app com todos os dados necessários para ligar o servidor MCP a clientes externos (Grok Live, Claude Desktop, ChatGPT), com botões de copiar.

## O que a página mostra

**1. Server URL**
- Modo completo (133 tools): `https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server`
- Modo ChatGPT-safe (só `search` + `fetch`): `.../mcp-server/chatgpt`
- Cada URL com botão de copiar.

**2. HTTP headers**
Tabela pronta a preencher no formulário "Add custom MCP server":

```text
x-api-key   <EXTERNAL_API_KEY>                      Secret: sim
accept      application/json, text/event-stream     Secret: não
```

Aviso explícito: não adicionar `Authorization: Bearer …` (a função tem `verify_jwt = false` e o header extra já causou 401 no passado).

O valor real da chave NÃO é mostrado nem embutido no código — campo com placeholder e nota de onde a copiar (Project Settings → Secrets).

**3. Verificação de estado**
Botão que faz `GET /mcp-server/info` (endpoint público, sem auth) e mostra `tools` e `version` devolvidos, com indicador verde/vermelho.

**4. Instruções passo-a-passo para Grok Live**
Lista curta: Name → Server URL → adicionar header `x-api-key` marcado como Secret → guardar → testar com "lista 3 edifícios".

**5. Ligações rápidas**
Botões para `/mcp-test`, `/mcp-health` e `/mcp-diagnostics`.

## Detalhes técnicos

- Novo ficheiro `src/pages/McpSetup.tsx`.
- Rota `/mcp-setup` em `src/App.tsx`, envolvida em `ProtectedRoute` + `DashboardLayout` (mesmo padrão de `/mcp-health`).
- Reutiliza `MCP_BASE` / `CHATGPT_URL` de `src/lib/mcpClient.ts` em vez de repetir URLs.
- Componentes shadcn existentes (Card, Button, Badge, Table) e tokens semânticos; sem cores fixas.
- Copiar via `navigator.clipboard.writeText` + toast.
- Sem alterações a edge functions, base de dados ou tools MCP.
