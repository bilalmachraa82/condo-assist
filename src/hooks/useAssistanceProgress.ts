import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AssistanceProgressData {
  assistanceId: string;
  supplierId?: string;
  progressType: "comment" | "photo" | "status_update" | "issue";
  title?: string;
  description?: string;
  photoUrls?: string[];
  metadata?: any;
}

export const useAssistanceProgress = (assistanceId: string) => {
  return useQuery({
    queryKey: ["assistance-progress", assistanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assistance_progress")
        .select(`
          *,
          suppliers (name)
        `)
        .eq("assistance_id", assistanceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!assistanceId,
  });
};

export const useCreateAssistanceProgress = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AssistanceProgressData) => {
      const { data: progress, error } = await supabase
        .from("assistance_progress")
        .insert({
          assistance_id: data.assistanceId,
          supplier_id: data.supplierId,
          progress_type: data.progressType,
          title: data.title,
          description: data.description,
          photo_urls: data.photoUrls,
          metadata: data.metadata
        })
        .select()
        .single();

      if (error) throw error;
      return progress;
    },
    onSuccess: (data) => {
      toast({
        title: "Progresso registado",
        description: "O progresso foi registado com sucesso.",
      });

      queryClient.invalidateQueries({ 
        queryKey: ["assistance-progress", data.assistance_id] 
      });
    },
    onError: (error: any) => {
      console.error("Error creating assistance progress:", error);
      toast({
        title: "Erro",
        description: "Erro ao registar progresso. Tente novamente.",
        variant: "destructive",
      });
    },
  });
};

export const useCanCompleteAssistance = (assistanceId: string) => {
  return useQuery({
    queryKey: ["can-complete-assistance", assistanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("can_complete_assistance", { assistance_id_param: assistanceId });

      if (error) throw error;
      return data;
    },
    enabled: !!assistanceId,
  });
};