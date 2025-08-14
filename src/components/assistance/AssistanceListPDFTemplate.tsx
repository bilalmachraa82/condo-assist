
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Assistance } from "@/hooks/useAssistances";

interface AssistanceListPDFTemplateProps {
  assistances: Assistance[];
  title?: string;
  filters?: {
    status?: string;
    building?: string;
    supplier?: string;
    dateRange?: string;
  };
}

export const AssistanceListPDFTemplate = ({ 
  assistances, 
  title = "Listagem de Assistências",
  filters 
}: AssistanceListPDFTemplateProps) => {
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

  const truncate = (text?: string, max = 120) => {
    if (!text) return "—";
    const t = String(text).trim();
    return t.length > max ? t.slice(0, max - 1) + "…" : t;
  };

  return (
    <div className="print-template max-w-6xl mx-auto p-8 bg-white text-black">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-300 pb-4">
        <img
          src="/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png"
          alt="Luvimg logotipo"
          className="h-10 w-auto mx-auto mb-3"
        />
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-gray-600">
          Gerado em {format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Total de registos: {assistances.length}
        </p>
      </div>

      {/* Filters Applied */}
      {filters && Object.values(filters).some(filter => filter) && (
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">Filtros Aplicados:</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {filters.status && <div><span className="font-medium">Estado:</span> {getStatusLabel(filters.status)}</div>}
            {filters.building && <div><span className="font-medium">Edifício:</span> {filters.building}</div>}
            {filters.supplier && <div><span className="font-medium">Fornecedor:</span> {filters.supplier}</div>}
            {filters.dateRange && <div><span className="font-medium">Período:</span> {filters.dateRange}</div>}
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 border border-gray-200 rounded">
          <div className="text-2xl font-bold text-blue-600">{assistances.length}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="text-center p-3 border border-gray-200 rounded">
          <div className="text-2xl font-bold text-green-600">
            {assistances.filter(a => a.status === 'completed').length}
          </div>
          <div className="text-sm text-gray-600">Concluídas</div>
        </div>
        <div className="text-center p-3 border border-gray-200 rounded">
          <div className="text-2xl font-bold text-yellow-600">
            {assistances.filter(a => a.status === 'in_progress').length}
          </div>
          <div className="text-sm text-gray-600">Em Andamento</div>
        </div>
        <div className="text-center p-3 border border-gray-200 rounded">
          <div className="text-2xl font-bold text-orange-600">
            {assistances.filter(a => a.status === 'pending').length}
          </div>
          <div className="text-sm text-gray-600">Pendentes</div>
        </div>
      </div>


      {/* Assistances Table */}
      <div className="overflow-hidden">
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">Nº</th>
              <th className="border border-gray-300 p-2 text-left">Título</th>
              <th className="border border-gray-300 p-2 text-left">Descrição</th>
              <th className="border border-gray-300 p-2 text-left">Edifício</th>
              <th className="border border-gray-300 p-2 text-left">Estado</th>
              <th className="border border-gray-300 p-2 text-left">Prioridade</th>
              <th className="border border-gray-300 p-2 text-left">Fornecedor</th>
              <th className="border border-gray-300 p-2 text-left">Data Criação</th>
            </tr>
          </thead>
          <tbody>
            {assistances.map((assistance) => (
              <tr key={assistance.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 p-2 font-mono text-sm font-bold">
                  #{assistance.assistance_number || 'N/A'}
                </td>
                <td className="border border-gray-300 p-2 font-medium">
                  {assistance.title}
                </td>
                <td className="border border-gray-300 p-2 text-gray-700">
                  {truncate(assistance.description)}
                </td>
                <td className="border border-gray-300 p-2">
                  {assistance.buildings?.name || "N/A"}
                </td>
                <td className="border border-gray-300 p-2">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    assistance.status === 'completed' ? 'bg-green-100 text-green-800' :
                    assistance.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                    assistance.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {getStatusLabel(assistance.status)}
                  </span>
                </td>
                <td className="border border-gray-300 p-2">
                  {getPriorityLabel(assistance.priority)}
                </td>
                <td className="border border-gray-300 p-2">
                  {assistance.suppliers?.name || "Não atribuído"}
                </td>
                <td className="border border-gray-300 p-2">
                  {format(new Date(assistance.created_at), "dd/MM/yyyy", { locale: pt })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-500">
        <p>Este documento foi gerado automaticamente pelo sistema de gestão de assistências.</p>
      </div>
    </div>
  );
};
