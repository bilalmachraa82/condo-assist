import { useState, useEffect } from 'react';
import { useRealtimeNotifications } from './useRealtimeNotifications';
import { useUrgentAlerts } from './useUrgentAlerts';
import { useUpcomingSchedules } from './useUpcomingSchedules';

export function useNotificationBadge() {
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({
    assistance: 0,
    quotation: 0,
    urgent: 0,
    schedule: 0
  });

  const { notifications } = useRealtimeNotifications();
  const { data: urgentAlerts = [] } = useUrgentAlerts();
  const { data: upcomingSchedules = [] } = useUpcomingSchedules();

  useEffect(() => {
    // Count unread notifications by type
    const assistanceCount = notifications.filter(n => 
      n.type.includes('assistance') && !n.read
    ).length;
    
    const quotationCount = notifications.filter(n => 
      n.type.includes('quotation') && !n.read
    ).length;

    const urgentCount = urgentAlerts.length;
    const scheduleCount = upcomingSchedules.length;

    const newCounts = {
      assistance: assistanceCount,
      quotation: quotationCount,
      urgent: urgentCount,
      schedule: scheduleCount
    };

    setCounts(newCounts);
    setTotalCount(assistanceCount + quotationCount + urgentCount + scheduleCount);
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
    hasNotifications: totalCount > 0
  };
}