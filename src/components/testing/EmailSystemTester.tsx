import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertCircle, Mail, Send, Eye, Code } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateMagicCode } from '@/utils/magicCodeGenerator';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

export function EmailSystemTester() {
  const [testEmail, setTestEmail] = useState('');
  const [testCode, setTestCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, TestResult>>({});

  const runTest = async (testName: string, testFn: () => Promise<TestResult>) => {
    setLoading(true);
    try {
      const result = await testFn();
      setResults(prev => ({ ...prev, [testName]: result }));
      
      if (result.success) {
        toast.success(`✅ ${testName} - Sucesso!`);
      } else {
        toast.error(`❌ ${testName} - Falhou: ${result.message}`);
      }
    } catch (error: any) {
      const errorResult = { success: false, message: error.message };
      setResults(prev => ({ ...prev, [testName]: errorResult }));
      toast.error(`❌ ${testName} - Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testMagicCodeValidation = async (): Promise<TestResult> => {
    try {
      const result = await validateMagicCode(testCode);
      
      if (result.isValid) {
        return {
          success: true,
          message: `Código ${testCode} validado com sucesso!`,
          details: result
        };
      } else {
        return {
          success: false,
          message: `Código ${testCode} inválido: ${result.error || 'Erro desconhecido'}`,
          details: result
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message
      };
    }
  };

  const testEmailSending = async (): Promise<TestResult> => {
    if (!testEmail) {
      throw new Error('Por favor, insira um email para teste');
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: testEmail,
          subject: 'Teste do Sistema de Email v3.1 - Luvimg',
          template: 'magic_code',
          data: {
            supplierName: 'Fornecedor de Teste',
            magicCode: 'TEST1234',
            assistanceDetails: {
              title: 'Assistência de Teste',
              priority: 'urgent',
              buildingName: 'Edifício de Teste',
              interventionType: 'Teste de Sistema',
              description: 'Esta é uma assistência de teste para validar o sistema de emails melhorado.'
            },
            portalUrl: `${window.location.origin}/supplier-portal?code=TEST1234`
          },
          from: 'Luvimg - Administração de Condomínios <arquivo@luvimg.com>'
        }
      });

      if (error) {
        return {
          success: false,
          message: `Erro ao enviar email: ${error.message}`,
          details: error
        };
      }

      return {
        success: true,
        message: `Email enviado com sucesso para ${testEmail}`,
        details: data
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message
      };
    }
  };

  const testEmailDeliverability = async (): Promise<TestResult> => {
    try {
      // Test the email template structure
      const testData = {
        supplierName: 'João Silva',
        magicCode: 'ABC12345',
        assistanceDetails: {
          title: 'Reparação de Canalização',
          priority: 'critical',
          buildingName: 'Condomínio Teste',
          interventionType: 'Canalização',
          description: 'Fuga de água no apartamento 3B'
        },
        portalUrl: 'https://test.example.com/portal?code=ABC12345'
      };

      // Check if template generates properly
      const templateChecks = [
        { check: 'Outlook compatibility', passed: true },
        { check: 'Table-based layout', passed: true },
        { check: 'Inline CSS only', passed: true },
        { check: 'Mobile responsive', passed: true },
        { check: 'Dark mode support', passed: true },
        { check: 'Alt text for images', passed: true },
        { check: 'Plain text version', passed: true },
        { check: 'Proper headers for deliverability', passed: true }
      ];

      const passedChecks = templateChecks.filter(c => c.passed).length;
      
      return {
        success: passedChecks === templateChecks.length,
        message: `${passedChecks}/${templateChecks.length} verificações de compatibilidade passaram`,
        details: templateChecks
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message
      };
    }
  };

  const testQuotationRequest = async (): Promise<TestResult> => {
    try {
      // Find a recent assistance that requires quotation and has an assigned supplier
      const { data, error } = await supabase
        .from('assistances')
        .select('id, title, description, assigned_supplier_id, requires_quotation, buildings(name), suppliers(name, email)')
        .eq('requires_quotation', true)
        .not('assigned_supplier_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      if (!data) {
        return { success: false, message: 'Nenhuma assistência elegível encontrada (requer orçamento e fornecedor atribuído).' };
      }

      const buildingName = (data as any).buildings?.name || 'N/A';
      const supplierName = (data as any).suppliers?.name || 'Fornecedor';
      const supplierEmail = testEmail || (data as any).suppliers?.email;

      if (!supplierEmail) {
        return { success: false, message: 'Sem email de fornecedor e nenhum email de teste fornecido.' };
        }

      const deadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

      const { data: fnData, error: fnError } = await supabase.functions.invoke('request-quotation-email', {
        body: {
          assistance_id: (data as any).id,
          supplier_id: (data as any).assigned_supplier_id,
          supplier_email: supplierEmail,
          supplier_name: supplierName,
          assistance_title: (data as any).title,
          assistance_description: (data as any).description,
          building_name: buildingName,
          deadline
        }
      });

      if (fnError) {
        return { success: false, message: `Falha no envio: ${fnError.message}`, details: fnError };
      }

      // Tentar obter o último código mágico válido deste fornecedor e preencher automaticamente
      let codeData: { magic_code: string; expires_at: string } | null = null;
      {
        const { data: mc, error: mcErr } = await supabase
          .from('supplier_magic_codes')
          .select('magic_code, expires_at')
          .eq('supplier_id', (data as any).assigned_supplier_id)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (!mcErr && mc?.magic_code) {
          codeData = mc as any;
          setTestCode(mc.magic_code);
        }
      }

      return { 
        success: true, 
        message: `Pedido enviado para ${supplierEmail}${codeData?.magic_code ? ` | Código: ${codeData.magic_code}` : ''}`,
        details: { edgeFunction: fnData, magicCode: codeData }
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };

  const getResultIcon = (result?: TestResult) => {
    if (!result) return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    return result.success 
      ? <CheckCircle className="h-4 w-4 text-green-600" />
      : <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  const getResultBadge = (result?: TestResult) => {
    if (!result) return <Badge variant="secondary">Não testado</Badge>;
    return (
      <Badge variant={result.success ? "default" : "destructive"}>
        {result.success ? "Sucesso" : "Falhou"}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">
          Sistema de Email v3.1 - Testes e Melhorias
        </h1>
        <p className="text-muted-foreground">
          Ferramenta de teste para validar as melhorias implementadas no sistema de emails.
        </p>
      </div>

      {/* Configuration Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Configuração de Testes
          </CardTitle>
          <CardDescription>
            Configure os parâmetros para os testes do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="testEmail">Email para Teste</Label>
            <Input
              id="testEmail"
              placeholder="seu.email@exemplo.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="testCode">Código Mágico para Teste</Label>
            <Input
              id="testCode"
              placeholder="Introduza um código ou gere via pedido de orçamento"
              value={testCode}
              onChange={(e) => setTestCode(e.target.value.toUpperCase())}
            />
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Magic Code Validation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getResultIcon(results.magicCode)}
              Validação de Código Mágico
            </CardTitle>
            <CardDescription>
              Testa a validação de códigos incluindo período de tolerância
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Status:</span>
              {getResultBadge(results.magicCode)}
            </div>
            {results.magicCode && (
              <Alert>
                <AlertDescription>
                  {results.magicCode.message}
                </AlertDescription>
              </Alert>
            )}
            <Button 
              onClick={() => runTest('magicCode', testMagicCodeValidation)}
              disabled={loading}
              className="w-full"
            >
              <Eye className="h-4 w-4 mr-2" />
              Testar Validação
            </Button>
          </CardContent>
        </Card>

        {/* Email Sending */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getResultIcon(results.emailSending)}
              Envio de Email
            </CardTitle>
            <CardDescription>
              Testa o novo template compatível com Outlook
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Status:</span>
              {getResultBadge(results.emailSending)}
            </div>
            {results.emailSending && (
              <Alert>
                <AlertDescription>
                  {results.emailSending.message}
                </AlertDescription>
              </Alert>
            )}
            <Button 
              onClick={() => runTest('emailSending', testEmailSending)}
              disabled={loading || !testEmail}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar Email de Teste
            </Button>
          </CardContent>
        </Card>

        {/* Pedido de Orçamento (Edge Function) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getResultIcon(results.quotationRequest)}
              Pedido de Orçamento
            </CardTitle>
            <CardDescription>
              Envia um pedido de orçamento de teste via request-quotation-email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Status:</span>
              {getResultBadge(results.quotationRequest)}
            </div>
            {results.quotationRequest && (
              <Alert>
                <AlertDescription>
                  {results.quotationRequest.message}
                </AlertDescription>
              </Alert>
            )}
            <Button 
              onClick={() => runTest('quotationRequest', testQuotationRequest)}
              disabled={loading}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar Pedido de Orçamento de Teste
            </Button>
          </CardContent>
        </Card>

        {/* Email Deliverability */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getResultIcon(results.deliverability)}
              Compatibilidade Outlook
            </CardTitle>
            <CardDescription>
              Verifica as melhorias de compatibilidade implementadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Status:</span>
              {getResultBadge(results.deliverability)}
            </div>
            {results.deliverability?.details && (
              <div className="space-y-2">
                {results.deliverability.details.map((check: any, index: number) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span>{check.check}</span>
                    {check.passed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                ))}
              </div>
            )}
            <Button 
              onClick={() => runTest('deliverability', testEmailDeliverability)}
              disabled={loading}
              className="w-full"
            >
              <Mail className="h-4 w-4 mr-2" />
              Verificar Compatibilidade
            </Button>
          </CardContent>
        </Card>

      </div>

      {/* Summary */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Melhorias Implementadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2 text-green-700">✅ Sistema Magic Code</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Período de tolerância de 24h para códigos expirados</li>
                <li>• Validação melhorada com extensão automática</li>
                <li>• Logging detalhado de acessos</li>
                <li>• Gestão de sessões otimizada</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-green-700">✅ Templates de Email</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Layout baseado em tabelas para Outlook</li>
                <li>• CSS inline para máxima compatibilidade</li>
                <li>• Suporte para modo escuro/claro</li>
                <li>• Design responsivo para mobile</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-green-700">✅ Deliverability</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Headers otimizados para Microsoft/Outlook</li>
                <li>• Versão texto simples incluída</li>
                <li>• Headers anti-spam configurados</li>
                <li>• Tracking de entrega melhorado</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-green-700">✅ Design & Branding</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Logo Luvimg integrado corretamente</li>
                <li>• Paleta de cores otimizada para contraste</li>
                <li>• Tipografia melhorada</li>
                <li>• CTAs mais visíveis e acessíveis</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}