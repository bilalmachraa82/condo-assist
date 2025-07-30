import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Settings, Building2, Bell, Zap } from "lucide-react";
import { useAllAppSettings } from "@/hooks/useAppSettings";
import { SettingsForm } from "@/components/settings/SettingsForm";

const Configuracoes = () => {
  const { data: allSettings, isLoading, error } = useAllAppSettings();

  // Define form configurations for each category
  const formConfigs = {
    empresa: {
      title: "Informações da Empresa",
      description: "Configure os dados básicos da sua empresa",
      icon: Building2,
      fields: [
        { key: 'empresa_nome', label: 'Nome da Empresa', type: 'text' as const, required: true, placeholder: 'Ex: Sua Empresa Lda.' },
        { key: 'empresa_nif', label: 'NIF', type: 'nif' as const, required: true, placeholder: '123456789', description: 'Número de Identificação Fiscal' },
        { key: 'empresa_morada', label: 'Morada', type: 'textarea' as const, placeholder: 'Rua Principal, 123\n1000-001 Lisboa' },
        { key: 'empresa_telefone', label: 'Telefone', type: 'tel' as const, placeholder: '+351 210 000 000' },
        { key: 'empresa_email', label: 'Email', type: 'email' as const, placeholder: 'geral@suaempresa.pt' },
        { key: 'empresa_website', label: 'Website', type: 'url' as const, placeholder: 'https://www.suaempresa.pt' },
      ]
    },
    sistema: {
      title: "Configurações do Sistema",
      description: "Defina as preferências gerais do sistema",
      icon: Settings,
      fields: [
        { key: 'sistema_idioma', label: 'Idioma', type: 'text' as const, placeholder: 'pt' },
        { key: 'sistema_timezone', label: 'Fuso Horário', type: 'text' as const, placeholder: 'Europe/Lisbon' },
        { key: 'sistema_formato_data', label: 'Formato de Data', type: 'text' as const, placeholder: 'DD/MM/YYYY' },
        { key: 'sistema_moeda', label: 'Moeda', type: 'text' as const, placeholder: 'EUR' },
        { key: 'sistema_backup_automatico', label: 'Backup Automático', type: 'switch' as const, description: 'Ativar backup automático dos dados' },
        { key: 'sistema_manutencao', label: 'Modo de Manutenção', type: 'switch' as const, description: 'Ativar modo de manutenção do sistema' },
      ]
    },
    notificacoes: {
      title: "Notificações",
      description: "Configure como e quando receber notificações",
      icon: Bell,
      fields: [
        { key: 'notificacoes_email_ativo', label: 'Notificações por Email', type: 'switch' as const, description: 'Receber notificações por email' },
        { key: 'notificacoes_sms_ativo', label: 'Notificações por SMS', type: 'switch' as const, description: 'Receber notificações por SMS' },
        { key: 'notificacoes_nova_assistencia', label: 'Nova Assistência', type: 'switch' as const, description: 'Notificar quando uma nova assistência for criada' },
        { key: 'notificacoes_mudanca_estado', label: 'Mudança de Estado', type: 'switch' as const, description: 'Notificar mudanças de estado das assistências' },
        { key: 'notificacoes_lembretes_prazo', label: 'Lembretes de Prazo', type: 'switch' as const, description: 'Receber lembretes sobre prazos importantes' },
      ]
    },
    integracao: {
      title: "Integrações",
      description: "Configure integrações com sistemas externos",
      icon: Zap,
      fields: [
        { key: 'integracao_api_key', label: 'Chave API', type: 'text' as const, placeholder: 'Digite a chave API', description: 'Chave para integração com APIs externas' },
        { key: 'integracao_webhook_url', label: 'URL do Webhook', type: 'url' as const, placeholder: 'https://seu-webhook.com/endpoint' },
        { key: 'integracao_sync_automatico', label: 'Sincronização Automática', type: 'switch' as const, description: 'Ativar sincronização automática com sistemas externos' },
      ]
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-lg">A carregar configurações...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center min-h-[400px] flex items-center justify-center">
          <div className="text-destructive">
            <p className="text-lg font-semibold">Erro ao carregar configurações</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : 'Erro desconhecido'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { grouped: settings } = allSettings || { grouped: {} };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-primary/10">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações da aplicação
          </p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="empresa" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-12">
          {Object.entries(formConfigs).map(([key, config]) => {
            const IconComponent = config.icon;
            return (
              <TabsTrigger 
                key={key} 
                value={key} 
                className="flex items-center gap-2 text-sm font-medium"
              >
                <IconComponent className="h-4 w-4" />
                <span className="hidden sm:inline">{config.title.split(' ')[0]}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Tab Contents */}
        {Object.entries(formConfigs).map(([category, config]) => (
          <TabsContent key={category} value={category} className="space-y-6">
            <SettingsForm
              category={category}
              title={config.title}
              description={config.description}
              settings={settings[category] || {}}
              fields={config.fields}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Configuracoes;