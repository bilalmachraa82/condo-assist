import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Eye, Clock, Mail, Search, ArrowUpDown, Euro, Calendar, Building2, Users, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import QuotationRequestsList from "./QuotationRequestsList";
import { QuotationFiltersComponent, QuotationFilters } from "./QuotationFilters";
import { PDFExportButton } from "./PDFExportButton";

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
  const [filters, setFilters] = useState<QuotationFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const queryClient = useQueryClient();

  const { data: allQuotations = [], isLoading } = useQuery({
    queryKey: ["quotations"],
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

  const quotations = useMemo(() => {
    if (!allQuotations.length) return [];
    
    let filtered = allQuotations.filter(quotation => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          quotation.assistances.title.toLowerCase().includes(searchLower) ||
          quotation.suppliers.name.toLowerCase().includes(searchLower) ||
          quotation.description?.toLowerCase().includes(searchLower) ||
          quotation.amount.toString().includes(searchLower);
        
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (filters.status && quotation.status !== filters.status) {
        return false;
      }
      
      // Supplier filter
      if (filters.supplierId && quotation.supplier_id !== filters.supplierId) {
        return false;
      }
      
      // Assistance filter
      if (filters.assistanceId && quotation.assistance_id !== filters.assistanceId) {
        return false;
      }
      
      // Amount filters
      if (filters.minAmount && quotation.amount < Number(filters.minAmount)) {
        return false;
      }
      if (filters.maxAmount && quotation.amount > Number(filters.maxAmount)) {
        return false;
      }
      
      // Date filters
      if (filters.dateFrom) {
        const quotationDate = new Date(quotation.created_at).toISOString().split('T')[0];
        if (quotationDate < filters.dateFrom) {
          return false;
        }
      }
      if (filters.dateTo) {
        const quotationDate = new Date(quotation.created_at).toISOString().split('T')[0];
        if (quotationDate > filters.dateTo) {
          return false;
        }
      }
      
      return true;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "amount":
          aValue = a.amount;
          bValue = b.amount;
          break;
        case "supplier":
          aValue = a.suppliers.name;
          bValue = b.suppliers.name;
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "created_at":
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
      }
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortOrder === "asc" 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    return filtered;
  }, [allQuotations, filters, searchTerm, sortBy, sortOrder]);

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
      // Updating quotation status
      
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
      
      try {
        await supabase.from("activity_log").insert({
          action: `quotation_${status}`,
          details: `Quotation ${status} for amount €${selectedQuotation?.amount}`,
          assistance_id: selectedQuotation?.assistance_id,
          supplier_id: selectedQuotation?.supplier_id,
          metadata: { quotation_id: quotationId, amount: selectedQuotation?.amount }
        });
      } catch (e) {
        console.warn("Ignorando erro ao registar activity_log (provável RLS)", e);
      }
    },
    onSuccess: (_, variables) => {
      // Quotation status updated successfully
      toast.success(`Quotation ${variables.status} successfully`);
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
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
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
              Gestão de Orçamentos
            </h2>
            <p className="text-muted-foreground">Analisar e gerir orçamentos de fornecedores</p>
          </div>
          <div className="flex gap-2">
            <QuotationFiltersComponent 
              filters={filters} 
              onFiltersChange={setFilters} 
            />
            <PDFExportButton 
              quotations={quotations}
              filters={filters}
              title="Lista de Orçamentos"
            />
          </div>
        </div>

        {/* Search and Sort Controls */}
        <div className="flex flex-col sm:flex-row gap-4 bg-muted/30 p-4 rounded-lg border">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por fornecedor, assistência, descrição ou valor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Data de Criação</SelectItem>
                <SelectItem value="amount">Valor</SelectItem>
                <SelectItem value="supplier">Fornecedor</SelectItem>
                <SelectItem value="status">Estado</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {quotations.length === allQuotations.length 
              ? `${quotations.length} orçamentos` 
              : `${quotations.length} de ${allQuotations.length} orçamentos`}
          </span>
          {(searchTerm || Object.keys(filters).length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setFilters({});
              }}
            >
              Limpar filtros
            </Button>
          )}
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
            <Card key={quotation.id} className="hover:shadow-lg transition-all duration-200 hover:scale-[1.01] border-l-4 border-l-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-foreground">
                          {quotation.assistances.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{quotation.suppliers.name}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xl font-bold text-primary">
                          <Euro className="h-5 w-5" />
                          {quotation.amount.toLocaleString('pt-PT', { 
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2 
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Válido {quotation.validity_days} dias
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  {getStatusBadge(quotation.status)}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(quotation.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {quotation.description && (
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {quotation.description}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 hover:bg-primary/10"
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-4 rounded-lg border">
                                  <Label className="font-medium text-primary flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Fornecedor
                                  </Label>
                                  <p className="font-semibold text-lg">{selectedQuotation.suppliers.name}</p>
                                  {selectedQuotation.suppliers.email && (
                                    <p className="text-sm text-muted-foreground">{selectedQuotation.suppliers.email}</p>
                                  )}
                                  {selectedQuotation.suppliers.phone && (
                                    <p className="text-sm text-muted-foreground">{selectedQuotation.suppliers.phone}</p>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-4">
                                <div className="bg-gradient-to-br from-success/5 to-success/10 p-4 rounded-lg border">
                                  <Label className="font-medium text-success flex items-center gap-2">
                                    <Euro className="h-4 w-4" />
                                    Valor Total
                                  </Label>
                                  <div className="flex items-center gap-1 text-3xl font-bold text-success">
                                    <Euro className="h-6 w-6" />
                                    {selectedQuotation.amount.toLocaleString('pt-PT', { 
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2 
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-gradient-to-br from-info/5 to-info/10 p-4 rounded-lg border">
                              <Label className="font-medium text-info flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                Assistência
                              </Label>
                              <p className="font-semibold text-lg">{selectedQuotation.assistances.title}</p>
                              <p className="text-sm text-muted-foreground mt-1">{selectedQuotation.assistances.description}</p>
                            </div>

                            {selectedQuotation.description && (
                              <div className="bg-muted/30 p-4 rounded-lg">
                                <Label className="font-medium flex items-center gap-2 mb-2">
                                  <FileText className="h-4 w-4" />
                                  Detalhes do Orçamento
                                </Label>
                                <p className="text-sm whitespace-pre-wrap">{selectedQuotation.description}</p>
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