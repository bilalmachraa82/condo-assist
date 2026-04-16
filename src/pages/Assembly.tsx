import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ClipboardList, Upload, Loader2, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AssemblyFilters from "@/components/assembly/AssemblyFilters";
import AssemblyBuildingGroup from "@/components/assembly/AssemblyBuildingGroup";
import AssemblyDetail from "@/components/assembly/AssemblyDetail";
import AssemblyImport from "@/components/assembly/AssemblyImport";
import AssemblyForm from "@/components/assembly/AssemblyForm";
import AssemblyStats from "@/components/assembly/AssemblyStats";
import {
  useAssemblyItems, useAssemblyStatusCounts, useUpdateAssemblyItem, useDeleteAssemblyItem,
  type AssemblyItem, type AssemblyFilters as Filters,
} from "@/hooks/useAssemblyItems";

const PAGE_SIZE = 200;

export default function Assembly() {
  const [filters, setFilters] = useState<Filters>({ limit: PAGE_SIZE, page: 0 });
  const [allItems, setAllItems] = useState<AssemblyItem[]>([]);
  const [viewItem, setViewItem] = useState<AssemblyItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<AssemblyItem | null>(null);
  const [defaultBuildingId, setDefaultBuildingId] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const { data, isLoading } = useAssemblyItems(filters);
  const { data: counts } = useAssemblyStatusCounts();
  const updateMutation = useUpdateAssemblyItem();
  const deleteMutation = useDeleteAssemblyItem();

  const currentPage = filters.page || 0;
  const items = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const displayedItems = currentPage === 0 ? items : [...allItems.slice(0, currentPage * PAGE_SIZE), ...items];
  const hasMore = displayedItems.length < totalCount;

  // Group items by building_code
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

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setAllItems(displayedItems);
    setLoadingMore(true);
    setFilters((prev) => ({ ...prev, page: nextPage }));
    setTimeout(() => setLoadingMore(false), 500);
  };

  const handleFiltersChange = (newFilters: Filters) => {
    setAllItems([]);
    setFilters({ ...newFilters, limit: PAGE_SIZE, page: 0 });
  };

  const handleStatusChange = (id: string, status: string) => {
    updateMutation.mutate({ id, status });
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleAddForBuilding = (buildingId: string | null) => {
    setEditItem(null);
    setDefaultBuildingId(buildingId);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Seguimento de Actas</h1>
            {totalCount > 0 && (
              <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {totalCount} assuntos
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Deliberações das assembleias de condomínio
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setEditItem(null); setDefaultBuildingId(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo Assunto
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> Importar Excel
          </Button>
        </div>
      </div>

      {/* Stats */}
      {counts && (
        <AssemblyStats statusCounts={counts.statusCounts} total={counts.total} />
      )}

      {/* Filters */}
      <AssemblyFilters
        filters={filters}
        onChange={handleFiltersChange}
        categoryCounts={counts?.categoryCounts}
      />

      {/* Grouped list */}
      {isLoading && currentPage === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : grouped.length > 0 ? (
        <>
          <div className="space-y-2">
            {grouped.map(([code, group]) => (
              <AssemblyBuildingGroup
                key={code}
                buildingCode={code}
                address={group.address}
                items={group.items}
                onViewItem={setViewItem}
                onEditItem={(it) => { setEditItem(it); setDefaultBuildingId(null); setFormOpen(true); }}
                onDeleteItem={(id) => setDeleteId(id)}
                onStatusChange={handleStatusChange}
                onAddItem={() => handleAddForBuilding(group.building_id)}
                defaultOpen={grouped.length <= 5}
              />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore || isLoading}>
                {(loadingMore || isLoading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Mostrar mais ({displayedItems.length} de {totalCount})
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">Sem assuntos</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {filters.search || filters.status || filters.category || filters.building_id
              ? "Nenhum assunto encontrado com os filtros aplicados."
              : "Comece por importar o ficheiro Excel com os assuntos das actas."}
          </p>
          <Button onClick={() => setImportOpen(true)} variant="outline">
            <Upload className="h-4 w-4 mr-2" /> Importar Excel
          </Button>
        </div>
      )}

      {/* Detail */}
      <AssemblyDetail
        item={viewItem}
        open={!!viewItem}
        onOpenChange={(open) => !open && setViewItem(null)}
        onEdit={(it) => { setViewItem(null); setEditItem(it); setDefaultBuildingId(null); setFormOpen(true); }}
        onDelete={(id) => { setViewItem(null); setDeleteId(id); }}
      />

      {/* Create/Edit Form */}
      <AssemblyForm
        item={editItem}
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultBuildingId={defaultBuildingId}
      />

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar assunto?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser revertida.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import */}
      <AssemblyImport open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
