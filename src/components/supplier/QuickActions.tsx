import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Play, 
  Pause, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Camera,
  MessageCircle,
  Wrench,
  MapPin,
  Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUpdateAssistanceStatus } from '@/hooks/useAssistances';
import { useCreateAssistanceProgress } from '@/hooks/useAssistanceProgress';

interface QuickActionsProps {
  assistance: any;
  supplierResponse: any;
  supplierId: string;
  onAction: (action: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  assistance,
  supplierResponse,
  supplierId,
  onAction
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [progressNote, setProgressNote] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [estimatedDelay, setEstimatedDelay] = useState('');
  const { toast } = useToast();
  
  const updateStatusMutation = useUpdateAssistanceStatus();
  const createProgressMutation = useCreateAssistanceProgress();

  const handleStartWork = async () => {
    try {
      await updateStatusMutation.mutateAsync({
        assistanceId: assistance.id,
        newStatus: 'in_progress',
        supplierNotes: `Trabalho iniciado em ${new Date().toLocaleString('pt-PT')}`
      });
      
      await createProgressMutation.mutateAsync({
        assistanceId: assistance.id,
        supplierId,
        progressType: 'comment',
        title: 'Trabalho Iniciado',
        description: 'O trabalho foi oficialmente iniciado.',
        photoUrls: []
      });

      toast({
        title: "Trabalho Iniciado",
        description: "O trabalho foi marcado como iniciado com sucesso.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao iniciar o trabalho.",
      });
    }
  };

  const handlePauseWork = async () => {
    try {
      await createProgressMutation.mutateAsync({
        assistanceId: assistance.id,
        supplierId,
        progressType: 'comment',
        title: 'Trabalho Pausado',
        description: 'O trabalho foi temporariamente pausado.',
        photoUrls: []
      });

      toast({
        title: "Trabalho Pausado",
        description: "O trabalho foi pausado. Lembre-se de retomar quando possível.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao pausar o trabalho.",
      });
    }
  };

  const handleQuickProgress = async () => {
    if (!progressNote.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, adicione uma nota de progresso.",
      });
      return;
    }

    try {
      await createProgressMutation.mutateAsync({
        assistanceId: assistance.id,
        supplierId,
        progressType: 'comment',
        title: 'Atualização Rápida',
        description: progressNote,
        photoUrls: []
      });

      setProgressNote('');
      setIsExpanded(false);
      
      toast({
        title: "Progresso Atualizado",
        description: "Atualização de progresso enviada com sucesso.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao enviar atualização de progresso.",
      });
    }
  };

  const handleReportDelay = async () => {
    if (!delayReason.trim() || !estimatedDelay) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
      });
      return;
    }

    try {
      await createProgressMutation.mutateAsync({
        assistanceId: assistance.id,
        supplierId,
        progressType: 'issue',
        title: 'Atraso Reportado',
        description: `Motivo: ${delayReason}\nTempo estimado de atraso: ${estimatedDelay} horas`,
        photoUrls: []
      });

      setDelayReason('');
      setEstimatedDelay('');
      setIsExpanded(false);
      
      toast({
        title: "Atraso Reportado",
        description: "O atraso foi reportado ao administrador.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao reportar atraso.",
      });
    }
  };

  const handleCompleteWork = async () => {
    try {
      await updateStatusMutation.mutateAsync({
        assistanceId: assistance.id,
        newStatus: 'completed',
        supplierNotes: `Trabalho concluído em ${new Date().toLocaleString('pt-PT')}`
      });
      
      await createProgressMutation.mutateAsync({
        assistanceId: assistance.id,
        supplierId,
        progressType: 'comment',
        title: 'Trabalho Concluído',
        description: 'O trabalho foi marcado como concluído.',
        photoUrls: []
      });

      toast({
        title: "Trabalho Concluído",
        description: "Parabéns! O trabalho foi marcado como concluído.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao concluir o trabalho.",
      });
    }
  };

  const getWorkStatusInfo = () => {
    const now = new Date();
    const scheduledStart = assistance.scheduled_start_date ? new Date(assistance.scheduled_start_date) : null;
    const actualStart = assistance.actual_start_date ? new Date(assistance.actual_start_date) : null;
    
    if (assistance.status === 'completed') {
      return {
        status: 'completed',
        message: 'Trabalho concluído',
        variant: 'default' as const,
        icon: CheckCircle
      };
    }
    
    if (assistance.status === 'in_progress') {
      const hoursWorking = actualStart ? (now.getTime() - actualStart.getTime()) / (1000 * 60 * 60) : 0;
      return {
        status: 'in_progress',
        message: `Em progresso há ${Math.round(hoursWorking)}h`,
        variant: 'secondary' as const,
        icon: Wrench
      };
    }
    
    if (scheduledStart) {
      const hoursUntilStart = (scheduledStart.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilStart <= 0) {
        return {
          status: 'should_start',
          message: 'Deveria ter começado',
          variant: 'destructive' as const,
          icon: AlertTriangle
        };
      } else if (hoursUntilStart <= 2) {
        return {
          status: 'starting_soon',
          message: `Inicia em ${Math.round(hoursUntilStart)}h`,
          variant: 'secondary' as const,
          icon: Clock
        };
      }
    }
    
    return {
      status: 'scheduled',
      message: 'Agendado',
      variant: 'outline' as const,
      icon: Calendar
    };
  };

  const statusInfo = getWorkStatusInfo();
  const StatusIcon = statusInfo.icon;

  const quickActions = [
    {
      id: 'start',
      label: 'Iniciar',
      icon: Play,
      variant: 'default' as const,
      show: assistance.status !== 'in_progress' && assistance.status !== 'completed' && supplierResponse?.response_type === 'accepted',
      action: handleStartWork
    },
    {
      id: 'pause',
      label: 'Pausar',
      icon: Pause,
      variant: 'secondary' as const,
      show: assistance.status === 'in_progress',
      action: handlePauseWork
    },
    {
      id: 'complete',
      label: 'Concluir',
      icon: CheckCircle,
      variant: 'default' as const,
      show: assistance.status === 'in_progress',
      action: handleCompleteWork
    },
    {
      id: 'photo',
      label: 'Foto',
      icon: Camera,
      variant: 'outline' as const,
      show: assistance.status === 'in_progress',
      action: () => onAction('take_photo')
    },
    {
      id: 'progress',
      label: 'Progresso',
      icon: MessageCircle,
      variant: 'outline' as const,
      show: assistance.status === 'in_progress',
      action: () => setIsExpanded(!isExpanded)
    },
    {
      id: 'delay',
      label: 'Atraso',
      icon: AlertTriangle,
      variant: 'destructive' as const,
      show: assistance.status === 'in_progress' || (assistance.scheduled_start_date && new Date(assistance.scheduled_start_date) < new Date()),
      action: () => setIsExpanded(!isExpanded)
    }
  ];

  const visibleActions = quickActions.filter(action => action.show);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Ações Rápidas
          </span>
          <Badge variant={statusInfo.variant} className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {statusInfo.message}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {visibleActions.map((action) => {
            const ActionIcon = action.icon;
            return (
              <Button
                key={action.id}
                variant={action.variant}
                size="sm"
                onClick={action.action}
                className="flex items-center gap-2"
                disabled={updateStatusMutation.isPending || createProgressMutation.isPending}
              >
                <ActionIcon className="h-4 w-4" />
                {action.label}
              </Button>
            );
          })}
        </div>

        {/* Location Helper */}
        {assistance.building_address && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">{assistance.building_name || 'Edifício'}</p>
              <p className="text-xs text-muted-foreground">{assistance.building_address}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(assistance.building_address)}`, '_blank')}
            >
              Ver Mapa
            </Button>
          </div>
        )}

        {/* Expanded Actions */}
        {isExpanded && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            {/* Quick Progress Update */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Atualização Rápida de Progresso</Label>
              <Textarea
                placeholder="Descreva brevemente o progresso atual..."
                value={progressNote}
                onChange={(e) => setProgressNote(e.target.value)}
                rows={3}
              />
              <Button
                onClick={handleQuickProgress}
                disabled={!progressNote.trim() || createProgressMutation.isPending}
                className="w-full"
              >
                Enviar Atualização
              </Button>
            </div>

            <div className="border-t pt-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-destructive">Reportar Atraso</Label>
                <Textarea
                  placeholder="Motivo do atraso..."
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  rows={2}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Atraso estimado (horas)</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 2"
                      value={estimatedDelay}
                      onChange={(e) => setEstimatedDelay(e.target.value)}
                      min="0.5"
                      step="0.5"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="destructive"
                      onClick={handleReportDelay}
                      disabled={!delayReason.trim() || !estimatedDelay || createProgressMutation.isPending}
                      className="w-full"
                    >
                      Reportar Atraso
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={() => setIsExpanded(false)}
              className="w-full"
            >
              Fechar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};