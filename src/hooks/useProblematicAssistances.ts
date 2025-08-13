
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useProblematicAssistances = () => {
  return useQuery({
    queryKey: ["problematic-assistances"],
    queryFn: async () => {
      console.log("🔍 Procurando assistências problemáticas...");
      
      // Buscar assistências que têm requires_quotation = true mas sem fornecedor
      const { data: problematic, error } = await supabase
        .from("assistances")
        .select(`
          id,
          title,
          status,
          requires_quotation,
          assigned_supplier_id,
          quotation_requested_at,
          buildings (name),
          suppliers (name, email)
        `)
        .eq("requires_quotation", true)
        .is("assigned_supplier_id", null);

      if (error) {
        console.error("❌ Erro ao buscar assistências problemáticas:", error);
        throw error;
      }

      console.log(`📊 Encontradas ${problematic?.length || 0} assistências problemáticas`);
      
      return problematic || [];
    },
  });
};

export const useFixProblematicAssistance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      assistanceId, 
      action 
    }: { 
      assistanceId: string; 
      action: "remove_quotation_requirement" | "reset_status";
    }) => {
      console.log(`🔧 Corrigindo assistência ${assistanceId} com ação: ${action}`);

      let updateData: any = {};

      if (action === "remove_quotation_requirement") {
        updateData = {
          requires_quotation: false,
          quotation_requested_at: null,
          quotation_deadline: null,
          status: "pending"
        };
      } else if (action === "reset_status") {
        updateData = {
          status: "pending"
        };
      }

      const { data, error } = await supabase
        .from("assistances")
        .update(updateData)
        .eq("id", assistanceId)
        .select()
        .single();

      if (error) {
        console.error("❌ Erro ao corrigir assistência:", error);
        throw error;
      }

      console.log("✅ Assistência corrigida com sucesso");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["problematic-assistances"] });
      queryClient.invalidateQueries({ queryKey: ["assistances"] });
      toast.success("Assistência corrigida com sucesso!");
    },
    onError: (error: any) => {
      console.error("❌ Erro ao corrigir assistência:", error);
      toast.error("Erro ao corrigir assistência");
    },
  });
};
