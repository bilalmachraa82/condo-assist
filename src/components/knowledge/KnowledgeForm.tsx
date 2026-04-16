import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { KNOWLEDGE_CATEGORIES } from "@/utils/knowledgeCategories";
import { useBuildings } from "@/hooks/useBuildings";
import {
  useCreateKnowledgeArticle,
  useUpdateKnowledgeArticle,
  type KnowledgeArticle,
} from "@/hooks/useKnowledgeArticles";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article?: KnowledgeArticle | null;
}

export default function KnowledgeForm({ open, onOpenChange, article }: Props) {
  const { data: buildings } = useBuildings();
  const createMutation = useCreateKnowledgeArticle();
  const updateMutation = useUpdateKnowledgeArticle();
  const isEditing = !!article;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("geral");
  const [subcategory, setSubcategory] = useState("");
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [isGlobal, setIsGlobal] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setContent(article.content);
      setCategory(article.category);
      setSubcategory(article.subcategory || "");
      setBuildingId(article.building_id);
      setIsGlobal(article.is_global);
      setIsPublished(article.is_published);
      setTags(article.tags || []);
    } else {
      setTitle("");
      setContent("");
      setCategory("geral");
      setSubcategory("");
      setBuildingId(null);
      setIsGlobal(false);
      setIsPublished(true);
      setTags([]);
    }
  }, [article, open]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput("");
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;

    const payload = {
      title: title.trim(),
      content: content.trim(),
      category,
      subcategory: subcategory || undefined,
      tags,
      building_id: isGlobal ? null : buildingId,
      is_global: isGlobal,
      is_published: isPublished,
    };

    if (isEditing && article) {
      await updateMutation.mutateAsync({ id: article.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Editar Artigo" : "Novo Artigo"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do artigo" />
          </div>

          <div>
            <Label>Categoria *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KNOWLEDGE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="subcategory">Subcategoria</Label>
            <Input id="subcategory" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} placeholder="Opcional" />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={isGlobal} onCheckedChange={setIsGlobal} id="global" />
            <Label htmlFor="global">Aplica a todos os edifícios</Label>
          </div>

          {!isGlobal && (
            <div>
              <Label>Edifício</Label>
              <Select value={buildingId || "none"} onValueChange={(v) => setBuildingId(v === "none" ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar edifício" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {buildings?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.code} - {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Adicionar tag"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="secondary" size="sm" onClick={addTag}>
                +
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setTags(tags.filter((t) => t !== tag))} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Conteúdo * (Markdown)</Label>
            <Tabs defaultValue="write">
              <TabsList className="mb-2">
                <TabsTrigger value="write">Escrever</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="write">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escrever conteúdo em Markdown..."
                  className="min-h-[200px] resize-y"
                />
              </TabsContent>
              <TabsContent value="preview">
                <div className="prose prose-sm dark:prose-invert max-w-none border rounded-md p-4 min-h-[200px] bg-muted/30">
                  {content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                  ) : (
                    <p className="text-muted-foreground italic">Nada para pré-visualizar</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={isPublished} onCheckedChange={setIsPublished} id="published" />
            <Label htmlFor="published">Publicado</Label>
          </div>

          <Button onClick={handleSubmit} disabled={isPending || !title.trim() || !content.trim()} className="w-full">
            {isPending ? "A guardar..." : isEditing ? "Guardar Alterações" : "Criar Artigo"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
