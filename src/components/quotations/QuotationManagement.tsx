import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Eye, Clock, Mail } from "lucide-react";
import { toast } from "sonner";
import QuotationRequestsList from "./QuotationRequestsList";

interface QuotationDetails {
  id: string;
  amount: number;
  description: string;
  notes: string;
  status: string;
  validity_days: number;
  created_at: string;
  assistance_id: string;
  supplier_id: string;
  suppliers: {
    name: string;
    email: string;
    phone: string;
  };
  assistances: {
    title: string;
    description: string;
    status: string;
  };
}

export default function QuotationManagement() {
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationDetails | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ["all-quotations"],
    queryFn: async () => {
      console.log("Fetching all quotations for management...");
      const { data, error } = await supabase
        .from("quotations")
        .select(`
          *,
          suppliers (name, email, phone),
          assistances (title, description, status)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching quotations:", error);
        throw error;
      }
      
      console.log(`Fetched ${data?.length || 0} quotations`);
      return data as QuotationDetails[];
    },
  });

  const updateQuotationMutation = useMutation({
    mutationFn: async ({ 
      quotationId, 
      status, 
      notes 
    }: { 
      quotationId: string; 
      status: "approved" | "rejected"; 
      notes?: string; 
    }) => {
      console.log(`Updating quotation ${quotationId} to ${status}`);
      
      const updateData: any = { 
        status,
        approved_at: status === "approved" ? new Date().toISOString() : null
      };
      
      if (notes) updateData.notes = notes;

      const { error } = await supabase
        .from("quotations")
        .update(updateData)
        .eq("id", quotationId);

      if (error) throw error;
      
      // Log activity
      await supabase.from("activity_log").insert({
        action: `quotation_${status}`,
        details: `Quotation ${status} for amount €${selectedQuotation?.amount}`,
        assistance_id: selectedQuotation?.assistance_id,
        supplier_id: selectedQuotation?.supplier_id,
        metadata: { quotation_id: quotationId, amount: selectedQuotation?.amount }
      });
    },
    onSuccess: (_, variables) => {
      console.log(`Quotation ${variables.status} successfully`);
      toast.success(`Quotation ${variables.status} successfully`);
      queryClient.invalidateQueries({ queryKey: ["all-quotations"] });
      setSelectedQuotation(null);
      setReviewNotes("");
    },
    onError: (error) => {
      console.error("Error updating quotation:", error);
      toast.error("Failed to update quotation");
    },
  });

  const handleApproval = (status: "approved" | "rejected") => {
    if (!selectedQuotation) return;
    
    updateQuotationMutation.mutate({
      quotationId: selectedQuotation.id,
      status,
      notes: reviewNotes || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "outline" as const, icon: Clock, text: "Pendente" },
      approved: { variant: "default" as const, icon: CheckCircle, text: "Aprovado" },
      rejected: { variant: "destructive" as const, icon: XCircle, text: "Rejeitado" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando orçamentos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Orçamentos</h2>
          <p className="text-muted-foreground">Analisar e gerir orçamentos de fornecedores</p>
        </div>
      </div>

      <Tabs defaultValue="received" className="space-y-6">
        <TabsList>
          <TabsTrigger value="received" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Orçamentos Recebidos
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Solicitações Pendentes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-6">

      {quotations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Nenhum orçamento encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {quotations.map((quotation) => (
            <Card key={quotation.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{quotation.assistances.title}</CardTitle>
                    <CardDescription>
                      Fornecedor: {quotation.suppliers.name} • €{quotation.amount.toLocaleString()}
                    </CardDescription>
                  </div>
                  {getStatusBadge(quotation.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Submetido:</span>{" "}
                      {new Date(quotation.created_at).toLocaleDateString('pt-PT')}
                    </div>
                    <div>
                      <span className="font-medium">Válido por:</span> {quotation.validity_days} dias
                    </div>
                  </div>
                  
                  {quotation.description && (
                    <div>
                      <span className="font-medium text-sm">Descrição:</span>
                      <p className="text-sm text-muted-foreground mt-1">{quotation.description}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedQuotation(quotation)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Rever Detalhes
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Revisão de Orçamento</DialogTitle>
                          <DialogDescription>
                            Rever e aprovar ou rejeitar este orçamento
                          </DialogDescription>
                        </DialogHeader>
                        {selectedQuotation && (
                          <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="font-medium">Fornecedor</Label>
                                <p>{selectedQuotation.suppliers.name}</p>
                                <p className="text-sm text-muted-foreground">{selectedQuotation.suppliers.email}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Valor</Label>
                                <p className="text-2xl font-bold text-primary">€{selectedQuotation.amount.toLocaleString()}</p>
                              </div>
                            </div>
                            
                            <div>
                              <Label className="font-medium">Assistência</Label>
                              <p>{selectedQuotation.assistances.title}</p>
                              <p className="text-sm text-muted-foreground">{selectedQuotation.assistances.description}</p>
                            </div>

                            {selectedQuotation.description && (
                              <div>
                                <Label className="font-medium">Detalhes do Orçamento</Label>
                                <p className="text-sm">{selectedQuotation.description}</p>
                              </div>
                            )}

                            <div>
                              <Label htmlFor="review-notes">Notas de Revisão (Opcional)</Label>
                              <Textarea
                                id="review-notes"
                                placeholder="Adicione notas sobre a sua decisão..."
                                value={reviewNotes}
                                onChange={(e) => setReviewNotes(e.target.value)}
                                className="mt-2"
                              />
                            </div>

                            {selectedQuotation.status === "pending" && (
                              <div className="flex gap-3 pt-4">
                                <Button
                                  onClick={() => handleApproval("approved")}
                                  disabled={updateQuotationMutation.isPending}
                                  className="flex-1"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Aprovar Orçamento
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => handleApproval("rejected")}
                                  disabled={updateQuotationMutation.isPending}
                                  className="flex-1"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Rejeitar Orçamento
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
        </TabsContent>

        <TabsContent value="requests">
          <QuotationRequestsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}