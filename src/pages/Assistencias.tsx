import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { 
  Plus, 
  Search, 
  Filter, 
  Wrench,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  Building2,
  User,
  FileText,
  Euro,
  Trash2,
  RefreshCw
} from "lucide-react"
import { useAssistances, useAssistanceStats, useDeleteAssistance, type Assistance } from "@/hooks/useAssistances"
import { useRequestQuotation, useQuotationsByAssistance } from "@/hooks/useQuotations"
import { formatDistanceToNow, format } from "date-fns"
import { pt } from "date-fns/locale"
import AssistanceDetail from "@/components/assistance/AssistanceDetail"
import CreateAssistanceForm from "@/components/assistance/CreateAssistanceForm"
import { PDFExportButton } from "@/components/assistance/PDFExportButton"
import { AssistanceListPDFTemplate } from "@/components/assistance/AssistanceListPDFTemplate"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { SwipeableCard } from "@/components/mobile/SwipeableCard"
import { useIsMobile } from "@/hooks/use-mobile"
import { useQueryClient } from "@tanstack/react-query"

const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4" />
    case "in_progress":
      return <CheckCircle className="h-4 w-4" />
    case "completed":
      return <CheckCircle className="h-4 w-4" />
    case "cancelled":
      return <XCircle className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
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
    quotation_rejected: "bg-red-500/10 text-red-600 border-red-500/20"
  }

  const labels = {
    pending: "Pendente",
    in_progress: "Em Progresso",
    completed: "Concluída",
    cancelled: "Cancelada",
    awaiting_quotation: "Aguardando Orçamento",
    quotation_received: "Orçamento Recebido",
    quotation_approved: "Orçamento Aprovado",
    quotation_rejected: "Orçamento Rejeitado"
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

// Quick quotation component
function QuickQuotationAction({ assistance }: { assistance: Assistance }) {
  const [deadline, setDeadline] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const requestQuotation = useRequestQuotation()
  const { data: quotations } = useQuotationsByAssistance(assistance.id)

  const canRequest = assistance.assigned_supplier_id && !assistance.requires_quotation
  const hasQuotations = quotations && quotations.length > 0
  const quotationCount = quotations?.length || 0

  const handleRequest = async () => {
    await requestQuotation.mutateAsync({
      assistanceId: assistance.id,
      deadline: deadline || undefined,
    })
    setIsOpen(false)
    setDeadline("")
  }

  if (hasQuotations) {
    return (
      <Badge variant="outline" className="gap-1">
        <FileText className="h-3 w-3" />
        {quotationCount} Orçamento{quotationCount > 1 ? 's' : ''}
      </Badge>
    )
  }

  if (assistance.requires_quotation) {
    return (
      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1">
        <Clock className="h-3 w-3" />
        Orçamento Solicitado
      </Badge>
    )
  }

  if (!canRequest) return null

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <FileText className="h-3 w-3" />
          Solicitar Orçamento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar Orçamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="deadline">Prazo para Resposta (opcional)</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRequest} disabled={requestQuotation.isPending}>
              {requestQuotation.isPending ? "Solicitando..." : "Solicitar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Delete assistance component
function DeleteAssistanceAction({ assistance, onDeleted }: { assistance: Assistance; onDeleted?: () => void }) {
  const deleteAssistance = useDeleteAssistance()
  const { toast } = useToast()

  const handleDelete = () => {
    deleteAssistance.mutate(assistance.id, {
      onSuccess: () => {
        onDeleted?.()
      }
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          size="sm" 
          variant="outline" 
          className="text-destructive hover:bg-destructive/10 border-destructive/20"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar Assistência</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja eliminar esta assistência permanentemente? Esta ação não pode ser desfeita.
            Todos os dados associados (fotos, orçamentos, logs) também serão eliminados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            className="bg-destructive hover:bg-destructive/90"
            disabled={deleteAssistance.isPending}
          >
            {deleteAssistance.isPending ? "A eliminar..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default function Assistencias() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAssistance, setSelectedAssistance] = useState<Assistance | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { data: assistances, isLoading, refetch } = useAssistances();
  const { data: stats, isLoading: statsLoading } = useAssistanceStats();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // Filter assistances based on search term
  const filteredAssistances = assistances?.filter(assistance => 
    assistance.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assistance.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assistance.buildings?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assistance.suppliers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Pull to refresh functionality
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['assistances'] });
      await queryClient.invalidateQueries({ queryKey: ['assistance-stats'] });
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  // Show detail view if assistance is selected
  if (selectedAssistance) {
    return (
      <AssistanceDetail 
        assistance={selectedAssistance} 
        onBack={() => setSelectedAssistance(null)}
      />
    );
  }

  // Show create form if needed
  if (showCreateForm) {
    return (
      <div className="space-y-6">
        <CreateAssistanceForm 
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            // Data will be refreshed automatically via React Query
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
          Gestão de Assistências
        </h1>
        <p className="text-muted-foreground">
          Gerir pedidos de assistência técnica para condomínios
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar assistências..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-80"
            />
          </div>
          
          {/* Mobile: Only show refresh button */}
          {isMobile ? (
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="hover:bg-muted/50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
          ) : (
            <>
              <Button variant="outline" className="hover:bg-muted/50">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
              
              <PDFExportButton 
                filename="listagem-assistencias"
                variant="outline"
                size="default"
              >
                <AssistanceListPDFTemplate 
                  assistances={filteredAssistances}
                  title="Listagem de Assistências"
                />
              </PDFExportButton>
            </>
          )}
        </div>
        <Button 
          className="bg-gradient-to-r from-primary to-primary-light hover:shadow-lg transition-all duration-300 w-full sm:w-auto"
          onClick={() => setShowCreateForm(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Assistência
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </>
        ) : (
          <>
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold text-primary">{stats?.total || 0}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-warning/10 to-warning/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-warning" />
                  <div>
                    <p className="text-2xl font-bold text-warning">{stats?.pending || 0}</p>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-2xl font-bold text-accent">{stats?.in_progress || 0}</p>
                    <p className="text-xs text-muted-foreground">Em Progresso</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-success/10 to-success/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-2xl font-bold text-success">{stats?.completed || 0}</p>
                    <p className="text-xs text-muted-foreground">Concluídas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Assistances List */}
      <div className="grid gap-4">
        {isLoading ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
              </Card>
            ))}
          </>
        ) : (
          filteredAssistances.map((assistance) => {
            const handleEdit = () => {
              // TODO: Navigate to edit form
              console.log('Edit assistance:', assistance.id);
            };

            const handleView = () => {
              setSelectedAssistance(assistance);
            };

            const assistanceTitle = assistance.intervention_types?.name || assistance.title || 'Assistência';
            const assistanceDescription = assistance.description || 'Sem descrição';

            // Mobile: Use SwipeableCard, Desktop: Use regular Card
            if (isMobile) {
              return (
                <SwipeableCard
                  key={assistance.id}
                  title={assistanceTitle}
                  description={assistanceDescription}
                  status={assistance.status as "pending" | "in_progress" | "completed"}
                  priority={assistance.priority as "low" | "normal" | "high" | "urgent"}
                  onEdit={handleEdit}
                  onView={handleView}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{assistance.id}</span>
                      {getStatusBadge(assistance.status)}
                      {getPriorityBadge(assistance.priority)}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate max-w-[120px]">
                          {assistance.buildings?.name || 'Sem edifício'}
                        </span>
                      </div>
                      {assistance.suppliers && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="truncate max-w-[100px]">{assistance.suppliers.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(assistance.created_at), { 
                            addSuffix: true, 
                            locale: pt 
                          })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <QuickQuotationAction assistance={assistance} />
                    </div>
                  </div>
                </SwipeableCard>
              );
            }

            // Desktop: Regular card layout
            return (
              <Card key={assistance.id} className="hover:shadow-md transition-all duration-300 cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-muted-foreground">{assistance.id}</span>
                        {getStatusBadge(assistance.status)}
                        {getPriorityBadge(assistance.priority)}
                      </div>
                      
                      <h3 className="font-semibold text-lg">
                        {assistanceTitle}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {assistanceDescription}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          <span className="truncate max-w-xs">
                            {assistance.buildings?.name || 'Edifício não especificado'}
                          </span>
                        </div>
                        {assistance.suppliers && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{assistance.suppliers.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>
                            {formatDistanceToNow(new Date(assistance.created_at), { 
                              addSuffix: true, 
                              locale: pt 
                            })}
                          </span>
                        </div>
                      </div>
                      
                      {/* Quotation quick action */}
                      <div className="mt-2">
                        <QuickQuotationAction assistance={assistance} />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getStatusIcon(assistance.status)}
                      <DeleteAssistanceAction assistance={assistance} />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="hover:bg-muted/50"
                        onClick={() => setSelectedAssistance(assistance)}
                      >
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {filteredAssistances.length === 0 && (
        <Card className="p-8">
          <div className="text-center space-y-2">
            <Wrench className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">Nenhuma assistência encontrada</h3>
            <p className="text-muted-foreground">
              Não existem assistências que correspondam aos critérios de pesquisa.
            </p>
          </div>
        </Card>
      )}

    </div>
  )
}