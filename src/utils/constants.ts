
// Status translations - COMPLETE COVERAGE FOR ALL STATUSES
export const STATUS_TRANSLATIONS = {
  pending: 'Pendente',
  awaiting_quotation: 'Aguardando Orçamento',
  quotation_received: 'Orçamento Recebido',
  accepted: 'Aceite',
  scheduled: 'Agendado',
  approved: 'Aprovado',
  in_progress: 'Em Progresso',
  awaiting_validation: 'Aguarda Validação',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  rejected: 'Rejeitado',
  sent_to_suppliers: 'Enviado aos Fornecedores',
  quotes_received: 'Orçamentos Recebidos',
  quote_approved: 'Orçamento Aprovado',
  awaiting_approval: 'Aguarda Aprovação',
  submitted: 'Submetido',
  expired: 'Expirado',
  quotation_approved: 'Orçamento Aprovado',
  quotation_rejected: 'Orçamento Rejeitado'
} as const;

export const PRIORITY_TRANSLATIONS = {
  low: 'Baixa',
  normal: 'Normal',
  urgent: 'Urgente',
  critical: 'Crítico'
} as const;

export const ACTION_TRANSLATIONS = {
  create: 'Criar',
  edit: 'Editar',
  delete: 'Eliminar',
  submit: 'Submeter',
  save: 'Guardar',
  cancel: 'Cancelar',
  approve: 'Aprovar',
  reject: 'Rejeitar',
  accept: 'Aceitar',
  decline: 'Recusar',
  start: 'Iniciar',
  complete: 'Concluir',
  update: 'Atualizar',
  upload: 'Carregar',
  download: 'Descarregar',
  export: 'Exportar',
  import: 'Importar',
  search: 'Pesquisar',
  filter: 'Filtrar',
  clear: 'Limpar',
  refresh: 'Atualizar',
  retry: 'Tentar Novamente'
} as const;

export const LOADING_MESSAGES = {
  default: 'A carregar...',
  saving: 'A guardar...',
  loading: 'A carregar dados...',
  uploading: 'A carregar ficheiro...',
  processing: 'A processar...',
  sending: 'A enviar...',
  updating: 'A atualizar...',
  deleting: 'A eliminar...',
  exporting: 'A exportar...',
  authenticating: 'A autenticar...'
} as const;

export const ERROR_MESSAGES = {
  generic: 'Ocorreu um erro inesperado',
  network: 'Erro de ligação. Verifique a sua ligação à internet.',
  validation: 'Dados inválidos. Verifique os campos preenchidos.',
  unauthorized: 'Não tem autorização para realizar esta ação',
  not_found: 'Registo não encontrado',
  server_error: 'Erro do servidor. Tente novamente mais tarde.',
  timeout: 'Tempo limite excedido. Tente novamente.',
  file_too_large: 'Ficheiro demasiado grande',
  invalid_file_type: 'Tipo de ficheiro não suportado',
  required_field: 'Este campo é obrigatório',
  invalid_email: 'Email inválido',
  weak_password: 'Password demasiado fraca',
  passwords_dont_match: 'As passwords não coincidem'
} as const;

export const SUCCESS_MESSAGES = {
  saved: 'Guardado com sucesso',
  updated: 'Atualizado com sucesso', 
  deleted: 'Eliminado com sucesso',
  sent: 'Enviado com sucesso',
  uploaded: 'Ficheiro carregado com sucesso',
  exported: 'Exportado com sucesso',
  approved: 'Aprovado com sucesso',
  rejected: 'Rejeitado com sucesso',
  created: 'Criado com sucesso',
  completed: 'Concluído com sucesso'
} as const;

// Helper functions
export const getStatusLabel = (status: keyof typeof STATUS_TRANSLATIONS) => {
  return STATUS_TRANSLATIONS[status] || status;
};

export const getPriorityLabel = (priority: keyof typeof PRIORITY_TRANSLATIONS) => {
  return PRIORITY_TRANSLATIONS[priority] || priority;
};

export const getActionLabel = (action: keyof typeof ACTION_TRANSLATIONS) => {
  return ACTION_TRANSLATIONS[action] || action;
};

// Status constants for consistency
export const CLOSED_ASSISTANCE_STATUSES = ['completed', 'cancelled'] as const;
export const OPEN_ASSISTANCE_STATUSES = [
  'pending', 'sent_to_suppliers', 'awaiting_quotation', 'quotation_received', 
  'quotes_received', 'quote_approved', 'awaiting_approval', 'accepted', 
  'scheduled', 'in_progress', 'awaiting_validation'
] as const;
