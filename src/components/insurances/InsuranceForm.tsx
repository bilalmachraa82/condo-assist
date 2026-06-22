import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBuildings } from "@/hooks/useBuildings";
import { CoverageType, InsuranceInput, InsuranceStatusRow, useUpsertInsurance, useBuildingFractions, useInsuranceFractionStatus, useSaveInsuranceFractionStatus, useUpsertBuildingFraction, useDeleteBuildingFraction, type FractionStatusValue } from "@/hooks/useInsurances";
import { addYears, format } from "date-fns";
import { CalendarCheck2, Plus, Trash2, Upload, FileText, Eye, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatBuildingLabel } from "@/utils/buildingDisplay";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultBuildingId?: string;
  /** If passed, prefills form for renewal/edit */
  prefill?: Partial<InsuranceStatusRow> & { insurance_id?: string | null };
  mode?: "create" | "renew" | "edit";
}

export function InsuranceForm({ open, onOpenChange, defaultBuildingId, prefill, mode = "create" }: Props) {
  const { data: buildings } = useBuildings();
  const upsert = useUpsertInsurance();

  const [buildingId, setBuildingId] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [insurer, setInsurer] = useState("");
  const [broker, setBroker] = useState("");
  const [contact, setContact] = useState("");
  const [coverageType, setCoverageType] = useState<CoverageType>("multirisco");
  const [fractionsIncluded, setFractionsIncluded] = useState("");
  const [observations, setObservations] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [policyFile, setPolicyFile] = useState<File | null>(null);
  const [existingPolicyPath, setExistingPolicyPath] = useState<string | null>(null);
  const [uploadingPolicy, setUploadingPolicy] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setPolicyFile(null);
    if (mode === "renew" && prefill) {
      setBuildingId(prefill.building_id ?? defaultBuildingId ?? "");
      setPolicyNumber(prefill.policy_number ?? "");
      setInsurer(prefill.insurer ?? "");
      setBroker(prefill.broker ?? "");
      setContact(prefill.contact ?? "");
      setCoverageType((prefill.coverage_type as CoverageType) ?? "multirisco");
      setFractionsIncluded(prefill.fractions_included ?? "");
      setObservations(prefill.observations ?? "");
      const base = prefill.renewal_date ? new Date(prefill.renewal_date) : new Date();
      setRenewalDate(format(addYears(base, 1), "yyyy-MM-dd"));
      setExistingPolicyPath(null); // nova apólice
    } else if (mode === "edit" && prefill) {
      setBuildingId(prefill.building_id ?? "");
      setPolicyNumber(prefill.policy_number ?? "");
      setInsurer(prefill.insurer ?? "");
      setBroker(prefill.broker ?? "");
      setContact(prefill.contact ?? "");
      setCoverageType((prefill.coverage_type as CoverageType) ?? "multirisco");
      setFractionsIncluded(prefill.fractions_included ?? "");
      setObservations(prefill.observations ?? "");
      setRenewalDate(prefill.renewal_date ?? "");
      setExistingPolicyPath((prefill as any)?.policy_path ?? null);
    } else {
      setBuildingId(defaultBuildingId ?? "");
      setPolicyNumber(""); setInsurer(""); setBroker(""); setContact("");
      setCoverageType("multirisco"); setFractionsIncluded(""); setObservations("");
      setRenewalDate(format(addYears(new Date(), 1), "yyyy-MM-dd"));
      setExistingPolicyPath(null);
    }
  }, [open, mode, prefill, defaultBuildingId]);

  const fractionsQ = useBuildingFractions(buildingId || undefined);
  const insuranceId = mode === "edit" ? prefill?.insurance_id ?? null : null;
  const fractionStatusQ = useInsuranceFractionStatus(insuranceId);
  const saveFractionStatus = useSaveInsuranceFractionStatus();
  const upsertFraction = useUpsertBuildingFraction();
  const deleteFraction = useDeleteBuildingFraction();

  // Local state of fraction inclusion: id -> 'included' | 'excluded' | undefined (untouched)
  const [fractionState, setFractionState] = useState<Record<string, FractionStatusValue>>({});
  const [newFractionLabel, setNewFractionLabel] = useState("");

  useEffect(() => {
    if (fractionStatusQ.data) {
      const m: Record<string, FractionStatusValue> = {};
      fractionStatusQ.data.forEach((s) => { m[s.fraction_id] = s.status; });
      setFractionState(m);
    } else {
      setFractionState({});
    }
  }, [fractionStatusQ.data, insuranceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingId) return;

    let policyPath: string | null | undefined = undefined;
    if (policyFile) {
      try {
        setUploadingPolicy(true);
        const ext = policyFile.name.split(".").pop() || "pdf";
        const path = `${buildingId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("insurance-documents")
          .upload(path, policyFile, { upsert: false, contentType: policyFile.type || undefined });
        if (upErr) throw upErr;
        policyPath = path;
      } catch (err: any) {
        toast({ title: "Erro a carregar apólice", description: err.message, variant: "destructive" });
        setUploadingPolicy(false);
        return;
      } finally {
        setUploadingPolicy(false);
      }
    }

    const payload: InsuranceInput & { policy_path?: string | null } = {
      id: mode === "edit" ? prefill?.insurance_id ?? undefined : undefined,
      building_id: buildingId,
      policy_number: policyNumber || null,
      insurer: insurer || null,
      broker: broker || null,
      contact: contact || null,
      coverage_type: coverageType,
      fractions_included: fractionsIncluded || null,
      observations: observations || null,
      renewal_date: renewalDate || null,
      ...(policyPath !== undefined ? { policy_path: policyPath } : {}),
    };

    const saved = await upsert.mutateAsync(payload as InsuranceInput);
    const entries = Object.entries(fractionState)
      .filter(([, v]) => v === "included" || v === "excluded")
      .map(([fraction_id, status]) => ({ fraction_id, status }));
    if (saved?.id && entries.length > 0) {
      await saveFractionStatus.mutateAsync({ insurance_id: saved.id, entries });
    }
    onOpenChange(false);
  };

  const openExistingPolicy = async () => {
    if (!existingPolicyPath) return;
    const { data, error } = await supabase.storage.from("insurance-documents").createSignedUrl(existingPolicyPath, 3600);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    window.open(data.signedUrl, "_blank");
  };

  const title = mode === "renew" ? "Renovar seguro" : mode === "edit" ? "Editar seguro" : "Registar seguro";
  const description = mode === "renew"
    ? "Cria uma nova apólice copiando os dados da actual. A última passa a histórico."
    : "Os alertas serão calculados automaticamente com base na data de renovação.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label>Edifício</Label>
            <Select value={buildingId} onValueChange={setBuildingId} disabled={mode === "edit"}>
              <SelectTrigger><SelectValue placeholder="Selecionar edifício" /></SelectTrigger>
              <SelectContent>
                {buildings?.map(b => (
                  <SelectItem key={b.id} value={b.id}>{formatBuildingLabel(b)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Companhia</Label>
              <Input value={insurer} onChange={e => setInsurer(e.target.value)} placeholder="Ex: Allianz" />
            </div>
            <div className="grid gap-2">
              <Label>Nº Apólice</Label>
              <Input value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} placeholder="Ex: 206512440" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Mediador</Label>
              <Input value={broker} onChange={e => setBroker(e.target.value)} placeholder="Ex: Winsurance" />
            </div>
            <div className="grid gap-2">
              <Label>Tipo de cobertura</Label>
              <Select value={coverageType} onValueChange={(v) => setCoverageType(v as CoverageType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="multirisco">Multirriscos</SelectItem>
                  <SelectItem value="partes_comuns">Partes Comuns</SelectItem>
                  <SelectItem value="acidentes_trabalho">Acidentes de Trabalho</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Contacto</Label>
            <Input value={contact} onChange={e => setContact(e.target.value)} placeholder="Email ou telefone" />
          </div>

          <div className="grid gap-2">
            <Label>Frações</Label>
            {fractionsQ.data && fractionsQ.data.length > 0 ? (
              <div className="rounded-md border divide-y bg-muted/20">
                {fractionsQ.data.map((f) => {
                  const st = fractionState[f.id];
                  return (
                    <div key={f.id} className="flex items-center justify-between px-3 py-2 gap-2">
                      <div className="text-sm flex-1 min-w-0 truncate">
                        <span className="font-medium">{f.label}</span>
                        {f.permillage != null && <span className="text-muted-foreground ml-2 text-xs">{f.permillage}‰</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button type="button" size="sm"
                          variant={st === "included" ? "default" : "outline"}
                          onClick={() => setFractionState((s) => ({ ...s, [f.id]: "included" }))}>
                          Incluída
                        </Button>
                        <Button type="button" size="sm"
                          variant={st === "excluded" ? "destructive" : "outline"}
                          onClick={() => setFractionState((s) => ({ ...s, [f.id]: "excluded" }))}>
                          Excluída
                        </Button>
                        <Button type="button" size="icon" variant="ghost"
                          title="Remover fração do edifício"
                          onClick={() => deleteFraction.mutate({ id: f.id, building_id: buildingId })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Textarea
                value={fractionsIncluded}
                onChange={e => setFractionsIncluded(e.target.value)}
                placeholder="Sem frações registadas. Lista livre (ex: CV DT / RC ESQ / 1º DT...)"
                rows={2}
              />
            )}
            {buildingId && (
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={newFractionLabel}
                  onChange={e => setNewFractionLabel(e.target.value)}
                  placeholder="Adicionar fração (ex: 1º DT)"
                  className="h-8"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!newFractionLabel.trim() || upsertFraction.isPending}
                  onClick={async () => {
                    await upsertFraction.mutateAsync({ building_id: buildingId, label: newFractionLabel.trim() });
                    setNewFractionLabel("");
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Data de renovação</Label>
            <Input type="date" value={renewalDate} onChange={e => setRenewalDate(e.target.value)} />
            {renewalDate && (
              <div className="flex items-center gap-2 rounded-md border bg-emerald-500/10 border-emerald-500/30 p-2 text-sm">
                <CalendarCheck2 className="h-4 w-4 text-emerald-600" />
                <span>Alerta automático em <strong>{format(new Date(new Date(renewalDate).getTime() - 30*86400000), "dd/MM/yyyy")}</strong> (30 dias antes).</span>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Apólice (PDF)</Label>
            {existingPolicyPath && !policyFile && (
              <div className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm bg-muted/30">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">Apólice carregada</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" size="sm" variant="ghost" onClick={openExistingPolicy}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            {policyFile ? (
              <div className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{policyFile.name}</span>
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={() => setPolicyFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setPolicyFile(e.target.files?.[0] ?? null)}
              />
            )}
            {existingPolicyPath && policyFile && (
              <p className="text-xs text-muted-foreground">A nova apólice irá substituir a atual.</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Observações</Label>
            <Textarea value={observations} onChange={e => setObservations(e.target.value)} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={upsert.isPending || uploadingPolicy || !buildingId}>
              {uploadingPolicy ? "A carregar apólice..." : upsert.isPending ? "A guardar..." : title}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
