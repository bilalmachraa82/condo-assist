
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { SupplierFilters } from "./SupplierFilters";

interface PDFExportButtonProps {
  suppliers: any[];
  filters?: SupplierFilters;
  title?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export const PDFExportButton = ({ 
  suppliers, 
  filters,
  title = "Lista de Fornecedores",
  variant = "outline",
  size = "default"
}: PDFExportButtonProps) => {
  const handleExportPDF = () => {
    // Create a new window for PDF content
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const uniqueSpecializations = new Set(
      suppliers.map(s => s.specialization).filter(Boolean)
    ).size;

    const averageRating = suppliers
      .filter(s => s.rating && s.rating > 0)
      .reduce((sum, s, _, arr) => sum + s.rating / arr.length, 0);

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-PT">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              margin: 0; 
              padding: 20px;
              background: white;
            }
            .header { border-bottom: 2px solid #ccc; padding-bottom: 16px; margin-bottom: 24px; }
            .title { font-size: 24px; font-weight: bold; text-align: center; }
            .subtitle { text-align: center; color: #666; margin-top: 8px; }
            .filters { margin-bottom: 24px; padding: 16px; background: #f5f5f5; border-radius: 8px; }
            .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
            .stat-card { text-align: center; padding: 16px; border-radius: 8px; }
            .stat-value { font-size: 24px; font-weight: bold; }
            .stat-label { font-size: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background: #f5f5f5; font-weight: bold; }
            tr:nth-child(even) { background: #f9f9f9; }
            .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
            .status-active { background: #dcfce7; color: #166534; }
            .status-inactive { background: #f3f4f6; color: #374151; }
            .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #ccc; text-align: center; font-size: 12px; color: #666; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${window.location.origin}/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png" alt="Luvimg logotipo" style="height: 40px; display: block; margin: 0 auto 8px;" />
            <h1 class="title">${title}</h1>
            <p class="subtitle">Gerado em ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT')}</p>
          </div>

          ${filters && Object.values(filters).some(value => value !== undefined && value !== "" && value !== false) ? `
            <div class="filters">
              <h3>Filtros Aplicados:</h3>
              ${filters.status ? `<p><strong>Estado:</strong> ${filters.status === 'active' ? 'Ativo' : 'Inativo'}</p>` : ''}
              ${filters.specialization ? `<p><strong>Especialização:</strong> ${filters.specialization}</p>` : ''}
              ${filters.location ? `<p><strong>Localização:</strong> ${filters.location}</p>` : ''}
              ${filters.minRating ? `<p><strong>Avaliação Mínima:</strong> ${filters.minRating} estrelas</p>` : ''}
              ${filters.hasEmail !== undefined ? `<p><strong>Com Email:</strong> ${filters.hasEmail ? 'Sim' : 'Não'}</p>` : ''}
              ${filters.hasPhone !== undefined ? `<p><strong>Com Telefone:</strong> ${filters.hasPhone ? 'Sim' : 'Não'}</p>` : ''}
            </div>
          ` : ''}

          <div class="stats">
            <div class="stat-card" style="background: #dbeafe;">
              <div class="stat-value" style="color: #1d4ed8;">${suppliers.length}</div>
              <div class="stat-label">Total de Fornecedores</div>
            </div>
            <div class="stat-card" style="background: #dcfce7;">
              <div class="stat-value" style="color: #166534;">${suppliers.filter(s => s.is_active).length}</div>
              <div class="stat-label">Ativos</div>
            </div>
            <div class="stat-card" style="background: #e9d5ff;">
              <div class="stat-value" style="color: #7c3aed;">${uniqueSpecializations}</div>
              <div class="stat-label">Especializações</div>
            </div>
            <div class="stat-card" style="background: #fef3c7;">
              <div class="stat-value" style="color: #92400e;">${averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}</div>
              <div class="stat-label">Avaliação Média</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Estado</th>
                <th>Especialização</th>
                <th>Email</th>
                <th>Telefone</th>
                <th>Avaliação</th>
                <th>NIF</th>
              </tr>
            </thead>
            <tbody>
              ${suppliers.map(supplier => `
                <tr>
                  <td style="font-weight: 500;">${supplier.name}</td>
                  <td>
                    <span class="status-badge status-${supplier.is_active ? 'active' : 'inactive'}">
                      ${supplier.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>${supplier.specialization || 'N/A'}</td>
                  <td>${supplier.email || 'N/A'}</td>
                  <td>${supplier.phone || 'N/A'}</td>
                  <td>
                    ${supplier.rating && supplier.rating > 0 ? 
                      `${supplier.rating.toFixed(1)} ★` : 'N/A'
                    }
                  </td>
                  <td style="font-family: monospace;">${supplier.nif || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${suppliers.length === 0 ? '<div style="text-align: center; padding: 32px; color: #666;">Nenhum fornecedor encontrado para os critérios especificados.</div>' : ''}

          <div class="footer">
            Relatório gerado automaticamente pelo Sistema de Gestão de Assistências
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  return (
    <Button 
      onClick={handleExportPDF} 
      variant={variant}
      size={size}
      className="hover:bg-muted/50"
    >
      <FileDown className="h-4 w-4 mr-2" />
      Exportar PDF
    </Button>
  );
};
