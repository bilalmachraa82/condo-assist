import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

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