import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { validateMagicCode } from "@/utils/magicCodeGenerator";
import { Building, CheckCircle, Clock, AlertCircle, MapPin, Calendar, Phone, Mail, MessageCircle, Upload, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import ResponseActions from "@/components/supplier/ResponseActions";
import EnhancedQuotationForm from "@/components/supplier/EnhancedQuotationForm";
import AdminCommunication from "@/components/supplier/AdminCommunication";
import FileUpload from "@/components/supplier/FileUpload";
import ProgressTracker from "@/components/supplier/ProgressTracker";
import ScheduleForm from "@/components/supplier/ScheduleForm";
import { useUpdateAssistanceStatus } from "@/hooks/useAssistances";
import { useCreateSupplierResponse } from "@/hooks/useSupplierResponses";
import { useQuotationsByAssistance } from "@/hooks/useQuotations";

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

export default function SupplierPortal() {
  const [searchParams] = useSearchParams();
  const magicCode = searchParams.get("code");
  const [enteredCode, setEnteredCode] = useState(magicCode || "");
  const [authenticated, setAuthenticated] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Verify magic code
  const { data: supplier, isLoading: verifyingCode, error: verificationError } = useQuery({
    queryKey: ["supplier-verify", enteredCode],
    queryFn: async (): Promise<Supplier | null> => {
      if (!enteredCode) return null;
      
      try {
        const validation = await validateMagicCode(enteredCode);
        
        if (!validation.isValid) {
          throw new Error("INVALID_OR_EXPIRED");
        }

        if (!validation.supplier) {
          throw new Error("SUPPLIER_NOT_FOUND");
        }

        setAuthenticated(true);
        setValidationError(null);
        
        toast({
          title: "Acesso autorizado",
          description: `Bem-vindo, ${validation.supplier.name}!`,
        });

        return validation.supplier;
      } catch (error: any) {
        setAuthenticated(false);
        if (error.message === "INVALID_OR_EXPIRED") {
          setValidationError("Código inválido ou expirado");
        } else if (error.message === "SUPPLIER_NOT_FOUND") {
          setValidationError("Fornecedor não encontrado");
        } else {
          setValidationError("Erro ao validar código");
        }
        throw error;
      }
    },
    enabled: !!enteredCode,
    retry: false,
  });

  // Get supplier's assistances
  const { data: assistances = [], isLoading: loadingAssistances } = useQuery({
    queryKey: ["supplier-assistances", supplier?.id],
    queryFn: async () => {
      if (!supplier?.id) return [];
      
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
          building_id,
          intervention_type_id,
          buildings (
            name,
            address
          ),
          intervention_types (
            name
          )
        `)
        .eq("assigned_supplier_id", supplier.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return assistanceData.map(assistance => ({
        ...assistance,
        building_name: assistance.buildings?.name || "N/A",
        building_address: assistance.buildings?.address || "N/A", 
        intervention_type_name: assistance.intervention_types?.name || "N/A",
      }));
    },
    enabled: !!supplier?.id,
  });

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
    
    setValidationError(null);
    queryClient.invalidateQueries({ queryKey: ["supplier-verify", enteredCode] });
  };

  // Login form
  if (!authenticated || (enteredCode && verificationError && !verifyingCode)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
                  onChange={(e) => {
                    setEnteredCode(e.target.value.toUpperCase());
                    setValidationError(null);
                  }}
                  className="text-center text-lg tracking-wider"
                  maxLength={8}
                />
                {validationError && (
                  <p className="text-sm text-destructive text-center">{validationError}</p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full h-12"
                disabled={verifyingCode}
              >
                {verifyingCode ? "Verificando..." : "Acessar Portal"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (verifyingCode || loadingAssistances) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{supplier?.name}</h1>
              <p className="text-primary-foreground/80">{supplier?.specialization}</p>
            </div>
            <div className="text-right text-sm">
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {supplier?.email}
              </div>
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {supplier?.phone}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {assistances.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Building className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Nenhuma assistência atribuída</h3>
              <p className="text-muted-foreground mb-4">
                Não há assistências atribuídas a si no momento.
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Se esperava ver assistências aqui, contacte a administração:</p>
                <p className="font-medium">suporte@luvimg.com</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          assistances.map((assistance) => (
            <AssistanceCard 
              key={assistance.id} 
              assistance={assistance} 
              supplier={supplier!}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Separate component for each assistance card
function AssistanceCard({ assistance, supplier }: { assistance: Assistance; supplier: Supplier }) {
  const [showDetails, setShowDetails] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  
  const { data: quotations = [] } = useQuotationsByAssistance(assistance.id);
  const { data: supplierResponses = [] } = useQuery({
    queryKey: ["supplier-responses", supplier.id, assistance.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_responses")
        .select("*")
        .eq("supplier_id", supplier.id)
        .eq("assistance_id", assistance.id);
      if (error) throw error;
      return data;
    },
  });

  const supplierResponse = supplierResponses[0] || null;
  const updateAssistanceMutation = useUpdateAssistanceStatus();
  const createResponseMutation = useCreateSupplierResponse();

  const getStatusInfo = (status: string) => {
    const configs = {
      pending: { color: "bg-yellow-500", icon: Clock, text: "Pendente" },
      accepted: { color: "bg-green-500", icon: CheckCircle, text: "Aceite" },
      scheduled: { color: "bg-blue-500", icon: Calendar, text: "Agendado" },
      in_progress: { color: "bg-blue-500", icon: Clock, text: "Em Progresso" },
      awaiting_validation: { color: "bg-yellow-500", icon: Clock, text: "Aguardando Validação" },
      awaiting_quotation: { color: "bg-orange-500", icon: FileText, text: "Aguardando Orçamento" },
      quotation_received: { color: "bg-purple-500", icon: FileText, text: "Orçamento Recebido" },
      completed: { color: "bg-green-500", icon: CheckCircle, text: "Concluída" },
      cancelled: { color: "bg-red-500", icon: AlertCircle, text: "Cancelada" },
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const statusInfo = getStatusInfo(assistance.status);
  const StatusIcon = statusInfo.icon;

  const getPriorityColor = () => {
    if (assistance.requires_quotation) return "border-l-orange-500";
    if (assistance.status === "pending") return "border-l-red-500";
    return "border-l-green-500";
  };

  const getMainAction = () => {
    if (!supplierResponse && (assistance.status === "pending" || assistance.status === "awaiting_quotation")) {
      return "respond";
    }
    if (assistance.requires_quotation && !quotations.length && supplierResponse?.response_type === "accepted") {
      return "quote";
    }
    if (assistance.status === "in_progress") {
      return "progress";
    }
    return null;
  };

  const handleAccept = (notes?: string) => {
    createResponseMutation.mutate({
      assistanceId: assistance.id,
      supplierId: supplier.id,
      responseType: "accepted",
      notes
    });
  };

  const handleDecline = (reason: string) => {
    createResponseMutation.mutate({
      assistanceId: assistance.id,
      supplierId: supplier.id,
      responseType: "declined",
      declineReason: reason
    });
  };

  const handleStartWork = () => {
    updateAssistanceMutation.mutate({
      assistanceId: assistance.id,
      newStatus: "in_progress"
    });
  };

  const handleCompleteWork = () => {
    updateAssistanceMutation.mutate({
      assistanceId: assistance.id,
      newStatus: "awaiting_validation"
    });
  };

  const mainAction = getMainAction();

  return (
    <Card className={`border-l-4 ${getPriorityColor()}`}>
      {/* Header */}
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{assistance.title}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-3 h-3 rounded-full ${statusInfo.color}`}></div>
              <span className="text-sm font-medium">{statusInfo.text}</span>
            </div>
          </div>
          <Badge variant="outline" className="ml-2">
            {assistance.intervention_type_name}
          </Badge>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <Building className="h-4 w-4" />
            {assistance.building_name}
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {assistance.building_address}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        <p className="text-sm">{assistance.description}</p>

        {/* Main Action Buttons */}
        {mainAction === "respond" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button 
              onClick={() => setActiveSection("accept")}
              className="h-12"
              size="lg"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Aceitar
            </Button>
            <Button 
              onClick={() => setActiveSection("decline")}
              variant="destructive"
              className="h-12"
              size="lg"
            >
              <AlertCircle className="h-5 w-5 mr-2" />
              Recusar
            </Button>
          </div>
        )}

        {mainAction === "quote" && (
          <Button 
            onClick={() => setActiveSection("quote")}
            className="w-full h-12"
            size="lg"
          >
            <FileText className="h-5 w-5 mr-2" />
            Submeter Orçamento
          </Button>
        )}

        {assistance.status === "accepted" && !assistance.requires_quotation && (
          <Button 
            onClick={handleStartWork}
            className="w-full h-12"
            size="lg"
          >
            Iniciar Trabalho
          </Button>
        )}

        {mainAction === "progress" && (
          <Button 
            onClick={handleCompleteWork}
            className="w-full h-12"
            size="lg"
          >
            Completar Trabalho
          </Button>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setActiveSection(activeSection === "communication" ? null : "communication")}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            Comunicar
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setActiveSection(activeSection === "files" ? null : "files")}
          >
            <Upload className="h-4 w-4 mr-1" />
            Ficheiros
          </Button>
        </div>

        {/* Active Sections */}
        {activeSection === "accept" && (
          <div className="border rounded-lg p-4 bg-green-50">
            <ResponseActions
              assistance={assistance}
              supplierResponse={supplierResponse}
              quotations={quotations}
              onAccept={handleAccept}
              onDecline={() => {}}
              onQuote={() => setActiveSection("quote")}
            />
          </div>
        )}

        {activeSection === "decline" && (
          <div className="border rounded-lg p-4 bg-red-50">
            <ResponseActions
              assistance={assistance}
              supplierResponse={supplierResponse}
              quotations={quotations}
              onAccept={() => {}}
              onDecline={handleDecline}
              onQuote={() => {}}
            />
          </div>
        )}

        {activeSection === "quote" && (
          <div className="border rounded-lg p-4">
            <EnhancedQuotationForm
              assistanceId={assistance.id}
              supplierId={supplier.id}
              onQuotationSubmitted={() => setActiveSection(null)}
            />
          </div>
        )}

        {activeSection === "communication" && (
          <div className="border rounded-lg p-4">
            <AdminCommunication
              assistanceId={assistance.id}
              supplierId={supplier.id}
            />
          </div>
        )}

        {activeSection === "files" && (
          <div className="border rounded-lg p-4">
            <FileUpload
              assistanceId={assistance.id}
              supplierId={supplier.id}
            />
          </div>
        )}

        {/* Show Details Toggle */}
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              Ver Detalhes
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <Separator />
            
            {/* Detailed Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Data de Criação:</strong>
                <p>{new Date(assistance.created_at).toLocaleDateString("pt-PT")}</p>
              </div>
              {assistance.quotation_deadline && (
                <div>
                  <strong>Prazo para Orçamento:</strong>
                  <p>{new Date(assistance.quotation_deadline).toLocaleDateString("pt-PT")}</p>
                </div>
              )}
              {assistance.requires_validation && (
                <div>
                  <strong>Requer Validação:</strong>
                  <p>Sim</p>
                </div>
              )}
              {assistance.completion_photos_required && (
                <div>
                  <strong>Fotos de Conclusão:</strong>
                  <p>Obrigatórias</p>
                </div>
              )}
            </div>

            {/* Additional Actions */}
            {assistance.status === "in_progress" && (
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setActiveSection(activeSection === "progress" ? null : "progress")}
                >
                  Registar Progresso
                </Button>
                {activeSection === "progress" && (
                  <div className="border rounded-lg p-4">
                    <ProgressTracker
                      assistanceId={assistance.id}
                      supplierId={supplier.id}
                      currentStatus={assistance.status}
                    />
                  </div>
                )}
              </div>
            )}

            {(assistance.status === "scheduled" || assistance.status === "accepted") && (
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setActiveSection(activeSection === "schedule" ? null : "schedule")}
                >
                  Agendar Trabalho
                </Button>
                {activeSection === "schedule" && (
                  <div className="border rounded-lg p-4">
                    <ScheduleForm
                      onSubmit={(data) => {
                        // Handle schedule submission
                        // Schedule data processed successfully
                        setActiveSection(null);
                      }}
                      isLoading={false}
                    />
                  </div>
                )}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}