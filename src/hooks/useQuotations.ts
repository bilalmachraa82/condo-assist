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
      queryClient.invalidateQueries({ queryKey: ["quotation-stats-dashboard"] });
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
      queryClient.invalidateQueries({ queryKey: ["quotation-stats-dashboard"] });
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
      queryClient.invalidateQueries({ queryKey: ["quotation-stats-dashboard"] });
      toast.success("Orçamento eliminado com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting quotation:", error);
      toast.error("Erro ao eliminar orçamento");
    },
  });
};

// Request quotation for assistance
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
      // First update the assistance
      const { data, error } = await supabase
        .from("assistances")
        .update({
          requires_quotation: true,
          quotation_requested_at: new Date().toISOString(),
          quotation_deadline: deadline,
          status: "awaiting_quotation",
        })
        .eq("id", assistanceId)
        .select(`
          *,
          suppliers:assigned_supplier_id(*),
          buildings(*)
        `)
        .single();

      if (error) throw error;

      // Send email to supplier if one is assigned
      if (data.assigned_supplier_id && data.suppliers) {
        try {
          await supabase.functions.invoke('request-quotation-email', {
            body: {
              assistance_id: assistanceId,
              supplier_id: data.assigned_supplier_id,
              supplier_email: data.suppliers.email,
              supplier_name: data.suppliers.name,
              assistance_title: data.title,
              assistance_description: data.description,
              building_name: data.buildings?.name || "N/A",
              deadline: deadline
            }
          });

          // Log the email
          await supabase.from("email_logs").insert({
            recipient_email: data.suppliers.email,
            subject: `Solicitação de Orçamento - ${data.title}`,
            status: "sent",
            assistance_id: assistanceId,
            supplier_id: data.assigned_supplier_id,
            template_used: "quotation_request"
          });
        } catch (emailError) {
          console.error("Error sending quotation request email:", emailError);
          // Don't fail the whole operation if email fails
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistances"] });
      queryClient.invalidateQueries({ queryKey: ["assistance-stats"] });
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["quotation-stats"] });
      queryClient.invalidateQueries({ queryKey: ["quotation-stats-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["quotation-requests"] });
      queryClient.invalidateQueries({ queryKey: ["quotation-requests-pending"] });
      toast.success("Orçamento solicitado e email enviado com sucesso!");
    },
    onError: (error) => {
      console.error("Error requesting quotation:", error);
      toast.error("Erro ao solicitar orçamento");
    },
  });
};