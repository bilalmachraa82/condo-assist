import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Search, 
  Filter, 
  Users,
  Mail,
  Phone,
  MapPin,
  Briefcase,
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

interface Supplier {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  nif?: string
  specialization: string
  status: "ativo" | "inativo"
  adminNotes?: string
  assistanceCount: number
  lastAssistance?: string
  rating?: number
}

const mockSuppliers: Supplier[] = [
  {
    id: "22",
    name: "TKE",
    email: "info.tkept@tkelevator.com",
    phone: "+351 21 43 08 100",
    address: "Sintra Business Park, Edifício 4, 2B, Zona Industrial da Abrunheira, 2710‑089 Sintra",
    nif: "501 445 226",
    specialization: "Elevadores",
    status: "ativo",
    assistanceCount: 24,
    lastAssistance: "2024-01-15",
    rating: 4.8
  },
  {
    id: "23",
    name: "Clefta", 
    email: "geral@clefta.pt",
    phone: "(+351) 217 648 435",
    address: "Rua Mariano Pina, 13, Loja B, 1500‑442 Lisboa",
    nif: "501 324 046",
    specialization: "Segurança",
    status: "ativo",
    assistanceCount: 18,
    lastAssistance: "2024-01-14",
    rating: 4.6
  },
  {
    id: "24",
    name: "Sr. Obras",
    email: "ana.ferreira.santos@srobras.pt", 
    phone: "961 777 625 / 966 370 189",
    address: "Avenida da República, 6, 7.º Esq., 1050‑191 Lisboa",
    nif: "509 541 887",
    specialization: "Construção e Reparações",
    status: "ativo",
    assistanceCount: 32,
    lastAssistance: "2024-01-13",
    rating: 4.9
  },
  {
    id: "25",
    name: "Mestre das Chaves",
    email: "lojamestredaschaves@gmail.com",
    phone: "939 324 688 / 933 427 963", 
    address: "Rua Augusto Gil, 14‑A, 2675‑507 Odivelas (Lisboa)",
    nif: "506 684 504",
    specialization: "Serralharia",
    status: "ativo",
    assistanceCount: 15,
    lastAssistance: "2024-01-12",
    rating: 4.4
  },
  {
    id: "26",
    name: "Desinfest Lar",
    email: "desinfestlar@sapo.pt",
    phone: "+351 219 336 788",
    address: "Largo da Saudade, Vivenda Rosinha, 2675‑260 Odivelas",
    nif: "502 763 760", 
    specialization: "Controlo de Pragas",
    status: "ativo",
    assistanceCount: 8,
    lastAssistance: "2024-01-10",
    rating: 4.7
  }
]

export default function Fornecedores() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredSuppliers] = useState(mockSuppliers)

  const getStatusBadge = (status: Supplier["status"]) => {
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

  const renderStars = (rating?: number) => {
    if (!rating) return null
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-xs ${
              star <= rating ? "text-warning" : "text-muted-foreground"
            }`}
          >
            ★
          </span>
        ))}
        <span className="text-xs text-muted-foreground ml-1">({rating})</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
          Gestão de Fornecedores
        </h1>
        <p className="text-muted-foreground">
          Gerir informações dos fornecedores de serviços técnicos
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar fornecedores..."
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
          Novo Fornecedor
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-primary">{mockSuppliers.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-success/10 to-success/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-success" />
              <div>
                <p className="text-2xl font-bold text-success">
                  {mockSuppliers.filter(s => s.status === "ativo").length}
                </p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-accent" />
              <div>
                <p className="text-2xl font-bold text-accent">
                  {new Set(mockSuppliers.map(s => s.specialization)).size}
                </p>
                <p className="text-xs text-muted-foreground">Especialidades</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-warning/10 to-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">★</span>
              <div>
                <p className="text-2xl font-bold text-warning">
                  {(mockSuppliers.reduce((sum, s) => sum + (s.rating || 0), 0) / mockSuppliers.filter(s => s.rating).length).toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">Avaliação Média</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {filteredSuppliers.map((supplier) => (
          <Card key={supplier.id} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-xl">{supplier.name}</CardTitle>
                    {getStatusBadge(supplier.status)}
                  </div>
                  <Badge variant="outline" className="bg-accent/10 text-accent w-fit">
                    <Briefcase className="h-3 w-3 mr-1" />
                    {supplier.specialization}
                  </Badge>
                  {renderStars(supplier.rating)}
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
                      <Mail className="h-4 w-4 mr-2" />
                      Enviar Email
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate">{supplier.email}</span>
                </div>
                
                {supplier.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">{supplier.phone}</span>
                  </div>
                )}

                {supplier.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{supplier.address}</span>
                  </div>
                )}

                {supplier.nif && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">NIF:</span>
                    <span className="ml-2 font-mono">{supplier.nif}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{supplier.assistanceCount}</p>
                  <p className="text-xs text-muted-foreground">Assistências</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {supplier.lastAssistance ? 
                      new Date(supplier.lastAssistance).toLocaleDateString('pt-PT') : 
                      "N/A"
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">Última assistência</p>
                </div>
              </div>

              {supplier.adminNotes && (
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-md">
                  <p className="text-xs text-warning-foreground">
                    <strong>Nota:</strong> {supplier.adminNotes}
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
                <Button variant="outline" size="sm" className="flex-1 hover:bg-muted/50">
                  <Mail className="h-3 w-3 mr-1" />
                  Email
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSuppliers.length === 0 && (
        <Card className="p-8">
          <div className="text-center space-y-2">
            <Users className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">Nenhum fornecedor encontrado</h3>
            <p className="text-muted-foreground">
              Não existem fornecedores que correspondam aos critérios de pesquisa.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}