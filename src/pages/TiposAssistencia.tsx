import { useState } from "react";
import { Plus, Search, Edit, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useInterventionTypes, useDeleteInterventionType, InterventionType } from "@/hooks/useInterventionTypes";
import { InterventionTypeForm } from "@/components/settings/InterventionTypeForm";
import { useToast } from "@/hooks/use-toast";
import { useMemo } from "react";

export default function TiposAssistencia() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<InterventionType | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<InterventionType | null>(null);
  
  const { data: interventionTypes, isLoading } = useInterventionTypes();
  const deleteInterventionType = useDeleteInterventionType();
  const { toast } = useToast();

  const filteredTypes = useMemo(() => {
    if (!interventionTypes) return [];
    
    return interventionTypes.filter(type =>
      type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [interventionTypes, searchTerm]);

  const getUrgencyBadge = (urgency: string) => {
    const variants = {
      urgent: "destructive" as const,
      normal: "secondary" as const,
      low: "outline" as const
    };
    
    const labels = {
      urgent: "Urgente",
      normal: "Normal", 
      low: "Baixa"
    };

    return (
      <Badge variant={variants[urgency as keyof typeof variants] || "secondary"}>
        {labels[urgency as keyof typeof labels] || urgency}
      </Badge>
    );
  };

  const handleEdit = (type: InterventionType) => {
    setSelectedType(type);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedType(null);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedType(null);
  };

  const handleDelete = async () => {
    if (!typeToDelete) return;

    try {
      await deleteInterventionType.mutateAsync(typeToDelete.id);
      toast({
        title: "Tipo de assistência eliminado",
        description: "O tipo de assistência foi eliminado com sucesso."
      });
      setTypeToDelete(null);
    } catch (error) {
      toast({
        title: "Erro ao eliminar",
        description: "Ocorreu um erro ao eliminar o tipo de assistência.",
        variant: "destructive"
      });
    }
  };

  const categoryStats = useMemo(() => {
    if (!interventionTypes) return {};
    
    return interventionTypes.reduce((acc, type) => {
      const category = type.category || 'Outros';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [interventionTypes]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Tipos de Assistência</h1>
        <p className="text-muted-foreground">
          Gerir tipos de intervenção e categorias de assistência técnica
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Pesquisar tipos de assistência..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Tipo
          </Button>
        </div>
      </div>

      {/* Category Stats */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Object.entries(categoryStats).map(([category, count]) => (
          <Card key={category}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{count}</div>
              <p className="text-sm text-muted-foreground">{category}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Intervention Types Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTypes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTypes.map((type) => (
            <Card key={type.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg leading-tight">{type.name}</CardTitle>
                    <CardDescription>{type.category}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        ⋮
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(type)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setTypeToDelete(type)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {type.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {type.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    {getUrgencyBadge(type.urgency_level)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Nenhum tipo encontrado</h3>
              <p className="text-muted-foreground">
                Não foi encontrado nenhum tipo de assistência com os critérios de pesquisa.
              </p>
              <Button onClick={handleCreate} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Tipo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedType ? 'Editar Tipo de Assistência' : 'Novo Tipo de Assistência'}
            </DialogTitle>
          </DialogHeader>
          <InterventionTypeForm
            interventionType={selectedType}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!typeToDelete} onOpenChange={() => setTypeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar o tipo de assistência "{typeToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}