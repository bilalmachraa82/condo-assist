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
import { Building, CheckCircle, Clock, AlertCircle, FileText, Euro } from "lucide-react";
import SubmitQuotationForm from "@/components/quotations/SubmitQuotationForm";
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
  description: string;
  status: string;
  supplier_notes?: string;
  created_at: string;
  building_name?: string;
  building_address?: string;
  intervention_type_name?: string;
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

  // Get supplier's assistances
  const { data: assistances = [], isLoading: loadingAssistances } = useQuery({
    queryKey: ["supplier-assistances", supplier?.id],
    queryFn: async () => {
      if (!supplier?.id) return [];
      
      try {
        const { data: assistanceData, error } = await (supabase as any)
          .from("assistances")
          .select("id, description, status, supplier_notes, created_at, building_id, intervention_type_id")
          .eq("supplier_id", supplier.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!assistanceData) return [];
        
        // Get related data separately to avoid complex TypeScript issues
        const results = [];
        for (const assistance of assistanceData) {
          const [buildingRes, typeRes] = await Promise.all([
            supabase.from("buildings").select("name, address").eq("id", assistance.building_id).single(),
            supabase.from("intervention_types").select("name").eq("id", assistance.intervention_type_id).single()
          ]);
          
          results.push({
            id: assistance.id,
            description: assistance.description,
            status: assistance.status,
            supplier_notes: assistance.supplier_notes,
            created_at: assistance.created_at,
            building_name: buildingRes.data?.name || "N/A",
            building_address: buildingRes.data?.address || "N/A",
            intervention_type_name: typeRes.data?.name || "N/A"
          });
        }
        
        return results;
      } catch (error) {
        console.error("Error fetching assistances:", error);
        return [];
      }
    },
    enabled: !!supplier?.id,
  });

  // Update assistance status
  // Import the new status update hook
  const updateAssistanceMutation = useUpdateAssistanceStatus();

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
      in_progress: { variant: "default" as const, icon: AlertCircle, text: "Em Progresso" },
      completed: { variant: "default" as const, icon: CheckCircle, text: "Concluída" },
      cancelled: { variant: "destructive" as const, icon: AlertCircle, text: "Cancelada" },
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
            <Building className="h-12 w-12 mx-auto mb-4 text-primary" />
            <CardTitle>Portal do Fornecedor</CardTitle>
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
              <Building className="h-6 w-6 text-primary" />
              <div>
                <h1 className="font-semibold">Portal do Fornecedor</h1>
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
            
            {assistances?.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">
                    Não há assistências atribuídas no momento.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {assistances?.map((assistance) => (
                  <Card key={assistance.id}>
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
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Tabs defaultValue="details" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="details">Detalhes</TabsTrigger>
                          <TabsTrigger value="quotation">Orçamento</TabsTrigger>
                          <TabsTrigger value="actions">Ações</TabsTrigger>
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
                        </TabsContent>

                        <TabsContent value="quotation" className="mt-4">
                          {supplier && (
                            <SubmitQuotationForm
                              assistanceId={assistance.id}
                              supplierId={supplier.id}
                              onQuotationSubmitted={() => {
                                toast({
                                  title: "Orçamento submetido",
                                  description: "O seu orçamento foi enviado com sucesso!",
                                });
                              }}
                            />
                          )}
                        </TabsContent>

                        <TabsContent value="actions" className="mt-4">
                          <div className="flex gap-2">
                            {assistance.status === "pending" && (
                              <Button
                                size="sm"
                                onClick={() => updateAssistanceMutation.mutate({
                                  assistanceId: assistance.id,
                                  newStatus: "in_progress"
                                })}
                                disabled={updateAssistanceMutation.isPending}
                              >
                                Aceitar Assistência
                              </Button>
                            )}
                            
                            {assistance.status === "in_progress" && (
                              <Button
                                size="sm"
                                onClick={() => updateAssistanceMutation.mutate({
                                  assistanceId: assistance.id,
                                  newStatus: "completed"
                                })}
                                disabled={updateAssistanceMutation.isPending}
                              >
                                Marcar como Concluída
                              </Button>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}