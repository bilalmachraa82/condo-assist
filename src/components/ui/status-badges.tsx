
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { STATUS_TRANSLATIONS, PRIORITY_TRANSLATIONS } from '@/utils/constants';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default'; // green
      case 'in_progress':
      case 'scheduled':
        return 'secondary'; // blue
      case 'pending':
      case 'awaiting_quotation':
      case 'quotation_received':
      case 'awaiting_validation':
      case 'sent_to_suppliers':
      case 'quotes_received':
      case 'quote_approved':
      case 'awaiting_approval':
      case 'submitted':
      case 'expired':
      case 'quotation_approved':
      case 'quotation_rejected':
        return 'outline'; // yellow/warning
      case 'accepted':
      case 'approved':
        return 'default'; // green
      case 'cancelled':
      case 'rejected':
        return 'destructive'; // red
      default:
        return 'secondary';
    }
  };

  const getStatusColors = (status: string) => {
    switch (status) {
      case 'completed':
      case 'accepted':
      case 'approved':
        return 'bg-success/20 text-success border-success/40 font-semibold shadow-sm';
      case 'in_progress':
      case 'scheduled':
        return 'bg-primary/20 text-primary border-primary/40 font-semibold shadow-sm';
      case 'pending':
      case 'awaiting_quotation':
      case 'quotation_received':
      case 'awaiting_validation':
      case 'sent_to_suppliers':
      case 'quotes_received':
      case 'quote_approved':
      case 'awaiting_approval':
      case 'submitted': 
        return 'bg-warning/20 text-warning border-warning/40 font-semibold shadow-sm';
      case 'expired':
        return 'bg-orange-100 text-orange-700 border-orange-300 font-semibold shadow-sm';
      case 'quotation_approved':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300 font-semibold shadow-sm';
      case 'quotation_rejected':
      case 'cancelled':
      case 'rejected':
        return 'bg-destructive/20 text-destructive border-destructive/40 font-semibold shadow-sm';
      default:
        return 'bg-accent/20 text-accent border-accent/40 font-semibold shadow-sm';
    }
  };

  return (
    <Badge 
      variant={getStatusVariant(status)} 
      className={cn('text-xs px-3 py-1', getStatusColors(status), className)}
    >
      {STATUS_TRANSLATIONS[status as keyof typeof STATUS_TRANSLATIONS] || status}
    </Badge>
  );
};

interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, className }) => {
  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'urgent':
        return 'secondary';
      case 'normal':
        return 'outline';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'urgent':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'normal':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return '';
    }
  };

  return (
    <Badge 
      variant={getPriorityVariant(priority)}
      className={cn(
        'text-xs',
        getPriorityColor(priority),
        className
      )}
    >
      {PRIORITY_TRANSLATIONS[priority as keyof typeof PRIORITY_TRANSLATIONS] || priority}
    </Badge>
  );
};
