
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SecurityEvent {
  id: string;
  action: string;
  details: string;
  metadata: any;
  user_id?: string;
  supplier_id?: string;
  assistance_id?: string;
  created_at: string;
}

export const useSecurityEvents = (limit = 50) => {
  return useQuery({
    queryKey: ["security-events", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .in("action", [
          "security_event",
          "magic_code_validation", 
          "magic_code_invalid",
          "magic_code_expired",
          "supplier_access_attempt",
          "login_failed",
          "session_expired"
        ])
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as SecurityEvent[];
    },
  });
};

export const useLogSecurityEvent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      action,
      details,
      metadata = {},
      assistanceId,
      supplierId
    }: {
      action: string;
      details: string;
      metadata?: any;
      assistanceId?: string;
      supplierId?: string;
    }) => {
      const { error } = await supabase
        .from("activity_log")
        .insert({
          action,
          details,
          metadata,
          assistance_id: assistanceId,
          supplier_id: supplierId,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-events"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao registrar evento de segurança.",
        variant: "destructive",
      });
    },
  });
};

export const useSecurityMetrics = () => {
  return useQuery({
    queryKey: ["security-metrics"],
    queryFn: async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Get failed login attempts in last 24h
      const { count: failedLogins } = await supabase
        .from("activity_log")
        .select("*", { count: "exact", head: true })
        .eq("action", "login_failed")
        .gte("created_at", yesterday.toISOString());

      // Get expired magic codes count
      const { count: expiredCodes } = await supabase
        .from("supplier_magic_codes")
        .select("*", { count: "exact", head: true })
        .lt("expires_at", new Date().toISOString());

      // Get active magic codes count
      const { count: activeCodes } = await supabase
        .from("supplier_magic_codes")
        .select("*", { count: "exact", head: true })
        .gt("expires_at", new Date().toISOString());

      // Get recent suspicious activities
      const { count: suspiciousActivities } = await supabase
        .from("activity_log")
        .select("*", { count: "exact", head: true })
        .in("action", ["magic_code_invalid", "supplier_access_attempt"])
        .gte("created_at", yesterday.toISOString());

      return {
        failedLogins: failedLogins || 0,
        expiredCodes: expiredCodes || 0,
        activeCodes: activeCodes || 0,
        suspiciousActivities: suspiciousActivities || 0,
      };
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
};
