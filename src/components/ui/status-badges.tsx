
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { STATUS_TRANSLATIONS, PRIORITY_TRANSLATIONS } from '@/utils/constants';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: keyof typeof STATUS_TRANSLATIONS;
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

  return (
    <Badge 
      variant={getStatusVariant(status)} 
      className={cn('text-xs', className)}
    >
      {STATUS_TRANSLATIONS[status] || status}
    </Badge>
  );
};

interface PriorityBadgeProps {
  priority: keyof typeof PRIORITY_TRANSLATIONS;
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
      {PRIORITY_TRANSLATIONS[priority] || priority}
    </Badge>
  );
};
