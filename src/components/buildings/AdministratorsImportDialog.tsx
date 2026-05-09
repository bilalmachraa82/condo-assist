import { useState, useCallback, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBuildings } from "@/hooks/useBuildings";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { MAX_ADMINS_PER_BUILDING } from "@/hooks/useBuildingAdministrators";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface AdminDraft {
  rowIndex: number;
  building_code: string;
  building_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  floor: string | null;
  notes: string | null;
  is_primary: boolean;
}

interface RowError {
  rowIndex: number;
  building_code: string;
  name: string;
  reason: string;
}

type Phase = "idle" | "preview" | "importing" | "done";

const cellStr = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "number") return String(v);
  return String(v).trim();
};

const normalizeCode = (raw: string): string | null => {
  if (!raw) return null;
  const m = raw.match(/(\d{1,4})/);
  if (!m) return null;
  return m[1].padStart(3, "0");
};

const isValidEmail = (e: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function parseAdmins(rows: unknown[][]): { drafts: AdminDraft[]; errors: RowError[] } {
  const drafts: AdminDraft[] = [];
  const errors: RowError[] = [];
  let currentCode = "";
  let primaryAssigned = new Set<string>();

  // Skip first 2 header rows
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i] || [];
    const codeRaw = cellStr(r[0]);
    if (codeRaw) {
      const c = normalizeCode(codeRaw);
      if (c) currentCode = c;
    }
    const name = cellStr(r[1]);
    if (!name) continue;
    if (!currentCode) {
      errors.push({ rowIndex: i + 1, building_code: "?", name, reason: "Sem código de edifício" });
      continue;
    }

    const phone = cellStr(r[2]);
    const floor = cellStr(r[3]);
    const email = cellStr(r[4]);
    const condEmail = cellStr(r[5]);
    const emergency = cellStr(r[6]);
    const obs = cellStr(r[7]);

    if (email && !isValidEmail(email)) {
      errors.push({ rowIndex: i + 1, building_code: currentCode, name, reason: `Email inválido: ${email}` });
      continue;
    }

    const notesParts: string[] = [];
    if (condEmail) notesParts.push(`Email Condomínio: ${condEmail}`);
    if (emergency) notesParts.push(`Emergências: ${emergency}`);
    if (obs) notesParts.push(`Obs: ${obs}`);

    const isPrimary = !primaryAssigned.has(currentCode);
    primaryAssigned.add(currentCode);

    drafts.push({
      rowIndex: i + 1,
      building_code: currentCode,
      building_id: null,
      name,
      email: email || null,
      phone: phone || null,
      floor: floor || null,
      notes: notesParts.length ? notesParts.join("\n") : null,
      is_primary: isPrimary,
    });
  }
  return { drafts, errors };
}

export default function AdministratorsImportDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: buildings = [] } = useBuildings();
  const [phase, setPhase] = useState<Phase>("idle");
  const [fileName, setFileName] = useState("");
  const [drafts, setDrafts] = useState<AdminDraft[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [replaceExisting, setReplaceExisting] = useState(false);

  const buildingMap = useMemo(() => {
    const m = new Map<string, { id: string; name: string }>();
    for (const b of buildings as any[]) m.set(String(b.code), { id: b.id, name: b.name });
    return m;
  }, [buildings]);

  const reset = () => {
    setPhase("idle"); setDrafts([]); setErrors([]); setProgress(0);
    setImportedCount(0); setFileName(""); setReplaceExisting(false);
  };

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { cellDates: true });
      const sheetName =
        wb.SheetNames.find((n) => /administra/i.test(n)) ?? wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1, defval: "", raw: true,
      });
      const { drafts: parsed, errors: parseErrs } = parseAdmins(rows);

      // Validate against buildings
      const finalDrafts: AdminDraft[] = [];
      const finalErrs: RowError[] = [...parseErrs];
      const perBuildingCount: Record<string, number> = {};

      for (const d of parsed) {
        const b = buildingMap.get(d.building_code);
        if (!b) {
          finalErrs.push({
            rowIndex: d.rowIndex, building_code: d.building_code,
            name: d.name, reason: "Edifício não encontrado",
          });
          continue;
        }
        perBuildingCount[d.building_code] = (perBuildingCount[d.building_code] || 0) + 1;
        if (perBuildingCount[d.building_code] > MAX_ADMINS_PER_BUILDING) {
          finalErrs.push({
            rowIndex: d.rowIndex, building_code: d.building_code,
            name: d.name, reason: `Excede limite de ${MAX_ADMINS_PER_BUILDING} por edifício`,
          });
          continue;
        }
        finalDrafts.push({ ...d, building_id: b.id });
      }
      setDrafts(finalDrafts);
      setErrors(finalErrs);
      setPhase("preview");
    } catch (e: any) {
      toast({ title: "Erro a ler ficheiro", description: e.message, variant: "destructive" });
    }
  }, [buildingMap, toast]);

  const runImport = async () => {
    if (drafts.length === 0) return;
    setPhase("importing"); setProgress(0); setImportedCount(0);

    const byBuilding = new Map<string, AdminDraft[]>();
    for (const d of drafts) {
      const arr = byBuilding.get(d.building_id!) ?? [];
      arr.push(d);
      byBuilding.set(d.building_id!, arr);
    }

    const total = drafts.length;
    let done = 0;
    const newErrs: RowError[] = [...errors];

    const buildingIds = Array.from(byBuilding.keys());
    for (let bi = 0; bi < buildingIds.length; bi++) {
      const bId = buildingIds[bi];
      const items = byBuilding.get(bId)!;

      if (replaceExisting) {
        const { error: delErr } = await supabase
          .from("building_administrators").delete().eq("building_id", bId);
        if (delErr) {
          for (const it of items) newErrs.push({
            rowIndex: it.rowIndex, building_code: it.building_code,
            name: it.name, reason: `Falha a limpar existentes: ${delErr.message}`,
          });
          done += items.length;
          setProgress(Math.round((done / total) * 100));
          continue;
        }
      } else {
        const { count } = await supabase
          .from("building_administrators")
          .select("id", { count: "exact", head: true })
          .eq("building_id", bId);
        const existing = count ?? 0;
        const allowed = Math.max(0, MAX_ADMINS_PER_BUILDING - existing);
        if (allowed < items.length) {
          for (const it of items.slice(allowed)) newErrs.push({
            rowIndex: it.rowIndex, building_code: it.building_code, name: it.name,
            reason: `Edifício já tem ${existing} administradores (limite ${MAX_ADMINS_PER_BUILDING})`,
          });
          items.length = allowed;
        }
      }

      if (items.length > 0) {
        const payload = items.map((d, idx) => ({
          building_id: d.building_id!,
          name: d.name,
          email: d.email,
          phone: d.phone,
          floor: d.floor,
          notes: d.notes,
          is_primary: d.is_primary,
          display_order: idx,
        }));
        const { error } = await supabase.from("building_administrators").insert(payload);
        if (error) {
          for (const it of items) newErrs.push({
            rowIndex: it.rowIndex, building_code: it.building_code,
            name: it.name, reason: error.message,
          });
        } else {
          setImportedCount((c) => c + items.length);
        }
      }

      done += byBuilding.get(bId)!.length;
      setProgress(Math.round((done / total) * 100));
    }

    setErrors(newErrs);
    setPhase("done");
    qc.invalidateQueries({ queryKey: ["building-administrators"] });
    toast({
      title: "Importação concluída",
      description: `${importedCount + (total - newErrs.length + errors.length)} administradores importados`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Importar administradores
          </DialogTitle>
          <DialogDescription>
            Carregar ficheiro Excel/CSV com folha "Administradores" — colunas:
            Prédio nº, Nome, Telemóvel, Andar, Email, Email Condomínio, Emergências, Observações.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {phase === "idle" && (
            <label className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/50 transition">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm">Clica para selecionar (.xlsx, .xls, .csv)</p>
              <Input
                type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
          )}

          {(phase === "preview" || phase === "importing" || phase === "done") && (
            <>
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="h-4 w-4" />
                <span className="font-medium">{fileName}</span>
                <Badge variant="outline">{drafts.length} válidos</Badge>
                {errors.length > 0 && (
                  <Badge variant="destructive">{errors.length} com erro</Badge>
                )}
              </div>

              {phase === "preview" && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)} />
                  Substituir administradores existentes destes edifícios
                </label>
              )}

              {phase === "importing" && (
                <div className="space-y-1">
                  <Progress value={progress} />
                  <p className="text-xs text-muted-foreground">{progress}%</p>
                </div>
              )}

              {phase === "done" && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Importação concluída</AlertTitle>
                  <AlertDescription>
                    Importados com sucesso. {errors.length > 0 && `${errors.length} linhas com erro abaixo.`}
                  </AlertDescription>
                </Alert>
              )}

              {drafts.length > 0 && phase === "preview" && (
                <div className="border rounded-md overflow-auto max-h-72">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Edifício</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telemóvel</TableHead>
                        <TableHead>Andar</TableHead>
                        <TableHead>Principal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drafts.map((d) => (
                        <TableRow key={d.rowIndex}>
                          <TableCell className="font-mono text-xs">{d.building_code}</TableCell>
                          <TableCell>{d.name}</TableCell>
                          <TableCell className="text-xs">{d.email}</TableCell>
                          <TableCell className="text-xs">{d.phone}</TableCell>
                          <TableCell className="text-xs">{d.floor}</TableCell>
                          <TableCell>{d.is_primary && <Badge>P</Badge>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Linhas com erro ({errors.length})</AlertTitle>
                  <AlertDescription>
                    <div className="max-h-40 overflow-auto mt-2 text-xs space-y-1">
                      {errors.map((e, i) => (
                        <div key={i}>
                          Linha {e.rowIndex} • {e.building_code} • {e.name || "(sem nome)"} → {e.reason}
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          {phase === "preview" && (
            <>
              <Button variant="outline" onClick={reset}>Cancelar</Button>
              <Button onClick={runImport} disabled={drafts.length === 0}>
                Importar {drafts.length}
              </Button>
            </>
          )}
          {phase === "done" && (
            <Button onClick={() => { reset(); onOpenChange(false); }}>Fechar</Button>
          )}
          {phase === "importing" && <Button disabled>A importar…</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
