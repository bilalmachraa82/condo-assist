import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Save, Loader2 } from "lucide-react";
import { ASSEMBLY_CATEGORIES } from "@/utils/assemblyCategories";
import { useBuildings } from "@/hooks/useBuildings";
import { useCreateAssemblyItem, useUpdateAssemblyItem, type AssemblyItem } from "@/hooks/useAssemblyItems";

interface Props {
  item?: AssemblyItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBuildingId?: string | null;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "in_progress", label: "Em Curso" },
  { value: "done", label: "Resolvido" },
  { value: "cancelled", label: "Cancelado" },
];

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgente" },
  { value: "high", label: "Alta" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Baixa" },
];

export default function AssemblyForm({ item, open, onOpenChange }: Props) {
  const { data: buildings } = useBuildings();
  const createMutation = useCreateAssemblyItem();
  const updateMutation = useUpdateAssemblyItem();
  const isEdit = !!item;

  const [form, setForm] = useState({
    building_id: "",
    year: new Date().getFullYear(),
    description: "",
    category: "",
    status: "pending",
    priority: "normal",
    status_notes: "",
    assigned_to: "",
    estimated_cost: "",
    resolution_date: "",
  });

  useEffect(() => {
    if (open && item) {
      setForm({
        building_id: item.building_id || "",
        year: item.year,
        description: item.description,
        category: item.category || "",
        status: item.status,
        priority: item.priority || "normal",
        status_notes: item.status_notes || "",
        assigned_to: item.assigned_to || "",
        estimated_cost: item.estimated_cost ? String(item.estimated_cost) : "",
        resolution_date: item.resolution_date || "",
      });
    } else if (open && !item) {
      setForm({
        building_id: "",
        year: new Date().getFullYear(),
        description: "",
        category: "",
        status: "pending",
        priority: "normal",
        status_notes: "",
        assigned_to: "",
        estimated_cost: "",
        resolution_date: "",
      });
    }
  }, [open, item]);

  const handleSubmit = () => {
    const building = buildings?.find((b) => b.id === form.building_id);
    const payload = {
      building_id: form.building_id || null,
      building_code: building ? parseInt(building.code, 10) || 0 : 0,
      building_address: building?.address || null,
      year: form.year,
      description: form.description,
      category: form.category || null,
      status: form.status,
      priority: form.priority,
      status_notes: form.status_notes || null,
      assigned_to: form.assigned_to || null,
      estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
      resolution_date: form.resolution_date || null,
    };

    if (isEdit && item) {
      updateMutation.mutate({ id: item.id, ...payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createMutation.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Assunto" : "Novo Assunto"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Building */}
          <div className="space-y-1.5">
            <Label>Edifício *</Label>
            <Select value={form.building_id} onValueChange={(v) => setForm((f) => ({ ...f, building_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecionar edifício" /></SelectTrigger>
              <SelectContent>
                {buildings?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.code} - {b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year */}
          <div className="space-y-1.5">
            <Label>Ano</Label>
            <Input type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: parseInt(e.target.value) || new Date().getFullYear() }))} />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Descrição *</Label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={4} placeholder="Texto do assunto da acta..." />
          </div>

          {/* Category + Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {ASSEMBLY_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Priority + Cost row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Custo estimado (€)</Label>
              <Input type="number" step="0.01" value={form.estimated_cost} onChange={(e) => setForm((f) => ({ ...f, estimated_cost: e.target.value }))} placeholder="0.00" />
            </div>
          </div>

          {/* Assigned + Resolution date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Atribuído a</Label>
              <Input value={form.assigned_to} onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))} placeholder="Nome/empresa" />
            </div>
            <div className="space-y-1.5">
              <Label>Data resolução</Label>
              <Input type="date" value={form.resolution_date} onChange={(e) => setForm((f) => ({ ...f, resolution_date: e.target.value }))} />
            </div>
          </div>

          {/* Status notes */}
          <div className="space-y-1.5">
            <Label>Notas de seguimento</Label>
            <Textarea value={form.status_notes} onChange={(e) => setForm((f) => ({ ...f, status_notes: e.target.value }))} rows={2} placeholder="Notas sobre o estado..." />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isPending || !form.description || !form.building_id}>
              {isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              {isEdit ? "Guardar" : "Criar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
