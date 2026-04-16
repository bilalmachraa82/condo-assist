import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Globe } from "lucide-react";
import { getCategoryConfig } from "@/utils/knowledgeCategories";
import type { KnowledgeArticle } from "@/hooks/useKnowledgeArticles";

interface Props {
  article: KnowledgeArticle;
  onEdit: (article: KnowledgeArticle) => void;
  onDelete: (id: string) => void;
  onClick: (article: KnowledgeArticle) => void;
}

export default function KnowledgeCard({ article, onEdit, onDelete, onClick }: Props) {
  const cat = getCategoryConfig(article.category);
  const Icon = cat.icon;
  const excerpt = article.content.length > 150
    ? article.content.substring(0, 150) + "..."
    : article.content;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick(article)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded ${cat.bgClass}`}>
              <Icon className={`h-4 w-4 ${cat.textClass}`} />
            </div>
            <h3 className="font-semibold text-sm leading-tight truncate">{article.title}</h3>
          </div>
          <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(article)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(article.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{excerpt}</p>
        <div className="flex flex-wrap gap-1.5 items-center">
          <Badge variant="secondary" className={`text-[10px] ${cat.bgClass} ${cat.textClass} border-0`}>
            {cat.label}
          </Badge>
          {article.is_global && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Globe className="h-2.5 w-2.5" /> Global
            </Badge>
          )}
          {article.buildings && (
            <Badge variant="outline" className="text-[10px]">
              {article.buildings.code} - {article.buildings.name}
            </Badge>
          )}
          {article.tags?.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Atualizado: {new Date(article.updated_at).toLocaleDateString("pt-PT")}
        </p>
      </CardContent>
    </Card>
  );
}
