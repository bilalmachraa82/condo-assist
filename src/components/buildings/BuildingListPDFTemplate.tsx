import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Building } from "@/hooks/useBuildings";

interface BuildingListPDFTemplateProps {
  buildings: Building[];
  title?: string;
  filters?: {
    search?: string;
  };
}

export const BuildingListPDFTemplate = ({ 
  buildings, 
  title = "Listagem de Edifícios",
  filters 
}: BuildingListPDFTemplateProps) => {
  return (
    <div className="print-template max-w-6xl mx-auto p-8 bg-white text-black">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-300 pb-4">
        <div className="flex flex-col items-center mb-4">
          <img
            src="/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png"
            alt="Logo"
            className="h-32 w-auto mb-2"
          />
          <div className="text-xl font-bold text-primary">Luvimg Condomínios, Lda</div>
        </div>
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-gray-600">
          Gerado em {format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Total de registos: {buildings.length}
        </p>
      </div>

      {/* Filters Applied */}
      {filters && Object.values(filters).some(filter => filter) && (
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">Filtros Aplicados:</h3>
          <div className="text-sm">
            {filters.search && <div><span className="font-medium">Pesquisa:</span> {filters.search}</div>}
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 border border-gray-200 rounded">
          <div className="text-2xl font-bold text-blue-600">{buildings.length}</div>
          <div className="text-sm text-gray-600">Total de Edifícios</div>
        </div>
        <div className="text-center p-3 border border-gray-200 rounded">
          <div className="text-2xl font-bold text-green-600">
            {buildings.filter(b => b.is_active).length}
          </div>
          <div className="text-sm text-gray-600">Ativos</div>
        </div>
        <div className="text-center p-3 border border-gray-200 rounded">
          <div className="text-2xl font-bold text-gray-600">
            {buildings.filter(b => !b.is_active).length}
          </div>
          <div className="text-sm text-gray-600">Inativos</div>
        </div>
      </div>

      {/* Buildings Table */}
      <div className="overflow-hidden">
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">Código</th>
              <th className="border border-gray-300 p-2 text-left">Nome</th>
              <th className="border border-gray-300 p-2 text-left">Endereço</th>
              <th className="border border-gray-300 p-2 text-left">NIF</th>
              <th className="border border-gray-300 p-2 text-left">Código Postal</th>
              <th className="border border-gray-300 p-2 text-left">Estado</th>
              <th className="border border-gray-300 p-2 text-left">Data Criação</th>
            </tr>
          </thead>
          <tbody>
            {buildings.map((building) => (
              <tr key={building.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 p-2 font-mono text-sm font-bold">
                  {building.code}
                </td>
                <td className="border border-gray-300 p-2 font-medium">
                  {building.name}
                </td>
                <td className="border border-gray-300 p-2 text-gray-700">
                  {building.address || "—"}
                </td>
                <td className="border border-gray-300 p-2">
                  {building.nif || "—"}
                </td>
                <td className="border border-gray-300 p-2">
                  {building.cadastral_code || "—"}
                </td>
                <td className="border border-gray-300 p-2">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    building.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {building.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="border border-gray-300 p-2">
                  {format(new Date(building.created_at), "dd/MM/yyyy", { locale: pt })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Admin Notes Section */}
      {buildings.some(b => b.admin_notes) && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Notas Administrativas</h3>
          <div className="space-y-2">
            {buildings.filter(b => b.admin_notes).map((building) => (
              <div key={building.id} className="p-3 bg-gray-50 rounded">
                <div className="font-medium">{building.name} ({building.code})</div>
                <div className="text-sm text-gray-700 mt-1">{building.admin_notes}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-500">
        <p>Este documento foi gerado automaticamente pelo sistema de gestão de edifícios.</p>
      </div>
    </div>
  );
};