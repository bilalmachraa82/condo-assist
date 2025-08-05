import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
  Users,
  Activity,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  useNotifications, 
  useNotificationStats, 
  useProcessNotifications,
  useEscalatedAssistances 
} from "@/hooks/useNotifications";

export default function NotificationsDashboard() {
  const { data: notifications = [], isLoading } = useNotifications();
  const { data: stats } = useNotificationStats();
  const { data: escalatedAssistances = [] } = useEscalatedAssistances();
  const processNotifications = useProcessNotifications();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'sent': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-yellow-600">Pendente</Badge>;
      case 'sent': return <Badge variant="outline" className="text-green-600">Enviado</Badge>;
      case 'failed': return <Badge variant="destructive">Falhou</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return <Badge variant="destructive">CRÍTICA</Badge>;
      case 'urgent': return <Badge className="bg-orange-100 text-orange-800">URGENTE</Badge>;
      case 'normal': return <Badge variant="outline">NORMAL</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getNotificationTypeText = (type: string) => {
    switch (type) {
      case 'reminder': return 'Lembrete';
      case 'escalation': return 'Escalação';
      case 'info': return 'Informação';
      case 'urgent_alert': return 'Alerta Urgente';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-8 bg-muted rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{stats?.pending || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Enviados</p>
                <p className="text-2xl font-bold">{stats?.sent || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Escalações</p>
                <p className="text-2xl font-bold">{escalatedAssistances.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Distribuição por Prioridade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Críticas</span>
                <Badge variant="destructive">{stats?.byPriority.critical || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Urgentes</span>
                <Badge className="bg-orange-100 text-orange-800">{stats?.byPriority.urgent || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Normais</span>
                <Badge variant="outline">{stats?.byPriority.normal || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Tipos de Notificação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Lembretes</span>
                <Badge variant="outline">{stats?.byType.reminder || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Escalações</span>
                <Badge variant="destructive">{stats?.byType.escalation || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Ações</span>
            <Button 
              onClick={() => processNotifications.mutate()}
              disabled={processNotifications.isPending}
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${processNotifications.isPending ? 'animate-spin' : ''}`} />
              {processNotifications.isPending ? 'Processando...' : 'Processar Notificações'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Processe manualmente todas as notificações pendentes ou aguarde o processamento automático de hora em hora.
          </p>
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.slice(0, 20).map((notification) => (
                  <div key={notification.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                    {getStatusIcon(notification.status)}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          {getNotificationTypeText(notification.notification_type)}
                          {notification.reminder_count > 0 && ` (${notification.reminder_count}º)`}
                        </p>
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(notification.priority)}
                          {getStatusBadge(notification.status)}
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <p><strong>Assistência:</strong> {notification.assistances?.title}</p>
                        <p><strong>Fornecedor:</strong> {notification.suppliers?.name}</p>
                        <p><strong>Agendado para:</strong> {format(new Date(notification.scheduled_for), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                        {notification.sent_at && (
                          <p><strong>Enviado em:</strong> {format(new Date(notification.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Ainda não há notificações</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Escalated Assistances */}
      {escalatedAssistances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Assistências Escaladas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {escalatedAssistances.map((assistance) => (
                  <div key={assistance.id} className="p-4 border border-red-200 rounded-lg bg-red-50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{assistance.title}</h4>
                      <Badge variant="destructive">ESCALADA</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><strong>Edifício:</strong> {assistance.buildings?.name}</p>
                      <p><strong>Fornecedor:</strong> {assistance.suppliers?.name}</p>
                      <p><strong>Escalada em:</strong> {format(new Date(assistance.escalated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}