import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { secureLogger } from "@/utils/secureLogger";

interface NotificationData {
  id: string;
  type: "assistance_created" | "assistance_updated" | "supplier_response" | "quotation_submitted";
  title: string;
  message: string;
  assistance_id?: string;
  supplier_id?: string;
  created_at: string;
  read: boolean;
}

interface UseRealtimeNotificationsReturn {
  notifications: NotificationData[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

export const useRealtimeNotifications = (): UseRealtimeNotificationsReturn => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const queryClient = useQueryClient();

  const addNotification = useCallback((notification: Omit<NotificationData, "id" | "created_at" | "read">) => {
    const newNotification: NotificationData = {
      ...notification,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      read: false,
    };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep max 50 notifications
    
    // Show toast notification
    toast(notification.title, {
      description: notification.message,
      duration: 5000,
    });
    
    secureLogger.debug('New notification added', { type: notification.type });
  }, []);

  useEffect(() => {
    if (!user) return;

    secureLogger.debug('Setting up real-time notifications', { userId: user.id });

    // Subscribe to assistance changes
    const assistanceChannel = supabase
      .channel("assistance-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "assistances",
        },
        (payload) => {
          secureLogger.debug('New assistance created', { id: payload.new.id });
          addNotification({
            type: "assistance_created",
            title: "Nova Assistência Criada",
            message: `Assistência "${payload.new.title}" foi criada`,
            assistance_id: payload.new.id,
          });
          // Keep lists and stats fresh
          queryClient.invalidateQueries({ queryKey: ["assistances"] });
          queryClient.invalidateQueries({ queryKey: ["assistance-stats"] });
          queryClient.invalidateQueries({ queryKey: ["assistance", payload.new.id] });
          queryClient.invalidateQueries({ queryKey: ["supplier-assistances"] });
          queryClient.refetchQueries({ queryKey: ["assistances"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "assistances",
        },
        (payload) => {
          const oldStatus = payload.old.status;
          const newStatus = payload.new.status;
          
          if (oldStatus !== newStatus) {
            secureLogger.debug('Assistance status updated', { id: payload.new.id, oldStatus, newStatus });
            addNotification({
              type: "assistance_updated",
              title: "Status de Assistência Atualizado",
              message: `Assistência "${payload.new.title}" mudou para ${newStatus}`,
              assistance_id: payload.new.id,
            });
          }
          // Invalidate and refetch affected queries to reflect changes immediately
          queryClient.invalidateQueries({ queryKey: ["assistances"] });
          queryClient.invalidateQueries({ queryKey: ["assistance-stats"] });
          queryClient.invalidateQueries({ queryKey: ["assistance", payload.new.id] });
          queryClient.invalidateQueries({ queryKey: ["supplier-assistances"] });
          queryClient.refetchQueries({ queryKey: ["assistances"] });
        }
      )
      .subscribe();

    // Subscribe to supplier responses
    const responseChannel = supabase
      .channel("response-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "supplier_responses",
        },
        (payload) => {
          secureLogger.debug('New supplier response', { assistanceId: payload.new.assistance_id });
          const responseType = payload.new.response_type;
          addNotification({
            type: "supplier_response",
            title: "Resposta de Fornecedor",
            message: `Fornecedor ${responseType === "accepted" ? "aceitou" : "recusou"} a assistência`,
            assistance_id: payload.new.assistance_id,
            supplier_id: payload.new.supplier_id,
          });
        }
      )
      .subscribe();

    // Subscribe to quotation submissions
    const quotationChannel = supabase
      .channel("quotation-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "quotations",
        },
        (payload) => {
          secureLogger.debug('New quotation submitted', { assistanceId: payload.new.assistance_id });
          addNotification({
            type: "quotation_submitted",
            title: "Novo Orçamento Submetido",
            message: `Orçamento de €${payload.new.amount} foi submetido`,
            assistance_id: payload.new.assistance_id,
            supplier_id: payload.new.supplier_id,
          });
        }
      )
      .subscribe();

    return () => {
      secureLogger.debug('Cleaning up real-time subscriptions');
      supabase.removeChannel(assistanceChannel);
      supabase.removeChannel(responseChannel);
      supabase.removeChannel(quotationChannel);
    };
  }, [user, addNotification]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
};