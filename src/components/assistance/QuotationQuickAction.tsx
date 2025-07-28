import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { FileText, Clock, Euro } from "lucide-react"
import { useRequestQuotation, useQuotationsByAssistance } from "@/hooks/useQuotations"
import type { Assistance } from "@/hooks/useAssistances"

interface QuotationQuickActionProps {
  assistance: Assistance
}

export function QuotationQuickAction({ assistance }: QuotationQuickActionProps) {
  const [deadline, setDeadline] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const requestQuotation = useRequestQuotation()
  const { data: quotations } = useQuotationsByAssistance(assistance.id)

  const canRequest = assistance.assigned_supplier_id && !assistance.requires_quotation
  const hasQuotations = quotations && quotations.length > 0
  const quotationCount = quotations?.length || 0

  const handleRequest = async () => {
    await requestQuotation.mutateAsync({
      assistanceId: assistance.id,
      deadline: deadline || undefined,
    })
    setIsOpen(false)
    setDeadline("")
  }

  // Show quotation summary if exists
  if (hasQuotations) {
    const pendingCount = quotations.filter(q => q.status === 'pending').length
    const approvedCount = quotations.filter(q => q.status === 'approved').length
    
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-1">
          <FileText className="h-3 w-3" />
          {quotationCount} Orçamento{quotationCount > 1 ? 's' : ''}
        </Badge>
        {pendingCount > 0 && (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 gap-1">
            {pendingCount} Pendente{pendingCount > 1 ? 's' : ''}
          </Badge>
        )}
        {approvedCount > 0 && (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
            <Euro className="h-3 w-3" />
            Aprovado
          </Badge>
        )}
      </div>
    )
  }

  // Show status if quotation requested
  if (assistance.requires_quotation) {
    return (
      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1">
        <Clock className="h-3 w-3" />
        Orçamento Solicitado
        {assistance.quotation_deadline && (
          <span className="ml-1 text-xs">
            (até {new Date(assistance.quotation_deadline).toLocaleDateString()})
          </span>
        )}
      </Badge>
    )
  }

  // Show request button if applicable
  if (!canRequest) return null

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <FileText className="h-3 w-3" />
          Solicitar Orçamento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar Orçamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>Assistência:</strong> {assistance.title}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Fornecedor:</strong> {assistance.suppliers?.name}
            </p>
          </div>
          <div>
            <Label htmlFor="deadline">Prazo para Resposta (opcional)</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRequest} disabled={requestQuotation.isPending}>
              {requestQuotation.isPending ? "Solicitando..." : "Solicitar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}