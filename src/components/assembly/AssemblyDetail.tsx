import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Calendar, Save, BookOpen } from "lucide-react";
import { getAssemblyCategoryConfig } from "@/utils/assemblyCategories";
import { useUpdateAssemblyItem, type AssemblyItem } from "@/hooks/useAssemblyItems";
import { useCreateKnowledgeArticle } from "@/hooks/useKnowledgeArticles";
import { useToast } from "@/hooks/use-toast";

interface Props {
  item: AssemblyItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em Curso",
  done: "Resolvido",
  cancelled: "Cancelado",
};

export default function AssemblyDetail({ item, open, onOpenChange }: Props) {
  const updateMutation = useUpdateAssemblyItem();
  const createKBArticle = useCreateKnowledgeArticle();
  const { toast } = useToast();
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("");

  if (!item) return null;

  const cat = item.category ? getAssemblyCategoryConfig(item.category) : null;
  const Icon = cat?.icon;

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setEditNotes(item.status_notes || "");
      setEditStatus(item.status);
    }
    onOpenChange(isOpen);
  };

  const handleSave = () => {
    updateMutation.mutate({
      id: item.id,
      status: editStatus,
      status_notes: editNotes || null,
    });
  };

  const handleCreateKBArticle = () => {
    createKBArticle.mutate({
      title: `Cond. ${item.building_code} - Acta ${item.year}`,
      content: item.description,
      category: item.category || "geral",
      building_id: item.building_id,
      tags: ["acta", String(item.year)],
    }, {
      onSuccess: () => {
        toast({ title: "Artigo KB criado", description: "O assunto foi adicionado à base de conhecimento." });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
        {/* Header */}
        <div className={`${cat?.bgClass || "bg-muted"} px-6 py-5`}>
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className={`p-3 rounded-full ${cat?.bgCircleClass}`}>
                  <Icon className={`h-6 w-6 ${cat?.textClass}`} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg leading-tight">
                  Cond. {item.building_code} — Assunto de Acta
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  {cat && <Badge className={`${cat.bgClass} ${cat.textClass} border-0`}>{cat.label}</Badge>}
                  <Badge variant="outline">{item.year}</Badge>
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Metadata */}
          <div className="flex flex-wrap gap-3 py-3 border-b text-xs text-muted-foreground">
            {item.building_address && (
              <div className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                <span>{item.building_address}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>Criado: {new Date(item.created_at).toLocaleDateString("pt-PT")}</span>
            </div>
            {item.estimated_cost && (
              <span className="font-medium">
                Valor: {item.estimated_cost.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
              </span>
            )}
          </div>

          {/* Full description */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{item.description}</p>
          </div>

          {/* Status edit */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium w-20">Estado:</label>
              <Select value={editStatus || item.status} onValueChange={setEditStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Notas de seguimento:</label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Adicionar notas sobre o estado..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4 border-t">
            <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
              <Save className="h-3.5 w-3.5 mr-1" /> Guardar
            </Button>
            <Button size="sm" variant="outline" onClick={handleCreateKBArticle} disabled={createKBArticle.isPending}>
              <BookOpen className="h-3.5 w-3.5 mr-1" /> Criar artigo KB
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
