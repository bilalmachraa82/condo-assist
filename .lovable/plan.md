

# Plan: Knowledge Base Module — Full Implementation

## Summary
Create a complete Knowledge Base module with database table, API endpoints in the existing `agent-api`, and a full CRUD frontend page — all following existing patterns exactly.

## 1. Database Migration

Create table `knowledge_articles` with:
- `id` (uuid PK), `title`, `content` (markdown), `category` (text, NOT NULL)
- `subcategory` (text, nullable), `tags` (text[], GIN index)
- `building_id` (uuid FK → buildings, nullable), `is_global` (boolean, default false)
- `is_published` (boolean, default true), `metadata` (jsonb, default '{}')
- `created_by` (uuid, references auth.users), `created_at`, `updated_at`

Indexes: GIN full-text search (Portuguese config) on `title || content`, btree on `category`, `building_id`, GIN on `tags`.

RLS policies:
- Authenticated users: full CRUD access
- No public access (agent access goes through `agent-api` which uses service role key)

Trigger: `moddatetime` on `updated_at`.

**No CHECK constraint on category** — categories managed in frontend constants to stay flexible.

## 2. Agent API Endpoints (edit `agent-api/index.ts`)

Add 4 routes to existing `matchRoute()` and switch statement:

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/v1/knowledge` | `searchKnowledge` | Search/list articles (params: `q`, `category`, `building_id`, `tags`, `limit`, `offset`) |
| GET | `/v1/knowledge/:id` | `getKnowledgeArticle` | Full article with content |
| POST | `/v1/knowledge` | `createKnowledgeArticle` | Create article |
| PATCH | `/v1/knowledge/:id` | `updateKnowledgeArticle` | Partial update |

All protected by existing `EXTERNAL_API_KEY` auth + rate limiting. Follows existing patterns (HttpError, maskPII, requireString, json()).

## 3. OpenAPI Spec Update

Add the 4 knowledge endpoints to `openapi.yaml` with full parameter and response documentation.

## 4. Frontend Files

### New files:
- **`src/pages/Knowledge.tsx`** — Main page with header, filters, card grid, create/edit Sheet dialog
- **`src/components/knowledge/KnowledgeCard.tsx`** — Article card with category badge, excerpt, tags, edit/delete
- **`src/components/knowledge/KnowledgeForm.tsx`** — Sheet form: title, category select, building select, tags chips, markdown textarea with preview tabs, is_global toggle
- **`src/components/knowledge/KnowledgeDetail.tsx`** — Full article dialog with rendered markdown
- **`src/components/knowledge/KnowledgeFilters.tsx`** — Search input (debounced), category select, building select, clear button
- **`src/hooks/useKnowledgeArticles.ts`** — React Query hooks: list, get, create, update, delete with cache invalidation and toast feedback

### Categories with icons (14 total):
```text
procedimentos → ClipboardList (blue)
edificios → Building2 (slate)
elevadores → ArrowUpDown (purple)
extintores → Flame (red)
gas → Zap (yellow)
seguros → Shield (indigo)
acidentes_trabalho → AlertTriangle (orange)
desbaratizacao → Bug (amber)
colunas_eletricas → Bolt (cyan)
caleiras → Droplets (teal)
chamines → Wind (gray)
fornecedores → Truck (emerald)
legal → Scale (violet)
geral → BookOpen (slate)
```

### Edits to existing files:
- **`src/App.tsx`** — Add `/knowledge` route with ProtectedRoute + DashboardLayout
- **`src/components/layout/AppSidebar.tsx`** — Add "Base de Conhecimento" with BookOpen icon to main menu

## 5. Dependencies

Install `react-markdown` and `remark-gfm` for markdown rendering in the detail/preview views.

## 6. What This Does NOT Include (deferred)

- **Excel seed import** — The Excel data import can be done as a separate step after the base module is working. Building a batch import UI component adds complexity; better to validate the CRUD first.
- **Settings API panel** — The API documentation and MCP config examples can be added later as a settings tab.

## Technical Notes
- Hooks use `supabase` client directly (not edge function) for frontend CRUD — same pattern as `useBuildings.ts`
- Agent API uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) — same as all existing endpoints
- Mobile-first responsive layout matching existing pages
- Skeleton loaders, empty states, toast notifications on all actions

