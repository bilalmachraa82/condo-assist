import { StatsCard } from "@/components/dashboard/StatsCard"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Wrench, 
  Clock, 
  CheckCircle, 
  XCircle,
  Building2,
  Users,
  Plus,
  AlertTriangle,
  TrendingUp,
  Calendar
} from "lucide-react"
import { useAssistanceStats } from "@/hooks/useAssistances"
import { useBuildingStats } from "@/hooks/useBuildings"
import { useSupplierStats } from "@/hooks/useSuppliers"
import { useNavigate } from "react-router-dom"

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: assistanceStats, isLoading: assistanceLoading } = useAssistanceStats();
  const { data: buildingStats, isLoading: buildingLoading } = useBuildingStats();
  const { data: supplierStats, isLoading: supplierLoading } = useSupplierStats();

  const isLoading = assistanceLoading || buildingLoading || supplierLoading;
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Visão geral do sistema de gestão de assistências técnicas
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button 
          onClick={() => navigate("/assistencias")}
          className="bg-gradient-to-r from-primary to-primary-light hover:shadow-lg transition-all duration-300"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Assistência
        </Button>
        <Button 
          onClick={() => navigate("/edificios")}
          variant="outline" 
          className="hover:bg-muted/50"
        >
          <Building2 className="h-4 w-4 mr-2" />
          Gestão Edifícios
        </Button>
        <Button 
          onClick={() => navigate("/fornecedores")}
          variant="outline" 
          className="hover:bg-muted/50"
        >
          <Users className="h-4 w-4 mr-2" />
          Gestão Fornecedores
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <StatsCard
              title="Total Assistências"
              value={assistanceStats?.total.toString() || "0"}
              description="Total no sistema"
              icon={Wrench}
              trend={{ value: 12, label: "vs mês anterior", isPositive: true }}
              variant="primary"
            />
            <StatsCard
              title="Pendentes"
              value={assistanceStats?.pending.toString() || "0"}
              description="Aguardam resposta"
              icon={Clock}
              trend={{ value: -8, label: "vs semana anterior", isPositive: false }}
              variant="warning"
            />
            <StatsCard
              title="Concluídas"
              value={assistanceStats?.completed.toString() || "0"}
              description="Finalizadas"
              icon={CheckCircle}
              trend={{ value: 15, label: "vs mês anterior", isPositive: true }}
              variant="success"
            />
            <StatsCard
              title="Canceladas"
              value={assistanceStats?.cancelled.toString() || "0"}
              description="Canceladas"
              icon={XCircle}
              trend={{ value: -2, label: "vs mês anterior", isPositive: true }}
              variant="destructive"
            />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Activity Feed */}
        <div className="lg:col-span-4">
          <ActivityFeed />
        </div>

        {/* Side Cards */}
        <div className="lg:col-span-3 space-y-6">
          {/* Urgent Alerts */}
          <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Alertas Urgentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-background/50 rounded-lg">
                  <h4 className="text-sm font-medium">Elevador Avariado</h4>
                  <p className="text-xs text-muted-foreground">COND. R. ALEXANDRE HERCULANO - Edif. 003</p>
                  <p className="text-xs text-destructive mt-1">Há 2 horas sem resposta</p>
                </div>
                <div className="p-3 bg-background/50 rounded-lg">
                  <h4 className="text-sm font-medium">Fuga de Água</h4>
                  <p className="text-xs text-muted-foreground">COND. RUA D. AFONSO HENRIQUES - Edif. 101</p>
                  <p className="text-xs text-destructive mt-1">Prioridade alta</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Overview */}
          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-success">
                <TrendingUp className="h-5 w-5" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tempo médio resposta</span>
                  <span className="text-sm font-medium text-success">2.3 horas</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Taxa resolução</span>
                  <span className="text-sm font-medium text-success">94.5%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Satisfação média</span>
                  <span className="text-sm font-medium text-success">4.7/5</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Schedules */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <Calendar className="h-5 w-5" />
                Próximos Agendamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-background/50 rounded-lg">
                  <h4 className="text-sm font-medium">Manutenção Elevador</h4>
                  <p className="text-xs text-muted-foreground">TKE - Amanhã às 09:00</p>
                </div>
                <div className="p-3 bg-background/50 rounded-lg">
                  <h4 className="text-sm font-medium">Limpeza Garagem</h4>
                  <p className="text-xs text-muted-foreground">Limpeza Geral - 15:30</p>
                </div>
                <div className="p-3 bg-background/50 rounded-lg">
                  <h4 className="text-sm font-medium">Controlo Pragas</h4>
                  <p className="text-xs text-muted-foreground">Desinfest Lar - Quinta-feira</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}