import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, XCircle, RefreshCw, PlayCircle } from "lucide-react";

const MCP_BASE = "https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server";
const CHATGPT_URL = `${MCP_BASE}/chatgpt`;
const DEBUG_URL = `${MCP_BASE}/debug/tools?variant=chatgpt`;
const KEY_CHECK_URL = `${MCP_BASE}/debug/key-check`;

const EXPECTED = [
  {
    name: "search",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  },
  {
    name: "fetch",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"], additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  },
];

type Check = { label: string; ok: boolean; detail?: string };

function validateTool(actual: any, expected: any): Check[] {
  if (!actual) return [{ label: `Tool "${expected.name}" presente`, ok: false, detail: "ausente em tools/list" }];
  const checks: Check[] = [];
  checks.push({ label: `name === "${expected.name}"`, ok: actual.name === expected.name, detail: String(actual.name) });
  const schema = actual.inputSchema ?? {};
  checks.push({ label: "inputSchema.type === 'object'", ok: schema.type === "object", detail: String(schema.type) });
  const req = JSON.stringify(schema.required ?? []);
  const expReq = JSON.stringify(expected.inputSchema.required);
  checks.push({ label: `inputSchema.required === ${expReq}`, ok: req === expReq, detail: req });
  checks.push({ label: "inputSchema.additionalProperties === false", ok: schema.additionalProperties === false, detail: String(schema.additionalProperties) });
  const ann = actual.annotations ?? {};
  checks.push({ label: "annotations.readOnlyHint === true", ok: ann.readOnlyHint === true, detail: String(ann.readOnlyHint) });
  checks.push({ label: "annotations.openWorldHint === false", ok: ann.openWorldHint === false, detail: String(ann.openWorldHint) });
  checks.push({ label: "annotations.destructiveHint === false", ok: ann.destructiveHint === false, detail: String(ann.destructiveHint) });
  checks.push({ label: "sem 'title' extra", ok: actual.title === undefined, detail: actual.title ? String(actual.title) : "—" });
  checks.push({ label: "outputSchema presente", ok: actual.outputSchema !== undefined && actual.outputSchema?.type === "object", detail: actual.outputSchema ? "ok" : "—" });
  return checks;
}

type RpcResult = { status: number; contentType: string; body: any; durationMs: number };

async function rpc(url: string, method: string, params: any, apiKey?: string): Promise<RpcResult> {
  const t0 = performance.now();
  const headers: Record<string, string> = { "content-type": "application/json", accept: "application/json" };
  if (apiKey) headers["x-api-key"] = apiKey;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  const txt = await res.text();
  let body: any = txt;
  try { body = JSON.parse(txt); } catch {}
  return { status: res.status, contentType: res.headers.get("content-type") ?? "", body, durationMs: Math.round(performance.now() - t0) };
}

async function keyCheck(apiKey?: string): Promise<RpcResult> {
  const t0 = performance.now();
  const headers: Record<string, string> = { accept: "application/json" };
  if (apiKey) headers["x-api-key"] = apiKey;
  const res = await fetch(KEY_CHECK_URL, { method: "GET", headers, cache: "no-store" });
  const txt = await res.text();
  let body: any = txt;
  try { body = JSON.parse(txt); } catch {}
  return { status: res.status, contentType: res.headers.get("content-type") ?? "", body, durationMs: Math.round(performance.now() - t0) };
}

export default function McpDiagnostics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live endpoint (no auth)
  const [liveInit, setLiveInit] = useState<RpcResult | null>(null);
  const [liveList, setLiveList] = useState<RpcResult | null>(null);
  const [liveCallNoAuth, setLiveCallNoAuth] = useState<RpcResult | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);

  // Authenticated tool calls
  const [apiKey, setApiKey] = useState("");
  const [searchQuery, setSearchQuery] = useState("test");
  const [fetchId, setFetchId] = useState("");
  const [authSearch, setAuthSearch] = useState<RpcResult | null>(null);
  const [authFetch, setAuthFetch] = useState<RpcResult | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const loadDebug = async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(DEBUG_URL, { cache: "no-store" });
      setData(await r.json());
    } catch (e: any) { setError(String(e?.message ?? e)); }
    finally { setLoading(false); }
  };

  const runLive = async () => {
    setLiveLoading(true);
    try {
      const [a, b, c] = await Promise.all([
        rpc(CHATGPT_URL, "initialize", {}),
        rpc(CHATGPT_URL, "tools/list", {}),
        keyCheck(),
      ]);
      setLiveInit(a); setLiveList(b); setLiveCallNoAuth(c);
    } finally { setLiveLoading(false); }
  };

  const runAuthCalls = async () => {
    if (!apiKey) return;
    setAuthLoading(true);
    try {
      const s = await rpc(CHATGPT_URL, "tools/call", { name: "search", arguments: { query: searchQuery } }, apiKey);
      setAuthSearch(s);
      if (fetchId.trim()) {
        const f = await rpc(CHATGPT_URL, "tools/call", { name: "fetch", arguments: { id: fetchId.trim() } }, apiKey);
        setAuthFetch(f);
      }
    } finally { setAuthLoading(false); }
  };

  useEffect(() => { loadDebug(); runLive(); }, []);

  const liveBody: any = data?.live_tools_list?.body;
  const liveTools: any[] = liveBody?.result?.tools ?? [];
  const findLive = (name: string) => liveTools.find((t) => t?.name === name);

  const StatusBadge = ({ ok, label }: { ok: boolean; label: string }) => (
    <Badge variant={ok ? "default" : "destructive"} className="gap-1">
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}{label}
    </Badge>
  );

  const phase2Pass = liveInit?.status === 200 && liveList?.status === 200 && liveCallNoAuth?.status === 200 && liveCallNoAuth?.body?.ok === false;

  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">MCP /chatgpt — Diagnóstico</h1>
          <p className="text-muted-foreground mt-1">
            Validação do contrato retrievable do ChatGPT Agent Builder no endpoint real.
          </p>
          <p className="text-xs text-muted-foreground mt-2 break-all">
            Endpoint: <code>{CHATGPT_URL}</code>
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="default">
            <a href="/mcp-test">Validar a minha API key →</a>
          </Button>
          <Button onClick={runLive} disabled={liveLoading} variant="outline">
            {liveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Re-testar endpoint real</span>
          </Button>
          <Button onClick={loadDebug} disabled={loading} variant="ghost">Debug</Button>
        </div>
      </div>

      {error && <Card className="border-destructive"><CardContent className="pt-6 text-destructive">Erro: {error}</CardContent></Card>}

      {/* Fase 2 — endpoint real sem auth */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Endpoint real (sem auth)
            {phase2Pass !== undefined && (phase2Pass ? <StatusBadge ok label="Fase 2 OK" /> : <StatusBadge ok={false} label="Falha" />)}
          </CardTitle>
          <CardDescription>POST direto a <code>/chatgpt</code> — discovery deve passar sem <code>x-api-key</code>; auth é validada sem gerar erro 401 na preview.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { label: "initialize → 200", r: liveInit, expect: 200 },
              { label: "tools/list → 200", r: liveList, expect: 200 },
              { label: "key-check → ok=false", r: liveCallNoAuth, expect: 200 },
            ].map((row) => (
              <div key={row.label} className="rounded border p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{row.label}</span>
                  {row.r ? <StatusBadge ok={row.r.status === row.expect} label={`HTTP ${row.r.status}`} /> : <Badge variant="outline">—</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">{row.r?.contentType} · {row.r?.durationMs}ms</div>
              </div>
            ))}
          </div>
          {liveList && (
            <ScrollArea className="h-64 rounded border bg-muted/30">
              <pre className="text-xs p-3 font-mono">{JSON.stringify(liveList.body, null, 2)}</pre>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Tool call autenticado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tool call autenticado</CardTitle>
          <CardDescription>
            Cola a <code>EXTERNAL_API_KEY</code> (apenas client-side, nunca persistida) para validar <code>tools/call</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-3 gap-2">
            <Input type="password" placeholder="EXTERNAL_API_KEY" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            <Input placeholder="search query" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <Input placeholder="fetch id (type:uuid, opcional)" value={fetchId} onChange={(e) => setFetchId(e.target.value)} />
          </div>
          <Button onClick={runAuthCalls} disabled={!apiKey || authLoading}>
            {authLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlayCircle className="h-4 w-4 mr-2" />}
            Executar
          </Button>
          {authSearch && (
            <div>
              <div className="text-sm font-medium mb-1">search → <StatusBadge ok={authSearch.status === 200} label={`HTTP ${authSearch.status}`} /></div>
              <ScrollArea className="h-48 rounded border bg-muted/30"><pre className="text-xs p-3 font-mono">{JSON.stringify(authSearch.body, null, 2)}</pre></ScrollArea>
            </div>
          )}
          {authFetch && (
            <div>
              <div className="text-sm font-medium mb-1">fetch → <StatusBadge ok={authFetch.status === 200} label={`HTTP ${authFetch.status}`} /></div>
              <ScrollArea className="h-48 rounded border bg-muted/30"><pre className="text-xs p-3 font-mono">{JSON.stringify(authFetch.body, null, 2)}</pre></ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparação com contrato esperado */}
      {data && (
        <Tabs defaultValue="compare">
          <TabsList>
            <TabsTrigger value="compare">Comparação</TabsTrigger>
            <TabsTrigger value="raw">tools/list (raw)</TabsTrigger>
            <TabsTrigger value="expected">Contrato esperado</TabsTrigger>
            <TabsTrigger value="recent">Últimos requests</TabsTrigger>
          </TabsList>

          <TabsContent value="compare" className="space-y-4">
            {EXPECTED.map((exp) => {
              const live = findLive(exp.name);
              const checks = validateTool(live, exp);
              const allOk = checks.every((c) => c.ok);
              return (
                <Card key={exp.name}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {allOk ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-destructive" />}
                      <code>{exp.name}</code>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {checks.map((c, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        {c.ok ? <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" /> : <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />}
                        <span className="flex-1">{c.label}</span>
                        {c.detail && <code className="text-xs text-muted-foreground">{c.detail}</code>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="raw">
            <Card><CardContent className="pt-6">
              <ScrollArea className="h-[500px] rounded border bg-muted/30"><pre className="text-xs p-4 font-mono">{JSON.stringify(liveBody, null, 2)}</pre></ScrollArea>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="expected">
            <Card><CardContent className="pt-6">
              <ScrollArea className="h-[500px] rounded border bg-muted/30"><pre className="text-xs p-4 font-mono">{JSON.stringify(EXPECTED, null, 2)}</pre></ScrollArea>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="recent">
            <Card><CardContent className="pt-6">
              <ScrollArea className="h-[500px] rounded border bg-muted/30"><pre className="text-xs p-4 font-mono">{JSON.stringify(data.recent_requests ?? [], null, 2)}</pre></ScrollArea>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
