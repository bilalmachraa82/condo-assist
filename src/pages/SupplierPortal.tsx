import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useUpdateAssistanceStatus } from "@/hooks/useAssistances";
import { useCreateSupplierResponse } from "@/hooks/useSupplierResponses";
import { useQuotationsByAssistance } from "@/hooks/useQuotations";
import { Building, CheckCircle, Clock, AlertCircle, FileText, Euro, Calendar, Play, Pause, Eye, XCircle } from "lucide-react";
import SubmitQuotationForm from "@/components/quotations/SubmitQuotationForm";
import ScheduleForm from "@/components/supplier/ScheduleForm";
import ProgressTracker from "@/components/supplier/ProgressTracker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  specialization?: string;
}

interface Assistance {
  id: string;
  title: string;
  description: string;
  status: string;
  supplier_notes?: string;
  created_at: string;
  building_name?: string;
  building_address?: string;
  intervention_type_name?: string;
  scheduled_start_date?: string;
  scheduled_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  completion_photos_required?: boolean;
  requires_validation?: boolean;
  requires_quotation?: boolean;
  quotation_requested_at?: string;
  quotation_deadline?: string;
  buildings?: { name: string; address: string };
  intervention_types?: { name: string };
}

interface SupplierResponse {
  id: string;
  response_type: string;
  response_date: string;
  decline_reason?: string;
  notes?: string;
}

interface Quotation {
  id: string;
  amount: number;
  status: string;
  submitted_at: string;
  description?: string;
  notes?: string;
  validity_days?: number;
}

// Helper function to determine what actions are available for each assistance status
function getAvailableActions(assistance: Assistance, supplierResponse: SupplierResponse | null, quotations: Quotation[]) {
  const actions = {
    canRespond: false,
    canSubmitQuotation: false,
    canViewQuotation: false,
    canStartWork: false,
    canCompleteWork: false,
    showScheduling: false,
    showProgress: false,
    message: ""
  };

  // Check if supplier has already responded
  const hasResponded = supplierResponse !== null;
  const hasAccepted = supplierResponse?.response_type === "accepted";
  const hasDeclined = supplierResponse?.response_type === "declined";
  
  // Check quotation status
  const hasQuotations = quotations.length > 0;
  const latestQuotation = quotations[0]; // Assuming sorted by newest first
  const quotationApproved = latestQuotation?.status === "approved";
  const quotationPending = latestQuotation?.status === "pending";
  const quotationRejected = latestQuotation?.status === "rejected";

  switch (assistance.status) {
    case "pending":
      if (!hasResponded) {
        actions.canRespond = true;
        actions.message = "Por favor, aceite ou recuse esta assistência.";
      } else if (hasDeclined) {
        actions.message = "Assistência recusada.";
      } else if (hasAccepted) {
        if (assistance.requires_quotation && !hasQuotations) {
          actions.canSubmitQuotation = true;
          actions.message = "Assistência aceite. Por favor, submeta um orçamento.";
        } else if (assistance.requires_quotation && hasQuotations) {
          actions.canViewQuotation = true;
          actions.message = "Orçamento submetido. Aguardando aprovação.";
        } else {
          actions.canStartWork = true;
          actions.message = "Assistência aceite. Pode iniciar o trabalho.";
        }
      }
      break;

    case "awaiting_quotation":
      if (hasAccepted) {
        if (!hasQuotations) {
          actions.canSubmitQuotation = true;
          actions.message = "Por favor, submeta um orçamento para esta assistência.";
        } else {
          actions.canViewQuotation = true;
          actions.message = "Orçamento submetido. Aguardando aprovação.";
        }
      }
      break;

    case "quotation_received":
      actions.canViewQuotation = true;
      if (quotationPending) {
        actions.message = "Orçamento submetido. Aguardando aprovação do administrador.";
      } else if (quotationApproved) {
        actions.canStartWork = true;
        actions.message = "Orçamento aprovado! Pode iniciar o trabalho.";
      } else if (quotationRejected) {
        actions.canSubmitQuotation = true;
        actions.message = "Orçamento rejeitado. Por favor, submeta um novo orçamento.";
      }
      break;

    case "accepted":
      actions.canStartWork = true;
      actions.showScheduling = true;
      actions.message = "Assistência aceite. Pode iniciar o trabalho.";
      break;

    case "scheduled":
      actions.canStartWork = true;
      actions.showScheduling = true;
      actions.message = "Assistência agendada. Pode iniciar o trabalho.";
      break;

    case "in_progress":
      actions.canCompleteWork = true;
      actions.showProgress = true;
      actions.message = "Trabalho em progresso. Registe o progresso e complete quando terminar.";
      break;

    case "awaiting_validation":
      actions.showProgress = true;
      actions.message = "Assistência enviada para validação pelo administrador.";
      break;

    case "completed":
      actions.message = "Assistência concluída com sucesso.";
      break;

    case "cancelled":
      actions.message = "Assistência cancelada.";
      break;

    default:
      actions.message = "Estado não reconhecido.";
  }

  return actions;
}

export default function SupplierPortal() {
  const [searchParams] = useSearchParams();
  const magicCode = searchParams.get("code");
  const [enteredCode, setEnteredCode] = useState(magicCode || "");
  const [authenticated, setAuthenticated] = useState(!!magicCode);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Verify magic code
  const { data: supplier, isLoading: verifyingCode } = useQuery({
    queryKey: ["supplier-verify", enteredCode],
    queryFn: async (): Promise<Supplier | null> => {
      if (!enteredCode) return null;
      
      console.log("Verifying magic code:", enteredCode.toUpperCase());
      
      const { data: magicCodeData, error } = await supabase
        .from("supplier_magic_codes")
        .select("supplier_id, expires_at")
        .eq("magic_code", enteredCode.toUpperCase())
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error) throw error;
      if (!magicCodeData) return null;

      const { data: supplierData, error: supplierError } = await supabase
        .from("suppliers")
        .select("id, name, email, phone, address, specialization")
        .eq("id", magicCodeData.supplier_id)
        .single();

      if (supplierError) throw supplierError;
      return supplierData;
    },
    enabled: !!enteredCode && authenticated,
  });

  // Get supplier's assistances with all required fields using optimized query
  const { data: assistances = [], isLoading: loadingAssistances, error: assistancesError } = useQuery({
    queryKey: ["supplier-assistances", supplier?.id],
    queryFn: async () => {
      if (!supplier?.id) {
        console.log("❌ No supplier ID available for fetching assistances");
        return [];
      }
      
      console.log("🔍 Fetching assistances for supplier:", supplier.id);
      
      try {
        // Use a single query with joins for better performance and reliability
        const { data: assistanceData, error } = await supabase
          .from("assistances")
          .select(`
            id, 
            title,
            description, 
            status, 
            supplier_notes, 
            created_at,
            scheduled_start_date, 
            scheduled_end_date, 
            actual_start_date, 
            actual_end_date,
            completion_photos_required, 
            requires_validation, 
            requires_quotation,
            quotation_requested_at, 
            quotation_deadline,
            buildings!inner (
              name,
              address
            ),
            intervention_types!inner (
              name
            )
          `)
          .eq("assigned_supplier_id", supplier.id)
          .order("created_at", { ascending: false });

        console.log("📊 Query result:", { data: assistanceData, error });

        if (error) {
          console.error("❌ Database error:", error);
          throw error;
        }
        
        if (!assistanceData || assistanceData.length === 0) {
          console.log("⚠️ No assistances found for supplier", supplier.id);
          return [];
        }
        
        // Transform the data to match the expected interface
        const transformedData = assistanceData.map(assistance => ({
          ...assistance,
          building_name: assistance.buildings?.name || "N/A",
          building_address: assistance.buildings?.address || "N/A", 
          intervention_type_name: assistance.intervention_types?.name || "N/A",
        }));
        
        console.log("✅ Successfully fetched assistances:", transformedData.length);
        return transformedData;
        
      } catch (error) {
        console.error("❌ Error fetching assistances:", error);
        throw error; // Re-throw to show error in UI
      }
    },
    enabled: !!supplier?.id,
    retry: 2,
    staleTime: 30000, // 30 seconds
  });

  // Get supplier responses for each assistance
  const { data: supplierResponses = [] } = useQuery({
    queryKey: ["supplier-responses", supplier?.id],
    queryFn: async () => {
      if (!supplier?.id) return [];
      
      const { data, error } = await supabase
        .from("supplier_responses")
        .select("*")
        .eq("supplier_id", supplier.id);

      if (error) throw error;
      return data;
    },
    enabled: !!supplier?.id,
  });

  const updateAssistanceMutation = useUpdateAssistanceStatus();
  const createResponseMutation = useCreateSupplierResponse();

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredCode.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira o código de acesso.",
        variant: "destructive",
      });
      return;
    }
    setAuthenticated(true);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "secondary" as const, icon: Clock, text: "Pendente" },
      accepted: { variant: "default" as const, icon: CheckCircle, text: "Aceite" },
      scheduled: { variant: "outline" as const, icon: Calendar, text: "Agendado" },
      in_progress: { variant: "default" as const, icon: Play, text: "Em Progresso" },
      awaiting_validation: { variant: "secondary" as const, icon: Pause, text: "Aguardando Validação" },
      awaiting_quotation: { variant: "outline" as const, icon: FileText, text: "Aguardando Orçamento" },
      quotation_received: { variant: "outline" as const, icon: Euro, text: "Orçamento Recebido" },
      completed: { variant: "default" as const, icon: CheckCircle, text: "Concluída" },
      cancelled: { variant: "destructive" as const, icon: XCircle, text: "Cancelada" },
    };
    
    const config = variants[status as keyof typeof variants] || variants.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  // If code is invalid or expired
  if (authenticated && !verifyingCode && !supplier) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Código Inválido</CardTitle>
            <CardDescription>
              O código de acesso é inválido ou expirou. Por favor, solicite um novo código.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => {
                setAuthenticated(false);
                setEnteredCode("");
              }}
              className="w-full"
            >
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img 
                src="/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png" 
                alt="Luvimg" 
                className="h-16 w-auto"
              />
            </div>
            <CardTitle className="text-primary">Portal do Fornecedor</CardTitle>
            <CardDescription>
              Insira o código de acesso enviado por email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código de Acesso</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Digite o código"
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
                  className="text-center text-lg tracking-wider"
                  maxLength={6}
                />
              </div>
              <Button type="submit" className="w-full">
                Acessar Portal
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state
  if (verifyingCode || loadingAssistances) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Main portal interface
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png" 
                alt="Luvimg" 
                className="h-8 w-auto"
              />
              <div>
                <h1 className="font-semibold">Portal do Fornecedor - Luvimg</h1>
                <p className="text-sm text-muted-foreground">
                  {supplier?.name}
                </p>
              </div>
            </div>
            <Badge variant="outline">
              {assistances?.length || 0} Assistências
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Supplier Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Fornecedor</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                <p className="text-sm">{supplier?.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Telefone</Label>
                <p className="text-sm">{supplier?.phone}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Especialização</Label>
                <p className="text-sm">{supplier?.specialization || "Não especificado"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Morada</Label>
                <p className="text-sm">{supplier?.address}</p>
              </div>
            </CardContent>
          </Card>

          {/* Assistances */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Suas Assistências</h2>
            
            {assistancesError ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="text-destructive mb-2">
                    <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                    <p className="font-medium">Erro ao carregar assistências</p>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {assistancesError.message || "Ocorreu um erro inesperado"}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["supplier-assistances"] })}
                  >
                    Tentar Novamente
                  </Button>
                </CardContent>
              </Card>
            ) : assistances?.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="text-muted-foreground mb-2">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  </div>
                  <p className="text-muted-foreground">
                    Não há assistências atribuídas no momento.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Código: {enteredCode} | Fornecedor: {supplier?.name}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {assistances?.map((assistance) => {
                  const supplierResponse = supplierResponses.find(r => r.assistance_id === assistance.id);
                  
                  return (
                    <AssistanceCard 
                      key={assistance.id}
                      assistance={assistance}
                      supplier={supplier!}
                      supplierResponse={supplierResponse}
                      onResponseSubmit={createResponseMutation.mutate}
                      onStatusUpdate={updateAssistanceMutation.mutate}
                      isLoading={createResponseMutation.isPending || updateAssistanceMutation.isPending}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Separate component for each assistance card
function AssistanceCard({ 
  assistance, 
  supplier, 
  supplierResponse, 
  onResponseSubmit, 
  onStatusUpdate, 
  isLoading 
}: {
  assistance: Assistance;
  supplier: Supplier;
  supplierResponse: SupplierResponse | null;
  onResponseSubmit: any;
  onStatusUpdate: any;
  isLoading: boolean;
}) {
  const { data: quotations = [] } = useQuotationsByAssistance(assistance.id);
  const actions = getAvailableActions(assistance, supplierResponse, quotations);
  
  // Determine which tabs to show
  const tabs = [
    { id: "details", label: "Detalhes", show: true },
    { id: "quotation", label: "Orçamento", show: assistance.requires_quotation },
    { id: "progress", label: "Progresso", show: actions.showProgress },
    { id: "schedule", label: "Agendamento", show: actions.showScheduling },
    { id: "actions", label: "Ações", show: true }
  ].filter(tab => tab.show);

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "secondary" as const, icon: Clock, text: "Pendente" },
      accepted: { variant: "default" as const, icon: CheckCircle, text: "Aceite" },
      scheduled: { variant: "outline" as const, icon: Calendar, text: "Agendado" },
      in_progress: { variant: "default" as const, icon: Play, text: "Em Progresso" },
      awaiting_validation: { variant: "secondary" as const, icon: Pause, text: "Aguardando Validação" },
      awaiting_quotation: { variant: "outline" as const, icon: FileText, text: "Aguardando Orçamento" },
      quotation_received: { variant: "outline" as const, icon: Euro, text: "Orçamento Recebido" },
      completed: { variant: "default" as const, icon: CheckCircle, text: "Concluída" },
      cancelled: { variant: "destructive" as const, icon: XCircle, text: "Cancelada" },
    };
    
    const config = variants[status as keyof typeof variants] || variants.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">
              {assistance.intervention_type_name}
            </CardTitle>
            <CardDescription>
              {assistance.building_name} - {assistance.building_address}
            </CardDescription>
          </div>
          {getStatusBadge(assistance.status)}
        </div>
        {actions.message && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
            <p className="text-sm text-blue-800">{actions.message}</p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="details" className="w-full">
          <TabsList className={`grid w-full grid-cols-${tabs.length}`}>
            {tabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>
          
          <TabsContent value="details" className="mt-4 space-y-4">
            <div>
              <Label className="text-sm font-medium">Descrição</Label>
              <p className="text-sm text-muted-foreground">
                {assistance.description}
              </p>
            </div>
            
            {assistance.supplier_notes && (
              <div>
                <Label className="text-sm font-medium">Suas Notas</Label>
                <p className="text-sm text-muted-foreground">
                  {assistance.supplier_notes}
                </p>
              </div>
            )}

            {assistance.quotation_deadline && (
              <div>
                <Label className="text-sm font-medium">Prazo para Orçamento</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(assistance.quotation_deadline).toLocaleDateString("pt-PT")}
                </p>
              </div>
            )}
          </TabsContent>

          {assistance.requires_quotation && (
            <TabsContent value="quotation" className="mt-4">
              {actions.canSubmitQuotation ? (
                <SubmitQuotationForm
                  assistanceId={assistance.id}
                  supplierId={supplier.id}
                  onQuotationSubmitted={() => {
                    // Refresh data after quotation submission
                  }}
                />
              ) : actions.canViewQuotation && quotations.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-medium">Orçamento Submetido</h4>
                  {quotations.map(quotation => (
                    <Card key={quotation.id}>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Valor</Label>
                            <p className="text-lg font-semibold">€{quotation.amount}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Estado</Label>
                            <Badge variant={quotation.status === "approved" ? "default" : quotation.status === "rejected" ? "destructive" : "secondary"}>
                              {quotation.status === "approved" ? "Aprovado" : quotation.status === "rejected" ? "Rejeitado" : "Pendente"}
                            </Badge>
                          </div>
                          {quotation.description && (
                            <div className="col-span-2">
                              <Label className="text-sm font-medium text-muted-foreground">Descrição</Label>
                              <p className="text-sm">{quotation.description}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Não é necessário orçamento para esta assistência.</p>
                </div>
              )}
            </TabsContent>
          )}

          {actions.showProgress && (
            <TabsContent value="progress" className="mt-4">
              <ProgressTracker
                assistanceId={assistance.id}
                supplierId={supplier.id}
                currentStatus={assistance.status}
              />
            </TabsContent>
          )}

          {actions.showScheduling && (
            <TabsContent value="schedule" className="mt-4">
              {assistance.status === "pending" && actions.canRespond ? (
                <ScheduleForm
                  onSubmit={(scheduleData) => {
                    onResponseSubmit({
                      assistanceId: assistance.id,
                      supplierId: supplier.id,
                      responseType: "accepted",
                      ...scheduleData
                    });
                  }}
                  isLoading={isLoading}
                />
              ) : (
                <div className="space-y-4">
                  {assistance.scheduled_start_date ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Início Agendado</Label>
                        <p className="text-sm">
                          {new Date(assistance.scheduled_start_date).toLocaleString("pt-PT")}
                        </p>
                      </div>
                      {assistance.scheduled_end_date && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Fim Agendado</Label>
                          <p className="text-sm">
                            {new Date(assistance.scheduled_end_date).toLocaleString("pt-PT")}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">
                      Não há informações de agendamento para esta assistência.
                    </p>
                  )}
                </div>
              )}
            </TabsContent>
          )}

          <TabsContent value="actions" className="mt-4">
            <div className="space-y-4">
              {actions.canRespond && (
                <div className="space-y-3">
                  <h4 className="font-medium">Responder à Assistência</h4>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        onResponseSubmit({
                          assistanceId: assistance.id,
                          supplierId: supplier.id,
                          responseType: "accepted"
                        });
                      }}
                      disabled={isLoading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      ✅ Aceitar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const reason = prompt("Motivo da recusa (opcional):");
                        onResponseSubmit({
                          assistanceId: assistance.id,
                          supplierId: supplier.id,
                          responseType: "declined",
                          declineReason: reason || undefined
                        });
                      }}
                      disabled={isLoading}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      ❌ Recusar
                    </Button>
                  </div>
                </div>
              )}

              {actions.canStartWork && (
                <div className="space-y-3">
                  <h4 className="font-medium">Iniciar Trabalho</h4>
                  <Button
                    onClick={() => onStatusUpdate({
                      assistanceId: assistance.id,
                      newStatus: "in_progress"
                    })}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    ▶️ Iniciar Assistência
                  </Button>
                </div>
              )}
              
              {actions.canCompleteWork && (
                <div className="space-y-3">
                  <h4 className="font-medium">Concluir Assistência</h4>
                  {assistance.completion_photos_required && (
                    <p className="text-sm text-muted-foreground">
                      Certifique-se de que adicionou fotos de conclusão no separador 'Progresso'.
                    </p>
                  )}
                  <Button
                    onClick={() => onStatusUpdate({
                      assistanceId: assistance.id,
                      newStatus: assistance.requires_validation ? "awaiting_validation" : "completed"
                    })}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    ✅ {assistance.requires_validation ? "Enviar para Validação" : "Marcar como Concluída"}
                  </Button>
                </div>
              )}

              {isLoading && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border">
                  🔄 A processar...
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}