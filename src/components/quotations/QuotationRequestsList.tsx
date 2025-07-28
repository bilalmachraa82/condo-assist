import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Building, Calendar, Mail } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tables } from "@/integrations/supabase/types";

type AssistanceWithQuotationRequest = Tables<"assistances"> & {
  buildings?: Tables<"buildings">;
  suppliers?: Tables<"suppliers">;
  intervention_types?: Tables<"intervention_types">;
};

export default function QuotationRequestsList() {
  const { data: quotationRequests = [], isLoading } = useQuery({
    queryKey: ["quotation-requests"],
    queryFn: async () => {
      console.log("Fetching quotation requests...");
      const { data, error } = await supabase
        .from("assistances")
        .select(`
          *,
          buildings (name, address),
          suppliers (name, email, phone),
          intervention_types (name)
        `)
        .eq("requires_quotation", true)
        .is("quotation_requested_at", null) // Has not been requested yet
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching quotation requests:", error);
        throw error;
      }

      console.log(`Found ${data?.length || 0} quotation requests`);
      return data as AssistanceWithQuotationRequest[];
    },
  });

  const { data: pendingRequests = [], isLoading: loadingPending } = useQuery({
    queryKey: ["pending-quotation-requests"],
    queryFn: async () => {
      console.log("Fetching pending quotation requests...");
      const { data, error } = await supabase
        .from("assistances")
        .select(`
          *,
          buildings (name, address),
          suppliers (name, email, phone),
          intervention_types (name)
        `)
        .eq("requires_quotation", true)
        .not("quotation_requested_at", "is", null) // Has been requested
        .eq("status", "awaiting_quotation") // Still waiting for response
        .order("quotation_requested_at", { ascending: true });

      if (error) {
        console.error("Error fetching pending requests:", error);
        throw error;
      }

      console.log(`Found ${data?.length || 0} pending quotation requests`);
      return data as AssistanceWithQuotationRequest[];
    },
  });

  const resendQuotationRequest = async (assistanceId: string) => {
    try {
      const assistance = pendingRequests.find(a => a.id === assistanceId);
      if (!assistance || !assistance.suppliers) return;

      await supabase.functions.invoke('request-quotation-email', {
        body: {
          assistance_id: assistanceId,
          supplier_id: assistance.assigned_supplier_id,
          supplier_email: assistance.suppliers.email,
          supplier_name: assistance.suppliers.name,
          assistance_title: assistance.title,
          assistance_description: assistance.description,
          building_name: assistance.buildings?.name || "N/A",
          deadline: assistance.quotation_deadline
        }
      });

      // Log the email
      await supabase.from("email_logs").insert({
        recipient_email: assistance.suppliers.email,
        subject: `Lembrete: Solicitação de Orçamento - ${assistance.title}`,
        status: "sent",
        assistance_id: assistanceId,
        supplier_id: assistance.assigned_supplier_id,
        template_used: "quotation_reminder"
      });

      console.log("Quotation reminder sent successfully");
    } catch (error) {
      console.error("Error resending quotation request:", error);
    }
  };

  if (isLoading || loadingPending) {
    return <div className="text-center py-8">Carregando solicitações...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Orçamentos Solicitados ({pendingRequests.length})
          </h3>
          <div className="grid gap-4">
            {pendingRequests.map((request) => (
              <Card key={request.id} className="border-l-4 border-l-warning">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{request.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        {request.buildings?.name} • {request.suppliers?.name}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-warning border-warning">
                      Aguardando Resposta
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Solicitado: {format(new Date(request.quotation_requested_at!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      {request.quotation_deadline && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            Prazo: {format(new Date(request.quotation_deadline), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{request.suppliers?.email}</span>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resendQuotationRequest(request.id)}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Reenviar Solicitação
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* New/Unsent Requests */}
      {quotationRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Solicitações Pendentes ({quotationRequests.length})
          </h3>
          <div className="grid gap-4">
            {quotationRequests.map((request) => (
              <Card key={request.id} className="border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{request.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        {request.buildings?.name} • {request.suppliers?.name || "Sem fornecedor atribuído"}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-primary border-primary">
                      Por Enviar
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {request.description}
                    </p>
                    
                    {!request.assigned_supplier_id && (
                      <div className="bg-warning/10 text-warning p-3 rounded-lg text-sm">
                        ⚠️ Esta assistência precisa de um fornecedor atribuído antes de solicitar orçamento.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {quotationRequests.length === 0 && pendingRequests.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma solicitação pendente</h3>
            <p className="text-muted-foreground">
              Todas as solicitações de orçamento foram enviadas e respondidas.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}