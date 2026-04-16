import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Globe, Building2 } from "lucide-react";
import { getCategoryConfig } from "@/utils/knowledgeCategories";
import { stripMarkdown } from "@/utils/stripMarkdown";
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
  const plainText = stripMarkdown(article.content);
  const excerpt = plainText.length > 160 ? plainText.substring(0, 160) + "..." : plainText;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow group"
      onClick={() => onClick(article)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header: icon pill + title + action menu */}
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 p-2.5 rounded-full ${cat.bgCircleClass}`}>
            <Icon className={`h-6 w-6 ${cat.textClass}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2">{article.title}</h3>
            <Badge variant="secondary" className={`mt-1 text-[11px] ${cat.bgClass} ${cat.textClass} border-0`}>
              {cat.label}
            </Badge>
          </div>
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(article)}>
                  <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(article.id)}>
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Excerpt */}
        <p className="text-xs text-muted-foreground line-clamp-3">{excerpt}</p>

        {/* Building info */}
        {(article.buildings || article.is_global) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {article.is_global ? (
              <>
                <Globe className="h-3.5 w-3.5" />
                <span className="font-medium">Global</span>
              </>
            ) : article.buildings ? (
              <>
                <Building2 className="h-3.5 w-3.5" />
                <span>{article.buildings.code} - {article.buildings.name}</span>
              </>
            ) : null}
          </div>
        )}

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {article.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[11px]">
                {tag}
              </Badge>
            ))}
            {article.tags.length > 3 && (
              <Badge variant="outline" className="text-[11px]">+{article.tags.length - 3}</Badge>
            )}
          </div>
        )}

        {/* Date */}
        <p className="text-[11px] text-muted-foreground">
          Atualizado: {new Date(article.updated_at).toLocaleDateString("pt-PT")}
        </p>
      </CardContent>
    </Card>
  );
}
