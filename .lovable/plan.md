## Diagnóstico

Auditoria confirma uma raiz comum (input não validado → 500 cru) + bugs pontuais de enum desalinhado, creates partidos por colunas NOT NULL ocultas, e cobertura de delete incompleta. Plano abaixo agrupa tudo, sem renomear tools nem URLs.

## Fase 0 — Descobrir verdade da BD (antes de codar)

Correr no Supabase e fixar resultados como constantes no `agent-api/index.ts`:

```sql
SELECT unnest(enum_range(NULL::assistance_status));
SELECT unnest(enum_range(NULL::pendency_status));
SELECT unnest(enum_range(NULL::quotation_status));     -- se existir
SELECT unnest(enum_range(NULL::assembly_status));      -- se existir
SELECT unnest(enum_range(NULL::insurance_claim_status));
-- NOT NULL sem default nas tabelas dos creates partidos:
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN
 ('email_pendencies','building_insurances','follow_up_schedules','assistances')
ORDER BY table_name, ordinal_position;
```

## Fase 1 — Camada partilhada de validação (raiz comum A)

Em `supabase/functions/agent-api/index.ts`:

- `isUuid(v)` + helper `requireUuid(v, name)` → 400 `INVALID_UUID` se falhar.
- `validateEnum(value, validValues, fieldName)` → 400 `INVALID_ENUM` com `valid_values[]`.
- Mapas centrais `ENUMS = { assistance_status:[…], pendency_status:[…], … }` derivados da Fase 0.
- Mapas `ALIAS = { assistance:{ open:[…], closed:[…] }, pendency:{ open:[…], closed:[…] } }`.
- Wrapper global `withErrors(handler)` já existe a meio gás — alargar para mapear códigos Postgres:
  - `22P02` (invalid_text_representation), `22000`, `23502` (NOT NULL), `23503` (FK), `23505` (unique) → 400 estruturado com `code`, `column`, `message`. Nunca 500 cru.

Aplicar `requireUuid` em todos os `get_*` por id (8 handlers listados) e em qualquer `*_id` recebido em filtros/creates.

## Fase 2 — `list_assistances` (BUG crítico B)

- Substituir lista hard-coded por `ENUMS.assistance_status` (verdade da BD).
- `OPEN_ASSIST = [pending, awaiting_quotation, accepted, scheduled, in_progress]` (sem `quotation_received` se a Fase 0 confirmar que foi removido).
- `CLOSED_ASSIST = [completed, cancelled]`.
- Sem `status` → não aplicar filtro (devolve tudo do edifício); nunca expandir para "open" silenciosamente se isso causar 500.
- Status legacy (`quotation_received`) → mapear para o substituto real (provavelmente `awaiting_quotation`) com warning no body, ou 400 limpo com `valid_values`. Decisão depende da Fase 0.

Alinhar `update_assistance`: o `"ac"` truncado é bug — repor lista completa do enum real.

## Fase 3 — Filtros partidos (C)

- `list_insurance_claims`: confirmar nome real da coluna (`status` vs `claim_status`) na Fase 0 e usar enum real + `validateEnum`.
- `list_assemblies`: trocar lista virtual por `ENUMS.assembly_status`.
- `list_quotations`: idem com `ENUMS.quotation_status`.

Todos passam a devolver 400 `INVALID_STATUS` com `valid_values[]` em vez de 500.

## Fase 4 — Creates partidos (D)

Para cada um, com base na Fase 0:

- **`create_email_pendency`**: identificar coluna(s) NOT NULL sem default ainda não expostas (provável `received_at`, `pendency_type`, `status` default). Preencher defaults sensatos server-side (`received_at = now()`, `status = 'aberto'`). Devolver erro por campo se a falha for de FK (`building_id` inexistente → 404).
- **`create_building_insurance`**: validar `coverage_type` contra enum real; preencher defaults; expor campos obrigatórios reais no erro.
- **`create_follow_up`**: alinhar com colunas reais de `follow_up_schedules` (provável `assistance_id` ou `pendency_id` + `scheduled_for` + `follow_up_type`); validar tipo contra enum real.

Substituir todos os `throw new Error("Failed to create X")` por `errorResponse(400, msg, "CREATE_FAILED", { column, detail })` usando o erro Postgres traduzido pelo wrapper da Fase 1.

## Fase 5 — `delete_building` e novos deletes (F)

- `delete_building`: investigar — está a falhar silenciosamente (provável RLS a bloquear ou query a usar `.match` com coluna errada). Corrigir; se houver FKs duras, fazer soft-delete com coluna `is_active`/`deleted_at` (migration mínima se necessário).
- Adicionar handlers + tools MCP:
  - `delete_assistance` (só status `cancelled` ou `pending`, senão 409).
  - `delete_insurance_claim`.
  - `delete_supplier` (reutiliza RPC `safe_delete_supplier` já existente).
  - `delete_follow_up`.
- Incrementar contador de tools no `mcp-server/index.ts` (`/info` + `version` → 1.4.0).

## Fase 6 — Documentação de schema (E)

Em `mcp-server/index.ts` (descriptions) e `README.md`:
- Documentar formato de `upload_assistance_photo.file`, valores de `source`/`result`/`coverage_type`, e pré-requisito de `submit_supplier_response`.
- Atualizar `.lovable/memory/features/mcp-server.md` com v1.4.0 + lista de deletes novos.

## Fase 7 — Testes de regressão

Novo `supabase/functions/agent-api/audit_fixes_test.ts`:

- `list_assistances({building_id:175})` sem status → 200; `status=open` → 200; `status=quotation_received` → 200 ou 400 (nunca 500).
- `list_insurance_claims`, `list_assemblies`, `list_quotations` com status válido/inválido → 200/400, nunca 500.
- `get_building("not-a-uuid")` → 400 `INVALID_UUID`; com UUID inexistente → 404; idem para os outros 7 `get_*`.
- `create_email_pendency({title, building_id:175})` → 200 com id.
- `create_building_insurance(...minimos)` → 200.
- `create_follow_up(...)` → 200.
- `delete_building(id_teste)` → 200 + `get_building(id)` → 404.

Executar via `supabase--test_edge_functions` no fim de cada fase.

## Não-objetivos

- Não renomear nenhuma das 128 tools nem mudar URLs (`/mcp-server`, `/v1/*`).
- Não alterar auth/rate-limit já existentes.
- Soft-delete só se hard-delete for inviável por FK.

## Detalhes técnicos resumidos

| Ficheiro | Mudança |
|---|---|
| `supabase/functions/agent-api/index.ts` | `isUuid`, `validateEnum`, `ENUMS`, `ALIAS`, wrapper Postgres-error, fixes nos handlers list_/get_/create_/delete_ |
| `supabase/functions/mcp-server/index.ts` | + 4 tools delete, bump versão 1.4.0, descriptions atualizadas |
| `supabase/functions/agent-api/audit_fixes_test.ts` | novo ficheiro com a bateria acima |
| `supabase/functions/mcp-server/README.md` | inventário + notas de schema |
| `.lovable/memory/features/mcp-server.md` | v1.4.0 changelog |
| (opcional) migration | só se `delete_building` precisar de coluna `deleted_at` para soft-delete |

Aprova para implementar (todas as fases de uma vez) ou diz se queres fasear (ex.: só A+B+C primeiro, deixar D+F para depois).
