
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Clock, 
  Send, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Calendar,
  Bell,
  TrendingUp,
  Play,
  Pause,
  RotateCcw,
  Info
} from "lucide-react";
import { 
  useFollowUpSchedules, 
  useFollowUpStats, 
  useProcessFollowUps,
  useCancelFollowUp,
  useRescheduleFollowUp,
  type FollowUpWithDetails 
} from "@/hooks/useFollowUpSchedules";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const followUpTypeLabels = {
  quotation_reminder: "Lembrete de Orçamento",
  date_confirmation: "Confirmação de Data",
  work_reminder: "Lembrete de Trabalho",
  completion_reminder: "Lembrete de Conclusão",
};

const statusLabels = {
  pending: "Pendente",
  sent: "Enviado",
  failed: "Falhado",
  cancelled: "Cancelado",
  processing: "Processando",
};

const statusIcons = {
  pending: <Clock className="h-4 w-4" />,
  sent: <CheckCircle className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
  cancelled: <Pause className="h-4 w-4" />,
  processing: <Send className="h-4 w-4" />,
};

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  sent: "bg-green-500/10 text-green-600 border-green-500/20",
  failed: "bg-red-500/10 text-red-600 border-red-500/20",
  cancelled: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  processing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

const priorityColors = {
  critical: "bg-red-500/10 text-red-600 border-red-500/20",
  urgent: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  normal: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

export default function FollowUpDashboard() {
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [rescheduleData, setRescheduleData] = useState<{
    followUpId: string;
    currentDate: string;
    newDate: string;
  } | null>(null);

  const { data: stats, isLoading: statsLoading } = useFollowUpStats();
  const { data: followUps, isLoading: followUpsLoading } = useFollowUpSchedules({
    status: selectedStatus || undefined,
    follow_up_type: selectedType || undefined,
  });

  const processFollowUps = useProcessFollowUps();
  const cancelFollowUp = useCancelFollowUp();
  const rescheduleFollowUp = useRescheduleFollowUp();

  const handleReschedule = async () => {
    if (rescheduleData) {
      await rescheduleFollowUp.mutateAsync({
        followUpId: rescheduleData.followUpId,
        newDate: rescheduleData.newDate,
      });
      setRescheduleData(null);
    }
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">A carregar dashboard de follow-ups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com botões de processar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard de Follow-ups</h2>
          <p className="text-muted-foreground">
            Monitore e gerencie todos os lembretes automáticos
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => processFollowUps.mutate({ mode: 'due' })}
            disabled={processFollowUps.isPending}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            {processFollowUps.isPending ? "Processando..." : "Processar Devidos"}
          </Button>
          <Button 
            onClick={() => processFollowUps.mutate({ mode: 'all' })}
            disabled={processFollowUps.isPending}
            variant="outline"
            className="gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            Processar Todos Agora
          </Button>
        </div>
      </div>

      {/* Alert informativo quando não há follow-ups para processar */}
      {stats && stats.pending > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Existem {stats.pending} follow-ups pendentes. O botão "Processar Devidos" envia apenas os que chegaram à hora agendada. 
            Use "Processar Todos Agora" para enviar todos independentemente do horário agendado.
          </AlertDescription>
        </Alert>
      )}

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Follow-ups</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.overdue || 0} em atraso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">
              Aguardam processamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.sent || 0}</div>
            <p className="text-xs text-muted-foreground">
              Emails enviados com sucesso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Falhados</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.failed || 0}</div>
            <p className="text-xs text-muted-foreground">
              Requerem atenção
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas por tipo e prioridade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Por Tipo de Follow-up
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats?.byType || {}).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm">{followUpTypeLabels[type as keyof typeof followUpTypeLabels]}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Por Prioridade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats?.byPriority || {}).map(([priority, count]) => (
                <div key={priority} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{priority === 'critical' ? 'Crítica' : priority === 'urgent' ? 'Urgente' : 'Normal'}</span>
                  <Badge className={priorityColors[priority as keyof typeof priorityColors]}>
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de follow-ups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Follow-ups Agendados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="">Todos</TabsTrigger>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="sent">Enviados</TabsTrigger>
              <TabsTrigger value="failed">Falhados</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelados</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedStatus} className="space-y-4 mt-6">
              {followUpsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">A carregar follow-ups...</p>
                </div>
              ) : !followUps || followUps.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhum follow-up encontrado</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {followUps.map((followUp) => (
                    <FollowUpCard 
                      key={followUp.id} 
                      followUp={followUp}
                      onCancel={() => cancelFollowUp.mutate(followUp.id)}
                      onReschedule={() => setRescheduleData({
                        followUpId: followUp.id,
                        currentDate: followUp.scheduled_for,
                        newDate: followUp.scheduled_for,
                      })}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog para reagendar */}
      <Dialog open={!!rescheduleData} onOpenChange={() => setRescheduleData(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reagendar Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="current-date">Data Atual</Label>
              <Input
                id="current-date"
                type="datetime-local"
                value={rescheduleData?.currentDate ? format(new Date(rescheduleData.currentDate), "yyyy-MM-dd'T'HH:mm") : ""}
                disabled
              />
            </div>
            <div>
              <Label htmlFor="new-date">Nova Data</Label>
              <Input
                id="new-date"
                type="datetime-local"
                value={rescheduleData?.newDate ? format(new Date(rescheduleData.newDate), "yyyy-MM-dd'T'HH:mm") : ""}
                onChange={(e) => setRescheduleData(prev => 
                  prev ? { ...prev, newDate: new Date(e.target.value).toISOString() } : null
                )}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRescheduleData(null)}>
                Cancelar
              </Button>
              <Button onClick={handleReschedule} disabled={rescheduleFollowUp.isPending}>
                {rescheduleFollowUp.isPending ? "Reagendando..." : "Reagendar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface FollowUpCardProps {
  followUp: FollowUpWithDetails;
  onCancel: () => void;
  onReschedule: () => void;
}

function FollowUpCard({ followUp, onCancel, onReschedule }: FollowUpCardProps) {
  const isOverdue = followUp.status === 'pending' && new Date(followUp.scheduled_for) < new Date();
  
  return (
    <div className={`border rounded-lg p-4 ${isOverdue ? 'border-red-200 bg-red-50/30' : 'hover:bg-muted/30'} transition-colors`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Badge className={statusColors[followUp.status as keyof typeof statusColors]}>
            {statusIcons[followUp.status as keyof typeof statusIcons]}
            <span className="ml-1">{statusLabels[followUp.status as keyof typeof statusLabels]}</span>
          </Badge>
          <Badge variant="outline">
            {followUpTypeLabels[followUp.follow_up_type as keyof typeof followUpTypeLabels]}
          </Badge>
          <Badge className={priorityColors[followUp.priority as keyof typeof priorityColors]}>
            {followUp.priority === 'critical' ? 'Crítica' : followUp.priority === 'urgent' ? 'Urgente' : 'Normal'}
          </Badge>
          {isOverdue && (
            <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Em atraso
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {followUp.status === 'pending' && (
            <>
              <Button variant="outline" size="sm" onClick={onReschedule}>
                <RotateCcw className="h-3 w-3 mr-1" />
                Reagendar
              </Button>
              <Button variant="outline" size="sm" onClick={onCancel}>
                <Pause className="h-3 w-3 mr-1" />
                Cancelar
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">{followUp.assistances?.title}</h4>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{followUp.suppliers?.name}</span>
          <span>•</span>
          <span>{followUp.assistances?.buildings?.name}</span>
          <span>•</span>
          <span>
            {followUp.sent_at 
              ? `Enviado: ${format(new Date(followUp.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}`
              : `Agendado: ${format(new Date(followUp.scheduled_for), "dd/MM/yyyy HH:mm", { locale: ptBR })}`
            }
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Tentativa {followUp.attempt_count + 1} de {followUp.max_attempts}</span>
          {followUp.next_attempt_at && followUp.status === 'failed' && (
            <>
              <span>•</span>
              <span>Próxima: {format(new Date(followUp.next_attempt_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
