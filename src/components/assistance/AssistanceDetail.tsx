import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Building2, User, Calendar, Clock, AlertTriangle, Settings, Trash2, Edit, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import PhotoUpload from "./PhotoUpload";
import PhotoGallery from "./PhotoGallery";
import QuotationList from "@/components/quotations/QuotationList";
import QuotationSection from "./QuotationSection";
import EditAssistanceForm from "./EditAssistanceForm";

import InternalNotes from "./InternalNotes";
import CommunicationLog from "./CommunicationLog";
import ProgressTimeline from "./ProgressTimeline";
import { PDFExportButton } from "./PDFExportButton";
import { AssistancePDFTemplate } from "./AssistancePDFTemplate";
import { useUpdateAssistanceStatus, useDeleteAssistance, useAssistance } from "@/hooks/useAssistances";
import type { Assistance } from "@/hooks/useAssistances";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface AssistanceDetailProps {
  assistance: Assistance;
  onBack: () => void;
  onDeleted?: () => void;
}

const getStatusBadge = (status: string) => {
  const variants = {
    pending: "bg-warning/10 text-warning border-warning/20",
    in_progress: "bg-primary/10 text-primary border-primary/20",
    completed: "bg-success/10 text-success border-success/20",
    cancelled: "bg-destructive/10 text-destructive border-destructive/20",
    awaiting_quotation: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    quotation_received: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    quotation_approved: "bg-green-500/10 text-green-600 border-green-500/20",
    accepted: "bg-success/10 text-success border-success/20",
    scheduled: "bg-primary/10 text-primary border-primary/20",
    awaiting_validation: "bg-warning/10 text-warning border-warning/20"
  }

  const labels = {
    pending: "Pendente",
    in_progress: "Em Progresso",
    completed: "Concluída",
    cancelled: "Cancelada",
    awaiting_quotation: "Aguardando Orçamento",
    quotation_received: "Orçamento Recebido",
    quotation_approved: "Orçamento Aprovado",
    accepted: "Aceite",
    scheduled: "Agendada",
    awaiting_validation: "Aguardando Validação"
  }

  return (
    <Badge className={variants[status as keyof typeof variants] || variants.pending}>
      {labels[status as keyof typeof labels] || status}
    </Badge>
  )
}

const getPriorityBadge = (priority: string) => {
  const variants = {
    normal: "bg-muted/50 text-muted-foreground",
    urgent: "bg-warning/10 text-warning border-warning/20",
    critical: "bg-destructive/10 text-destructive border-destructive/20"
  }

  const icons = {
    normal: null,
    urgent: <AlertTriangle className="h-3 w-3 mr-1" />,
    critical: <AlertTriangle className="h-3 w-3 mr-1" />
  }

  const labels = {
    normal: "Normal",
    urgent: "Urgente",
    critical: "Crítico"
  }

  return (
    <Badge className={`text-xs ${variants[priority as keyof typeof variants] || variants.normal}`}>
      {icons[priority as keyof typeof icons]}
      {labels[priority as keyof typeof labels] || priority}
    </Badge>
  )
}

export default function AssistanceDetail({ assistance, onBack, onDeleted }: AssistanceDetailProps) {
  const [refreshPhotos, setRefreshPhotos] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const updateStatusMutation = useUpdateAssistanceStatus();
  const deleteAssistanceMutation = useDeleteAssistance();
  const { toast } = useToast();
  const { data: assistanceData } = useAssistance(assistance.id);

  const handlePhotoUploaded = () => {
    // Trigger photo gallery refresh
    setRefreshPhotos(prev => prev + 1);
  };

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate({
      assistanceId: assistance.id,
      newStatus
    });
  };

  const handleEditSuccess = () => {
    setIsEditing(false);
    // No need to manually refresh - the mutation will invalidate queries
  };

  const handleDelete = () => {
    deleteAssistanceMutation.mutate(assistance.id, {
      onSuccess: () => {
        toast({
          title: "Assistência eliminada",
          description: "A assistência foi eliminada com sucesso.",
        });
        onDeleted?.();
        onBack();
      },
      onError: (error: any) => {
        toast({
          title: "Erro",
          description: "Erro ao eliminar assistência. Tente novamente.",
          variant: "destructive",
        });
      }
    });
  };

  if (isEditing) {
    return (
      <EditAssistanceForm
        assistance={assistance}
        onClose={() => setIsEditing(false)}
        onSuccess={handleEditSuccess}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {assistance.intervention_types?.name || assistance.title || 'Assistência'}
          </h1>
          <p className="text-muted-foreground font-mono">
            Assistência #{assistance.assistance_number || 'N/A'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(assistanceData?.status ?? assistance.status)}
          {getPriorityBadge(assistance.priority)}
          
          <PDFExportButton 
            filename={`assistencia-${assistance.title.replace(/\s+/g, '-').toLowerCase()}`}
            variant="outline"
            size="sm"
          >
            <AssistancePDFTemplate assistance={assistance} />
          </PDFExportButton>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminar Assistência</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja eliminar esta assistência? Esta ação não pode ser desfeita.
                  Todos os dados associados (fotos, orçamentos, logs) também serão eliminados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete}
                  className="bg-destructive hover:bg-destructive/90"
                  disabled={deleteAssistanceMutation.isPending}
                >
                  {deleteAssistanceMutation.isPending ? "A eliminar..." : "Eliminar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detalhes da Assistência</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {assistance.description && (
                <div>
                  <h4 className="font-medium mb-2">Descrição</h4>
                  <p className="text-muted-foreground">{assistance.description}</p>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Categoria</p>
                  <p className="text-sm text-muted-foreground">
                    {assistance.intervention_types?.category || 'Não especificada'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Prioridade</p>
                  <div className="flex">{getPriorityBadge(assistance.priority)}</div>
                </div>
              </div>

              {(assistance.estimated_cost || assistance.final_cost) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    {assistance.estimated_cost && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Custo Estimado</p>
                        <p className="text-sm text-muted-foreground">
                          €{Number(assistance.estimated_cost).toFixed(2)}
                        </p>
                      </div>
                    )}
                    {assistance.final_cost && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Custo Final</p>
                        <p className="text-sm text-muted-foreground">
                          €{Number(assistance.final_cost).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {assistance.supplier_notes && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Notas do Fornecedor</p>
                    <p className="text-sm text-muted-foreground">{assistance.supplier_notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Photos and Quotations Section */}
          <Tabs defaultValue="gallery" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="gallery">Fotos</TabsTrigger>
              <TabsTrigger value="upload">Adicionar Foto</TabsTrigger>
              <TabsTrigger value="quotations">Orçamentos</TabsTrigger>
              <TabsTrigger value="internal">Notas Internas</TabsTrigger>
              <TabsTrigger value="communication">Comunicação</TabsTrigger>
            </TabsList>
            
            <TabsContent value="gallery" className="mt-4">
              <PhotoGallery key={refreshPhotos} assistanceId={assistance.id} />
            </TabsContent>
            
            <TabsContent value="upload" className="mt-4">
              <PhotoUpload 
                assistanceId={assistance.id} 
                onPhotoUploaded={handlePhotoUploaded}
              />
            </TabsContent>

            <TabsContent value="quotations" className="mt-4">
              <QuotationSection assistance={assistance} />
            </TabsContent>

            <TabsContent value="internal" className="mt-4">
              <InternalNotes assistance={assistance} canEdit={true} />
            </TabsContent>

            <TabsContent value="communication" className="mt-4">
              <div className="space-y-6">
                <CommunicationLog assistanceId={assistance.id} userRole="admin" />
                <ProgressTimeline assistanceId={assistance.id} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Sidebar Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Edifício</p>
                  <p className="text-sm text-muted-foreground">
                    {assistance.buildings?.name || 'Não especificado'}
                  </p>
                  {assistance.buildings?.code && (
                    <p className="text-xs text-muted-foreground">
                      Código: {assistance.buildings.code}
                    </p>
                  )}
                </div>
              </div>

              {assistance.suppliers && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Fornecedor</p>
                    <p className="text-sm text-muted-foreground">
                      {assistance.suppliers.name}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Criado</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(assistance.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>

              {assistance.scheduled_date && (
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Agendado para</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(assistance.scheduled_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )}

              {assistance.completed_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Concluído</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(assistance.completed_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )}

              {assistance.deadline_response && (
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-warning" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Prazo de Resposta</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(assistance.deadline_response), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Management Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Gestão de Estado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Estado Atual</p>
                {getStatusBadge(assistanceData?.status ?? assistance.status)}
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Alterar Estado</p>
                <Select 
                  value={assistanceData?.status ?? assistance.status} 
                  onValueChange={handleStatusChange}
                  disabled={updateStatusMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">⏳ Pendente</SelectItem>
                    <SelectItem value="awaiting_quotation">💰 Aguardando Orçamento</SelectItem>
                    <SelectItem value="quotation_received">📋 Orçamento Recebido</SelectItem>
                    <SelectItem value="accepted">✅ Aceite</SelectItem>
                    <SelectItem value="scheduled">📅 Agendada</SelectItem>
                    <SelectItem value="in_progress">🔧 Em Progresso</SelectItem>
                    <SelectItem value="awaiting_validation">⚠️ Aguardando Validação</SelectItem>
                    <SelectItem value="completed">✅ Concluída</SelectItem>
                    <SelectItem value="cancelled">❌ Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {updateStatusMutation.isPending && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border">
                  🔄 Atualizando estado e enviando notificações...
                </div>
              )}
              
              <div className="text-xs text-muted-foreground bg-info/10 p-2 rounded border border-info/20">
                💡 <strong>Nota:</strong> Alterar o estado enviará automaticamente notificações por email ao fornecedor.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}