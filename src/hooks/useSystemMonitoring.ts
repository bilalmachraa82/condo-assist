import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SystemHealth {
  assistances: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
  };
  suppliers: {
    total: number;
    active: number;
    with_pending_responses: number;
  };
  quotations: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  recent_activity: any[];
  email_logs: {
    total_sent: number;
    recent_failures: number;
    success_rate: number;
  };
}

export const useSystemHealth = () => {
  return useQuery({
    queryKey: ["system-health"],
    queryFn: async (): Promise<SystemHealth> => {
      console.log("🔍 Fetching system health metrics...");
      
      try {
        // Fetch assistances data
        const { data: assistances, error: assistancesError } = await supabase
          .from("assistances")
          .select("status");
        
        if (assistancesError) {
          console.error("❌ Error fetching assistances:", assistancesError);
          throw assistancesError;
        }

        // Fetch suppliers data
        const { data: suppliers, error: suppliersError } = await supabase
          .from("suppliers")
          .select("is_active");
        
        if (suppliersError) {
          console.error("❌ Error fetching suppliers:", suppliersError);
          throw suppliersError;
        }

        // Fetch quotations data
        const { data: quotations, error: quotationsError } = await supabase
          .from("quotations")
          .select("status");
        
        if (quotationsError) {
          console.error("❌ Error fetching quotations:", quotationsError);
          throw quotationsError;
        }

        // Fetch recent activity
        const { data: activity, error: activityError } = await supabase
          .from("activity_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);
        
        if (activityError) {
          console.error("❌ Error fetching activity:", activityError);
          throw activityError;
        }

        // Fetch email logs
        const { data: emailLogs, error: emailError } = await supabase
          .from("email_logs")
          .select("status, sent_at");
        
        if (emailError) {
          console.error("❌ Error fetching email logs:", emailError);
          throw emailError;
        }

        // Calculate metrics
        const assistanceMetrics = {
          total: assistances?.length || 0,
          pending: assistances?.filter(a => a.status === 'pending').length || 0,
          in_progress: assistances?.filter(a => a.status === 'in_progress').length || 0,
          completed: assistances?.filter(a => a.status === 'completed').length || 0,
        };

        const supplierMetrics = {
          total: suppliers?.length || 0,
          active: suppliers?.filter(s => s.is_active).length || 0,
          with_pending_responses: 0, // Will calculate separately if needed
        };

        const quotationMetrics = {
          total: quotations?.length || 0,
          pending: quotations?.filter(q => q.status === 'pending').length || 0,
          approved: quotations?.filter(q => q.status === 'approved').length || 0,
          rejected: quotations?.filter(q => q.status === 'rejected').length || 0,
        };

        const emailMetrics = {
          total_sent: emailLogs?.length || 0,
          recent_failures: emailLogs?.filter(e => e.status === 'failed').length || 0,
          success_rate: emailLogs?.length ? 
            ((emailLogs.filter(e => e.status === 'sent').length / emailLogs.length) * 100) : 100,
        };

        const healthData = {
          assistances: assistanceMetrics,
          suppliers: supplierMetrics,
          quotations: quotationMetrics,
          recent_activity: activity || [],
          email_logs: emailMetrics,
        };

        console.log("✅ System health metrics calculated:", healthData);
        return healthData;

      } catch (error) {
        console.error("💥 Critical error in system health check:", error);
        throw error;
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useDebugInfo = () => {
  return useQuery({
    queryKey: ["debug-info"],
    queryFn: async () => {
      console.log("🔧 Collecting debug information...");
      
      const debugInfo = {
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        local_storage_size: JSON.stringify(localStorage).length,
        session_storage_size: JSON.stringify(sessionStorage).length,
        online_status: navigator.onLine,
        memory_usage: (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit,
        } : null,
      };

      console.log("🔧 Debug info collected:", debugInfo);
      return debugInfo;
    },
    refetchInterval: 60000, // Refresh every minute
  });
};