import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Settings, Building2, Bell, Cog, Edit2, Save, X, Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppSettings, useUpdateAppSetting } from "@/hooks/useAppSettings";

export default function Configuracoes() {
  const { toast } = useToast();

  // Fetch data
  const { data: companySettings, isLoading: isLoadingCompany } = useAppSettings("empresa");
  const { data: systemSettings, isLoading: isLoadingSystem } = useAppSettings("sistema");
  const { data: notificationSettings, isLoading: isLoadingNotifications } = useAppSettings("notificacoes");
  const { data: integrationSettings, isLoading: isLoadingIntegrations } = useAppSettings("integracao");
  
  const updateSetting = useUpdateAppSetting();

  const handleSettingChange = async (key: string, value: any) => {
    try {
      await updateSetting.mutateAsync({ key, value });
      toast({
        title: "Configuração atualizada",
        description: "A configuração foi salva com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar configuração.",
        variant: "destructive",
      });
    }
  };


  const getSettingValue = (settings: any[], key: string, defaultValue: any = "") => {
    const setting = settings?.find(s => s.key === key);
    return setting ? setting.value : defaultValue;
  };


  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center gap-2 mb-8">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">Configurações</h1>
      </div>

      <Tabs defaultValue="empresa" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="empresa" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="sistema" className="flex items-center gap-2">
            <Cog className="h-4 w-4" />
            Sistema
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="integracao" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Integração
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingCompany ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="empresa-nome">Nome da Empresa</Label>
                      <Input
                        id="empresa-nome"
                        placeholder="Nome da empresa"
                        defaultValue={getSettingValue(companySettings, "nome_empresa")}
                        onBlur={(e) => handleSettingChange("nome_empresa", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="empresa-nif">NIF</Label>
                      <Input
                        id="empresa-nif"
                        placeholder="123456789"
                        defaultValue={getSettingValue(companySettings, "nif_empresa")}
                        onBlur={(e) => handleSettingChange("nif_empresa", e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="empresa-endereco">Morada</Label>
                    <Input
                      id="empresa-endereco"
                      placeholder="Rua, Cidade, Código Postal"
                      defaultValue={getSettingValue(companySettings, "morada_empresa")}
                      onBlur={(e) => handleSettingChange("morada_empresa", e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="empresa-telefone">Telefone</Label>
                      <Input
                        id="empresa-telefone"
                        placeholder="+351 123 456 789"
                        defaultValue={getSettingValue(companySettings, "telefone_empresa")}
                        onBlur={(e) => handleSettingChange("telefone_empresa", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="empresa-email">Email</Label>
                      <Input
                        id="empresa-email"
                        type="email"
                        placeholder="contacto@empresa.pt"
                        defaultValue={getSettingValue(companySettings, "email_empresa")}
                        onBlur={(e) => handleSettingChange("email_empresa", e.target.value)}
                      />
                    </div>
                  </div>

                  <Separator />
                  
                  <div className="space-y-2">
                    <Label htmlFor="empresa-website">Website</Label>
                    <Input
                      id="empresa-website"
                      placeholder="https://www.empresa.pt"
                      defaultValue={getSettingValue(companySettings, "website_empresa")}
                      onBlur={(e) => handleSettingChange("website_empresa", e.target.value)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sistema">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingSystem ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">Prazos e SLA</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="prazo-resposta-normal">Prazo Resposta Normal (horas)</Label>
                        <Input 
                          id="prazo-resposta-normal" 
                          type="number" 
                          placeholder="48"
                          defaultValue={getSettingValue(systemSettings, "prazo_resposta_normal", 48)}
                          onBlur={(e) => handleSettingChange("prazo_resposta_normal", parseInt(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="prazo-resposta-urgente">Prazo Resposta Urgente (horas)</Label>
                        <Input 
                          id="prazo-resposta-urgente" 
                          type="number" 
                          placeholder="24"
                          defaultValue={getSettingValue(systemSettings, "prazo_resposta_urgente", 24)}
                          onBlur={(e) => handleSettingChange("prazo_resposta_urgente", parseInt(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="prazo-resposta-critico">Prazo Resposta Crítico (horas)</Label>
                        <Input 
                          id="prazo-resposta-critico" 
                          type="number" 
                          placeholder="4"
                          defaultValue={getSettingValue(systemSettings, "prazo_resposta_critico", 4)}
                          onBlur={(e) => handleSettingChange("prazo_resposta_critico", parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">Orçamentos e Aprovações</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="validade-cotacao">Validade das Cotações (dias)</Label>
                        <Input 
                          id="validade-cotacao" 
                          type="number" 
                          placeholder="30"
                          defaultValue={getSettingValue(systemSettings, "validade_cotacoes", 30)}
                          onBlur={(e) => handleSettingChange("validade_cotacoes", parseInt(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="limite-aprovacao-auto">Limite Aprovação Automática (€)</Label>
                        <Input 
                          id="limite-aprovacao-auto" 
                          type="number" 
                          placeholder="500"
                          defaultValue={getSettingValue(systemSettings, "limite_aprovacao_automatica", 500)}
                          onBlur={(e) => handleSettingChange("limite_aprovacao_automatica", parseFloat(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">Automatizações</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Aprovação Automática de Orçamentos</Label>
                          <div className="text-sm text-muted-foreground">
                            Aprovar automaticamente orçamentos dentro do limite definido
                          </div>
                        </div>
                        <Switch 
                          checked={getSettingValue(systemSettings, "aprovacao_automatica_ativa", false)}
                          onCheckedChange={(checked) => handleSettingChange("aprovacao_automatica_ativa", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Escalamento Automático</Label>
                          <div className="text-sm text-muted-foreground">
                            Escalar automaticamente assistências sem resposta
                          </div>
                        </div>
                        <Switch 
                          checked={getSettingValue(systemSettings, "escalamento_automatico", false)}
                          onCheckedChange={(checked) => handleSettingChange("escalamento_automatico", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Atribuição Automática de Fornecedores</Label>
                          <div className="text-sm text-muted-foreground">
                            Atribuir automaticamente fornecedores com base na especialização
                          </div>
                        </div>
                        <Switch 
                          checked={getSettingValue(systemSettings, "atribuicao_automatica", false)}
                          onCheckedChange={(checked) => handleSettingChange("atribuicao_automatica", checked)}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">Sistema</h4>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Modo de Manutenção</Label>
                        <div className="text-sm text-muted-foreground">
                          Ativar modo de manutenção para o sistema
                        </div>
                      </div>
                      <Switch 
                        checked={getSettingValue(systemSettings, "modo_manutencao", false)}
                        onCheckedChange={(checked) => handleSettingChange("modo_manutencao", checked)}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Notificações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingNotifications ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">Notificações por Email</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Ativar Notificações por Email</Label>
                          <div className="text-sm text-muted-foreground">
                            Enviar notificações por email para eventos importantes
                          </div>
                        </div>
                        <Switch 
                          checked={getSettingValue(notificationSettings, "email_ativo", false)}
                          onCheckedChange={(checked) => handleSettingChange("email_ativo", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Notificar Criação de Assistências</Label>
                          <div className="text-sm text-muted-foreground">
                            Enviar email quando uma nova assistência é criada
                          </div>
                        </div>
                        <Switch 
                          checked={getSettingValue(notificationSettings, "email_nova_assistencia", false)}
                          onCheckedChange={(checked) => handleSettingChange("email_nova_assistencia", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Notificar Atribuição de Fornecedores</Label>
                          <div className="text-sm text-muted-foreground">
                            Enviar email automático para fornecedores atribuídos
                          </div>
                        </div>
                        <Switch 
                          checked={getSettingValue(notificationSettings, "email_atribuicao_fornecedor", false)}
                          onCheckedChange={(checked) => handleSettingChange("email_atribuicao_fornecedor", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Lembretes de Prazo</Label>
                          <div className="text-sm text-muted-foreground">
                            Enviar lembretes quando os prazos estão próximos
                          </div>
                        </div>
                        <Switch 
                          checked={getSettingValue(notificationSettings, "email_lembretes_prazo", false)}
                          onCheckedChange={(checked) => handleSettingChange("email_lembretes_prazo", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Notificar Mudanças de Estado</Label>
                          <div className="text-sm text-muted-foreground">
                            Enviar email quando o estado de uma assistência muda
                          </div>
                        </div>
                        <Switch 
                          checked={getSettingValue(notificationSettings, "email_mudanca_estado", false)}
                          onCheckedChange={(checked) => handleSettingChange("email_mudanca_estado", checked)}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">Frequência de Notificações</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="freq-lembretes">Frequência Lembretes (horas)</Label>
                        <Input 
                          id="freq-lembretes" 
                          type="number" 
                          placeholder="24"
                          defaultValue={getSettingValue(notificationSettings, "frequencia_lembretes", 24)}
                          onBlur={(e) => handleSettingChange("frequencia_lembretes", parseInt(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="max-lembretes">Máximo de Lembretes</Label>
                        <Input 
                          id="max-lembretes" 
                          type="number" 
                          placeholder="3"
                          defaultValue={getSettingValue(notificationSettings, "maximo_lembretes", 3)}
                          onBlur={(e) => handleSettingChange("maximo_lembretes", parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integracao">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Integração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingIntegrations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">APIs Externas</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Integração com ERP</Label>
                          <div className="text-sm text-muted-foreground">
                            Sincronizar dados com sistema ERP externo
                          </div>
                        </div>
                        <Switch 
                          checked={getSettingValue(integrationSettings, "erp_ativo", false)}
                          onCheckedChange={(checked) => handleSettingChange("erp_ativo", checked)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="erp-url">URL do ERP</Label>
                        <Input 
                          id="erp-url" 
                          placeholder="https://api.erp.empresa.pt"
                          defaultValue={getSettingValue(integrationSettings, "erp_url", "")}
                          onBlur={(e) => handleSettingChange("erp_url", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">Webhooks</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Webhooks Ativos</Label>
                          <div className="text-sm text-muted-foreground">
                            Enviar notificações para sistemas externos
                          </div>
                        </div>
                        <Switch 
                          checked={getSettingValue(integrationSettings, "webhooks_ativo", false)}
                          onCheckedChange={(checked) => handleSettingChange("webhooks_ativo", checked)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="webhook-url">URL do Webhook</Label>
                        <Input 
                          id="webhook-url" 
                          placeholder="https://api.empresa.pt/webhook"
                          defaultValue={getSettingValue(integrationSettings, "webhook_url", "")}
                          onBlur={(e) => handleSettingChange("webhook_url", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">Backup e Sincronização</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Backup Automático</Label>
                          <div className="text-sm text-muted-foreground">
                            Criar backups automáticos dos dados
                          </div>
                        </div>
                        <Switch 
                          checked={getSettingValue(integrationSettings, "backup_automatico", false)}
                          onCheckedChange={(checked) => handleSettingChange("backup_automatico", checked)}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="freq-backup">Frequência Backup (dias)</Label>
                          <Input 
                            id="freq-backup" 
                            type="number" 
                            placeholder="7"
                            defaultValue={getSettingValue(integrationSettings, "frequencia_backup", 7)}
                            onBlur={(e) => handleSettingChange("frequencia_backup", parseInt(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="retencao-backup">Retenção Backup (dias)</Label>
                          <Input 
                            id="retencao-backup" 
                            type="number" 
                            placeholder="30"
                            defaultValue={getSettingValue(integrationSettings, "retencao_backup", 30)}
                            onBlur={(e) => handleSettingChange("retencao_backup", parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}