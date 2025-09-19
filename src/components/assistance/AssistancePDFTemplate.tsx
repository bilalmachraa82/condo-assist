
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Assistance } from "@/hooks/useAssistances";
import { STATUS_TRANSLATIONS, PRIORITY_TRANSLATIONS } from "@/utils/constants";

interface AssistancePDFTemplateProps {
  assistance: Assistance;
}

export const AssistancePDFTemplate = ({ assistance }: AssistancePDFTemplateProps) => {
  const getStatusLabel = (status: string) => {
    return STATUS_TRANSLATIONS[status as keyof typeof STATUS_TRANSLATIONS] || status;
  };

  const getPriorityLabel = (priority: string) => {
    return PRIORITY_TRANSLATIONS[priority as keyof typeof PRIORITY_TRANSLATIONS] || priority;
  };

  const extractPostalCode = (address?: string) => {
    if (!address) return null;
    
    // Try multiple formats for Portuguese postal codes
    const patterns = [
      /\b\d{4}[-\s]\d{3}\b/,           // 1234-567 or 1234 567
      /\b\d{4}\d{3}\b/,               // 1234567 (without separator)
      /(\d{4})[-\s]?(\d{3})/          // More flexible pattern
    ];
    
    for (const pattern of patterns) {
      const match = address.match(pattern);
      if (match) {
        // Format as standard Portuguese postal code
        const fullMatch = match[0];
        if (fullMatch.includes('-') || fullMatch.includes(' ')) {
          return fullMatch;
        } else if (fullMatch.length === 7) {
          // Insert dash for format 1234567 -> 1234-567
          return fullMatch.substring(0, 4) + '-' + fullMatch.substring(4);
        } else if (match[1] && match[2]) {
          return match[1] + '-' + match[2];
        }
        return fullMatch;
      }
    }
    
    return null;
  };

  return (
    <div className="print-template max-w-4xl mx-auto p-8 bg-white text-black">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-300 pb-4">
        <img
          src="/lovable-uploads/logo-luvimg.png"
          alt="Logo Luvimg"
          className="h-32 w-auto mx-auto mb-3 print:opacity-100"
        />
        <h1 className="text-2xl font-bold mb-2">Relatório de Assistência #{assistance.assistance_number || 'N/A'}</h1>
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
              <span className="font-medium">Número da Assistência:</span> #{assistance.assistance_number || 'N/A'}
            </div>
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
        <div className="flex items-center justify-center gap-3">
          <img src="/lovable-uploads/logo-luvimg.png" alt="Logo Luvimg Condomínios" className="h-24 w-auto print:opacity-100" />
          <span className="font-bold text-gray-800 text-xl">Luvimg Condomínios, Lda</span>
        </div>
        <p className="mt-3 text-gray-600">Este documento foi gerado automaticamente pelo sistema de gestão de assistências.</p>
      </div>
    </div>
  );
};
