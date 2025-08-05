import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Notification {
  id: string;
  assistance_id: string;
  supplier_id?: string;
  notification_type: 'reminder' | 'escalation' | 'info' | 'urgent_alert';
  priority: 'critical' | 'urgent' | 'normal';
  scheduled_for: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  reminder_count: number;
  metadata?: any;
  created_at: string;
  updated_at: string;
  assistances?: {
    title: string;
    status: string;
    buildings?: { name: string };
  };
  suppliers?: {
    name: string;
    email: string;
  };
}

export const useNotifications = () => {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          *,
          assistances (
            title,
            status,
            buildings (name)
          ),
          suppliers (name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as any;
    },
  });
};

export const useNotificationStats = () => {
  return useQuery({
    queryKey: ["notification-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("status, priority, notification_type");

      if (error) throw error;

      const stats = {
        total: data.length,
        pending: data.filter(n => n.status === 'pending').length,
        sent: data.filter(n => n.status === 'sent').length,
        failed: data.filter(n => n.status === 'failed').length,
        byPriority: {
          critical: data.filter(n => n.priority === 'critical').length,
          urgent: data.filter(n => n.priority === 'urgent').length,
          normal: data.filter(n => n.priority === 'normal').length,
        },
        byType: {
          reminder: data.filter(n => n.notification_type === 'reminder').length,
          escalation: data.filter(n => n.notification_type === 'escalation').length,
        }
      };

      return stats;
    },
  });
};

export const useProcessNotifications = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('process-notifications');
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-stats"] });
      
      toast({
        title: "Sucesso",
        description: `${data.processed} notificações processadas com sucesso!`,
      });
    },
    onError: (error: any) => {
      console.error("Error processing notifications:", error);
      toast({
        title: "Erro",
        description: "Erro ao processar notificações. Tente novamente.",
        variant: "destructive",
      });
    },
  });
};

export const useEscalatedAssistances = () => {
  return useQuery({
    queryKey: ["escalated-assistances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assistances")
        .select(`
          *,
          buildings (name, address),
          intervention_types (name),
          suppliers (name, email)
        `)
        .not("escalated_at", "is", null)
        .order("escalated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const useNotificationSchedule = (priority: 'critical' | 'urgent' | 'normal') => {
  return useQuery({
    queryKey: ["notification-schedule", priority],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('calculate_reminder_schedule', { assistance_priority: priority });

      if (error) throw error;
      return data;
    },
  });
};