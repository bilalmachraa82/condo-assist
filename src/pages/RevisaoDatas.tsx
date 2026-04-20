import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, ArrowLeftRight, ExternalLink, Filter } from "lucide-react";
import { Link } from "react-router-dom";

interface AmbiguousDate {
  id: string;
  title: string;
  category: string;
  data_ambigua: string;
  contexto: string;
  status: "pending" | "kept" | "swapped";
}

/** Lightweight CSV parser for our well-formed export */
function parseCSV(text: string): Omit<AmbiguousDate, "status">[] {
  const lines = text.trim().split("\n");
  lines.shift(); // header
  const out: Omit<AmbiguousDate, "status">[] = [];
  for (const line of lines) {
    const cols: string[] = [];
    let cur = "";
    let inside = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inside && line[i + 1] === '"') { cur += '"'; i++; }
        else inside = !inside;
      } else if (c === "," && !inside) {
        cols.push(cur); cur = "";
      } else cur += c;
    }
    cols.push(cur);
    if (cols.length >= 5) {
      out.push({
        id: cols[0], title: cols[1], category: cols[2],
        data_ambigua: cols[3], contexto: cols[4],
      });
    }
  }
  return out;
}

function swapDate(d: string): string {
  const m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return d;
  const a = m[1], b = m[2];
  let y = m[3];
  if (y.length === 2) y = "20" + y;
  return `${b.padStart(2, "0")}/${a.padStart(2, "0")}/${y}`;
}

function normalizeDate(d: string): string {
  const m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return d;
  let y = m[3];
  if (y.length === 2) y = "20" + y;
  return `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${y}`;
}

export default function RevisaoDatas() {
  const { toast } = useToast();
  const [items, setItems] = useState<AmbiguousDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [showStatus, setShowStatus] = useState<"all" | "pending">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/datas_ambiguas_revisao_manual.csv")
      .then((r) => r.text())
      .then((text) => {
        const parsed = parseCSV(text).map((p) => ({ ...p, status: "pending" as const }));
        setItems(parsed);
      })
      .catch((e) => toast({ title: "Erro a carregar CSV", description: String(e), variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (showStatus === "pending" && it.status !== "pending") return false;
      if (!filter) return true;
      const f = filter.toLowerCase();
      return it.title.toLowerCase().includes(f)
        || it.category.toLowerCase().includes(f)
        || it.data_ambigua.includes(f);
    });
  }, [items, filter, showStatus]);

  const stats = useMemo(() => ({
    total: items.length,
    pending: items.filter((i) => i.status === "pending").length,
    kept: items.filter((i) => i.status === "kept").length,
    swapped: items.filter((i) => i.status === "swapped").length,
  }), [items]);

  async function applyAction(item: AmbiguousDate, action: "keep" | "swap") {
    setBusyId(item.id);
    try {
      if (action === "swap") {
        const { data: row, error: selErr } = await supabase
          .from("knowledge_articles")
          .select("content")
          .eq("id", item.id)
          .single();
        if (selErr) throw selErr;

        const oldDate = item.data_ambigua;
        const newDate = swapDate(oldDate);
        const escaped = oldDate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`\\b${escaped}\\b`, "g");
        const newContent = (row?.content ?? "").replace(re, newDate);

        if (newContent === row?.content) {
          throw new Error("Padrão não encontrado no artigo (já corrigido?)");
        }

        const { error: updErr } = await supabase
          .from("knowledge_articles")
          .update({ content: newContent })
          .eq("id", item.id);
        if (updErr) throw updErr;

        toast({ title: "Data trocada", description: `${oldDate} → ${newDate}` });
      } else {
        const normalized = normalizeDate(item.data_ambigua);
        if (normalized !== item.data_ambigua) {
          const { data: row, error: selErr } = await supabase
            .from("knowledge_articles").select("content").eq("id", item.id).single();
          if (selErr) throw selErr;
          const escaped = item.data_ambigua.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const re = new RegExp(`\\b${escaped}\\b`, "g");
          const newContent = (row?.content ?? "").replace(re, normalized);
          await supabase.from("knowledge_articles").update({ content: newContent }).eq("id", item.id);
        }
        toast({ title: "Data mantida", description: item.data_ambigua });
      }

      setItems((prev) => prev.map((p) =>
        p.id === item.id && p.data_ambigua === item.data_ambigua
          ? { ...p, status: action === "swap" ? "swapped" : "kept" }
          : p
      ));
    } catch (e) {
      toast({
        title: "Erro",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold">Revisão de Datas Ambíguas</h1>
        <p className="text-muted-foreground text-sm">
          Datas onde dia e mês são ambos ≤ 12. Para cada uma, decide se está correcta ou se deve ser invertida.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Pendentes" value={stats.pending} tone="warning" />
        <StatCard label="Mantidas" value={stats.kept} tone="success" />
        <StatCard label="Trocadas" value={stats.swapped} tone="info" />
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar por título, categoria ou data…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={showStatus === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setShowStatus("pending")}
          >
            Só pendentes
          </Button>
          <Button
            variant={showStatus === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setShowStatus("all")}
          >
            Todos
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {stats.pending === 0 ? "🎉 Todas as datas foram revistas!" : "Nenhum resultado para o filtro actual."}
            </CardContent>
          </Card>
        )}

        {filtered.map((item, idx) => (
          <Card key={`${item.id}-${item.data_ambigua}-${idx}`} className="border-l-4 border-l-warning">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                    {item.title}
                    <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                    {item.status === "kept" && <Badge className="bg-success text-success-foreground">Mantida</Badge>}
                    {item.status === "swapped" && <Badge className="bg-primary text-primary-foreground">Trocada</Badge>}
                  </CardTitle>
                  <Link
                    to={`/knowledge?article=${item.id}`}
                    className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                  >
                    Ver artigo <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="rounded-md bg-muted p-3">
                  <div className="text-xs text-muted-foreground mb-1">Data ambígua</div>
                  <div className="font-mono text-lg font-semibold">{item.data_ambigua}</div>
                </div>
                <div className="rounded-md bg-muted p-3">
                  <div className="text-xs text-muted-foreground mb-1">Se trocar dia↔mês</div>
                  <div className="font-mono text-lg font-semibold text-primary">
                    {swapDate(item.data_ambigua)}
                  </div>
                </div>
              </div>

              <div className="rounded-md border p-3 text-sm">
                <div className="text-xs text-muted-foreground mb-1">Contexto no artigo:</div>
                <div className="font-mono text-xs whitespace-pre-wrap break-words">{item.contexto}</div>
              </div>

              {item.status === "pending" && (
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    onClick={() => applyAction(item, "keep")}
                    disabled={busyId === item.id}
                    variant="outline"
                    className="flex-1"
                  >
                    {busyId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Manter como está ({normalizeDate(item.data_ambigua)})
                  </Button>
                  <Button
                    onClick={() => applyAction(item, "swap")}
                    disabled={busyId === item.id}
                    className="flex-1"
                  >
                    {busyId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />}
                    Trocar dia↔mês ({swapDate(item.data_ambigua)})
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "warning" | "success" | "info" }) {
  const toneClass =
    tone === "warning" ? "text-warning"
    : tone === "success" ? "text-success"
    : tone === "info" ? "text-info"
    : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold ${toneClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
