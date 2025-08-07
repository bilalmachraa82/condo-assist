import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CommunicationData {
  assistanceId: string;
  message: string;
  senderType: 'admin' | 'supplier';
  senderId?: string;
  messageType?: string;
}

export const useCommunicationLog = (assistanceId: string) => {
  return useQuery({
    queryKey: ["communication-log", assistanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("communications_log")
        .select("id, assistance_id, sender_type, sender_id, message_type, message, created_at")
        .eq("assistance_id", assistanceId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!assistanceId,
  });
};

export const useCreateCommunication = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CommunicationData) => {
      const { data: communication, error } = await supabase
        .from("communications_log")
        .insert({
          assistance_id: data.assistanceId,
          message: data.message,
          sender_type: data.senderType,
          sender_id: data.senderId,
          message_type: data.messageType || 'general'
        })
        .select()
        .single();

      if (error) throw error;
      return communication;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ["communication-log", data.assistance_id] 
      });
    },
    onError: (error: any) => {
      console.error("Error creating communication:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar comunicação. Tente novamente.",
        variant: "destructive",
      });
    },
  });
};