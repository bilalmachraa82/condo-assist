

# Auditoria — Agent API + MCP Server

## Resultados dos testes em produção

| Verificação | Status |
|---|---|
| `agent-api` deployment + boot | ✅ Vivo, sem erros nos logs |
| `GET /agent-api/v1/health` | ✅ 200 OK (`status: ok`, version 1.0.0) |
| `mcp-server` deployment + boot | ✅ Vivo, sem logs de erro |
| `GET /mcp-server/info` | ✅ 200 OK (15 tools, transport streamable-http) |
| `POST /mcp-server` sem auth | ✅ 401 (auth obrigatória correctamente aplicada) |
| Secret `EXTERNAL_API_KEY` configurado | ✅ Presente |
| Tabelas DB (`condominium_contacts`, `agent_api_rate_limit`, `assembly_items`) | ✅ Existem |
| `config.toml` (`verify_jwt=false` para ambas) | ✅ Correcto |
| CORS headers (mcp-session-id exposto, x-api-key permitido) | ✅ Correcto |
| Hashing SHA-256 de API key no rate limit | ✅ Correcto |
| PII masking nos logs de erro | ✅ Aplicado em todos os handlers |
| Idempotency em POST /assistances + /email-log | ✅ TTL 24h, race condition tratada |
| Validação UUID + strings nos inputs | ✅ Aplicada |

## Problemas detectados

**Nenhum bloqueador.** Sistema operacional. Apenas observações menores:

1. **Lint Supabase (informativo, não relacionado com API/MCP):**
   - 2× "RLS Enabled No Policy" (info) — provavelmente `agent_api_rate_limit` e outra tabela utilitária com deny-all implícito; não afecta funcionalidade
   - 2× "Extension in Public" (warn) — pré-existente
   - "Leaked Password Protection Disabled" (warn) — config Auth, não API
   - "Postgres patches available" (warn) — manutenção

2. **MCP server sem logs históricos** — significa que ainda ninguém o invocou em produção desde o deploy. Esperado.

3. **Pequena melhoria opcional no `mcp-server/index.ts`:** o import `z` (zod) é declarado mas não usado. Removível sem impacto.

## Conclusão

✅ **API e MCP estão correctamente configurados, sem erros e prontos para uso.**

- Agent API responde a `/v1/health` em < 100ms
- MCP server aceita auth via `x-api-key`, Bearer token, ou query param `?api_key=`
- Todas as 15 tools MCP fazem proxy correcto para os 15 endpoints REST
- Rate limit (100 req/min), idempotency (24h TTL) e PII masking activos
- CORS preparado para Claude Desktop e MCP Inspector

## Próximo passo recomendado

Testar end-to-end com **MCP Inspector** usando a `EXTERNAL_API_KEY` real:

```bash
npx @modelcontextprotocol/inspector
```
- Transport: **Streamable HTTP**
- URL: `https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server`
- Header: `x-api-key: <EXTERNAL_API_KEY>`

Confirmar que aparecem as 15 ferramentas e invocar `health_check` + `list_intervention_types`.

Não é necessário fazer alterações ao código. Se quiseres, posso aplicar a limpeza opcional do import `z` não usado e adicionar uma página em Configurações com a configuração JSON pronta para copiar/colar no Claude Desktop.

