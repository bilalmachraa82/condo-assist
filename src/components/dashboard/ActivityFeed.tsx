import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Calendar,
  MessageSquare,
  Phone
} from "lucide-react"
import { useActivityFeed } from "@/hooks/useActivityFeed"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Activity {
  id: string
  type: "created" | "accepted" | "scheduled" | "completed" | "rejected" | "message" | "call"
  title: string
  description: string
  timestamp: string
  building?: string
  supplier?: string
  status?: "pendente" | "aceite" | "agendado" | "concluido" | "rejeitado"
}

export function ActivityFeed() {
  const { data: activities, isLoading, error } = useActivityFeed(8);

  return (
    <Card className="bg-gradient-to-b from-card to-muted/30">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Atividade Recente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <p className="text-sm">Erro ao carregar atividades</p>
            </div>
          ) : !activities || activities.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <p className="text-sm">Nenhuma atividade recente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                  <div className="mt-0.5">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">{activity.action}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {activity.details || "Sem detalhes"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {formatDistanceToNow(new Date(activity.created_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </span>
                      {activity.assistances && (
                        <>
                          <span>•</span>
                          <span>{activity.assistances.title}</span>
                        </>
                      )}
                      {activity.suppliers && (
                        <>
                          <span>•</span>
                          <span>{activity.suppliers.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}