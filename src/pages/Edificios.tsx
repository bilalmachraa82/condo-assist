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
import { useBuildings, useBuildingStats } from "@/hooks/useBuildings"

export default function Edificios() {
  const [searchTerm, setSearchTerm] = useState("")
  const { data: buildings = [], isLoading } = useBuildings()
  const { data: stats, isLoading: isLoadingStats } = useBuildingStats()

  const filteredBuildings = useMemo(() => {
    if (!searchTerm) return buildings
    return buildings.filter(building => 
      building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      building.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      building.address?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [buildings, searchTerm])

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
              <Building2 className="h-5 w-5 text-success" />
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
        <Card className="bg-gradient-to-br from-muted/50 to-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-muted-foreground">{stats?.inactive || 0}</p>
                )}
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
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-accent">{stats?.totalAssistances || 0}</p>
                )}
                <p className="text-xs text-muted-foreground">Assistências</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buildings Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
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
                      {getStatusBadge(building.is_active)}
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
                {building.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{building.address}</span>
                  </div>
                )}

                {building.nif && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">NIF:</span>
                    <span className="ml-2 font-mono">{building.nif}</span>
                  </div>
                )}

                {building.cadastral_code && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Código Cadastral:</span>
                    <span className="ml-2 font-mono">{building.cadastral_code}</span>
                  </div>
                )}

                {building.admin_notes && (
                  <div className="p-3 bg-warning/10 border border-warning/20 rounded-md">
                    <p className="text-xs text-warning-foreground">
                      <strong>Nota:</strong> {building.admin_notes}
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
      )}

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