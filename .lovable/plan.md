

# Plan: Add Create & Edit to Assembly Module

## What's Missing
The Assembly module currently only supports importing from Excel and viewing/updating status. It lacks:
1. A "Create New" button to manually add assembly items
2. Full edit capability for all fields (description, category, building, year, priority, cost, etc.)
3. Delete action accessible from cards/detail view

## Changes

### 1. New: `src/components/assembly/AssemblyForm.tsx`
Dialog form for both creating and editing assembly items. Fields:
- **Building** — Select from buildings table (Code - Name format per memory)
- **Year** — Number input (default current year)
- **Description** — Textarea
- **Category** — Select from assembly categories
- **Status** — Select (pending/in_progress/done/cancelled)
- **Priority** — Select (urgent/high/normal/low)
- **Status Notes** — Textarea
- **Assigned To** — Text input
- **Estimated Cost** — Number input
- **Resolution Date** — Date input

When editing, pre-populate all fields from the item. When creating, defaults for status=pending, priority=normal, year=current year.

### 2. New hook: `useCreateAssemblyItem` in `src/hooks/useAssemblyItems.ts`
- Insert mutation that auto-resolves `building_id` and `building_address` from the selected building
- Invalidates assembly queries on success

### 3. Edit `src/pages/Assembly.tsx`
- Add "Novo Assunto" button (with Plus icon) next to "Importar Excel"
- Add state for create/edit form open + selected item for edit
- Pass edit/delete handlers to AssemblyCard and AssemblyDetail

### 4. Edit `src/components/assembly/AssemblyCard.tsx`
- Add edit (Pencil) and delete (Trash2) icon buttons in the card footer, visible on hover
- Wire onEdit and onDelete callbacks

### 5. Edit `src/components/assembly/AssemblyDetail.tsx`
- Add "Editar" button that opens AssemblyForm in edit mode
- Add "Eliminar" button with confirmation
- Make all fields in detail read-only (editing happens via the form)

## No database changes needed
The table already supports all fields. Only frontend additions.

