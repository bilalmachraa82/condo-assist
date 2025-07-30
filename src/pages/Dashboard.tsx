import { StatsCard } from "@/components/dashboard/StatsCard"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import SystemMonitor from "@/components/dashboard/SystemMonitor"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
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
  Calendar,
  Building
} from "lucide-react"
import { useAssistanceStats } from "@/hooks/useAssistances"
import { useBuildingStats } from "@/hooks/useBuildings"
import { useSupplierStats } from "@/hooks/useSuppliers"
import { useUrgentAlerts } from "@/hooks/useUrgentAlerts"
import { usePerformanceMetrics } from "@/hooks/usePerformanceMetrics"
import { useUpcomingSchedules } from "@/hooks/useUpcomingSchedules"
import { useNavigate } from "react-router-dom"
import { format } from "date-fns"

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: assistanceStats, isLoading: assistanceLoading } = useAssistanceStats();
  const { data: buildingStats, isLoading: buildingLoading } = useBuildingStats();
  const { data: supplierStats, isLoading: supplierLoading } = useSupplierStats();
  const { data: urgentAlerts, isLoading: alertsLoading } = useUrgentAlerts();
  const { data: performanceMetrics, isLoading: performanceLoading } = usePerformanceMetrics();
  const { data: upcomingSchedules, isLoading: schedulesLoading } = useUpcomingSchedules();

  const isLoading = assistanceLoading || buildingLoading || supplierLoading;
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
          Painel de Controlo
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

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="monitoring">Monitor do Sistema</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
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
                  {alertsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : urgentAlerts && urgentAlerts.length > 0 ? (
                    <div className="space-y-3">
                      {urgentAlerts.slice(0, 2).map((alert) => (
                        <div key={alert.id} className="p-3 bg-background/50 rounded-lg">
                          <h4 className="text-sm font-medium">{alert.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">{alert.buildings?.name}</p>
                            <Badge variant="destructive" className="text-xs">
                              {alert.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-destructive mt-1">
                            Criado: {format(new Date(alert.created_at), "dd/MM HH:mm")}
                          </p>
                        </div>
                      ))}
                      {urgentAlerts.length > 2 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{urgentAlerts.length - 2} alertas adicionais
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                      <p className="text-sm text-muted-foreground">Nenhum alerta urgente</p>
                    </div>
                  )}
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
                  {performanceLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ) : performanceMetrics && performanceMetrics.totalAssistances > 0 ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Tempo médio resposta</span>
                        <span className="text-sm font-medium text-success">
                          {performanceMetrics.averageResponseTime.toFixed(1)} horas
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Taxa conclusão</span>
                        <span className="text-sm font-medium text-success">
                          {performanceMetrics.completionRate}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total processadas</span>
                        <span className="text-sm font-medium text-success">
                          {performanceMetrics.totalAssistances}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                      <p className="text-sm text-muted-foreground">Sem dados suficientes</p>
                      <p className="text-xs text-muted-foreground">
                        Crie assistências para ver métricas
                      </p>
                    </div>
                  )}
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
                  {schedulesLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : upcomingSchedules && upcomingSchedules.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingSchedules.slice(0, 3).map((schedule) => (
                        <div key={schedule.id} className="p-3 bg-background/50 rounded-lg">
                          <h4 className="text-sm font-medium">{schedule.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">
                              {schedule.suppliers?.name}
                            </p>
                            <span className="text-xs text-primary">
                              {format(new Date(schedule.scheduled_start_date!), "dd/MM HH:mm")}
                            </span>
                          </div>
                        </div>
                      ))}
                      {upcomingSchedules.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{upcomingSchedules.length - 3} agendamentos adicionais
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                      <p className="text-sm text-muted-foreground">Nenhum agendamento</p>
                      <p className="text-xs text-muted-foreground">
                        Agende assistências para ver aqui
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="monitoring">
          <SystemMonitor />
        </TabsContent>
      </Tabs>
    </div>
  )
}