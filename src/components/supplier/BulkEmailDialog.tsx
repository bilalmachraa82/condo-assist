import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Mail, 
  Users, 
  Send, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Clock,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SupplierWithAssistances {
  id: string;
  name: string;
  email: string;
  pendingCount: number;
}

interface BulkEmailDialogProps {
  suppliers: SupplierWithAssistances[];
  isOpen: boolean;
  onClose: () => void;
}

export function BulkEmailDialog({ suppliers, isOpen, onClose }: BulkEmailDialogProps) {
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; failed: number; details: string[] }>({
    success: 0,
    failed: 0,
    details: []
  });
  const [isComplete, setIsComplete] = useState(false);
  const { toast } = useToast();

  const totalSuppliers = suppliers.length;
  const totalAssistances = suppliers.reduce((sum, supplier) => sum + supplier.pendingCount, 0);

  const handleBulkSend = async () => {
    setIsSending(true);
    setProgress(0);
    setResults({ success: 0, failed: 0, details: [] });
    setIsComplete(false);

    let successCount = 0;
    let failedCount = 0;
    const details: string[] = [];

    for (let i = 0; i < suppliers.length; i++) {
      const supplier = suppliers[i];
      
      try {
        // Fetch supplier's pending assistances
        const { data: assistances, error: assistancesError } = await supabase
          .from("assistances")
          .select(`
            id,
            title,
            description,
            priority,
            status,
            created_at,
            buildings!inner(name),
            intervention_types!inner(name)
          `)
          .eq("assigned_supplier_id", supplier.id)
          .in("status", ["pending", "awaiting_quotation", "quotation_received", "in_progress"])
          .order("created_at", { ascending: false });

        if (assistancesError) throw assistancesError;

        if (!assistances || assistances.length === 0) {
          details.push(`⚠️ ${supplier.name}: Sem assistências pendentes`);
          continue;
        }

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
            supplier_id: supplier.id,
            magic_code: magicCode,
            expires_at: expiresAt.toISOString()
          });

        if (insertError) throw insertError;

        // Generate assistances HTML
        const assistancesHtml = assistances.map(assistance => {
          const priorityColor = assistance.priority === 'critical' ? '#ef4444' : 
                               assistance.priority === 'urgent' ? '#f97316' : '#10b981';
          const priorityLabel = assistance.priority === 'critical' ? 'CRÍTICO' : 
                               assistance.priority === 'urgent' ? 'URGENTE' : 'NORMAL';

          return `
            <div style="background-color: #f8fafc; border-left: 4px solid ${priorityColor}; padding: 20px; margin: 15px 0; border-radius: 0 8px 8px 0;">
              <h4 style="color: #1f2937; margin: 0 0 10px 0; font-size: 16px;">📋 ${assistance.title}</h4>
              <div style="margin: 10px 0;">
                <span style="background-color: ${priorityColor}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">
                  🚨 ${priorityLabel}
                </span>
              </div>
              <p style="color: #6b7280; margin: 8px 0 4px 0; font-size: 13px;"><strong>🏢 Edifício:</strong> ${assistance.buildings?.name || ''}</p>
              <p style="color: #6b7280; margin: 4px 0; font-size: 13px;"><strong>🔧 Tipo:</strong> ${assistance.intervention_types?.name || ''}</p>
              <p style="color: #6b7280; margin: 4px 0; font-size: 13px;"><strong>📅 Data:</strong> ${new Date(assistance.created_at).toLocaleDateString('pt-PT')}</p>
              ${assistance.description ? `<p style="color: #4b5563; margin: 10px 0 4px 0; font-size: 13px; font-style: italic;">${assistance.description}</p>` : ''}
            </div>
          `;
        }).join('');

        // Send email
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: supplier.email,
            subject: `Resumo de Assistências Pendentes - ${assistances.length} assistência${assistances.length > 1 ? 's' : ''}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <div style="background: linear-gradient(135deg, #5FB3B3, #7BC4C4); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                  <img src="https://zmpitnpmplemfozvtbam.supabase.co/storage/v1/object/public/assistance-photos/9e67bd21-c565-405a-918d-e9aac10336e8.png" alt="Luvimg" style="height: 40px; width: auto; margin-bottom: 15px;" />
                  <h1 style="color: white; margin: 0; font-size: 24px;">📋 Resumo de Assistências Pendentes</h1>
                </div>
                
                <div style="padding: 30px; background-color: #ffffff;">
                  <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">Olá ${supplier.name},</p>
                  
                  <p style="color: #374151; font-size: 16px; margin-bottom: 25px;">
                    Tem ${assistances.length} assistência${assistances.length > 1 ? 's' : ''} pendente${assistances.length > 1 ? 's' : ''} que requer${assistances.length > 1 ? 'em' : ''} a sua atenção:
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

        successCount++;
        details.push(`✅ ${supplier.name}: ${assistances.length} assistência${assistances.length > 1 ? 's' : ''} enviada${assistances.length > 1 ? 's' : ''}`);

      } catch (error) {
        console.error(`Error sending email to ${supplier.name}:`, error);
        failedCount++;
        details.push(`❌ ${supplier.name}: Erro ao enviar email`);
      }

      // Update progress
      const currentProgress = ((i + 1) / suppliers.length) * 100;
      setProgress(currentProgress);
      setResults({ success: successCount, failed: failedCount, details: [...details] });

      // Add delay between emails to avoid rate limiting
      if (i < suppliers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsComplete(true);
    setIsSending(false);

    toast({
      title: "📧 Envio em massa concluído",
      description: `${successCount} enviados com sucesso, ${failedCount} falharam`,
      variant: successCount > 0 ? "default" : "destructive",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Envio em Massa de Resumos
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!isSending && !isComplete && (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    📊 Resumo do Envio
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-sm">
                        <strong>{totalSuppliers}</strong> fornecedores
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-accent" />
                      <span className="text-sm">
                        <strong>{totalAssistances}</strong> assistências
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">👥 Fornecedores Selecionados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-40 overflow-y-auto">
                  {suppliers.map((supplier, index) => (
                    <div key={supplier.id}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{supplier.name}</p>
                          <p className="text-xs text-muted-foreground">{supplier.email}</p>
                        </div>
                        <Badge variant="outline" className="bg-accent/10 text-accent">
                          {supplier.pendingCount} assistência{supplier.pendingCount > 1 ? 's' : ''}
                        </Badge>
                      </div>
                      {index < suppliers.length - 1 && <Separator className="mt-2" />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          {(isSending || isComplete) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  {isSending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 text-success" />
                      Concluído
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={progress} className="w-full" />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-sm">
                      <strong>{results.success}</strong> enviados
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm">
                      <strong>{results.failed}</strong> falharam
                    </span>
                  </div>
                </div>

                {results.details.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    <p className="text-sm font-medium">Detalhes:</p>
                    {results.details.map((detail, index) => (
                      <p key={index} className="text-xs text-muted-foreground">
                        {detail}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              {isComplete ? "Fechar" : "Cancelar"}
            </Button>
            {!isSending && !isComplete && (
              <Button 
                onClick={handleBulkSend} 
                className="flex-1 bg-gradient-to-r from-primary to-primary-light"
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar para Todos
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}