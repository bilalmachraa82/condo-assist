

# Plan: Reorganize Assembly Module — Group by Building

## Problem
Currently, assembly items display as a flat grid of cards. The user wants items **grouped by building** (like the Excel structure), where each building is a collapsible section showing all its items in a table-like layout with inline status editing.

## New UX Flow

```text
┌──────────────────────────────────────────────────┐
│  Seguimento de Actas          [+ Novo] [Import]  │
│  [Stats cards: Pendentes | Em Curso | Resolvidos]│
│  [Search] [Ano ▾] [Status chips] [Category chips]│
├──────────────────────────────────────────────────┤
│                                                  │
│  ▼ 003 — Rua Alexandre Herculano, nº3  (8 itens) │
│  ┌────────────────────────────────────────────┐  │
│  │ Descrição (truncada)  │ Estado │ Ações     │  │
│  │ Limpeza caleiras...   │ 🟢 Ok │ ✏️ 🗑️    │  │
│  │ Tapar buraco escadas..│ 🟡 Em C│ ✏️ 🗑️    │  │
│  │ Verificar caleiras... │ 🟡 Em C│ ✏️ 🗑️    │  │
│  │           [+ Adicionar assunto a este prédio] │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ▸ 004 — Rua X, nº4  (3 itens)     [collapsed]  │
│  ▸ 009 — Rua Y, nº9  (5 itens)     [collapsed]  │
└──────────────────────────────────────────────────┘
```

## Changes

### 1. New: `src/components/assembly/AssemblyBuildingGroup.tsx`
Collapsible section per building using `Collapsible` from shadcn. Shows:
- Header: building code + address + item count + pending/done progress indicator
- Body: table/list of items with columns: Description (truncated), Category badge, Status dropdown (inline), Notes (truncated), Actions (edit/delete icons)
- Footer: "+ Adicionar assunto" button that opens AssemblyForm pre-filled with this building

### 2. Edit: `src/pages/Assembly.tsx`
- After fetching items, group them by `building_code` using a `Map`
- Sort groups by `building_code` ascending (numeric order)
- Render `AssemblyBuildingGroup` for each group instead of flat card grid
- Remove the card grid layout entirely
- Pass building-specific "add" handler that pre-selects the building in AssemblyForm
- Keep stats, filters, load-more, detail dialog, delete dialog, import, and form as-is

### 3. Edit: `src/components/assembly/AssemblyForm.tsx`
- Accept optional `defaultBuildingId` prop to pre-select building when adding from a building group
- When `defaultBuildingId` is set and no `item` (create mode), auto-select that building

### 4. Remove dependency on `AssemblyCard.tsx`
- `AssemblyCard.tsx` becomes unused (can keep for potential future use but won't be imported)

### 5. Edit: `src/hooks/useAssemblyItems.ts`
- Change default sort to `building_code ASC, created_at ASC` (items in order within each building)
- Increase default limit or remove pagination in favor of loading all items (since grouping needs all data per building). Alternative: keep pagination but load more per page (e.g., 200).

## Technical Details

### Grouping logic (in Assembly.tsx)
```typescript
const grouped = useMemo(() => {
  const map = new Map<number, { address: string; building_id: string | null; items: AssemblyItem[] }>();
  for (const item of displayedItems) {
    if (!map.has(item.building_code)) {
      map.set(item.building_code, { address: item.building_address || "", building_id: item.building_id, items: [] });
    }
    map.get(item.building_code)!.items.push(item);
  }
  return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
}, [displayedItems]);
```

### AssemblyBuildingGroup component
- Uses `Collapsible`/`CollapsibleTrigger`/`CollapsibleContent`
- Header shows: `{code} — {address}` + badges for pending/done counts + chevron
- Table rows: description (line-clamp-2), category badge, inline status Select, edit/delete buttons
- Each row clickable to open detail dialog
- Mini progress bar (green portion = done items / total items)

## No database changes needed

