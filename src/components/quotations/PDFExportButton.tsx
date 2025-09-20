import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { QuotationListPDFTemplate } from "./QuotationListPDFTemplate";
import { QuotationFilters } from "./QuotationFilters";

interface PDFExportButtonProps {
  quotations: any[];
  filters?: QuotationFilters;
  title?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export const PDFExportButton = ({ 
  quotations, 
  filters,
  title = "Lista de Orçamentos",
  variant = "outline",
  size = "default"
}: PDFExportButtonProps) => {
  const handleExportPDF = () => {
    // Create a new window for PDF content
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Get the PDF template HTML
    const tempDiv = document.createElement('div');
    const pdfContent = QuotationListPDFTemplate({ quotations, title, filters });
    
    // We need to render the React component to HTML string
    // For now, we'll create the HTML structure directly
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
            .status-approved { background: #dcfce7; color: #166534; }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-rejected { background: #fecaca; color: #991b1b; }
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

          ${filters && Object.values(filters).some(Boolean) ? `
            <div class="filters">
              <h3>Filtros Aplicados:</h3>
              ${filters.status ? `<p><strong>Estado:</strong> ${filters.status}</p>` : ''}
              ${filters.minAmount ? `<p><strong>Valor Mínimo:</strong> €${Number(filters.minAmount).toLocaleString()}</p>` : ''}
              ${filters.maxAmount ? `<p><strong>Valor Máximo:</strong> €${Number(filters.maxAmount).toLocaleString()}</p>` : ''}
              ${filters.dateFrom ? `<p><strong>Data Início:</strong> ${new Date(filters.dateFrom).toLocaleDateString('pt-PT')}</p>` : ''}
              ${filters.dateTo ? `<p><strong>Data Fim:</strong> ${new Date(filters.dateTo).toLocaleDateString('pt-PT')}</p>` : ''}
            </div>
          ` : ''}

          <div class="stats">
            <div class="stat-card" style="background: #dbeafe;">
              <div class="stat-value" style="color: #1d4ed8;">${quotations.length}</div>
              <div class="stat-label">Total de Orçamentos</div>
            </div>
            <div class="stat-card" style="background: #dcfce7;">
              <div class="stat-value" style="color: #166534;">${quotations.filter(q => q.status === 'approved').length}</div>
              <div class="stat-label">Aprovados</div>
            </div>
            <div class="stat-card" style="background: #fef3c7;">
              <div class="stat-value" style="color: #92400e;">${quotations.filter(q => q.status === 'pending').length}</div>
              <div class="stat-label">Pendentes</div>
            </div>
            <div class="stat-card" style="background: #fecaca;">
              <div class="stat-value" style="color: #991b1b;">${quotations.filter(q => q.status === 'rejected').length}</div>
              <div class="stat-label">Rejeitados</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Assistência</th>
                <th>Fornecedor</th>
                <th>Valor</th>
                <th>Estado</th>
                <th>Data Submissão</th>
                <th>Validade</th>
              </tr>
            </thead>
            <tbody>
              ${quotations.map(quotation => `
                <tr>
                  <td>#${quotation.id.slice(-8)}</td>
                  <td>${quotation.assistances?.title || 'N/A'}</td>
                  <td>${quotation.suppliers?.name || 'N/A'}</td>
                  <td>€${quotation.amount?.toLocaleString() || '0'}</td>
                  <td>
                    <span class="status-badge status-${quotation.status}">
                      ${quotation.status === 'approved' ? 'Aprovado' : quotation.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                    </span>
                  </td>
                  <td>${quotation.created_at ? new Date(quotation.created_at).toLocaleDateString('pt-PT') : 'N/A'}</td>
                  <td>${quotation.validity_days ? `${quotation.validity_days} dias` : 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${quotations.length === 0 ? '<div style="text-align: center; padding: 32px; color: #666;">Nenhum orçamento encontrado para os critérios especificados.</div>' : ''}

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