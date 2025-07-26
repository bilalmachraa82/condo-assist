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
import { useInterventionTypes, useDeleteInterventionType } from "@/hooks/useInterventionTypes";
import { InterventionTypeForm } from "@/components/settings/InterventionTypeForm";

export default function Configuracoes() {
  const [isEditing, setIsEditing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const { toast } = useToast();

  // Fetch data
  const { data: companySettings, isLoading: isLoadingCompany } = useAppSettings("company");
  const { data: systemSettings, isLoading: isLoadingSystem } = useAppSettings("system");
  const { data: notificationSettings, isLoading: isLoadingNotifications } = useAppSettings("notifications");
  const { data: interventionTypes, isLoading: isLoadingTypes } = useInterventionTypes();
  
  const updateSetting = useUpdateAppSetting();
  const deleteType = useDeleteInterventionType();

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

  const handleDeleteType = async (id: string) => {
    try {
      await deleteType.mutateAsync(id);
      toast({
        title: "Tipo removido",
        description: "Tipo de intervenção removido com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover tipo de intervenção.",
        variant: "destructive",
      });
    }
  };

  const getSettingValue = (settings: any[], key: string, defaultValue: any = "") => {
    const setting = settings?.find(s => s.key === key);
    return setting ? (typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value) : defaultValue;
  };

  const getUrgencyLabel = (level: string) => {
    switch (level) {
      case 'normal': return 'Normal';
      case 'urgent': return 'Urgente';
      case 'critical': return 'Crítico';
      default: return level;
    }
  };

  const getUrgencyVariant = (level: string) => {
    switch (level) {
      case 'urgent': return 'destructive';
      case 'critical': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center gap-2 mb-8">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Configurações</h1>
      </div>

      <Tabs defaultValue="geral" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="geral" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="tipos" className="flex items-center gap-2">
            <Cog className="h-4 w-4" />
            Tipos de Assistência
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="sistema" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
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
                        defaultValue={getSettingValue(companySettings, "company_name")}
                        onBlur={(e) => handleSettingChange("company_name", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="empresa-nif">NIF</Label>
                      <Input
                        id="empresa-nif"
                        defaultValue={getSettingValue(companySettings, "company_nif")}
                        onBlur={(e) => handleSettingChange("company_nif", e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="empresa-endereco">Endereço</Label>
                    <Input
                      id="empresa-endereco"
                      defaultValue={getSettingValue(companySettings, "company_address")}
                      onBlur={(e) => handleSettingChange("company_address", e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="empresa-telefone">Telefone</Label>
                      <Input
                        id="empresa-telefone"
                        defaultValue={getSettingValue(companySettings, "company_phone")}
                        onBlur={(e) => handleSettingChange("company_phone", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="empresa-email">Email</Label>
                      <Input
                        id="empresa-email"
                        type="email"
                        defaultValue={getSettingValue(companySettings, "company_email")}
                        onBlur={(e) => handleSettingChange("company_email", e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tipos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tipos de Assistência</CardTitle>
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => setEditingType(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Tipo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingType ? "Editar Tipo de Intervenção" : "Novo Tipo de Intervenção"}
                    </DialogTitle>
                  </DialogHeader>
                  <InterventionTypeForm
                    interventionType={editingType}
                    onSuccess={() => {
                      setIsFormOpen(false);
                      setEditingType(null);
                    }}
                    onCancel={() => {
                      setIsFormOpen(false);
                      setEditingType(null);
                    }}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoadingTypes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {interventionTypes?.map((type) => (
                    <div key={type.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{type.name}</h4>
                          <Badge variant={getUrgencyVariant(type.urgency_level)}>
                            {getUrgencyLabel(type.urgency_level)}
                          </Badge>
                        </div>
                        {type.description && (
                          <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                        )}
                        {type.category && (
                          <p className="text-sm text-muted-foreground">Categoria: {type.category}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingType(type);
                            setIsFormOpen(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover Tipo de Intervenção</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover "{type.name}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteType(type.id)}>
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
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
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notificações por Email</Label>
                      <div className="text-sm text-muted-foreground">
                        Enviar notificações por email para eventos importantes
                      </div>
                    </div>
                    <Switch 
                      checked={getSettingValue(notificationSettings, "email_notifications_enabled", false)}
                      onCheckedChange={(checked) => handleSettingChange("email_notifications_enabled", checked)}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notificar Fornecedores Automaticamente</Label>
                      <div className="text-sm text-muted-foreground">
                        Enviar notificações automáticas para fornecedores quando são atribuídas assistências
                      </div>
                    </div>
                    <Switch 
                      checked={getSettingValue(notificationSettings, "auto_notify_suppliers", false)}
                      onCheckedChange={(checked) => handleSettingChange("auto_notify_suppliers", checked)}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Lembretes de Prazo</Label>
                      <div className="text-sm text-muted-foreground">
                        Enviar lembretes quando os prazos estão próximos do vencimento
                      </div>
                    </div>
                    <Switch 
                      checked={getSettingValue(notificationSettings, "deadline_reminders_enabled", false)}
                      onCheckedChange={(checked) => handleSettingChange("deadline_reminders_enabled", checked)}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prazo-resposta">Prazo Padrão de Resposta (horas)</Label>
                      <Input 
                        id="prazo-resposta" 
                        type="number" 
                        defaultValue={getSettingValue(systemSettings, "default_response_deadline_hours", 24)}
                        onBlur={(e) => handleSettingChange("default_response_deadline_hours", parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="validade-cotacao">Validade das Cotações (dias)</Label>
                      <Input 
                        id="validade-cotacao" 
                        type="number" 
                        defaultValue={getSettingValue(systemSettings, "quotation_validity_days", 30)}
                        onBlur={(e) => handleSettingChange("quotation_validity_days", parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Aprovação Automática</Label>
                      <div className="text-sm text-muted-foreground">
                        Aprovar automaticamente cotações que estejam dentro do orçamento predefinido
                      </div>
                    </div>
                    <Switch 
                      checked={getSettingValue(systemSettings, "auto_approve_quotations", false)}
                      onCheckedChange={(checked) => handleSettingChange("auto_approve_quotations", checked)}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Modo de Manutenção</Label>
                      <div className="text-sm text-muted-foreground">
                        Ativar modo de manutenção para o sistema
                      </div>
                    </div>
                    <Switch 
                      checked={getSettingValue(systemSettings, "maintenance_mode", false)}
                      onCheckedChange={(checked) => handleSettingChange("maintenance_mode", checked)}
                    />
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