import { useQuery } from "@tanstack/react-query";
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