import { Database } from "@/integrations/supabase/types";

// Temporary local type until database types are regenerated
export type AssistanceStatus = "pending" | "awaiting_quotation" | "quotation_rejected" | "in_progress" | "completed" | "cancelled";

// Get valid assistance states from database types (will be updated after migration)
// export type AssistanceStatus = Database["public"]["Enums"]["assistance_status"];

// Valid assistance states from the database enum (6 states now)
export const VALID_ASSISTANCE_STATES: AssistanceStatus[] = [
  "pending",
  "awaiting_quotation", 
  "quotation_rejected",
  "in_progress",
  "completed",
  "cancelled"
];

// Status translations aligned with database states
export const ASSISTANCE_STATUS_TRANSLATIONS: Record<AssistanceStatus, string> = {
  pending: "Pendente",
  awaiting_quotation: "Aguarda Orçamento",
  quotation_rejected: "Orçamento Rejeitado",
  in_progress: "Em Progresso",
  completed: "Concluída",
  cancelled: "Cancelada"
};

// Helper function to get status label
export const getAssistanceStatusLabel = (status: AssistanceStatus): string => {
  return ASSISTANCE_STATUS_TRANSLATIONS[status] || status;
};

// Common status groups for filtering
export const STATUS_GROUPS = {
  OPEN: [
    "pending",
    "awaiting_quotation",
    "quotation_rejected",
    "in_progress"
  ] as AssistanceStatus[],
  CLOSED: ["completed", "cancelled"] as AssistanceStatus[]
};

// Helper function to check if assistance is scheduled (derived from date)
export const isAssistanceScheduled = (assistance: any): boolean => {
  return !!(assistance.scheduled_start_date && 
           assistance.status !== 'in_progress' && 
           assistance.status !== 'completed' && 
           assistance.status !== 'cancelled');
};

// Helper function to get display status including derived "Agendado"
export const getDisplayStatus = (assistance: any): string => {
  if (isAssistanceScheduled(assistance)) {
    return "Agendado";
  }
  return getAssistanceStatusLabel(assistance.status);
};