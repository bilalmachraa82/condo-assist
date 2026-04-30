import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBuildings } from "@/hooks/useBuildings";
import { useCreateInspection, useInspectionCategories } from "@/hooks/useInspections";
import { format, addYears } from "date-fns";
import { CalendarCheck2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultBuildingId?: string;
  defaultCategoryId?: string;
}

export function InspectionForm({ open, onOpenChange, defaultBuildingId, defaultCategoryId }: Props) {
  const { data: buildings } = useBuildings();
  const { data: categories } = useInspectionCategories();
  const createMut = useCreateInspection();

  const [buildingId, setBuildingId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [inspectionDate, setInspectionDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [result, setResult] = useState<"ok" | "nok_minor" | "nok_major" | "pending_works">("ok");
  const [companyName, setCompanyName] = useState("");
  const [companyContact, setCompanyContact] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setBuildingId(defaultBuildingId ?? "");
      setCategoryId(defaultCategoryId ?? "");
      setInspectionDate(format(new Date(), "yyyy-MM-dd"));
      setResult("ok");
      setCompanyName(""); setCompanyContact(""); setNotes("");
    }
  }, [open, defaultBuildingId, defaultCategoryId]);

  const selectedCategory = useMemo(
    () => categories?.find(c => c.id === categoryId),
    [categories, categoryId]
  );

  const nextDue = useMemo(() => {
    if (!selectedCategory || !inspectionDate) return null;
    return addYears(new Date(inspectionDate), selectedCategory.validity_years);
  }, [selectedCategory, inspectionDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingId || !categoryId || !inspectionDate) return;
    await createMut.mutateAsync({
      building_id: buildingId,
      category_id: categoryId,
      inspection_date: inspectionDate,
      result,
      company_name: companyName || null,
      company_contact: companyContact || null,
      notes: notes || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registar inspeção</DialogTitle>
          <DialogDescription>A próxima data é calculada automaticamente com base no tipo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label>Edifício</Label>
            <Select value={buildingId} onValueChange={setBuildingId}>
              <SelectTrigger><SelectValue placeholder="Selecionar edifício" /></SelectTrigger>
              <SelectContent>
                {buildings?.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.code} - {b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <Label>Resultado</Label>
              <Select value={result} onValueChange={(v) => setResult(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ok">OK / Conforme</SelectItem>
                  <SelectItem value="nok_minor">Não conforme menor</SelectItem>
                  <SelectItem value="nok_major">Não conforme maior</SelectItem>
                  <SelectItem value="pending_works">Obras pendentes</SelectItem>
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

          <div className="grid gap-2">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={createMut.isPending || !buildingId || !categoryId}>
              {createMut.isPending ? "A guardar..." : "Registar inspeção"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
