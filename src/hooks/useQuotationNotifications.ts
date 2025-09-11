import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useQuotationNotifications = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Listen for new quotations
    const quotationChannel = supabase
      .channel('quotation-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quotations'
        },
        (payload) => {
          console.log('New quotation received:', payload);
          
          // Invalidate quotation queries
          queryClient.invalidateQueries({ queryKey: ["quotations"] });
          queryClient.invalidateQueries({ queryKey: ["all-quotations"] });
          queryClient.invalidateQueries({ queryKey: ["quotation-stats"] });
          queryClient.invalidateQueries({ queryKey: ["quotation-stats-dashboard"] });
          queryClient.invalidateQueries({ queryKey: ["quotation-requests"] });
          queryClient.invalidateQueries({ queryKey: ["pending-quotation-requests"] });
          
          // Show notification
          toast.success("Novo orçamento recebido!", {
            description: "Um fornecedor submeteu um novo orçamento para revisão."
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quotations'
        },
        (payload) => {
          console.log('Quotation updated:', payload);
          
          // Invalidate quotation queries
          queryClient.invalidateQueries({ queryKey: ["quotations"] });
          queryClient.invalidateQueries({ queryKey: ["all-quotations"] });
          queryClient.invalidateQueries({ queryKey: ["quotation-stats"] });
          queryClient.invalidateQueries({ queryKey: ["quotation-stats-dashboard"] });
          
          // Show notification for status changes
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          
          if (oldRecord.status !== newRecord.status) {
            const statusText = newRecord.status === "approved" ? "aprovado" : "rejeitado";
            toast.info(`Orçamento ${statusText}`, {
              description: `O orçamento foi ${statusText} com sucesso.`
            });
          }
        }
      )
      .subscribe();

    // Listen for quotation requests on assistances
    const assistanceChannel = supabase
      .channel('assistance-quotation-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'assistances'
        },
        (payload) => {
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          
          // Check if quotation was requested
          if (!oldRecord.requires_quotation && newRecord.requires_quotation) {
            console.log('Quotation requested for assistance:', payload);
            
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: ["assistances"] });
            queryClient.invalidateQueries({ queryKey: ["quotation-requests"] });
            queryClient.invalidateQueries({ queryKey: ["pending-quotation-requests"] });
            queryClient.invalidateQueries({ queryKey: ["quotation-stats-dashboard"] });
            
            toast.info("Orçamento solicitado", {
              description: "Uma solicitação de orçamento foi enviada ao fornecedor."
            });
          }
          
          // Check if status changed to awaiting_quotation
          if (oldRecord.status !== newRecord.status && newRecord.status === 'awaiting_quotation') {
            queryClient.invalidateQueries({ queryKey: ["assistance-stats"] });
            queryClient.invalidateQueries({ queryKey: ["quotation-stats-dashboard"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(quotationChannel);
      supabase.removeChannel(assistanceChannel);
    };
  }, [queryClient]);
};