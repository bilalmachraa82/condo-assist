# Diagnóstico (só leitura): falha list_email_pendencies no run 17c4456a

## Evidência recolhida

Registos `mcp_health_checks` para `list_email_pendencies` (14/09):

| Hora (UTC) | Estado | HTTP | Latência |
|---|---|---|---|
| 10:50 | ok | 200 | 3851 ms |
| 10:55 | ok | 200 | 523 ms |
| **11:00:15** | **fail** | **400** | **7409 ms** — `{"error":"Gateway Timeout","code":"QUERY_ERROR","details":"Gateway Timeout"}` |
| 11:05 | ok | 200 | 683 ms |
| 11:10 | ok | 200 | 499 ms |
| 11:15 | ok | 200 | 985 ms |

- No run 17c4456a apenas 1 das 8 sondas falhou; as outras 7 deram 200.
- Nas ~2 horas anteriores e seguintes, todas as execuções de 5 em 5 minutos deram 200, com picos ocasionais de latência (4173 ms às 09:45, 3851 ms às 10:50).
- Volume de dados: `email_pendencies` tem **54 linhas**.
- Índices existentes incluem `idx_email_pendencies_last_activity (last_activity_at DESC)`, exactamente o usado pela ordenação da consulta.
- Plano real da consulta: Index Scan, `Execution Time: 1.206 ms`, 2 buffers. Não há problema de consulta nem de índice.
- Nos últimos 14 dias houve 44 falhas registadas, das quais apenas 4 são "Gateway Timeout".

## Causa mais provável

Instabilidade transitória da camada HTTP entre a edge function e a base de dados (PostgREST/gateway), não a consulta. A consulta executa em ~1 ms sobre 54 linhas com índice adequado; o pedido demorou 7,4 s e devolveu um corpo de gateway, não um erro de Postgres.

Factor agravante de diagnóstico: o handler `handleListEmailPendencies` (agent-api, linha ~2114) mapeia **qualquer** erro para HTTP **400 QUERY_ERROR**. Um timeout de infraestrutura (que deveria ser 504) fica assim disfarçado de erro de pedido inválido, o que induz em erro quem lê o alerta.

`max_rows = 1000` em `config.toml` **não é causal**: é apenas um tecto de linhas por resposta, a tabela tem 54 linhas e o pedido usa `limit=1`.

## Impacto real

Baixo. Uma falha isolada numa sonda automática de 5 em 5 minutos, auto-recuperada no run seguinte. Não há indício de indisponibilidade prolongada nem de erro de dados. O único impacto prático é ruído no painel e potencial email de alerta.

## Correção mínima sugerida (não implementada)

1. Distinguir timeouts de erros de pedido: quando a mensagem de erro indicar timeout/gateway, devolver **504** em vez de 400, com código próprio (`UPSTREAM_TIMEOUT`). Uma alteração localizada no tratamento de erro.
2. Opcional: no cron de saúde, uma repetição única após ~2 s antes de marcar `fail`, para evitar alertas por falhas transitórias.
3. Não é necessária nenhuma alteração de índices, de consulta nem de `max_rows`.

Nada foi alterado: nem código, nem base de dados, nem secrets, nem deployment.
