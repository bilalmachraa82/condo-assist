import { useMemo } from 'react';
import { useRealtimeNotifications } from './useRealtimeNotifications';
import { useUrgentAlerts } from './useUrgentAlerts';
import { useUpcomingSchedules } from './useUpcomingSchedules';

export function useNotificationBadge() {
  const { notifications } = useRealtimeNotifications();
  const { data: urgentAlerts = [] } = useUrgentAlerts();
  const { data: upcomingSchedules = [] } = useUpcomingSchedules();

  const { counts, totalCount } = useMemo(() => {
    const assistanceCount = notifications.filter(n => 
      n.type.includes('assistance') && !n.read
    ).length;

    const quotationCount = notifications.filter(n => 
      n.type.includes('quotation') && !n.read
    ).length;

    const urgentCount = urgentAlerts.length;
    const scheduleCount = upcomingSchedules.length;

    const counts = {
      assistance: assistanceCount,
      quotation: quotationCount,
      urgent: urgentCount,
      schedule: scheduleCount,
    } as const;

    const totalCount = assistanceCount + quotationCount + urgentCount + scheduleCount;
    return { counts, totalCount };
  }, [notifications, urgentAlerts, upcomingSchedules]);

  const getBadgeForRoute = (route: string): number => {
    switch (route) {
      case '/assistencias':
        return counts.assistance + counts.urgent;
      case '/orcamentos':
        return counts.quotation;
      case '/':
        return counts.urgent + counts.schedule;
      default:
        return 0;
    }
  };

  return {
    totalCount,
    counts,
    getBadgeForRoute,
    hasNotifications: totalCount > 0,
  };
}
