import { Database } from "@/integrations/supabase/types";

// Get valid assistance states from database types
export type AssistanceStatus = Database["public"]["Enums"]["assistance_status"];

// Valid assistance states from the database enum (simplified to 6 states)
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