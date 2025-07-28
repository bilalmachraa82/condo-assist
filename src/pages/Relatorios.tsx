import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { useAssistanceStats } from "@/hooks/useAssistances";
import { useBuildingStats } from "@/hooks/useBuildings";
import { useSupplierStats } from "@/hooks/useSuppliers";
import { Skeleton } from "@/components/ui/skeleton";
import { FileBarChart, Building2, Users, Wrench } from "lucide-react";


export default function Relatorios() {
  const { data: assistanceStats, isLoading: assistanceLoading } = useAssistanceStats();
  const { data: buildingStats, isLoading: buildingLoading } = useBuildingStats();
  const { data: supplierStats, isLoading: supplierLoading } = useSupplierStats();

  const assistanceStatusData = assistanceStats ? [
    { name: 'Pendentes', value: assistanceStats.pending, color: '#f59e0b' },
    { name: 'Em Progresso', value: assistanceStats.in_progress, color: '#3b82f6' },
    { name: 'Concluídas', value: assistanceStats.completed, color: '#10b981' },
    { name: 'Canceladas', value: assistanceStats.cancelled, color: '#ef4444' },
  ] : [];

  const monthlyData = [
    { month: 'Jan', assistencias: 12, concluidas: 8 },
    { month: 'Fev', assistencias: 19, concluidas: 15 },
    { month: 'Mar', assistencias: 15, concluidas: 12 },
    { month: 'Abr', assistencias: 22, concluidas: 18 },
    { month: 'Mai', assistencias: 18, concluidas: 14 },
    { month: 'Jun', assistencias: 25, concluidas: 20 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground">
          Análise detalhada do desempenho e estatísticas do sistema
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assistências</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {assistanceLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{assistanceStats?.total || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Edifícios</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {buildingLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{buildingStats?.total || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fornecedores Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {supplierLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{supplierStats?.active || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <FileBarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {assistanceLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {assistanceStats?.total 
                  ? Math.round((assistanceStats.completed / assistanceStats.total) * 100)
                  : 0}%
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>Estado atual das assistências</CardDescription>
          </CardHeader>
          <CardContent>
            {assistanceLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={assistanceStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {assistanceStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Tendência Mensal</CardTitle>
            <CardDescription>Assistências criadas vs concluídas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="assistencias" stroke="hsl(var(--primary))" name="Criadas" />
                <Line type="monotone" dataKey="concluidas" stroke="hsl(var(--chart-2))" name="Concluídas" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance by Building Type */}
      <Card>
        <CardHeader>
          <CardTitle>Desempenho por Categoria</CardTitle>
          <CardDescription>Número de assistências por tipo de intervenção</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={[
                { categoria: 'Canalização', assistencias: 45, concluidas: 38 },
                { categoria: 'Eletricidade', assistencias: 32, concluidas: 28 },
                { categoria: 'Elevadores', assistencias: 28, concluidas: 25 },
                { categoria: 'Limpeza', assistencias: 22, concluidas: 20 },
                { categoria: 'Serralharia', assistencias: 18, concluidas: 15 },
                { categoria: 'Pinturas', assistencias: 15, concluidas: 12 },
                { categoria: 'Jardinagem', assistencias: 12, concluidas: 11 },
                { categoria: 'Segurança', assistencias: 8, concluidas: 7 },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="categoria" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="assistencias" fill="hsl(var(--primary))" name="Total" />
              <Bar dataKey="concluidas" fill="hsl(var(--chart-2))" name="Concluídas" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}