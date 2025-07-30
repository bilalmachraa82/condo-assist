import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type UrgentAlert = Tables<"assistances"> & {
  buildings?: Pick<Tables<"buildings">, "id" | "name">;
  intervention_types?: Pick<Tables<"intervention_types">, "id" | "name">;
};

export const useUrgentAlerts = () => {
  return useQuery({
    queryKey: ["urgent-alerts"],
    queryFn: async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from("assistances")
        .select(`
          *,
          buildings (id, name),
          intervention_types (id, name)
        `)
        .in("priority", ["urgent", "critical"])
        .in("status", ["pending", "awaiting_quotation"])
        .lt("created_at", twoHoursAgo)
        .order("created_at", { ascending: true })
        .limit(5);

      if (error) throw error;
      return data as UrgentAlert[];
    },
  });
};