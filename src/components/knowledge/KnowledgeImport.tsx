import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBuildings } from "@/hooks/useBuildings";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryConfig, KNOWLEDGE_CATEGORIES } from "@/utils/knowledgeCategories";
import { cellStr as cellStrShared } from "@/utils/excelCellFormat";
import * as XLSX from "xlsx";

// Buffer global de strings ambíguas detectadas (preenchido durante o parse).
let __ambiguousDates: string[] = [];

// ── Sheet → category mapping ──
const SHEET_MAP: Record<string, string> = {
  "Lista Geral Condomínios": "edificios",
  "Administradores": "procedimentos",
  "Empresa de Limpeza": "geral",
  "Inspeção Elevadores": "elevadores",
  "Inspeção Extintores": "extintores",
  "Inspeção Gás": "gas",
  "Seguros do Condomínio": "seguros",
  "Seguros do Fracções Condomínio": "seguros",
  "Seguros Acidentes Trabalho": "acidentes_trabalho",
  "Empresa de Desbaratização": "desbaratizacao",
  "Reaperto Coluna Electrica": "colunas_eletricas",
  "Limpeza Caleiras": "caleiras",
  "Limpeza Chaminés": "chamines",
};

interface ArticleDraft {
  title: string;
  content: string;
  category: string;
  building_code: string;
  building_id: string | null;
  tags: string[];
}

type ImportPhase = "idle" | "preview" | "importing" | "done";

// ── Cell value helpers ──
function cellStr(v: unknown): string {
  return cellStrShared(v, __ambiguousDates);
}

function isCondoCode(v: unknown): boolean {
  const s = cellStr(v);
  return /^Cond\.\s*'/i.test(s);
}

function normalizeCode(raw: string): string {
  // "Cond. '006" → "006"
  return raw.replace(/^Cond\.\s*'?/i, "").trim();
}

// ── Sheet parsers ──
function parseListaGeral(rows: unknown[][]): ArticleDraft[] {
  const articles: ArticleDraft[] = [];
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    const code = cellStr(r[0]);
    if (!isCondoCode(code)) continue;
    const morada = cellStr(r[1]);
    const localidade = cellStr(r[2]);
    const gestao = cellStr(r[3]);
    const admin = cellStr(r[4]);

    const lines = ["## Informação Geral\n"];
    if (morada) lines.push(`- **Morada:** ${morada}`);
    if (localidade) lines.push(`- **Localidade:** ${localidade}`);
    if (gestao) lines.push(`- **Gestão:** ${gestao}`);
    if (admin) lines.push(`- **Administração:** ${admin}`);

    articles.push({
      title: `${normalizeCode(code)} - Informação Geral`,
      content: lines.join("\n"),
      category: "edificios",
      building_code: normalizeCode(code),
      building_id: null,
      tags: ["edificio", "geral"],
    });
  }
  return articles;
}

function parseAdministradores(rows: unknown[][]): ArticleDraft[] {
  const articles: ArticleDraft[] = [];
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    const code = cellStr(r[0]);
    if (!isCondoCode(code)) continue;
    const nome = cellStr(r[1]);
    if (!nome) continue;
    const tel = cellStr(r[2]);
    const andar = cellStr(r[3]);
    const email = cellStr(r[4]);
    const emailCond = cellStr(r[5]);
    const emergencia = cellStr(r[6]);
    const obs = cellStr(r[7]);

    const lines = ["## Administrador\n"];
    if (nome) lines.push(`- **Nome:** ${nome}`);
    if (tel) lines.push(`- **Telemóvel:** ${tel}`);
    if (andar) lines.push(`- **Andar:** ${andar}`);
    if (email) lines.push(`- **Email:** ${email}`);
    if (emailCond) lines.push(`- **Email Condomínio:** ${emailCond}`);
    if (emergencia) lines.push(`\n### Emergências\n${emergencia}`);
    if (obs) lines.push(`\n### Observações\n${obs}`);

    articles.push({
      title: `${normalizeCode(code)} - Administrador`,
      content: lines.join("\n"),
      category: "procedimentos",
      building_code: normalizeCode(code),
      building_id: null,
      tags: ["administrador", "contacto"],
    });
  }
  return articles;
}

function parseEmpresaLimpeza(rows: unknown[][]): ArticleDraft[] {
  const articles: ArticleDraft[] = [];
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    const code = cellStr(r[0]);
    if (!isCondoCode(code)) continue;
    const empresa = cellStr(r[1]);
    if (!empresa || empresa === "-") continue;

    const lines = ["## Empresa de Limpeza\n"];
    lines.push(`- **Empresa:** ${empresa}`);
    if (cellStr(r[2])) lines.push(`- **Contacto:** ${cellStr(r[2])}`);
    if (cellStr(r[3]) && cellStr(r[3]) !== "-") lines.push(`- **Email:** ${cellStr(r[3])}`);
    if (cellStr(r[4])) lines.push(`- **Data Contrato:** ${cellStr(r[4])}`);
    if (cellStr(r[5])) lines.push(`- **Periodicidade:** ${cellStr(r[5])}`);
    if (cellStr(r[6]) && cellStr(r[6]) !== "-") lines.push(`- **Garagem:** ${cellStr(r[6])}`);
    if (cellStr(r[7]) && cellStr(r[7]) !== "-") lines.push(`- **Lavagens/Ano:** ${cellStr(r[7])}`);

    articles.push({
      title: `${normalizeCode(code)} - Empresa de Limpeza`,
      content: lines.join("\n"),
      category: "geral",
      building_code: normalizeCode(code),
      building_id: null,
      tags: ["limpeza", "fornecedor"],
    });
  }
  return articles;
}

function parseElevadores(rows: unknown[][]): ArticleDraft[] {
  const articles: ArticleDraft[] = [];
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    const code = cellStr(r[0]);
    if (!isCondoCode(code)) continue;
    const hasData = [1, 2, 3].some((c) => cellStr(r[c]) && cellStr(r[c]) !== "-");
    if (!hasData) continue;

    const lines = ["## Inspeção de Elevadores\n"];
    if (cellStr(r[1]) && cellStr(r[1]) !== "-") lines.push(`- **Data Inspeção:** ${cellStr(r[1])}`);
    if (cellStr(r[2]) && cellStr(r[2]) !== "-") lines.push(`- **Situação:** ${cellStr(r[2])}`);
    if (cellStr(r[3]) && cellStr(r[3]) !== "-") lines.push(`- **Empresa:** ${cellStr(r[3])}`);
    if (cellStr(r[4]) && cellStr(r[4]) !== "-") lines.push(`- **Telefone:** ${cellStr(r[4])}`);
    if (cellStr(r[5]) && cellStr(r[5]) !== "-") lines.push(`- **Email:** ${cellStr(r[5])}`);
    if (cellStr(r[6]) && cellStr(r[6]) !== "-") lines.push(`- **Duração Contrato:** ${cellStr(r[6])}`);
    if (cellStr(r[7])) lines.push(`- **Início Contrato:** ${cellStr(r[7])}`);
    if (cellStr(r[8])) lines.push(`- **Tipo Contrato:** ${cellStr(r[8])}`);
    if (cellStr(r[9])) lines.push(`\n### Observações\n${cellStr(r[9])}`);

    articles.push({
      title: `${normalizeCode(code)} - Elevadores`,
      content: lines.join("\n"),
      category: "elevadores",
      building_code: normalizeCode(code),
      building_id: null,
      tags: ["elevador", "inspeção"],
    });
  }
  return articles;
}

function parseExtintores(rows: unknown[][]): ArticleDraft[] {
  const articles: ArticleDraft[] = [];
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    const code = cellStr(r[0]);
    if (!isCondoCode(code)) continue;
    const hasData = [1, 2].some((c) => cellStr(r[c]) && cellStr(r[c]) !== "-");
    if (!hasData) continue;

    const lines = ["## Inspeção de Extintores\n"];
    if (cellStr(r[1])) lines.push(`- **Data:** ${cellStr(r[1])}`);
    if (cellStr(r[2])) lines.push(`- **Empresa:** ${cellStr(r[2])}`);
    if (cellStr(r[3])) lines.push(`- **Email:** ${cellStr(r[3])}`);
    if (cellStr(r[4])) lines.push(`- **Contacto:** ${cellStr(r[4])}`);
    if (cellStr(r[5])) lines.push(`\n### Observações\n${cellStr(r[5])}`);

    articles.push({
      title: `${normalizeCode(code)} - Extintores`,
      content: lines.join("\n"),
      category: "extintores",
      building_code: normalizeCode(code),
      building_id: null,
      tags: ["extintor", "inspeção"],
    });
  }
  return articles;
}

function parseGas(rows: unknown[][]): ArticleDraft[] {
  const articles: ArticleDraft[] = [];
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    const code = cellStr(r[0]);
    if (!isCondoCode(code)) continue;
    const data = cellStr(r[1]);
    if (!data) continue;

    const lines = ["## Inspeção de Gás\n"];
    lines.push(`- **Data/Info:** ${data}`);
    if (cellStr(r[2])) lines.push(`\n### Observações\n${cellStr(r[2])}`);

    articles.push({
      title: `${normalizeCode(code)} - Gás`,
      content: lines.join("\n"),
      category: "gas",
      building_code: normalizeCode(code),
      building_id: null,
      tags: ["gás", "inspeção"],
    });
  }
  return articles;
}

function parseSeguros(rows: unknown[][], sheetName: string): ArticleDraft[] {
  const articles: ArticleDraft[] = [];
  const isFraccoes = sheetName.includes("Fracções");
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    const code = cellStr(r[0]);
    if (!isCondoCode(code)) continue;
    const apolice = cellStr(r[1]);
    if (!apolice) continue;

    const suffix = isFraccoes ? " (Fracções)" : "";
    const lines = [`## Seguro${suffix}\n`];
    lines.push(`- **Nº Apólice:** ${apolice}`);
    if (cellStr(r[2])) lines.push(`- **Companhia:** ${cellStr(r[2])}`);
    if (cellStr(r[3])) lines.push(`- **Mediador:** ${cellStr(r[3])}`);
    if (cellStr(r[4])) lines.push(`- **Contacto:** ${cellStr(r[4])}`);
    if (!isFraccoes) {
      if (cellStr(r[5])) lines.push(`- **Multirrisco:** ${cellStr(r[5])}`);
      if (cellStr(r[6])) lines.push(`- **Partes Comuns:** ${cellStr(r[6])}`);
      if (cellStr(r[7])) lines.push(`- **Fracções Incluídas:** ${cellStr(r[7])}`);
      if (cellStr(r[8])) lines.push(`- **Data Renovação:** ${cellStr(r[8])}`);
      if (cellStr(r[9])) lines.push(`\n### Observações\n${cellStr(r[9])}`);
    } else {
      if (cellStr(r[5])) lines.push(`- **Fracções Incluídas:** ${cellStr(r[5])}`);
      if (cellStr(r[6])) lines.push(`- **Data Renovação:** ${cellStr(r[6])}`);
      if (cellStr(r[7])) lines.push(`\n### Observações\n${cellStr(r[7])}`);
    }

    articles.push({
      title: `${normalizeCode(code)} - Seguro${suffix}`,
      content: lines.join("\n"),
      category: "seguros",
      building_code: normalizeCode(code),
      building_id: null,
      tags: isFraccoes ? ["seguro", "fracções"] : ["seguro", "condomínio"],
    });
  }
  return articles;
}

function parseAcidentesTrabalho(rows: unknown[][]): ArticleDraft[] {
  const articles: ArticleDraft[] = [];
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    const code = cellStr(r[0]);
    if (!isCondoCode(code)) continue;
    const apolice = cellStr(r[1]);
    if (!apolice) continue;

    const lines = ["## Seguro Acidentes de Trabalho\n"];
    lines.push(`- **Nº Apólice:** ${apolice}`);
    if (cellStr(r[2])) lines.push(`- **Companhia:** ${cellStr(r[2])}`);
    if (cellStr(r[3])) lines.push(`- **Mediador:** ${cellStr(r[3])}`);
    if (cellStr(r[4])) lines.push(`- **Data Renovação:** ${cellStr(r[4])}`);
    if (cellStr(r[5])) lines.push(`\n### Observações\n${cellStr(r[5])}`);

    articles.push({
      title: `${normalizeCode(code)} - Acidentes Trabalho`,
      content: lines.join("\n"),
      category: "acidentes_trabalho",
      building_code: normalizeCode(code),
      building_id: null,
      tags: ["seguro", "acidentes"],
    });
  }
  return articles;
}

function parseDesbaratizacao(rows: unknown[][]): ArticleDraft[] {
  const articles: ArticleDraft[] = [];
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    const code = cellStr(r[0]);
    if (!isCondoCode(code)) continue;
    const empresa = cellStr(r[1]);
    if (!empresa) continue;

    const lines = ["## Desbaratização\n"];
    lines.push(`- **Empresa:** ${empresa}`);
    if (cellStr(r[2])) lines.push(`- **Tipo Contrato:** ${cellStr(r[2])}`);
    if (cellStr(r[3])) lines.push(`- **Data Contrato:** ${cellStr(r[3])}`);
    if (cellStr(r[4])) lines.push(`- **Duração:** ${cellStr(r[4])}`);
    if (cellStr(r[5])) lines.push(`- **Visitas/Ano:** ${cellStr(r[5])}`);

    articles.push({
      title: `${normalizeCode(code)} - Desbaratização`,
      content: lines.join("\n"),
      category: "desbaratizacao",
      building_code: normalizeCode(code),
      building_id: null,
      tags: ["desbaratização", "fornecedor"],
    });
  }
  return articles;
}

function parseColunasEletricas(rows: unknown[][]): ArticleDraft[] {
  const articles: ArticleDraft[] = [];
  // Row 1 has year headers
  const headers = rows[1] || [];
  const years = headers.slice(1).map((h) => cellStr(h)).filter(Boolean);

  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    const code = cellStr(r[0]);
    if (!isCondoCode(code)) continue;
    const yearData = years.map((y, idx) => ({ year: y, status: cellStr(r[idx + 1]) })).filter((d) => d.status);
    if (!yearData.length) continue;

    const lines = ["## Reaperto de Colunas Elétricas\n"];
    lines.push("| Ano | Estado |");
    lines.push("|-----|--------|");
    yearData.forEach((d) => lines.push(`| ${d.year} | ${d.status} |`));

    articles.push({
      title: `${normalizeCode(code)} - Colunas Elétricas`,
      content: lines.join("\n"),
      category: "colunas_eletricas",
      building_code: normalizeCode(code),
      building_id: null,
      tags: ["colunas", "elétrica", "reaperto"],
    });
  }
  return articles;
}

function parseCaleirasOrChamines(rows: unknown[][], category: string, label: string): ArticleDraft[] {
  const articles: ArticleDraft[] = [];
  const headers = rows[1] || [];
  const years = headers.slice(1).map((h) => cellStr(h)).filter(Boolean);

  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    const code = cellStr(r[0]);
    if (!isCondoCode(code)) continue;
    const yearData = years.map((y, idx) => ({ year: y, status: cellStr(r[idx + 1]) })).filter((d) => d.status);
    if (!yearData.length) continue;

    const lines = [`## ${label}\n`];
    lines.push("| Ano | Estado |");
    lines.push("|-----|--------|");
    yearData.forEach((d) => lines.push(`| ${d.year} | ${d.status} |`));

    articles.push({
      title: `${normalizeCode(code)} - ${label}`,
      content: lines.join("\n"),
      category,
      building_code: normalizeCode(code),
      building_id: null,
      tags: [label.toLowerCase()],
    });
  }
  return articles;
}

// ── Main parser ──
function parseWorkbook(wb: XLSX.WorkBook): ArticleDraft[] {
  const all: ArticleDraft[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws || !SHEET_MAP[sheetName]) continue;
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
    if (rows.length < 3) continue;

    switch (sheetName) {
      case "Lista Geral Condomínios":
        all.push(...parseListaGeral(rows));
        break;
      case "Administradores":
        all.push(...parseAdministradores(rows));
        break;
      case "Empresa de Limpeza":
        all.push(...parseEmpresaLimpeza(rows));
        break;
      case "Inspeção Elevadores":
        all.push(...parseElevadores(rows));
        break;
      case "Inspeção Extintores":
        all.push(...parseExtintores(rows));
        break;
      case "Inspeção Gás":
        all.push(...parseGas(rows));
        break;
      case "Seguros do Condomínio":
      case "Seguros do Fracções Condomínio":
        all.push(...parseSeguros(rows, sheetName));
        break;
      case "Seguros Acidentes Trabalho":
        all.push(...parseAcidentesTrabalho(rows));
        break;
      case "Empresa de Desbaratização":
        all.push(...parseDesbaratizacao(rows));
        break;
      case "Reaperto Coluna Electrica":
        all.push(...parseColunasEletricas(rows));
        break;
      case "Limpeza Caleiras":
        all.push(...parseCaleirasOrChamines(rows, "caleiras", "Caleiras"));
        break;
      case "Limpeza Chaminés":
        all.push(...parseCaleirasOrChamines(rows, "chamines", "Chaminés"));
        break;
    }
  }
  return all;
}

// ── Component ──
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function KnowledgeImport({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { data: buildings } = useBuildings();
  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [articles, setArticles] = useState<ArticleDraft[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState({ created: 0, errors: 0 });

  const resetState = useCallback(() => {
    setPhase("idle");
    setArticles([]);
    setProgress(0);
    setResult({ created: 0, errors: 0 });
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array", cellDates: true });
          const drafts = parseWorkbook(wb);

          // Resolve building_id from code
          if (buildings?.length) {
            for (const d of drafts) {
              const match = buildings.find(
                (b) => b.code === d.building_code || b.code.replace(/^0+/, "") === d.building_code.replace(/^0+/, "")
              );
              if (match) d.building_id = match.id;
            }
          }

          setArticles(drafts);
          setPhase("preview");
        } catch (err) {
          toast({
            title: "Erro ao ler ficheiro",
            description: err instanceof Error ? err.message : "Ficheiro inválido",
            variant: "destructive",
          });
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [buildings, toast]
  );

  const handleImport = useCallback(async () => {
    if (!articles.length) return;
    setPhase("importing");
    setProgress(0);

    const BATCH = 20;
    let created = 0;
    let errors = 0;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    for (let i = 0; i < articles.length; i += BATCH) {
      const batch = articles.slice(i, i + BATCH).map((a) => ({
        title: a.title,
        content: a.content,
        category: a.category,
        tags: a.tags,
        building_id: a.building_id,
        is_global: !a.building_id,
        is_published: true,
        metadata: {} as Record<string, unknown>,
        created_by: userId,
      }));

      const { error } = await supabase
        .from("knowledge_articles")
        .insert(batch as any);

      if (error) {
        console.error("Import batch error:", error);
        errors += batch.length;
      } else {
        created += batch.length;
      }

      setProgress(Math.round(((i + batch.length) / articles.length) * 100));
    }

    setResult({ created, errors });
    setPhase("done");
    toast({
      title: "Importação concluída",
      description: `${created} artigos criados, ${errors} erros`,
    });
  }, [articles, toast]);

  // Category summary for preview
  const categorySummary = articles.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + 1;
    return acc;
  }, {});

  const matchedBuildings = articles.filter((a) => a.building_id).length;
  const unmatchedBuildings = articles.filter((a) => !a.building_id).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar do Excel de Manutenção
          </DialogTitle>
          <DialogDescription>
            Importa dados do ficheiro Excel como artigos na Base de Conhecimento
          </DialogDescription>
        </DialogHeader>

        {phase === "idle" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Seleciona o ficheiro Excel com a listagem geral de manutenção. O sistema irá criar
              artigos automáticos por edifício e categoria.
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
            </div>
          </div>
        )}

        {phase === "preview" && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium">
                {articles.length} artigos a criar
              </p>

              <div className="grid grid-cols-2 gap-2">
                {Object.entries(categorySummary)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, count]) => {
                    const cfg = getCategoryConfig(cat);
                    const Icon = cfg.icon;
                    return (
                      <div key={cat} className="flex items-center gap-2 text-xs">
                        <div className={`p-1 rounded ${cfg.bgClass}`}>
                          <Icon className={`h-3 w-3 ${cfg.textClass}`} />
                        </div>
                        <span className="truncate">{cfg.label}</span>
                        <Badge variant="secondary" className="ml-auto text-[10px]">
                          {count}
                        </Badge>
                      </div>
                    );
                  })}
              </div>

              <div className="border-t pt-2 text-xs text-muted-foreground space-y-1">
                <p>
                  ✅ {matchedBuildings} artigos com edifício associado
                </p>
                {unmatchedBuildings > 0 && (
                  <p>
                    ⚠️ {unmatchedBuildings} artigos sem edifício correspondente na BD (serão criados como globais)
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { resetState(); }}>
                Cancelar
              </Button>
              <Button onClick={handleImport}>
                <Upload className="h-4 w-4 mr-2" />
                Importar {articles.length} Artigos
              </Button>
            </DialogFooter>
          </div>
        )}

        {phase === "importing" && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-center">A importar artigos...</p>
            <Progress value={progress} className="h-3" />
            <p className="text-xs text-center text-muted-foreground">{progress}%</p>
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-4 py-4 text-center">
            {result.errors === 0 ? (
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            ) : (
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto" />
            )}
            <div>
              <p className="font-semibold text-lg">{result.created} artigos criados</p>
              {result.errors > 0 && (
                <p className="text-sm text-destructive">{result.errors} erros</p>
              )}
            </div>
            <Button
              onClick={() => {
                resetState();
                onOpenChange(false);
              }}
            >
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
