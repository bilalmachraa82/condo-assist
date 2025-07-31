import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Assistance } from "@/hooks/useAssistances";

interface SupplierReportPDFTemplateProps {
  supplier: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    specialization?: string;
    rating?: number;
    total_jobs?: number;
  };
  assistances: Assistance[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export const SupplierReportPDFTemplate = ({ 
  supplier, 
  assistances,
  dateRange 
}: SupplierReportPDFTemplateProps) => {
  const getStatusLabel = (status: string) => {
    const labels = {
      pending: "Pendente",
      in_progress: "Em Andamento", 
      completed: "Concluída",
      cancelled: "Cancelada"
    };
    return labels[status as keyof typeof labels] || status;
  };

  const completedAssistances = assistances.filter(a => a.status === 'completed');
  const inProgressAssistances = assistances.filter(a => a.status === 'in_progress');
  const pendingAssistances = assistances.filter(a => a.status === 'pending');
  
  const totalRevenue = completedAssistances.reduce((sum, assistance) => {
    return sum + (Number(assistance.final_cost) || Number(assistance.estimated_cost) || 0);
  }, 0);

  const avgCompletionTime = completedAssistances.length > 0 ? 
    completedAssistances.reduce((sum, assistance) => {
      if (assistance.completed_date && assistance.created_at) {
        const diff = new Date(assistance.completed_date).getTime() - new Date(assistance.created_at).getTime();
        return sum + (diff / (1000 * 60 * 60 * 24)); // Convert to days
      }
      return sum;
    }, 0) / completedAssistances.length : 0;

  return (
    <div className="print-template max-w-6xl mx-auto p-8 bg-white text-black">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-300 pb-4">
        <h1 className="text-2xl font-bold mb-2">Relatório de Fornecedor</h1>
        <h2 className="text-xl text-gray-700">{supplier.name}</h2>
        <p className="text-gray-600">
          Gerado em {format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}
        </p>
        {dateRange && (
          <p className="text-sm text-gray-500 mt-1">
            Período: {format(dateRange.start, "dd/MM/yyyy", { locale: pt })} - {format(dateRange.end, "dd/MM/yyyy", { locale: pt })}
          </p>
        )}
      </div>

      {/* Supplier Information */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="text-lg font-semibold mb-3 text-gray-800">Informações do Fornecedor</h2>
          <div className="space-y-2">
            <div><span className="font-medium">Nome:</span> {supplier.name}</div>
            {supplier.email && <div><span className="font-medium">Email:</span> {supplier.email}</div>}
            {supplier.phone && <div><span className="font-medium">Telefone:</span> {supplier.phone}</div>}
            {supplier.specialization && (
              <div><span className="font-medium">Especialização:</span> {supplier.specialization}</div>
            )}
            {supplier.rating && (
              <div><span className="font-medium">Avaliação:</span> {supplier.rating.toFixed(1)}/5</div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3 text-gray-800">Estatísticas Gerais</h2>
          <div className="space-y-2">
            <div><span className="font-medium">Total de Trabalhos:</span> {supplier.total_jobs || 0}</div>
            <div><span className="font-medium">Trabalhos no Período:</span> {assistances.length}</div>
            <div><span className="font-medium">Receita Total:</span> €{totalRevenue.toFixed(2)}</div>
            {avgCompletionTime > 0 && (
              <div><span className="font-medium">Tempo Médio de Conclusão:</span> {avgCompletionTime.toFixed(1)} dias</div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 border border-gray-200 rounded">
          <div className="text-2xl font-bold text-blue-600">{assistances.length}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="text-center p-3 border border-gray-200 rounded">
          <div className="text-2xl font-bold text-green-600">{completedAssistances.length}</div>
          <div className="text-sm text-gray-600">Concluídas</div>
        </div>
        <div className="text-center p-3 border border-gray-200 rounded">
          <div className="text-2xl font-bold text-yellow-600">{inProgressAssistances.length}</div>
          <div className="text-sm text-gray-600">Em Andamento</div>
        </div>
        <div className="text-center p-3 border border-gray-200 rounded">
          <div className="text-2xl font-bold text-orange-600">{pendingAssistances.length}</div>
          <div className="text-sm text-gray-600">Pendentes</div>
        </div>
      </div>

      {/* Assistances Table */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 text-gray-800">Assistências Detalhadas</h2>
        <div className="overflow-hidden">
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">Título</th>
                <th className="border border-gray-300 p-2 text-left">Edifício</th>
                <th className="border border-gray-300 p-2 text-left">Estado</th>
                <th className="border border-gray-300 p-2 text-left">Data Criação</th>
                <th className="border border-gray-300 p-2 text-left">Data Conclusão</th>
                <th className="border border-gray-300 p-2 text-left">Custo</th>
              </tr>
            </thead>
            <tbody>
              {assistances.map((assistance) => (
                <tr key={assistance.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-2 font-medium">
                    {assistance.title}
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
                    {format(new Date(assistance.created_at), "dd/MM/yyyy", { locale: pt })}
                  </td>
                  <td className="border border-gray-300 p-2">
                    {assistance.completed_date 
                      ? format(new Date(assistance.completed_date), "dd/MM/yyyy", { locale: pt })
                      : "N/A"}
                  </td>
                  <td className="border border-gray-300 p-2">
                    {assistance.final_cost ? `€${assistance.final_cost}` : 
                     assistance.estimated_cost ? `€${assistance.estimated_cost} (est.)` : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-500">
        <p>Este documento foi gerado automaticamente pelo sistema de gestão de assistências.</p>
      </div>
    </div>
  );
};