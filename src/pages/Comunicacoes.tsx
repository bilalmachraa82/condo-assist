import { useState } from "react";
import { Mail, Send, Clock, CheckCircle, XCircle, Users, Filter, Search, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow, format } from "date-fns";
import { pt } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AutomatedNotifications } from "@/components/supplier/AutomatedNotifications";
import NotificationsDashboard from "@/components/communications/NotificationsDashboard";

interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string;
  status: string;
  sent_at: string;
  template_used?: string;
  assistance_id?: string;
  supplier_id?: string;
  metadata?: any;
}

export default function Comunicacoes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Fetch email logs
  const { data: emailLogs = [], isLoading } = useQuery({
    queryKey: ["email-logs", searchTerm, statusFilter, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from("email_logs")
        .select(`
          *,
          suppliers(name),
          assistances(title)
        `)
        .order("sent_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (searchTerm) {
        query = query.or(`recipient_email.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%`);
      }

      // Date filter
      if (dateFilter !== "all") {
        const now = new Date();
        let dateThreshold: Date;
        
        switch (dateFilter) {
          case "today":
            dateThreshold = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case "week":
            dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            dateThreshold = new Date(0);
        }
        
        query = query.gte("sent_at", dateThreshold.toISOString());
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as EmailLog[];
    },
  });

  // Email statistics
  const emailStats = {
    total: emailLogs.length,
    sent: emailLogs.filter(log => log.status === "sent").length,
    failed: emailLogs.filter(log => log.status === "failed").length,
    pending: emailLogs.filter(log => log.status === "pending").length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Mail className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge variant="default" className="bg-green-100 text-green-800">Enviado</Badge>;
      case "failed":
        return <Badge variant="destructive">Falhado</Badge>;
      case "pending":
        return <Badge variant="secondary">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard de Comunicações</h1>
          <p className="text-muted-foreground">
            Monitorizar e gerir todas as comunicações por email
          </p>
        </div>
        <Button>
          <Send className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{emailStats.total}</div>
                <p className="text-sm text-muted-foreground">Total Enviados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">{emailStats.sent}</div>
                <p className="text-sm text-muted-foreground">Enviados com Sucesso</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-red-600">{emailStats.failed}</div>
                <p className="text-sm text-muted-foreground">Falhados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold text-yellow-600">{emailStats.pending}</div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Pesquisar emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="sent">Enviados</SelectItem>
              <SelectItem value="failed">Falhados</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Última Semana</SelectItem>
              <SelectItem value="month">Último Mês</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Email Logs */}
        <Tabs defaultValue="notifications" className="space-y-4">
          <TabsList>
            <TabsTrigger value="notifications">Dashboard de Notificações</TabsTrigger>
            <TabsTrigger value="logs">Histórico de Emails</TabsTrigger>
            <TabsTrigger value="analytics">Análises</TabsTrigger>
            <TabsTrigger value="automation">Automação</TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="space-y-4">
            <NotificationsDashboard />
          </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Emails</CardTitle>
              <CardDescription>
                {emailLogs.length} email{emailLogs.length !== 1 ? 's' : ''} encontrado{emailLogs.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Mail className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
                      <p className="text-muted-foreground">A carregar emails...</p>
                    </div>
                  </div>
                ) : emailLogs.length > 0 ? (
                  <div className="space-y-1">
                    {emailLogs.map((log, index) => (
                      <div key={log.id}>
                        <div className="p-4 hover:bg-accent/50 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              {getStatusIcon(log.status)}
                            </div>
                            
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="font-medium">{log.subject}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Para: {log.recipient_email}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {getStatusBadge(log.status)}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>
                                  {formatDistanceToNow(new Date(log.sent_at), { 
                                    addSuffix: true, 
                                    locale: pt 
                                  })}
                                </span>
                                <span>•</span>
                                <span>{format(new Date(log.sent_at), "dd/MM/yyyy HH:mm")}</span>
                                {log.template_used && (
                                  <>
                                    <span>•</span>
                                    <span>Template: {log.template_used}</span>
                                  </>
                                )}
                                {log.assistance_id && (
                                  <>
                                    <span>•</span>
                                    <span>Assistência #{log.assistance_id.slice(-8)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {index < emailLogs.length - 1 && <Separator />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum email encontrado</h3>
                    <p className="text-muted-foreground max-w-md">
                      Não há emails que correspondam aos seus critérios de pesquisa.
                    </p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Taxa de Sucesso</CardTitle>
                <CardDescription>Percentagem de emails entregues com sucesso</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {emailStats.total > 0 ? Math.round((emailStats.sent / emailStats.total) * 100) : 0}%
                </div>
                <p className="text-sm text-muted-foreground">
                  {emailStats.sent} de {emailStats.total} emails entregues
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Templates Mais Usados</CardTitle>
                <CardDescription>Templates de email mais populares</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Resumo de Assistências</span>
                    <Badge variant="outline">45%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Códigos Mágicos</span>
                    <Badge variant="outline">30%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Lembretes</span>
                    <Badge variant="outline">25%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="automation">
          <AutomatedNotifications />
        </TabsContent>
      </Tabs>
    </div>
  );
}