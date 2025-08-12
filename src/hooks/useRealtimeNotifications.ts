import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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
    
    console.log("🔔 New notification:", newNotification);
  }, []);

  useEffect(() => {
    if (!user) return;

    console.log("🔌 Setting up real-time notifications for user:", user.id);

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
          console.log("📝 New assistance created:", payload.new);
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
            console.log("📋 Assistance status updated:", { old: oldStatus, new: newStatus });
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
          console.log("💬 New supplier response:", payload.new);
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
          console.log("💰 New quotation submitted:", payload.new);
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
      console.log("🔌 Cleaning up real-time subscriptions");
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