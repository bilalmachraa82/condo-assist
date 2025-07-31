import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWorkflowEngine } from '@/hooks/useWorkflowEngine';
import { AlertTriangle, Clock, CheckCircle, TrendingUp, Zap, Target } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function WorkflowIntelligent() {
  const { workflows, slaMetrics, loading, escalateAssistance } = useWorkflowEngine();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard de Workflow</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted" />
              <CardContent className="h-32 bg-muted/50" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const criticalWorkflows = workflows.filter(w => w.escalation_level >= 2);
  const overdueWorkflows = workflows.filter(w => {
    if (!w.sla_deadline) return false;
    return new Date(w.sla_deadline) < new Date();
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard de Workflow Inteligente</h1>
        <Badge variant="outline" className="text-lg px-3 py-1">
          <Clock className="h-4 w-4 mr-1" />
          Tempo Real
        </Badge>
      </div>

      {/* SLA Metrics Overview */}
      {slaMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assistências</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{slaMetrics.total_assistances}</div>
              <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dentro do SLA</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{slaMetrics.within_sla}</div>
              <Progress 
                value={slaMetrics.total_assistances > 0 ? (slaMetrics.within_sla / slaMetrics.total_assistances) * 100 : 0} 
                className="mt-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">SLA Excedido</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{slaMetrics.breached_sla}</div>
              <p className="text-xs text-muted-foreground">
                {slaMetrics.critical_overdue} críticas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(slaMetrics.average_response_time)}h
              </div>
              <p className="text-xs text-muted-foreground">Tempo de resposta</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Critical Alerts */}
      {(criticalWorkflows.length > 0 || overdueWorkflows.length > 0) && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex justify-between items-center">
              <span>
                <strong>Atenção:</strong> {criticalWorkflows.length} assistências críticas, {overdueWorkflows.length} em atraso
              </span>
              <Button variant="destructive" size="sm">
                <Zap className="h-4 w-4 mr-1" />
                Escalar Todas
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Workflow Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Pipeline de Workflows Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workflows.slice(0, 10).map((workflow) => (
              <div key={workflow.assistance_id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="font-medium">ID: {workflow.assistance_id.slice(0, 8)}</span>
                    <span className="text-sm text-muted-foreground">
                      {workflow.current_stage}
                    </span>
                  </div>
                  
                  <div className="flex flex-col">
                    <Badge 
                      variant={workflow.escalation_level >= 2 ? "destructive" : 
                              workflow.escalation_level >= 1 ? "default" : "secondary"}
                    >
                      Nível {workflow.escalation_level}
                    </Badge>
                    {workflow.sla_deadline && (
                      <span className="text-xs text-muted-foreground mt-1">
                        SLA: {formatDistanceToNow(new Date(workflow.sla_deadline), { 
                          addSuffix: true, 
                          locale: pt 
                        })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {workflow.escalation_level < 3 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => escalateAssistance(workflow.assistance_id, 'Manual escalation')}
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Escalar
                    </Button>
                  )}
                  
                  <Badge 
                    variant={
                      workflow.current_stage === 'completed' ? 'default' :
                      workflow.current_stage === 'in_progress' ? 'secondary' :
                      workflow.current_stage === 'pending' ? 'outline' : 'destructive'
                    }
                  >
                    {workflow.current_stage}
                  </Badge>
                </div>
              </div>
            ))}
            
            {workflows.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                <p>Nenhum workflow ativo. Todos os processos estão em dia!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Automation Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Status da Automação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <p className="font-medium">Escalação Automática</p>
                <p className="text-sm text-muted-foreground">A cada 5 minutos</p>
              </div>
              <Badge variant="default">
                <CheckCircle className="h-3 w-3 mr-1" />
                Ativo
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <p className="font-medium">Aprovação Automática</p>
                <p className="text-sm text-muted-foreground">Orçamentos &lt; €500</p>
              </div>
              <Badge variant="default">
                <CheckCircle className="h-3 w-3 mr-1" />
                Ativo
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <p className="font-medium">Monitorização SLA</p>
                <p className="text-sm text-muted-foreground">Tempo real</p>
              </div>
              <Badge variant="default">
                <CheckCircle className="h-3 w-3 mr-1" />
                Ativo
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}