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
import { X, Plus, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useBuildings } from "@/hooks/useBuildings";
import { useSuppliers } from "@/hooks/useSuppliers";
import { sendMagicCodeToSupplier } from "@/utils/sendMagicCode";

const assistanceSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  building_id: z.string().min(1, "Edifício é obrigatório"),
  intervention_type_id: z.string().min(1, "Tipo de intervenção é obrigatório"),
  priority: z.enum(["normal", "urgent", "critical"]),
  assigned_supplier_id: z.string().optional().or(z.literal("")),
  requires_quotation: z.boolean().optional(),
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
      requires_quotation: false,
    },
  });

  // Set default intervention type when data loads
  useEffect(() => {
    if (interventionTypes.length > 0 && !form.getValues("intervention_type_id")) {
      form.setValue("intervention_type_id", interventionTypes[0].id);
    }
  }, [interventionTypes, form]);

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
          requires_quotation: values.requires_quotation || false,
          quotation_requested_at: values.requires_quotation && values.assigned_supplier_id ? new Date().toISOString() : null,
          status: values.requires_quotation && values.assigned_supplier_id ? "awaiting_quotation" : "pending",
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (assistance) => {
      // Activity logging is now handled by database triggers

      // Send email notification if supplier is assigned
      if (assistance.assigned_supplier_id) {
        try {
          const supplier = suppliers.find(s => s.id === assistance.assigned_supplier_id);
          const building = buildings.find(b => b.id === assistance.building_id);
          const interventionType = interventionTypes.find(i => i.id === assistance.intervention_type_id);
          
          if (supplier?.email && supplier?.name) {
            if (assistance.requires_quotation) {
              // Send quotation request email
              const emailResponse = await supabase.functions.invoke('request-quotation-email', {
                body: {
                  assistance_id: assistance.id,
                  supplier_id: assistance.assigned_supplier_id,
                  supplier_email: supplier.email,
                  supplier_name: supplier.name,
                  assistance_title: assistance.title,
                  assistance_description: assistance.description,
                  building_name: building?.name || "N/A",
                  deadline: null
                }
              });

              await supabase.from("email_logs").insert({
                recipient_email: supplier.email,
                subject: `Solicitação de Orçamento - ${assistance.title}`,
                status: emailResponse.error ? "failed" : "sent",
                assistance_id: assistance.id,
                supplier_id: assistance.assigned_supplier_id,
                template_used: "quotation_request"
              });

              toast({
                title: "Sucesso",
                description: "Assistência criada e solicitação de orçamento enviada!",
              });
            } else {
              // Send regular assignment notification
              await sendMagicCodeToSupplier(
                supplier.id,
                supplier.email,
                supplier.name,
                {
                  title: assistance.title,
                  priority: assistance.priority,
                  buildingName: building?.name || 'N/A',
                  buildingNif: building?.nif || undefined,
                  interventionType: interventionType?.name || 'N/A',
                  description: assistance.description || undefined
                }
              );

              await supabase.from("email_logs").insert({
                assistance_id: assistance.id,
                supplier_id: supplier.id,
                recipient_email: supplier.email,
                subject: 'Nova Assistência Atribuída',
                template_used: 'new_assistance_assignment',
                status: 'sent',
                metadata: {
                  assistance_title: assistance.title,
                  priority: assistance.priority,
                  building_name: building?.name,
                  intervention_type: interventionType?.name
                }
              });

              toast({
                title: "Sucesso",
                description: "Assistência criada e fornecedor notificado por email!",
              });
            }
          } else {
            toast({
              title: "Sucesso",
              description: "Assistência criada! Aviso: Fornecedor sem email configurado.",
              variant: "default",
            });
          }
        } catch (emailError) {
          console.error("Email sending error:", emailError);
          toast({
            title: "Sucesso com Aviso",
            description: "Assistência criada, mas houve erro ao enviar email de notificação.",
            variant: "default",
          });
        }
      } else {
        toast({
          title: "Sucesso",
          description: "Assistência criada com sucesso!",
        });
      }

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
                    <FormLabel>Fornecedor (opcional)</FormLabel>
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

            <FormField
              control={form.control}
              name="requires_quotation"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Solicitar Orçamento
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Marque esta opção se a assistência requer um orçamento do fornecedor antes da execução.
                    </p>
                  </div>
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value || false}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </FormControl>
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