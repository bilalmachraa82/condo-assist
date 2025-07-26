import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

interface Assistance {
  id: string
  type: string
  building: string
  supplier?: string
  status: "pendente" | "aceite" | "agendado" | "concluido" | "rejeitado"
  priority: "normal" | "urgente" | "critico"
  createdAt: string
  scheduledDate?: string
  description: string
}

const mockAssistances: Assistance[] = [
  {
    id: "ASS-001",
    type: "Reparação de Elevador",
    building: "COND. R. ALEXANDRE HERCULANO,Nº35",
    supplier: "TKE",
    status: "agendado",
    priority: "urgente",
    createdAt: "2024-01-15T09:30:00Z",
    scheduledDate: "2024-01-16T09:00:00Z",
    description: "Elevador parado no 3º andar"
  },
  {
    id: "ASS-002", 
    type: "Manutenção Preventiva",
    building: "COND. TRAVESSA CONDE DA RIBEIRA, Nº12",
    supplier: "Clefta",
    status: "pendente",
    priority: "normal",
    createdAt: "2024-01-15T14:20:00Z",
    description: "Verificação sistema CCTV"
  },
  {
    id: "ASS-003",
    type: "Limpeza de Caleiras",
    building: "COND.R.NOSSA SRA DA ANUNCIAÇÃO Nº5",
    supplier: "Sr. Obras",
    status: "concluido",
    priority: "normal", 
    createdAt: "2024-01-14T11:00:00Z",
    description: "Limpeza caleiras e algerozes"
  },
  {
    id: "ASS-004",
    type: "Controlo de Pragas",
    building: "COND. R.VITORINO NEMÉSIO, 8", 
    supplier: "Desinfest Lar",
    status: "aceite",
    priority: "normal",
    createdAt: "2024-01-15T16:45:00Z",
    description: "Tratamento preventivo garagem"
  }
]

const getStatusIcon = (status: Assistance["status"]) => {
  switch (status) {
    case "pendente":
      return <Clock className="h-4 w-4" />
    case "aceite":
      return <CheckCircle className="h-4 w-4" />
    case "agendado":
      return <Calendar className="h-4 w-4" />
    case "concluido":
      return <CheckCircle className="h-4 w-4" />
    case "rejeitado":
      return <XCircle className="h-4 w-4" />
  }
}

const getStatusBadge = (status: Assistance["status"]) => {
  const variants = {
    pendente: "bg-warning/10 text-warning border-warning/20",
    aceite: "bg-primary/10 text-primary border-primary/20",
    agendado: "bg-accent/10 text-accent border-accent/20",
    concluido: "bg-success/10 text-success border-success/20",
    rejeitado: "bg-destructive/10 text-destructive border-destructive/20"
  }

  return (
    <Badge className={variants[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

const getPriorityBadge = (priority: Assistance["priority"]) => {
  const variants = {
    normal: "bg-muted/50 text-muted-foreground",
    urgente: "bg-warning/10 text-warning border-warning/20",
    critico: "bg-destructive/10 text-destructive border-destructive/20"
  }

  const icons = {
    normal: null,
    urgente: <AlertTriangle className="h-3 w-3 mr-1" />,
    critico: <AlertTriangle className="h-3 w-3 mr-1" />
  }

  return (
    <Badge className={`text-xs ${variants[priority]}`}>
      {icons[priority]}
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  )
}

export default function Assistencias() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredAssistances] = useState(mockAssistances)

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
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-primary">{mockAssistances.length}</p>
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
                <p className="text-2xl font-bold text-warning">
                  {mockAssistances.filter(a => a.status === "pendente").length}
                </p>
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
                <p className="text-2xl font-bold text-accent">
                  {mockAssistances.filter(a => a.status === "agendado").length}
                </p>
                <p className="text-xs text-muted-foreground">Agendadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-success/10 to-success/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <div>
                <p className="text-2xl font-bold text-success">
                  {mockAssistances.filter(a => a.status === "concluido").length}
                </p>
                <p className="text-xs text-muted-foreground">Concluídas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assistances List */}
      <div className="grid gap-4">
        {filteredAssistances.map((assistance) => (
          <Card key={assistance.id} className="hover:shadow-md transition-all duration-300 cursor-pointer">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-muted-foreground">{assistance.id}</span>
                    {getStatusBadge(assistance.status)}
                    {getPriorityBadge(assistance.priority)}
                  </div>
                  
                  <h3 className="font-semibold text-lg">{assistance.type}</h3>
                  <p className="text-sm text-muted-foreground">{assistance.description}</p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      <span className="truncate max-w-xs">{assistance.building}</span>
                    </div>
                    {assistance.supplier && (
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{assistance.supplier}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        {new Date(assistance.createdAt).toLocaleDateString('pt-PT')} às{' '}
                        {new Date(assistance.createdAt).toLocaleTimeString('pt-PT', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {getStatusIcon(assistance.status)}
                  <Button variant="outline" size="sm" className="hover:bg-muted/50">
                    Ver Detalhes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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