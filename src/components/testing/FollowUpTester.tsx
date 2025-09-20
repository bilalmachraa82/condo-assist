import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Play, 
  TestTube, 
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info
} from "lucide-react";

export default function FollowUpTester() {
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const { toast } = useToast();

  const createTestFollowUp = async () => {
    setIsCreatingTest(true);
    try {
      // Create a test follow-up scheduled for now (so it can be processed immediately)
      const { data, error } = await supabase
        .from('follow_up_schedules')
        .insert({
          assistance_id: 'test-assistance-id',
          supplier_id: 'test-supplier-id',
          follow_up_type: 'quotation_reminder',
          priority: 'normal',
          scheduled_for: new Date().toISOString(), // Schedule for now
          metadata: {
            test: true,
            created_at: new Date().toISOString(),
            description: 'Test follow-up criado pelo componente de teste'
          }
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Follow-up de teste criado",
        description: `ID: ${data.id}`,
      });

      setTestResults(prev => ({
        ...prev,
        testFollowUp: data
      }));

    } catch (error) {
      console.error('Erro ao criar follow-up de teste:', error);
      toast({
        title: "Erro ao criar teste",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreatingTest(false);
    }
  };

  const processFollowUps = async (mode: 'due' | 'all') => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-followups', {
        body: { mode }
      });

      if (error) throw error;

      toast({
        title: "Follow-ups processados",
        description: `Modo: ${mode}. Processados: ${data.processed}`,
      });

      setTestResults(prev => ({
        ...prev,
        processResult: data
      }));

    } catch (error) {
      console.error('Erro ao processar follow-ups:', error);
      toast({
        title: "Erro ao processar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const checkFollowUpStats = async () => {
    try {
      const { data: stats, error } = await supabase.rpc('get_followup_processing_stats');
      
      if (error) throw error;

      const statsData = stats as any;
      setTestResults(prev => ({
        ...prev,
        stats: statsData
      }));

      toast({
        title: "Estatísticas atualizadas",
        description: `${statsData.total_pending || 0} pendentes, ${statsData.due_now || 0} devidos agora`,
      });

    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      toast({
        title: "Erro nas estatísticas",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Teste de Follow-ups
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Este componente permite testar a funcionalidade de follow-ups automatizados.
              Use apenas em desenvolvimento/teste.
            </AlertDescription>
          </Alert>

          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={createTestFollowUp}
              disabled={isCreatingTest}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              {isCreatingTest ? "Criando..." : "Criar Follow-up Teste"}
            </Button>

            <Button 
              onClick={() => processFollowUps('due')}
              disabled={isProcessing}
              variant="outline"
              className="gap-2"
            >
              <Clock className="h-4 w-4" />
              {isProcessing ? "Processando..." : "Processar Devidos"}
            </Button>

            <Button 
              onClick={() => processFollowUps('all')}
              disabled={isProcessing}
              variant="outline"
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Processar Todos
            </Button>

            <Button 
              onClick={checkFollowUpStats}
              variant="secondary"
              className="gap-2"
            >
              <TestTube className="h-4 w-4" />
              Verificar Stats
            </Button>
          </div>

          {testResults && (
            <div className="space-y-4 mt-6">
              <h4 className="font-medium">Resultados dos Testes:</h4>
              
              {testResults.testFollowUp && (
                <div className="p-3 bg-muted rounded-lg">
                  <h5 className="font-medium text-sm mb-2">Follow-up Criado:</h5>
                  <div className="space-y-1 text-sm">
                    <div>ID: <Badge variant="outline">{testResults.testFollowUp.id}</Badge></div>
                    <div>Tipo: <Badge>{testResults.testFollowUp.follow_up_type}</Badge></div>
                    <div>Status: <Badge className={
                      testResults.testFollowUp.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600' :
                      testResults.testFollowUp.status === 'sent' ? 'bg-green-500/10 text-green-600' :
                      'bg-red-500/10 text-red-600'
                    }>
                      {testResults.testFollowUp.status}
                    </Badge></div>
                    <div>Agendado: {new Date(testResults.testFollowUp.scheduled_for).toLocaleString('pt-PT')}</div>
                  </div>
                </div>
              )}

              {testResults.processResult && (
                <div className="p-3 bg-muted rounded-lg">
                  <h5 className="font-medium text-sm mb-2">Resultado do Processamento:</h5>
                  <div className="space-y-1 text-sm">
                    <div>Processados: <Badge variant="outline">{testResults.processResult.processed}</Badge></div>
                    <div>Enviados: <Badge className="bg-green-500/10 text-green-600">{testResults.processResult.sent}</Badge></div>
                    <div>Falhados: <Badge className="bg-red-500/10 text-red-600">{testResults.processResult.failed}</Badge></div>
                    {testResults.processResult.message && (
                      <div className="mt-2 p-2 bg-background rounded text-xs">
                        {testResults.processResult.message}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {testResults.stats && (
                <div className="p-3 bg-muted rounded-lg">
                  <h5 className="font-medium text-sm mb-2">Estatísticas Atuais:</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Total Pendentes</div>
                      <Badge variant="outline">{testResults.stats.total_pending}</Badge>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Devidos Agora</div>
                      <Badge className="bg-yellow-500/10 text-yellow-600">{testResults.stats.due_now}</Badge>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Enviados Hoje</div>
                      <Badge className="bg-green-500/10 text-green-600">{testResults.stats.sent_today}</Badge>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Falhados Hoje</div>
                      <Badge className="bg-red-500/10 text-red-600">{testResults.stats.failed_today}</Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}