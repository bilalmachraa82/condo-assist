import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Globe, Building2, Copy, Calendar, Tag } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getCategoryConfig } from "@/utils/knowledgeCategories";
import { useToast } from "@/hooks/use-toast";
import type { KnowledgeArticle } from "@/hooks/useKnowledgeArticles";

interface Props {
  article: KnowledgeArticle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (article: KnowledgeArticle) => void;
}

export default function KnowledgeDetail({ article, open, onOpenChange, onEdit }: Props) {
  const { toast } = useToast();
  if (!article) return null;
  const cat = getCategoryConfig(article.category);
  const Icon = cat.icon;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(article.content);
      toast({ title: "Copiado", description: "Conteúdo copiado para a área de transferência." });
    } catch {
      toast({ title: "Erro", description: "Não foi possível copiar.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
        {/* Header banner */}
        <div className={`${cat.bgClass} px-6 py-5`}>
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${cat.bgCircleClass}`}>
                <Icon className={`h-6 w-6 ${cat.textClass}`} />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg leading-tight">{article.title}</DialogTitle>
                <Badge className={`mt-1 ${cat.bgClass} ${cat.textClass} border-0`}>{cat.label}</Badge>
                {article.subcategory && <Badge variant="outline" className="ml-1 mt-1">{article.subcategory}</Badge>}
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Metadata row */}
          <div className="flex flex-wrap gap-3 py-3 border-b text-xs text-muted-foreground">
            {article.is_global && (
              <div className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" />
                <span className="font-medium">Global</span>
              </div>
            )}
            {article.buildings && (
              <div className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                <span>{article.buildings.code} - {article.buildings.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>Criado: {new Date(article.created_at).toLocaleDateString("pt-PT")}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>Atualizado: {new Date(article.updated_at).toLocaleDateString("pt-PT")}</span>
            </div>
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              {article.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-base prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-table:border prose-th:border prose-td:border prose-th:bg-muted/50">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4 border-t">
            <Button size="sm" variant="outline" onClick={handleCopy}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copiar conteúdo
            </Button>
            <Button size="sm" variant="outline" onClick={() => { onOpenChange(false); onEdit(article); }}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
