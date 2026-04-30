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

export interface PendencyReminderWithDetails extends PendencyReminder {
  email_pendencies?: {
    id: string;
    title: string;
    status: string;
    priority: string;
    building_id: string | null;
    supplier_id: string | null;
    assistance_id: string | null;
    buildings?: { code: string | null; name: string } | null;
    suppliers?: { name: string } | null;
    assistances?: { assistance_number: number | null; title: string } | null;
  } | null;
}

export function useAllPendencyReminders(filters?: { status?: string; reminder_type?: string }) {
  return useQuery({
    queryKey: ["pendency-reminders-all", filters],
    queryFn: async () => {
      let q = supabase
        .from("pendency_reminders")
        .select(
          `*, email_pendencies:pendency_id (
            id, title, status, priority, building_id, supplier_id, assistance_id,
            buildings:building_id (code, name),
            suppliers:supplier_id (name),
            assistances:assistance_id (assistance_number, title)
          )`
        )
        .order("scheduled_for", { ascending: true })
        .limit(500);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.reminder_type) q = q.eq("reminder_type", filters.reminder_type);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as PendencyReminderWithDetails[];
    },
    refetchInterval: 60_000,
  });
}

export function usePendencyRemindersStats() {
  return useQuery({
    queryKey: ["pendency-reminders-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pendency_reminders")
        .select("status, scheduled_for")
        .limit(2000);
      if (error) throw error;
      const now = new Date();
      const rows = data ?? [];
      const stats = {
        total: rows.length,
        pending: 0,
        sent: 0,
        failed: 0,
        cancelled: 0,
        overdue: 0,
        due_now: 0,
      };
      for (const r of rows as any[]) {
        if (r.status === "pending") {
          stats.pending++;
          const ts = new Date(r.scheduled_for);
          if (ts < now) stats.overdue++;
          if (ts <= now) stats.due_now++;
        } else if (r.status === "sent") stats.sent++;
        else if (r.status === "failed") stats.failed++;
        else if (r.status === "cancelled") stats.cancelled++;
      }
      return stats;
    },
    refetchInterval: 60_000,
  });
}

export function useTriggerPendencyReminders() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("pendency-reminders-cron", {
        body: { manual: true },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["pendency-reminders-all"] });
      qc.invalidateQueries({ queryKey: ["pendency-reminders-stats"] });
      qc.invalidateQueries({ queryKey: ["pendency-reminders"] });
      toast({
        title: "Lembretes processados",
        description: data?.processed != null ? `${data.processed} processados` : undefined,
      });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useCancelPendencyReminder() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id }: { id: string; pendencyId?: string }) => {
      const { error } = await supabase
        .from("pendency_reminders")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      if (vars.pendencyId) qc.invalidateQueries({ queryKey: ["pendency-reminders", vars.pendencyId] });
      qc.invalidateQueries({ queryKey: ["pendency-reminders-all"] });
      qc.invalidateQueries({ queryKey: ["pendency-reminders-stats"] });
      toast({ title: "Lembrete cancelado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}
