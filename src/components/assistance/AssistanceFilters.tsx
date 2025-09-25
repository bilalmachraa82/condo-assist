import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import { useBuildings } from "@/hooks/useBuildings";
import { useAllSuppliers } from "@/hooks/useSuppliers";
import { VALID_ASSISTANCE_STATES, ASSISTANCE_STATUS_TRANSLATIONS } from "@/utils/assistanceStates";

export interface AssistanceFilters {
  status?: string;
  priority?: string;
  buildingId?: string;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
  assistanceNumber?: string;
}

interface AssistanceFiltersProps {
  filters: AssistanceFilters;
  onFiltersChange: (filters: AssistanceFilters) => void;
}

export const AssistanceFiltersComponent = ({ filters, onFiltersChange }: AssistanceFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);
  const { data: buildings = [] } = useBuildings();
  const { data: suppliers = [] } = useAllSuppliers();

  // Import valid states from utility
  const statusOptions = VALID_ASSISTANCE_STATES.map(status => ({
    value: status,
    label: ASSISTANCE_STATUS_TRANSLATIONS[status]
  }));

  const priorityOptions = [
    { value: "normal", label: "Normal" },
    { value: "urgent", label: "Urgente" },
    { value: "critical", label: "Crítico" }
  ];

  const applyFilters = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const clearFilters = () => {
    const emptyFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const updateFilter = (key: keyof AssistanceFilters, value: string | undefined) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: (value === "all" || !value) ? undefined : value
    }));
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="hover:bg-muted/50">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Filtros de Assistências</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Assistance Number Filter */}
          <div className="space-y-2">
            <Label>Número da Assistência</Label>
            <Input
              type="number"
              placeholder="Ex: 1234"
              value={localFilters.assistanceNumber || ""}
              onChange={(e) => updateFilter("assistanceNumber", e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={localFilters.status || ""} onValueChange={(value) => updateFilter("status", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estados</SelectItem>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority Filter */}
          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select value={localFilters.priority || ""} onValueChange={(value) => updateFilter("priority", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as prioridades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as prioridades</SelectItem>
                {priorityOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Building Filter */}
          <div className="space-y-2">
            <Label>Edifício</Label>
            <Select value={localFilters.buildingId || ""} onValueChange={(value) => updateFilter("buildingId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os edifícios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os edifícios</SelectItem>
                {buildings.map(building => (
                  <SelectItem key={building.id} value={building.id}>
                    {building.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Supplier Filter */}
          <div className="space-y-2">
            <Label>Fornecedor</Label>
            <Select value={localFilters.supplierId || ""} onValueChange={(value) => updateFilter("supplierId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os fornecedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os fornecedores</SelectItem>
                {suppliers.map(supplier => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date From */}
          <div className="space-y-2">
            <Label>Data Início</Label>
            <Input
              type="date"
              value={localFilters.dateFrom || ""}
              onChange={(e) => updateFilter("dateFrom", e.target.value)}
            />
          </div>

          {/* Date To */}
          <div className="space-y-2">
            <Label>Data Fim</Label>
            <Input
              type="date"
              value={localFilters.dateTo || ""}
              onChange={(e) => updateFilter("dateTo", e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Limpar Filtros
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={applyFilters}>
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};