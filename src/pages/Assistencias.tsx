import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusBadge, PriorityBadge } from "@/components/ui/status-badges"
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
import { toast } from "@/hooks/use-toast"
import CreateAssistanceForm from "@/components/assistance/CreateAssistanceForm"
import { PDFExportButton } from "@/components/assistance/PDFExportButton"
import { AssistanceListPDFTemplate } from "@/components/assistance/AssistanceListPDFTemplate"
import { AssistanceFiltersComponent, type AssistanceFilters } from "@/components/assistance/AssistanceFilters"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { SwipeableCard } from "@/components/mobile/SwipeableCard"
import { useIsMobile } from "@/hooks/use-mobile"
import { useQueryClient } from "@tanstack/react-query"
import { FloatingActionButton } from "@/components/mobile/FloatingActionButton"
import { SkeletonList } from "@/components/mobile/SkeletonList"
import { PullToRefreshIndicator } from "@/components/mobile/PullToRefreshIndicator"
import { usePullToRefresh } from "@/hooks/usePullToRefresh"

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
  const [filters, setFilters] = useState<AssistanceFilters>({})
  const { data: assistances, isLoading, refetch } = useAssistances();
  const { data: stats, isLoading: statsLoading } = useAssistanceStats();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  
  const pullToRefresh = usePullToRefresh({
    refreshFunction: async () => {
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ["assistance-stats"] });
    },
    disabled: showCreateForm || !!selectedAssistance
  });

  // Filter assistances based on search term and filters
  const filteredAssistances = assistances?.filter(assistance => {

    // Status filter
    const matchesStatus = !filters.status || assistance.status === filters.status;

    // Priority filter  
    const matchesPriority = !filters.priority || assistance.priority === filters.priority;

    // Building filter
    const matchesBuilding = !filters.buildingId || assistance.building_id === filters.buildingId;

    // Supplier filter
    const matchesSupplier = !filters.supplierId || assistance.assigned_supplier_id === filters.supplierId;

    // Assistance number filter
    const matchesAssistanceNumber = !filters.assistanceNumber || 
      assistance.assistance_number?.toString().includes(filters.assistanceNumber);

    // Search also includes assistance number (support both "#4" and "4" formats)
    const cleanedSearchTerm = searchTerm.toString().replace('#', '');
    const assistanceNumberStr = assistance.assistance_number?.toString();
    const matchesSearchWithNumber = !searchTerm || 
      assistance.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assistance.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assistance.buildings?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assistance.suppliers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assistanceNumberStr?.includes(cleanedSearchTerm) ||
      (`#${assistanceNumberStr}`).includes(searchTerm.toString());

    // Date filters
    const createdDate = new Date(assistance.created_at);
    const matchesDateFrom = !filters.dateFrom || createdDate >= new Date(filters.dateFrom);
    const matchesDateTo = !filters.dateTo || createdDate <= new Date(filters.dateTo + 'T23:59:59');

    return matchesSearchWithNumber && matchesStatus && matchesPriority && matchesBuilding && matchesSupplier && matchesAssistanceNumber && matchesDateFrom && matchesDateTo;
  }) || [];

  // Pull to refresh functionality
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['assistances'] });
    await queryClient.invalidateQueries({ queryKey: ['assistance-stats'] });
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
              disabled={pullToRefresh.isRefreshing}
              className="hover:bg-muted/50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${pullToRefresh.isRefreshing ? 'animate-spin' : ''}`} />
              {pullToRefresh.isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
          ) : (
            <>
              <AssistanceFiltersComponent 
                filters={filters}
                onFiltersChange={setFilters}
              />
              
              <PDFExportButton 
                filename="listagem-assistencias"
                variant="outline"
                size="default"
              >
                <AssistanceListPDFTemplate 
                  assistances={filteredAssistances}
                  title="Listagem de Assistências"
                  filters={filters}
                />
              </PDFExportButton>
            </>
          )}
        </div>
        {/* Desktop New Button - hide on mobile since we have FAB */}
        {!isMobile && (
          <Button 
            className="bg-gradient-to-r from-primary to-primary-light hover:shadow-lg transition-all duration-300"
            onClick={() => setShowCreateForm(true)}
            size="default"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Assistência
          </Button>
        )}
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
          <SkeletonList count={5} />
        ) : (
          filteredAssistances.map((assistance) => {
            const handleEdit = () => {
              // Navigate to edit form - functionality to be implemented
              toast({
                title: "Em desenvolvimento",
                description: "A funcionalidade de edição será implementada em breve.",
              });
            };

            const handleView = () => {
              setSelectedAssistance(assistance);
            };

            const buildingInfo = assistance.buildings ? 
              `${assistance.buildings.code ? assistance.buildings.code + '=' : ''}${assistance.buildings.name}` : 
              'Sem edifício';
            const assistanceTitle = assistance.title || 'Assistência';
            const interventionType = assistance.intervention_types?.name || 'Sem tipo definido';

            // Mobile: Use SwipeableCard, Desktop: Use regular Card
            if (isMobile) {
              return (
                <SwipeableCard
                  key={assistance.id}
                  title={buildingInfo}
                  description={`${assistanceTitle} • ${interventionType}`}
                  status={assistance.status as "pending" | "in_progress" | "completed"}
                  priority={assistance.priority as "low" | "normal" | "high" | "urgent"}
                  onEdit={handleEdit}
                  onView={handleView}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                        #{assistance.assistance_number || 'N/A'}
                      </span>
                          <StatusBadge status={assistance.status} />
                          <PriorityBadge priority={assistance.priority} />
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
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                            #{assistance.assistance_number || 'N/A'}
                          </span>
                           <StatusBadge status={assistance.status} />
                           <PriorityBadge priority={assistance.priority} />
                        </div>
                        
                        <div className="space-y-1">
                          <h3 className="font-bold text-lg text-foreground">
                            {buildingInfo}
                          </h3>
                          <p className="font-medium text-base">
                            {assistanceTitle}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {interventionType}
                          </p>
                        </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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

      {filteredAssistances.length === 0 && !isLoading && (
        <Card className="p-8">
          <div className="text-center space-y-4">
            <Wrench className="h-12 w-12 text-muted-foreground mx-auto" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                {(searchTerm || Object.values(filters).some(Boolean)) ? 
                  'Nenhuma assistência encontrada' : 
                  'Nenhuma assistência criada ainda'
                }
              </h3>
              <p className="text-muted-foreground">
                {(searchTerm || Object.values(filters).some(Boolean)) ? (
                  <>
                    Não foram encontradas assistências que correspondam aos critérios:
                    {searchTerm && <><br />• Termo de pesquisa: "{searchTerm}"</>}
                    {filters.status && <><br />• Status: {filters.status}</>}
                    {filters.priority && <><br />• Prioridade: {filters.priority}</>}
                  </>
                ) : (
                  'Comece por criar uma nova assistência técnica para gerir os pedidos dos condomínios.'
                )}
              </p>
            </div>
            {(searchTerm || Object.values(filters).some(Boolean)) ? (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setFilters({});
                }}
                className="mt-4"
              >
                Limpar Pesquisa e Filtros
              </Button>
            ) : (
              <Button 
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-primary to-primary-light hover:shadow-lg transition-all duration-300 mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Assistência
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Mobile FAB */}
      <FloatingActionButton 
        onClick={() => setShowCreateForm(true)}
        label="Nova Assistência"
      />
    </div>
  )
}