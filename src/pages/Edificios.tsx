import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  Plus, 
  Search, 
  MapPin, 
  FileText, 
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Wrench,
  Clock,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useBuildings, useCreateBuilding, useUpdateBuilding, useDeleteBuilding, type Building } from "@/hooks/useBuildings";
import { useAssistances } from "@/hooks/useAssistances";
import { BuildingForm } from "@/components/buildings/BuildingForm";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { PDFExportButton } from "@/components/assistance/PDFExportButton";
import { AssistanceListPDFTemplate } from "@/components/assistance/AssistanceListPDFTemplate";
import AssistanceDetail from "@/components/assistance/AssistanceDetail";

// Building assistances view component
function BuildingAssistancesView({ building, onBack }: { building: Building; onBack: () => void }) {
  const [selectedAssistance, setSelectedAssistance] = useState(null);
  const { data: allAssistances } = useAssistances();
  
  // Filter assistances for this building
  const buildingAssistances = allAssistances?.filter(
    assistance => assistance.building_id === building.id
  ) || [];
  
  const openAssistances = buildingAssistances.filter(
    assistance => !['completed', 'cancelled'].includes(assistance.status)
  );
  
  const closedAssistances = buildingAssistances.filter(
    assistance => ['completed', 'cancelled'].includes(assistance.status)
  );

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-warning/10 text-warning border-warning/20",
      in_progress: "bg-primary/10 text-primary border-primary/20", 
      completed: "bg-success/10 text-success border-success/20",
      cancelled: "bg-destructive/10 text-destructive border-destructive/20"
    };

    const labels = {
      pending: "Pendente",
      in_progress: "Em Progresso",
      completed: "Concluída", 
      cancelled: "Cancelada"
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || variants.pending}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-warning" />;
      case "in_progress":
        return <Wrench className="h-4 w-4 text-primary" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "cancelled":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (selectedAssistance) {
    return (
      <AssistanceDetail
        assistance={selectedAssistance}
        onBack={() => setSelectedAssistance(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            ← Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{building.name}</h1>
            <p className="text-muted-foreground">Assistências do edifício</p>
          </div>
        </div>
        <PDFExportButton 
          filename={`assistencias-${building.name.replace(/\s+/g, '-').toLowerCase()}`}
          variant="outline"
        >
          <AssistanceListPDFTemplate 
            assistances={buildingAssistances}
            title={`Assistências - ${building.name}`}
            filters={{ building: building.name }}
          />
        </PDFExportButton>
      </div>

      {/* Building Info */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{buildingAssistances.length}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">{openAssistances.length}</div>
              <div className="text-sm text-muted-foreground">Abertas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{closedAssistances.length}</div>
              <div className="text-sm text-muted-foreground">Fechadas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {buildingAssistances.filter(a => a.status === 'in_progress').length}
              </div>
              <div className="text-sm text-muted-foreground">Em Progresso</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assistances Tabs */}
      <Tabs defaultValue="open" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="open">Assistências Abertas ({openAssistances.length})</TabsTrigger>
          <TabsTrigger value="closed">Assistências Fechadas ({closedAssistances.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="open" className="mt-6">
          <div className="space-y-4">
            {openAssistances.length === 0 ? (
              <Card className="p-8">
                <div className="text-center space-y-2">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                  <h3 className="text-lg font-semibold">Nenhuma assistência aberta</h3>
                  <p className="text-muted-foreground">
                    Todas as assistências deste edifício estão concluídas.
                  </p>
                </div>
              </Card>
            ) : (
              openAssistances.map((assistance) => (
                <Card key={assistance.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(assistance.status)}
                          {getStatusBadge(assistance.status)}
                        </div>
                        <h3 className="font-semibold text-lg mb-1">
                          {assistance.intervention_types?.name || assistance.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {assistance.description || 'Sem descrição'}
                        </p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(new Date(assistance.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                          {assistance.suppliers && (
                            <>
                              <span className="mx-2">•</span>
                              <span>{assistance.suppliers.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAssistance(assistance)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="closed" className="mt-6">
          <div className="space-y-4">
            {closedAssistances.length === 0 ? (
              <Card className="p-8">
                <div className="text-center space-y-2">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                  <h3 className="text-lg font-semibold">Nenhuma assistência fechada</h3>
                  <p className="text-muted-foreground">
                    Ainda não há assistências concluídas ou canceladas neste edifício.
                  </p>
                </div>
              </Card>
            ) : (
              closedAssistances.map((assistance) => (
                <Card key={assistance.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(assistance.status)}
                          {getStatusBadge(assistance.status)}
                        </div>
                        <h3 className="font-semibold text-lg mb-1">
                          {assistance.intervention_types?.name || assistance.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {assistance.description || 'Sem descrição'}
                        </p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(new Date(assistance.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                          {assistance.completed_date && (
                            <>
                              <span className="mx-2">•</span>
                              <span>Concluído: {format(new Date(assistance.completed_date), "dd/MM/yyyy", { locale: pt })}</span>
                            </>
                          )}
                          {assistance.suppliers && (
                            <>
                              <span className="mx-2">•</span>
                              <span>{assistance.suppliers.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAssistance(assistance)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Edificios() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedBuildingForEdit, setSelectedBuildingForEdit] = useState<Building | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [buildingToDelete, setBuildingToDelete] = useState<Building | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'assistances'>('list');
  
  const { data: buildings, isLoading } = useBuildings();
  const { data: assistances } = useAssistances();
  const deleteBuilding = useDeleteBuilding();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!buildingToDelete) return;
    
    try {
      await deleteBuilding.mutateAsync(buildingToDelete.id);
      toast({
        title: "Edifício eliminado",
        description: "O edifício foi eliminado com sucesso.",
      });
      setBuildingToDelete(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao eliminar edifício. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getBuildingAssistanceCount = (buildingId: string) => {
    return assistances?.filter(assistance => assistance.building_id === buildingId).length || 0;
  };

  const getOpenAssistanceCount = (buildingId: string) => {
    return assistances?.filter(
      assistance => 
        assistance.building_id === buildingId && 
        !['completed', 'cancelled'].includes(assistance.status)
    ).length || 0;
  };

  const filteredBuildings = buildings?.filter(building => 
    building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (building.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Show building assistances view
  if (viewMode === 'assistances' && selectedBuilding) {
    return (
      <BuildingAssistancesView 
        building={selectedBuilding}
        onBack={() => {
          setViewMode('list');
          setSelectedBuilding(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
          Gestão de Edifícios
        </h1>
        <p className="text-muted-foreground">
          Gerir informações dos edifícios e condomínios
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-80"
            />
          </div>
        </div>
        <Button 
          className="bg-gradient-to-r from-primary to-primary-light hover:shadow-lg transition-all duration-300"
          onClick={() => setShowCreateForm(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Edifício
        </Button>
      </div>

      {/* Buildings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          filteredBuildings.map((building) => {
            const totalAssistances = getBuildingAssistanceCount(building.id);
            const openAssistances = getOpenAssistanceCount(building.id);
            
            return (
              <Card key={building.id} className="hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{building.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Código: {building.code || 'N/A'}
                      </p>
                      {building.nif && (
                        <p className="text-sm text-muted-foreground">
                          NIF: {building.nif}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedBuilding(building);
                            setViewMode('assistances');
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Assistências
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSelectedBuildingForEdit(building)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setBuildingToDelete(building)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {building.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm text-muted-foreground">{building.address}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-primary/5 rounded-lg">
                      <div className="text-xl font-bold text-primary">{totalAssistances}</div>
                      <div className="text-xs text-muted-foreground">Total Assistências</div>
                    </div>
                    <div className="text-center p-3 bg-warning/5 rounded-lg">
                      <div className="text-xl font-bold text-warning">{openAssistances}</div>
                      <div className="text-xs text-muted-foreground">Abertas</div>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setSelectedBuilding(building);
                      setViewMode('assistances');
                    }}
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Ver Assistências
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {filteredBuildings.length === 0 && !isLoading && (
        <Card className="p-8">
          <div className="text-center space-y-2">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">Nenhum edifício encontrado</h3>
            <p className="text-muted-foreground">
              Não existem edifícios que correspondam aos critérios de pesquisa.
            </p>
          </div>
        </Card>
      )}

      {/* Create/Edit Form Dialog */}
      <Dialog open={showCreateForm || !!selectedBuildingForEdit} onOpenChange={(open) => {
        if (!open) {
          setShowCreateForm(false);
          setSelectedBuildingForEdit(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedBuildingForEdit ? 'Editar Edifício' : 'Novo Edifício'}
            </DialogTitle>
          </DialogHeader>
          <BuildingForm
            building={selectedBuildingForEdit}
            onSuccess={() => {
              setShowCreateForm(false);
              setSelectedBuildingForEdit(null);
            }}
            onCancel={() => {
              setShowCreateForm(false);
              setSelectedBuildingForEdit(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!buildingToDelete} onOpenChange={() => setBuildingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Edifício</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja eliminar o edifício "{buildingToDelete?.name}"? 
              Esta ação não pode ser desfeita e todas as assistências associadas também serão afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteBuilding.isPending}
            >
              {deleteBuilding.isPending ? "A eliminar..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}