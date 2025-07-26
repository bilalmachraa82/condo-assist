import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, AlertTriangle, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useBuildings } from "@/hooks/useBuildings";
import { useSuppliers } from "@/hooks/useSuppliers";

const assistanceSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  building_id: z.string().min(1, "Edifício é obrigatório"),
  intervention_type_id: z.string().min(1, "Tipo de intervenção é obrigatório"),
  priority: z.enum(["normal", "urgent", "critical"]),
  assigned_supplier_id: z.string().optional(),
  deadline_response: z.string().optional(),
});

type AssistanceFormValues = z.infer<typeof assistanceSchema>;

interface CreateAssistanceFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateAssistanceForm({ onClose, onSuccess }: CreateAssistanceFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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

  const form = useForm<AssistanceFormValues>({
    resolver: zodResolver(assistanceSchema),
    defaultValues: {
      title: "",
      description: "",
      building_id: "",
      intervention_type_id: "",
      priority: "normal",
      assigned_supplier_id: "",
      deadline_response: "",
    },
  });

  const createAssistanceMutation = useMutation({
    mutationFn: async (values: AssistanceFormValues) => {
      const { data, error } = await supabase
        .from("assistances")
        .insert({
          title: values.title,
          description: values.description,
          building_id: values.building_id,
          intervention_type_id: values.intervention_type_id,
          priority: values.priority as any,
          assigned_supplier_id: values.assigned_supplier_id || null,
          deadline_response: values.deadline_response ? new Date(values.deadline_response).toISOString() : null,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (assistance) => {
      // Log activity
      await supabase
        .from("activity_log")
        .insert({
          assistance_id: assistance.id,
          action: "assistance_created",
          details: `Nova assistência criada: ${assistance.title}`,
          metadata: {
            priority: assistance.priority,
            building_id: assistance.building_id
          }
        });

      toast({
        title: "Sucesso",
        description: "Assistência criada com sucesso!",
      });

      queryClient.invalidateQueries({ queryKey: ["assistances"] });
      queryClient.invalidateQueries({ queryKey: ["assistance-stats"] });
      
      onSuccess();
    },
    onError: (error: any) => {
      console.error("Create assistance error:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar assistência. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: AssistanceFormValues) => {
    await createAssistanceMutation.mutateAsync(values);
  };

  const getPriorityLabel = (priority: string) => {
    const labels = {
      normal: "Normal",
      urgent: "Urgente", 
      critical: "Crítico"
    };
    return labels[priority as keyof typeof labels] || priority;
  };

  const getPriorityVariant = (priority: string) => {
    const variants = {
      normal: "secondary" as const,
      urgent: "default" as const,
      critical: "destructive" as const,
    };
    return variants[priority as keyof typeof variants] || "secondary";
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Nova Assistência
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
                            {building.name} - {building.code}
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
                        {interventionTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                            {type.category && (
                              <span className="text-muted-foreground ml-2">({type.category})</span>
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
                    <FormLabel>Fornecedor (opcional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Atribuir fornecedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Nenhum fornecedor</SelectItem>
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

            <FormField
              control={form.control}
              name="deadline_response"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prazo de Resposta (opcional)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        {...field} 
                        type="datetime-local"
                        className="pl-10"
                      />
                    </div>
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
                disabled={createAssistanceMutation.isPending}
                className="bg-gradient-to-r from-primary to-primary-light"
              >
                {createAssistanceMutation.isPending ? (
                  "A criar..."
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Assistência
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}