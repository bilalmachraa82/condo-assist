import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Upload, Loader2 } from "lucide-react";
import KnowledgeImport from "@/components/knowledge/KnowledgeImport";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import KnowledgeFilters from "@/components/knowledge/KnowledgeFilters";
import KnowledgeCard from "@/components/knowledge/KnowledgeCard";
import KnowledgeForm from "@/components/knowledge/KnowledgeForm";
import KnowledgeDetail from "@/components/knowledge/KnowledgeDetail";
import {
  useKnowledgeArticles,
  useKnowledgeCategoryCounts,
  useDeleteKnowledgeArticle,
  type KnowledgeArticle,
  type KnowledgeFilters as Filters,
} from "@/hooks/useKnowledgeArticles";

const PAGE_SIZE = 50;

export default function Knowledge() {
  const [filters, setFilters] = useState<Filters>({ limit: PAGE_SIZE, page: 0 });
  const [allArticles, setAllArticles] = useState<KnowledgeArticle[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editArticle, setEditArticle] = useState<KnowledgeArticle | null>(null);
  const [viewArticle, setViewArticle] = useState<KnowledgeArticle | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const { data, isLoading } = useKnowledgeArticles(filters);
  const { data: categoryCounts } = useKnowledgeCategoryCounts();
  const deleteMutation = useDeleteKnowledgeArticle();

  // Merge paginated results
  const currentPage = filters.page || 0;
  const articles = data?.articles ?? [];
  const totalCount = data?.count ?? 0;

  // For "load more" we accumulate pages
  const displayedArticles = currentPage === 0 ? articles : [...allArticles.slice(0, currentPage * PAGE_SIZE), ...articles];
  const hasMore = displayedArticles.length < totalCount;

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setAllArticles(displayedArticles);
    setLoadingMore(true);
    setFilters((prev) => ({ ...prev, page: nextPage }));
    setTimeout(() => setLoadingMore(false), 500);
  };

  const handleFiltersChange = (newFilters: Filters) => {
    setAllArticles([]);
    setFilters({ ...newFilters, limit: PAGE_SIZE, page: 0 });
  };

  const handleEdit = (article: KnowledgeArticle) => {
    setEditArticle(article);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditArticle(null);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Base de Conhecimento</h1>
            {totalCount > 0 && (
              <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {totalCount} artigos
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Artigos, procedimentos e informação de manutenção
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> Importar Excel
          </Button>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" /> Novo Artigo
          </Button>
        </div>
      </div>

      <KnowledgeFilters
        filters={filters}
        onChange={handleFiltersChange}
        categoryCounts={categoryCounts}
      />

      {isLoading && currentPage === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : displayedArticles.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedArticles.map((article) => (
              <KnowledgeCard
                key={article.id}
                article={article}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteId(id)}
                onClick={(a) => setViewArticle(a)}
              />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore || isLoading}>
                {loadingMore || isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Mostrar mais ({displayedArticles.length} de {totalCount})
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">Sem artigos</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {filters.search || filters.category || filters.building_id
              ? "Nenhum artigo encontrado com os filtros aplicados."
              : "Comece por criar o primeiro artigo da base de conhecimento."}
          </p>
          <Button onClick={handleNew} variant="outline">
            <Plus className="h-4 w-4 mr-2" /> Criar Artigo
          </Button>
        </div>
      )}

      <KnowledgeForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditArticle(null);
        }}
        article={editArticle}
      />

      <KnowledgeDetail
        article={viewArticle}
        open={!!viewArticle}
        onOpenChange={(open) => !open && setViewArticle(null)}
        onEdit={handleEdit}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar artigo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. O artigo será permanentemente eliminado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <KnowledgeImport open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
