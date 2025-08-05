import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";

export interface SupplierFilters {
  status?: string;
  specialization?: string;
  location?: string;
  minRating?: string;
  maxRating?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasNif?: boolean;
}

interface SupplierFiltersProps {
  filters: SupplierFilters;
  onFiltersChange: (filters: SupplierFilters) => void;
  specializations: string[];
}

export const SupplierFiltersComponent = ({ 
  filters, 
  onFiltersChange, 
  specializations 
}: SupplierFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  const statusOptions = [
    { value: "active", label: "Ativo" },
    { value: "inactive", label: "Inativo" }
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

  const updateFilter = (key: keyof SupplierFilters, value: string | boolean | undefined) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: (value === "all" || value === "" || value === undefined) ? undefined : value
    }));
  };

  const activeFiltersCount = Object.values(filters).filter(value => 
    value !== undefined && value !== "" && value !== false
  ).length;

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
          <DialogTitle>Filtros de Fornecedores</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4">
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

          {/* Specialization Filter */}
          <div className="space-y-2">
            <Label>Especialização</Label>
            <Select value={localFilters.specialization || ""} onValueChange={(value) => updateFilter("specialization", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as especializações" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as especializações</SelectItem>
                {specializations.map(spec => (
                  <SelectItem key={spec} value={spec}>
                    {spec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location Filter */}
          <div className="space-y-2">
            <Label>Localização</Label>
            <Input
              placeholder="Cidade, distrito..."
              value={localFilters.location || ""}
              onChange={(e) => updateFilter("location", e.target.value)}
            />
          </div>

          {/* Min Rating */}
          <div className="space-y-2">
            <Label>Avaliação Mínima</Label>
            <Select value={localFilters.minRating || ""} onValueChange={(value) => updateFilter("minRating", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Qualquer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer</SelectItem>
                <SelectItem value="1">1 estrela +</SelectItem>
                <SelectItem value="2">2 estrelas +</SelectItem>
                <SelectItem value="3">3 estrelas +</SelectItem>
                <SelectItem value="4">4 estrelas +</SelectItem>
                <SelectItem value="5">5 estrelas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Has Email */}
          <div className="space-y-2">
            <Label>Com Email</Label>
            <Select 
              value={localFilters.hasEmail === true ? "true" : localFilters.hasEmail === false ? "false" : ""} 
              onValueChange={(value) => updateFilter("hasEmail", value === "true" ? true : value === "false" ? false : undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Has Phone */}
          <div className="space-y-2">
            <Label>Com Telefone</Label>
            <Select 
              value={localFilters.hasPhone === true ? "true" : localFilters.hasPhone === false ? "false" : ""} 
              onValueChange={(value) => updateFilter("hasPhone", value === "true" ? true : value === "false" ? false : undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
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