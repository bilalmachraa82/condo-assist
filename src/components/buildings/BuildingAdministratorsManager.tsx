import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Save, UserCog } from "lucide-react";
import {
  useBuildingAdministrators, useUpsertBuildingAdministrator,
  useDeleteBuildingAdministrator, MAX_ADMINS_PER_BUILDING,
  type BuildingAdministrator,
} from "@/hooks/useBuildingAdministrators";
import { useToast } from "@/hooks/use-toast";

interface Props { buildingId: string; }

interface DraftAdmin {
  id?: string;
  name: string;
  email: string;
  phone: string;
  floor: string;
  role: string;
  notes: string;
  is_primary: boolean;
}

const empty: DraftAdmin = { name: "", email: "", phone: "", floor: "", role: "", notes: "", is_primary: false };

function toDraft(a: BuildingAdministrator): DraftAdmin {
  return {
    id: a.id, name: a.name, email: a.email ?? "", phone: a.phone ?? "",
    floor: a.floor ?? "", role: a.role ?? "", notes: a.notes ?? "", is_primary: a.is_primary,
  };
}

export default function BuildingAdministratorsManager({ buildingId }: Props) {
  const { data: admins = [], isLoading } = useBuildingAdministrators(buildingId);
  const upsert = useUpsertBuildingAdministrator();
  const remove = useDeleteBuildingAdministrator();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, DraftAdmin>>({});
  const [adding, setAdding] = useState<DraftAdmin | null>(null);

  const getDraft = (a: BuildingAdministrator): DraftAdmin =>
    drafts[a.id] ?? toDraft(a);

  const setDraftField = (id: string, k: keyof DraftAdmin, v: any) =>
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? toDraft(admins.find((x) => x.id === id)!)), [k]: v } }));

  const save = async (id: string) => {
    const d = drafts[id]; if (!d) return;
    if (!d.name.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    await upsert.mutateAsync({
      id, building_id: buildingId,
      name: d.name.trim(),
      email: d.email || null,
      phone: d.phone || null,
      floor: d.floor || null,
      role: d.role || null,
      notes: d.notes || null,
      is_primary: d.is_primary,
    });
    setDrafts((s) => { const c = { ...s }; delete c[id]; return c; });
  };

  const create = async () => {
    if (!adding) return;
    if (!adding.name.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    await upsert.mutateAsync({
      building_id: buildingId,
      name: adding.name.trim(),
      email: adding.email || null,
      phone: adding.phone || null,
      floor: adding.floor || null,
      role: adding.role || null,
      notes: adding.notes || null,
      is_primary: adding.is_primary,
      display_order: admins.length,
    });
    setAdding(null);
  };

  const canAdd = admins.length < MAX_ADMINS_PER_BUILDING;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCog className="h-4 w-4 text-primary" />
          <h4 className="font-medium">Administradores ({admins.length}/{MAX_ADMINS_PER_BUILDING})</h4>
        </div>
        {canAdd && !adding && (
          <Button type="button" size="sm" variant="outline" onClick={() => setAdding({ ...empty })}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}

      {admins.map((a) => {
        const d = getDraft(a);
        const dirty = !!drafts[a.id];
        return (
          <Card key={a.id} className={dirty ? "border-primary/50" : ""}>
            <CardContent className="p-3 space-y-2">
              <div className="grid sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Nome *</Label>
                  <Input value={d.name} onChange={(e) => setDraftField(a.id, "name", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={d.email} onChange={(e) => setDraftField(a.id, "email", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Telemóvel</Label>
                  <Input value={d.phone} onChange={(e) => setDraftField(a.id, "phone", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Andar / Fração</Label>
                  <Input value={d.floor} onChange={(e) => setDraftField(a.id, "floor", e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Cargo / Notas</Label>
                  <Textarea rows={2} value={d.notes} onChange={(e) => setDraftField(a.id, "notes", e.target.value)} />
                </div>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={d.is_primary} onCheckedChange={(v) => setDraftField(a.id, "is_primary", v)} />
                  Administrador principal
                </label>
                <div className="flex gap-2">
                  {dirty && (
                    <Button type="button" size="sm" onClick={() => save(a.id)} disabled={upsert.isPending}>
                      <Save className="h-4 w-4 mr-1" /> Guardar
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="ghost" className="text-destructive"
                    onClick={() => remove.mutate({ id: a.id, buildingId })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {adding && (
        <Card className="border-primary/50">
          <CardContent className="p-3 space-y-2">
            <div className="grid sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Nome *</Label>
                <Input value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" value={adding.email} onChange={(e) => setAdding({ ...adding, email: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Telemóvel</Label>
                <Input value={adding.phone} onChange={(e) => setAdding({ ...adding, phone: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Andar / Fração</Label>
                <Input value={adding.floor} onChange={(e) => setAdding({ ...adding, floor: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Cargo / Notas</Label>
                <Textarea rows={2} value={adding.notes} onChange={(e) => setAdding({ ...adding, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={adding.is_primary} onCheckedChange={(v) => setAdding({ ...adding, is_primary: v })} />
                Administrador principal
              </label>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setAdding(null)}>Cancelar</Button>
                <Button type="button" size="sm" onClick={create} disabled={upsert.isPending}>Adicionar</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {admins.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground text-center py-3">Sem administradores registados.</p>
      )}
    </div>
  );
}
