import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  MessageCircle,
  Calendar,
  FileText,
  X
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'deadline' | 'reminder' | 'alert' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  actionLabel?: string;
  actionCallback?: () => void;
  canDismiss?: boolean;
}

interface NotificationCenterProps {
  assistance: any;
  supplierResponse: any;
  quotations: any[];
  onAction: (action: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  assistance,
  supplierResponse,
  quotations,
  onAction
}) => {
  const [dismissedNotifications, setDismissedNotifications] = React.useState<string[]>([]);

  const generateNotifications = (): Notification[] => {
    const notifications: Notification[] = [];
    const now = new Date();

    // Response deadline notification
    if (!supplierResponse && assistance.response_deadline) {
      const deadline = new Date(assistance.response_deadline);
      const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilDeadline > 0 && hoursUntilDeadline <= 24) {
        notifications.push({
          id: 'response-deadline',
          type: 'deadline',
          title: 'Prazo de Resposta',
          message: `Deve responder até ${deadline.toLocaleDateString('pt-PT')} às ${deadline.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`,
          timestamp: now,
          actionLabel: 'Responder Agora',
          actionCallback: () => onAction('respond')
        });
      } else if (hoursUntilDeadline <= 0) {
        notifications.push({
          id: 'response-overdue',
          type: 'alert',
          title: 'Resposta em Atraso',
          message: 'O prazo para responder já passou. Contacte o administrador.',
          timestamp: now,
          actionLabel: 'Contactar Admin',
          actionCallback: () => onAction('contact_admin')
        });
      }
    }

    // Quotation deadline notification
    if (assistance.requires_quotation && 
        supplierResponse?.response_type === 'accepted' && 
        quotations.length === 0 && 
        assistance.quotation_deadline) {
      
      const deadline = new Date(assistance.quotation_deadline);
      const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilDeadline > 0 && hoursUntilDeadline <= 48) {
        notifications.push({
          id: 'quotation-deadline',
          type: 'deadline',
          title: 'Prazo de Orçamento',
          message: `Orçamento deve ser submetido até ${deadline.toLocaleDateString('pt-PT')}`,
          timestamp: now,
          actionLabel: 'Submeter Orçamento',
          actionCallback: () => onAction('quotation')
        });
      }
    }

    // Work scheduling reminder
    if (supplierResponse?.response_type === 'accepted' && 
        (!assistance.requires_quotation || quotations.some(q => q.status === 'approved')) &&
        !assistance.scheduled_start_date) {
      
      notifications.push({
        id: 'schedule-work',
        type: 'reminder',
        title: 'Agendar Trabalho',
        message: 'Defina quando irá realizar esta assistência',
        timestamp: now,
        actionLabel: 'Agendar',
        actionCallback: () => onAction('schedule'),
        canDismiss: true
      });
    }

    // Work start reminder
    if (assistance.scheduled_start_date && assistance.status !== 'in_progress') {
      const startDate = new Date(assistance.scheduled_start_date);
      const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilStart <= 24 && hoursUntilStart > 0) {
        notifications.push({
          id: 'work-start-reminder',
          type: 'info',
          title: 'Trabalho Agendado',
          message: `Trabalho agendado para ${startDate.toLocaleDateString('pt-PT')} às ${startDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`,
          timestamp: now,
          actionLabel: 'Ver Detalhes',
          actionCallback: () => onAction('view_schedule'),
          canDismiss: true
        });
      } else if (hoursUntilStart <= 0 && assistance.status !== 'in_progress') {
        notifications.push({
          id: 'work-should-start',
          type: 'alert',
          title: 'Hora de Iniciar',
          message: 'O trabalho deveria ter começado. Marque como iniciado ou reporte um problema.',
          timestamp: now,
          actionLabel: 'Iniciar Trabalho',
          actionCallback: () => onAction('start_work')
        });
      }
    }

    // Progress check-in reminder
    if (assistance.status === 'in_progress') {
      const lastProgress = assistance.updated_at ? new Date(assistance.updated_at) : new Date(assistance.created_at);
      const hoursSinceUpdate = (now.getTime() - lastProgress.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate >= 24) {
        notifications.push({
          id: 'progress-checkin',
          type: 'reminder',
          title: 'Atualização de Progresso',
          message: 'Não há atualizações há mais de 24h. Partilhe o progresso do trabalho.',
          timestamp: now,
          actionLabel: 'Atualizar Progresso',
          actionCallback: () => onAction('update_progress'),
          canDismiss: true
        });
      }
    }

    // Success notifications
    if (supplierResponse?.response_type === 'accepted') {
      notifications.push({
        id: 'response-success',
        type: 'success',
        title: 'Assistência Aceite',
        message: 'Obrigado por aceitar esta assistência.',
        timestamp: new Date(supplierResponse.created_at),
        canDismiss: true
      });
    }

    if (quotations.length > 0) {
      const latestQuotation = quotations[quotations.length - 1];
      if (latestQuotation.status === 'approved') {
        notifications.push({
          id: 'quotation-approved',
          type: 'success',
          title: 'Orçamento Aprovado',
          message: `Orçamento de €${latestQuotation.amount} foi aprovado.`,
          timestamp: new Date(latestQuotation.approved_at),
          canDismiss: true
        });
      }
    }

    // Filter out dismissed notifications
    return notifications.filter(n => !dismissedNotifications.includes(n.id));
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'deadline':
        return <Clock className="h-4 w-4" />;
      case 'alert':
        return <AlertTriangle className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'reminder':
        return <Bell className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getNotificationVariant = (type: Notification['type']) => {
    switch (type) {
      case 'deadline':
        return 'secondary';
      case 'alert':
        return 'destructive';
      case 'success':
        return 'default';
      case 'reminder':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const dismissNotification = (notificationId: string) => {
    setDismissedNotifications(prev => [...prev, notificationId]);
  };

  const notifications = generateNotifications();

  if (notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Está tudo em dia!</p>
            <p className="text-sm">Não há notificações pendentes.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações
          {notifications.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {notifications.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div 
              key={notification.id}
              className={`p-4 rounded-lg border ${
                notification.type === 'alert' ? 'border-destructive/20 bg-destructive/5' :
                notification.type === 'deadline' ? 'border-orange-200 bg-orange-50' :
                notification.type === 'success' ? 'border-green-200 bg-green-50' :
                'border-border bg-background'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${
                  notification.type === 'alert' ? 'text-destructive' :
                  notification.type === 'deadline' ? 'text-orange-600' :
                  notification.type === 'success' ? 'text-green-600' :
                  'text-muted-foreground'
                }`}>
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{notification.title}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant={getNotificationVariant(notification.type)}>
                        {notification.type === 'deadline' ? 'Prazo' :
                         notification.type === 'alert' ? 'Urgente' :
                         notification.type === 'success' ? 'Sucesso' :
                         notification.type === 'reminder' ? 'Lembrete' : 'Info'}
                      </Badge>
                      {notification.canDismiss && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dismissNotification(notification.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                  
                  {notification.actionLabel && notification.actionCallback && (
                    <Button
                      size="sm"
                      variant={notification.type === 'alert' ? 'destructive' : 'default'}
                      onClick={notification.actionCallback}
                      className="mt-2"
                    >
                      {notification.actionLabel}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};