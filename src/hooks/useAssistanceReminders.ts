import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AssistanceReminder {
  scheduledFor: string;
  note?: string;
}

/**
 * Returns a Map<assistanceId, AssistanceReminder> with the next pending
 * manual reminder per assistance (scheduled_for >= now).
 */
export function useAssistanceReminders() {
  return useQuery({
    queryKey: ["assistance-reminders"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("follow_up_schedules")
        .select("assistance_id, scheduled_for, metadata")
        .eq("follow_up_type", "manual_reminder")
        .eq("status", "pending")
        .gte("scheduled_for", nowIso)
        .order("scheduled_for", { ascending: true });

      if (error) throw error;

      const map = new Map<string, AssistanceReminder>();
      for (const row of data ?? []) {
        if (!row.assistance_id || map.has(row.assistance_id)) continue;
        const meta = (row.metadata ?? {}) as { note?: string };
        map.set(row.assistance_id, {
          scheduledFor: row.scheduled_for,
          note: meta.note,
        });
      }
      return map;
    },
    staleTime: 60_000,
  });
}
