import { useMemo, useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  usePendencies, PENDENCY_STATUS_LABELS, PENDENCY_STATUS_ORDER, pendencySLA,
  type Pendency, type PendencyStatus,
} from "@/hooks/usePendencies";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/components/ui/status-badges";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, MailQuestion, Building2, Wrench, User, Clock, FileText, LayoutList, Columns3 } from "lucide-react";
import CreatePendencyDialog from "@/components/pendencies/CreatePendencyDialog";
import PendencyDetail from "@/components/pendencies/PendencyDetail";
import PendencyKanban from "@/components/pendencies/PendencyKanban";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const slaColor = (s: "ok" | "warn" | "danger") =>
  s === "danger" ? "bg-destructive/15 text-destructive border-destructive/30"
    : s === "warn" ? "bg-warning/15 text-warning border-warning/30"
    : "bg-success/15 text-success border-success/30";

const statusColor = (s: PendencyStatus) => {
  switch (s) {
    case "aberto": return "bg-primary/15 text-primary border-primary/30";
    case "aguarda_resposta": return "bg-warning/15 text-warning border-warning/30";
    case "resposta_recebida": return "bg-accent/20 text-accent-foreground border-accent/30";
    case "precisa_decisao": return "bg-warning/15 text-warning border-warning/30";
    case "escalado": return "bg-destructive/15 text-destructive border-destructive/30";
    case "resolvido": return "bg-success/15 text-success border-success/30";
    case "cancelado": return "bg-muted text-muted-foreground border-border";
  }
};

export default function EmailPendencies() {
  const { data: pendencies = [], isLoading } = usePendencies();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [initialFile, setInitialFile] = useState<File | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "kanban">(() =>
    (localStorage.getItem("pendencies-view") as "list" | "kanban") || "list"
  );
  useEffect(() => { localStorage.setItem("pendencies-view", view); }, [view]);

  // Global drag-to-create
  const [isDragging, setIsDragging] = useState(false);
  useEffect(() => {
    let counter = 0;
    const onEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) { counter++; setIsDragging(true); }
    };
    const onLeave = () => { counter = Math.max(0, counter - 1); if (counter === 0) setIsDragging(false); };
    const onDrop = (e: DragEvent) => {
      counter = 0; setIsDragging(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) { e.preventDefault(); setInitialFile(f); setCreateOpen(true); }
    };
    const onOver = (e: DragEvent) => { if (e.dataTransfer?.types?.includes("Files")) e.preventDefault(); };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  const filtered = useMemo(() => {
    return pendencies.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = [p.title, p.description, p.subject, p.buildings?.code, p.buildings?.name, p.suppliers?.name]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [pendencies, search, status]);

  const stats = useMemo(() => {
    const open = pendencies.filter((p) => !["resolvido", "cancelado"].includes(p.status)).length;
    const waiting = pendencies.filter((p) => p.status === "aguarda_resposta").length;
    const escalated = pendencies.filter((p) => p.status === "escalado").length;
    const slaBad = pendencies.filter((p) => pendencySLA(p) === "danger").length;
    return { open, waiting, escalated, slaBad };
  }, [pendencies]);

  return (
    <div className="space-y-6">
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-primary/10 backdrop-blur-sm border-4 border-dashed border-primary pointer-events-none flex items-center justify-center">
          <div className="bg-card rounded-lg shadow-lg px-6 py-4 flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <span className="font-medium">Largar PDF para criar pendência</span>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MailQuestion className="h-6 w-6 text-primary" /> Pendências Email
          </h1>
          <p className="text-sm text-muted-foreground">Casos pendentes do condomínio com email anexado.</p>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as any)} size="sm">
            <ToggleGroupItem value="list" aria-label="Lista"><LayoutList className="h-4 w-4" /></ToggleGroupItem>
            <ToggleGroupItem value="kanban" aria-label="Kanban"><Columns3 className="h-4 w-4" /></ToggleGroupItem>
          </ToggleGroup>
          <Button onClick={() => { setInitialFile(null); setCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nova pendência
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Abertas" value={stats.open} />
        <KPI label="Aguarda resposta" value={stats.waiting} tone="warn" />
        <KPI label="Escaladas" value={stats.escalated} tone="danger" />
        <KPI label="SLA vencido" value={stats.slaBad} tone="danger" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Procurar título, edifício, fornecedor…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {view === "list" && (
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              {PENDENCY_STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>{PENDENCY_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}

      {!isLoading && view === "kanban" && (
        <PendencyKanban pendencies={filtered} onSelect={setSelectedId} />
      )}

      {/* List */}
      {view === "list" && <div className="space-y-2">
        {!isLoading && filtered.length === 0 && (
          <Card><CardContent className="py-10 text-center text-muted-foreground">
            <MailQuestion className="h-8 w-8 mx-auto mb-2 opacity-60" />
            Sem pendências. Arrasta um PDF para esta página ou clica em "Nova pendência".
          </CardContent></Card>
        )}
        {filtered.map((p) => {
          const sla = pendencySLA(p);
          return (
            <Card key={p.id} className="cursor-pointer hover:shadow-md transition" onClick={() => setSelectedId(p.id)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{p.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {p.buildings && (
                        <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{p.buildings.code} - {p.buildings.name}</span>
                      )}
                      {p.suppliers && (
                        <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{p.suppliers.name}</span>
                      )}
                      {p.assistances && (
                        <span className="inline-flex items-center gap-1"><Wrench className="h-3 w-3" />#{p.assistances.assistance_number}</span>
                      )}
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(p.last_activity_at), "dd/MM HH:mm", { locale: pt })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={statusColor(p.status)}>{PENDENCY_STATUS_LABELS[p.status]}</Badge>
                    <PriorityBadge priority={p.priority} />
                    <Badge variant="outline" className={slaColor(sla)}>
                      {sla === "danger" ? "SLA!" : sla === "warn" ? "Risco" : "OK"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CreatePendencyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialFile={initialFile}
        onCreated={(id) => setSelectedId(id)}
      />
      <PendencyDetail
        pendencyId={selectedId}
        open={!!selectedId}
        onOpenChange={(o) => !o && setSelectedId(null)}
      />
    </div>
  );
}

function KPI({ label, value, tone }: { label: string; value: number; tone?: "warn" | "danger" }) {
  const color = tone === "danger" ? "text-destructive" : tone === "warn" ? "text-warning" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
