import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badges";
import { ArrowLeft, FileText, Calendar, Euro, Building2 } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useAssistancesBySupplier } from "@/hooks/useAssistancesBySupplier";
import { Skeleton } from "@/components/ui/skeleton";
import { PDFExportButton } from "@/components/assistance/PDFExportButton";
import { AssistanceListPDFTemplate } from "@/components/assistance/AssistanceListPDFTemplate";

interface SupplierAssistancesListProps {
  supplierId: string;
  supplierName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SupplierAssistancesList = ({ 
  supplierId, 
  supplierName, 
  isOpen, 
  onClose 
}: SupplierAssistancesListProps) => {
  const { data: assistances = [], isLoading } = useAssistancesBySupplier(supplierId);


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <DialogTitle className="text-xl">
              Assistências - {supplierName}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {assistances.length} assistência{assistances.length !== 1 ? 's' : ''} encontrada{assistances.length !== 1 ? 's' : ''}
            </p>
          </div>
          <PDFExportButton 
            filename={`assistencias-${supplierName.toLowerCase().replace(/\s+/g, '-')}`}
            variant="outline"
            size="sm"
          >
            <AssistanceListPDFTemplate 
              assistances={assistances}
              title={`Assistências - ${supplierName}`}
              filters={{ supplier: supplierName }}
            />
          </PDFExportButton>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
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
          ) : assistances.length === 0 ? (
            <Card className="p-8">
              <div className="text-center space-y-2">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-semibold">Nenhuma assistência encontrada</h3>
                <p className="text-muted-foreground">
                  Este fornecedor ainda não tem assistências atribuídas.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {assistances.map((assistance) => (
                <Card key={assistance.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg">{assistance.title}</CardTitle>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={assistance.status} />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {assistance.id.slice(0, 8)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {assistance.description && (
                      <p className="text-sm text-muted-foreground">
                        {assistance.description}
                      </p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{assistance.buildings?.name}</span>
                        {assistance.buildings?.nif && (
                          <span className="text-muted-foreground">
                            (NIF: {assistance.buildings.nif})
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {format(new Date(assistance.created_at), "dd/MM/yyyy", { locale: pt })}
                        </span>
                      </div>
                      
                      {assistance.intervention_types && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>{assistance.intervention_types.name}</span>
                        </div>
                      )}
                      
                      {(assistance.estimated_cost || assistance.final_cost) && (
                        <div className="flex items-center gap-2">
                          <Euro className="h-4 w-4 text-muted-foreground" />
                          <span>
                            €{assistance.final_cost || assistance.estimated_cost}
                            {assistance.final_cost ? '' : ' (estimado)'}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};