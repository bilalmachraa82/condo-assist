import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBuildings } from "@/hooks/useBuildings";
import { useCreateInspection, useUpdateInspection, useInspectionCategories } from "@/hooks/useInspections";
import { addYears, format } from "date-fns";
import { CalendarCheck2, Paperclip, FileCheck2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatBuildingLabel } from "@/utils/buildingDisplay";

export type InspectionResult = "aprovado" | "aprovado_clausulas" | "pendente_relatorio" | "chumbou";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultBuildingId?: string;
  defaultCategoryId?: string;
  /** Quando passado, abre em modo edição. */
  editInspection?: {
    id: string;
    building_id: string;
    category_id: string;
    inspection_date: string;
    result: InspectionResult | string;
    company_name?: string | null;
    company_contact?: string | null;
    notes?: string | null;
    certificate_url?: string | null;
  } | null;
}

export function InspectionForm({ open, onOpenChange, defaultBuildingId, defaultCategoryId, editInspection }: Props) {
  const { data: buildings } = useBuildings();
  const { data: categories } = useInspectionCategories();
  const createMut = useCreateInspection();
  const updateMut = useUpdateInspection();
  const { toast } = useToast();
  const isEdit = !!editInspection;

  const [buildingId, setBuildingId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [inspectionDate, setInspectionDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  // Sem default: o utilizador tem de escolher explicitamente o resultado.
  const [result, setResult] = useState<"" | InspectionResult>("");
  const [companyName, setCompanyName] = useState("");
  const [companyContact, setCompanyContact] = useState("");
  const [notes, setNotes] = useState("");
  const [certificatePath, setCertificatePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Migra valores antigos eventualmente vindos da BD (já não devem existir após migração).
  const normalizeOldResult = (r: string | undefined | null): "" | InspectionResult => {
    if (!r) return "";
    if (["aprovado", "aprovado_clausulas", "pendente_relatorio", "chumbou"].includes(r)) return r as InspectionResult;
    if (r === "ok") return "aprovado";
    if (r === "nok_minor") return "aprovado_clausulas";
    if (r === "nok_major" || r === "pending_works") return "chumbou";
    if (r === "pending") return "pendente_relatorio";
    return "";
  };

  useEffect(() => {
    if (!open) return;
    if (editInspection) {
      setBuildingId(editInspection.building_id);
      setCategoryId(editInspection.category_id);
      setInspectionDate(editInspection.inspection_date);
      setResult(normalizeOldResult(editInspection.result as string));
      setCompanyName(editInspection.company_name ?? "");
      setCompanyContact(editInspection.company_contact ?? "");
      setNotes(editInspection.notes ?? "");
      setCertificatePath(editInspection.certificate_url ?? null);
    } else {
      setBuildingId(defaultBuildingId ?? "");
      setCategoryId(defaultCategoryId ?? "");
      setInspectionDate(format(new Date(), "yyyy-MM-dd"));
      setResult("");
      setCompanyName(""); setCompanyContact(""); setNotes(""); setCertificatePath(null);
    }
  }, [open, defaultBuildingId, defaultCategoryId, editInspection]);

  const selectedCategory = useMemo(
    () => categories?.find(c => c.id === categoryId),
    [categories, categoryId]
  );
  const selectedBuilding = useMemo(
    () => buildings?.find(b => b.id === buildingId),
    [buildings, buildingId]
  );

  const nextDue = useMemo(() => {
    if (!selectedCategory || !inspectionDate) return null;
    return addYears(new Date(inspectionDate), selectedCategory.validity_years);
  }, [selectedCategory, inspectionDate]);

  // Etiqueta do anexo conforme categoria: cláusulas para elevadores, certificado para o resto.
  const attachmentLabel = useMemo(() => {
    const k = selectedCategory?.key?.toLowerCase() ?? "";
    if (k.includes("elevador")) return "Cláusulas da inspeção (PDF)";
    if (k.includes("extintor") || k.includes("gas") || k.includes("gás")) return "Certificado (PDF)";
    return "Documento anexo (PDF)";
  }, [selectedCategory]);

  const handleUpload = async (file: File) => {
    if (!buildingId || !selectedCategory) {
      toast({ title: "Selecione edifício e tipo antes de anexar", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "pdf";
      const path = `${buildingId}/${selectedCategory.key}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("inspection-documents").upload(path, file, {
        cacheControl: "3600", upsert: false,
      });
      if (error) throw error;
      setCertificatePath(path);
      toast({ title: "Documento anexado" });
    } catch (e: any) {
      toast({ title: "Erro a anexar", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleViewDoc = async () => {
    if (!certificatePath) return;
    const { data, error } = await supabase.storage
      .from("inspection-documents").createSignedUrl(certificatePath, 60);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    window.open(data.signedUrl, "_blank");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingId || !categoryId || !inspectionDate || !result) return;
    const payload = {
      building_id: buildingId,
      category_id: categoryId,
      inspection_date: inspectionDate,
      result: result as InspectionResult,
      company_name: companyName || null,
      company_contact: companyContact || null,
      notes: notes || null,
      certificate_url: certificatePath,
    };
    if (isEdit && editInspection) {
      await updateMut.mutateAsync({ id: editInspection.id, ...payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar inspeção" : "Registar inspeção"}</DialogTitle>
          <DialogDescription>A próxima data é calculada automaticamente com base no tipo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label>Edifício</Label>
            <Select value={buildingId} onValueChange={setBuildingId}>
              <SelectTrigger><SelectValue placeholder="Selecionar edifício" /></SelectTrigger>
              <SelectContent>
                {buildings?.map(b => (
                  <SelectItem key={b.id} value={b.id}>{formatBuildingLabel(b)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBuilding && selectedCategory?.key?.toLowerCase().includes("elevador") && (
              <p className="text-xs text-muted-foreground">
                Edifício tem <strong>{(selectedBuilding as any).elevator_count ?? 0}</strong> elevador(es) registados.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Tipo de inspeção</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Selecionar tipo" /></SelectTrigger>
              <SelectContent>
                {categories?.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label} <span className="text-muted-foreground">· válido {c.validity_years} anos</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Data inspeção</Label>
              <Input type="date" value={inspectionDate} onChange={e => setInspectionDate(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label>Resultado *</Label>
              <Select value={result} onValueChange={(v) => setResult(v as InspectionResult)}>
                <SelectTrigger><SelectValue placeholder="Escolher resultado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="aprovado_clausulas">Aprovado com Cláusulas</SelectItem>
                  <SelectItem value="pendente_relatorio">Pendente (Aguarda Relatório)</SelectItem>
                  <SelectItem value="chumbou">Chumbou</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {nextDue && (
            <div className="flex items-center gap-2 rounded-md border bg-emerald-500/10 border-emerald-500/30 p-3 text-sm">
              <CalendarCheck2 className="h-4 w-4 text-emerald-600" />
              <span>Próxima inspeção: <strong>{format(nextDue, "dd/MM/yyyy")}</strong></span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Empresa</Label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Ex: Clefta" />
            </div>
            <div className="grid gap-2">
              <Label>Contacto</Label>
              <Input value={companyContact} onChange={e => setCompanyContact(e.target.value)} placeholder="Email/Tel" />
            </div>
          </div>

          {/* Anexo (cláusulas / certificado) */}
          <div className="grid gap-2">
            <Label>{attachmentLabel}</Label>
            {certificatePath ? (
              <div className="flex items-center justify-between rounded-md border bg-muted/30 p-2 text-sm">
                <span className="inline-flex items-center gap-2 truncate">
                  <FileCheck2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="truncate">{certificatePath.split("/").pop()}</span>
                </span>
                <div className="flex gap-1 shrink-0">
                  <Button type="button" size="sm" variant="ghost" onClick={handleViewDoc}>Ver</Button>
                  <Button type="button" size="sm" variant="ghost"
                    onClick={() => setCertificatePath(null)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ) : (
              <label className="flex items-center gap-2 rounded-md border border-dashed p-2 cursor-pointer hover:bg-muted/30 text-sm">
                <Paperclip className="h-4 w-4" />
                <span className="flex-1">{uploading ? "A enviar..." : "Clique para anexar PDF"}</span>
                <Input
                  type="file" accept="application/pdf,image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={createMut.isPending || updateMut.isPending || !buildingId || !categoryId || !result}>
              {(createMut.isPending || updateMut.isPending) ? "A guardar..." : (isEdit ? "Guardar alterações" : "Registar inspeção")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
