import { useState } from "react";
import { Bell, Clock, AlertTriangle, CheckCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: string;
  delay: number;
  icon: React.ReactNode;
  color: string;
}

export function AutomatedNotifications() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([
    {
      id: "critical",
      name: "Lembretes para Assistências CRÍTICAS",
      description: "1º lembrete: 6h | 2º lembrete: 12h | Escalação: 24h",
      enabled: true,
      trigger: "critical_priority",
      delay: 6,
      icon: <AlertTriangle className="h-4 w-4" />,
      color: "bg-red-100 text-red-800"
    },
    {
      id: "urgent", 
      name: "Lembretes para Assistências URGENTES",
      description: "1º lembrete: 24h | 2º lembrete: 48h | Escalação: 72h",
      enabled: true,
      trigger: "urgent_priority",
      delay: 24,
      icon: <Clock className="h-4 w-4" />,
      color: "bg-orange-100 text-orange-800"
    },
    {
      id: "normal",
      name: "Lembretes para Assistências NORMAIS", 
      description: "1º lembrete: 48h | 2º lembrete: 96h | Escalação: 120h",
      enabled: true,
      trigger: "normal_priority",
      delay: 48,
      icon: <Send className="h-4 w-4" />,
      color: "bg-blue-100 text-blue-800"
    }
  ]);

  const toggleRule = (ruleId: string) => {
    setAutomationRules(prev => 
      prev.map(rule => 
        rule.id === ruleId 
          ? { ...rule, enabled: !rule.enabled }
          : rule
      )
    );
  };

  const updateDelay = (ruleId: string, newDelay: number) => {
    setAutomationRules(prev => 
      prev.map(rule => 
        rule.id === ruleId 
          ? { ...rule, delay: newDelay }
          : rule
      )
    );
  };

  const testNotification = async (ruleId: string) => {
    setLoading(true);
    try {
      // Get a real assistance for testing
      const { data: assistances } = await supabase
        .from('assistances')
        .select('id, suppliers(id)')
        .not('suppliers', 'is', null)
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
      
      const { data, error } = await supabase.functions.invoke('automated-notifications', {
        body: {
          type: ruleId === "assignment" ? "assignment" : 
                ruleId.includes("reminder") ? "reminder" : "escalation",
          assistance_id: testAssistance.id,
          supplier_id: testAssistance.suppliers?.id,
          delay_hours: automationRules.find(r => r.id === ruleId)?.delay || 0
        }
      });

      if (error) throw error;

      toast({
        title: "Teste enviado",
        description: "Notificação de teste enviada com sucesso!",
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
          {automationRules.map((rule, index) => (
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
                      />
                      <Label className="text-sm">
                        {rule.enabled ? "Ativo" : "Inativo"}
                      </Label>
                    </div>
                  </div>
                  
                  {rule.enabled && rule.delay > 0 && (
                    <div className="flex items-center gap-4">
                      <Label className="text-sm">Delay:</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={rule.delay}
                          onChange={(e) => updateDelay(rule.id, parseInt(e.target.value) || 0)}
                          className="w-20"
                          min="1"
                          max="168"
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
                      Testar
                    </Button>
                  </div>
                </div>
              </div>
              
              {index < automationRules.length - 1 && <Separator className="my-4" />}
            </div>
          ))}
          
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Como Funciona:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Nova Assistência:</strong> Email enviado imediatamente quando atribuída</li>
              <li>• <strong>Lembretes:</strong> Emails automáticos quando não há resposta</li>
              <li>• <strong>Escalação:</strong> Notificação para administradores em casos críticos</li>
              <li>• <strong>Logs:</strong> Todos os emails são registados no sistema</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}