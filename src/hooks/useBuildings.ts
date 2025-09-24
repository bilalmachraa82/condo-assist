import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type Building = Tables<"buildings">;

export const useBuildings = () => {
  return useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buildings")
        .select("*")
        .order("code", { ascending: true });

      if (error) throw error;
      return data as Building[];
    },
  });
};

export const useBuildingStats = () => {
  return useQuery({
    queryKey: ["building-stats"],
    queryFn: async () => {
      // Get total count
      const { count: totalCount, error: totalError } = await supabase
        .from("buildings")
        .select("*", { count: "exact", head: true });

      if (totalError) throw totalError;

      // Get active/inactive counts
      const { data: statusData, error: statusError } = await supabase
        .from("buildings")
        .select("is_active");

      if (statusError) throw statusError;

      const active = statusData?.filter(b => b.is_active).length || 0;
      const inactive = statusData?.filter(b => !b.is_active).length || 0;

      // Get total assistance count
      const { count: assistanceCount, error: assistanceError } = await supabase
        .from("assistances")
        .select("*", { count: "exact", head: true });

      if (assistanceError) throw assistanceError;

      return {
        total: totalCount || 0,
        active,
        inactive,
        totalAssistances: assistanceCount || 0,
      };
    },
  });
};

export const useCreateBuilding = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (building: Omit<Building, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("buildings")
        .insert(building)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      queryClient.invalidateQueries({ queryKey: ["building-stats"] });
    },
  });
};

export const useUpdateBuilding = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Building> & { id: string }) => {
      console.log('Updating building:', { id, updates });
      
      const { data, error } = await supabase
        .from("buildings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating building:', error);
        throw error;
      }
      
      console.log('Building updated successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('Update mutation successful, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      queryClient.invalidateQueries({ queryKey: ["building-stats"] });
    },
    onError: (error) => {
      console.error('Update mutation failed:', error);
    },
  });
};

export const useDeleteBuilding = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("buildings")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      queryClient.invalidateQueries({ queryKey: ["building-stats"] });
    },
  });
};

export const useBuilding = (id: string) => {
  return useQuery({
    queryKey: ["building", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buildings")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Building | null;
    },
    enabled: !!id,
  });
};