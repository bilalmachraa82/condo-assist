import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart 
} from "recharts";
import { 
  TrendingUp, TrendingDown, Users, Clock, DollarSign, AlertTriangle,
  FileDown, Mail, Calendar, Building, Target, Activity
} from "lucide-react";
import {
  useExecutiveKPIs,
  useSupplierPerformanceAnalytics,
  useTrendAnalytics,
  useInterventionAnalytics,
  useBuildingAnalytics,
  useIntelligentAlerts
} from "@/hooks/useAnalytics";
import { formatCurrency } from "@/lib/utils";
import { PDFExportButton } from "@/components/analytics/PDFExportButton";
import { ScheduledReports } from "@/components/analytics/ScheduledReports";

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658'];

export default function Analytics() {
  const [period, setPeriod] = useState<number>(30);
  const [performancePeriod, setPerformancePeriod] = useState<number>(90);
  
  const { data: kpis, isLoading: kpisLoading } = useExecutiveKPIs(period);
  const { data: supplierPerformance, isLoading: supplierLoading } = useSupplierPerformanceAnalytics(performancePeriod);
  const { data: trends, isLoading: trendsLoading } = useTrendAnalytics(12);
  const { data: interventions, isLoading: interventionsLoading } = useInterventionAnalytics(period);
  const { data: buildings, isLoading: buildingsLoading } = useBuildingAnalytics(period);
  const { data: alerts, isLoading: alertsLoading } = useIntelligentAlerts();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Análise e Relatórios</h1>
          <p className="text-muted-foreground">
            Análise avançada de performance e relatórios executivos
          </p>
        </div>
        <div className="flex gap-2">
          <PDFExportButton />
        </div>
      </div>

      {/* Intelligent Alerts */}
      {!alertsLoading && alerts && alerts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Alertas Inteligentes
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {alerts.map((alert, index) => (
              <Alert key={index} className="border-l-4 border-l-destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="flex items-center gap-2">
                  {alert.title}
                  <Badge variant={getSeverityColor(alert.severity)} className="text-xs">
                    {alert.severity}
                  </Badge>
                </AlertTitle>
                <AlertDescription>{alert.description}</AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="executive" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="executive">Dashboard Executivo</TabsTrigger>
          <TabsTrigger value="performance">Performance Fornecedores</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="operations">Operacional</TabsTrigger>
          <TabsTrigger value="buildings">Edifícios</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>

        {/* Executive Dashboard */}
        <TabsContent value="executive" className="space-y-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-semibold">Dashboard Executivo</h2>
            <Select value={period.toString()} onValueChange={(value) => setPeriod(Number(value))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* KPIs Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpisLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-[120px]" />
                    <Skeleton className="h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-[80px] mb-2" />
                    <Skeleton className="h-3 w-[100px]" />
                  </CardContent>
                </Card>
              ))
            ) : kpis ? (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Assistências</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpis.totalAssistances}</div>
                    <p className="text-xs text-muted-foreground">
                      {kpis.completedAssistances} concluídas
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpis.completionRate}%</div>
                    <p className="text-xs text-muted-foreground">
                      Meta: 85%
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tempo Médio de Resposta</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpis.averageResponseTime}h</div>
                    <p className="text-xs text-muted-foreground">
                      Desde atribuição
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(kpis.totalCost)}</div>
                    <p className="text-xs text-muted-foreground">
                      Média: {formatCurrency(kpis.avgCostPerAssistance)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Fornecedores Ativos</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpis.activeSuppliers}</div>
                    <p className="text-xs text-muted-foreground">
                      Disponíveis para atribuição
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tempo Médio de Conclusão</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpis.averageCompletionTime}h</div>
                    <p className="text-xs text-muted-foreground">
                      Duração da execução
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        </TabsContent>

        {/* Supplier Performance */}
        <TabsContent value="performance" className="space-y-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-semibold">Performance dos Fornecedores</h2>
            <Select value={performancePeriod.toString()} onValueChange={(value) => setPerformancePeriod(Number(value))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="180">Últimos 6 meses</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Ranking de Performance</CardTitle>
              <CardDescription>Fornecedores ordenados por taxa de conclusão</CardDescription>
            </CardHeader>
            <CardContent>
              {supplierLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : supplierPerformance && supplierPerformance.length > 0 ? (
                <div className="space-y-4">
                  {supplierPerformance.map((supplier, index) => (
                    <div key={supplier.supplierId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{supplier.supplierName}</p>
                          <p className="text-sm text-muted-foreground">
                            {supplier.totalAssistances} assistências
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{supplier.completionRate.toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground">Taxa de conclusão</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{supplier.onTimeRate.toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground">No prazo</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(supplier.totalCost)}</p>
                        <p className="text-sm text-muted-foreground">Custo total</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum dado de performance disponível
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends */}
        <TabsContent value="trends" className="space-y-6">
          <h2 className="text-2xl font-semibold">Análise de Tendências</h2>
          
          {/* Monthly Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Tendências Mensais</CardTitle>
              <CardDescription>Evolução de assistências e custos ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : trends && trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Area yAxisId="left" type="monotone" dataKey="assistances" stackId="1" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} />
                    <Area yAxisId="left" type="monotone" dataKey="completed" stackId="1" stroke={CHART_COLORS[1]} fill={CHART_COLORS[1]} />
                    <Line yAxisId="right" type="monotone" dataKey="cost" stroke={CHART_COLORS[2]} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">Sem dados disponíveis</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations */}
        <TabsContent value="operations" className="space-y-6">
          <h2 className="text-2xl font-semibold">Métricas Operacionais</h2>
          
          {/* Intervention Types Chart */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Assistências por Tipo de Intervenção</CardTitle>
                <CardDescription>Distribuição dos tipos mais comuns</CardDescription>
              </CardHeader>
              <CardContent>
                {interventionsLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : interventions && interventions.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={interventions}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({interventionType, count}) => `${interventionType}: ${count}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {interventions.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Sem dados disponíveis</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Buildings */}
        <TabsContent value="buildings" className="space-y-6">
          <h2 className="text-2xl font-semibold">Análise por Edifícios</h2>
          
          <Card>
            <CardHeader>
              <CardTitle>Performance por Edifício</CardTitle>
              <CardDescription>Assistências e custos por edifício</CardDescription>
            </CardHeader>
            <CardContent>
              {buildingsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : buildings && buildings.length > 0 ? (
                <div className="space-y-4">
                  {buildings.map((building) => (
                    <div key={building.buildingCode} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Building className="w-8 h-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{building.buildingName}</p>
                          <p className="text-sm text-muted-foreground">Código: {building.buildingCode}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{building.totalAssistances}</p>
                        <p className="text-sm text-muted-foreground">Assistências</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(building.totalCost)}</p>
                        <p className="text-sm text-muted-foreground">Custo total</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(building.avgCostPerAssistance)}</p>
                        <p className="text-sm text-muted-foreground">Custo médio</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum dado disponível
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Reports */}
        <TabsContent value="reports" className="space-y-6">
          <ScheduledReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}