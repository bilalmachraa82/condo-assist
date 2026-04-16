

# Plan: Fix Knowledge Base Layout, Titles & Sorting

## Issues Found

1. **Horizontal scroll** — Category chips use `whitespace-nowrap` in a `ScrollArea` forcing horizontal scroll. The page grid itself also may overflow at 565px viewport with 3 columns.
2. **Titles start with "Cond."** — The import uses raw `code` (e.g., `"Cond. '006"`) as title prefix instead of the normalized code. Existing articles in DB already have these titles.
3. **No numeric sorting** — Articles ordered by `updated_at` DESC, not by building code number.

## Changes

### 1. `src/components/knowledge/KnowledgeFilters.tsx`
- Replace `ScrollArea` + `whitespace-nowrap` with a **wrapping flex container** (`flex-wrap`) so category chips flow naturally without horizontal scroll.

### 2. `src/components/knowledge/KnowledgeCard.tsx`
- Add a display-time title formatter that strips "Cond. '" prefix, showing "006 - Elevadores" instead of "Cond. '006 - Elevadores".

### 3. `src/hooks/useKnowledgeArticles.ts`
- Change default sort from `updated_at DESC` to `title ASC` so articles sort by building number naturally (006, 007, 008...).
- Keep category as secondary sort.

### 4. `src/components/knowledge/KnowledgeImport.tsx`
- Fix title generation: use `normalizeCode(code)` instead of raw `code` for future imports, so new imports create titles like "006 - Elevadores".

### 5. `src/pages/Knowledge.tsx`
- Ensure the grid container has `overflow-hidden` and uses responsive columns that don't cause horizontal overflow (already `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` which is fine, but add `overflow-x-hidden` on the page wrapper).

### 6. Data fix for existing articles (optional migration)
- Create a SQL migration to update existing article titles: strip "Cond. '" prefix from all knowledge_articles titles so the data is clean going forward.

## Files to edit
| File | Change |
|------|--------|
| `src/components/knowledge/KnowledgeFilters.tsx` | Remove ScrollArea, use flex-wrap |
| `src/components/knowledge/KnowledgeCard.tsx` | Strip "Cond. '" from displayed title |
| `src/hooks/useKnowledgeArticles.ts` | Sort by title ASC instead of updated_at DESC |
| `src/components/knowledge/KnowledgeImport.tsx` | Use normalizeCode for title prefix |
| `src/pages/Knowledge.tsx` | Add overflow-x-hidden to wrapper |
| New SQL migration | Update existing titles in DB to remove "Cond. '" prefix |

