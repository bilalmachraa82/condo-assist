import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Calendar,
  MessageSquare,
  Phone
} from "lucide-react"

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

const mockActivities: Activity[] = [
  {
    id: "1",
    type: "created",
    title: "Nova assistência criada",
    description: "Reparação de elevador - COND. R. ALEXANDRE HERCULANO,Nº35",
    timestamp: "há 5 minutos",
    building: "003",
    status: "pendente"
  },
  {
    id: "2", 
    type: "accepted",
    title: "Assistência aceite",
    description: "TKE aceitou a reparação de elevador",
    timestamp: "há 15 minutos",
    supplier: "TKE",
    status: "aceite"
  },
  {
    id: "3",
    type: "scheduled",
    title: "Agendamento confirmado",
    description: "Manutenção preventiva agendada para amanhã às 09:00",
    timestamp: "há 1 hora",
    supplier: "Clefta",
    status: "agendado"
  },
  {
    id: "4",
    type: "completed",
    title: "Assistência concluída",
    description: "Limpeza de caleiras finalizada com sucesso",
    timestamp: "há 2 horas",
    supplier: "Sr. Obras",
    status: "concluido"
  },
  {
    id: "5",
    type: "message",
    title: "Nova mensagem",
    description: "Fornecedor enviou foto do trabalho realizado",
    timestamp: "há 3 horas",
    supplier: "Mestre das Chaves"
  }
]

const getActivityIcon = (type: Activity["type"]) => {
  switch (type) {
    case "created":
      return <Clock className="h-4 w-4 text-primary" />
    case "accepted":
      return <CheckCircle className="h-4 w-4 text-success" />
    case "scheduled":
      return <Calendar className="h-4 w-4 text-warning" />
    case "completed":
      return <CheckCircle className="h-4 w-4 text-success" />
    case "rejected":
      return <XCircle className="h-4 w-4 text-destructive" />
    case "message":
      return <MessageSquare className="h-4 w-4 text-accent" />
    case "call":
      return <Phone className="h-4 w-4 text-primary" />
    default:
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />
  }
}

const getStatusBadge = (status?: Activity["status"]) => {
  if (!status) return null
  
  const variants = {
    pendente: "secondary",
    aceite: "default", 
    agendado: "outline",
    concluido: "secondary",
    rejeitado: "destructive"
  } as const

  const colors = {
    pendente: "bg-warning/10 text-warning border-warning/20",
    aceite: "bg-success/10 text-success border-success/20",
    agendado: "bg-primary/10 text-primary border-primary/20", 
    concluido: "bg-success/10 text-success border-success/20",
    rejeitado: "bg-destructive/10 text-destructive border-destructive/20"
  }

  return (
    <Badge className={`text-xs ${colors[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

export function ActivityFeed() {
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
          <div className="space-y-4">
            {mockActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                <div className="mt-0.5">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{activity.title}</h4>
                    {getStatusBadge(activity.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activity.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{activity.timestamp}</span>
                    {activity.building && (
                      <>
                        <span>•</span>
                        <span>Edifício {activity.building}</span>
                      </>
                    )}
                    {activity.supplier && (
                      <>
                        <span>•</span>
                        <span>{activity.supplier}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}