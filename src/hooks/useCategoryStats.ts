import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useCategoryStats = () => {
  return useQuery({
    queryKey: ["category-stats"],
    queryFn: async () => {
      // Get all intervention types
      const { data: interventionTypes, error: typesError } = await supabase
        .from("intervention_types")
        .select("id, name, category");

      if (typesError) throw typesError;

      if (!interventionTypes || interventionTypes.length === 0) {
        return [];
      }

      const categoryData = [];

      for (const type of interventionTypes) {
        // Get total assistances for this intervention type
        const { data: total, error: totalError } = await supabase
          .from("assistances")
          .select("id")
          .eq("intervention_type_id", type.id);

        if (totalError) throw totalError;

        // Get completed assistances for this intervention type
        const { data: completed, error: completedError } = await supabase
          .from("assistances")
          .select("id")
          .eq("intervention_type_id", type.id)
          .eq("status", "completed");

        if (completedError) throw completedError;

        if (total && total.length > 0) {
          categoryData.push({
            category: type.name,
            total: total.length,
            completed: completed?.length || 0,
          });
        }
      }

      return categoryData.sort((a, b) => b.total - a.total);
    },
  });
};