

## Plan: Add Elevator Assistance Card + Deploy agent-api

### What's done from the plan
- SQL migration (condominium_contacts, rate_limit, idempotency, source column, policy fixes) — applied
- `agent-api` edge function — created but needs deployment
- `test-api.http` and `scripts/test-api.sh` — created

### What's next

#### 1. Deploy `agent-api` edge function
Deploy the new edge function to make it live.

#### 2. Add Elevator Stats Card to the statistics grid
Currently there are 4 stat cards (Total, Pendentes, Em Progresso, Concluídas). Add a 5th "Elevador" card in the statistics grid that:
- Shows the count of active elevator assistances (reuses the existing `elevatorCount` query)
- Has an elevator icon (`ArrowUpDown`) with warning/orange styling
- Is clickable: when clicked, filters the list to show only elevator assistances
- Visual style consistent with the other stat cards (gradient background)

#### 3. Elevator filter state
Add an `elevatorOnly` boolean state. When the Elevator card is clicked, toggle this filter. When active:
- The card gets a highlighted border/ring to show it's active
- The assistance list filters to only show assistances where `intervention_types.name` contains "elevador"
- Clicking again removes the filter

#### Files to modify
| File | Change |
|------|--------|
| `src/pages/Assistencias.tsx` | Add elevator stat card to the grid (change from 4-col to 5-col on desktop), add `elevatorOnly` filter state, apply filter to `filteredAssistances` |
| Deploy `agent-api` | Via deploy tool |

#### Technical details
- The grid changes from `grid-cols-2 md:grid-cols-4` to `grid-cols-2 md:grid-cols-5`
- The elevator card reuses the existing `elevatorCount` query data
- Filter logic: when `elevatorOnly` is true, add `.filter(a => a.intervention_types?.name?.toLowerCase().includes('elevador'))` to `filteredAssistances`

