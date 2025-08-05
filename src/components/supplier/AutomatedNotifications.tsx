import { useState, useEffect } from "react";
import { Bell, Clock, AlertTriangle, CheckCircle, Send, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAllAppSettings, useUpdateAppSetting } from "@/hooks/useAppSettings";

interface EscalationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  escalationHours: number;
  icon: React.ReactNode;
  color: string;
}

export function AutomatedNotifications() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const { data: allSettings } = useAllAppSettings();
  const updateSettingMutation = useUpdateAppSetting();
  
  const [escalationRules, setEscalationRules] = useState<EscalationRule[]>([
    {
      id: "critical",
      name: "Escalação Automática - CRÍTICAS",
      description: "Escalação automática após tempo limite sem resposta",
      enabled: true,
      escalationHours: 24,
      icon: <AlertTriangle className="h-4 w-4" />,
      color: "bg-red-100 text-red-800"
    },
    {
      id: "urgent", 
      name: "Escalação Automática - URGENTES",
      description: "Escalação automática após tempo limite sem resposta",
      enabled: true,
      escalationHours: 72,
      icon: <Clock className="h-4 w-4" />,
      color: "bg-orange-100 text-orange-800"
    },
    {
      id: "normal",
      name: "Escalação Automática - NORMAIS", 
      description: "Escalação automática após tempo limite sem resposta",
      enabled: true,
      escalationHours: 120,
      icon: <Send className="h-4 w-4" />,
      color: "bg-blue-100 text-blue-800"
    }
  ]);

  // Load settings from database
  useEffect(() => {
    if (allSettings?.grouped?.notifications) {
      setEscalationRules(prev => prev.map(rule => ({
        ...rule,
        enabled: allSettings.grouped.notifications[`escalation_enabled_${rule.id}`] === true,
        escalationHours: parseInt(allSettings.grouped.notifications[`escalation_hours_${rule.id}`] || rule.escalationHours.toString())
      })));
    }
  }, [allSettings]);

  const toggleRule = async (ruleId: string) => {
    const rule = escalationRules.find(r => r.id === ruleId);
    if (!rule) return;

    const newEnabled = !rule.enabled;
    
    setEscalationRules(prev => 
      prev.map(r => 
        r.id === ruleId 
          ? { ...r, enabled: newEnabled }
          : r
      )
    );

    // Save to database immediately
    try {
      await updateSettingMutation.mutateAsync({
        key: `escalation_enabled_${ruleId}`,
        value: newEnabled
      });
      
      toast({
        title: "Configuração salva",
        description: `Escalação ${newEnabled ? 'ativada' : 'desativada'} para prioridade ${ruleId}`,
      });
    } catch (error) {
      // Revert on error
      setEscalationRules(prev => 
        prev.map(r => 
          r.id === ruleId 
            ? { ...r, enabled: !newEnabled }
            : r
        )
      );
      toast({
        title: "Erro",
        description: "Erro ao salvar configuração",
        variant: "destructive",
      });
    }
  };

  const updateEscalationHours = async (ruleId: string, newHours: number) => {
    if (newHours < 1 || newHours > 168) return; // 1 hour to 1 week

    setEscalationRules(prev => 
      prev.map(rule => 
        rule.id === ruleId 
          ? { ...rule, escalationHours: newHours }
          : rule
      )
    );

    // Save to database with debounce
    try {
      await updateSettingMutation.mutateAsync({
        key: `escalation_hours_${ruleId}`,
        value: newHours.toString()
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar tempo de escalação",
        variant: "destructive",
      });
    }
  };

  const testNotification = async (ruleId: string) => {
    setLoading(true);
    try {
      // Get a real assistance for testing
      const { data: assistances } = await supabase
        .from('assistances')
        .select('id, assigned_supplier_id')
        .not('assigned_supplier_id', 'is', null)
        .limit(1);

      if (!assistances || assistances.length === 0) {
        toast({
          title: "Teste não disponível",
          description: "Não há assistências com fornecedores para testar. Crie uma assistência primeiro.",
          variant: "destructive",
        });
        return;
      }

      const testAssistance = assistances[0];
      const rule = escalationRules.find(r => r.id === ruleId);
      
      const { data, error } = await supabase.functions.invoke('automated-notifications', {
        body: {
          type: "escalation",
          assistance_id: testAssistance.id,
          supplier_id: testAssistance.assigned_supplier_id,
          delay_hours: rule?.escalationHours || 24
        }
      });

      if (error) throw error;

      toast({
        title: "Teste enviado",
        description: "Notificação de escalação teste enviada com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro no teste",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações Automáticas
          </CardTitle>
          <CardDescription>
            Configure regras automáticas para envio de emails baseadas em eventos do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {escalationRules.map((rule, index) => (
            <div key={rule.id}>
              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className={`p-2 rounded-md ${rule.color}`}>
                  {rule.icon}
                </div>
                
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{rule.name}</h4>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => toggleRule(rule.id)}
                        disabled={saving}
                      />
                      <Label className="text-sm">
                        {rule.enabled ? "Ativo" : "Inativo"}
                      </Label>
                    </div>
                  </div>
                  
                  {rule.enabled && (
                    <div className="flex items-center gap-4">
                      <Label className="text-sm">Escalação após:</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={rule.escalationHours}
                          onChange={(e) => updateEscalationHours(rule.id, parseInt(e.target.value) || 1)}
                          className="w-20"
                          min="1"
                          max="168"
                          disabled={saving}
                        />
                        <span className="text-sm text-muted-foreground">horas</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={rule.enabled ? "default" : "secondary"}>
                      {rule.enabled ? "Ativo" : "Inativo"}
                    </Badge>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testNotification(rule.id)}
                      disabled={loading || !rule.enabled}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Testar Escalação
                    </Button>
                  </div>
                </div>
              </div>
              
              {index < escalationRules.length - 1 && <Separator className="my-4" />}
            </div>
          ))}
          
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Como Funciona:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Nova Assistência:</strong> Email enviado imediatamente quando atribuída a um fornecedor</li>
              <li>• <strong>Escalação Automática:</strong> Quando não há resposta do fornecedor após o tempo definido, o sistema envia automaticamente um email de escalação para os administradores</li>
              <li>• <strong>Configuração Flexível:</strong> Cada prioridade (crítica, urgente, normal) tem tempos de escalação configuráveis</li>
              <li>• <strong>Logs Completos:</strong> Todos os emails e escalações são registados no sistema para auditoria</li>
              <li>• <strong>Teste Imediato:</strong> Use o botão "Testar" para enviar emails de teste e verificar o funcionamento</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}