import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import QuotationDashboard from "@/components/quotations/QuotationDashboard";
import QuotationManagement from "@/components/quotations/QuotationManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="management">Manage Quotations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard">
            <QuotationDashboard />
          </TabsContent>
          
          <TabsContent value="management">
            <QuotationManagement />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}