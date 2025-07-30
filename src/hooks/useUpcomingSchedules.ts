import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type UpcomingSchedule = Tables<"assistances"> & {
  buildings?: Pick<Tables<"buildings">, "id" | "name">;
  suppliers?: Pick<Tables<"suppliers">, "id" | "name">;
  intervention_types?: Pick<Tables<"intervention_types">, "id" | "name">;
};

export const useUpcomingSchedules = () => {
  return useQuery({
    queryKey: ["upcoming-schedules"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from("assistances")
        .select(`
          *,
          buildings (id, name),
          suppliers (id, name),
          intervention_types (id, name)
        `)
        .not("scheduled_start_date", "is", null)
        .gte("scheduled_start_date", now)
        .lte("scheduled_start_date", sevenDaysFromNow)
        .order("scheduled_start_date", { ascending: true })
        .limit(5);

      if (error) throw error;
      return data as UpcomingSchedule[];
    },
  });
};