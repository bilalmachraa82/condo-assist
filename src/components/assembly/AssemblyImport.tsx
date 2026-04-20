import { useState, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBuildings } from "@/hooks/useBuildings";
import { supabase } from "@/integrations/supabase/client";
import { parseStatus, detectCategory, extractAmount, isUrgent } from "@/utils/assemblyParser";
import { cellStr as cellStrShared } from "@/utils/excelCellFormat";
import * as XLSX from "xlsx";
import { useQueryClient } from "@tanstack/react-query";

interface ItemDraft {
  building_code: number;
  building_address: string;
  building_id: string | null;
  year: number;
  description: string;
  status: string;
  status_notes: string | null;
  category: string;
  priority: string;
  estimated_cost: number | null;
  source_sheet: string;
}

type Phase = "idle" | "preview" | "importing" | "done";

let __ambiguousDates: string[] = [];

function cellStr(v: unknown): string {
  return cellStrShared(v, __ambiguousDates);
}

function parseSheet(rows: unknown[][], sheetName: string): ItemDraft[] {
  const items: ItemDraft[] = [];
  // Extract year from sheet name like "Lista de Assuntos 2025"
  const yearMatch = sheetName.match(/(\d{4})/);
  const year = yearMatch ? parseInt(yearMatch[1]) : 2025;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const codeRaw = cellStr(r[0]);
    if (!codeRaw) continue;
    const code = parseInt(codeRaw);
    if (isNaN(code)) continue;

    const address = cellStr(r[1]);
    const description = cellStr(r[2]);
    if (!description) continue;

    const statusRaw = cellStr(r[3]);
    const { status, status_notes } = parseStatus(statusRaw);
    const category = detectCategory(description);
    const estimated_cost = extractAmount(description);
    const priority = isUrgent(description) ? "urgent" : "normal";

    items.push({
      building_code: code,
      building_address: address,
      building_id: null,
      year,
      description,
      status,
      status_notes,
      category,
      priority,
      estimated_cost,
      source_sheet: String(year),
    });
  }
  return items;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AssemblyImport({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { data: buildings } = useBuildings();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>("idle");
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState({ created: 0, errors: 0 });
  const [ambiguousDates, setAmbiguousDates] = useState<string[]>([]);

  const resetState = useCallback(() => {
    setPhase("idle");
    setItems([]);
    setProgress(0);
    setResult({ created: 0, errors: 0 });
    setAmbiguousDates([]);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        __ambiguousDates = [];
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: true });

        const allItems: ItemDraft[] = [];
        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          if (!ws) continue;
          // raw:true para datas chegarem como Date nativo
          const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
          if (rows.length < 2) continue;
          allItems.push(...parseSheet(rows, sheetName));
        }

        // Resolve building_id
        if (buildings?.length) {
          for (const item of allItems) {
            const match = buildings.find(
              (b) => b.code.replace(/^0+/, "") === String(item.building_code)
            );
            if (match) item.building_id = match.id;
          }
        }

        setItems(allItems);
        setAmbiguousDates([...new Set(__ambiguousDates)]);
        setPhase("preview");
      } catch (err) {
        toast({ title: "Erro ao ler ficheiro", description: String(err), variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [buildings, toast]);

  const handleImport = useCallback(async () => {
    setPhase("importing");
    let created = 0;
    let errors = 0;
    const BATCH = 50;

    for (let i = 0; i < items.length; i += BATCH) {
      const batch = items.slice(i, i + BATCH);
      const { error } = await supabase.from("assembly_items").insert(batch as any[]);
      if (error) {
        errors += batch.length;
        console.error("Batch error:", error);
      } else {
        created += batch.length;
      }
      setProgress(Math.round(((i + batch.length) / items.length) * 100));
    }

    setResult({ created, errors });
    setPhase("done");
    queryClient.invalidateQueries({ queryKey: ["assembly-items"] });
    queryClient.invalidateQueries({ queryKey: ["assembly-status-counts"] });
  }, [items, queryClient]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Assuntos de Actas</DialogTitle>
          <DialogDescription>
            Carregue o ficheiro Excel com os assuntos das assembleias.
          </DialogDescription>
        </DialogHeader>

        {phase === "idle" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">Selecione um ficheiro .xlsx</p>
              <Input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="max-w-xs mx-auto" />
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Formato esperado:</strong></p>
              <p>Col A: Nº condomínio | Col B: Morada | Col C: Assunto | Col D: Estado</p>
            </div>
          </div>
        )}

        {phase === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <span className="font-medium">{items.length} assuntos encontrados</span>
            </div>

            <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
              {items.slice(0, 10).map((item, i) => (
                <div key={i} className="p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Cond. {item.building_code}</Badge>
                    <Badge variant="secondary">{item.category}</Badge>
                    <Badge className={
                      item.status === "done" ? "bg-green-100 text-green-700" :
                      item.status === "in_progress" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }>{item.status}</Badge>
                  </div>
                  <p className="line-clamp-2 text-muted-foreground">{item.description}</p>
                </div>
              ))}
              {items.length > 10 && (
                <div className="p-3 text-xs text-center text-muted-foreground">
                  ... e mais {items.length - 10} assuntos
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetState}>Cancelar</Button>
              <Button onClick={handleImport}>Importar {items.length} assuntos</Button>
            </DialogFooter>
          </div>
        )}

        {phase === "importing" && (
          <div className="space-y-4 py-4">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">A importar... {progress}%</p>
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
            <div>
              <p className="font-medium">{result.created} assuntos importados</p>
              {result.errors > 0 && (
                <p className="text-sm text-destructive flex items-center justify-center gap-1 mt-1">
                  <AlertCircle className="h-4 w-4" /> {result.errors} erros
                </p>
              )}
            </div>
            <Button onClick={() => { resetState(); onOpenChange(false); }}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
