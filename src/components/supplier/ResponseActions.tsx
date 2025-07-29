import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Euro, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ResponseActionsProps {
  assistance: any;
  supplierResponse: any;
  quotations: any[];
  onAccept: (notes?: string) => void;
  onDecline: (reason: string) => void;
  onQuote: () => void;
  isLoading?: boolean;
}

export default function ResponseActions({
  assistance,
  supplierResponse,
  quotations,
  onAccept,
  onDecline,
  onQuote,
  isLoading = false
}: ResponseActionsProps) {
  const [declineReason, setDeclineReason] = useState("");
  const [acceptNotes, setAcceptNotes] = useState("");
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const { toast } = useToast();

  const canRespond = !supplierResponse && 
    (assistance.status === "pending" || assistance.status === "awaiting_quotation");
  
  const canQuote = (assistance.requires_quotation || assistance.status === "awaiting_quotation") && 
    (!quotations || quotations.length === 0) &&
    (!supplierResponse || supplierResponse.response_type === "accepted");

  const handleAccept = () => {
    onAccept(acceptNotes);
    setShowAcceptDialog(false);
    setAcceptNotes("");
  };

  const handleDecline = () => {
    if (!declineReason.trim()) {
      toast({
        title: "Motivo necessário",
        description: "Por favor, indique o motivo da recusa.",
        variant: "destructive",
      });
      return;
    }
    onDecline(declineReason);
    setShowDeclineDialog(false);
    setDeclineReason("");
  };

  // If supplier already responded, show status
  if (supplierResponse) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {supplierResponse.response_type === "accepted" ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            Resposta Enviada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={supplierResponse.response_type === "accepted" ? "default" : "destructive"}>
              {supplierResponse.response_type === "accepted" ? "Aceite" : "Recusado"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {new Date(supplierResponse.response_date).toLocaleDateString("pt-PT")}
            </span>
          </div>
          
          {supplierResponse.decline_reason && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Motivo da Recusa:</Label>
              <p className="text-sm">{supplierResponse.decline_reason}</p>
            </div>
          )}
          
          {supplierResponse.notes && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Observações:</Label>
              <p className="text-sm">{supplierResponse.notes}</p>
            </div>
          )}

          {/* Show quote button if quotation is required and not submitted yet */}
          {canQuote && (
            <Button onClick={onQuote} className="w-full" size="lg">
              <Euro className="h-4 w-4 mr-2" />
              Submeter Orçamento
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // If no response yet, show action buttons
  if (!canRespond) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Responder à Assistência
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {assistance.status === "awaiting_quotation" 
            ? "Esta assistência necessita de um orçamento. Pode aceitar e orçamentar ou recusar."
            : "Por favor, aceite ou recuse esta assistência."
          }
        </p>

        <div className="grid grid-cols-1 gap-3">
          {/* Accept Button */}
          <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
            <DialogTrigger asChild>
              <Button 
                className="w-full" 
                size="lg"
                disabled={isLoading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Aceitar Assistência
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Aceitar Assistência</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Confirma que aceita esta assistência?
                </p>
                <div className="space-y-2">
                  <Label htmlFor="acceptNotes">Observações (opcional)</Label>
                  <Textarea
                    id="acceptNotes"
                    value={acceptNotes}
                    onChange={(e) => setAcceptNotes(e.target.value)}
                    placeholder="Observações sobre a aceitação..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAccept}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Confirmar Aceitação
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAcceptDialog(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Quote Directly Button (for awaiting_quotation status) */}
          {assistance.status === "awaiting_quotation" && (
            <Button 
              onClick={onQuote}
              variant="outline" 
              className="w-full" 
              size="lg"
              disabled={isLoading}
            >
              <Euro className="h-4 w-4 mr-2" />
              Orçamentar Diretamente
            </Button>
          )}

          {/* Decline Button */}
          <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="destructive" 
                className="w-full" 
                size="lg"
                disabled={isLoading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Recusar Assistência
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Recusar Assistência</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Por favor, indique o motivo da recusa:
                </p>
                <div className="space-y-2">
                  <Label htmlFor="declineReason">Motivo da Recusa *</Label>
                  <Textarea
                    id="declineReason"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="Ex: Não tenho disponibilidade, falta de especialização..."
                    rows={3}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleDecline}
                    disabled={isLoading || !declineReason.trim()}
                    className="flex-1"
                  >
                    Confirmar Recusa
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
      </CardContent>
    </Card>
  );
}