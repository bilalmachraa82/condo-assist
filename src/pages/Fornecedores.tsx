import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import { useSuppliers, useSupplierStats } from "@/hooks/useSuppliers"

export default function Fornecedores() {
  const [searchTerm, setSearchTerm] = useState("")
  const { data: suppliers = [], isLoading } = useSuppliers()
  const { data: stats, isLoading: isLoadingStats } = useSupplierStats()

  const filteredSuppliers = useMemo(() => {
    if (!searchTerm) return suppliers
    return suppliers.filter(supplier => 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [suppliers, searchTerm])

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
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
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-primary">{stats?.total || 0}</p>
                )}
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
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-success">{stats?.active || 0}</p>
                )}
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
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-accent">{stats?.specializations || 0}</p>
                )}
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
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-warning">{stats?.averageRating || 0}</p>
                )}
                <p className="text-xs text-muted-foreground">Avaliação Média</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredSuppliers.map((supplier) => (
            <Card key={supplier.id} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-xl">{supplier.name}</CardTitle>
                      {getStatusBadge(supplier.is_active)}
                    </div>
                    {supplier.specialization && (
                      <Badge variant="outline" className="bg-accent/10 text-accent w-fit">
                        <Briefcase className="h-3 w-3 mr-1" />
                        {supplier.specialization}
                      </Badge>
                    )}
                    {renderStars(supplier.rating ? Number(supplier.rating) : undefined)}
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
                  {supplier.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{supplier.email}</span>
                    </div>
                  )}
                  
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

                {supplier.admin_notes && (
                  <div className="p-3 bg-warning/10 border border-warning/20 rounded-md">
                    <p className="text-xs text-warning-foreground">
                      <strong>Nota:</strong> {supplier.admin_notes}
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
      )}

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