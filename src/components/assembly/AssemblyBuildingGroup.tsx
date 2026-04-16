import { useState } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Building2, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react";
import { getAssemblyCategoryConfig } from "@/utils/assemblyCategories";
import type { AssemblyItem } from "@/hooks/useAssemblyItems";

interface Props {
  buildingCode: number;
  address: string;
  items: AssemblyItem[];
  onViewItem: (item: AssemblyItem) => void;
  onEditItem: (item: AssemblyItem) => void;
  onDeleteItem: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onAddItem: () => void;
  defaultOpen?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  pending: { label: "Pendente", dot: "bg-red-500" },
  in_progress: { label: "Em Curso", dot: "bg-yellow-500" },
  done: { label: "Resolvido", dot: "bg-green-500" },
  cancelled: { label: "Cancelado", dot: "bg-gray-400" },
};

export default function AssemblyBuildingGroup({
  buildingCode,
  address,
  items,
  onViewItem,
  onEditItem,
  onDeleteItem,
  onStatusChange,
  onAddItem,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const doneCount = items.filter((i) => i.status === "done" || i.status === "cancelled").length;
  const pendingCount = items.filter((i) => i.status === "pending").length;
  const progressPercent = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left group">
          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${open ? "rotate-90" : ""}`} />
          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm">
              {String(buildingCode).padStart(3, "0")}
            </span>
            {address && (
              <span className="text-sm text-muted-foreground ml-1.5">— {address}</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {items.length} assunto{items.length > 1 ? "s" : ""}
            </Badge>
            <div className="w-16 hidden sm:block">
              <Progress value={progressPercent} className="h-1.5" />
            </div>
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="ml-4 mr-1 mt-1 mb-3 border rounded-lg overflow-hidden bg-card">
          {/* Table header */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
            <span>Descrição</span>
            <span className="w-24 text-center">Categoria</span>
            <span className="w-32 text-center">Estado</span>
            <span className="w-16 text-center">Ações</span>
          </div>

          {/* Rows */}
          {items.map((item) => {
            const cat = item.category ? getAssemblyCategoryConfig(item.category) : null;
            const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;

            return (
              <div
                key={item.id}
                className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-2.5 border-b last:border-b-0 hover:bg-accent/30 cursor-pointer transition-colors items-center group/row"
                onClick={() => onViewItem(item)}
              >
                {/* Description */}
                <div className="min-w-0">
                  <p className="text-sm line-clamp-1">{item.description}</p>
                  {item.status_notes && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1 italic mt-0.5">{item.status_notes}</p>
                  )}
                </div>

                {/* Category badge */}
                <div className="w-24 flex justify-center">
                  {cat ? (
                    <Badge variant="secondary" className={`text-[10px] ${cat.bgClass} ${cat.textClass} border-0`}>
                      {cat.label}
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </div>

                {/* Status select */}
                <div className="w-32" onClick={(e) => e.stopPropagation()}>
                  <Select value={item.status} onValueChange={(v) => onStatusChange(item.id, v)}>
                    <SelectTrigger className="h-7 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${statusCfg.dot}`} />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          <div className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${v.dot}`} />
                            {v.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Actions */}
                <div className="w-16 flex justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onEditItem(item)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover/row:opacity-100"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover/row:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add button */}
          <div className="px-4 py-2 border-t bg-muted/30">
            <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground" onClick={onAddItem}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar assunto a este prédio
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
