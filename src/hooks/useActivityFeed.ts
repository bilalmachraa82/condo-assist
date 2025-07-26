import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type ActivityLog = Tables<"activity_log"> & {
  assistances?: Pick<Tables<"assistances">, "id" | "title">;
  suppliers?: Pick<Tables<"suppliers">, "id" | "name">;
};

export const useActivityFeed = (limit = 10) => {
  return useQuery({
    queryKey: ["activity-feed", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select(`
          *,
          assistances (id, title),
          suppliers (id, name)
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ActivityLog[];
    },
  });
};