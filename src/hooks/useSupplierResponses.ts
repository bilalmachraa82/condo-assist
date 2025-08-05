import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

export type SupplierResponse = Tables<"supplier_responses">;

export const useSupplierResponses = (assistanceId?: string) => {
  return useQuery({
    queryKey: ["supplier-responses", assistanceId],
    queryFn: async () => {
      const query = supabase
        .from("supplier_responses")
        .select(`
          *,
          assistances (id, title, priority),
          suppliers (id, name, email)
        `)
        .order("created_at", { ascending: false });

      if (assistanceId) {
        query.eq("assistance_id", assistanceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (SupplierResponse & {
        assistances?: { id: string; title: string; priority: string };
        suppliers?: { id: string; name: string; email: string };
      })[];
    },
    enabled: !!assistanceId,
  });
};

export interface CreateSupplierResponseData {
  assistanceId: string;
  supplierId: string;
  responseType: "accepted" | "declined";
  declineReason?: string;
  estimatedCompletionDate?: string;
  notes?: string;
  scheduledStartDate?: string;
  scheduledEndDate?: string;
  estimatedDurationHours?: number;
  responseComments?: string;
}

export const useCreateSupplierResponse = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSupplierResponseData) => {
      // Create supplier response
      const { data: responseData, error: responseError } = await supabase
        .from("supplier_responses")
        .insert({
          assistance_id: data.assistanceId,
          supplier_id: data.supplierId,
          response_type: data.responseType,
          response_date: new Date().toISOString(),
          decline_reason: data.declineReason,
          estimated_completion_date: data.estimatedCompletionDate,
          notes: data.notes,
          scheduled_start_date: data.scheduledStartDate,
          scheduled_end_date: data.scheduledEndDate,
          estimated_duration_hours: data.estimatedDurationHours,
          response_comments: data.responseComments
        })
        .select()
        .single();

      if (responseError) throw responseError;

      // Update assistance status based on response
      let newStatus = "pending";
      let updateData: any = { 
        updated_at: new Date().toISOString(),
        supplier_notes: data.notes 
      };

      if (data.responseType === "accepted") {
        newStatus = data.scheduledStartDate ? "scheduled" : "accepted";
        updateData = {
          ...updateData,
          status: newStatus,
          scheduled_start_date: data.scheduledStartDate,
          scheduled_end_date: data.scheduledEndDate,
          estimated_duration_hours: data.estimatedDurationHours
        };
      } else if (data.responseType === "declined") {
        newStatus = "pending"; // Reset to pending so admin can reassign
        updateData = { 
          ...updateData,
          status: newStatus, 
          assigned_supplier_id: null 
        };
      }

      const { error: assistanceError } = await supabase
        .from("assistances")
        .update(updateData)
        .eq("id", data.assistanceId);

      if (assistanceError) throw assistanceError;

      // Send notification about the response
      try {
        await supabase.functions.invoke('send-supplier-response-notification', {
          body: {
            assistanceId: data.assistanceId,
            supplierId: data.supplierId,
            responseType: data.responseType,
            responseData: data
          }
        });
      } catch (emailError) {
        console.error('Response notification email error:', emailError);
        // Don't fail the whole operation if email fails
      }

      return responseData;
    },
    onSuccess: (data) => {
      const responseTypeLabel = data.response_type === 'accepted' ? 'aceite' : 'recusada';
      toast({
        title: "Resposta enviada",
        description: data.response_type === "accepted" 
          ? "Assistência aceita com sucesso!" 
          : "Assistência recusada. Obrigado pela resposta.",
      });

      queryClient.invalidateQueries({ queryKey: ["supplier-responses"] });
      queryClient.invalidateQueries({ queryKey: ["assistances"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-assistances"] });
    },
    onError: (error: any) => {
      console.error("Create supplier response error:", error);
      toast({
        title: "Erro",
        description: "Erro ao registar resposta. Tente novamente.",
        variant: "destructive",
      });
    },
  });
};

export const useFollowUpAssistances = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assistanceIds: string[]) => {
      const results = [];
      
      for (const assistanceId of assistanceIds) {
        try {
          // Check if follow-up is needed
          const { data: needsFollowUp, error: checkError } = await supabase
            .rpc('assistance_needs_followup', { assistance_id: assistanceId });

          if (checkError) {
            console.error(`Error checking follow-up for ${assistanceId}:`, checkError);
            continue;
          }

          if (!needsFollowUp) {
            continue;
          }

          // Send follow-up email
          const { error: emailError } = await supabase.functions.invoke('send-follow-up-email', {
            body: { assistanceId }
          });

          if (emailError) {
            console.error(`Error sending follow-up for ${assistanceId}:`, emailError);
            continue;
          }

          // Update follow-up count using RPC or direct update
          const { data: currentAssistance, error: fetchError } = await supabase
            .from("assistances")
            .select("follow_up_count")
            .eq("id", assistanceId)
            .single();

          if (fetchError) {
            console.error(`Error fetching assistance ${assistanceId}:`, fetchError);
            continue;
          }

          const { error: updateError } = await supabase
            .from("assistances")
            .update({
              follow_up_count: (currentAssistance.follow_up_count || 0) + 1,
              last_follow_up_sent: new Date().toISOString()
            })
            .eq("id", assistanceId);

          if (updateError) {
            console.error(`Error updating follow-up count for ${assistanceId}:`, updateError);
            continue;
          }

          results.push({ assistanceId, success: true });
        } catch (error) {
          console.error(`Error processing follow-up for ${assistanceId}:`, error);
          results.push({ assistanceId, success: false, error });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;

      if (successCount > 0) {
        toast({
          title: "Follow-ups enviados",
          description: `${successCount} de ${totalCount} follow-ups enviados com sucesso!`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["assistances"] });
    },
    onError: (error: any) => {
      console.error("Follow-up error:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar follow-ups. Tente novamente.",
        variant: "destructive",
      });
    },
  });
};