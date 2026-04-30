import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  Send,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Bell,
  Play,
  Pause,
  RotateCcw,
  Forward,
  Mail,
  MoreHorizontal,
  Search,
  ExternalLink,
  RefreshCw,
  Settings,
} from "lucide-react";
import {
  useFollowUpSchedules,
  useFollowUpStats,
  useProcessFollowUps,
  useCancelFollowUp,
  useRescheduleFollowUp,
  useTriggerManualReminders,
  type FollowUpWithDetails,
} from "@/hooks/useFollowUpSchedules";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ForwardToSupplierDialog from "./ForwardToSupplierDialog";
import PendencyRemindersTab from "./PendencyRemindersTab";
import FollowUpStatsCards from "./FollowUpStatsCards";
import FollowUpEmptyState from "./FollowUpEmptyState";
import FollowUpCardSkeleton from "./FollowUpCardSkeleton";
import { usePendencyRemindersStats } from "@/hooks/usePendencyReminders";
import { cn } from "@/lib/utils";

const followUpTypeLabels: Record<string, string> = {
  quotation_reminder: "Orçamento",
  date_confirmation: "Confirmação de data",
  work_reminder: "Trabalho",
  completion_reminder: "Conclusão",
  manual_reminder: "Manual",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  sent: "Enviado",
  failed: "Falhado",
  cancelled: "Cancelado",
  processing: "Processando",
};

const statusIcons: Record<string, JSX.Element> = {
  pending: <Clock className="h-3.5 w-3.5" />,
  sent: <CheckCircle className="h-3.5 w-3.5" />,
  failed: <XCircle className="h-3.5 w-3.5" />,
  cancelled: <Pause className="h-3.5 w-3.5" />,
  processing: <Send className="h-3.5 w-3.5" />,
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  sent: "bg-green-500/10 text-green-700 border-green-500/20",
  failed: "bg-red-500/10 text-red-700 border-red-500/20",
  cancelled: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  processing: "bg-blue-500/10 text-blue-700 border-blue-500/20",
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-500/10 text-red-700 border-red-500/20",
  urgent: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  normal: "bg-blue-500/10 text-blue-700 border-blue-500/20",
};

type SortKey = "urgency" | "oldest" | "recent";

export default function FollowUpDashboard() {
  const [activeOrigin, setActiveOrigin] = useState<string>("assistances");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("urgency");
  const [forwardTarget, setForwardTarget] = useState<FollowUpWithDetails | null>(null);
  const [rescheduleData, setRescheduleData] = useState<{
    followUpId: string;
    currentDate: string;
    newDate: string;
  } | null>(null);
  const [confirmForceAll, setConfirmForceAll] = useState(false);

  const { data: stats, isLoading: statsLoading } = useFollowUpStats();
  const { data: pendencyStats } = usePendencyRemindersStats();
  const { data: followUps, isLoading: followUpsLoading } = useFollowUpSchedules({
    status: selectedStatus || undefined,
    follow_up_type: selectedType || undefined,
  });

  const processFollowUps = useProcessFollowUps();
  const cancelFollowUp = useCancelFollowUp();
  const rescheduleFollowUp = useRescheduleFollowUp();
  const triggerManualReminders = useTriggerManualReminders();

  const handleReschedule = async () => {
    if (rescheduleData) {
      await rescheduleFollowUp.mutateAsync({
        followUpId: rescheduleData.followUpId,
        newDate: rescheduleData.newDate,
      });
      setRescheduleData(null);
    }
  };

  const handleRetry = (followUp: FollowUpWithDetails) => {
    rescheduleFollowUp.mutate({
      followUpId: followUp.id,
      newDate: new Date().toISOString(),
    });
  };

  const filteredFollowUps = useMemo(() => {
    if (!followUps) return [];
    const q = search.trim().toLowerCase();
    let list = followUps.filter((f) => {
      if (!q) return true;
      const num = f.assistances?.assistance_number?.toString() ?? "";
      const title = f.assistances?.title?.toLowerCase() ?? "";
      const supplier = f.suppliers?.name?.toLowerCase() ?? "";
      const building = `${f.assistances?.buildings?.code ?? ""} ${
        f.assistances?.buildings?.name ?? ""
      }`.toLowerCase();
      return (
        num.includes(q) ||
        title.includes(q) ||
        supplier.includes(q) ||
        building.includes(q)
      );
    });

    const priorityRank: Record<string, number> = { critical: 0, urgent: 1, normal: 2 };
    list = [...list].sort((a, b) => {
      if (sortBy === "urgency") {
        const pa = priorityRank[a.priority] ?? 9;
        const pb = priorityRank[b.priority] ?? 9;
        if (pa !== pb) return pa - pb;
        return new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime();
      }
      return new Date(b.scheduled_for).getTime() - new Date(a.scheduled_for).getTime();
    });
    return list;
  }, [followUps, search, sortBy]);

  const hasFilters = !!(selectedStatus || selectedType || search.trim());
  const clearFilters = () => {
    setSelectedStatus("");
    setSelectedType("");
    setSearch("");
  };

  return (
    <TooltipProvider delayDuration={250}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Follow-ups e Lembretes</h1>
            <p className="text-muted-foreground text-sm">
              Centro de controlo de comunicações pendentes para fornecedores e condomínios.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/follow-ups/configuracao">
              <Settings className="h-4 w-4" />
              Configurar tempos
            </Link>
          </Button>
        </div>

        <Tabs value={activeOrigin} onValueChange={setActiveOrigin} className="space-y-6">
          <TabsList className="grid w-full max-w-xl grid-cols-2">
            <TabsTrigger value="assistances" className="gap-2">
              <Bell className="h-4 w-4" />
              Assistências
              {(stats?.due_now ?? 0) > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {stats?.due_now}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pendencies" className="gap-2">
              <Mail className="h-4 w-4" />
              Pendências email
              {(pendencyStats?.due_now ?? 0) > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {pendencyStats?.due_now}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assistances" className="space-y-6">
            {/* Header de ações */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-semibold">Follow-ups de assistências</h2>
                <p className="text-sm text-muted-foreground">
                  Lembretes automáticos enviados aos fornecedores conforme o ciclo da assistência.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => processFollowUps.mutate({ mode: "due" })}
                  disabled={processFollowUps.isPending}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  {processFollowUps.isPending ? "A processar..." : "Processar agora"}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Mais ações">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuLabel>Ações avançadas</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => triggerManualReminders.mutate()}
                      disabled={triggerManualReminders.isPending}
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Disparar lembretes manuais
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setConfirmForceAll(true)}
                      className="text-red-600 focus:text-red-700"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Forçar envio de todos
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Stat cards interactivos */}
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
                activeStatus={selectedStatus || ""}
                onSelectStatus={(s) =>
                  setSelectedStatus((prev) => (prev === s ? "" : s))
                }
              />
            )}

            {/* Chips de tipo */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground mr-1">Tipo:</span>
              <TypeChip
                label="Todos"
                count={stats?.total ?? 0}
                active={!selectedType}
                onClick={() => setSelectedType("")}
              />
              {Object.entries(stats?.byType ?? {}).map(([key, count]) => (
                <TypeChip
                  key={key}
                  label={followUpTypeLabels[key] ?? key}
                  count={count}
                  active={selectedType === key}
                  onClick={() =>
                    setSelectedType((prev) => (prev === key ? "" : key))
                  }
                />
              ))}
            </div>

            {/* Lista + filtros */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Follow-ups
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar por nº, edifício ou fornecedor..."
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

                <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="">Todos</TabsTrigger>
                    <TabsTrigger value="pending">Pendentes</TabsTrigger>
                    <TabsTrigger value="sent">Enviados</TabsTrigger>
                    <TabsTrigger value="failed">Falhados</TabsTrigger>
                    <TabsTrigger value="cancelled">Cancelados</TabsTrigger>
                  </TabsList>

                  <TabsContent value={selectedStatus} className="space-y-3 mt-6">
                    {followUpsLoading ? (
                      <FollowUpCardSkeleton />
                    ) : filteredFollowUps.length === 0 ? (
                      <FollowUpEmptyState
                        hasFilters={hasFilters}
                        onClearFilters={clearFilters}
                      />
                    ) : (
                      filteredFollowUps.map((followUp) => (
                        <FollowUpCard
                          key={followUp.id}
                          followUp={followUp}
                          onCancel={() => cancelFollowUp.mutate(followUp.id)}
                          onForward={() => setForwardTarget(followUp)}
                          onRetry={() => handleRetry(followUp)}
                          onReschedule={() =>
                            setRescheduleData({
                              followUpId: followUp.id,
                              currentDate: followUp.scheduled_for,
                              newDate: followUp.scheduled_for,
                            })
                          }
                        />
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <ForwardToSupplierDialog
              open={!!forwardTarget}
              onOpenChange={(o) => !o && setForwardTarget(null)}
              followUp={forwardTarget}
            />

            {/* Reagendar */}
            <Dialog open={!!rescheduleData} onOpenChange={() => setRescheduleData(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reagendar follow-up</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="current-date">Data atual</Label>
                    <Input
                      id="current-date"
                      type="datetime-local"
                      value={
                        rescheduleData?.currentDate
                          ? format(new Date(rescheduleData.currentDate), "yyyy-MM-dd'T'HH:mm")
                          : ""
                      }
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-date">Nova data</Label>
                    <Input
                      id="new-date"
                      type="datetime-local"
                      value={
                        rescheduleData?.newDate
                          ? format(new Date(rescheduleData.newDate), "yyyy-MM-dd'T'HH:mm")
                          : ""
                      }
                      onChange={(e) =>
                        setRescheduleData((prev) =>
                          prev
                            ? { ...prev, newDate: new Date(e.target.value).toISOString() }
                            : null
                        )
                      }
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setRescheduleData(null)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleReschedule}
                      disabled={rescheduleFollowUp.isPending}
                    >
                      {rescheduleFollowUp.isPending ? "A reagendar..." : "Reagendar"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Confirmação forçar todos */}
            <AlertDialog open={confirmForceAll} onOpenChange={setConfirmForceAll}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Forçar envio de todos os follow-ups?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação ignora a data de agendamento e envia <b>todos</b> os
                    follow-ups pendentes imediatamente. Use apenas se souber que o cron
                    falhou ou em situação excepcional.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      processFollowUps.mutate({ mode: "all" });
                      setConfirmForceAll(false);
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Sim, enviar agora
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          <TabsContent value="pendencies" className="space-y-6">
            <PendencyRemindersTab />
          </TabsContent>
        </Tabs>
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

interface FollowUpCardProps {
  followUp: FollowUpWithDetails;
  onCancel: () => void;
  onReschedule: () => void;
  onForward: () => void;
  onRetry: () => void;
}

function FollowUpCard({
  followUp,
  onCancel,
  onReschedule,
  onForward,
  onRetry,
}: FollowUpCardProps) {
  const isPending = followUp.status === "pending";
  const isFailed = followUp.status === "failed";
  const isOverdue = isPending && new Date(followUp.scheduled_for) < new Date();
  const isManual = followUp.follow_up_type === "manual_reminder";
  const note = (followUp.metadata as any)?.note as string | undefined;
  const building = followUp.assistances?.buildings;
  const buildingLabel = building
    ? `${building.code ? `${building.code} - ` : ""}${building.name}`
    : "Sem edifício";
  const assistanceId = followUp.assistances?.id ?? followUp.assistance_id;

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
          {/* Único badge de status: "Em atraso" tem prioridade */}
          {isOverdue ? (
            <Badge className="bg-red-500/10 text-red-700 border-red-500/20">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Em atraso
            </Badge>
          ) : (
            <Badge className={statusColors[followUp.status]}>
              {statusIcons[followUp.status]}
              <span className="ml-1">{statusLabels[followUp.status]}</span>
            </Badge>
          )}
          <Badge
            variant="outline"
            className={isManual ? "border-amber-300 bg-amber-50 text-amber-800" : ""}
          >
            {isManual && "🔔 "}
            {followUpTypeLabels[followUp.follow_up_type] ?? followUp.follow_up_type}
          </Badge>
          <Badge className={priorityColors[followUp.priority]}>
            {followUp.priority === "critical"
              ? "Crítica"
              : followUp.priority === "urgent"
              ? "Urgente"
              : "Normal"}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          {assistanceId && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="ghost" size="sm" className="h-8">
                  <Link to={`/assistencias/${assistanceId}`}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Abrir
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Abrir assistência</TooltipContent>
            </Tooltip>
          )}
          {isManual && isPending && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="default" size="sm" onClick={onForward} className="h-8 gap-1">
                  <Forward className="h-3.5 w-3.5" />
                  Encaminhar
                </Button>
              </TooltipTrigger>
              <TooltipContent>Encaminhar a fornecedor agora</TooltipContent>
            </Tooltip>
          )}
          {isFailed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={onRetry} className="h-8">
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Tentar de novo
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reagendar para agora</TooltipContent>
            </Tooltip>
          )}
          {isPending && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onReschedule} className="h-8 w-8">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reagendar</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8">
                    <Pause className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Cancelar</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">
          {followUp.assistances?.assistance_number
            ? `#${followUp.assistances.assistance_number} `
            : ""}
          {followUp.assistances?.title}
        </h4>
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          {followUp.suppliers?.name ? (
            <>
              <span>{followUp.suppliers.name}</span>
              <span>•</span>
            </>
          ) : isManual ? (
            <>
              <span className="italic">Lembrete interno (geral@luvimg.com)</span>
              <span>•</span>
            </>
          ) : null}
          <span>{buildingLabel}</span>
          <span>•</span>
          <span>
            {followUp.sent_at
              ? `Enviado: ${format(new Date(followUp.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}`
              : `Agendado: ${format(new Date(followUp.scheduled_for), "dd/MM/yyyy HH:mm", { locale: ptBR })}`}
          </span>
        </div>
        {isManual && note && (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span className="font-medium">Nota: </span>
            {note}
          </div>
        )}
        {(isPending || isFailed) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Tentativa {followUp.attempt_count + 1} de {followUp.max_attempts}
            </span>
            {followUp.next_attempt_at && isFailed && (
              <>
                <span>•</span>
                <span>
                  Próxima:{" "}
                  {format(new Date(followUp.next_attempt_at), "dd/MM/yyyy HH:mm", {
                    locale: ptBR,
                  })}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
