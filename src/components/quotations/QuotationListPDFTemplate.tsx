
import React from 'react';
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { getAssistanceStatusLabel } from "@/utils/assistanceStates";
import { getPriorityLabel } from "@/utils/constants";

interface QuotationListPDFTemplateProps {
  quotations: any[];
  title?: string;
  filters?: {
    status?: string;
    supplierId?: string;
    minAmount?: string;
    maxAmount?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export const QuotationListPDFTemplate = ({ 
  quotations, 
  title = "Lista de Orçamentos",
  filters 
}: QuotationListPDFTemplateProps) => {
  const totalValue = quotations.reduce((sum, quotation) => sum + (quotation.amount || 0), 0);
  const approvedValue = quotations
    .filter(q => q.status === 'approved')
    .reduce((sum, quotation) => sum + (quotation.amount || 0), 0);

  return (
    <div className="p-8 bg-white text-black">
      {/* Header */}
      <div className="border-b-2 border-gray-300 pb-4 mb-6 text-center">
        <img
          src="/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png"
          alt="Logo Luvimg"
          className="h-32 w-auto mx-auto mb-3"
        />
        <h1 className="text-2xl font-bold text-center">{title}</h1>
        <p className="text-center text-gray-600 mt-2">
          Gerado em {new Date().toLocaleDateString('pt-PT')} às {new Date().toLocaleTimeString('pt-PT')}
        </p>
      </div>

      {/* Applied Filters */}
      {filters && Object.values(filters).some(Boolean) && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Filtros Aplicados:</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {filters.status && (
              <div><strong>Estado:</strong> {getAssistanceStatusLabel(filters.status as any)}</div>
            )}
            {filters.minAmount && (
              <div><strong>Valor Mínimo:</strong> €{Number(filters.minAmount).toLocaleString()}</div>
            )}
            {filters.maxAmount && (
              <div><strong>Valor Máximo:</strong> €{Number(filters.maxAmount).toLocaleString()}</div>
            )}
            {filters.dateFrom && (
              <div><strong>Data Início:</strong> {new Date(filters.dateFrom).toLocaleDateString('pt-PT')}</div>
            )}
            {filters.dateTo && (
              <div><strong>Data Fim:</strong> {new Date(filters.dateTo).toLocaleDateString('pt-PT')}</div>
            )}
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{quotations.length}</div>
          <div className="text-sm text-gray-600">Total de Orçamentos</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {quotations.filter(q => q.status === 'approved').length}
          </div>
          <div className="text-sm text-gray-600">Aprovados</div>
        </div>
        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {quotations.filter(q => q.status === 'pending').length}
          </div>
          <div className="text-sm text-gray-600">Pendentes</div>
        </div>
        <div className="text-center p-4 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            {quotations.filter(q => q.status === 'rejected').length}
          </div>
          <div className="text-sm text-gray-600">Rejeitados</div>
        </div>
      </div>

      {/* Value Summary */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-xl font-bold">€{totalValue.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Valor Total</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-xl font-bold text-green-600">€{approvedValue.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Valor Aprovado</div>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">ID</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Assistência</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Fornecedor</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Valor</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Estado</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Data Submissão</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Validade</th>
            </tr>
          </thead>
          <tbody>
            {quotations.map((quotation, index) => (
              <tr key={quotation.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border border-gray-300 px-4 py-2 text-sm">
                  #{quotation.id.slice(-8)}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm">
                  {quotation.assistances?.title || 'N/A'}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm">
                  {quotation.suppliers?.name || 'N/A'}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm font-medium">
                  €{quotation.amount?.toLocaleString() || '0'}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${
                    quotation.status === 'approved' ? 'bg-green-100 text-green-800' :
                    quotation.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {getAssistanceStatusLabel(quotation.status as any)}
                  </span>
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm">
                  {quotation.created_at ? new Date(quotation.created_at).toLocaleDateString('pt-PT') : 'N/A'}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm">
                  {quotation.validity_days ? `${quotation.validity_days} dias` : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {quotations.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Nenhum orçamento encontrado para os critérios especificados.
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-500">
        Relatório gerado automaticamente pelo Sistema de Gestão de Assistências
      </div>
    </div>
  );
};
