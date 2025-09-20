import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useExecutiveKPIs, useSupplierPerformanceAnalytics, useTrendAnalytics } from "@/hooks/useAnalytics";

interface PDFExportOptions {
  reportType: 'executive' | 'performance' | 'operational' | 'full';
  period: number;
  includeCharts: boolean;
  includeTables: boolean;
  includeAlerts: boolean;
}

interface PDFExportButtonProps {
  onExport?: (options: PDFExportOptions) => Promise<void>;
}

export function PDFExportButton({ onExport }: PDFExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<PDFExportOptions>({
    reportType: 'executive',
    period: 30,
    includeCharts: true,
    includeTables: true,
    includeAlerts: true,
  });
  const { toast } = useToast();
  const { data: executiveKPIs } = useExecutiveKPIs(options.period);
  const { data: supplierPerformance } = useSupplierPerformanceAnalytics(options.period);
  const { data: trendData } = useTrendAnalytics(12);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (onExport) {
        await onExport(options);
      } else {
        // Default export implementation
        await generatePDFReport(options);
      }
      toast({
        title: "Relatório Exportado",
        description: "O relatório PDF foi gerado com sucesso.",
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Erro na Exportação",
        description: "Ocorreu um erro ao gerar o relatório PDF.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const generatePDFReport = async (exportOptions: PDFExportOptions) => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      let yPosition = 20;

      // Header
      pdf.setFontSize(20);
      pdf.setFont(undefined, 'bold');
      pdf.text('Relatório de Análises', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 15;
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 10;
      pdf.text(`Período: Últimos ${exportOptions.period} dias`, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 20;

      // Report Type Section
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      const reportTypeLabel = {
        'executive': 'Dashboard Executivo',
        'performance': 'Performance Fornecedores',
        'operational': 'Métricas Operacionais',
        'full': 'Relatório Completo'
      }[exportOptions.reportType];
      
      pdf.text(`Tipo de Relatório: ${reportTypeLabel}`, 20, yPosition);
      yPosition += 15;

      // Executive KPIs Section (if available and requested)
      if (exportOptions.reportType === 'executive' || exportOptions.reportType === 'full') {
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('Indicadores Executivos', 20, yPosition);
        yPosition += 10;

        if (executiveKPIs) {
          pdf.setFontSize(10);
          pdf.setFont(undefined, 'normal');
          
          const kpiData = [
            ['Métrica', 'Valor'],
            ['Total de Assistências', executiveKPIs.totalAssistances?.toString() || 'N/A'],
            ['Assistências Concluídas', executiveKPIs.completedAssistances?.toString() || 'N/A'],
            ['Taxa de Conclusão', executiveKPIs.completionRate ? `${executiveKPIs.completionRate.toFixed(1)}%` : 'N/A'],
            ['Custo Total', executiveKPIs.totalCost ? `€${executiveKPIs.totalCost.toFixed(2)}` : 'N/A'],
            ['Custo Médio', executiveKPIs.avgCostPerAssistance ? `€${executiveKPIs.avgCostPerAssistance.toFixed(2)}` : 'N/A'],
            ['Tempo Médio Resposta', executiveKPIs.averageResponseTime ? `${executiveKPIs.averageResponseTime.toFixed(1)}h` : 'N/A']
          ];

          // Create table
          let tableY = yPosition;
          const colWidths = [80, 80];
          const rowHeight = 7;

          kpiData.forEach((row, index) => {
            if (index === 0) {
              pdf.setFont(undefined, 'bold');
            } else {
              pdf.setFont(undefined, 'normal');
            }

            pdf.rect(20, tableY, colWidths[0], rowHeight);
            pdf.rect(20 + colWidths[0], tableY, colWidths[1], rowHeight);
            
            pdf.text(row[0], 22, tableY + 5);
            pdf.text(row[1], 22 + colWidths[0], tableY + 5);
            
            tableY += rowHeight;
          });

          yPosition = tableY + 10;
        }
      }

      // Performance Section
      if (exportOptions.reportType === 'performance' || exportOptions.reportType === 'full') {
        if (yPosition > pageHeight - 50) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('Performance dos Fornecedores', 20, yPosition);
        yPosition += 10;

        if (supplierPerformance && supplierPerformance.length > 0) {
          pdf.setFontSize(10);
          pdf.setFont(undefined, 'normal');
          
          const perfData = [
            ['Fornecedor', 'Trabalhos', 'Taxa Conclusão', 'Avaliação']
          ];

          supplierPerformance.slice(0, 10).forEach(supplier => {
            perfData.push([
              supplier.supplierName?.substring(0, 25) || 'N/A',
              supplier.totalAssistances?.toString() || '0',
              supplier.completionRate ? `${supplier.completionRate.toFixed(1)}%` : 'N/A',
              supplier.averageRating ? `${supplier.averageRating.toFixed(1)}/5` : 'N/A'
            ]);
          });

          let tableY = yPosition;
          const colWidths = [60, 30, 40, 30];
          const rowHeight = 7;

          perfData.forEach((row, index) => {
            if (tableY > pageHeight - 20) {
              pdf.addPage();
              tableY = 20;
            }

            if (index === 0) {
              pdf.setFont(undefined, 'bold');
            } else {
              pdf.setFont(undefined, 'normal');
            }

            row.forEach((cell, cellIndex) => {
              const x = 20 + colWidths.slice(0, cellIndex).reduce((sum, width) => sum + width, 0);
              pdf.rect(x, tableY, colWidths[cellIndex], rowHeight);
              pdf.text(cell, x + 2, tableY + 5);
            });

            tableY += rowHeight;
          });

          yPosition = tableY + 10;
        }
      }

      // Configuration section
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('Configurações do Relatório', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Gráficos incluídos: ${exportOptions.includeCharts ? 'Sim' : 'Não'}`, 20, yPosition);
      yPosition += 5;
      pdf.text(`Tabelas incluídas: ${exportOptions.includeTables ? 'Sim' : 'Não'}`, 20, yPosition);
      yPosition += 5;
      pdf.text(`Alertas incluídos: ${exportOptions.includeAlerts ? 'Sim' : 'Não'}`, 20, yPosition);

      // Save the PDF
      const filename = `relatorio-analises-${exportOptions.reportType}-${new Date().getTime()}.pdf`;
      pdf.save(filename);

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      throw new Error('Falha na geração do PDF');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileDown className="w-4 h-4 mr-2" />
          Exportar PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Exportar Relatório PDF</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="reportType">Tipo de Relatório</Label>
            <Select 
              value={options.reportType} 
              onValueChange={(value: any) => setOptions(prev => ({ ...prev, reportType: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="executive">Dashboard Executivo</SelectItem>
                <SelectItem value="performance">Performance Fornecedores</SelectItem>
                <SelectItem value="operational">Métricas Operacionais</SelectItem>
                <SelectItem value="full">Relatório Completo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="period">Período</Label>
            <Select 
              value={options.period.toString()} 
              onValueChange={(value) => setOptions(prev => ({ ...prev, period: Number(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Incluir no Relatório</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="includeCharts"
                checked={options.includeCharts}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includeCharts: checked as boolean }))
                }
              />
              <Label htmlFor="includeCharts">Gráficos e Visualizações</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="includeTables"
                checked={options.includeTables}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includeTables: checked as boolean }))
                }
              />
              <Label htmlFor="includeTables">Tabelas Detalhadas</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="includeAlerts"
                checked={options.includeAlerts}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includeAlerts: checked as boolean }))
                }
              />
              <Label htmlFor="includeAlerts">Alertas Inteligentes</Label>
            </div>
          </div>

          <Button 
            onClick={handleExport} 
            disabled={isExporting}
            className="w-full"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 mr-2" />
                Gerar Relatório
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}