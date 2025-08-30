
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Assistance } from "@/hooks/useAssistances";

interface AssistancePDFTemplateProps {
  assistance: Assistance;
}

export const AssistancePDFTemplate = ({ assistance }: AssistancePDFTemplateProps) => {
  const getStatusLabel = (status: string) => {
    const labels = {
      pending: "Pendente",
      in_progress: "Em Andamento", 
      completed: "Concluída",
      cancelled: "Cancelada"
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels = {
      low: "Baixa",
      normal: "Normal",
      high: "Alta",
      urgent: "Urgente"
    };
    return labels[priority as keyof typeof labels] || priority;
};

  const extractPostalCode = (address?: string) => {
    const match = address?.match(/\b\d{4}-\d{3}\b/);
    return match ? match[0] : null;
  };

  return (
    <div className="print-template max-w-4xl mx-auto p-8 bg-white text-black">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-300 pb-4">
        <img
          src="/lovable-uploads/logo-luvimg.png"
          alt="Logo"
          className="h-20 w-auto mx-auto mb-3 print:opacity-100"
        />
        <h1 className="text-2xl font-bold mb-2">Relatório de Assistência</h1>
        <p className="text-gray-600">
          Gerado em {format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}
        </p>
      </div>

      {/* Assistance Details */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="text-lg font-semibold mb-3 text-gray-800">Informações Gerais</h2>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Título:</span> {assistance.title}
            </div>
            <div>
              <span className="font-medium">Estado:</span> {getStatusLabel(assistance.status)}
            </div>
            <div>
              <span className="font-medium">Prioridade:</span> {getPriorityLabel(assistance.priority)}
            </div>
            <div>
              <span className="font-medium">Criado em:</span>{" "}
              {format(new Date(assistance.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
            </div>
            {assistance.completed_date && (
              <div>
                <span className="font-medium">Concluído em:</span>{" "}
                {format(new Date(assistance.completed_date), "dd/MM/yyyy HH:mm", { locale: pt })}
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3 text-gray-800">Detalhes Técnicos</h2>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Edifício:</span> {assistance.buildings?.name || "N/A"}
            </div>
            <div>
              <span className="font-medium">NIF do Condomínio:</span> {assistance.buildings?.nif || "N/A"}
            </div>
            <div>
              <span className="font-medium">Morada Completa:</span> {assistance.buildings?.address || "N/A"}
            </div>
            {assistance.buildings?.address && (
              <div>
                <span className="font-medium">Código Postal:</span> {extractPostalCode(assistance.buildings?.address) || "N/A"}
              </div>
            )}
            <div>
              <span className="font-medium">Tipo de Intervenção:</span>{" "}
              {assistance.intervention_types?.name || "N/A"}
            </div>
            <div>
              <span className="font-medium">Fornecedor:</span>{" "}
              {assistance.suppliers?.name || "Não atribuído"}
            </div>
            {assistance.estimated_cost && (
              <div>
                <span className="font-medium">Custo Estimado:</span> €{assistance.estimated_cost}
              </div>
            )}
            {assistance.final_cost && (
              <div>
                <span className="font-medium">Custo Final:</span> €{assistance.final_cost}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {assistance.description && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">Descrição</h2>
          <p className="text-gray-700 leading-relaxed">{assistance.description}</p>
        </div>
      )}


      {/* Supplier Notes */}
      {assistance.supplier_notes && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">Notas do Fornecedor</h2>
          <p className="text-gray-700 leading-relaxed">{assistance.supplier_notes}</p>
        </div>
      )}

      {/* Progress Notes */}
      {assistance.progress_notes && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">Notas de Progresso</h2>
          <p className="text-gray-700 leading-relaxed">{assistance.progress_notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-500">
        <div className="flex items-center justify-center gap-2">
          <img src="/lovable-uploads/logo-luvimg.png" alt="Logo" className="h-8 w-auto print:opacity-100" />
          <span className="font-medium text-gray-700">Luvimg</span>
        </div>
        <p className="mt-2">Este documento foi gerado automaticamente pelo sistema de gestão de assistências.</p>
      </div>
    </div>
  );
};
