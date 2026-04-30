import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Bell,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  AlertTriangle,
  Calendar,
  ExternalLink,
  Play,
  Mail,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useAllPendencyReminders,
  usePendencyRemindersStats,
  useTriggerPendencyReminders,
  useCancelPendencyReminder,
  type PendencyReminderWithDetails,
} from "@/hooks/usePendencyReminders";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import FollowUpStatsCards from "./FollowUpStatsCards";
import FollowUpEmptyState from "./FollowUpEmptyState";
import FollowUpCardSkeleton from "./FollowUpCardSkeleton";
import { cn } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  sent: "Enviado",
  failed: "Falhado",
  cancelled: "Cancelado",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  sent: "bg-green-500/10 text-green-700 border-green-500/20",
  failed: "bg-red-500/10 text-red-700 border-red-500/20",
  cancelled: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

const statusIcons: Record<string, JSX.Element> = {
  pending: <Clock className="h-3.5 w-3.5" />,
  sent: <CheckCircle className="h-3.5 w-3.5" />,
  failed: <XCircle className="h-3.5 w-3.5" />,
  cancelled: <Pause className="h-3.5 w-3.5" />,
};

type SortKey = "urgency" | "oldest" | "recent";

export default function PendencyRemindersTab() {
  const [status, setStatus] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("urgency");

  const { data: stats, isLoading: statsLoading } = usePendencyRemindersStats();
  const { data: reminders, isLoading } = useAllPendencyReminders({
    status: status || undefined,
    reminder_type: type || undefined,
  });
  const triggerCron = useTriggerPendencyReminders();
  const cancelReminder = useCancelPendencyReminder();

  const filtered = useMemo(() => {
    if (!reminders) return [];
    const q = search.trim().toLowerCase();
    let list = reminders.filter((r) => {
      if (!q) return true;
      const p = r.email_pendencies;
      const num = p?.assistances?.assistance_number?.toString() ?? "";
      const title = p?.title?.toLowerCase() ?? "";
      const supplier = p?.suppliers?.name?.toLowerCase() ?? "";
      const building = `${p?.buildings?.code ?? ""} ${
        p?.buildings?.name ?? ""
      }`.toLowerCase();
      return (
        num.includes(q) ||
        title.includes(q) ||
        supplier.includes(q) ||
        building.includes(q)
      );
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime();
      }
      if (sortBy === "recent") {
        return new Date(b.scheduled_for).getTime() - new Date(a.scheduled_for).getTime();
      }
      // urgency: overdue/due first, then chronological
      const now = Date.now();
      const aOver = a.status === "pending" && new Date(a.scheduled_for).getTime() < now ? 0 : 1;
      const bOver = b.status === "pending" && new Date(b.scheduled_for).getTime() < now ? 0 : 1;
      if (aOver !== bOver) return aOver - bOver;
      return new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime();
    });
    return list;
  }, [reminders, search, sortBy]);

  const hasFilters = !!(status || type || search.trim());
  const clearFilters = () => {
    setStatus("");
    setType("");
    setSearch("");
  };

  return (
    <TooltipProvider delayDuration={250}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Lembretes de pendências email
            </h2>
            <p className="text-sm text-muted-foreground">
              SLA automático e lembretes manuais para pendências do condomínio.
            </p>
          </div>
          <Button
            onClick={() => triggerCron.mutate()}
            disabled={triggerCron.isPending}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            {triggerCron.isPending ? "A processar..." : "Processar agora"}
          </Button>
        </div>

        {statsLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <FollowUpStatsCards
            stats={stats}
            activeStatus={status || ""}
            onSelectStatus={(s) => setStatus((prev) => (prev === s ? "" : s))}
          />
        )}

        {/* Chips de tipo */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground mr-1">Tipo:</span>
          <TypeChip
            label="Todos"
            count={stats?.total ?? 0}
            active={!type}
            onClick={() => setType("")}
          />
          <TypeChip
            label="🔔 Manual"
            count={
              reminders?.filter((r) => r.reminder_type === "manual").length ?? 0
            }
            active={type === "manual"}
            onClick={() => setType((prev) => (prev === "manual" ? "" : "manual"))}
          />
          <TypeChip
            label="⏱ SLA automático"
            count={
              reminders?.filter((r) => r.reminder_type === "sla_auto").length ?? 0
            }
            active={type === "sla_auto"}
            onClick={() => setType((prev) => (prev === "sla_auto" ? "" : "sla_auto"))}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Lembretes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por título, edifício ou fornecedor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                <SelectTrigger className="sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgency">Mais urgentes primeiro</SelectItem>
                  <SelectItem value="oldest">Mais antigos primeiro</SelectItem>
                  <SelectItem value="recent">Mais recentes primeiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs value={status} onValueChange={setStatus}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="">Todos</TabsTrigger>
                <TabsTrigger value="pending">Pendentes</TabsTrigger>
                <TabsTrigger value="sent">Enviados</TabsTrigger>
                <TabsTrigger value="failed">Falhados</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelados</TabsTrigger>
              </TabsList>

              <TabsContent value={status} className="space-y-3 mt-6">
                {isLoading ? (
                  <FollowUpCardSkeleton />
                ) : filtered.length === 0 ? (
                  <FollowUpEmptyState
                    hasFilters={hasFilters}
                    onClearFilters={clearFilters}
                    emptyHint="Não há lembretes de pendências agendados."
                  />
                ) : (
                  filtered.map((r) => (
                    <ReminderCard
                      key={r.id}
                      reminder={r}
                      onCancel={() =>
                        cancelReminder.mutate({ id: r.id, pendencyId: r.pendency_id })
                      }
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function TypeChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background hover:bg-muted text-foreground border-border"
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 text-[10px] font-medium",
          active
            ? "bg-primary-foreground/20 text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function ReminderCard({
  reminder,
  onCancel,
}: {
  reminder: PendencyReminderWithDetails;
  onCancel: () => void;
}) {
  const isPending = reminder.status === "pending";
  const isOverdue = isPending && new Date(reminder.scheduled_for) < new Date();
  const isManual = reminder.reminder_type === "manual";
  const p = reminder.email_pendencies;
  const building = p?.buildings;
  const buildingLabel = building
    ? `${building.code ? `${building.code} - ` : ""}${building.name}`
    : "Sem edifício";

  return (
    <div
      className={cn(
        "border rounded-lg p-4 transition-all",
        isOverdue
          ? "border-red-300 bg-red-50/40"
          : "hover:bg-muted/30 hover:border-primary/30"
      )}
    >
      <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {isOverdue ? (
            <Badge className="bg-red-500/10 text-red-700 border-red-500/20">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Em atraso
            </Badge>
          ) : (
            <Badge className={statusColors[reminder.status]}>
              {statusIcons[reminder.status]}
              <span className="ml-1">{statusLabels[reminder.status]}</span>
            </Badge>
          )}
          <Badge
            variant="outline"
            className={
              isManual
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : "border-blue-300 bg-blue-50 text-blue-800"
            }
          >
            {isManual ? "🔔 Manual" : "⏱ SLA auto"}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {p && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="ghost" size="sm" className="h-8">
                  <Link to={`/pendencias-email?pendency=${reminder.pendency_id}`}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Abrir
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Abrir pendência</TooltipContent>
            </Tooltip>
          )}
          {isPending && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8">
                  <Pause className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Cancelar lembrete</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">
          {p?.title ?? "Pendência removida"}
          {p?.assistances?.assistance_number && (
            <span className="text-muted-foreground font-normal">
              {" "}
              · #{p.assistances.assistance_number}
            </span>
          )}
        </h4>
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          {p?.suppliers?.name && (
            <>
              <span>{p.suppliers.name}</span>
              <span>•</span>
            </>
          )}
          <span>{buildingLabel}</span>
          <span>•</span>
          <span>
            {reminder.sent_at
              ? `Enviado: ${format(new Date(reminder.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}`
              : `Agendado: ${format(new Date(reminder.scheduled_for), "dd/MM/yyyy HH:mm", { locale: ptBR })}`}
          </span>
        </div>
        {reminder.note && (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span className="font-medium">Nota: </span>
            {reminder.note}
          </div>
        )}
        {isPending && (
          <div className="text-xs text-muted-foreground">
            Tentativa {reminder.attempt_count + 1} de {reminder.max_attempts}
          </div>
        )}
      </div>
    </div>
  );
}
