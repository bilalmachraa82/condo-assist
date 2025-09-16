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
  Mail,
  Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tables } from "@/integrations/supabase/types";
import { StatusBadge } from "@/components/ui/status-badges";
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

type AssistanceWithQuotationDetails = Tables<"assistances"> & {
  buildings?: Tables<"buildings">;
  suppliers?: Tables<"suppliers">;
  intervention_types?: Tables<"intervention_types">;
};

export default function QuotationDashboard() {
  const [selectedTab, setSelectedTab] = useState("requests");

  // Fetch quotations submitted by suppliers
  const { data: quotations, isLoading: quotationsLoading } = useQuery({
    queryKey: ["submitted-quotations"],
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
    staleTime: 0,
    refetchOnMount: true,
  });

  // Fetch assistances that require quotations
  const { data: quotationRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ["quotation-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assistances")
        .select(`
          *,
          buildings (id, name, address),
          suppliers (id, name, email),
          intervention_types (id, name)
        `)
        .eq("requires_quotation", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AssistanceWithQuotationDetails[];
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  // Calculate comprehensive statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["quotation-stats-comprehensive"],
    queryFn: async () => {
      const [quotationsRes, assistancesRes] = await Promise.all([
        supabase.from("quotations").select("status, amount"),
        supabase.from("assistances").select("status, requires_quotation, quotation_requested_at").eq("requires_quotation", true)
      ]);

      if (quotationsRes.error) throw quotationsRes.error;
      if (assistancesRes.error) throw assistancesRes.error;

      const quotationsData = quotationsRes.data || [];
      const requestsData = assistancesRes.data || [];

      // Quotation requests statistics
      const totalRequests = requestsData.length;
      const newRequests = requestsData.filter(a => a.status === "pending" && !a.quotation_requested_at).length;
      const awaitingResponse = requestsData.filter(a => a.status === "awaiting_quotation").length;
      const responsesReceived = requestsData.filter(a => a.status === "quotation_received").length;
      
      // Submitted quotations statistics
      const totalQuotations = quotationsData.length;
      const pendingApproval = quotationsData.filter(q => q.status === "pending").length;
      const approvedQuotations = quotationsData.filter(q => q.status === "approved").length;
      const rejectedQuotations = quotationsData.filter(q => q.status === "rejected").length;
      
      const totalApprovedValue = quotationsData
        .filter(q => q.status === "approved")
        .reduce((sum, q) => sum + Number(q.amount), 0);

      const averageValue = approvedQuotations > 0 ? totalApprovedValue / approvedQuotations : 0;

      return {
        // Requests flow
        totalRequests,
        newRequests,
        awaitingResponse,
        responsesReceived,
        // Quotations flow
        totalQuotations,
        pendingApproval,
        approvedQuotations,
        rejectedQuotations,
        totalApprovedValue,
        averageValue,
      };
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="space-y-6">
        {/* Quotation Requests Flow */}
        <div>
          <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Fluxo de Solicitações</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold text-primary">
                      {stats?.totalRequests || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total Solicitações
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-info/10 to-info/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-info" />
                  <div>
                    <p className="text-2xl font-bold text-info">
                      {stats?.newRequests || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Novas (Não Enviadas)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-warning/10 to-warning/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-warning" />
                  <div>
                    <p className="text-2xl font-bold text-warning">
                      {stats?.awaitingResponse || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Aguardando Resposta
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-success/10 to-success/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-2xl font-bold text-success">
                      {stats?.responsesReceived || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Respostas Recebidas
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submitted Quotations Flow */}
        <div>
          <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Orçamentos Submetidos</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue/10 to-blue/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {stats?.totalQuotations || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total Recebidos
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow/10 to-yellow/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">
                      {stats?.pendingApproval || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pendente Aprovação
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-success/10 to-success/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-2xl font-bold text-success">
                      {stats?.approvedQuotations || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Aprovados
                    </p>
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
                    <p className="text-xs text-muted-foreground">
                      Valor Médio Aprovado
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Solicitações ({stats?.totalRequests || 0})
          </TabsTrigger>
          <TabsTrigger value="submitted" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Orçamentos Recebidos ({stats?.totalQuotations || 0})
          </TabsTrigger>
        </TabsList>

        {/* Quotation Requests Tab */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Assistências que Requerem Orçamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : !quotationRequests || quotationRequests.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma solicitação de orçamento</h3>
                  <p className="text-sm">As assistências que requerem orçamento aparecerão aqui.</p>
                  <p className="text-xs mt-2 text-muted-foreground">
                    Para solicitar orçamentos, marque "Requer Orçamento" nas assistências
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {quotationRequests.map((assistance) => (
                    <div 
                      key={assistance.id} 
                      className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{assistance.title}</h4>
                          <StatusBadge status={assistance.status as keyof typeof import("@/utils/constants").STATUS_TRANSLATIONS} />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(assistance.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Edifício:</span><br />
                          <span className="text-muted-foreground">{assistance.buildings?.name}</span>
                        </div>
                        <div>
                          <span className="font-medium">Fornecedor:</span><br />
                          <span className="text-muted-foreground">{assistance.suppliers?.name || "Não atribuído"}</span>
                        </div>
                        <div>
                          <span className="font-medium">Tipo:</span><br />
                          <span className="text-muted-foreground">{assistance.intervention_types?.name}</span>
                        </div>
                      </div>

                      {assistance.quotation_requested_at && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Orçamento solicitado em {format(new Date(assistance.quotation_requested_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Submitted Quotations Tab */}
        <TabsContent value="submitted">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Orçamentos Submetidos pelos Fornecedores
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quotationsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : !quotations || quotations.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum orçamento submetido</h3>
                  <p className="text-sm">Os orçamentos aparecerão aqui quando os fornecedores os submeterem através do portal.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {quotations.map((quotation) => (
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
                          <StatusBadge status={quotation.status as keyof typeof import("@/utils/constants").STATUS_TRANSLATIONS} />
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

                      {quotation.description && (
                        <div className="mt-2">
                          <p className="text-sm text-muted-foreground">{quotation.description}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}