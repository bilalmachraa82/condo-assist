import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Globe } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getCategoryConfig } from "@/utils/knowledgeCategories";
import type { KnowledgeArticle } from "@/hooks/useKnowledgeArticles";

interface Props {
  article: KnowledgeArticle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (article: KnowledgeArticle) => void;
}

export default function KnowledgeDetail({ article, open, onOpenChange, onEdit }: Props) {
  if (!article) return null;
  const cat = getCategoryConfig(article.category);
  const Icon = cat.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded ${cat.bgClass}`}>
              <Icon className={`h-4 w-4 ${cat.textClass}`} />
            </div>
            <DialogTitle className="text-lg">{article.title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Badge className={`${cat.bgClass} ${cat.textClass} border-0`}>{cat.label}</Badge>
            {article.subcategory && <Badge variant="outline">{article.subcategory}</Badge>}
            {article.is_global && (
              <Badge variant="outline" className="gap-1">
                <Globe className="h-3 w-3" /> Global
              </Badge>
            )}
            {article.buildings && (
              <Badge variant="outline">
                {article.buildings.code} - {article.buildings.name}
              </Badge>
            )}
          </div>

          {article.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {article.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
          </div>

          <div className="flex items-center justify-between pt-4 border-t text-xs text-muted-foreground">
            <span>
              Criado: {new Date(article.created_at).toLocaleDateString("pt-PT")} · Atualizado: {new Date(article.updated_at).toLocaleDateString("pt-PT")}
            </span>
            <Button size="sm" variant="outline" onClick={() => { onOpenChange(false); onEdit(article); }}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
