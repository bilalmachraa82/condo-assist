import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Euro, 
  TrendingUp, 
  Users, 
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Mail
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tables } from "@/integrations/supabase/types";
import QuotationRequestsList from "./QuotationRequestsList";

type Quotation = Tables<"quotations"> & {
  suppliers?: Tables<"suppliers">;
  assistances?: {
    id: string;
    title: string;
    buildings?: {
      name: string;
    };
  };
};

const statusLabels = {
  pending: "Pendente",
  approved: "Aprovado", 
  rejected: "Rejeitado",
};

const statusVariants = {
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function QuotationDashboard() {
  const { data: quotations, isLoading } = useQuery({
    queryKey: ["all-quotations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotations")
        .select(`
          *,
          suppliers (id, name, email),
          assistances (
            id, 
            title,
            buildings (name)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Quotation[];
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["quotation-stats"],
    queryFn: async () => {
      if (!quotations) return null;

      const totalQuotations = quotations.length;
      const pendingQuotations = quotations.filter(q => q.status === "pending").length;
      const approvedQuotations = quotations.filter(q => q.status === "approved").length;
      const rejectedQuotations = quotations.filter(q => q.status === "rejected").length;
      
      const totalValue = quotations
        .filter(q => q.status === "approved")
        .reduce((sum, q) => sum + Number(q.amount), 0);

      const averageValue = approvedQuotations > 0 ? totalValue / approvedQuotations : 0;

      return {
        total: totalQuotations,
        pending: pendingQuotations,
        approved: approvedQuotations,
        rejected: rejectedQuotations,
        totalValue,
        averageValue,
      };
    },
    enabled: !!quotations,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-primary">{stats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <div>
                <p className="text-2xl font-bold text-warning">{stats?.pending || 0}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <div>
                <p className="text-2xl font-bold text-success">{stats?.approved || 0}</p>
                <p className="text-xs text-muted-foreground">Aprovados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              <div>
                <p className="text-2xl font-bold text-accent">
                  €{(stats?.averageValue || 0).toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">Valor Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quotations Tabs */}
      <Tabs defaultValue="received" className="space-y-4">
        <TabsList>
          <TabsTrigger value="received" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Orçamentos Recebidos
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Solicitações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Orçamentos Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quotations && quotations.length > 0 ? (
                <div className="space-y-4">
                  {quotations.slice(0, 10).map((quotation) => (
                    <div 
                      key={quotation.id} 
                      className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{quotation.suppliers?.name}</span>
                          </div>
                          <Badge className={statusVariants[quotation.status as keyof typeof statusVariants]}>
                            {statusLabels[quotation.status as keyof typeof statusLabels]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-lg font-bold text-primary">
                          <Euro className="h-4 w-4" />
                          {Number(quotation.amount).toFixed(2)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {quotation.assistances?.title || `Assistência #${quotation.assistance_id}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {quotation.assistances?.buildings?.name}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(quotation.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Válido por {quotation.validity_days} dias
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {quotations.length > 10 && (
                    <div className="text-center pt-4">
                      <Button variant="outline">
                        Ver Todos os Orçamentos ({quotations.length - 10} mais)
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum orçamento ainda</h3>
                  <p>Os orçamentos submetidos pelos fornecedores aparecerão aqui.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <QuotationRequestsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}