import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Mail, AlertCircle, Clock, MapPin, Wrench, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Assistance {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  building_name: string;
  intervention_type: string;
}

interface SupplierEmailSummaryProps {
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  pendingAssistances: Assistance[];
  isOpen: boolean;
  onClose: () => void;
}

export function SupplierEmailSummary({
  supplierId,
  supplierName,
  supplierEmail,
  pendingAssistances,
  isOpen,
  onClose
}: SupplierEmailSummaryProps) {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'urgent': return 'bg-warning/10 text-warning border-warning/20';
      default: return 'bg-success/10 text-success border-success/20';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'critical': return 'CRÍTICO';
      case 'urgent': return 'URGENTE';
      default: return 'NORMAL';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'pending': 'Pendente',
      'awaiting_quotation': 'Aguarda Orçamento',
      'quotation_received': 'Orçamento Recebido',
      'in_progress': 'Em Progresso',
      'completed': 'Concluída',
      'cancelled': 'Cancelada'
    };
    return statusMap[status] || status;
  };

  const handleSendEmail = async () => {
    setIsSending(true);
    try {
      // Generate magic code
      const { data: magicCodeData, error: magicCodeError } = await supabase
        .rpc('generate_magic_code');

      if (magicCodeError) throw magicCodeError;

      const magicCode = magicCodeData;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Store magic code
      const { error: insertError } = await supabase
        .from('supplier_magic_codes')
        .insert({
          supplier_id: supplierId,
          magic_code: magicCode,
          expires_at: expiresAt.toISOString()
        });

      if (insertError) throw insertError;

      // Generate assistances HTML
      const assistancesHtml = pendingAssistances.map(assistance => `
        <div style="background-color: #f8fafc; border-left: 4px solid ${assistance.priority === 'critical' ? '#ef4444' : assistance.priority === 'urgent' ? '#f97316' : '#10b981'}; padding: 20px; margin: 15px 0; border-radius: 0 8px 8px 0;">
          <h4 style="color: #1f2937; margin: 0 0 10px 0; font-size: 16px;">📋 ${assistance.title}</h4>
          <div style="margin: 10px 0;">
            <span style="background-color: ${assistance.priority === 'critical' ? '#ef4444' : assistance.priority === 'urgent' ? '#f97316' : '#10b981'}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">
              🚨 ${getPriorityLabel(assistance.priority)}
            </span>
          </div>
          <p style="color: #6b7280; margin: 8px 0 4px 0; font-size: 13px;"><strong>🏢 Edifício:</strong> ${assistance.building_name}</p>
          <p style="color: #6b7280; margin: 4px 0; font-size: 13px;"><strong>🔧 Tipo:</strong> ${assistance.intervention_type}</p>
          <p style="color: #6b7280; margin: 4px 0; font-size: 13px;"><strong>📅 Data:</strong> ${new Date(assistance.created_at).toLocaleDateString('pt-PT')}</p>
          <p style="color: #6b7280; margin: 4px 0; font-size: 13px;"><strong>📊 Status:</strong> ${getStatusLabel(assistance.status)}</p>
          ${assistance.description ? `<p style="color: #4b5563; margin: 10px 0 4px 0; font-size: 13px; font-style: italic;">${assistance.description}</p>` : ''}
        </div>
      `).join('');

      // Send email
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: supplierEmail,
          subject: `Resumo de Assistências Pendentes - ${pendingAssistances.length} assistência${pendingAssistances.length > 1 ? 's' : ''}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <div style="background: linear-gradient(135deg, #5FB3B3, #7BC4C4); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                  <img src="cid:luvimg-logo" alt="Luvimg" style="height: 40px; width: auto; margin-bottom: 15px;" />
                  <h1 style="color: white; margin: 0; font-size: 24px;">📋 Resumo de Assistências Pendentes</h1>
              </div>
              
              <div style="padding: 30px; background-color: #ffffff;">
                <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">Olá ${supplierName},</p>
                
                <p style="color: #374151; font-size: 16px; margin-bottom: 25px;">
                  Tem ${pendingAssistances.length} assistência${pendingAssistances.length > 1 ? 's' : ''} pendente${pendingAssistances.length > 1 ? 's' : ''} que requer${pendingAssistances.length > 1 ? 'em' : ''} a sua atenção:
                </p>
                
                ${assistancesHtml}
                
                <div style="background: linear-gradient(135deg, #f1f5f9, #e2e8f0); padding: 25px; text-align: center; margin: 25px 0; border-radius: 12px; border: 2px dashed #cbd5e1;">
                  <p style="color: #64748b; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">CÓDIGO DE ACESSO</p>
                  <h2 style="color: #2563eb; font-size: 32px; margin: 10px 0; letter-spacing: 0.3em; font-weight: bold;">${magicCode}</h2>
                  <p style="color: #64748b; margin: 10px 0 0 0; font-size: 12px;">Válido por 30 dias</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${window.location.origin}/supplier-portal?code=${magicCode}" 
                     style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                    🚀 Aceder ao Portal do Fornecedor
                  </a>
                </div>
                
                <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 25px 0;">
                  <p style="color: #92400e; margin: 0; font-size: 14px;">
                    ⏰ <strong>Ação Necessária:</strong> Por favor, aceda ao portal para gerir estas assistências o mais breve possível.
                  </p>
                </div>
                
                <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
                  <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">
                    <strong>Luvimg - Administração de Condomínios</strong><br>
                    Praceta Pedro Manuel Pereira nº 1 – 1º esq, 2620-158 Póvoa Santo Adrião<br>
                    Tel: +351 219 379 248 | Email: arquivo@luvimg.com<br>
                    Este código expira automaticamente em 30 dias por motivos de segurança.
                  </p>
                </div>
              </div>
            </div>
          `,
          from: 'Luvimg - Administração de Condomínios <arquivo@luvimg.com>'
        }
      });

      if (emailError) throw emailError;

      toast({
        title: "✅ Email enviado com sucesso!",
        description: `Resumo de ${pendingAssistances.length} assistência${pendingAssistances.length > 1 ? 's' : ''} enviado para ${supplierEmail}`,
      });

      onClose();
    } catch (error) {
      console.error('Error sending email summary:', error);
      toast({
        title: "❌ Erro ao enviar email",
        description: "Não foi possível enviar o resumo por email. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (pendingAssistances.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Resumo por Email
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Este fornecedor não tem assistências pendentes.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Enviar Resumo por Email
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">📧 Destinatário</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{supplierName}</p>
              <p className="text-sm text-muted-foreground">{supplierEmail}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                📋 Assistências Pendentes
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  {pendingAssistances.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingAssistances.map((assistance, index) => (
                <div key={assistance.id}>
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium">{assistance.title}</h4>
                      <Badge className={getPriorityColor(assistance.priority)}>
                        {getPriorityLabel(assistance.priority)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {assistance.building_name}
                      </div>
                      <div className="flex items-center gap-1">
                        <Wrench className="h-3 w-3" />
                        {assistance.intervention_type}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(assistance.created_at).toLocaleDateString('pt-PT')}
                      </div>
                      <div className="text-xs">
                        {getStatusLabel(assistance.status)}
                      </div>
                    </div>
                    {assistance.description && (
                      <p className="text-sm text-muted-foreground italic">
                        {assistance.description}
                      </p>
                    )}
                  </div>
                  {index < pendingAssistances.length - 1 && <Separator className="mt-3" />}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleSendEmail} 
              disabled={isSending}
              className="flex-1 bg-gradient-to-r from-primary to-primary-light"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}