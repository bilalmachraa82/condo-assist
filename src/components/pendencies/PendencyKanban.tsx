import { useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  PENDENCY_STATUS_LABELS, PENDENCY_STATUS_ORDER, pendencySLA,
  useUpdatePendency, type Pendency, type PendencyStatus,
} from "@/hooks/usePendencies";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/components/ui/status-badges";
import { Building2, User, Wrench, Clock, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const COLUMN_ACCENT: Record<PendencyStatus, string> = {
  aberto: "border-t-primary",
  aguarda_resposta: "border-t-warning",
  resposta_recebida: "border-t-accent",
  precisa_decisao: "border-t-warning",
  escalado: "border-t-destructive",
  resolvido: "border-t-success",
  cancelado: "border-t-muted-foreground",
};

const slaDot = (s: "ok" | "warn" | "danger") =>
  s === "danger" ? "bg-destructive" : s === "warn" ? "bg-warning" : "bg-success";

interface Props {
  pendencies: Pendency[];
  onSelect: (id: string) => void;
}

export default function PendencyKanban({ pendencies, onSelect }: Props) {
  const update = useUpdatePendency();
  const { toast } = useToast();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<PendencyStatus | null>(null);

  const grouped = PENDENCY_STATUS_ORDER.reduce((acc, s) => {
    acc[s] = pendencies.filter((p) => p.status === s);
    return acc;
  }, {} as Record<PendencyStatus, Pendency[]>);

  const handleDrop = async (target: PendencyStatus) => {
    const id = draggingId;
    setDraggingId(null);
    setOverCol(null);
    if (!id) return;
    const p = pendencies.find((x) => x.id === id);
    if (!p || p.status === target) return;
    try {
      await update.mutateAsync({ id, status: target } as any);
      toast({
        title: "Estado atualizado",
        description: `${PENDENCY_STATUS_LABELS[p.status]} → ${PENDENCY_STATUS_LABELS[target]}`,
      });
    } catch {/* toast handled in hook */}
  };

  return (
    <div className="overflow-x-auto -mx-2 px-2 pb-2">
      <div className="flex gap-3 min-w-max">
        {PENDENCY_STATUS_ORDER.map((col) => {
          const items = grouped[col];
          const isOver = overCol === col;
          return (
            <div
              key={col}
              className={cn(
                "w-72 flex-shrink-0 rounded-lg bg-muted/30 border-2 border-t-4 transition-colors",
                COLUMN_ACCENT[col],
                isOver ? "border-primary bg-primary/5" : "border-transparent border-t-current",
              )}
              onDragOver={(e) => { e.preventDefault(); setOverCol(col); }}
              onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
              onDrop={(e) => { e.preventDefault(); handleDrop(col); }}
            >
              <div className="px-3 py-2 flex items-center justify-between sticky top-0">
                <div className="text-sm font-semibold">{PENDENCY_STATUS_LABELS[col]}</div>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>
              <div className="px-2 pb-2 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                {items.length === 0 && (
                  <div className="text-xs text-muted-foreground italic px-2 py-6 text-center">
                    Largar cartão aqui
                  </div>
                )}
                {items.map((p) => {
                  const sla = pendencySLA(p);
                  return (
                    <Card
                      key={p.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggingId(p.id);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", p.id);
                      }}
                      onDragEnd={() => { setDraggingId(null); setOverCol(null); }}
                      onClick={() => onSelect(p.id)}
                      className={cn(
                        "cursor-grab active:cursor-grabbing hover:shadow-md transition group",
                        draggingId === p.id && "opacity-40",
                      )}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                          <div className="font-medium text-sm leading-snug line-clamp-2 flex-1">{p.title}</div>
                          <span className={cn("h-2 w-2 rounded-full mt-1 shrink-0", slaDot(sla))} title={`SLA: ${sla}`} />
                        </div>
                        <div className="text-[11px] text-muted-foreground space-y-0.5 pl-6">
                          {p.buildings && (
                            <div className="flex items-center gap-1 truncate">
                              <Building2 className="h-3 w-3 shrink-0" />
                              <span className="truncate">{p.buildings.code} - {p.buildings.name}</span>
                            </div>
                          )}
                          {p.suppliers && (
                            <div className="flex items-center gap-1 truncate">
                              <User className="h-3 w-3 shrink-0" /><span className="truncate">{p.suppliers.name}</span>
                            </div>
                          )}
                          {p.assistances && (
                            <div className="flex items-center gap-1">
                              <Wrench className="h-3 w-3 shrink-0" />#{p.assistances.assistance_number}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            {format(new Date(p.last_activity_at), "dd/MM HH:mm", { locale: pt })}
                          </div>
                        </div>
                        <div className="pl-6">
                          <PriorityBadge priority={p.priority} />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
