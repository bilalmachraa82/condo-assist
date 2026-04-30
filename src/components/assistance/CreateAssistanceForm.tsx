import { useForm } from "react-hook-form";
import { useEffect, useState, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, AlertTriangle, RotateCcw, BellRing } from "lucide-react";
import { addDays, format } from "date-fns";
import { pt } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useBuildings } from "@/hooks/useBuildings";
import { useAllSuppliers } from "@/hooks/useSuppliers";
import { sendMagicCodeToSupplier } from "@/utils/sendMagicCode";
import { useAppSetting } from "@/hooks/useAppSettings";

const FORM_STORAGE_KEY = 'assistance_form_draft';

const assistanceSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  building_id: z.string().min(1, "Edifício é obrigatório"),
  intervention_type_id: z.string().min(1, "Tipo de intervenção é obrigatório"),
  priority: z.enum(["normal", "urgent", "critical"]),
  assigned_supplier_id: z.string().optional().or(z.literal("")),
  requires_quotation: z.boolean().optional(),
  reminder_preset: z.enum(["none", "1d", "3d", "7d", "14d", "custom"]).optional(),
  reminder_date: z.string().optional().or(z.literal("")),
  reminder_note: z.string().max(280, "Máximo 280 caracteres").optional().or(z.literal("")),
}).refine(
  (v) => v.reminder_preset !== "custom" || (v.reminder_date && v.reminder_date.length > 0),
  { message: "Escolhe uma data para o lembrete", path: ["reminder_date"] },
);

const REMINDER_PRESETS: { value: "none" | "1d" | "3d" | "7d" | "14d" | "custom"; label: string; days: number | null }[] = [
  { value: "none", label: "Sem lembrete", days: null },
  { value: "1d", label: "+1 dia", days: 1 },
  { value: "3d", label: "+3 dias", days: 3 },
  { value: "7d", label: "+1 semana", days: 7 },
  { value: "14d", label: "+2 semanas", days: 14 },
  { value: "custom", label: "Data personalizada", days: null },
];

function computeReminderDate(preset: string, customIso?: string): Date | null {
  const cfg = REMINDER_PRESETS.find(p => p.value === preset);
  if (!cfg || cfg.value === "none") return null;
  if (cfg.value === "custom") {
    if (!customIso) return null;
    const d = new Date(customIso);
    return isNaN(d.getTime()) ? null : d;
  }
  // Always trigger at 09:00 local time on the target day
  const target = addDays(new Date(), cfg.days ?? 0);
  target.setHours(9, 0, 0, 0);
  return target;
}

type AssistanceFormValues = z.infer<typeof assistanceSchema>;

interface CreateAssistanceFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateAssistanceForm({ onClose, onSuccess }: CreateAssistanceFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasDraft, setHasDraft] = useState(false);
  
  // Get email mode setting - default to 'admin_first' if not loaded or undefined
  const { data: emailModeSetting, isLoading: isLoadingEmailMode } = useAppSetting('email_mode');
  // Normalize the email mode value - handle various formats
  const emailMode = typeof emailModeSetting === 'string' 
    ? emailModeSetting.replace(/"/g, '').trim() 
    : (emailModeSetting ?? 'admin_first');
  
  console.log('[CreateAssistanceForm] Email mode setting:', { raw: emailModeSetting, normalized: emailMode, isLoading: isLoadingEmailMode });
  
  // Get data for dropdowns
  const { data: buildings = [] } = useBuildings();
  const { data: suppliers = [] } = useAllSuppliers();
  
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

  // Load saved draft from localStorage
  const getDefaultValues = useCallback(() => {
    try {
      const savedData = localStorage.getItem(FORM_STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        console.log('[CreateAssistanceForm] Restored draft from localStorage:', parsed);
        return parsed;
      }
    } catch (e) {
      console.error('[CreateAssistanceForm] Error loading draft:', e);
      localStorage.removeItem(FORM_STORAGE_KEY);
    }
    return {
      title: "",
      description: "",
      building_id: "",
      intervention_type_id: "",
      priority: "normal",
      assigned_supplier_id: "",
      requires_quotation: false,
      reminder_preset: "none" as const,
      reminder_date: "",
      reminder_note: "",
    };
  }, []);

  const form = useForm<AssistanceFormValues>({
    resolver: zodResolver(assistanceSchema),
    defaultValues: getDefaultValues(),
  });

  // Check if there's a saved draft on mount
  useEffect(() => {
    const savedData = localStorage.getItem(FORM_STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        // Check if draft has meaningful data
        if (parsed.title || parsed.description || parsed.building_id) {
          setHasDraft(true);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Auto-save form data to localStorage
  useEffect(() => {
    const subscription = form.watch((values) => {
      // Only save if there's meaningful data
      if (values.title || values.description || values.building_id) {
        localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(values));
        setHasDraft(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Clear draft handler
  const clearDraft = useCallback(() => {
    localStorage.removeItem(FORM_STORAGE_KEY);
    setHasDraft(false);
    form.reset({
      title: "",
      description: "",
      building_id: "",
      intervention_type_id: interventionTypes[0]?.id || "",
      priority: "normal",
      assigned_supplier_id: "",
      requires_quotation: false,
    });
    toast({
      title: "Rascunho limpo",
      description: "O formulário foi limpo com sucesso.",
    });
  }, [form, interventionTypes, toast]);

  // Set default intervention type when data loads
  useEffect(() => {
    if (interventionTypes.length > 0 && !form.getValues("intervention_type_id")) {
      form.setValue("intervention_type_id", interventionTypes[0].id);
    }
  }, [interventionTypes, form]);

  // Auto-pre-select elevator supplier from building when intervention is "elevador"
  const watchedBuildingId = form.watch("building_id");
  const watchedInterventionId = form.watch("intervention_type_id");
  const watchedSupplierId = form.watch("assigned_supplier_id");

  const selectedBuilding = buildings.find((b) => b.id === watchedBuildingId);
  const selectedIntervention = interventionTypes.find((i) => i.id === watchedInterventionId);
  const isElevatorIntervention = !!selectedIntervention?.name && /elevad/i.test(selectedIntervention.name);
  const buildingElevatorSupplierId = (selectedBuilding as any)?.elevator_supplier_id as string | null | undefined;
  const buildingElevatorSupplier = buildingElevatorSupplierId
    ? suppliers.find((s) => s.id === buildingElevatorSupplierId)
    : null;

  useEffect(() => {
    if (isElevatorIntervention && buildingElevatorSupplierId && !watchedSupplierId) {
      form.setValue("assigned_supplier_id", buildingElevatorSupplierId, { shouldDirty: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isElevatorIntervention, buildingElevatorSupplierId]);

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

      // Optional manual reminder — non-blocking
      const reminderDate = computeReminderDate(values.reminder_preset ?? "none", values.reminder_date);
      if (reminderDate && data?.id) {
        const { error: reminderErr } = await supabase
          .from("follow_up_schedules")
          .insert({
            assistance_id: data.id,
            follow_up_type: "manual_reminder",
            scheduled_for: reminderDate.toISOString(),
            status: "pending",
            priority: values.priority as any,
            metadata: {
              note: values.reminder_note || null,
              created_by_user: true,
              recipient: "geral@luvimg.com",
              preset: values.reminder_preset,
            },
          });
        if (reminderErr) console.error("[CreateAssistanceForm] reminder insert error:", reminderErr);
      }

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
          
          console.log('[CreateAssistanceForm] Processing email notification:', { 
            emailMode, 
            supplierId: assistance.assigned_supplier_id,
            supplierEmail: supplier?.email,
            assistanceId: assistance.id 
          });
          
          // Check email mode - if admin_first (or default), send PDF to admin instead
          // Use includes to handle any formatting issues with the setting value
          const isAdminFirstMode = emailMode === 'admin_first' || emailMode?.includes?.('admin_first') || !emailMode;
          
          if (isAdminFirstMode) {
            console.log('[CreateAssistanceForm] Using admin_first mode - sending PDF to admin');
            // Send PDF to admin for manual forwarding
            const pdfResponse = await supabase.functions.invoke('send-assistance-pdf-to-admin', {
              body: {
                assistanceId: assistance.id,
                mode: 'archive'
              }
            });

            console.log('[CreateAssistanceForm] PDF response:', pdfResponse);

            if (pdfResponse.error) {
              console.error("PDF email error:", pdfResponse.error);
              toast({
                title: "Sucesso com Aviso",
                description: "Assistência criada, mas houve erro ao enviar PDF para administração.",
                variant: "default",
              });
            } else {
              toast({
                title: "Sucesso",
                description: "Assistência criada! PDF enviado para geral@luvimg.com.",
              });
            }
          } else if (supplier?.email && supplier?.name) {
            console.log('[CreateAssistanceForm] Using direct mode - sending to supplier');
            // Direct mode - send to supplier
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
        // No supplier assigned. For elevator interventions, fall back to admin PDF
        // so the office can forward manually instead of silently doing nothing.
        const interventionType = interventionTypes.find(i => i.id === assistance.intervention_type_id);
        const isElevator = !!interventionType?.name && /elevad/i.test(interventionType.name);

        if (isElevator) {
          try {
            console.log('[CreateAssistanceForm] Elevator without supplier — sending PDF to admin as fallback');
            const pdfResponse = await supabase.functions.invoke('send-assistance-pdf-to-admin', {
              body: { assistanceId: assistance.id, mode: 'archive' },
            });
            if (pdfResponse.error) {
              console.error('[CreateAssistanceForm] Admin PDF fallback error:', pdfResponse.error);
              toast({
                title: 'Sucesso com Aviso',
                description: 'Assistência criada, mas falhou envio do PDF para administração. Atribui um fornecedor de elevador ao edifício.',
                variant: 'default',
              });
            } else {
              toast({
                title: 'Sucesso',
                description: 'Assistência criada. Sem fornecedor de elevador no edifício — PDF enviado para geral@luvimg.com.',
              });
            }
          } catch (err) {
            console.error('[CreateAssistanceForm] Admin PDF fallback exception:', err);
            toast({
              title: 'Sucesso com Aviso',
              description: 'Assistência criada, mas houve erro a notificar a administração.',
              variant: 'default',
            });
          }
        } else {
          toast({
            title: 'Sucesso',
            description: 'Assistência criada com sucesso!',
          });
        }
      }

      // Clear saved draft after successful submission
      localStorage.removeItem(FORM_STORAGE_KEY);
      setHasDraft(false);
      
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
        <div className="flex items-center gap-2">
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nova Assistência
          </CardTitle>
          {hasDraft && (
            <Badge variant="outline" className="text-xs">
              Rascunho restaurado
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {hasDraft && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearDraft}
              title="Limpar rascunho"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
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
                render={({ field }) => {
                  const selectedBuilding = buildings.find(b => b.id === field.value);
                  return (
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
                      {selectedBuilding && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Código do edifício: <span className="font-mono font-semibold">{selectedBuilding.code}</span>
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
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

            {/* Optional follow-up reminder */}
            <FormField
              control={form.control}
              name="reminder_preset"
              render={({ field }) => {
                const customDate = form.watch("reminder_date");
                const note = form.watch("reminder_note") ?? "";
                const previewDate = computeReminderDate(field.value ?? "none", customDate);
                return (
                  <FormItem className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <BellRing className="h-4 w-4 mt-0.5 text-amber-600" />
                      <div className="flex-1">
                        <FormLabel className="text-base">Lembrete de follow-up (opcional)</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Receberás um email em <span className="font-medium">geral@luvimg.com</span> na data escolhida para fazer follow-up deste caso.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {REMINDER_PRESETS.map((p) => (
                        <Button
                          key={p.value}
                          type="button"
                          size="sm"
                          variant={field.value === p.value ? "default" : "outline"}
                          onClick={() => {
                            field.onChange(p.value);
                            if (p.value === "custom" && !form.getValues("reminder_date")) {
                              const tomorrow = addDays(new Date(), 1);
                              tomorrow.setHours(9, 0, 0, 0);
                              // datetime-local format: yyyy-MM-ddTHH:mm
                              form.setValue("reminder_date", format(tomorrow, "yyyy-MM-dd'T'HH:mm"));
                            }
                          }}
                        >
                          {p.label}
                        </Button>
                      ))}
                    </div>

                    {field.value === "custom" && (
                      <FormField
                        control={form.control}
                        name="reminder_date"
                        render={({ field: dateField }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="datetime-local"
                                {...dateField}
                                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {field.value && field.value !== "none" && (
                      <FormField
                        control={form.control}
                        name="reminder_note"
                        render={({ field: noteField }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Nota (opcional)</FormLabel>
                            <FormControl>
                              <Textarea
                                {...noteField}
                                placeholder='ex.: "ligar ao síndico", "confirmar orçamento"'
                                rows={2}
                                maxLength={280}
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground text-right">{note.length}/280</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {previewDate && (
                      <div className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 rounded-md px-3 py-2">
                        🔔 Lembrete agendado para{" "}
                        <span className="font-semibold">
                          {format(previewDate, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: pt })}
                        </span>
                      </div>
                    )}
                  </FormItem>
                );
              }}
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