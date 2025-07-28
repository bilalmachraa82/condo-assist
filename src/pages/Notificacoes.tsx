import { useState } from "react";
import { Bell, Check, CheckCheck, X, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

export default function Notificacoes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications 
  } = useRealtimeNotifications();

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === "all" || 
                         (filterType === "unread" && !notification.read) ||
                         notification.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'assistance_created':
        return '📋';
      case 'assistance_status_updated':
        return '🔄';
      case 'supplier_response':
        return '💬';
      case 'quotation_submitted':
        return '💰';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'assistance_created':
        return 'bg-blue-50 border-blue-200';
      case 'assistance_status_updated':
        return 'bg-orange-50 border-orange-200';
      case 'supplier_response':
        return 'bg-green-50 border-green-200';
      case 'quotation_submitted':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Centro de Notificações</h1>
          <p className="text-muted-foreground">
            Gerir e acompanhar todas as notificações do sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {unreadCount} não lidas
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{notifications.length}</div>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-red-500 rounded-full" />
              <div>
                <div className="text-2xl font-bold">{unreadCount}</div>
                <p className="text-sm text-muted-foreground">Não Lidas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full" />
              <div>
                <div className="text-2xl font-bold">{notifications.length - unreadCount}</div>
                <p className="text-sm text-muted-foreground">Lidas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-blue-500 rounded-full" />
              <div>
                <div className="text-2xl font-bold">
                  {notifications.filter(n => n.type === 'assistance_created').length}
                </div>
                <p className="text-sm text-muted-foreground">Assistências</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Pesquisar notificações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setFilterType(filterType === "unread" ? "all" : "unread")}
          >
            <Filter className="h-4 w-4 mr-2" />
            {filterType === "unread" ? "Todas" : "Não Lidas"}
          </Button>
          
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar Todas como Lidas
            </Button>
          )}
          
          <Button variant="outline" size="sm" onClick={clearNotifications}>
            <X className="h-4 w-4 mr-2" />
            Limpar Tudo
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Notificações Recentes</CardTitle>
          <CardDescription>
            {filteredNotifications.length} notificação{filteredNotifications.length !== 1 ? 's' : ''} encontrada{filteredNotifications.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            {filteredNotifications.length > 0 ? (
              <div className="space-y-1">
                {filteredNotifications.map((notification, index) => (
                  <div key={notification.id}>
                    <div 
                      className={`p-4 transition-colors hover:bg-accent cursor-pointer ${
                        !notification.read ? 'bg-accent/50' : ''
                      }`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`font-medium ${!notification.read ? 'font-semibold' : ''}`}>
                              {notification.title}
                            </h4>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {!notification.read && (
                                <div className="h-2 w-2 bg-blue-500 rounded-full" />
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                disabled={notification.read}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              {formatDistanceToNow(new Date(notification.created_at), { 
                                addSuffix: true, 
                                locale: pt 
                              })}
                            </span>
                            {notification.assistance_id && (
                              <>
                                <span>•</span>
                                <span>Assistência #{notification.assistance_id.slice(-8)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {index < filteredNotifications.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma notificação encontrada</h3>
                <p className="text-muted-foreground max-w-md">
                  {searchTerm || filterType !== "all" 
                    ? "Não há notificações que correspondam aos seus critérios de pesquisa."
                    : "Ainda não tem notificações. As notificações aparecerão aqui quando houver atividade no sistema."
                  }
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}