import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  FileText,
  Calendar,
  MessageCircle,
  Camera,
  TrendingUp
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending' | 'blocked';
  dueDate?: string;
  isOptional?: boolean;
}

interface WorkflowDashboardProps {
  assistance: any;
  supplierResponse: any;
  quotations: any[];
  onAction: (action: string) => void;
}

export const WorkflowDashboard: React.FC<WorkflowDashboardProps> = ({
  assistance,
  supplierResponse,
  quotations,
  onAction
}) => {
  const getWorkflowSteps = (): WorkflowStep[] => {
    const steps: WorkflowStep[] = [
      {
        id: 'received',
        title: 'Pedido Recebido',
        description: 'Análise do pedido de assistência',
        status: 'completed'
      }
    ];

    // Response step
    if (!supplierResponse) {
      steps.push({
        id: 'respond',
        title: 'Responder ao Pedido',
        description: 'Aceitar ou recusar a assistência',
        status: 'current',
        dueDate: assistance.response_deadline
      });
    } else {
      steps.push({
        id: 'respond',
        title: 'Resposta Enviada',
        description: supplierResponse.response_type === 'accepted' ? 'Assistência aceite' : 'Assistência recusada',
        status: 'completed'
      });
    }

    // Quotation step (if required)
    if (assistance.requires_quotation && supplierResponse?.response_type === 'accepted') {
      const hasQuotation = quotations.length > 0;
      const approvedQuotation = quotations.find(q => q.status === 'approved');
      
      steps.push({
        id: 'quotation',
        title: 'Orçamento',
        description: hasQuotation ? 'Orçamento submetido' : 'Submeter orçamento',
        status: approvedQuotation ? 'completed' : hasQuotation ? 'pending' : 'current',
        dueDate: assistance.quotation_deadline
      });
    }

    // Work execution steps
    if (supplierResponse?.response_type === 'accepted' && 
        (!assistance.requires_quotation || quotations.some(q => q.status === 'approved'))) {
      
      steps.push({
        id: 'schedule',
        title: 'Agendar Trabalho',
        description: 'Definir data e horário de execução',
        status: assistance.scheduled_start_date ? 'completed' : 'current'
      });

      if (assistance.scheduled_start_date) {
        steps.push({
          id: 'execute',
          title: 'Executar Trabalho',
          description: 'Trabalho em progresso',
          status: assistance.status === 'in_progress' ? 'current' : 
                  assistance.status === 'completed' ? 'completed' : 'pending'
        });
      }

      if (assistance.status === 'in_progress' || assistance.status === 'completed') {
        steps.push({
          id: 'finalize',
          title: 'Finalizar Trabalho',
          description: 'Upload de fotos e relatório final',
          status: assistance.status === 'completed' ? 'completed' : 'pending'
        });
      }
    }

    return steps;
  };

  const getProgressPercentage = (): number => {
    const steps = getWorkflowSteps();
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    return Math.round((completedSteps / steps.length) * 100);
  };

  const getCurrentAction = () => {
    const steps = getWorkflowSteps();
    const currentStep = steps.find(step => step.status === 'current');
    
    if (!currentStep) return null;

    const actions = {
      respond: {
        title: 'Responder ao Pedido',
        description: 'Aceite ou recuse esta assistência',
        action: () => onAction('respond'),
        icon: MessageCircle,
        variant: 'default' as const
      },
      quotation: {
        title: 'Submeter Orçamento',
        description: 'Forneça um orçamento detalhado',
        action: () => onAction('quotation'),
        icon: FileText,
        variant: 'default' as const
      },
      schedule: {
        title: 'Agendar Trabalho',
        description: 'Defina quando irá realizar o trabalho',
        action: () => onAction('schedule'),
        icon: Calendar,
        variant: 'default' as const
      },
      execute: {
        title: 'Iniciar Trabalho',
        description: 'Marque o início da execução',
        action: () => onAction('start_work'),
        icon: TrendingUp,
        variant: 'default' as const
      }
    };

    return actions[currentStep.id as keyof typeof actions];
  };

  const getStatusIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'current':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'blocked':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: WorkflowStep['status']) => {
    const variants = {
      completed: 'default',
      current: 'secondary',
      pending: 'outline',
      blocked: 'destructive'
    } as const;

    const labels = {
      completed: 'Concluído',
      current: 'Em Curso',
      pending: 'Pendente',
      blocked: 'Bloqueado'
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const steps = getWorkflowSteps();
  const currentAction = getCurrentAction();
  const progress = getProgressPercentage();

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Progresso Geral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Progresso da assistência</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Início</span>
              <span>Conclusão</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Action */}
      {currentAction && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <currentAction.icon className="h-5 w-5" />
              Próxima Ação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">{currentAction.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {currentAction.description}
                </p>
              </div>
              <Button 
                onClick={currentAction.action}
                className="w-full"
                variant={currentAction.variant}
              >
                {currentAction.title}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflow Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Estado do Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  {getStatusIcon(step.status)}
                  {index < steps.length - 1 && (
                    <div className="w-px h-8 bg-border mt-2" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{step.title}</h4>
                    {getStatusBadge(step.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                  {step.dueDate && step.status !== 'completed' && (
                    <p className="text-xs text-orange-600">
                      Prazo: {new Date(step.dueDate).toLocaleDateString('pt-PT')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};