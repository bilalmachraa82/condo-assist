import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Info, RefreshCw, Activity } from "lucide-react";
import { useSystemHealth, useDebugInfo } from "@/hooks/useSystemMonitoring";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SystemMonitor() {
  const { data: health, isLoading: healthLoading, error: healthError, refetch } = useSystemHealth();
  const { data: debug, isLoading: debugLoading } = useDebugInfo();

  const getHealthStatus = () => {
    if (!health) return { status: "desconhecido", color: "secondary", icon: Info };
    
    const issues = [];
    
    // Check for critical issues
    if (health.email_logs.success_rate < 90) {
      issues.push("Taxa de sucesso de email baixa");
    }
    
    if (health.email_logs.recent_failures > 5) {
      issues.push("Elevado número de falhas de email");
    }
    
    if (health.assistances.pending > 50) {
      issues.push("Elevado número de assistências pendentes");
    }

    if (issues.length === 0) {
      return { status: "saudável", color: "default", icon: CheckCircle };
    } else if (issues.length <= 2) {
      return { status: "aviso", color: "outline", icon: AlertTriangle };
    } else {
      return { status: "crítico", color: "destructive", icon: AlertTriangle };
    }
  };

  const healthStatus = getHealthStatus();
  const HealthIcon = healthStatus.icon;

  if (healthLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Monitor do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">A carregar estado do sistema...</div>
        </CardContent>
      </Card>
    );
  }

  if (healthError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Monitor do Sistema - Erro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-destructive">
            Falha ao carregar dados de saúde do sistema
          </div>
          <Button onClick={() => refetch()} variant="outline" className="w-full mt-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <CardTitle>Monitor do Sistema</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={healthStatus.color as any} className="flex items-center gap-1">
                <HealthIcon className="h-3 w-3" />
                {healthStatus.status.toUpperCase()}
              </Badge>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <CardDescription>Métricas de saúde e desempenho do sistema em tempo real</CardDescription>
        </CardHeader>
        <CardContent>
          {health && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Assistances */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Assistências</h4>
                <div className="text-2xl font-bold">{health.assistances.total}</div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Pendentes: {health.assistances.pending}</div>
                  <div>Em Progresso: {health.assistances.in_progress}</div>
                  <div>Concluídas: {health.assistances.completed}</div>
                </div>
              </div>

              {/* Suppliers */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Fornecedores</h4>
                <div className="text-2xl font-bold">{health.suppliers.active}</div>
                <div className="text-xs text-muted-foreground">
                  <div>Total: {health.suppliers.total}</div>
                  <div>Ativos: {health.suppliers.active}</div>
                </div>
              </div>

              {/* Quotations */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Orçamentos</h4>
                <div className="text-2xl font-bold">{health.quotations.total}</div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Pendentes: {health.quotations.pending}</div>
                  <div>Aprovados: {health.quotations.approved}</div>
                  <div>Rejeitados: {health.quotations.rejected}</div>
                </div>
              </div>

              {/* Email Health */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Sistema de Email</h4>
                <div className="text-2xl font-bold">{health.email_logs.success_rate.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Enviados: {health.email_logs.total_sent}</div>
                  <div>Falhas: {health.email_logs.recent_failures}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {health && health.recent_activity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atividade Recente</CardTitle>
            <CardDescription>Eventos e ações mais recentes do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {health.recent_activity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between text-sm border-b pb-2">
                  <div className="flex-1">
                    <span className="font-medium">{activity.action}</span>
                    {activity.details && (
                      <span className="text-muted-foreground ml-2">- {activity.details}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ptBR })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Info */}
      {debug && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informação de Depuração</CardTitle>
            <CardDescription>Detalhes de desempenho e ambiente do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Estado Online:</span> 
                <Badge variant={debug.online_status ? "default" : "destructive"} className="ml-2">
                  {debug.online_status ? "Online" : "Offline"}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Armazenamento Local:</span> {(debug.local_storage_size / 1024).toFixed(1)} KB
              </div>
              {debug.memory_usage && (
                <div className="md:col-span-2">
                  <span className="font-medium">Uso de Memória:</span> 
                  {(debug.memory_usage.used / 1024 / 1024).toFixed(1)} MB / 
                  {(debug.memory_usage.total / 1024 / 1024).toFixed(1)} MB
                </div>
              )}
              <div className="md:col-span-2 text-xs text-muted-foreground">
                Última atualização: {formatDistanceToNow(new Date(debug.timestamp), { addSuffix: true, locale: ptBR })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}