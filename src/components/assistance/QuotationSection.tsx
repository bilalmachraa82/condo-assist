import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Plus, CheckCircle, XCircle, Clock, Euro } from "lucide-react";
import { useQuotationsByAssistance, useUpdateQuotationStatus, useRequestQuotation } from "@/hooks/useQuotations";
import type { Assistance } from "@/hooks/useAssistances";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import EnhancedQuotationForm from "@/components/supplier/EnhancedQuotationForm";

interface QuotationSectionProps {
  assistance: Assistance;
}

const getStatusBadge = (status: string) => {
  const statusConfig = {
    pending: { label: "Pendente", variant: "secondary" as const, icon: Clock },
    submitted: { label: "Submetido", variant: "outline" as const, icon: FileText },
    approved: { label: "Aprovado", variant: "default" as const, icon: CheckCircle },
    rejected: { label: "Rejeitado", variant: "destructive" as const, icon: XCircle },
    expired: { label: "Expirado", variant: "secondary" as const, icon: Clock },
  };

  const config = statusConfig[status as keyof typeof statusConfig];
  const Icon = config?.icon || FileText;

  return (
    <Badge variant={config?.variant || "secondary"} className="gap-1">
      <Icon className="h-3 w-3" />
      {config?.label || status}
    </Badge>
  );
};

export default function QuotationSection({ assistance }: QuotationSectionProps) {
  const [notes, setNotes] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>("");
  const [isAddQuotationOpen, setIsAddQuotationOpen] = useState(false);

  const { data: quotations, isLoading } = useQuotationsByAssistance(assistance.id);
  const updateStatus = useUpdateQuotationStatus();
  const requestQuotation = useRequestQuotation();

  const handleRequestQuotation = async () => {
    await requestQuotation.mutateAsync({
      assistanceId: assistance.id,
      deadline: deadline || undefined,
    });
    setIsRequestOpen(false);
    setDeadline("");
  };

  const handleApproveReject = async (quotationId: string, status: "approved" | "rejected") => {
    await updateStatus.mutateAsync({
      id: quotationId,
      status,
      notes: notes || undefined,
    });
    setIsApprovalOpen(false);
    setNotes("");
    setSelectedQuotationId("");
  };

  const canRequestQuotation = assistance.assigned_supplier_id && !assistance.requires_quotation;
  const hasQuotations = quotations && quotations.length > 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Orçamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Orçamentos
          {hasQuotations && (
            <Badge variant="outline" className="ml-auto">
              {quotations.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Request Quotation Button */}
        {canRequestQuotation && (
          <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Solicitar Orçamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Solicitar Orçamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="deadline">Prazo para Resposta (opcional)</Label>
                  <Input
                    id="deadline"
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsRequestOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleRequestQuotation} disabled={requestQuotation.isPending}>
                    {requestQuotation.isPending ? "Solicitando..." : "Solicitar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Add Manual/PDF Quotation */}
        {assistance.assigned_supplier_id && (
          <Dialog open={isAddQuotationOpen} onOpenChange={setIsAddQuotationOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Orçamento (Manual/PDF)
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Adicionar Orçamento</DialogTitle>
              </DialogHeader>
              <EnhancedQuotationForm
                assistanceId={assistance.id}
                supplierId={assistance.assigned_supplier_id!}
                onQuotationSubmitted={() => setIsAddQuotationOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Quotation Status */}
        {assistance.requires_quotation && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status da Solicitação:</span>
              {getStatusBadge(assistance.status)}
            </div>
            {assistance.quotation_deadline && (
              <p className="text-xs text-muted-foreground mt-1">
                Prazo: {new Date(assistance.quotation_deadline).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Quotations List */}
        {hasQuotations ? (
          <div className="space-y-3">
            <Separator />
            <h4 className="font-medium text-sm">Orçamentos Recebidos</h4>
            {quotations.map((quotation) => (
              <div key={quotation.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {quotation.suppliers?.name}
                    </span>
                    {getStatusBadge(quotation.status)}
                  </div>
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <Euro className="h-4 w-4" />
                    {Number(quotation.amount).toLocaleString('pt-PT', {
                      style: 'currency',
                      currency: 'EUR'
                    })}
                  </div>
                </div>

                {quotation.description && (
                  <p className="text-sm text-muted-foreground">
                    {quotation.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Submetido: {new Date(quotation.submitted_at || quotation.created_at).toLocaleDateString()}
                  </span>
                  {quotation.validity_days && (
                    <span>Válido por {quotation.validity_days} dias</span>
                  )}
                </div>

                {quotation.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <Dialog open={isApprovalOpen && selectedQuotationId === quotation.id} onOpenChange={(open) => {
                      setIsApprovalOpen(open);
                      if (!open) setSelectedQuotationId("");
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => setSelectedQuotationId(quotation.id)}
                        >
                          Aprovar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Aprovar Orçamento</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="approval-notes">Notas (opcional)</Label>
                            <Textarea
                              id="approval-notes"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Adicione notas sobre a aprovação..."
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsApprovalOpen(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={() => handleApproveReject(quotation.id, "approved")}>
                              Aprovar
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedQuotationId(quotation.id);
                        setIsApprovalOpen(true);
                      }}
                    >
                      Rejeitar
                    </Button>
                  </div>
                )}

                {quotation.notes && (
                  <div className="mt-2 p-2 bg-muted rounded text-xs">
                    <strong>Notas:</strong> {quotation.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          assistance.requires_quotation && (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aguardando orçamentos do fornecedor</p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}