import { useState, useMemo } from "react";
import { Plus, Search, Edit, Trash2, Filter, Wrench, Building, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInterventionTypes, useDeleteInterventionType, InterventionType } from "@/hooks/useInterventionTypes";
import { InterventionTypeForm } from "@/components/settings/InterventionTypeForm";
import { useToast } from "@/hooks/use-toast";

export default function TiposAssistencia() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedUrgency, setSelectedUrgency] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<InterventionType | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<InterventionType | null>(null);
  
  const { data: interventionTypes, isLoading } = useInterventionTypes();
  const deleteInterventionType = useDeleteInterventionType();
  const { toast } = useToast();

  const filteredTypes = useMemo(() => {
    if (!interventionTypes) return [];
    
    return interventionTypes.filter(type => {
      const matchesSearch = type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        type.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        type.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || type.category === selectedCategory;
      const matchesUrgency = selectedUrgency === "all" || type.urgency_level === selectedUrgency;
      
      return matchesSearch && matchesCategory && matchesUrgency;
    });
  }, [interventionTypes, searchTerm, selectedCategory, selectedUrgency]);

  const categories = useMemo(() => {
    if (!interventionTypes) return [];
    const uniqueCategories = [...new Set(interventionTypes.map(t => t.category).filter(Boolean))];
    return uniqueCategories.sort();
  }, [interventionTypes]);

  const categoryStats = useMemo(() => {
    if (!interventionTypes) return {};
    
    return interventionTypes.reduce((acc, type) => {
      const category = type.category || 'Outros';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [interventionTypes]);

  const getUrgencyBadge = (urgency: string) => {
    const variants = {
      urgent: { variant: "destructive" as const, label: "Urgente", icon: AlertTriangle },
      normal: { variant: "secondary" as const, label: "Normal", icon: Wrench },
      low: { variant: "outline" as const, label: "Baixa", icon: Building }
    };
    
    const config = variants[urgency as keyof typeof variants] || variants.normal;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
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

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedUrgency("all");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
          Tipos de Assistência
        </h1>
        <p className="text-muted-foreground">
          Gerir tipos de intervenção e categorias de assistência técnica
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{interventionTypes?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total de Tipos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {Object.entries(categoryStats).slice(0, 3).map(([category, count]) => (
          <Card key={category}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm text-muted-foreground">{category}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Filtros e Pesquisa</span>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Tipo
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Pesquisar por nome, categoria ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedUrgency} onValueChange={setSelectedUrgency}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Urgência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Urgências</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>

            {(searchTerm || selectedCategory !== "all" || selectedUrgency !== "all") && (
              <Button variant="outline" onClick={clearFilters}>
                <Filter className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Tipos de Assistência</CardTitle>
          <CardDescription>
            {filteredTypes.length} de {interventionTypes?.length || 0} tipos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTypes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Urgência</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTypes.map((type) => (
                  <TableRow key={type.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{type.category || 'Outros'}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate text-sm text-muted-foreground">
                        {type.description || 'Sem descrição'}
                      </p>
                    </TableCell>
                    <TableCell>{getUrgencyBadge(type.urgency_level)}</TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {interventionTypes?.length === 0 ? 'Nenhum tipo configurado' : 'Nenhum resultado encontrado'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {interventionTypes?.length === 0 
                  ? 'Configure os primeiros tipos de assistência para começar.'
                  : 'Tente ajustar os filtros de pesquisa.'
                }
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                {interventionTypes?.length === 0 ? 'Criar Primeiro Tipo' : 'Novo Tipo'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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