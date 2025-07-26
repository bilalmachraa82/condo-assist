import DashboardLayout from "@/components/layout/DashboardLayout";
import QuotationDashboard from "@/components/quotations/QuotationDashboard";

export default function Quotations() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
            Gestão de Orçamentos
          </h1>
          <p className="text-muted-foreground">
            Análise e aprovação de orçamentos submetidos pelos fornecedores
          </p>
        </div>

        <QuotationDashboard />
      </div>
    </DashboardLayout>
  );
}