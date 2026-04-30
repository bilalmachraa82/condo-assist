## Plano: Cores distintas, filtro por categoria e novo estado "Pendente"

### 1. Cores e ícones distintos para Gás vs Extintores

Hoje ambos usam vermelho + ícone `Flame`. Proposta:

| Categoria | Cor actual | Cor nova | Ícone |
|---|---|---|---|
| Coluna Eléctrica | `#f59e0b` (amarelo) | mantém | `Zap` |
| Gás | `#ef4444` (vermelho) | **`#a855f7` (roxo)** — gás natural costuma usar amarelo/roxo, evita conflito com "vencido" (vermelho) | `Flame` |
| Elevador | `#3b82f6` (azul) | mantém | `ArrowUpDown` |
| Extintores | `#dc2626` (vermelho escuro) | **`#dc2626` (vermelho)** — mantém vermelho (universal para fogo/extintor) | **`FireExtinguisher`** (em vez de `Flame`) |

Migração de dados em `inspection_categories`: `UPDATE` cor do Gás e ícone dos Extintores.

### 2. Categorias clicáveis para filtrar

No card "Cobertura por categoria" (`/inspecoes`), cada barra passa a ser um botão. Click → aplica `categoryFilter = c.id` na tabela abaixo + faz scroll até à tabela. Indicador visual quando filtro activo (border + "x" para limpar).

Bonus: clicar de novo na mesma categoria limpa o filtro (toggle).

### 3. Novo estado "Pendente" (em ambos os sítios, conforme pedido)

**3a. Resultado da inspeção (`building_inspections.result`)**
- Adicionar valor `pending` à coluna (texto livre, sem CHECK constraint a alterar — basta a UI suportar).
- No `InspectionForm`: novo `SelectItem value="pending"` → "Pendente (a aguardar relatório)".
- No tipo TS `BuildingInspection["result"]`: adicionar `"pending"`.

**3b. Estado de compliance (view `building_inspection_status`)**
- Recriar a view para devolver `status = 'pending'` quando existe inspeção mas `result = 'pending'` (independentemente da `next_due_date`).
- Ordem de prioridade na view: `missing` → `overdue` → `pending` → `due_soon_15` → `due_soon_30` → `ok`.

**3c. UI**
- Novo KPI card "Pendentes" (cor âmbar/violeta, ícone `Hourglass`).
- `STATUS_META.pending`: label "Pendente", cor violeta (`text-violet-700`, `bg-violet-500/10`, `border-violet-500/30`) — distinta de "A vencer" (âmbar).
- Adicionar opção no `Select` de filtros de estado.
- Incluir `pending: 0` no objecto `stats` e no `STATUS_ORDER` (entre `overdue` e `due_soon_15`).

### 4. Edge function `inspection-alerts-cron`

Como agora há `pending`, garantir que estes **não** entram no digest de "vencidos/a vencer" (são uma categoria à parte, esperam acção da empresa, não do admin). Opcionalmente, secção separada "Aguardam relatório há mais de 30 dias" no email — mas mantém-se simples por agora: apenas excluir `pending` dos buckets existentes.

### Detalhes técnicos

**Migration 1 — schema (recriar view + cores/ícones):**
```sql
-- Cores e ícones
UPDATE inspection_categories SET color = '#a855f7' WHERE key = 'gas';
UPDATE inspection_categories SET icon = 'FireExtinguisher' WHERE key = 'extintor';

-- Recriar view com estado 'pending'
DROP VIEW IF EXISTS building_inspection_status;
CREATE VIEW building_inspection_status AS
WITH latest AS (
  SELECT DISTINCT ON (building_id, category_id) *
  FROM building_inspections
  ORDER BY building_id, category_id, inspection_date DESC
)
SELECT
  b.id  AS building_id,
  b.code AS building_code,
  b.name AS building_name,
  c.id   AS category_id,
  c.key  AS category_key,
  c.label AS category_label,
  c.color AS category_color,
  c.icon  AS category_icon,
  c.validity_years,
  l.id   AS inspection_id,
  l.inspection_date,
  l.next_due_date,
  l.result,
  l.company_name,
  l.company_contact,
  l.notes,
  CASE WHEN l.next_due_date IS NULL THEN NULL
       ELSE (l.next_due_date - CURRENT_DATE) END AS days_until_due,
  CASE
    WHEN l.id IS NULL                          THEN 'missing'
    WHEN l.result = 'pending'                  THEN 'pending'
    WHEN l.next_due_date < CURRENT_DATE        THEN 'overdue'
    WHEN l.next_due_date <= CURRENT_DATE + 15  THEN 'due_soon_15'
    WHEN l.next_due_date <= CURRENT_DATE + 30  THEN 'due_soon_30'
    ELSE 'ok'
  END AS status
FROM buildings b
CROSS JOIN inspection_categories c
LEFT JOIN latest l ON l.building_id = b.id AND l.category_id = c.id
WHERE b.is_active = true AND c.is_active = true;
```

**Ficheiros a editar:**
- `src/hooks/useInspections.ts` — adicionar `"pending"` a `InspectionStatus` e `result`; adicionar `STATUS_META.pending`.
- `src/pages/Inspecoes.tsx` — novo KPI, opção no Select, `STATUS_ORDER`, click handler nas barras de cobertura, ref+scroll para a tabela.
- `src/components/inspections/InspectionForm.tsx` — novo `SelectItem` "Pendente".
- `supabase/functions/inspection-alerts-cron/index.ts` — excluir `status = 'pending'` dos buckets de alerta.

### O que NÃO toco
- Dados de inspeções existentes
- RLS, hooks de criação, cron de seguros
- Categorias activas (Coluna, Gás, Elevador, Extintor)

### Resultado esperado
- Cards de Gás (roxo) e Extintores (vermelho + ícone extintor) imediatamente distinguíveis.
- Click numa barra de "Cobertura por categoria" filtra a tabela só para essa categoria.
- Inspeções marcadas como "Pendente" aparecem num KPI próprio (violeta) sem inflar "Vencidos" nem "A vencer".
