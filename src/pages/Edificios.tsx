import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Search, 
  Filter, 
  Building2,
  MapPin,
  FileText,
  Edit,
  Eye,
  MoreHorizontal
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Building {
  id: string
  code: string
  name: string
  address: string
  nif?: string
  cadastralCode?: string
  status: "ativo" | "inativo"
  adminNotes?: string
  assistanceCount: number
  lastAssistance?: string
}

const mockBuildings: Building[] = [
  {
    id: "1",
    code: "003",
    name: "COND. R. ALEXANDRE HERCULANO,Nº35",
    address: "Rua Alexandre Herculano, Nº35",
    status: "ativo",
    assistanceCount: 12,
    lastAssistance: "2024-01-15"
  },
  {
    id: "2", 
    code: "004",
    name: "COND. TRAVESSA CONDE DA RIBEIRA, Nº12",
    address: "Travessa Conde da Ribeira, Nº12",
    status: "ativo",
    assistanceCount: 8,
    lastAssistance: "2024-01-10"
  },
  {
    id: "3",
    code: "006", 
    name: "COND.R.NOSSA SRA DA ANUNCIAÇÃO Nº5",
    address: "Rua Nossa Senhora da Anunciação, Nº5",
    status: "ativo",
    assistanceCount: 15,
    lastAssistance: "2024-01-14"
  },
  {
    id: "4",
    code: "008",
    name: "COND. R.VITORINO NEMÉSIO, 8",
    address: "Rua Vitorino Nemésio, 8", 
    status: "ativo",
    assistanceCount: 6,
    lastAssistance: "2024-01-12"
  },
  {
    id: "5",
    code: "009",
    name: "COND. R. DAS ORQUÍDEAS, Nº1",
    address: "Rua das Orquídeas, Nº1",
    status: "inativo",
    assistanceCount: 0,
    adminNotes: "Edifício em obras de renovação"
  }
]

export default function Edificios() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredBuildings] = useState(mockBuildings)

  const getStatusBadge = (status: Building["status"]) => {
    return status === "ativo" ? (
      <Badge className="bg-success/10 text-success border-success/20">
        Ativo
      </Badge>
    ) : (
      <Badge className="bg-muted/50 text-muted-foreground">
        Inativo
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
          Gestão de Edifícios
        </h1>
        <p className="text-muted-foreground">
          Gerir informações dos edifícios em condomínio
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar edifícios..."
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
          Novo Edifício
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-primary">{mockBuildings.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-success/10 to-success/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-success" />
              <div>
                <p className="text-2xl font-bold text-success">
                  {mockBuildings.filter(b => b.status === "ativo").length}
                </p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-muted/50 to-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold text-muted-foreground">
                  {mockBuildings.filter(b => b.status === "inativo").length}
                </p>
                <p className="text-xs text-muted-foreground">Inativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" />
              <div>
                <p className="text-2xl font-bold text-accent">
                  {mockBuildings.reduce((sum, b) => sum + b.assistanceCount, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Assistências</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buildings Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredBuildings.map((building) => (
          <Card key={building.id} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                      {building.code}
                    </span>
                    {getStatusBadge(building.status)}
                  </div>
                  <CardTitle className="text-lg leading-tight">{building.name}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <FileText className="h-4 w-4 mr-2" />
                      Assistências
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">{building.address}</span>
              </div>

              {building.nif && (
                <div className="text-sm">
                  <span className="text-muted-foreground">NIF:</span>
                  <span className="ml-2 font-mono">{building.nif}</span>
                </div>
              )}

              {building.cadastralCode && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Código Cadastral:</span>
                  <span className="ml-2 font-mono">{building.cadastralCode}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{building.assistanceCount}</p>
                  <p className="text-xs text-muted-foreground">Assistências</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {building.lastAssistance ? 
                      new Date(building.lastAssistance).toLocaleDateString('pt-PT') : 
                      "N/A"
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">Última assistência</p>
                </div>
              </div>

              {building.adminNotes && (
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-md">
                  <p className="text-xs text-warning-foreground">
                    <strong>Nota:</strong> {building.adminNotes}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 hover:bg-muted/50">
                  <Eye className="h-3 w-3 mr-1" />
                  Ver
                </Button>
                <Button variant="outline" size="sm" className="flex-1 hover:bg-muted/50">
                  <Edit className="h-3 w-3 mr-1" />
                  Editar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBuildings.length === 0 && (
        <Card className="p-8">
          <div className="text-center space-y-2">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">Nenhum edifício encontrado</h3>
            <p className="text-muted-foreground">
              Não existem edifícios que correspondam aos critérios de pesquisa.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}