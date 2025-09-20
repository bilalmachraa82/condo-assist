
interface SupplierListPDFTemplateProps {
  suppliers: any[];
  title?: string;
  filters?: {
    status?: string;
    specialization?: string;
    location?: string;
    minRating?: string;
    hasEmail?: boolean;
    hasPhone?: boolean;
  };
}

export const SupplierListPDFTemplate = ({ 
  suppliers, 
  title = "Lista de Fornecedores",
  filters 
}: SupplierListPDFTemplateProps) => {
  const getStatusLabel = (isActive: boolean) => {
    return isActive ? "Ativo" : "Inativo";
  };

  const uniqueSpecializations = new Set(
    suppliers.map(s => s.specialization).filter(Boolean)
  ).size;

  const averageRating = suppliers
    .filter(s => s.rating && s.rating > 0)
    .reduce((sum, s, _, arr) => sum + s.rating / arr.length, 0);

  return (
    <div className="p-8 bg-white text-black">
      {/* Header */}
      <div className="border-b-2 border-gray-300 pb-4 mb-6 text-center">
        <img
          src="/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png"
          alt="Logo"
          className="h-20 w-auto mx-auto mb-3"
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
              <div><strong>Estado:</strong> {filters.status === 'active' ? 'Ativo' : 'Inativo'}</div>
            )}
            {filters.specialization && (
              <div><strong>Especialização:</strong> {filters.specialization}</div>
            )}
            {filters.location && (
              <div><strong>Localização:</strong> {filters.location}</div>
            )}
            {filters.minRating && (
              <div><strong>Avaliação Mínima:</strong> {filters.minRating} estrelas</div>
            )}
            {filters.hasEmail !== undefined && (
              <div><strong>Com Email:</strong> {filters.hasEmail ? 'Sim' : 'Não'}</div>
            )}
            {filters.hasPhone !== undefined && (
              <div><strong>Com Telefone:</strong> {filters.hasPhone ? 'Sim' : 'Não'}</div>
            )}
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{suppliers.length}</div>
          <div className="text-sm text-gray-600">Total de Fornecedores</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {suppliers.filter(s => s.is_active).length}
          </div>
          <div className="text-sm text-gray-600">Ativos</div>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{uniqueSpecializations}</div>
          <div className="text-sm text-gray-600">Especializações</div>
        </div>
        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}
          </div>
          <div className="text-sm text-gray-600">Avaliação Média</div>
        </div>
      </div>

      {/* Contact Statistics */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-xl font-bold">
            {suppliers.filter(s => s.email).length}
          </div>
          <div className="text-sm text-gray-600">Com Email</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-xl font-bold">
            {suppliers.filter(s => s.phone).length}
          </div>
          <div className="text-sm text-gray-600">Com Telefone</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-xl font-bold">
            {suppliers.filter(s => s.nif).length}
          </div>
          <div className="text-sm text-gray-600">Com NIF</div>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">Nome</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Estado</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Especialização</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Email</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Telefone</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Avaliação</th>
              <th className="border border-gray-300 px-4 py-2 text-left">NIF</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier, index) => (
              <tr key={supplier.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border border-gray-300 px-4 py-2 text-sm font-medium">
                  {supplier.name}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${
                    supplier.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {getStatusLabel(supplier.is_active)}
                  </span>
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm">
                  {supplier.specialization || 'N/A'}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm">
                  {supplier.email || 'N/A'}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm">
                  {supplier.phone || 'N/A'}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm">
                  {supplier.rating && supplier.rating > 0 ? (
                    <div className="flex items-center">
                      <span className="mr-1">{supplier.rating.toFixed(1)}</span>
                      <span className="text-yellow-500">★</span>
                    </div>
                  ) : 'N/A'}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm font-mono">
                  {supplier.nif || 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {suppliers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Nenhum fornecedor encontrado para os critérios especificados.
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-500">
        Relatório gerado automaticamente pelo Sistema de Gestão de Assistências
      </div>
    </div>
  );
};
