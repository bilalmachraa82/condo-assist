import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clock, Building, Calendar, Mail, AlertCircle, CheckCircle2, Timer, Users } from "lucide-react";
import { format, isAfter, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

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
    const assistance = pendingRequests.find((a) => a.id === assistanceId);
    if (!assistance) {
      toast.error("Assistência não encontrada.");
      return;
    }
    if (!assistance.assigned_supplier_id || !assistance.suppliers?.email) {
      toast.error("Fornecedor ou email em falta para reenviar.");
      return;
    }

    await toast.promise(
      (async () => {
        const { data: fnData, error: fnError } = await supabase.functions.invoke(
          "request-quotation-email",
          {
            body: {
              assistance_id: assistanceId,
              supplier_id: assistance.assigned_supplier_id,
              supplier_email: assistance.suppliers.email,
              supplier_name: assistance.suppliers.name,
              assistance_title: assistance.title,
              assistance_description: assistance.description,
              building_name: assistance.buildings?.name || "N/A",
              deadline: assistance.quotation_deadline,
            },
          }
        );

        if (fnError) {
          throw new Error(fnError.message || "Falha no envio do email");
        }

        try {
          await supabase.from("email_logs").insert({
            recipient_email: assistance.suppliers.email,
            subject: `Lembrete: Solicitação de Orçamento - ${assistance.title}`,
            status: "sent",
            assistance_id: assistanceId,
            supplier_id: assistance.assigned_supplier_id,
            template_used: "quotation_reminder",
          });
        } catch (e) {
          console.warn(
            "Ignorando erro ao registar em email_logs (provável RLS)",
            e
          );
        }

        return fnData;
      })(),
      {
        loading: "A reenviar solicitação...",
        success: "Solicitação reenviada ao fornecedor.",
        error: "Falha ao reenviar solicitação.",
      }
    );
  };

  const getPriorityBadge = (request: AssistanceWithQuotationRequest) => {
    const now = new Date();
    const isOverdue = request.quotation_deadline && isAfter(now, new Date(request.quotation_deadline));
    const daysUntilDeadline = request.quotation_deadline ? differenceInDays(new Date(request.quotation_deadline), now) : null;
    
    if (isOverdue) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Prazo Excedido
        </Badge>
      );
    }
    
    if (daysUntilDeadline !== null && daysUntilDeadline <= 2) {
      return (
        <Badge variant="outline" className="flex items-center gap-1 text-warning border-warning">
          <Timer className="h-3 w-3" />
          Urgente
        </Badge>
      );
    }
    
    return null;
  };

  if (isLoading || loadingPending) {
    return <div className="text-center py-8">Carregando solicitações...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests - Awaiting Response */}
      {pendingRequests.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-5 w-5 text-warning" />
            <h3 className="text-lg font-semibold">
              Orçamentos Solicitados ({pendingRequests.length})
            </h3>
          </div>
          <div className="grid gap-4">
            {pendingRequests.map((request) => {
              const isOverdue = request.quotation_deadline && isAfter(new Date(), new Date(request.quotation_deadline));
              const daysUntilDeadline = request.quotation_deadline ? differenceInDays(new Date(request.quotation_deadline), new Date()) : null;
              
              return (
                <Card key={request.id} className={`hover:shadow-md transition-all duration-200 border-l-4 ${
                  isOverdue ? 'border-l-destructive bg-destructive/5' : 
                  daysUntilDeadline !== null && daysUntilDeadline <= 2 ? 'border-l-warning bg-warning/5' :
                  'border-l-warning'
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <CardTitle className="text-lg font-semibold">{request.title}</CardTitle>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building className="h-4 w-4" />
                            {request.buildings?.name}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            {request.suppliers?.name}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {getPriorityBadge(request)}
                        <Badge variant="outline" className="text-warning border-warning">
                          <Clock className="h-3 w-3 mr-1" />
                          Aguardando
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {request.description}
                      </p>
                      
                      <Separator />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <div>
                            <span className="font-medium">Solicitado:</span>
                            <p className="text-muted-foreground">
                              {format(new Date(request.quotation_requested_at!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        {request.quotation_deadline && (
                          <div className="flex items-center gap-2">
                            <Timer className={`h-4 w-4 ${isOverdue ? 'text-destructive' : daysUntilDeadline !== null && daysUntilDeadline <= 2 ? 'text-warning' : 'text-muted-foreground'}`} />
                            <div>
                              <span className="font-medium">Prazo limite:</span>
                              <p className={`${isOverdue ? 'text-destructive font-medium' : daysUntilDeadline !== null && daysUntilDeadline <= 2 ? 'text-warning font-medium' : 'text-muted-foreground'}`}>
                                {format(new Date(request.quotation_deadline), "dd/MM/yyyy", { locale: ptBR })}
                                {daysUntilDeadline !== null && (
                                  <span className="ml-1 text-xs">
                                    ({daysUntilDeadline > 0 ? `${daysUntilDeadline} dias restantes` : 
                                      daysUntilDeadline === 0 ? 'hoje' : 
                                      `${Math.abs(daysUntilDeadline)} dias de atraso`})
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{request.suppliers?.email}</span>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resendQuotationRequest(request.id)}
                          className="hover:bg-primary/10"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Reenviar Solicitação
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* New/Unsent Requests */}
      {quotationRequests.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">
              Solicitações Pendentes ({quotationRequests.length})
            </h3>
          </div>
          <div className="grid gap-4">
            {quotationRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-all duration-200 border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <CardTitle className="text-lg font-semibold">{request.title}</CardTitle>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Building className="h-4 w-4" />
                          {request.buildings?.name}
                        </div>
                        {request.suppliers?.name ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            {request.suppliers.name}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-sm text-warning">
                            <AlertCircle className="h-4 w-4" />
                            Sem fornecedor
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Badge variant="outline" className="text-primary border-primary">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Por Enviar
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {request.description}
                    </p>
                    
                    {!request.assigned_supplier_id && (
                      <div className="bg-warning/10 border border-warning/20 text-warning p-3 rounded-lg text-sm flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Ação necessária</p>
                          <p>Esta assistência precisa de um fornecedor atribuído antes de solicitar orçamento.</p>
                        </div>
                      </div>
                    )}
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Criado: {format(new Date(request.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                      {request.suppliers?.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{request.suppliers.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {quotationRequests.length === 0 && pendingRequests.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-primary/10 p-4 rounded-full">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Tudo em Ordem!</h3>
                <p className="text-muted-foreground max-w-md">
                  Todas as solicitações de orçamento foram enviadas e processadas. 
                  Não há nenhuma ação pendente neste momento.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}