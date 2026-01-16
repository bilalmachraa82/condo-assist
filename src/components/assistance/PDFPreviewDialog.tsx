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
import { Loader2, Mail, Building2, Wrench, User, Phone, FileText, Key, UserCheck, Copy, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  const [showSupplierConfirmation, setShowSupplierConfirmation] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

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
    // Hide supplier confirmation if user changes email manually
    if (showSupplierConfirmation && value !== assistance.suppliers?.email) {
      setShowSupplierConfirmation(false);
    }
  };

  const handleUseSupplierEmail = () => {
    if (assistance.suppliers?.email) {
      setRecipientEmail(assistance.suppliers.email);
      setShowSupplierConfirmation(true);
      if (emailError) setEmailError("");
      // Auto-hide confirmation after 3 seconds
      setTimeout(() => setShowSupplierConfirmation(false), 3000);
    }
  };

  const isSupplierEmailSelected = recipientEmail === assistance.suppliers?.email;

  const handleCopyEmail = async () => {
    if (assistance.suppliers?.email) {
      await navigator.clipboard.writeText(assistance.suppliers.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handleCopyPhone = async () => {
    if (assistance.suppliers?.phone) {
      await navigator.clipboard.writeText(assistance.suppliers.phone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
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
            Reveja o conteúdo do PDF antes de enviar. Pode alterar o destinatário abaixo.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-4">
          {/* Recipient Email Input */}
          <div className={`mb-4 p-4 border rounded-lg transition-all duration-300 ${
            isSupplierEmailSelected 
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700" 
              : "bg-muted/30"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="recipient-email" className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email do Destinatário
              </Label>
              {assistance.suppliers?.email && !isSupplierEmailSelected && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-950/50"
                  onClick={handleUseSupplierEmail}
                >
                  <UserCheck className="h-3 w-3" />
                  Usar email do fornecedor
                </Button>
              )}
              {isSupplierEmailSelected && (
                <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-700">
                  <UserCheck className="h-3 w-3 mr-1" />
                  Fornecedor selecionado
                </Badge>
              )}
            </div>
            <Input
              id="recipient-email"
              type="email"
              value={recipientEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="exemplo@email.com"
              className={`transition-all duration-300 ${
                emailError 
                  ? "border-destructive" 
                  : isSupplierEmailSelected 
                    ? "border-emerald-400 dark:border-emerald-600 bg-white dark:bg-background" 
                    : ""
              }`}
            />
            {emailError && (
              <p className="text-xs text-destructive mt-1">{emailError}</p>
            )}
            {showSupplierConfirmation && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-md animate-in fade-in slide-in-from-top-1 duration-300">
                <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  Email do fornecedor "{assistance.suppliers?.name}" aplicado com sucesso!
                </p>
              </div>
            )}
            {!showSupplierConfirmation && (
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  O PDF será enviado para este endereço de email.
                </p>
                {assistance.suppliers?.email && !isSupplierEmailSelected && (
                  <p className="text-xs text-muted-foreground">
                    Fornecedor: {assistance.suppliers.email}
                  </p>
                )}
              </div>
            )}
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
                <div className="space-y-2 text-sm">
                  <p><strong>{assistance.suppliers.name}</strong></p>
                  {assistance.suppliers.email && (
                    <div className="flex items-center gap-2">
                      <p className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {assistance.suppliers.email}
                      </p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={handleCopyEmail}
                          >
                            {copiedEmail ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{copiedEmail ? "Copiado!" : "Copiar email"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                  {assistance.suppliers.phone && (
                    <div className="flex items-center gap-2">
                      <p className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {assistance.suppliers.phone}
                      </p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={handleCopyPhone}
                          >
                            {copiedPhone ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{copiedPhone ? "Copiado!" : "Copiar telefone"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
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