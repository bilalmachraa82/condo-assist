
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface FollowUpSchedule {
  id: string;
  assistance_id: string;
  supplier_id: string;
  follow_up_type: string;
  priority: string;
  scheduled_for: string;
  sent_at?: string;
  status: string;
  attempt_count: number;
  max_attempts: number;
  next_attempt_at?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface FollowUpWithDetails extends FollowUpSchedule {
  assistances?: {
    title: string;
    description?: string;
    buildings?: { name: string };
    intervention_types?: { name: string };
  };
  suppliers?: {
    name: string;
    email: string;
  };
}

export const useFollowUpSchedules = (filters?: {
  status?: string;
  follow_up_type?: string;
  priority?: string;
}) => {
  return useQuery({
    queryKey: ["follow-up-schedules", filters],
    queryFn: async () => {
      let query = supabase
        .from("follow_up_schedules")
        .select(`
          *,
          assistances (
            title,
            description,
            buildings (name),
            intervention_types (name)
          ),
          suppliers (
            name,
            email
          )
        `)
        .order("scheduled_for", { ascending: true });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      
      if (filters?.follow_up_type) {
        query = query.eq("follow_up_type", filters.follow_up_type);
      }
      
      if (filters?.priority) {
        query = query.eq("priority", filters.priority);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as FollowUpWithDetails[];
    },
  });
};

export const useFollowUpStats = () => {
  return useQuery({
    queryKey: ["follow-up-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follow_up_schedules")
        .select("status, follow_up_type, priority, scheduled_for");

      if (error) throw error;

      const now = new Date();
      const total = data.length;
      const pending = data.filter(f => f.status === 'pending').length;
      const sent = data.filter(f => f.status === 'sent').length;
      const failed = data.filter(f => f.status === 'failed').length;
      const overdue = data.filter(f => 
        f.status === 'pending' && new Date(f.scheduled_for) < now
      ).length;

      const byType = {
        quotation_reminder: data.filter(f => f.follow_up_type === 'quotation_reminder').length,
        date_confirmation: data.filter(f => f.follow_up_type === 'date_confirmation').length,
        work_reminder: data.filter(f => f.follow_up_type === 'work_reminder').length,
        completion_reminder: data.filter(f => f.follow_up_type === 'completion_reminder').length,
      };

      const byPriority = {
        critical: data.filter(f => f.priority === 'critical').length,
        urgent: data.filter(f => f.priority === 'urgent').length,
        normal: data.filter(f => f.priority === 'normal').length,
      };

      return {
        total,
        pending,
        sent,
        failed,
        overdue,
        byType,
        byPriority,
      };
    },
  });
};

export const useProcessFollowUps = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('process-followups');
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Follow-ups processados",
        description: `${data.processed} follow-ups enviados com sucesso!`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["follow-up-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["follow-up-stats"] });
      queryClient.invalidateQueries({ queryKey: ["assistances"] });
    },
    onError: (error: any) => {
      console.error("Process follow-ups error:", error);
      toast({
        title: "Erro",
        description: "Erro ao processar follow-ups. Tente novamente.",
        variant: "destructive",
      });
    },
  });
};

export const useCancelFollowUp = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (followUpId: string) => {
      const { error } = await supabase
        .from("follow_up_schedules")
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq("id", followUpId);

      if (error) throw error;
      return followUpId;
    },
    onSuccess: () => {
      toast({
        title: "Follow-up cancelado",
        description: "Follow-up cancelado com sucesso!",
      });
      
      queryClient.invalidateQueries({ queryKey: ["follow-up-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["follow-up-stats"] });
    },
    onError: (error: any) => {
      console.error("Cancel follow-up error:", error);
      toast({
        title: "Erro",
        description: "Erro ao cancelar follow-up. Tente novamente.",
        variant: "destructive",
      });
    },
  });
};

export const useRescheduleFollowUp = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      followUpId, 
      newDate 
    }: { 
      followUpId: string; 
      newDate: string 
    }) => {
      const { error } = await supabase
        .from("follow_up_schedules")
        .update({ 
          scheduled_for: newDate,
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq("id", followUpId);

      if (error) throw error;
      return { followUpId, newDate };
    },
    onSuccess: () => {
      toast({
        title: "Follow-up reagendado",
        description: "Follow-up reagendado com sucesso!",
      });
      
      queryClient.invalidateQueries({ queryKey: ["follow-up-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["follow-up-stats"] });
    },
    onError: (error: any) => {
      console.error("Reschedule follow-up error:", error);
      toast({
        title: "Erro",
        description: "Erro ao reagendar follow-up. Tente novamente.",
        variant: "destructive",
      });
    },
  });
};
