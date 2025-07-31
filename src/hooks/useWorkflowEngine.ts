import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WorkflowRule {
  id: string;
  name: string;
  trigger: 'time_based' | 'status_change' | 'priority_change';
  condition: string;
  action: 'escalate' | 'auto_approve' | 'assign_supplier' | 'send_notification';
  parameters: Record<string, any>;
  is_active: boolean;
}

export interface WorkflowState {
  assistance_id: string;
  current_stage: string;
  sla_deadline: string;
  escalation_level: number;
  auto_actions_taken: string[];
  last_action_at: string;
}

export interface SLAMetrics {
  total_assistances: number;
  within_sla: number;
  breached_sla: number;
  average_response_time: number;
  critical_overdue: number;
}

export function useWorkflowEngine() {
  const [workflows, setWorkflows] = useState<WorkflowState[]>([]);
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [slaMetrics, setSlaMetrics] = useState<SLAMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch workflow states
  const fetchWorkflows = useCallback(async () => {
    try {
      const { data: assistances, error } = await supabase
        .from('assistances')
        .select(`
          id,
          title,
          status,
          priority,
          created_at,
          response_deadline,
          assigned_supplier_id,
          suppliers (name)
        `)
        .neq('status', 'completed');

      if (error) throw error;

      const workflowStates = assistances?.map(assistance => ({
        assistance_id: assistance.id,
        current_stage: assistance.status,
        sla_deadline: assistance.response_deadline || '',
        escalation_level: calculateEscalationLevel(assistance),
        auto_actions_taken: [],
        last_action_at: assistance.created_at
      })) || [];

      setWorkflows(workflowStates);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar workflows",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Calculate escalation level based on time and priority
  const calculateEscalationLevel = (assistance: any): number => {
    if (!assistance.response_deadline) return 0;
    
    const deadline = new Date(assistance.response_deadline);
    const now = new Date();
    const hoursOverdue = Math.max(0, (now.getTime() - deadline.getTime()) / (1000 * 60 * 60));
    
    if (assistance.priority === 'critical' && hoursOverdue > 2) return 3;
    if (assistance.priority === 'high' && hoursOverdue > 6) return 2;
    if (assistance.priority === 'medium' && hoursOverdue > 24) return 1;
    
    return 0;
  };

  // Calculate SLA metrics
  const calculateSLAMetrics = useCallback(async () => {
    try {
      const { data: assistances, error } = await supabase
        .from('assistances')
        .select('id, created_at, response_deadline, status, priority')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const total = assistances?.length || 0;
      let withinSLA = 0;
      let breachedSLA = 0;
      let criticalOverdue = 0;
      const responseTimes: number[] = [];

      assistances?.forEach(assistance => {
        if (!assistance.response_deadline) return;

        const deadline = new Date(assistance.response_deadline);
        const now = new Date();
        const isOverdue = now > deadline;

        if (isOverdue) {
          breachedSLA++;
          if (assistance.priority === 'critical') {
            criticalOverdue++;
          }
        } else {
          withinSLA++;
        }

        // Calculate response time for completed assistances
        if (assistance.status === 'completed') {
          const responseTime = deadline.getTime() - new Date(assistance.created_at).getTime();
          responseTimes.push(responseTime / (1000 * 60 * 60)); // in hours
        }
      });

      const averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0;

      setSlaMetrics({
        total_assistances: total,
        within_sla: withinSLA,
        breached_sla: breachedSLA,
        average_response_time: averageResponseTime,
        critical_overdue: criticalOverdue
      });
    } catch (error) {
      console.error('Error calculating SLA metrics:', error);
    }
  }, []);

  // Auto-escalate overdue assistances
  const processAutoEscalation = useCallback(async () => {
    try {
      const { data: overdueAssistances, error } = await supabase
        .from('assistances')
        .select('*')
        .lt('response_deadline', new Date().toISOString())
        .neq('status', 'completed')
        .is('escalated_at', null);

      if (error) throw error;

      for (const assistance of overdueAssistances || []) {
        // Mark as escalated
        await supabase
          .from('assistances')
          .update({ escalated_at: new Date().toISOString() })
          .eq('id', assistance.id);

        // Log escalation
        await supabase
          .from('activity_log')
          .insert({
            assistance_id: assistance.id,
            action: 'auto_escalated',
            details: `Assistência escalada automaticamente por exceder SLA`,
            metadata: {
              escalation_reason: 'sla_breach',
              escalated_by: 'system'
            }
          });

        toast({
          title: "Escalação Automática",
          description: `Assistência "${assistance.title}" foi escalada automaticamente`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error in auto-escalation:', error);
    }
  }, [toast]);

  // Apply workflow rules
  const applyWorkflowRules = useCallback(async () => {
    // Check for auto-approval opportunities
    try {
      const { data: pendingQuotations, error } = await supabase
        .from('quotations')
        .select(`
          *,
          assistances!inner(priority, title)
        `)
        .eq('status', 'pending')
        .lt('amount', 500); // Auto-approve under €500

      if (error) throw error;

      for (const quotation of pendingQuotations || []) {
        if (quotation.assistances.priority !== 'critical') {
          await supabase
            .from('quotations')
            .update({ 
              status: 'approved',
              approved_at: new Date().toISOString(),
              approved_by: 'system'
            })
            .eq('id', quotation.id);

          await supabase
            .from('activity_log')
            .insert({
              assistance_id: quotation.assistance_id,
              action: 'auto_approved',
              details: `Orçamento de €${quotation.amount} aprovado automaticamente`,
              metadata: {
                approval_reason: 'under_threshold',
                amount: quotation.amount
              }
            });

          toast({
            title: "Aprovação Automática",
            description: `Orçamento de €${quotation.amount} aprovado automaticamente`,
          });
        }
      }
    } catch (error) {
      console.error('Error applying workflow rules:', error);
    }
  }, [toast]);

  // Manual escalation
  const escalateAssistance = useCallback(async (assistanceId: string, reason: string) => {
    try {
      await supabase
        .from('assistances')
        .update({ 
          escalated_at: new Date().toISOString(),
          priority: 'critical'
        })
        .eq('id', assistanceId);

      await supabase
        .from('activity_log')
        .insert({
          assistance_id: assistanceId,
          action: 'manual_escalated',
          details: `Assistência escalada manualmente: ${reason}`,
          metadata: {
            escalation_reason: reason,
            escalated_by: 'user'
          }
        });

      toast({
        title: "Assistência Escalada",
        description: "Assistência escalada com sucesso",
      });

      fetchWorkflows();
    } catch (error) {
      console.error('Error escalating assistance:', error);
      toast({
        title: "Erro",
        description: "Erro ao escalar assistência",
        variant: "destructive",
      });
    }
  }, [fetchWorkflows, toast]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchWorkflows(),
        calculateSLAMetrics()
      ]);
      setLoading(false);
    };

    loadData();

    // Set up intervals for automation
    const escalationInterval = setInterval(processAutoEscalation, 5 * 60 * 1000); // Every 5 minutes
    const rulesInterval = setInterval(applyWorkflowRules, 10 * 60 * 1000); // Every 10 minutes

    return () => {
      clearInterval(escalationInterval);
      clearInterval(rulesInterval);
    };
  }, [fetchWorkflows, calculateSLAMetrics, processAutoEscalation, applyWorkflowRules]);

  return {
    workflows,
    rules,
    slaMetrics,
    loading,
    escalateAssistance,
    refetch: fetchWorkflows
  };
}