import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type InterventionType = Tables<"intervention_types">;

export const useInterventionTypes = () => {
  return useQuery({
    queryKey: ["intervention-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intervention_types")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as InterventionType[];
    },
  });
};

export const useCreateInterventionType = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (interventionType: Omit<InterventionType, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("intervention_types")
        .insert(interventionType)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intervention-types"] });
    },
  });
};

export const useUpdateInterventionType = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InterventionType> & { id: string }) => {
      const { data, error } = await supabase
        .from("intervention_types")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intervention-types"] });
    },
  });
};

export const useDeleteInterventionType = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("intervention_types")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intervention-types"] });
    },
  });
};