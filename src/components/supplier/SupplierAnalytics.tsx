import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Star,
  Calendar,
  MapPin,
  Euro,
  Target,
  Award
} from 'lucide-react';

interface SupplierAnalyticsProps {
  supplierId: string;
  assistances: any[];
}

export const SupplierAnalytics: React.FC<SupplierAnalyticsProps> = ({
  supplierId,
  assistances
}) => {
  const supplierAssistances = assistances.filter(a => a.assigned_supplier_id === supplierId);

  const getPerformanceMetrics = () => {
    const total = supplierAssistances.length;
    const completed = supplierAssistances.filter(a => a.status === 'completed').length;
    const inProgress = supplierAssistances.filter(a => a.status === 'in_progress').length;
    const pending = supplierAssistances.filter(a => a.status === 'pending').length;
    
    const onTime = supplierAssistances.filter(a => {
      if (a.status === 'completed' && a.scheduled_end_date && a.actual_end_date) {
        return new Date(a.actual_end_date) <= new Date(a.scheduled_end_date);
      }
      return false;
    }).length;

    const averageCompletionTime = supplierAssistances
      .filter(a => a.status === 'completed' && a.actual_start_date && a.actual_end_date)
      .reduce((acc, a) => {
        const start = new Date(a.actual_start_date);
        const end = new Date(a.actual_end_date);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return acc + hours;
      }, 0) / completed || 0;

    const totalValue = supplierAssistances
      .filter(a => a.final_cost)
      .reduce((acc, a) => acc + parseFloat(a.final_cost), 0);

    return {
      total,
      completed,
      inProgress,
      pending,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      onTimeRate: completed > 0 ? Math.round((onTime / completed) * 100) : 0,
      averageCompletionTime: Math.round(averageCompletionTime * 10) / 10,
      totalValue,
      averageValue: completed > 0 ? Math.round(totalValue / completed) : 0
    };
  };

  const getMonthlyData = () => {
    const monthlyStats = {};
    
    supplierAssistances.forEach(assistance => {
      const month = new Date(assistance.created_at).toLocaleDateString('pt-PT', { 
        year: 'numeric', 
        month: 'short' 
      });
      
      if (!monthlyStats[month]) {
        monthlyStats[month] = { month, total: 0, completed: 0, value: 0 };
      }
      
      monthlyStats[month].total++;
      
      if (assistance.status === 'completed') {
        monthlyStats[month].completed++;
        if (assistance.final_cost) {
          monthlyStats[month].value += parseFloat(assistance.final_cost);
        }
      }
    });

    return Object.values(monthlyStats).slice(-6); // Last 6 months
  };

  const getStatusDistribution = () => {
    const statusCounts = {
      'Concluído': supplierAssistances.filter(a => a.status === 'completed').length,
      'Em Progresso': supplierAssistances.filter(a => a.status === 'in_progress').length,
      'Pendente': supplierAssistances.filter(a => a.status === 'pending').length,
      'Agendado': supplierAssistances.filter(a => a.status === 'scheduled').length,
    };

    return Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({ name: status, value: count }));
  };

  const metrics = getPerformanceMetrics();
  const monthlyData = getMonthlyData();
  const statusData = getStatusDistribution();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="space-y-6">
      {/* Key Performance Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Trabalhos</p>
                <p className="text-2xl font-bold">{metrics.total}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Conclusão</p>
                <p className="text-2xl font-bold">{metrics.completionRate}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pontualidade</p>
                <p className="text-2xl font-bold">{metrics.onTimeRate}%</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">€{metrics.totalValue.toLocaleString()}</p>
              </div>
              <Euro className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Visão Geral de Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Taxa de Conclusão</span>
                <span>{metrics.completionRate}%</span>
              </div>
              <Progress value={metrics.completionRate} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Pontualidade</span>
                <span>{metrics.onTimeRate}%</span>
              </div>
              <Progress value={metrics.onTimeRate} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Eficiência (vs. meta 85%)</span>
                <span>{Math.min(metrics.completionRate, 100)}%</span>
              </div>
              <Progress value={Math.min(metrics.completionRate, 100)} className="h-2" />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{metrics.completed}</p>
              <p className="text-sm text-muted-foreground">Concluídos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{metrics.inProgress}</p>
              <p className="text-sm text-muted-foreground">Em Progresso</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{metrics.averageCompletionTime}h</p>
              <p className="text-sm text-muted-foreground">Tempo Médio</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">€{metrics.averageValue}</p>
              <p className="text-sm text-muted-foreground">Valor Médio</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#8884d8" name="Total" />
                <Bar dataKey="completed" fill="#82ca9d" name="Concluídos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Rating */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Classificação de Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <div>
              <h3 className="text-lg font-semibold">
                {metrics.completionRate >= 90 ? 'Excelente' :
                 metrics.completionRate >= 80 ? 'Muito Bom' :
                 metrics.completionRate >= 70 ? 'Bom' :
                 metrics.completionRate >= 60 ? 'Satisfatório' : 'Necessita Melhoria'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Com base na taxa de conclusão de {metrics.completionRate}%
              </p>
            </div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-6 w-6 ${
                    i < Math.floor(metrics.completionRate / 20) 
                      ? 'text-yellow-400 fill-current' 
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          
          {/* Improvement Suggestions */}
          <div className="mt-4 space-y-2">
            <h4 className="font-medium">Sugestões de Melhoria:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {metrics.onTimeRate < 80 && (
                <li>• Melhorar a gestão de tempo para cumprir prazos</li>
              )}
              {metrics.completionRate < 85 && (
                <li>• Aumentar a taxa de conclusão de trabalhos</li>
              )}
              {metrics.averageCompletionTime > 8 && (
                <li>• Otimizar processos para reduzir tempo de execução</li>
              )}
              {metrics.completionRate >= 90 && metrics.onTimeRate >= 90 && (
                <li>• Excelente trabalho! Continue mantendo estes padrões.</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};