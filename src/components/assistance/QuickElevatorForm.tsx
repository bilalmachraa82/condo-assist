import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useBuildings } from "@/hooks/useBuildings";
import { useInterventionTypes } from "@/hooks/useInterventionTypes";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Building2 } from "lucide-react";

interface QuickElevatorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuickElevatorForm({ open, onOpenChange }: QuickElevatorFormProps) {
  const [buildingId, setBuildingId] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: buildings } = useBuildings();
  const { data: interventionTypes } = useInterventionTypes();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Find elevator intervention type
  const elevatorType = interventionTypes?.find(
    (t) => t.name.toLowerCase().includes("elevador") || t.name.toLowerCase().includes("elevator")
  );

  const selectedBuilding = buildings?.find((b) => b.id === buildingId);

  const handleSubmit = async () => {
    if (!buildingId || !elevatorType) {
      toast({
        title: "Erro",
        description: !elevatorType
          ? "Tipo de intervenção 'Elevador' não encontrado. Crie-o primeiro em Tipos de Assistência."
          : "Selecione um edifício.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const buildingLabel = selectedBuilding
        ? `${selectedBuilding.code ? selectedBuilding.code + " - " : ""}${selectedBuilding.name}`
        : "";

      const title = `Avaria Elevador - ${buildingLabel}`;

      const { data: numData } = await supabase.rpc("generate_assistance_number");

      const { error } = await supabase.from("assistances").insert({
        title,
        description: description || "Avaria no elevador reportada via formulário rápido",
        building_id: buildingId,
        intervention_type_id: elevatorType.id,
        priority: "urgent" as const,
        assistance_number: numData || 1,
        status: "pending" as const,
      });

      if (error) throw error;

      toast({ title: "Assistência criada", description: `${title} registada com sucesso.` });
      queryClient.invalidateQueries({ queryKey: ["assistances"] });
      queryClient.invalidateQueries({ queryKey: ["assistance-stats"] });
      queryClient.invalidateQueries({ queryKey: ["elevator-count"] });
      setBuildingId("");
      setDescription("");
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Avaria Elevador - Registo Rápido
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!elevatorType && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              ⚠️ Tipo de intervenção "Elevador" não encontrado. Crie-o primeiro em Configurações → Tipos de Assistência.
            </div>
          )}

          <div className="flex gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-warning border-warning/30">Urgente</Badge>
            <Badge variant="outline">{elevatorType?.name || "Elevador"}</Badge>
          </div>

          <div className="space-y-2">
            <Label htmlFor="building">Edifício *</Label>
            <Select value={buildingId} onValueChange={setBuildingId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar edifício..." />
              </SelectTrigger>
              <SelectContent>
                {buildings
                  ?.filter((b) => b.is_active)
                  .map((building) => (
                    <SelectItem key={building.id} value={building.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3" />
                        {building.code ? `${building.code} - ` : ""}{building.name}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Ex: Elevador parado no 3º andar, porta não fecha..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !buildingId || !elevatorType}
              className="bg-warning hover:bg-warning/90 text-warning-foreground"
            >
              {isSubmitting ? "A registar..." : "Registar Avaria"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
