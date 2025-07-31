import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format, startOfMonth, endOfMonth, subMonths } from "date-fns";

export interface ExecutiveKPIs {
  totalAssistances: number;
  completedAssistances: number;
  completionRate: number;
  averageResponseTime: number;
  averageCompletionTime: number;
  activeSuppliers: number;
  totalCost: number;
  avgCostPerAssistance: number;
}

export interface SupplierPerformance {
  supplierId: string;
  supplierName: string;
  totalAssistances: number;
  completedAssistances: number;
  completionRate: number;
  averageResponseTime: number;
  averageRating: number;
  totalCost: number;
  onTimeCompletions: number;
  onTimeRate: number;
}

export interface TrendData {
  period: string;
  assistances: number;
  completed: number;
  cost: number;
  avgResponseTime: number;
}

export interface InterventionAnalytics {
  interventionType: string;
  count: number;
  avgCost: number;
  avgDuration: number;
  completionRate: number;
}

export interface BuildingAnalytics {
  buildingName: string;
  buildingCode: string;
  totalAssistances: number;
  totalCost: number;
  avgCostPerAssistance: number;
  mostCommonIssue: string;
}

export interface AlertData {
  type: 'overdue' | 'high_cost' | 'low_performance' | 'demand_spike';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  data?: any;
}

export const useExecutiveKPIs = (period: number = 30) => {
  return useQuery({
    queryKey: ["executive-kpis", period],
    queryFn: async () => {
      const startDate = subDays(new Date(), period).toISOString();
      
      // Get assistances for the period
      const { data: assistances, error: assistancesError } = await supabase
        .from("assistances")
        .select(`
          *,
          suppliers(name),
          buildings(name, code)
        `)
        .gte("created_at", startDate);

      if (assistancesError) throw assistancesError;

      // Get active suppliers count
      const { data: suppliers, error: suppliersError } = await supabase
        .from("suppliers")
        .select("id")
        .eq("is_active", true);

      if (suppliersError) throw suppliersError;

      const totalAssistances = assistances?.length || 0;
      const completedAssistances = assistances?.filter(a => a.status === 'completed').length || 0;
      const completionRate = totalAssistances > 0 ? (completedAssistances / totalAssistances) * 100 : 0;

      // Calculate average response time (in hours)
      const assistancesWithResponse = assistances?.filter(a => 
        a.actual_start_date && a.created_at
      ) || [];
      
      const responseTimes = assistancesWithResponse.map(a => 
        (new Date(a.actual_start_date).getTime() - new Date(a.created_at).getTime()) / (1000 * 60 * 60)
      );
      
      const averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0;

      // Calculate average completion time (in hours)
      const completedWithDates = assistances?.filter(a => 
        a.actual_start_date && a.actual_end_date
      ) || [];
      
      const completionTimes = completedWithDates.map(a => 
        (new Date(a.actual_end_date).getTime() - new Date(a.actual_start_date).getTime()) / (1000 * 60 * 60)
      );
      
      const averageCompletionTime = completionTimes.length > 0 
        ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length 
        : 0;

      // Calculate costs
      const totalCost = assistances?.reduce((sum, a) => sum + (a.final_cost || a.estimated_cost || 0), 0) || 0;
      const avgCostPerAssistance = totalAssistances > 0 ? totalCost / totalAssistances : 0;

      const kpis: ExecutiveKPIs = {
        totalAssistances,
        completedAssistances,
        completionRate: Math.round(completionRate * 10) / 10,
        averageResponseTime: Math.round(averageResponseTime * 10) / 10,
        averageCompletionTime: Math.round(averageCompletionTime * 10) / 10,
        activeSuppliers: suppliers?.length || 0,
        totalCost,
        avgCostPerAssistance: Math.round(avgCostPerAssistance * 100) / 100
      };

      return kpis;
    },
  });
};

export const useSupplierPerformanceAnalytics = (period: number = 90) => {
  return useQuery({
    queryKey: ["supplier-performance", period],
    queryFn: async () => {
      const startDate = subDays(new Date(), period).toISOString();
      
      const { data: assistances, error } = await supabase
        .from("assistances")
        .select(`
          *,
          suppliers(id, name)
        `)
        .gte("created_at", startDate)
        .not("assigned_supplier_id", "is", null);

      if (error) throw error;

      const supplierMap = new Map<string, SupplierPerformance>();

      assistances?.forEach(assistance => {
        const supplierId = assistance.assigned_supplier_id;
        const supplierName = assistance.suppliers?.name || 'Unknown';
        
        if (!supplierId) return;

        if (!supplierMap.has(supplierId)) {
          supplierMap.set(supplierId, {
            supplierId,
            supplierName,
            totalAssistances: 0,
            completedAssistances: 0,
            completionRate: 0,
            averageResponseTime: 0,
            averageRating: 0,
            totalCost: 0,
            onTimeCompletions: 0,
            onTimeRate: 0,
          });
        }

        const performance = supplierMap.get(supplierId)!;
        performance.totalAssistances++;

        if (assistance.status === 'completed') {
          performance.completedAssistances++;
          performance.totalCost += assistance.final_cost || assistance.estimated_cost || 0;
          
          // Check if completed on time
          if (assistance.scheduled_end_date && assistance.actual_end_date) {
            const scheduledEnd = new Date(assistance.scheduled_end_date);
            const actualEnd = new Date(assistance.actual_end_date);
            if (actualEnd <= scheduledEnd) {
              performance.onTimeCompletions++;
            }
          }
        }
      });

      // Calculate rates for each supplier
      const performanceData: SupplierPerformance[] = Array.from(supplierMap.values()).map(perf => ({
        ...perf,
        completionRate: perf.totalAssistances > 0 ? (perf.completedAssistances / perf.totalAssistances) * 100 : 0,
        onTimeRate: perf.completedAssistances > 0 ? (perf.onTimeCompletions / perf.completedAssistances) * 100 : 0,
      }));

      return performanceData.sort((a, b) => b.completionRate - a.completionRate);
    },
  });
};

export const useTrendAnalytics = (months: number = 12) => {
  return useQuery({
    queryKey: ["trend-analytics", months],
    queryFn: async () => {
      const trends: TrendData[] = [];
      
      for (let i = months - 1; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthStart = startOfMonth(monthDate).toISOString();
        const monthEnd = endOfMonth(monthDate).toISOString();
        
        const { data: assistances, error } = await supabase
          .from("assistances")
          .select("*")
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd);

        if (error) throw error;

        const completed = assistances?.filter(a => a.status === 'completed') || [];
        const totalCost = assistances?.reduce((sum, a) => sum + (a.final_cost || a.estimated_cost || 0), 0) || 0;
        
        // Calculate average response time for the month
        const withResponseTime = assistances?.filter(a => a.actual_start_date && a.created_at) || [];
        const avgResponseTime = withResponseTime.length > 0 
          ? withResponseTime.reduce((sum, a) => {
              return sum + (new Date(a.actual_start_date).getTime() - new Date(a.created_at).getTime()) / (1000 * 60 * 60);
            }, 0) / withResponseTime.length
          : 0;

        trends.push({
          period: format(monthDate, "MMM yyyy"),
          assistances: assistances?.length || 0,
          completed: completed.length,
          cost: totalCost,
          avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        });
      }
      
      return trends;
    },
  });
};

export const useInterventionAnalytics = (period: number = 90) => {
  return useQuery({
    queryKey: ["intervention-analytics", period],
    queryFn: async () => {
      const startDate = subDays(new Date(), period).toISOString();
      
      const { data: assistances, error } = await supabase
        .from("assistances")
        .select(`
          *,
          intervention_types(name)
        `)
        .gte("created_at", startDate);

      if (error) throw error;

      const interventionMap = new Map<string, InterventionAnalytics>();

      assistances?.forEach(assistance => {
        const interventionType = assistance.intervention_types?.name || 'Unknown';
        
        if (!interventionMap.has(interventionType)) {
          interventionMap.set(interventionType, {
            interventionType,
            count: 0,
            avgCost: 0,
            avgDuration: 0,
            completionRate: 0,
          });
        }

        const analytics = interventionMap.get(interventionType)!;
        analytics.count++;
      });

      return Array.from(interventionMap.values()).sort((a, b) => b.count - a.count);
    },
  });
};

export const useBuildingAnalytics = (period: number = 90) => {
  return useQuery({
    queryKey: ["building-analytics", period],
    queryFn: async () => {
      const startDate = subDays(new Date(), period).toISOString();
      
      const { data: assistances, error } = await supabase
        .from("assistances")
        .select(`
          *,
          buildings(name, code),
          intervention_types(name)
        `)
        .gte("created_at", startDate);

      if (error) throw error;

      const buildingMap = new Map<string, BuildingAnalytics>();

      assistances?.forEach(assistance => {
        const buildingId = assistance.building_id;
        const buildingName = assistance.buildings?.name || 'Unknown';
        const buildingCode = assistance.buildings?.code || 'N/A';
        
        if (!buildingMap.has(buildingId)) {
          buildingMap.set(buildingId, {
            buildingName,
            buildingCode,
            totalAssistances: 0,
            totalCost: 0,
            avgCostPerAssistance: 0,
            mostCommonIssue: '',
          });
        }

        const analytics = buildingMap.get(buildingId)!;
        analytics.totalAssistances++;
        analytics.totalCost += assistance.final_cost || assistance.estimated_cost || 0;
      });

      // Calculate averages
      const buildingData: BuildingAnalytics[] = Array.from(buildingMap.values()).map(building => ({
        ...building,
        avgCostPerAssistance: building.totalAssistances > 0 ? building.totalCost / building.totalAssistances : 0,
      }));

      return buildingData.sort((a, b) => b.totalAssistances - a.totalAssistances);
    },
  });
};

export const useIntelligentAlerts = () => {
  return useQuery({
    queryKey: ["intelligent-alerts"],
    queryFn: async () => {
      const alerts: AlertData[] = [];
      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30).toISOString();
      
      // Get recent assistances
      const { data: assistances, error } = await supabase
        .from("assistances")
        .select(`
          *,
          suppliers(name),
          buildings(name)
        `)
        .gte("created_at", thirtyDaysAgo);

      if (error) throw error;

      // Check for overdue assistances
      const overdue = assistances?.filter(a => 
        a.scheduled_end_date && 
        new Date(a.scheduled_end_date) < now && 
        a.status !== 'completed'
      ) || [];

      if (overdue.length > 0) {
        alerts.push({
          type: 'overdue',
          title: `${overdue.length} Assistências em Atraso`,
          description: `Existem ${overdue.length} assistências que ultrapassaram o prazo previsto`,
          severity: overdue.length > 5 ? 'critical' : 'high',
          data: overdue.length
        });
      }

      // Check for high-cost assistances
      const highCost = assistances?.filter(a => 
        (a.final_cost || a.estimated_cost || 0) > 5000
      ) || [];

      if (highCost.length > 0) {
        alerts.push({
          type: 'high_cost',
          title: `${highCost.length} Assistências de Alto Custo`,
          description: `Assistências com custo superior a €5.000`,
          severity: 'medium',
          data: highCost.length
        });
      }

      // Check for demand spikes (compare with previous month)
      const thisMonthCount = assistances?.length || 0;
      const lastMonthStart = subDays(subDays(now, 30), 30).toISOString();
      const lastMonthEnd = thirtyDaysAgo;
      
      const { data: lastMonthAssistances } = await supabase
        .from("assistances")
        .select("id")
        .gte("created_at", lastMonthStart)
        .lt("created_at", lastMonthEnd);

      const lastMonthCount = lastMonthAssistances?.length || 0;
      const increasePercent = lastMonthCount > 0 ? ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100 : 0;

      if (increasePercent > 50) {
        alerts.push({
          type: 'demand_spike',
          title: 'Pico de Demanda Detectado',
          description: `Aumento de ${Math.round(increasePercent)}% nas assistências em relação ao mês anterior`,
          severity: 'medium',
          data: Math.round(increasePercent)
        });
      }

      return alerts.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
};