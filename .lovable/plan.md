## Auditoria

Tens **65 seguros** documentados em `knowledge_articles` (categoria `seguros`), todos com a mesma estrutura limpa:

```
- Nº Apólice: 007593225
- Companhia: Zurich
- Mediador: Winsurance
- Contacto: rute.neto@winsurance.pt
- Multirrisco/Partes Comuns: X
- Fracções Incluídas: ...
- Data Renovação: 11/01/2027
- Observações: ...
```

Já temos uma infra exemplar para inspeções (`inspection-alerts-cron` + tabelas `inspection_categories/_alerts_log` + view de status + cron diário às 08:00 → email `geral@luvimg.com`). Vou replicar **exactamente o mesmo padrão** para seguros — assim o sistema fica coerente, com o mesmo design e UX.

## Plano

### 1. Schema (migration)

**`building_insurances`** — uma linha por edifício
- `building_id`, `policy_number`, `insurer` (companhia), `broker` (mediador), `contact`
- `coverage_type` enum: `multirisco` / `partes_comuns` / `outro`
- `fractions_included` (text), `observations` (text)
- `renewal_date` (date) — campo-chave para alertas
- `created_by`, `created_at`, `updated_at`
- `notes` text (igual ao `[KB-IMPORT]` das inspeções, para idempotência)
- Trigger `updated_at`
- RLS: admins gerem, autenticados leem (mesma política das inspeções)

**`insurance_alerts_log`** — idempotência (idêntica a `inspection_alerts_log`)
- `building_id`, `insurance_id`, `alert_type` (`30d`|`overdue`), `alert_date`, `recipient_email`, `metadata`

**View `building_insurance_status`** — com `security_invoker=on`
- Junta `buildings` (LEFT JOIN para mostrar também os 18 prédios SEM seguro registado)
- Calcula `days_until_renewal` e `status`:
  - `ok` → > 30 dias
  - `due_soon_30` → entre 0 e 30 dias
  - `overdue` → renewal_date < hoje
  - `missing` → sem registo

**App settings** (em `app_settings`) para coerência com inspeções:
- `insurance_alerts_enabled` (default true)
- `insurance_alerts_recipients` (default `["geral@luvimg.com"]`)
- `insurance_overdue_repeat_days` (default 7)

### 2. Seed a partir do KB

Migration que extrai com regex todos os campos dos 65 artigos `seguros` e popula `building_insurances` com `notes='[KB-IMPORT] Seguro'` (idempotente).

### 3. Edge function `insurance-alerts-cron`

Réplica directa de `inspection-alerts-cron` adaptada:
- Lê `building_insurance_status` filtrando `overdue` + `due_soon_30`
- Idempotência via `insurance_alerts_log` (não reenvia 30d duas vezes; `overdue` repete a cada 7 dias)
- Envia digest HTML com **toda a info necessária para validação**:
  - Edifício, Companhia, Nº Apólice, Mediador, Contacto, Tipo cobertura, Fracções, Data renovação, Dias restantes/em atraso
- Botão "Abrir painel de seguros" → `/seguros`
- Cria `notifications` in-app por edifício (igual ao padrão inspeções)
- Reusa `send-email` existente

### 4. pg_cron

Job `insurance-alerts-daily` às **08:30 Lisboa** (07:30 UTC) — 30 min depois das inspeções para não sobrepor entregas. Configurado via `cron.schedule` no SQL do user (não migration partilhada).

### 5. Página `/seguros` + entrada na sidebar

Espelho de `/inspecoes` para máxima coerência visual e mental:
- KPI cards: Em dia · A vencer 30d · Vencidos · Sem registo (mesmo `KpiCard` reutilizado/copiado)
- Card "Cobertura" (X/83 prédios com seguro registado)
- Tabela: Edifício · Companhia · Nº Apólice · Mediador · Tipo · Renovação · Estado · Acções (Editar / Renovar)
- Filtros: pesquisa, estado, companhia
- Modal `InsuranceForm` para registar/renovar (com pré-preenchimento da última apólice ao renovar)
- Item "Seguros" na sidebar com ícone `ShieldAlert` (distinto de `ShieldCheck` das inspeções) entre "Inspeções" e "Edifícios"

### 6. Hook `useInsurances`

Padrão idêntico a `useInspections` (`useInsuranceStatus`, `useCreateInsurance`, `STATUS_META` partilhado se possível).

## O que NÃO toco

- Não modifico os `knowledge_articles` (continuam como fonte humana editável)
- Não altero o `inspection-alerts-cron` actual
- Não envio emails de teste — o cron diário tratará disso amanhã
- Email infra existente já tem `geral@luvimg.com` configurado e a funcionar via `send-email`

## Resultado esperado

- ~65 seguros importados, ~18 edifícios marcados como `missing`
- Email diário consolidado (estilo digest, igual ao das inspeções) com TODOS os dados das apólices que precisam de atenção
- Página `/seguros` operacional com mesmo look-and-feel de `/inspecoes`
- Sistema continua coerente: 1 padrão = inspeções + seguros