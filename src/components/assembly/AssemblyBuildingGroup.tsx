import { useState, useEffect, useRef } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Building2, ChevronRight, Plus, Pencil, Trash2, Check, Loader2 } from "lucide-react";
import { getAssemblyCategoryConfig } from "@/utils/assemblyCategories";
import AssemblyPDFExportButton from "./AssemblyPDFExportButton";
import { useUpdateAssemblyItem, type AssemblyItem } from "@/hooks/useAssemblyItems";

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

type SaveState = "idle" | "saving" | "saved";

function InlineNotes({ item }: { item: AssemblyItem }) {
  const [value, setValue] = useState(item.status_notes || "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const updateMutation = useUpdateAssemblyItem();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const savedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef(item.status_notes || "");

  // Re-sync if item updates externally
  useEffect(() => {
    const incoming = item.status_notes || "";
    if (incoming !== lastSavedRef.current && incoming !== value) {
      setValue(incoming);
      lastSavedRef.current = incoming;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.status_notes]);

  const persist = async (next: string) => {
    if (next === lastSavedRef.current) return;
    setSaveState("saving");
    try {
      await updateMutation.mutateAsync({ id: item.id, status_notes: next || null });
      lastSavedRef.current = next;
      setSaveState("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveState("idle"), 1500);
    } catch {
      setSaveState("idle");
    }
  };

  const handleChange = (next: string) => {
    setValue(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => persist(next), 900);
  };

  const handleBlur = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    persist(value);
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <Textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder="Notas / informações sobre este assunto…"
        rows={2}
        className="min-h-[44px] text-xs resize-y bg-muted/30 border-dashed focus-visible:bg-background focus-visible:border-solid"
      />
      <div className="absolute right-2 top-1.5 pointer-events-none flex items-center gap-1 text-[10px] text-muted-foreground">
        {saveState === "saving" && (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>A guardar…</span>
          </>
        )}
        {saveState === "saved" && (
          <>
            <Check className="h-3 w-3 text-green-600" />
            <span className="text-green-600">Guardado</span>
          </>
        )}
      </div>
    </div>
  );
}

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
      <div className="flex items-stretch gap-1">
        <CollapsibleTrigger asChild>
          <button className="flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left group">
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
        <div className="flex items-center px-1 rounded-lg border bg-card" onClick={(e) => e.stopPropagation()}>
          <AssemblyPDFExportButton
            groups={[{ buildingCode, address, items }]}
            iconOnly
          />
        </div>
      </div>

      <CollapsibleContent>
        <div className="ml-4 mr-1 mt-1 mb-3 border rounded-lg overflow-hidden bg-card">
          {/* Table header */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto] gap-2 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
            <span>Assunto / Notas</span>
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
                className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 px-4 py-3 border-b last:border-b-0 hover:bg-accent/20 transition-colors items-start group/row"
              >
                {/* Description + inline notes */}
                <div className="min-w-0 space-y-1.5">
                  <button
                    type="button"
                    onClick={() => onViewItem(item)}
                    className="flex items-start gap-2 text-left w-full hover:text-primary transition-colors"
                  >
                    {cat && (
                      <span className={`mt-0.5 inline-flex items-center justify-center h-4 w-4 rounded ${cat.bgClass} flex-shrink-0`} title={cat.label}>
                        <cat.icon className={`h-2.5 w-2.5 ${cat.textClass}`} />
                      </span>
                    )}
                    <p className="text-sm leading-snug">{item.description}</p>
                  </button>
                  <InlineNotes item={item} />
                </div>

                {/* Status select */}
                <div className="w-full sm:w-32" onClick={(e) => e.stopPropagation()}>
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
                <div className="w-full sm:w-16 flex sm:justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onEditItem(item)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors sm:opacity-0 sm:group-hover/row:opacity-100"
                    aria-label="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors sm:opacity-0 sm:group-hover/row:opacity-100"
                    aria-label="Eliminar"
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
