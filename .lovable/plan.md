

# Plan: Knowledge Base UI/UX Improvement (with adjustments)

## Summary
Improve Knowledge Base visual presentation: clean excerpts, better category identity, pagination for ~800 articles, and enhanced detail view.

## Files to create/edit

### 1. `src/utils/stripMarkdown.ts` — NEW
Strip formatting syntax (`#`, `**`, `*`, `_`, `|`, `>`, `-` list markers, table delimiters) but preserve text, dates, numbers. Include inline test function that runs assertions and logs results (callable via `stripMarkdown.test()`).

Example: `"## Administrador\n- **Nome:** João"` → `"Administrador Nome: João"`

### 2. `src/utils/knowledgeCategories.ts` — EDIT
Add `bgCircleClass` property per category for the icon pill background (e.g., `"bg-purple-500/10"` for elevadores). Keep existing `bgClass`/`textClass`.

### 3. `src/components/knowledge/KnowledgeCard.tsx` — REWRITE
- Remove colored left border approach
- **Category icon pill**: 24px icon inside a circular/pill div with category-tinted background at 10% opacity (e.g., `bg-purple-500/10` with `text-purple-600`)
- Use `stripMarkdown()` for clean excerpt text
- Move edit/delete into a `DropdownMenu` behind a `MoreHorizontal` icon button
- Building info on its own line with `Building2` icon
- Increase badge font from 10px to 11px
- Show `is_global` badge more prominently

### 4. `src/components/knowledge/KnowledgeFilters.tsx` — EDIT
Add horizontal scrollable category chip bar with article counts per category. Chips are clickable to toggle category filter. Active chip gets filled background.

### 5. `src/pages/Knowledge.tsx` — EDIT
- Show total article count in header (e.g., "42 artigos")
- **Pagination**: Load first 50 articles, show "Mostrar mais" button at bottom that loads next 50. Pass `limit`/`offset` or page number to the hook.
- Pass category counts (computed from full data or a separate count query) to `KnowledgeFilters`.

### 6. `src/hooks/useKnowledgeArticles.ts` — EDIT
Add pagination support: accept `limit` and `page` in filters, use `.range()` in the Supabase query. Return `count` from the query (`{ count: 'exact' }`) so the page knows total.

### 7. `src/components/knowledge/KnowledgeDetail.tsx` — REWRITE
- Header banner with category color background (subtle tint), large icon, and title
- Metadata section (building, category, subcategory, tags, dates) visually separated from content
- Better prose styling for markdown tables and headings
- "Copiar conteúdo" button using `navigator.clipboard`

## No content or data changes
All existing fields, functionality, and CRUD logic preserved. Pure visual/UX pass.

