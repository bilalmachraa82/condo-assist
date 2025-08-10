import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FileText, Euro, Calendar, User, CheckCircle, XCircle, Clock, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface QuotationListProps {
  assistanceId: string;
}

type Quotation = Tables<"quotations"> & {
  suppliers?: Tables<"suppliers">;
};

const statusLabels = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

const statusIcons = {
  pending: <Clock className="h-4 w-4" />,
  approved: <CheckCircle className="h-4 w-4" />,
  rejected: <XCircle className="h-4 w-4" />,
};

const statusVariants = {
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function QuotationList({ assistanceId }: QuotationListProps) {
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: quotations, isLoading } = useQuery({
    queryKey: ["assistance-quotations", assistanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotations")
        .select(`
          *,
          suppliers (id, name, email, phone)
        `)
        .eq("assistance_id", assistanceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Quotation[];
    },
  });

  const updateQuotationMutation = useMutation({
    mutationFn: async ({ quotationId, status }: { quotationId: string; status: "approved" | "rejected" }) => {
      const updateData: any = { 
        status,
        ...(status === "approved" && { approved_at: new Date().toISOString() })
      };

      const { data, error } = await supabase
        .from("quotations")
        .update(updateData)
        .eq("id", quotationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (quotation, { status }) => {
      try {
        await supabase
          .from("activity_log")
          .insert({
            assistance_id: assistanceId,
            action: `quotation_${status}`,
            details: `Orçamento ${status === "approved" ? "aprovado" : "rejeitado"} - €${quotation.amount}`,
            metadata: {
              quotation_id: quotation.id,
              amount: quotation.amount,
              status
            }
          });
      } catch (e) {
        console.warn("Ignorando erro ao registar activity_log (provável RLS)", e);
      }

      toast({
        title: "Sucesso",
        description: `Orçamento ${status === "approved" ? "aprovado" : "rejeitado"} com sucesso!`,
      });

      queryClient.invalidateQueries({ queryKey: ["assistance-quotations", assistanceId] });
      setSelectedQuotation(null);
    },
    onError: (error: any) => {
      console.error("Quotation update error:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar orçamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteQuotationMutation = useMutation({
    mutationFn: async (quotationId: string) => {
      const { error } = await supabase
        .from("quotations")
        .delete()
        .eq("id", quotationId);

      if (error) throw error;
      return quotationId;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Orçamento eliminado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["assistance-quotations", assistanceId] });
    },
    onError: (error: any) => {
      console.error("Delete quotation error:", error);
      toast({
        title: "Erro",
        description: "Erro ao eliminar orçamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = (quotationId: string, status: "approved" | "rejected") => {
    updateQuotationMutation.mutate({ quotationId, status });
  };

  const handleDelete = (quotationId: string) => {
    deleteQuotationMutation.mutate(quotationId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Orçamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            A carregar orçamentos...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!quotations || quotations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Orçamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Nenhum orçamento submetido ainda.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Orçamentos ({quotations.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {quotations.map((quotation) => (
            <div 
              key={quotation.id} 
              className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{quotation.suppliers?.name}</span>
                  </div>
                  <Badge className={statusVariants[quotation.status as keyof typeof statusVariants]}>
                    {statusIcons[quotation.status as keyof typeof statusIcons]}
                    <span className="ml-1">{statusLabels[quotation.status as keyof typeof statusLabels]}</span>
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-lg font-bold text-primary">
                    <Euro className="h-4 w-4" />
                    {Number(quotation.amount).toFixed(2)}
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {quotation.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Submetido {format(new Date(quotation.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Válido por {quotation.validity_days} dias</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Ver Detalhes
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Detalhes do Orçamento
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-1">Fornecedor</h4>
                            <p className="text-muted-foreground">{quotation.suppliers?.name}</p>
                            {quotation.suppliers?.email && (
                              <p className="text-sm text-muted-foreground">{quotation.suppliers.email}</p>
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium mb-1">Valor Total</h4>
                            <div className="flex items-center gap-1 text-2xl font-bold text-primary">
                              <Euro className="h-5 w-5" />
                              {Number(quotation.amount).toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <h4 className="font-medium mb-2">Descrição dos Trabalhos</h4>
                          <p className="text-muted-foreground whitespace-pre-wrap">{quotation.description}</p>
                        </div>

                        {quotation.notes && (
                          <div>
                            <h4 className="font-medium mb-2">Notas Adicionais</h4>
                            <p className="text-muted-foreground whitespace-pre-wrap">{quotation.notes}</p>
                          </div>
                        )}

                        <Separator />

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="font-medium">Estado</p>
                            <Badge className={statusVariants[quotation.status as keyof typeof statusVariants]}>
                              {statusIcons[quotation.status as keyof typeof statusIcons]}
                              <span className="ml-1">{statusLabels[quotation.status as keyof typeof statusLabels]}</span>
                            </Badge>
                          </div>
                          <div>
                            <p className="font-medium">Submetido</p>
                            <p className="text-muted-foreground">
                              {format(new Date(quotation.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium">Validade</p>
                            <p className="text-muted-foreground">{quotation.validity_days} dias</p>
                          </div>
                        </div>

                        {quotation.status === "pending" && (
                          <div className="flex justify-between items-center pt-4">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar Eliminação</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja eliminar este orçamento? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(quotation.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                onClick={() => handleStatusUpdate(quotation.id, "rejected")}
                                disabled={updateQuotationMutation.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Rejeitar
                              </Button>
                              <Button
                                onClick={() => handleStatusUpdate(quotation.id, "approved")}
                                disabled={updateQuotationMutation.isPending}
                                className="bg-success hover:bg-success/90"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Aprovar
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}