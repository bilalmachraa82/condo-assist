import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PendencyReminder {
  id: string;
  pendency_id: string;
  reminder_type: "manual" | "sla_auto";
  scheduled_for: string;
  status: "pending" | "sent" | "cancelled" | "failed";
  attempt_count: number;
  max_attempts: number;
  sent_at: string | null;
  note: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function usePendencyReminders(pendencyId: string | null) {
  return useQuery({
    queryKey: ["pendency-reminders", pendencyId],
    enabled: !!pendencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pendency_reminders")
        .select("*")
        .eq("pendency_id", pendencyId!)
        .order("scheduled_for", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PendencyReminder[];
    },
  });
}

export function useCreatePendencyReminder() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: {
      pendency_id: string;
      scheduled_for: string;
      note?: string | null;
      max_attempts?: number;
      reminder_type?: "manual" | "sla_auto";
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("pendency_reminders")
        .insert({
          pendency_id: input.pendency_id,
          scheduled_for: input.scheduled_for,
          note: input.note ?? null,
          max_attempts: input.max_attempts ?? 3,
          reminder_type: input.reminder_type ?? "manual",
          created_by: u.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["pendency-reminders", vars.pendency_id] });
      toast({ title: "Lembrete agendado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useCancelPendencyReminder() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id }: { id: string; pendencyId: string }) => {
      const { error } = await supabase
        .from("pendency_reminders")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["pendency-reminders", vars.pendencyId] });
      toast({ title: "Lembrete cancelado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}
