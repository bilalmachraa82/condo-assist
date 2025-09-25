import { Database } from "@/integrations/supabase/types";

// Get valid assistance states from database types
export type AssistanceStatus = Database["public"]["Enums"]["assistance_status"];

// Valid assistance states from the database enum
export const VALID_ASSISTANCE_STATES: AssistanceStatus[] = [
  "pending",
  "sent_to_suppliers",
  "awaiting_quotation", 
  "quotation_received",
  "quotes_received",
  "quote_approved",
  "quotation_approved",
  "quotation_rejected",
  "awaiting_approval",
  "accepted",
  "scheduled",
  "in_progress",
  "awaiting_validation",
  "completed",
  "cancelled"
];

// Status translations aligned with database states
export const ASSISTANCE_STATUS_TRANSLATIONS: Record<AssistanceStatus, string> = {
  pending: "Pendente",
  sent_to_suppliers: "Enviado aos Fornecedores",
  awaiting_quotation: "Aguardando Orçamento",
  quotation_received: "Orçamento Recebido", 
  quotes_received: "Orçamentos Recebidos",
  quote_approved: "Orçamento Aprovado",
  quotation_approved: "Orçamento Aprovado",
  quotation_rejected: "Orçamento Rejeitado",
  awaiting_approval: "Aguarda Aprovação",
  accepted: "Aceite",
  scheduled: "Agendado",
  in_progress: "Em Progresso",
  awaiting_validation: "Aguarda Validação", 
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
    "sent_to_suppliers", 
    "awaiting_quotation",
    "quotation_received",
    "quotes_received",
    "quote_approved",
    "quotation_approved", 
    "awaiting_approval",
    "accepted",
    "scheduled",
    "in_progress",
    "awaiting_validation"
  ] as AssistanceStatus[],
  CLOSED: ["completed", "cancelled"] as AssistanceStatus[]
};