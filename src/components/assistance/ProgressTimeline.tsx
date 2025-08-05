import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Activity, FileText, Camera, AlertTriangle, CheckCircle, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAssistanceProgress } from "@/hooks/useAssistanceProgress";
import { useCommunicationLog } from "@/hooks/useCommunicationLog";

interface ProgressTimelineProps {
  assistanceId: string;
}

interface TimelineItem {
  id: string;
  type: 'progress' | 'communication' | 'system';
  title: string;
  description?: string;
  timestamp: string;
  icon: any;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  metadata?: any;
}

export default function ProgressTimeline({ assistanceId }: ProgressTimelineProps) {
  const { data: progressEntries = [], isLoading: progressLoading } = useAssistanceProgress(assistanceId);
  const { data: communications = [], isLoading: communicationLoading } = useCommunicationLog(assistanceId);

  const isLoading = progressLoading || communicationLoading;

  const getProgressIcon = (type: string) => {
    const icons = {
      comment: FileText,
      photo: Camera,
      status_update: CheckCircle,
      issue: AlertTriangle,
    };
    return icons[type as keyof typeof icons] || Activity;
  };

  const getProgressVariant = (type: string) => {
    const variants = {
      comment: "secondary" as const,
      photo: "default" as const,
      status_update: "default" as const,
      issue: "destructive" as const,
    };
    return variants[type as keyof typeof variants] || "secondary";
  };

  const getProgressLabel = (type: string) => {
    const labels = {
      comment: "Nota de Progresso",
      photo: "Foto Adicionada",
      status_update: "Atualização de Status",
      issue: "Problema Reportado",
    };
    return labels[type as keyof typeof labels] || type;
  };

  // Combine and sort timeline items
  const timelineItems: TimelineItem[] = [
    // Progress entries
    ...progressEntries.map(entry => ({
      id: entry.id,
      type: 'progress' as const,
      title: entry.title || getProgressLabel(entry.progress_type),
      description: entry.description,
      timestamp: entry.created_at,
      icon: getProgressIcon(entry.progress_type),
      variant: getProgressVariant(entry.progress_type),
      metadata: { progressType: entry.progress_type, photoUrls: entry.photo_urls }
    })),
    // Communications
    ...communications.map(comm => ({
      id: comm.id,
      type: 'communication' as const,
      title: `Mensagem de ${comm.sender_type === 'admin' ? 'Administrador' : 'Fornecedor'}`,
      description: comm.message,
      timestamp: comm.created_at,
      icon: User,
      variant: 'outline' as const,
      metadata: { senderType: comm.sender_type }
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Timeline de Atividade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <p className="text-muted-foreground">Carregando timeline...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Timeline de Atividade
          <Badge variant="outline" className="text-xs">
            {timelineItems.length} atividade{timelineItems.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[500px]">
          {timelineItems.length > 0 ? (
            <div className="space-y-4 pr-4">
              {timelineItems.map((item, index) => {
                const Icon = item.icon;
                
                return (
                  <div key={item.id} className="relative">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 relative">
                        <div className="w-10 h-10 rounded-full bg-background border-2 border-border flex items-center justify-center">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        {index < timelineItems.length - 1 && (
                          <div className="absolute top-10 left-5 w-px h-6 bg-border" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 pb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={item.variant} className="text-xs">
                            {item.type === 'progress' ? 'Progresso' : 'Comunicação'}
                          </Badge>
                          <span className="text-sm font-medium text-foreground">
                            {item.title}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                            <Clock className="h-3 w-3" />
                            {format(new Date(item.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </div>
                        </div>
                        
                        {item.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                            {item.description}
                          </p>
                        )}

                        {item.metadata?.photoUrls && item.metadata.photoUrls.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {item.metadata.photoUrls.map((url: string, photoIndex: number) => (
                              <img
                                key={photoIndex}
                                src={url}
                                alt={`Foto ${photoIndex + 1}`}
                                className="w-16 h-16 object-cover rounded border"
                              />
                            ))}
                          </div>
                        )}

                        {item.metadata?.senderType && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <User className="h-3 w-3" />
                            <span>
                              {item.metadata.senderType === 'admin' ? 'Equipa Administrativa' : 'Fornecedor'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-2">Ainda não há atividade</p>
              <p className="text-sm text-muted-foreground">
                As atividades e comunicações desta assistência aparecerão aqui.
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}