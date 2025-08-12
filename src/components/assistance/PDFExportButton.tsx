import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface PDFExportButtonProps {
  children: React.ReactNode;
  filename?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  icon?: "download" | "print";
}

export const PDFExportButton = ({ 
  children, 
  filename = "documento",
  size = "default",
  variant = "outline",
  icon = "download"
}: PDFExportButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handlePrint = () => {
    // Close dialog before printing
    setIsOpen(false);
    
    // Small delay to ensure dialog is closed
    setTimeout(() => {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      // Get the content to print
      const printContent = document.querySelector('.print-template')?.outerHTML;
      if (!printContent) return;

      // Write the content to the new window
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${filename}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <base href="${window.location.origin}/">
            <style>
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.5;
                color: #000;
                background: #fff;
              }
              
              .print-template {
                max-width: none !important;
                margin: 0 !important;
                padding: 20px !important;
              }
              
              table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin: 0 !important;
              }
              
              th, td {
                border: 1px solid #ddd !important;
                padding: 8px !important;
                text-align: left !important;
                font-size: 12px !important;
              }
              
              th {
                background-color: #f5f5f5 !important;
                font-weight: bold !important;
              }
              
              .grid {
                display: grid !important;
                gap: 1rem !important;
              }
              
              .grid-cols-2 {
                grid-template-columns: repeat(2, 1fr) !important;
              }
              
              .grid-cols-4 {
                grid-template-columns: repeat(4, 1fr) !important;
              }
              
              .text-center {
                text-align: center !important;
              }
              
              .text-left {
                text-align: left !important;
              }
              
              .font-bold {
                font-weight: bold !important;
              }
              
              .font-semibold {
                font-weight: 600 !important;
              }
              
              .text-2xl {
                font-size: 1.5rem !important;
              }
              
              .text-lg {
                font-size: 1.125rem !important;
              }
              
              .text-sm {
                font-size: 0.875rem !important;
              }
              
              .text-xs {
                font-size: 0.75rem !important;
              }
              
              .mb-2 { margin-bottom: 0.5rem !important; }
              .mb-3 { margin-bottom: 0.75rem !important; }
              .mb-6 { margin-bottom: 1.5rem !important; }
              .mb-8 { margin-bottom: 2rem !important; }
              .mt-1 { margin-top: 0.25rem !important; }
              .mt-8 { margin-top: 2rem !important; }
              .p-2 { padding: 0.5rem !important; }
              .p-3 { padding: 0.75rem !important; }
              .p-4 { padding: 1rem !important; }
              .pt-4 { padding-top: 1rem !important; }
              .pb-4 { padding-bottom: 1rem !important; }
              .px-2 { padding-left: 0.5rem !important; padding-right: 0.5rem !important; }
              .py-1 { padding-top: 0.25rem !important; padding-bottom: 0.25rem !important; }
              
              .border { border: 1px solid #d1d5db !important; }
              .border-b-2 { border-bottom: 2px solid #d1d5db !important; }
              .border-t { border-top: 1px solid #d1d5db !important; }
              .rounded { border-radius: 0.25rem !important; }
              
              .bg-gray-50 { background-color: #f9fafb !important; }
              .bg-gray-100 { background-color: #f3f4f6 !important; }
              .bg-blue-50 { background-color: #eff6ff !important; }
              
              .text-gray-500 { color: #6b7280 !important; }
              .text-gray-600 { color: #4b5563 !important; }
              .text-gray-700 { color: #374151 !important; }
              .text-gray-800 { color: #1f2937 !important; }
              .text-blue-600 { color: #2563eb !important; }
              .text-green-600 { color: #16a34a !important; }
              .text-yellow-600 { color: #ca8a04 !important; }
              .text-orange-600 { color: #ea580c !important; }
              
              .bg-green-100 { background-color: #dcfce7 !important; }
              .text-green-800 { color: #166534 !important; }
              .bg-yellow-100 { background-color: #fef3c7 !important; }
              .text-yellow-800 { color: #92400e !important; }
              .bg-orange-100 { background-color: #fed7aa !important; }
              .text-orange-800 { color: #9a3412 !important; }
              .bg-red-100 { background-color: #fee2e2 !important; }
              .text-red-800 { color: #991b1b !important; }
              
              .space-y-2 > * + * { margin-top: 0.5rem !important; }
              .leading-relaxed { line-height: 1.625 !important; }
              .overflow-hidden { overflow: hidden !important; }
              .inline-block { display: inline-block !important; }
              
              @media print {
                body { print-color-adjust: exact !important; }
                .print-template { page-break-inside: avoid !important; }
                table { page-break-inside: auto !important; }
                tr { page-break-inside: avoid !important; page-break-after: auto !important; }
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      try {
        printWindow.history.replaceState(null, '', `/pdf/${encodeURIComponent(filename)}`);
      } catch {}
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 100);
  };

  const IconComponent = icon === "print" ? Printer : Download;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <IconComponent className="w-4 h-4 mr-2" />
          {icon === "print" ? "Imprimir" : "Exportar PDF"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Pré-visualização do Documento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {children}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir / Salvar como PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};