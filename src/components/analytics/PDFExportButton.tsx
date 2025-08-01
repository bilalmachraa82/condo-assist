import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
    // PDF generation functionality - to be implemented with jsPDF
    // For now, we'll simulate the export
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create a simple downloadable file as placeholder
    const content = `
Analytics Report
================

Report Type: ${exportOptions.reportType}
Period: Last ${exportOptions.period} days
Generated: ${new Date().toLocaleString()}

Include Charts: ${exportOptions.includeCharts ? 'Yes' : 'No'}
Include Tables: ${exportOptions.includeTables ? 'Yes' : 'No'}
Include Alerts: ${exportOptions.includeAlerts ? 'Yes' : 'No'}

This is a sample report. Full PDF generation would be implemented here.
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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