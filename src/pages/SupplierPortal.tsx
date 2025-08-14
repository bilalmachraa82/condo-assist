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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import EnhancedQuotationForm from "@/components/supplier/EnhancedQuotationForm";
import AdminCommunication from "@/components/supplier/AdminCommunication";
import FileUpload from "@/components/supplier/FileUpload";
import ProgressTracker from "@/components/supplier/ProgressTracker";
import ScheduleForm from "@/components/supplier/ScheduleForm";
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
  const [linkedAssistanceId, setLinkedAssistanceId] = useState<string | null>(null);
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
        setLinkedAssistanceId(validation.assistanceId ?? null);

        // Auto-associate code to latest assistance if not linked
        if (!validation.assistanceId) {
          try {
            const { data: linkData } = await supabase.rpc('link_code_to_latest_assistance', { p_magic_code: enteredCode });
            if ((linkData as any)?.success && (linkData as any)?.assistance_id) {
              setLinkedAssistanceId((linkData as any).assistance_id);
            }
          } catch (e) {
            console.warn("Falha ao associar automaticamente o código à assistência mais recente.", e);
          }
        }
        
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

  // Get supplier's assistances via RPC (bypasses RLS for anonymous access)
  const { data: assistances = [], isLoading: loadingAssistances } = useQuery({
    queryKey: ["supplier-assistances", enteredCode, linkedAssistanceId],
    queryFn: async () => {
      if (!enteredCode) return [];
      
      console.log(`Fetching assistances via RPC for code: ${enteredCode}`);
      const { data, error } = await supabase.rpc('get_assistances_for_code', { p_magic_code: enteredCode });
      
      if (error) {
        console.error("Error fetching assistances via RPC:", error);
        throw error;
      }
      
      const assistanceData = (data as any[]) || [];
      console.log(`Found ${assistanceData.length} assistances via RPC`);
      
      return assistanceData.map((a: any) => ({
        ...a,
        building_name: a.building_name || "N/A",
        building_address: a.building_address || "N/A",
        intervention_type_name: a.intervention_type_name || "N/A",
      }));
    },
    enabled: !!enteredCode && authenticated,
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
                <p className="font-medium">arquivo@luvimg.com</p>
                <p className="text-xs mt-2">Código usado: <span className="font-mono bg-muted px-1 rounded">{enteredCode}</span></p>
              </div>
            </CardContent>
          </Card>
        ) : (
          assistances.map((assistance) => (
            <AssistanceCard 
              key={assistance.id} 
              assistance={assistance} 
              supplier={supplier!}
              magicCode={enteredCode}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Separate component for each assistance card
function AssistanceCard({ assistance, supplier, magicCode }: { assistance: Assistance; supplier: Supplier; magicCode: string }) {
  const [showDetails, setShowDetails] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  
  const { data: quotations = [] } = useQuotationsByAssistance(assistance.id);

  const queryClient = useQueryClient();
  const supplierResponse: any = null;
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const { toast } = useToast();

  const getStatusInfo = (status: string) => {
    const configs = {
      pending: { color: "bg-yellow-500", icon: Clock, text: "Aguardando Resposta" },
      accepted: { color: "bg-green-500", icon: CheckCircle, text: "Aceite - Pronto para Iniciar" },
      scheduled: { color: "bg-blue-500", icon: Calendar, text: "Agendado" },
      in_progress: { color: "bg-blue-600", icon: Clock, text: "Trabalho em Progresso" },
      awaiting_validation: { color: "bg-yellow-600", icon: Clock, text: "Aguardando Validação" },
      awaiting_quotation: { color: "bg-orange-500", icon: FileText, text: "Necessita Orçamento" },
      quotation_received: { color: "bg-purple-500", icon: FileText, text: "Orçamento Recebido" },
      completed: { color: "bg-green-600", icon: CheckCircle, text: "Trabalho Concluído" },
      cancelled: { color: "bg-red-500", icon: AlertCircle, text: "Cancelada" },
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const statusInfo = getStatusInfo(assistance.status);
  const StatusIcon = statusInfo.icon;

  const getPriorityColor = () => {
    if (assistance.requires_quotation) return "border-l-orange-500";
    if (assistance.status === "pending") return "border-l-red-500";
    if (assistance.status === "in_progress") return "border-l-blue-500";
    if (assistance.status === "completed") return "border-l-green-500";
    return "border-l-gray-300";
  };

  const getMainAction = () => {
    if (assistance.status === "pending" || assistance.status === "awaiting_quotation") {
      return "respond";
    }
    if (assistance.requires_quotation && !quotations.length && assistance.status === "accepted") {
      return "quote";
    }
    if (assistance.status === "accepted" && !assistance.requires_quotation) {
      return "start";
    }
    if (assistance.status === "in_progress") {
      return "complete";
    }
    if (assistance.status === "awaiting_validation") {
      return "validation";
    }
    if (assistance.status === "completed") {
      return "completed";
    }
    return null;
  };

  const handleAccept = async (notes?: string) => {
    setIsUpdatingStatus(true);
    try {
      // Create response via RPC and update status to accepted
      const { error: respError } = await supabase.rpc('criar_resposta_fornecedor_por_codigo', {
        p_magic_code: magicCode,
        p_response_type: 'accepted',
        p_notes: notes ?? null
      });
      if (respError) throw respError;

      const { error: statusError } = await supabase.rpc('atualizar_estado_assistencia_por_codigo', {
        p_magic_code: magicCode,
        p_new_status: 'accepted',
        p_supplier_notes: notes ?? null
      });
      if (statusError) throw statusError;

      toast({ title: "Assistência aceite", description: "Pode iniciar ou orçamentar conforme necessário." });
      await queryClient.invalidateQueries({ queryKey: ["supplier-assistances"] });
      await queryClient.invalidateQueries({ queryKey: ["assistances"] });
    } catch (error) {
      console.error("Error accepting assistance:", error);
      toast({ title: "Erro ao aceitar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDecline = async (reason: string) => {
    setIsUpdatingStatus(true);
    try {
      const { error: respError } = await supabase.rpc('criar_resposta_fornecedor_por_codigo', {
        p_magic_code: magicCode,
        p_response_type: 'declined',
        p_notes: reason
      });
      if (respError) throw respError;

      const { error: statusError } = await supabase.rpc('atualizar_estado_assistencia_por_codigo', {
        p_magic_code: magicCode,
        p_new_status: 'cancelled',
        p_supplier_notes: reason
      });
      if (statusError) throw statusError;

      toast({ title: "Assistência recusada", description: "Informámos a administração do motivo." });
      await queryClient.invalidateQueries({ queryKey: ["supplier-assistances"] });
      await queryClient.invalidateQueries({ queryKey: ["assistances"] });
      setShowDeclineDialog(false);
      setDeclineReason("");
    } catch (error) {
      console.error("Error declining assistance:", error);
      toast({ title: "Erro ao recusar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleStartWork = async () => {
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase.rpc('atualizar_estado_assistencia_por_codigo', {
        p_magic_code: magicCode,
        p_new_status: 'in_progress'
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["supplier-assistances"] });
      queryClient.invalidateQueries({ queryKey: ["assistances"] });
    } catch (error) {
      console.error("Error starting work:", error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCompleteWork = async () => {
    setIsUpdatingStatus(true);
    try {
      const nextStatus = assistance.requires_validation ? 'awaiting_validation' : 'completed';
      const { error } = await supabase.rpc('atualizar_estado_assistencia_por_codigo', {
        p_magic_code: magicCode,
        p_new_status: nextStatus
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["supplier-assistances"] });
      queryClient.invalidateQueries({ queryKey: ["assistances"] });
    } catch (error) {
      console.error("Error completing work:", error);
    } finally {
      setIsUpdatingStatus(false);
    }
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
              onClick={() => handleAccept()}
              className="h-12"
              size="lg"
              disabled={isUpdatingStatus}
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              {isUpdatingStatus ? "A aceitar..." : "Aceitar"}
            </Button>
            <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="destructive"
                  className="h-12"
                  size="lg"
                  disabled={isUpdatingStatus}
                >
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Recusar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Recusar Assistência</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Label htmlFor="decline-reason">Motivo da recusa</Label>
                  <Textarea
                    id="decline-reason"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    rows={3}
                    placeholder="Explique o motivo..."
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => handleDecline(declineReason)}
                      disabled={isUpdatingStatus || !declineReason.trim()}
                      className="flex-1"
                    >
                      Confirmar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeclineDialog(false)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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

        {mainAction === "start" && (
          <Button 
            onClick={handleStartWork}
            className="w-full h-12"
            size="lg"
            disabled={isUpdatingStatus}
          >
            {isUpdatingStatus ? "A iniciar..." : "Iniciar Trabalho"}
          </Button>
        )}

        {mainAction === "complete" && (
          <Button 
            onClick={handleCompleteWork}
            className="w-full h-12"
            size="lg"
            disabled={isUpdatingStatus}
          >
            {isUpdatingStatus ? "A completar..." : "Completar Trabalho"}
          </Button>
        )}

        {mainAction === "validation" && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 font-medium">
              ✓ Trabalho marcado como concluído. Aguardando validação da administração.
            </p>
          </div>
        )}

        {mainAction === "completed" && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-medium">
              ✅ Trabalho concluído e validado com sucesso!
            </p>
          </div>
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
              magicCode={magicCode}
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
