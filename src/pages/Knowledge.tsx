import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen } from "lucide-react";
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
  useDeleteKnowledgeArticle,
  type KnowledgeArticle,
  type KnowledgeFilters as Filters,
} from "@/hooks/useKnowledgeArticles";

export default function Knowledge() {
  const [filters, setFilters] = useState<Filters>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editArticle, setEditArticle] = useState<KnowledgeArticle | null>(null);
  const [viewArticle, setViewArticle] = useState<KnowledgeArticle | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: articles, isLoading } = useKnowledgeArticles(filters);
  const deleteMutation = useDeleteKnowledgeArticle();

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Base de Conhecimento</h1>
          <p className="text-sm text-muted-foreground">
            Artigos, procedimentos e informação de manutenção
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" /> Novo Artigo
        </Button>
      </div>

      <KnowledgeFilters filters={filters} onChange={setFilters} />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : articles && articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((article) => (
            <KnowledgeCard
              key={article.id}
              article={article}
              onEdit={handleEdit}
              onDelete={(id) => setDeleteId(id)}
              onClick={(a) => setViewArticle(a)}
            />
          ))}
        </div>
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
    </div>
  );
}
