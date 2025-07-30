import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export const useMonthlyAssistanceStats = () => {
  return useQuery({
    queryKey: ["monthly-assistance-stats"],
    queryFn: async () => {
      const monthsData = [];
      
      // Get data for last 6 months
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthStart = startOfMonth(monthDate).toISOString();
        const monthEnd = endOfMonth(monthDate).toISOString();
        
        // Get created assistances for this month
        const { data: created, error: createdError } = await supabase
          .from("assistances")
          .select("id")
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd);

        if (createdError) throw createdError;

        // Get completed assistances for this month
        const { data: completed, error: completedError } = await supabase
          .from("assistances")
          .select("id")
          .eq("status", "completed")
          .gte("completed_date", monthStart)
          .lte("completed_date", monthEnd);

        if (completedError) throw completedError;

        monthsData.push({
          month: format(monthDate, "MMM"),
          created: created?.length || 0,
          completed: completed?.length || 0,
        });
      }
      
      return monthsData;
    },
  });
};