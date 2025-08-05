import { useState, useEffect } from "react";
import { Bell, BellRing, Check, Trash2, Users, Circle } from "lucide-react";
// import { useNotifications } from "@/hooks/useNotifications"; // Removed to avoid DB query conflicts
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useUserPresence } from "@/hooks/useUserPresence";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

export default function RealtimeNotificationCenter() {
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [presenceOpen, setPresenceOpen] = useState(false);
  
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useRealtimeNotifications();

  const { onlineUsers, currentUser, updateStatus } = useUserPresence();
  // const browserNotifications = useNotifications(); // Removed to avoid DB query conflicts

  // Show browser notifications for new notifications
  useEffect(() => {
    const latestNotification = notifications[0];
    if (latestNotification && !latestNotification.read) {
      // Browser notification - simplified for now
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(latestNotification.title, {
          body: latestNotification.message,
          tag: `notification-${latestNotification.id}`
        });
      }
    }
  }, [notifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "assistance_created":
        return "🆕";
      case "assistance_updated":
        return "📋";
      case "supplier_response":
        return "💬";
      case "quotation_submitted":
        return "💰";
      default:
        return "📢";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      case "busy":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* User Presence */}
      <Popover open={presenceOpen} onOpenChange={setPresenceOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <Users className="h-4 w-4" />
            {onlineUsers.length > 0 && (
              <Badge
                variant="secondary"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
              >
                {onlineUsers.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Utilizadores Online</h4>
              <Badge variant="outline">{onlineUsers.length} online</Badge>
            </div>
            
            {currentUser && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">O seu estado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Circle className={`h-3 w-3 fill-current ${getStatusColor(currentUser.status)}`} />
                    <span className="text-sm capitalize">{currentUser.status}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={currentUser.status === "online" ? "default" : "outline"}
                      onClick={() => updateStatus("online")}
                      className="flex-1"
                    >
                      Online
                    </Button>
                    <Button
                      size="sm"
                      variant={currentUser.status === "away" ? "default" : "outline"}
                      onClick={() => updateStatus("away")}
                      className="flex-1"
                    >
                      Ausente
                    </Button>
                    <Button
                      size="sm"
                      variant={currentUser.status === "busy" ? "default" : "outline"}
                      onClick={() => updateStatus("busy")}
                      className="flex-1"
                    >
                      Ocupado
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <ScrollArea className="h-48">
              <div className="space-y-2">
                {onlineUsers.map((user) => (
                  <div key={user.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <Circle className={`h-3 w-3 fill-current ${getStatusColor(user.status)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.name || user.email?.split("@")[0]}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {user.status}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(user.online_at), { 
                        addSuffix: true, 
                        locale: pt 
                      })}
                    </span>
                  </div>
                ))}
                {onlineUsers.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    Nenhum utilizador online
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>

      {/* Notifications */}
      <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            {unreadCount > 0 ? (
              <BellRing className="h-4 w-4" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Notificações</h4>
              <div className="flex gap-1">
                {unreadCount > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={markAllAsRead}
                    className="h-7 px-2"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearNotifications}
                  className="h-7 px-2"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <Separator />

            <ScrollArea className="h-80">
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      notification.read 
                        ? "bg-muted/30 hover:bg-muted/50" 
                        : "bg-primary/10 hover:bg-primary/20 border-primary/20"
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="text-sm font-medium leading-tight">
                            {notification.title}
                          </h5>
                          {!notification.read && (
                            <Circle className="h-2 w-2 fill-primary text-primary flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {notification.message}
                        </p>
                        <span className="text-xs text-muted-foreground mt-2 block">
                          {formatDistanceToNow(new Date(notification.created_at), { 
                            addSuffix: true, 
                            locale: pt 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="text-center py-8">
                    <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Sem notificações
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}