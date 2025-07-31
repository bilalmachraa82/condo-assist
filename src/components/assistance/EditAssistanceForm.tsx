import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Edit, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useBuildings } from "@/hooks/useBuildings";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useUpdateAssistance } from "@/hooks/useAssistances";
import type { Assistance } from "@/hooks/useAssistances";

const assistanceSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  building_id: z.string().min(1, "Edifício é obrigatório"),
  intervention_type_id: z.string().min(1, "Tipo de intervenção é obrigatório"),
  priority: z.enum(["normal", "urgent", "critical"]),
  assigned_supplier_id: z.string().optional().or(z.literal("")),
  admin_notes: z.string().optional(),
  estimated_cost: z.string().optional(),
  final_cost: z.string().optional(),
});

type AssistanceFormValues = z.infer<typeof assistanceSchema>;

interface EditAssistanceFormProps {
  assistance: Assistance;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditAssistanceForm({ assistance, onClose, onSuccess }: EditAssistanceFormProps) {
  const { toast } = useToast();
  
  // Get data for dropdowns
  const { data: buildings = [] } = useBuildings();
  const { data: suppliers = [] } = useSuppliers();
  
  const { data: interventionTypes = [] } = useQuery({
    queryKey: ["intervention-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intervention_types")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const updateAssistanceMutation = useUpdateAssistance();

  const form = useForm<AssistanceFormValues>({
    resolver: zodResolver(assistanceSchema),
    defaultValues: {
      title: assistance.title || "",
      description: assistance.description || "",
      building_id: assistance.building_id || "",
      intervention_type_id: assistance.intervention_type_id || "",
      priority: assistance.priority || "normal",
      assigned_supplier_id: assistance.assigned_supplier_id || "",
      admin_notes: assistance.admin_notes || "",
      estimated_cost: assistance.estimated_cost?.toString() || "",
      final_cost: assistance.final_cost?.toString() || "",
    },
  });

  const onSubmit = async (values: AssistanceFormValues) => {
    try {
      await updateAssistanceMutation.mutateAsync({
        id: assistance.id,
        title: values.title,
        description: values.description,
        building_id: values.building_id,
        intervention_type_id: values.intervention_type_id,
        priority: values.priority as any,
        assigned_supplier_id: values.assigned_supplier_id || null,
        admin_notes: values.admin_notes || null,
        estimated_cost: values.estimated_cost ? parseFloat(values.estimated_cost) : null,
        final_cost: values.final_cost ? parseFloat(values.final_cost) : null,
      });

      toast({
        title: "Sucesso",
        description: "Assistência atualizada com sucesso!",
      });

      onSuccess();
    } catch (error: any) {
      console.error("Update assistance error:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar assistência. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Group intervention types by category
  const groupedInterventionTypes = interventionTypes?.reduce((acc, type) => {
    const category = type.category || 'Outros';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(type);
    return acc;
  }, {} as Record<string, typeof interventionTypes>) || {};

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          Editar Assistência
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da Assistência</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Reparação de canalizações no 2º andar" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="building_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Edifício</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar edifício" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {buildings.map((building) => (
                          <SelectItem key={building.id} value={building.id}>
                            {building.code} - {building.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="intervention_type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Intervenção</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(groupedInterventionTypes).map(([category, types]) => (
                          <div key={category}>
                            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground border-b">
                              {category}
                            </div>
                            {types.map((type) => (
                              <SelectItem key={type.id} value={type.id} className="pl-4">
                                {type.name}
                                {type.description && (
                                  <span className="text-xs text-muted-foreground block truncate max-w-[200px]">
                                    {type.description}
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição Detalhada</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Descreva o problema ou trabalho necessário..."
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="normal">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">Normal</Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value="urgent">
                          <div className="flex items-center gap-2">
                            <Badge variant="default">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Urgente
                            </Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value="critical">
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Crítico
                            </Badge>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assigned_supplier_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Atribuir fornecedor" />
                        </SelectTrigger>
                      </FormControl>
                       <SelectContent>
                         {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                            {supplier.specialization && (
                              <span className="text-muted-foreground ml-2">({supplier.specialization})</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimated_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo Estimado (€)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="final_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo Final (€)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="admin_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas Administrativas</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Notas internas, observações..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={updateAssistanceMutation.isPending}
              >
                {updateAssistanceMutation.isPending ? "Atualizando..." : "Atualizar Assistência"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}