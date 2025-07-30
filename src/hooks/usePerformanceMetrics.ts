import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const usePerformanceMetrics = () => {
  return useQuery({
    queryKey: ["performance-metrics"],
    queryFn: async () => {
      // Get all assistances from last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: assistances, error } = await supabase
        .from("assistances")
        .select("*")
        .gte("created_at", thirtyDaysAgo);

      if (error) throw error;

      if (!assistances || assistances.length === 0) {
        return {
          averageResponseTime: 0,
          completionRate: 0,
          totalAssistances: 0,
          completedAssistances: 0,
        };
      }

      // Calculate metrics
      const completed = assistances.filter(a => a.status === "completed");
      const completionRate = (completed.length / assistances.length) * 100;

      // Calculate average response time (for assistances with suppliers assigned)
      const withSuppliers = assistances.filter(a => a.assigned_supplier_id);
      const responseTimes = withSuppliers.map(a => {
        if (a.actual_start_date && a.created_at) {
          return new Date(a.actual_start_date).getTime() - new Date(a.created_at).getTime();
        }
        return 0;
      }).filter(t => t > 0);

      const averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length / (1000 * 60 * 60) // Convert to hours
        : 0;

      return {
        averageResponseTime: Math.round(averageResponseTime * 10) / 10,
        completionRate: Math.round(completionRate * 10) / 10,
        totalAssistances: assistances.length,
        completedAssistances: completed.length,
      };
    },
  });
};