import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

export type Assistance = Tables<"assistances"> & {
  buildings?: Tables<"buildings">;
  suppliers?: Tables<"suppliers">;
  intervention_types?: Tables<"intervention_types">;
};

export const useAssistances = () => {
  return useQuery({
    queryKey: ["assistances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assistances")
        .select(`
          *,
          buildings (id, name, code),
          suppliers (id, name),
          intervention_types (id, name, category)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Assistance[];
    },
  });
};

export const useAssistanceStats = () => {
  return useQuery({
    queryKey: ["assistance-stats"],
    queryFn: async () => {
      // Get total count
      const { count: totalCount, error: totalError } = await supabase
        .from("assistances")
        .select("*", { count: "exact", head: true });

      if (totalError) throw totalError;

      // Get counts by status
      const { data: statusData, error: statusError } = await supabase
        .from("assistances")
        .select("status");

      if (statusError) throw statusError;
      
      const counts = {
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
      };

      statusData?.forEach((item) => {
        counts[item.status as keyof typeof counts]++;
      });

      return {
        total: totalCount || 0,
        ...counts,
      };
    },
  });
};

export const useCreateAssistance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assistance: Omit<Tables<"assistances">, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("assistances")
        .insert(assistance)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistances"] });
      queryClient.invalidateQueries({ queryKey: ["assistance-stats"] });
    },
  });
};

export const useUpdateAssistance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Tables<"assistances">> & { id: string }) => {
      const { data, error } = await supabase
        .from("assistances")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistances"] });
      queryClient.invalidateQueries({ queryKey: ["assistance-stats"] });
    },
  });
};

export const useDeleteAssistance = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("assistances")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistances"] });
      queryClient.invalidateQueries({ queryKey: ["assistance-stats"] });
      queryClient.invalidateQueries({ queryKey: ["activity-log"] });
      toast({
        title: "Assistência eliminada",
        description: "A assistência foi eliminada com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error("Delete assistance error:", error);
      toast({
        title: "Erro",
        description: "Erro ao eliminar assistência. Verifique as suas permissões.",
        variant: "destructive",
      });
    },
  });
};

export const useAssistance = (id: string) => {
  return useQuery({
    queryKey: ["assistance", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assistances")
        .select(`
          *,
          buildings(name, code),
          suppliers(name),
          intervention_types(name)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

export const useUpdateAssistanceStatus = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      assistanceId, 
      newStatus, 
      supplierNotes 
    }: { 
      assistanceId: string; 
      newStatus: string; 
      supplierNotes?: string;
    }) => {
      // Update the assistance status directly
      const updateData: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (supplierNotes) {
        updateData.supplier_notes = supplierNotes;
      }

      if (newStatus === 'completed') {
        updateData.completed_date = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("assistances")
        .update(updateData)
        .eq("id", assistanceId)
        .select(`
          *,
          buildings (id, name, code),
          suppliers (id, name, email),
          intervention_types (id, name, category)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Status atualizado",
        description: `Assistência marcada como ${getStatusLabel(data.status)}`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["assistances"] });
      queryClient.invalidateQueries({ queryKey: ["assistance-stats"] });
      queryClient.invalidateQueries({ queryKey: ["assistance", data.id] });
    },
    onError: (error: any) => {
      console.error("Update status error:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status. Tente novamente.",
        variant: "destructive",
      });
    },
  });
};

const getStatusLabel = (status: string) => {
  const labels = {
    pending: "pendente",
    in_progress: "em progresso", 
    completed: "concluída",
    cancelled: "cancelada"
  };
  return labels[status as keyof typeof labels] || status;
};