import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { 
  Settings, 
  Building2, 
  Mail, 
  Clock, 
  Shield,
  Wrench,
  Plus,
  Edit,
  Trash2,
  Save
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

export default function Configuracoes() {
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)

  // Fetch intervention types
  const { data: interventionTypes = [], isLoading: loadingTypes } = useQuery({
    queryKey: ['intervention-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intervention_types')
        .select('*')
        .order('name')
      
      if (error) throw error
      return data || []
    }
  })

  const handleSaveSettings = () => {
    toast({
      title: "Configurações guardadas",
      description: "As suas configurações foram atualizadas com sucesso."
    })
    setIsEditing(false)
  }

  return (
    <div className="container max-w-6xl py-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Configurações</h1>
      </div>

      <Tabs defaultValue="geral" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="geral" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="tipos" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Tipos de Assistência
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="sistema" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Informações da Empresa</CardTitle>
                <CardDescription>
                  Configure as informações básicas da sua empresa ou condomínio
                </CardDescription>
              </div>
              <Button 
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => isEditing ? handleSaveSettings() : setIsEditing(true)}
              >
                {isEditing ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Nome da Empresa</Label>
                  <Input 
                    id="company-name" 
                    defaultValue="Gestão de Condomínios Lda."
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-nif">NIF</Label>
                  <Input 
                    id="company-nif" 
                    defaultValue="123456789"
                    disabled={!isEditing}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company-address">Morada</Label>
                <Textarea 
                  id="company-address" 
                  defaultValue="Rua das Flores, 123&#10;1000-001 Lisboa"
                  disabled={!isEditing}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-phone">Telefone</Label>
                  <Input 
                    id="company-phone" 
                    defaultValue="+351 210 000 000"
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-email">Email</Label>
                  <Input 
                    id="company-email" 
                    type="email"
                    defaultValue="geral@gestaocondominio.pt"
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tipos" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tipos de Assistência</CardTitle>
                <CardDescription>
                  Gerir os tipos de intervenção disponíveis no sistema
                </CardDescription>
              </div>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Novo Tipo
              </Button>
            </CardHeader>
            <CardContent>
              {loadingTypes ? (
                <div className="text-center py-8 text-muted-foreground">
                  A carregar tipos de assistência...
                </div>
              ) : (
                <div className="space-y-4">
                  {interventionTypes.map((type) => (
                    <div key={type.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{type.name}</h4>
                          <Badge variant={
                            type.urgency_level === 'critical' ? 'destructive' :
                            'outline'
                          }>
                            {type.urgency_level === 'critical' ? 'Crítico' : 'Normal'}
                          </Badge>
                        </div>
                        {type.description && (
                          <p className="text-sm text-muted-foreground">{type.description}</p>
                        )}
                        {type.category && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Categoria: {type.category}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Notificações</CardTitle>
              <CardDescription>
                Configure quando e como as notificações são enviadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações por Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber notificações por email para eventos importantes
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-notificar Fornecedores</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificar automaticamente fornecedores quando atribuídos
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Lembretes de Prazo</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar lembretes quando prazos estão próximos
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Email de Remetente</Label>
                <Input 
                  defaultValue="noreply@gestaocondominio.pt"
                  placeholder="Email que aparece como remetente"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sistema" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Sistema</CardTitle>
              <CardDescription>
                Configure o comportamento geral do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="default-deadline">Prazo Padrão (dias)</Label>
                  <Input 
                    id="default-deadline" 
                    type="number"
                    defaultValue="7"
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quotation-validity">Validade Orçamentos (dias)</Label>
                  <Input 
                    id="quotation-validity" 
                    type="number"
                    defaultValue="30"
                    min="1"
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Aprovação Automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Aprovar automaticamente orçamentos abaixo de €500
                  </p>
                </div>
                <Switch />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Modo de Manutenção</Label>
                  <p className="text-sm text-muted-foreground">
                    Desabilitar acesso temporariamente para manutenção
                  </p>
                </div>
                <Switch />
              </div>

              <Separator />

              <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Backup Automático</p>
                  <p className="text-xs text-muted-foreground">
                    Último backup: Hoje às 03:00
                  </p>
                </div>
                <Badge variant="outline">Ativo</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}