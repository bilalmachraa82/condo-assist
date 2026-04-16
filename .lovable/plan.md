

# Plan: Assembly Items Tracking Module

## Summary
Create a full "Seguimento de Actas" module with database table, Excel import, CRUD page with filters/stats, and navigation integration. Follows the exact patterns from the Knowledge Base module.

## 1. Database Migration

Create `assembly_items` table with the schema specified by the user. Use a validation trigger instead of CHECK constraints (per guidelines). Add RLS policies: admin full access via `is_admin(auth.uid())`, authenticated read for published items.

Key columns: `building_code`, `building_address`, `building_id` (FK), `year`, `description`, `status`, `status_notes`, `category`, `priority`, `assigned_to`, `estimated_cost`, `resolution_date`, `source_sheet`, `knowledge_article_id` (FK).

Indexes on: `building_code`, `status`, `year`, `category`.

## 2. New Files

| File | Purpose |
|------|---------|
| `src/pages/Assembly.tsx` | Main page with stats cards, filters, list, load-more pagination |
| `src/hooks/useAssemblyItems.ts` | CRUD hook (same pattern as `useKnowledgeArticles.ts`) with filters, pagination, category counts |
| `src/components/assembly/AssemblyFilters.tsx` | Search bar + status chips + category/building/year selects |
| `src/components/assembly/AssemblyCard.tsx` | Card per item: status badge, category badge, truncated text, quick status change dropdown |
| `src/components/assembly/AssemblyDetail.tsx` | Detail drawer/dialog: full text, status history, notes, "Create KB article" button |
| `src/components/assembly/AssemblyImport.tsx` | Excel upload, parse with xlsx lib, preview table, batch import with progress bar |
| `src/components/assembly/AssemblyStats.tsx` | Stats cards (Pending/In Progress/Done counts) + optional category bar chart |
| `src/utils/assemblyCategories.ts` | Category definitions with icons/colors (reuses some from knowledgeCategories) |
| `src/utils/assemblyParser.ts` | `parseStatus()`, `detectCategory()`, `extractAmount()` functions |

## 3. Edited Files

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/assembly` route |
| `src/components/layout/AppSidebar.tsx` | Add "Seguimento Actas" menu item with `ClipboardList` icon |
| `supabase/functions/agent-api/index.ts` | Add 3 endpoints: GET assembly items, GET by id, PATCH status |

## 4. Implementation Details

### Status Parsing (from Excel column D)
```
empty/null → pending
"ok" only → done
"ok. Enviada assistencia..." → in_progress, notes = text after "ok. "
"ok. Feita..." → done, notes = text after "ok. "
no "ok" → pending
```

### Category Detection
Keyword matching on description text — same categories listed by user (limpeza_caleiras, elevadores, fachada, seguros, intercomunicadores, limpeza, colunas_eletricas, cobertura, portoes, gas, obras, geral).

### Amount Extraction
Regex for patterns like `33.550€`, `33 550 euros`, `valor de X euros`.

### Import Flow
1. Upload xlsx → parse with `xlsx` library
2. Read first sheet (or all sheets by year)
3. For each row: extract building_code, resolve building_id from buildings table, parse status, detect category, extract amount
4. Preview table (first 10 rows) before confirming
5. Batch insert 50 at a time with progress bar
6. Summary: X created, Y errors

### Page Layout
- Top: Stats cards (Pending count in red, In Progress in yellow, Done in green)
- Below stats: Filter bar with search + status chips + category/year/building selects
- Grid of cards with load-more (50 per batch, same pattern as Knowledge)
- Detail drawer on card click

### Agent API Endpoints
- `GET /v1/assembly?building_code=3&status=pending` — list with filters
- `GET /v1/assembly/:id` — single item detail
- `PATCH /v1/assembly/:id/status` — update status + notes

## 5. Not Included
- No status history tracking table (can be added later)
- No charts/analytics beyond stats cards (can be enhanced later)

