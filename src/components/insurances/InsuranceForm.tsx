import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBuildings } from "@/hooks/useBuildings";
import { CoverageType, InsuranceInput, InsuranceStatusRow, useUpsertInsurance } from "@/hooks/useInsurances";
import { addYears, format } from "date-fns";
import { CalendarCheck2 } from "lucide-react";

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

  useEffect(() => {
    if (!open) return;
    if (mode === "renew" && prefill) {
      // Renovação: copia os dados, sugere +1 ano
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
    } else {
      setBuildingId(defaultBuildingId ?? "");
      setPolicyNumber(""); setInsurer(""); setBroker(""); setContact("");
      setCoverageType("multirisco"); setFractionsIncluded(""); setObservations("");
      setRenewalDate(format(addYears(new Date(), 1), "yyyy-MM-dd"));
    }
  }, [open, mode, prefill, defaultBuildingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingId) return;

    const payload: InsuranceInput = {
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
    };

    await upsert.mutateAsync(payload);
    onOpenChange(false);
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
                  <SelectItem key={b.id} value={b.id}>{b.code} - {b.name}</SelectItem>
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
            <Label>Fracções incluídas</Label>
            <Input value={fractionsIncluded} onChange={e => setFractionsIncluded(e.target.value)} placeholder="Ex: CV DT / RC ESQ / 1º DT..." />
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
            <Label>Observações</Label>
            <Textarea value={observations} onChange={e => setObservations(e.target.value)} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={upsert.isPending || !buildingId}>
              {upsert.isPending ? "A guardar..." : title}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
