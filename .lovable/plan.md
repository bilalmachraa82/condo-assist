# Melhorias gerais — feedback do cliente

Cobre todos os pontos identificados nos screenshots, numa única intervenção.

## 1. Bug "Eliminação bloqueada — [object Object]" (fornecedores)

Em `SafeDeleteSupplierDialog.tsx` o catch faz `error?.message`, mas várias mutations atiram objetos sem `.message` (chega `[object Object]`).

- Normalizar a leitura do erro (string, `Error`, `PostgrestError`, objeto com `details`/`hint`).
- Quando `dependencies.can_delete === false` mas o utilizador clica sem escolher estratégia, mostrar mensagem clara em vez do toast actual.
- Garantir que `useDeleteSupplier` rejeita com `Error` em vez de objeto cru.

## 2. Pendências Email — só 2 estados

Manter no enum (não destruir dados antigos), mas no UI mostrar apenas `aguarda_resposta` e `resolvido`.

- Migração de dados: `UPDATE email_pendencies SET status='aguarda_resposta' WHERE status IN ('aberto','escalado','resposta_recebida','precisa_decisao')`.
- `usePendencies.ts`: reduzir `PENDENCY_STATUS_ORDER` a `['aguarda_resposta','resolvido']` e default a `aguarda_resposta`.
- Default da coluna passa para `aguarda_resposta`.
- Atualizar Kanban, filtros do dashboard e cards de stats (Abertas/Escaladas → uma só "Aguarda resposta").
- SLA: continua a contar a partir de `last_activity_at` para pendências em `aguarda_resposta`.

## 3. Seguros — Acidentes de Trabalho + frações estruturadas

- Adicionar valor `acidentes_trabalho` ao tipo de cobertura no `InsuranceForm` (e label "Acidentes de Trabalho").
- Substituir o campo livre `fractions_included` por **lista estruturada de frações por edifício**:
  - Nova tabela `building_fractions` (id, building_id, label, permillage, notes).
  - Nova tabela `insurance_fraction_status` (insurance_id, fraction_id, status: `included`/`excluded`).
  - UI no formulário: lista das frações do edifício com toggle Incluído/Excluído (mantém retro‑compat: se edifício não tiver frações registadas, mostra textarea livre como hoje).
- Migração: as ap apólices existentes mantêm `fractions_included` em texto até o utilizador editar.

## 4. Inspeções de Gás — 5 anos (não 3)

- Migração: `UPDATE inspection_categories SET validity_years=5 WHERE key='gas'`.
- **Recálculo retroativo**: `UPDATE building_inspections SET next_due_date = inspection_date + INTERVAL '5 years' WHERE category_id = (SELECT id FROM inspection_categories WHERE key='gas')`.
- Atualizar legend do badge "(3a)" para usar `category.validity_years` (já dinâmico, só precisa de re-render).

## 5. Knowledge — categoria "Geral" → "Empresas de Limpeza"

Em `src/utils/knowledgeCategories.ts` mudar a entrada `geral`:
- `label: "Empresas de Limpeza"`, `icon: Sparkles`, novas classes de cor.
- Migração leve: `UPDATE knowledge_articles SET category='empresas_limpeza' WHERE category='geral'` e o key passa a `empresas_limpeza`.

## 6. Edifício — código auto não regenera ao limpar

Em `BuildingForm.tsx`, quando se está em edição e o campo "Código" está vazio, o código actual é mantido (linha 71). Mudar comportamento:
- Se utilizador apaga o código explicitamente, regerar automaticamente no submit.
- Adicionar botão "Gerar novo código" ao lado do input para tornar a acção visível.

## 7. Inspeções — editar registo existente

Hoje só existe `InspectionForm` em modo criação. Adicionar:
- Modo `edit` (recebe `inspection` opcional, prefilla campos).
- Botão "Editar" em cada linha da lista de inspeções.
- Mutation `useUpdateInspection` em `useInspections.ts`.

## Resumo técnico

```text
DB migrations:
  - inspection_categories.validity_years (gas → 5) + recálculo next_due_date
  - email_pendencies: data update + alter default
  - knowledge_articles: rename category geral → empresas_limpeza
  - new tables: building_fractions, insurance_fraction_status (com RLS admin)

Frontend:
  - SafeDeleteSupplierDialog: error normalization
  - usePendencies + PendencyKanban + EmailPendencies page: 2 estados
  - InsuranceForm: cobertura acidentes_trabalho + UI frações
  - BuildingForm: regeneração de código
  - InspectionForm: modo edit + lista com botão editar
  - knowledgeCategories: rename label
```

Após implementação ficam por validar contigo: o ponto exacto do "editar título" no screenshot dos seguros (apólice) — confirma se queres edição inline do `policy_number` na lista, para incluir na mesma iteração.
