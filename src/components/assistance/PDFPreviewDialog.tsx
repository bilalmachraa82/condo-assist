import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Building2, Wrench, User, Phone, AtSign, FileText, Key } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { Assistance } from "@/hooks/useAssistances";

interface PDFPreviewDialogProps {
  assistance: Assistance;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (customEmail?: string) => Promise<void>;
  isLoading?: boolean;
  defaultEmail?: string;
}

const getPriorityLabel = (priority: string): string => {
  const labels: Record<string, string> = {
    normal: "Normal",
    urgent: "Urgente",
    critical: "Crítica",
  };
  return labels[priority] || priority;
};

const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case "critical": return "bg-destructive text-destructive-foreground";
    case "urgent": return "bg-warning text-warning-foreground";
    default: return "bg-primary text-primary-foreground";
  }
};

export function PDFPreviewDialog({ 
  assistance, 
  open, 
  onOpenChange, 
  onConfirm,
  isLoading = false,
  defaultEmail = "arquivo@luvimg.com"
}: PDFPreviewDialogProps) {
  const [recipientEmail, setRecipientEmail] = useState(defaultEmail);
  const [emailError, setEmailError] = useState("");

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleConfirm = async () => {
    if (!recipientEmail.trim()) {
      setEmailError("Email é obrigatório");
      return;
    }
    if (!validateEmail(recipientEmail)) {
      setEmailError("Email inválido");
      return;
    }
    setEmailError("");
    await onConfirm(recipientEmail);
    onOpenChange(false);
  };

  const handleEmailChange = (value: string) => {
    setRecipientEmail(value);
    if (emailError) setEmailError("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pré-visualização do PDF
          </DialogTitle>
          <DialogDescription>
            Reveja o conteúdo antes de enviar para arquivo@luvimg.com
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-4">
          {/* Recipient Email Input */}
          <div className="mb-4 p-4 border rounded-lg bg-muted/30">
            <Label htmlFor="recipient-email" className="text-sm font-medium flex items-center gap-2 mb-2">
              <Mail className="h-4 w-4" />
              Email do Destinatário
            </Label>
            <Input
              id="recipient-email"
              type="email"
              value={recipientEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="exemplo@email.com"
              className={emailError ? "border-destructive" : ""}
            />
            {emailError && (
              <p className="text-xs text-destructive mt-1">{emailError}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              O PDF será enviado para este endereço de email.
            </p>
          </div>

          {/* PDF Preview Content */}
          <div className="space-y-4 border rounded-lg p-6 bg-background shadow-inner">
            {/* Header */}
            <div className="border-b-4 border-primary pb-4">
              <h2 className="text-xl font-bold text-primary">LUVIMG - Gestão de Condomínios</h2>
              <p className="text-sm text-muted-foreground">Pedido de Assistência</p>
              <p className="text-xs text-muted-foreground mt-1">
                Gerado em: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: pt })}
              </p>
            </div>

            {/* Assistance Number & Priority */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Assistência Nº</p>
              <h3 className="text-3xl font-bold text-primary">
                {assistance.assistance_number || "N/A"}
              </h3>
              <Badge className={`mt-2 ${getPriorityColor(assistance.priority)}`}>
                {getPriorityLabel(assistance.priority).toUpperCase()}
              </Badge>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h4 className="text-lg font-semibold">{assistance.title}</h4>
              {assistance.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {assistance.description}
                </p>
              )}
            </div>

            <Separator />

            {/* Building Info */}
            <div className="bg-muted/30 p-4 rounded-lg border space-y-2">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <Building2 className="h-4 w-4" />
                EDIFÍCIO
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Código:</span>{" "}
                  <strong>{assistance.buildings?.code || "N/A"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Nome:</span>{" "}
                  <strong>{assistance.buildings?.name || "N/A"}</strong>
                </div>
                {assistance.buildings?.nif && (
                  <div>
                    <span className="text-muted-foreground">NIF:</span>{" "}
                    {assistance.buildings.nif}
                  </div>
                )}
                {assistance.buildings?.address && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Morada:</span>{" "}
                    {assistance.buildings.address}
                  </div>
                )}
              </div>
            </div>

            {/* Intervention Type */}
            <div className="bg-muted/30 p-4 rounded-lg border space-y-2">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <Wrench className="h-4 w-4" />
                TIPO DE INTERVENÇÃO
              </div>
              <p className="text-sm">
                <strong>{assistance.intervention_types?.name || "N/A"}</strong>
                {assistance.intervention_types?.category && (
                  <span className="text-muted-foreground"> ({assistance.intervention_types.category})</span>
                )}
              </p>
            </div>

            {/* Supplier */}
            {assistance.suppliers && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
                  <User className="h-4 w-4" />
                  FORNECEDOR ATRIBUÍDO
                </div>
                <div className="space-y-1 text-sm">
                  <p><strong>{assistance.suppliers.name}</strong></p>
                  {assistance.suppliers.email && (
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <AtSign className="h-3 w-3" />
                      {assistance.suppliers.email}
                    </p>
                  )}
                  {assistance.suppliers.phone && (
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {assistance.suppliers.phone}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Magic Code Info */}
            <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border-2 border-dashed border-amber-400 space-y-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold">
                <Key className="h-4 w-4" />
                CÓDIGO DE ACESSO
              </div>
              <p className="text-sm text-muted-foreground">
                Um código de acesso ao portal será gerado automaticamente e incluído no PDF.
              </p>
            </div>

            {/* Footer Preview */}
            <div className="border-t pt-4 text-center text-xs text-muted-foreground">
              <p>LUVIMG - Gestão de Condomínios | arquivo@luvimg.com</p>
              <p>Documento gerado automaticamente pelo sistema de gestão de assistências</p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                A enviar...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Confirmar e Enviar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}