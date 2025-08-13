
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export type Quotation = Tables<"quotations"> & {
  suppliers?: Tables<"suppliers">;
  assistances?: Tables<"assistances"> & {
    buildings?: Tables<"buildings">;
    intervention_types?: Tables<"intervention_types">;
  };
};

// Fetch all quotations with related data
export const useQuotations = () => {
  return useQuery({
    queryKey: ["quotations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotations")
        .select(`
          *,
          suppliers(*),
          assistances(
            *,
            buildings(*),
            intervention_types(*)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Quotation[];
    },
  });
};

// Fetch quotation statistics
export const useQuotationStats = () => {
  return useQuery({
    queryKey: ["quotation-stats"],
    queryFn: async () => {
      const { data: quotations, error } = await supabase
        .from("quotations")
        .select("status, amount");

      if (error) throw error;

      const total = quotations.length;
      const pending = quotations.filter(q => q.status === 'pending').length;
      const approved = quotations.filter(q => q.status === 'approved').length;
      const rejected = quotations.filter(q => q.status === 'rejected').length;
      const totalValue = quotations.reduce((sum, q) => sum + (Number(q.amount) || 0), 0);
      const averageValue = total > 0 ? totalValue / total : 0;

      return {
        total,
        pending,
        approved,
        rejected,
        totalValue,
        averageValue,
      };
    },
  });
};

// Fetch quotations by assistance ID
export const useQuotationsByAssistance = (assistanceId: string) => {
  return useQuery({
    queryKey: ["quotations", "assistance", assistanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotations")
        .select(`
          *,
          suppliers(*)
        `)
        .eq("assistance_id", assistanceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!assistanceId,
  });
};

// Create a new quotation
export const useCreateQuotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quotation: Omit<Tables<"quotations">, "id" | "created_at" | "approved_at">) => {
      const { data, error } = await supabase
        .from("quotations")
        .insert(quotation)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["quotation-stats"] });
      queryClient.invalidateQueries({ queryKey: ["assistances"] });
      toast.success("Orçamento criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating quotation:", error);
      toast.error("Erro ao criar orçamento");
    },
  });
};

// Update quotation status
export const useUpdateQuotationStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: "approved" | "rejected";
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("quotations")
        .update({
          status,
          notes,
          approved_at: status === "approved" ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      try {
        await supabase.from("activity_log").insert({
          action: "quotation_status_updated",
          details: `Orçamento ${status === "approved" ? "aprovado" : "rejeitado"}`,
          metadata: { quotation_id: id, status, notes },
        });
      } catch (e) {
        console.warn("Ignorando erro ao registar activity_log (provável RLS)", e);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["quotation-stats"] });
      queryClient.invalidateQueries({ queryKey: ["assistances"] });
      
      const statusText = data.status === "approved" ? "aprovado" : "rejeitado";
      toast.success(`Orçamento ${statusText} com sucesso!`);
    },
    onError: (error) => {
      console.error("Error updating quotation:", error);
      toast.error("Erro ao atualizar status do orçamento");
    },
  });
};

// Delete quotation
export const useDeleteQuotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quotationId: string) => {
      const { error } = await supabase
        .from("quotations")
        .delete()
        .eq("id", quotationId);

      if (error) throw error;
      return quotationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["quotation-stats"] });
      toast.success("Orçamento eliminado com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting quotation:", error);
      toast.error("Erro ao eliminar orçamento");
    },
  });
};

// Request quotation for assistance - COM VALIDAÇÃO MELHORADA
export const useRequestQuotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assistanceId,
      deadline,
    }: {
      assistanceId: string;
      deadline?: string;
    }) => {
      console.log("🔍 Iniciando solicitação de orçamento para assistência:", assistanceId);
      
      // Verificar primeiro se a assistência tem fornecedor atribuído
      const { data: assistance, error: fetchError } = await supabase
        .from("assistances")
        .select(`
          *,
          suppliers:assigned_supplier_id(*),
          buildings(*)
        `)
        .eq("id", assistanceId)
        .single();

      if (fetchError) {
        console.error("❌ Erro ao buscar assistência:", fetchError);
        throw new Error("Assistência não encontrada");
      }

      if (!assistance.assigned_supplier_id) {
        console.error("❌ Tentativa de solicitar orçamento sem fornecedor atribuído");
        throw new Error("É necessário atribuir um fornecedor antes de solicitar orçamento");
      }

      if (!assistance.suppliers) {
        console.error("❌ Fornecedor não encontrado para ID:", assistance.assigned_supplier_id);
        throw new Error("Fornecedor atribuído não foi encontrado");
      }

      if (!assistance.suppliers.email) {
        console.error("❌ Fornecedor sem email:", assistance.suppliers);
        throw new Error(`O fornecedor ${assistance.suppliers.name} não tem email configurado`);
      }

      console.log("✅ Validação passou - Fornecedor:", assistance.suppliers.name, "Email:", assistance.suppliers.email);

      // Atualizar a assistência
      const { data: updatedAssistance, error } = await supabase
        .from("assistances")
        .update({
          requires_quotation: true,
          quotation_requested_at: new Date().toISOString(),
          quotation_deadline: deadline,
          status: "awaiting_quotation",
        })
        .eq("id", assistanceId)
        .select()
        .single();

      if (error) {
        console.error("❌ Erro ao atualizar assistência:", error);
        throw new Error("Erro ao atualizar assistência");
      }

      console.log("✅ Assistência atualizada com sucesso");

      // Enviar email ao fornecedor
      try {
        console.log("📧 Enviando email de solicitação...");
        
        const { data: emailResponse, error: emailError } = await supabase.functions.invoke('request-quotation-email', {
          body: {
            assistance_id: assistanceId,
            supplier_id: assistance.assigned_supplier_id,
            supplier_email: assistance.suppliers.email,
            supplier_name: assistance.suppliers.name,
            assistance_title: assistance.title,
            assistance_description: assistance.description,
            building_name: assistance.buildings?.name || "N/A",
            deadline: deadline
          }
        });

        if (emailError) {
          console.error("❌ Erro ao enviar email:", emailError);
          // Não falhar a operação se o email falhar, mas registar o erro
          console.warn("Email falhou mas orçamento foi marcado como solicitado");
        } else {
          console.log("✅ Email enviado com sucesso:", emailResponse);
        }

        // Registar no log de emails
        try {
          await supabase.from("email_logs").insert({
            recipient_email: assistance.suppliers.email,
            subject: `Solicitação de Orçamento - ${assistance.title}`,
            status: emailError ? "failed" : "sent",
            assistance_id: assistanceId,
            supplier_id: assistance.assigned_supplier_id,
            template_used: "quotation_request",
            metadata: emailError ? { error: emailError.message } : null
          });
        } catch (logError) {
          console.warn("Erro ao registar email_log (ignorando):", logError);
        }

      } catch (emailError) {
        console.error("❌ Falha crítica no envio de email:", emailError);
        // Não falhar a operação principal
      }

      return updatedAssistance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistances"] });
      queryClient.invalidateQueries({ queryKey: ["assistance-stats"] });
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["quotation-requests"] });
      queryClient.invalidateQueries({ queryKey: ["quotation-requests-pending"] });
      toast.success("Orçamento solicitado com sucesso!");
    },
    onError: (error: any) => {
      console.error("❌ Erro final na solicitação de orçamento:", error);
      toast.error(error.message || "Erro ao solicitar orçamento");
    },
  });
};
