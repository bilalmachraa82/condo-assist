import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Plus, 
  Search, 
  Filter, 
  Wrench,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  Building2,
  User
} from "lucide-react"
import { useAssistances, useAssistanceStats, type Assistance } from "@/hooks/useAssistances"
import { formatDistanceToNow, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import AssistanceDetail from "@/components/assistance/AssistanceDetail"

const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4" />
    case "in_progress":
      return <CheckCircle className="h-4 w-4" />
    case "completed":
      return <CheckCircle className="h-4 w-4" />
    case "cancelled":
      return <XCircle className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

const getStatusBadge = (status: string) => {
  const variants = {
    pending: "bg-warning/10 text-warning border-warning/20",
    in_progress: "bg-primary/10 text-primary border-primary/20",
    completed: "bg-success/10 text-success border-success/20",
    cancelled: "bg-destructive/10 text-destructive border-destructive/20"
  }

  const labels = {
    pending: "Pendente",
    in_progress: "Em Progresso",
    completed: "Concluída",
    cancelled: "Cancelada"
  }

  return (
    <Badge className={variants[status as keyof typeof variants] || variants.pending}>
      {labels[status as keyof typeof labels] || status}
    </Badge>
  )
}

const getPriorityBadge = (priority: string) => {
  const variants = {
    normal: "bg-muted/50 text-muted-foreground",
    urgent: "bg-warning/10 text-warning border-warning/20",
    critical: "bg-destructive/10 text-destructive border-destructive/20"
  }

  const icons = {
    normal: null,
    urgent: <AlertTriangle className="h-3 w-3 mr-1" />,
    critical: <AlertTriangle className="h-3 w-3 mr-1" />
  }

  const labels = {
    normal: "Normal",
    urgent: "Urgente",
    critical: "Crítico"
  }

  return (
    <Badge className={`text-xs ${variants[priority as keyof typeof variants] || variants.normal}`}>
      {icons[priority as keyof typeof icons]}
      {labels[priority as keyof typeof labels] || priority}
    </Badge>
  )
}

export default function Assistencias() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAssistance, setSelectedAssistance] = useState<Assistance | null>(null)
  const { data: assistances, isLoading } = useAssistances();
  const { data: stats, isLoading: statsLoading } = useAssistanceStats();

  // Filter assistances based on search term
  const filteredAssistances = assistances?.filter(assistance => 
    assistance.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assistance.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assistance.buildings?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assistance.suppliers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Show detail view if assistance is selected
  if (selectedAssistance) {
    return (
      <AssistanceDetail 
        assistance={selectedAssistance} 
        onBack={() => setSelectedAssistance(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
          Gestão de Assistências
        </h1>
        <p className="text-muted-foreground">
          Gerir pedidos de assistência técnica para condomínios
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar assistências..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-80"
            />
          </div>
          <Button variant="outline" className="hover:bg-muted/50">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>
        <Button className="bg-gradient-to-r from-primary to-primary-light hover:shadow-lg transition-all duration-300">
          <Plus className="h-4 w-4 mr-2" />
          Nova Assistência
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </>
        ) : (
          <>
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold text-primary">{stats?.total || 0}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-warning/10 to-warning/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-warning" />
                  <div>
                    <p className="text-2xl font-bold text-warning">{stats?.pending || 0}</p>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-2xl font-bold text-accent">{stats?.in_progress || 0}</p>
                    <p className="text-xs text-muted-foreground">Em Progresso</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-success/10 to-success/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-2xl font-bold text-success">{stats?.completed || 0}</p>
                    <p className="text-xs text-muted-foreground">Concluídas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Assistances List */}
      <div className="grid gap-4">
        {isLoading ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
              </Card>
            ))}
          </>
        ) : (
          filteredAssistances.map((assistance) => (
            <Card key={assistance.id} className="hover:shadow-md transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-muted-foreground">{assistance.id}</span>
                      {getStatusBadge(assistance.status)}
                      {getPriorityBadge(assistance.priority)}
                    </div>
                    
                    <h3 className="font-semibold text-lg">
                      {assistance.intervention_types?.name || assistance.title || 'Assistência'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {assistance.description || 'Sem descrição'}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        <span className="truncate max-w-xs">
                          {assistance.buildings?.name || 'Edifício não especificado'}
                        </span>
                      </div>
                      {assistance.suppliers && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{assistance.suppliers.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>
                          {formatDistanceToNow(new Date(assistance.created_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusIcon(assistance.status)}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="hover:bg-muted/50"
                      onClick={() => setSelectedAssistance(assistance)}
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {filteredAssistances.length === 0 && (
        <Card className="p-8">
          <div className="text-center space-y-2">
            <Wrench className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">Nenhuma assistência encontrada</h3>
            <p className="text-muted-foreground">
              Não existem assistências que correspondam aos critérios de pesquisa.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}