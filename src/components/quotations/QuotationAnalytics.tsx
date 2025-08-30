import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, TrendingDown, Euro, Clock, CheckCircle, XCircle, Users, Building, Calendar, FileText } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface QuotationAnalytics {
  totalQuotations: number;
  pendingQuotations: number;
  approvedQuotations: number;
  rejectedQuotations: number;
  totalValue: number;
  averageValue: number;
  averageResponseTime: number;
  topSuppliers: Array<{ name: string; count: number; totalValue: number; approvalRate: number }>;
  dailyQuotations: Array<{ date: string; quotations: number; value: number }>;
  monthlyTrends: Array<{ month: string; quotations: number; approved: number; rejected: number; value: number }>;
  approvalRates: Array<{ supplier: string; rate: number; total: number }>;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'];

export default function QuotationAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["quotation-analytics"],
    queryFn: async (): Promise<QuotationAnalytics> => {
      console.log("Fetching quotation analytics...");
      
      // Fetch all quotations with suppliers and assistances
      const { data: quotations, error } = await supabase
        .from("quotations")
        .select(`
          *,
          suppliers (name),
          assistances (title, created_at)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching quotations for analytics:", error);
        throw error;
      }

      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30);
      
      // Basic statistics
      const totalQuotations = quotations.length;
      const pendingQuotations = quotations.filter(q => q.status === 'pending').length;
      const approvedQuotations = quotations.filter(q => q.status === 'approved').length;
      const rejectedQuotations = quotations.filter(q => q.status === 'rejected').length;
      const totalValue = quotations.reduce((sum, q) => sum + Number(q.amount), 0);
      const averageValue = totalQuotations > 0 ? totalValue / totalQuotations : 0;

      // Average response time (for approved/rejected quotations)
      const processedQuotations = quotations.filter(q => q.approved_at && q.status !== 'pending');
      const averageResponseTime = processedQuotations.length > 0 
        ? processedQuotations.reduce((sum, q) => {
            const responseTime = new Date(q.approved_at!).getTime() - new Date(q.created_at).getTime();
            return sum + responseTime;
          }, 0) / processedQuotations.length / (1000 * 60 * 60 * 24) // Convert to days
        : 0;

      // Top suppliers analysis
      const supplierStats = quotations.reduce((acc, q) => {
        const supplierName = q.suppliers?.name || 'Unknown';
        if (!acc[supplierName]) {
          acc[supplierName] = { count: 0, totalValue: 0, approved: 0, total: 0 };
        }
        acc[supplierName].count++;
        acc[supplierName].totalValue += Number(q.amount);
        acc[supplierName].total++;
        if (q.status === 'approved') {
          acc[supplierName].approved++;
        }
        return acc;
      }, {} as Record<string, { count: number; totalValue: number; approved: number; total: number }>);

      const topSuppliers = Object.entries(supplierStats)
        .map(([name, stats]) => ({
          name,
          count: stats.count,
          totalValue: stats.totalValue,
          approvalRate: stats.total > 0 ? (stats.approved / stats.total) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Daily quotations for the last 30 days
      const dailyData = eachDayOfInterval({ start: thirtyDaysAgo, end: now }).map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayQuotations = quotations.filter(q => 
          format(new Date(q.created_at), 'yyyy-MM-dd') === dateStr
        );
        return {
          date: format(date, 'dd/MM', { locale: ptBR }),
          quotations: dayQuotations.length,
          value: dayQuotations.reduce((sum, q) => sum + Number(q.amount), 0)
        };
      });

      // Monthly trends for the last 6 months
      const monthlyTrends = Array.from({ length: 6 }, (_, i) => {
        const date = subDays(now, i * 30);
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        
        const monthQuotations = quotations.filter(q => {
          const qDate = new Date(q.created_at);
          return qDate >= monthStart && qDate <= monthEnd;
        });

        return {
          month: format(date, 'MMM yyyy', { locale: ptBR }),
          quotations: monthQuotations.length,
          approved: monthQuotations.filter(q => q.status === 'approved').length,
          rejected: monthQuotations.filter(q => q.status === 'rejected').length,
          value: monthQuotations.reduce((sum, q) => sum + Number(q.amount), 0)
        };
      }).reverse();

      // Approval rates by supplier
      const approvalRates = Object.entries(supplierStats)
        .map(([supplier, stats]) => ({
          supplier,
          rate: stats.total > 0 ? (stats.approved / stats.total) * 100 : 0,
          total: stats.total
        }))
        .filter(item => item.total >= 3) // Only suppliers with at least 3 quotations
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 10);

      return {
        totalQuotations,
        pendingQuotations,
        approvedQuotations,
        rejectedQuotations,
        totalValue,
        averageValue,
        averageResponseTime,
        topSuppliers,
        dailyQuotations: dailyData,
        monthlyTrends,
        approvalRates
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Erro ao carregar analytics</p>
        </CardContent>
      </Card>
    );
  }

  const statusData = [
    { name: 'Pendentes', value: analytics.pendingQuotations, color: '#ffc658' },
    { name: 'Aprovados', value: analytics.approvedQuotations, color: '#82ca9d' },
    { name: 'Rejeitados', value: analytics.rejectedQuotations, color: '#ff7300' }
  ];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Orçamentos
              </CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold">{analytics.totalQuotations}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.pendingQuotations} pendentes
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Taxa de Aprovação
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold">
              {analytics.totalQuotations > 0 
                ? Math.round((analytics.approvedQuotations / analytics.totalQuotations) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.approvedQuotations} de {analytics.totalQuotations}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-info">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Valor Total
              </CardTitle>
              <Euro className="h-4 w-4 text-info" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold">
              €{analytics.totalValue.toLocaleString('pt-PT', { 
                minimumFractionDigits: 0,
                maximumFractionDigits: 0 
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Média: €{Math.round(analytics.averageValue).toLocaleString('pt-PT')}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tempo Médio Resposta
              </CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold">
              {Math.round(analytics.averageResponseTime)} dias
            </div>
            <p className="text-xs text-muted-foreground">
              Para decisão final
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Detailed Analytics */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Distribuição por Estado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Daily Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Atividade Diária (30 dias)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.dailyQuotations}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any, name: string) => [
                          name === 'quotations' ? `${value} orçamentos` : `€${Number(value).toLocaleString('pt-PT')}`,
                          name === 'quotations' ? 'Orçamentos' : 'Valor'
                        ]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="quotations" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        dot={{ fill: '#8884d8' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Tendências Mensais
              </CardTitle>
              <CardDescription>
                Evolução dos orçamentos nos últimos 6 meses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="quotations" fill="#8884d8" name="Total" />
                    <Bar dataKey="approved" fill="#82ca9d" name="Aprovados" />
                    <Bar dataKey="rejected" fill="#ff7300" name="Rejeitados" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Suppliers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Top Fornecedores
                </CardTitle>
                <CardDescription>
                  Fornecedores com mais orçamentos submetidos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.topSuppliers.map((supplier, index) => (
                    <div key={supplier.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{supplier.name}</span>
                        <div className="text-right text-sm">
                          <div>{supplier.count} orçamentos</div>
                          <div className="text-muted-foreground">
                            €{supplier.totalValue.toLocaleString('pt-PT')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={(supplier.count / analytics.topSuppliers[0]?.count) * 100} 
                          className="flex-1" 
                        />
                        <Badge variant={supplier.approvalRate >= 70 ? "default" : supplier.approvalRate >= 50 ? "secondary" : "destructive"}>
                          {Math.round(supplier.approvalRate)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Approval Rates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Taxa de Aprovação por Fornecedor
                </CardTitle>
                <CardDescription>
                  Fornecedores com pelo menos 3 orçamentos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.approvalRates.map((item, index) => (
                    <div key={item.supplier} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.supplier}</span>
                        <div className="text-right text-sm">
                          <div>{Math.round(item.rate)}%</div>
                          <div className="text-muted-foreground">
                            {item.total} orçamentos
                          </div>
                        </div>
                      </div>
                      <Progress value={item.rate} className="flex-1" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">
                  Performance Geral
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-primary">
                    {analytics.totalQuotations > 0 
                      ? Math.round((analytics.approvedQuotations / analytics.totalQuotations) * 100)
                      : 0}%
                  </div>
                  <p className="text-sm text-muted-foreground">Taxa de Aprovação</p>
                </div>
                <Progress 
                  value={analytics.totalQuotations > 0 
                    ? (analytics.approvedQuotations / analytics.totalQuotations) * 100
                    : 0} 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-center">
                  Tempo de Resposta
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-info">
                    {Math.round(analytics.averageResponseTime)}
                  </div>
                  <p className="text-sm text-muted-foreground">Dias em Média</p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  {analytics.averageResponseTime <= 3 ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-sm">
                    {analytics.averageResponseTime <= 3 ? 'Excelente' : 
                     analytics.averageResponseTime <= 7 ? 'Bom' : 'Pode melhorar'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-center">
                  Valor Médio
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-success">
                    €{Math.round(analytics.averageValue).toLocaleString('pt-PT')}
                  </div>
                  <p className="text-sm text-muted-foreground">Por Orçamento</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Total: €{analytics.totalValue.toLocaleString('pt-PT')}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}