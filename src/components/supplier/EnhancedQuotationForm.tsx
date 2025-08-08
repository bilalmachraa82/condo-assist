import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Euro, Calendar, FileText, Plus, X, Upload } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface EnhancedQuotationFormProps {
  assistanceId: string;
  supplierId: string;
  onQuotationSubmitted: () => void;
}

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function EnhancedQuotationForm({ 
  assistanceId, 
  supplierId, 
  onQuotationSubmitted 
}: EnhancedQuotationFormProps) {
  const [items, setItems] = useState<QuotationItem[]>([
    { id: "1", description: "", quantity: 1, unitPrice: 0, total: 0 }
  ]);
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [validityDays, setValidityDays] = useState(30);
  const [laborCost, setLaborCost] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quotationFile, setQuotationFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>("");
  const [pdfAmount, setPdfAmount] = useState(0);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const magicCode = new URLSearchParams(window.location.search).get('code');

  const addItem = () => {
    const newItem: QuotationItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof QuotationItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const materialTotal = items.reduce((sum, item) => sum + item.total, 0);
  const totalAmount = uploadedFileUrl ? pdfAmount : materialTotal + laborCost;

  const handleFileUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `quotation_${assistanceId}_${supplierId}_${Date.now()}.${fileExt}`;
      const filePath = `quotations/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('assistance-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('assistance-photos')
        .getPublicUrl(filePath);

      setUploadedFileUrl(publicUrl);
      toast({
        title: "Ficheiro carregado",
        description: "O ficheiro PDF foi carregado com sucesso.",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Erro no upload",
        description: "Erro ao carregar o ficheiro. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const finalDescription = uploadedFileUrl ? `Orçamento PDF: ${description}` : description;
      const finalNotes = uploadedFileUrl ? `${notes}\n\nDocumento anexo: ${uploadedFileUrl}` : notes;

      if (magicCode) {
        const { data, error } = await (supabase as any).rpc('create_quotation_via_code', {
          p_magic_code: magicCode,
          p_amount: totalAmount,
          p_description: finalDescription,
          p_notes: finalNotes,
          p_validity_days: validityDays,
          p_assistance_id: assistanceId,
        });
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("quotations")
          .insert({
            assistance_id: assistanceId,
            supplier_id: supplierId,
            amount: totalAmount,
            description: finalDescription,
            notes: finalNotes,
            validity_days: validityDays,
            submitted_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        // Log activity (handled inside RPC path already)
        await supabase
          .from("activity_log")
          .insert({
            assistance_id: assistanceId,
            supplier_id: supplierId,
            action: "quotation_submitted",
            details: `Orçamento submetido no valor de €${totalAmount.toFixed(2)}`,
            metadata: {
              amount: totalAmount,
              items: items.map(item => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total
              })),
              labor_cost: laborCost,
              validity_days: validityDays
            }
          });

        return data;
      }
    },
    onSuccess: () => {
      toast({
        title: "Orçamento submetido",
        description: "O seu orçamento foi submetido com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-assistances"] });
      onQuotationSubmitted();
    },
    onError: (error: any) => {
      console.error("Submit quotation error:", error);
      toast({
        title: "Erro",
        description: "Erro ao submeter orçamento. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, adicione uma descrição ao orçamento.",
        variant: "destructive",
      });
      return;
    }

    if (totalAmount <= 0) {
      toast({
        title: "Erro",
        description: "O valor total deve ser superior a zero.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitMutation.mutateAsync();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Euro className="h-5 w-5" />
          Submeter Orçamento
        </CardTitle>
        <CardDescription>
          Crie um orçamento detalhado manualmente ou envie um documento PDF
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">📄 Upload PDF</TabsTrigger>
            <TabsTrigger value="manual">✍️ Manual</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição Geral do Trabalho *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o trabalho a realizar..."
                  rows={3}
                  required
                />
              </div>

              {/* Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Materiais e Serviços</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Item
                  </Button>
                </div>

                {items.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Item {index + 1}</span>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <Label>Descrição</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          placeholder="Ex: Tinta branca 15L"
                        />
                      </div>
                      <div>
                        <Label>Quantidade</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <Label>Preço Unitário (€)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-medium">
                        Subtotal: €{item.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Labor Cost */}
              <div className="space-y-2">
                <Label htmlFor="laborCost">Custo de Mão de Obra (€)</Label>
                <Input
                  id="laborCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={laborCost}
                  onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span>Materiais:</span>
                  <span>€{materialTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mão de Obra:</span>
                  <span>€{laborCost.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>€{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Validity */}
              <div className="space-y-2">
                <Label htmlFor="validity">Validade do Orçamento</Label>
                <Select value={validityDays.toString()} onValueChange={(value) => setValidityDays(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="45">45 dias</SelectItem>
                    <SelectItem value="60">60 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Observações Adicionais</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Condições especiais, garantias, prazos de execução..."
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={isSubmitting || totalAmount <= 0}
                className="w-full"
                size="lg"
              >
                <FileText className="h-4 w-4 mr-2" />
                {isSubmitting ? "A submeter..." : `Submeter Orçamento (€${totalAmount.toFixed(2)})`}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="upload" className="space-y-6">
            <div className="border-2 border-dashed border-primary/25 rounded-lg p-6 text-center bg-primary/5">
              <FileText className="h-12 w-12 mx-auto mb-3 text-primary" />
              <h3 className="text-lg font-medium mb-2 text-primary">📄 Opção Recomendada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload rápido do seu orçamento PDF completo
              </p>
              
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setQuotationFile(file);
                    handleFileUpload(file);
                  }
                }}
                className="hidden"
                id="quotation-upload"
              />
              
              <Button
                type="button"
                size="lg"
                onClick={() => document.getElementById('quotation-upload')?.click()}
                className="mb-4 h-12 text-lg"
              >
                <Upload className="h-5 w-5 mr-2" />
                Selecionar Ficheiro PDF
              </Button>
              
              {quotationFile && (
                <div className="text-sm text-green-600 mt-2">
                  ✓ {quotationFile.name}
                </div>
              )}
            </div>

            {uploadedFileUrl && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pdf-amount">Valor Total do Orçamento (€) *</Label>
                  <Input
                    id="pdf-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={pdfAmount}
                    onChange={(e) => setPdfAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="pdf-description">Descrição do Trabalho *</Label>
                  <Textarea
                    id="pdf-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva resumidamente o trabalho a realizar..."
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="pdf-validity">Validade do Orçamento</Label>
                  <Select value={validityDays.toString()} onValueChange={(value) => setValidityDays(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                      <SelectItem value="45">45 dias</SelectItem>
                      <SelectItem value="60">60 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="pdf-notes">Observações Adicionais</Label>
                  <Textarea
                    id="pdf-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Condições especiais, garantias, prazos de execução..."
                    rows={3}
                  />
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Valor Total:</span>
                    <span>€{pdfAmount.toFixed(2)}</span>
                  </div>
                </div>

                <Button 
                  type="button" 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !uploadedFileUrl || pdfAmount <= 0 || !description.trim()}
                  className="w-full"
                  size="lg"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {isSubmitting ? "A submeter..." : `Submeter Orçamento PDF (€${pdfAmount.toFixed(2)})`}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}