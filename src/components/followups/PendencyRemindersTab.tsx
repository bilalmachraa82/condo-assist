import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  sent: "Enviado",
  failed: "Falhado",
  cancelled: "Cancelado",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  sent: "bg-green-500/10 text-green-600 border-green-500/20",
  failed: "bg-red-500/10 text-red-600 border-red-500/20",
  cancelled: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

const statusIcons: Record<string, JSX.Element> = {
  pending: <Clock className="h-4 w-4" />,
  sent: <CheckCircle className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
  cancelled: <Pause className="h-4 w-4" />,
};

export default function PendencyRemindersTab() {
  const [status, setStatus] = useState<string>("");
  const [type, setType] = useState<string>("");

  const { data: stats } = usePendencyRemindersStats();
  const { data: reminders, isLoading } = useAllPendencyReminders({
    status: status || undefined,
    reminder_type: type || undefined,
  });
  const triggerCron = useTriggerPendencyReminders();
  const cancelReminder = useCancelPendencyReminder();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Lembretes de Pendências Email
          </h3>
          <p className="text-sm text-muted-foreground">
            SLA automático e lembretes manuais agendados para pendências do condomínio.
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.pending ?? 0}</div>
            <p className="text-xs text-muted-foreground">{stats?.overdue ?? 0} vencidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devidos agora</CardTitle>
            <Bell className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.due_now ?? 0}</div>
            <p className="text-xs text-muted-foreground">A enviar no próximo cron</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.sent ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Falhados</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.failed ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Lembretes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={type || "all"} onValueChange={(v) => setType(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="manual">🔔 Manual</SelectItem>
                  <SelectItem value="sla_auto">⏱ SLA automático</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">A carregar lembretes...</p>
                </div>
              ) : !reminders || reminders.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">Sem lembretes para os filtros selecionados</p>
                </div>
              ) : (
                reminders.map((r) => (
                  <ReminderCard
                    key={r.id}
                    reminder={r}
                    onCancel={() => cancelReminder.mutate({ id: r.id, pendencyId: r.pendency_id })}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function ReminderCard({
  reminder,
  onCancel,
}: {
  reminder: PendencyReminderWithDetails;
  onCancel: () => void;
}) {
  const isOverdue =
    reminder.status === "pending" && new Date(reminder.scheduled_for) < new Date();
  const isManual = reminder.reminder_type === "manual";
  const p = reminder.email_pendencies;
  const building = p?.buildings;
  const buildingLabel = building
    ? `${building.code ? `${building.code} - ` : ""}${building.name}`
    : "Sem edifício";

  return (
    <div
      className={`border rounded-lg p-4 transition-colors ${
        isOverdue ? "border-red-200 bg-red-50/30" : "hover:bg-muted/30"
      }`}
    >
      <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={statusColors[reminder.status]}>
            {statusIcons[reminder.status]}
            <span className="ml-1">{statusLabels[reminder.status]}</span>
          </Badge>
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
          {isOverdue && (
            <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Em atraso
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {p && (
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link to={`/pendencias-email?pendency=${reminder.pendency_id}`}>
                <ExternalLink className="h-3 w-3" />
                Abrir pendência
              </Link>
            </Button>
          )}
          {reminder.status === "pending" && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              <Pause className="h-3 w-3 mr-1" />
              Cancelar
            </Button>
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
        <div className="text-xs text-muted-foreground">
          Tentativa {reminder.attempt_count + 1} de {reminder.max_attempts}
        </div>
      </div>
    </div>
  );
}
