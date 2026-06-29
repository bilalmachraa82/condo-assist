## Objetivo
Garantir que TODAS as write tools (`create_*`, `update_*`, `delete_*`) do MCP devolvem 200 em input válido e **400 estruturado** em input inválido — nunca 500 opaco. Documentar enums/constraints no schema das tools e fechar gaps deixados pela auditoria 2026-11 (`create_building_insurance`, `create_follow_up`, `delete_building` no-op, status `'ac'` truncado em `update_assistance`).

## Diagnóstico
A auditoria anterior (v1.4.0) já implementou `pgErrorToHttp`, deletes em falta e `resolveStatusFilter`. Faltam estas correções pontuais e a verificação end-to-end:

- `create_building_insurance` e `create_follow_up` continuam a falhar com "Failed to create…" → o handler em `agent-api/index.ts` está a chamar `pgErrorToHttp`, mas o input schema da tool MCP não expõe os campos NOT NULL/CHECK reais, e os defaults não estão a ser aplicados antes do INSERT.
- `delete_building` reporta sucesso mas mantém `is_active = true` → é preciso confirmar que está a fazer UPDATE (soft-delete) e devolver o registo actualizado.
- `update_assistance` aceita um valor `'ac'` truncado que não existe no enum `assistance_status` → falta validação contra `enum_range`.
- Vários handlers de write ainda devolvem mensagens genéricas; precisam do formato uniforme `{ tool, error, field, allowed_values, cause }`.

## Plano de execução (build mode)

### 1. Probe automático de cada write tool
Criar `supabase/functions/agent-api/write_audit_test.ts` que percorre todas as `create_* / update_* / delete_*` (lista extraída de `mcp-server/index.ts`) com input mínimo válido contra um `TEST_BUILDING_ID`, capturando o JSON exacto devolvido. Produz tabela `PASS/FAIL + código pg`.

### 2. Descobrir constraints reais
Via `supabase--read_query` sobre `information_schema` / `pg_constraint` para `building_insurances`, `follow_up_schedules`, `assistances` (enum `assistance_status`), `insurance_claims`, etc. Documentar campos NOT NULL, CHECKs, e `enum_range` de cada enum usado em writes.

### 3. Fix `create_building_insurance`
- Identificar coluna(s) NOT NULL sem default (provavelmente `coverage_type` ou `policy_number`).
- Ou aplicar default sensato server-side, ou marcar como required no input schema da tool MCP.
- Garantir que o handler devolve 400 estruturado nomeando o campo.

### 4. Fix `create_follow_up`
- Identificar CHECK constraint (provavelmente `follow_up_type` enum + `priority` enum + `scheduled_for` NOT NULL).
- Expor `follow_up_type` e `priority` com `enum: [...]` no input schema.
- Default `scheduled_for = now() + 24h` quando omitido.

### 5. Fix `delete_building` (no-op real)
Reescrever para `UPDATE buildings SET is_active=false WHERE id=… RETURNING *`. Devolver o registo actualizado na resposta para confirmação. Mesmo padrão para `delete_supplier`.

### 6. Validar enum em `update_assistance`
Centralizar `ASSISTANCE_STATUS_ENUM` (já existe em `ENUMS` do read-path) e aplicá-lo também no PATCH. Input com `'ac'` → 400 `INVALID_ENUM` com `allowed_values`.

### 7. Erro estruturado uniforme
Estender `pgErrorToHttp` (ou criar wrapper `writeError`) para devolver sempre:
```json
{ "tool": "create_follow_up", "error": "MISSING_FIELD", "field": "follow_up_type",
  "allowed_values": ["quotation_reminder","work_reminder","completion_reminder"], "cause": "23502" }
```
Aplicar em todos os handlers `create_*`/`update_*`/`delete_*`.

### 8. Documentação inline (input schemas MCP)
Em `mcp-server/index.ts`, para cada write tool afectada acrescentar à descrição e ao `inputSchema` os `enum:[…]` reais (assistance_status, follow_up_type, insurance coverage_type, etc.). Não muda nomes de tools — só metadados.

### 9. Ciclo end-to-end create → update → delete
Adicionar a `write_audit_test.ts` um teste por família que cria → faz update → apaga e limpa resíduos. Reporta PASS/FAIL por tool. Confirma `create_email_pendency` continua verde.

### 10. Actualizar artefactos
- `mcp-server/README.md` → secção "Write tools — campos obrigatórios e enums".
- `.lovable/memory/features/mcp-server.md` → notas v1.4.1.
- Bump `version` em `/info` para `1.4.1`.

## Detalhes técnicos
- Tudo isolado em `supabase/functions/agent-api/index.ts` + `mcp-server/index.ts`. Sem migrations (constraints existentes mantêm-se).
- Sem alteração de nomes/URLs de tools — regra de ouro do MCP.
- Deploy explícito de `agent-api` + `mcp-server` no fim.

## Entregáveis
1. `write_audit_test.ts` com matriz completa PASS/FAIL.
2. Tabela "campo obrigatório / enum / allowed_values" por write tool (no README).
3. Relatório do ciclo CRUD por família.
4. v1.4.1 deployada.