import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  MoreHorizontal,
  Trash2,
  Send
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAllSuppliers, useSupplierStats, type Supplier } from "@/hooks/useSuppliers"
import { SupplierForm } from "@/components/suppliers/SupplierForm"
import { SafeDeleteSupplierDialog } from "@/components/suppliers/SafeDeleteSupplierDialog"
import { useToast } from "@/hooks/use-toast"
import TestPortalButton from "@/components/supplier/TestPortalButton"
import { SupplierEmailSummary } from "@/components/supplier/SupplierEmailSummary"
import { BulkEmailDialog } from "@/components/supplier/BulkEmailDialog"
import { SupplierAssistancesList } from "@/components/supplier/SupplierAssistancesList"
import { useSupplierAssistances } from "@/hooks/useSupplierAssistances"
import { supabase } from "@/integrations/supabase/client"
import { useQuery } from "@tanstack/react-query"
import { SupplierFiltersComponent, SupplierFilters } from "@/components/suppliers/SupplierFilters"
import { PDFExportButton } from "@/components/suppliers/PDFExportButton"

export default function Fornecedores() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null)
  const [emailSummarySupplier, setEmailSummarySupplier] = useState<Supplier | null>(null)
  const [selectedSupplierForAssistances, setSelectedSupplierForAssistances] = useState<Supplier | null>(null)
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false)
  const [filters, setFilters] = useState<SupplierFilters>({ status: "active" })
  
  const { data: suppliers = [], isLoading } = useAllSuppliers(true) // Include inactive suppliers for admin management
  const { data: stats, isLoading: isLoadingStats } = useSupplierStats()
  const { toast } = useToast()

  // Fetch suppliers with pending assistances for bulk email
  const { data: suppliersWithAssistances = [] } = useQuery({
    queryKey: ["suppliers-with-assistances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select(`
          id,
          name,
          email,
          assistances!left(id, status)
        `)
        .eq("is_active", true)
        .not("email", "is", null)
        .order("name");

      if (error) throw error;

      return (data || [])
        .map(supplier => ({
          id: supplier.id,
          name: supplier.name,
          email: supplier.email || "",
          pendingCount: supplier.assistances?.filter(a => 
            ["pending", "awaiting_quotation", "in_progress"].includes(a.status)
          ).length || 0
        }))
        .filter(supplier => supplier.pendingCount > 0);
    }
  });

  const { data: emailSummaryAssistances = [] } = useSupplierAssistances(emailSummarySupplier?.id || "")

  const filteredSuppliers = useMemo(() => {
    let filtered = suppliers;

    // Apply search term filter
    if (searchTerm) {
      filtered = filtered.filter(supplier => 
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply other filters
    filtered = filtered.filter(supplier => {
      // Status filter
      if (filters.status) {
        const isActive = filters.status === 'active';
        if (supplier.is_active !== isActive) return false;
      }

      // Specialization filter
      if (filters.specialization && supplier.specialization !== filters.specialization) {
        return false;
      }

      // Location filter
      if (filters.location && supplier.address && 
          !supplier.address.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }

      // Rating filter
      if (filters.minRating && (!supplier.rating || supplier.rating < Number(filters.minRating))) {
        return false;
      }

      // Email filter
      if (filters.hasEmail !== undefined) {
        const hasEmail = !!supplier.email;
        if (hasEmail !== filters.hasEmail) return false;
      }

      // Phone filter
      if (filters.hasPhone !== undefined) {
        const hasPhone = !!supplier.phone;
        if (hasPhone !== filters.hasPhone) return false;
      }

      return true;
    });

    return filtered;
  }, [suppliers, searchTerm, filters])

  // Get unique specializations for filter
  const uniqueSpecializations = useMemo(() => {
    return Array.from(new Set(
      suppliers.map(s => s.specialization).filter(Boolean)
    )).sort();
  }, [suppliers]);

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

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setIsFormOpen(true)
  }

  const handleCreate = () => {
    setSelectedSupplier(null)
    setIsFormOpen(true)
  }

  const handleFormSuccess = () => {
    setIsFormOpen(false)
    setSelectedSupplier(null)
  }

  const handleDelete = () => {
    // The SafeDeleteSupplierDialog will handle all deletion logic
  }

  const handleEmailSummary = (supplier: Supplier) => {
    setEmailSummarySupplier(supplier)
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
          <SupplierFiltersComponent 
            filters={filters} 
            onFiltersChange={setFilters}
            specializations={uniqueSpecializations}
          />
        </div>
        <div className="flex gap-2">
          <PDFExportButton 
            suppliers={filteredSuppliers}
            filters={filters}
            title="Lista de Fornecedores"
          />
          <Button 
            onClick={() => setIsBulkEmailOpen(true)}
            variant="outline"
            disabled={suppliersWithAssistances.length === 0}
            className="hover:bg-muted/50"
          >
            <Send className="h-4 w-4 mr-2" />
            Envio em Massa ({suppliersWithAssistances.length})
          </Button>
          <Button onClick={handleCreate} className="bg-gradient-to-r from-primary to-primary-light hover:shadow-lg transition-all duration-300">
            <Plus className="h-4 w-4 mr-2" />
            Novo Fornecedor
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedSupplierForAssistances(supplier)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Assistências
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEmailSummary(supplier)}>
                        <Mail className="h-4 w-4 mr-2" />
                        Enviar Resumo
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setSupplierToDelete(supplier)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
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
                  <Button onClick={() => handleEdit(supplier)} variant="outline" size="sm" className="flex-1 hover:bg-muted/50">
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <TestPortalButton 
                    supplierId={supplier.id}
                    supplierName={supplier.name}
                    supplierEmail={supplier.email || ""}
                  />
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

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}
            </DialogTitle>
          </DialogHeader>
          <SupplierForm
            supplier={selectedSupplier || undefined}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Safe Delete Dialog */}
      <SafeDeleteSupplierDialog
        supplier={supplierToDelete}
        open={!!supplierToDelete}
        onOpenChange={() => setSupplierToDelete(null)}
      />

      {/* Email Summary Dialog */}
      {emailSummarySupplier && (
        <SupplierEmailSummary
          supplierId={emailSummarySupplier.id}
          supplierName={emailSummarySupplier.name}
          supplierEmail={emailSummarySupplier.email || ""}
          pendingAssistances={emailSummaryAssistances}
          isOpen={!!emailSummarySupplier}
          onClose={() => setEmailSummarySupplier(null)}
        />
      )}

      {/* Bulk Email Dialog */}
      <BulkEmailDialog
        suppliers={suppliersWithAssistances}
        isOpen={isBulkEmailOpen}
        onClose={() => setIsBulkEmailOpen(false)}
      />

      {/* Supplier Assistances Dialog */}
      {selectedSupplierForAssistances && (
        <SupplierAssistancesList
          supplierId={selectedSupplierForAssistances.id}
          supplierName={selectedSupplierForAssistances.name}
          isOpen={!!selectedSupplierForAssistances}
          onClose={() => setSelectedSupplierForAssistances(null)}
        />
      )}
    </div>
  )
}