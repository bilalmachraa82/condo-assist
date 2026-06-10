import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const AGENT_API = `${SUPABASE_URL}/functions/v1/agent-api`;

type Probe = { tool: string; path: string; countKey?: string };
const BASE_PROBES: Probe[] = [
  { tool: "health_check", path: "/v1/health" },
  { tool: "list_buildings", path: "/v1/buildings", countKey: "items" },
  { tool: "list_intervention_types", path: "/v1/intervention-types", countKey: "items" },
  { tool: "list_follow_ups", path: "/v1/follow-ups?limit=1", countKey: "items" },
  { tool: "list_activity_log", path: "/v1/activity-log?limit=1", countKey: "items" },
];

type Result = {
  tool: string;
  ok: boolean;
  httpStatus: number | null;
  latencyMs: number;
  count: number | null;
  error: string | null;
  at: string;
};

async function runProbe(p: Probe, apiKey: string): Promise<Result> {
  const t0 = performance.now();
  try {
    const res = await fetch(`${AGENT_API}${p.path}`, { headers: { "x-api-key": apiKey } });
    const text = await res.text();
    const latency = Math.round(performance.now() - t0);
    if (!res.ok) {
      return { tool: p.tool, ok: false, httpStatus: res.status, latencyMs: latency, count: null, error: text.slice(0, 300), at: new Date().toISOString() };
    }
    let count: number | null = null;
    try {
      const json = JSON.parse(text);
      if (json && typeof json === "object") {
        for (const v of Object.values(json)) {
          if (Array.isArray(v)) { count = (v as unknown[]).length; break; }
        }
      }
    } catch { /* ignore */ }
    return { tool: p.tool, ok: true, httpStatus: res.status, latencyMs: latency, count, error: null, at: new Date().toISOString() };
  } catch (e) {
    return { tool: p.tool, ok: false, httpStatus: null, latencyMs: Math.round(performance.now() - t0), count: null, error: String((e as Error)?.message ?? e), at: new Date().toISOString() };
  }
}

type HistoryRow = {
  id: string;
  checked_at: string;
  tool_name: string;
  status: string;
  http_status: number | null;
  latency_ms: number | null;
  error: string | null;
};

export default function McpHealthDashboard() {
  const [apiKey, setApiKey] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [running, setRunning] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyErr, setHistoryErr] = useState<string | null>(null);

  const runAll = async () => {
    if (!apiKey) return;
    setRunning(true);
    try {
      // Resolve list_assistances dynamically (nested under a building)
      const probes: Probe[] = [...BASE_PROBES];
      try {
        const r = await fetch(`${AGENT_API}/v1/buildings`, { headers: { "x-api-key": apiKey.trim() } });
        if (r.ok) {
          const j = await r.json();
          const first = Array.isArray(j?.items) ? j.items[0] : null;
          if (first?.id) probes.push({ tool: "list_assistances", path: `/v1/buildings/${first.id}/assistances?limit=1`, countKey: "items" });
        }
      } catch { /* ignore */ }
      const out = await Promise.all(probes.map(p => runProbe(p, apiKey.trim())));
      setResults(out);
    } finally { setRunning(false); }
  };

  const loadHistory = async () => {
    const { data, error } = await supabase
      .from("mcp_health_checks")
      .select("id, checked_at, tool_name, status, http_status, latency_ms, error")
      .order("checked_at", { ascending: false })
      .limit(120);
    if (error) setHistoryErr(error.message);
    else { setHistory(data ?? []); setHistoryErr(null); }
  };

  useEffect(() => { loadHistory(); }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => { runAll(); loadHistory(); }, 30_000);
    return () => clearInterval(id);
  }, [autoRefresh, apiKey]);

  const failures = results.filter(r => !r.ok).length;
  const allOk = results.length > 0 && failures === 0;

  // Uptime per tool from history (% ok in last 24h)
  const uptime = useMemo(() => {
    const since = Date.now() - 24 * 3600 * 1000;
    const byTool: Record<string, { ok: number; total: number }> = {};
    for (const r of history) {
      if (new Date(r.checked_at).getTime() < since) continue;
      const acc = byTool[r.tool_name] ?? { ok: 0, total: 0 };
      acc.total++;
      if (r.status === "ok") acc.ok++;
      byTool[r.tool_name] = acc;
    }
    return byTool;
  }, [history]);

  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">MCP Health Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Validação contínua das tools operacionais críticas do agent-api.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="auto" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            <Label htmlFor="auto" className="text-sm">Auto 30s</Label>
          </div>
          <Button onClick={runAll} disabled={!apiKey || running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Re-executar tudo
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Credenciais</CardTitle>
          <CardDescription>
            A EXTERNAL_API_KEY é usada apenas no browser; não é guardada nem enviada para outro lado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="password"
            placeholder="EXTERNAL_API_KEY"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              Estado actual
              {allOk
                ? <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />Todos OK</Badge>
                : <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{failures} falha(s)</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {results.map((r) => {
              const up = uptime[r.tool];
              const upPct = up && up.total > 0 ? Math.round((up.ok / up.total) * 100) : null;
              return (
                <div key={r.tool} className="rounded border p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-medium">{r.tool}</code>
                    {r.ok
                      ? <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />{r.httpStatus}</Badge>
                      : <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{r.httpStatus ?? "ERR"}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.latencyMs}ms · {r.count !== null ? `${r.count} registos` : "—"}
                    {upPct !== null && <> · uptime 24h: {upPct}%</>}
                  </div>
                  {r.error && <div className="text-xs text-destructive break-all">{r.error}</div>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Histórico server-side</CardTitle>
            <CardDescription>
              Resultados persistidos pelo cron <code>mcp-health-cron</code> (a cada 5 min). Limite: últimos 120 registos.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadHistory}>Recarregar</Button>
        </CardHeader>
        <CardContent>
          {historyErr && <div className="text-sm text-destructive mb-2">Erro: {historyErr}</div>}
          <ScrollArea className="h-80 rounded border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-2">Quando</th>
                  <th className="text-left p-2">Tool</th>
                  <th className="text-left p-2">Estado</th>
                  <th className="text-left p-2">HTTP</th>
                  <th className="text-left p-2">Latência</th>
                  <th className="text-left p-2">Erro</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t">
                    <td className="p-2 whitespace-nowrap">{new Date(h.checked_at).toLocaleString()}</td>
                    <td className="p-2"><code>{h.tool_name}</code></td>
                    <td className="p-2">
                      {h.status === "ok"
                        ? <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />ok</Badge>
                        : <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />fail</Badge>}
                    </td>
                    <td className="p-2">{h.http_status ?? "—"}</td>
                    <td className="p-2">{h.latency_ms ?? "—"}ms</td>
                    <td className="p-2 max-w-md truncate text-xs text-muted-foreground" title={h.error ?? ""}>{h.error ?? ""}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Sem registos ainda. O cron corre a cada 5 min.</td></tr>
                )}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
