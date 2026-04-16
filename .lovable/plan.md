

## Plan: Add Elevator Shortcut to Building Assistances View

### What changes
Add a 5th stat card "Elevador" to the building detail stats grid, plus an elevator filter toggle. When clicked, the list shows only elevator-related assistances for that building.

### Changes to `src/pages/Edificios.tsx`

1. **Import `ArrowUpDown`** from lucide-react
2. **Add `elevatorOnly` state** (boolean, default false)
3. **Compute `elevatorAssistances`** count from `buildingAssistances` where `intervention_types?.name?.toLowerCase().includes('elevador')`
4. **Add 5th card** in the stats grid (line ~177): elevator icon, orange styling, clickable toggle. Grid changes from `grid-cols-2 md:grid-cols-4` to `grid-cols-2 md:grid-cols-5`
5. **Apply elevator filter** to `filteredOpenAssistances`, `filteredClosedAssistances`, and `filteredAllAssistances` — when `elevatorOnly` is true, only show assistances where intervention type contains "elevador"
6. **Visual feedback** — highlighted border/ring on the elevator card when active

### Technical details
- Filter logic: chain `.filter(a => a.intervention_types?.name?.toLowerCase().includes('elevador'))` before the existing search filter
- Card styling: `cursor-pointer` + `ring-2 ring-orange-500` when active
- Counts in tabs update to reflect the elevator filter

