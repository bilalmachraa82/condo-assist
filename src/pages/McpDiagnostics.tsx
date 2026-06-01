import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

const MCP_BASE = "https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server";
const DEBUG_URL = `${MCP_BASE}/debug/tools?variant=chatgpt`;

// What the Agent Builder expects from a "retrievable" MCP server.
const EXPECTED = [
  {
    name: "search",
    description: "Search across the knowledge base. Returns { results: [{id,title,url}] }.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  },
  {
    name: "fetch",
    description: "Fetch a single document by id. Returns { id,title,text,url,metadata }.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
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
  checks.push({
    label: "inputSchema.additionalProperties === false",
    ok: schema.additionalProperties === false,
    detail: String(schema.additionalProperties),
  });
  const ann = actual.annotations ?? {};
  checks.push({ label: "annotations.readOnlyHint === true", ok: ann.readOnlyHint === true, detail: String(ann.readOnlyHint) });
  return checks;
}

export default function McpDiagnostics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(DEBUG_URL, { cache: "no-store" });
      const j = await r.json();
      setData(j);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const liveBody: any = data?.live_tools_list?.body;
  const liveTools: any[] = liveBody?.result?.tools ?? [];
  const findLive = (name: string) => liveTools.find((t) => t?.name === name);

  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">MCP /chatgpt — Diagnóstico</h1>
          <p className="text-muted-foreground mt-1">
            Resposta crua de <code className="text-xs bg-muted px-1 py-0.5 rounded">tools/list</code> no endpoint
            usado pelo ChatGPT Agent Builder, comparada com o contrato esperado.
          </p>
          <p className="text-xs text-muted-foreground mt-2 break-all">
            Endpoint: <code>{MCP_BASE}/chatgpt</code> · Debug: <code>{DEBUG_URL}</code>
          </p>
        </div>
        <Button onClick={load} disabled={loading} variant="outline">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Atualizar</span>
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-destructive">Erro: {error}</CardContent>
        </Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardHeader className="pb-2"><CardDescription>Status HTTP</CardDescription></CardHeader>
              <CardContent><div className="text-2xl font-bold">{data.live_tools_list?.status}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription>Content-Type</CardDescription></CardHeader>
              <CardContent><div className="text-sm font-mono break-all">{data.live_tools_list?.content_type}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription>Tools devolvidas</CardDescription></CardHeader>
              <CardContent><div className="text-2xl font-bold">{liveTools.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription>search & fetch</CardDescription></CardHeader>
              <CardContent className="flex gap-2">
                <Badge variant={findLive("search") ? "default" : "destructive"}>search</Badge>
                <Badge variant={findLive("fetch") ? "default" : "destructive"}>fetch</Badge>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="compare">
            <TabsList>
              <TabsTrigger value="compare">Comparação</TabsTrigger>
              <TabsTrigger value="raw">tools/list (raw)</TabsTrigger>
              <TabsTrigger value="expected">Esperado pelo Builder</TabsTrigger>
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resposta crua de tools/list</CardTitle>
                  <CardDescription>JSON-RPC devolvido pelo handler <code>/chatgpt</code></CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] rounded border bg-muted/30">
                    <pre className="text-xs p-4 font-mono">{JSON.stringify(liveBody, null, 2)}</pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="expected">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Contrato esperado pelo ChatGPT Agent Builder</CardTitle>
                  <CardDescription>Nomes, inputSchema e annotations para servidores "retrievable"</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] rounded border bg-muted/30">
                    <pre className="text-xs p-4 font-mono">{JSON.stringify(EXPECTED, null, 2)}</pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recent">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Últimos requests capturados</CardTitle>
                  <CardDescription>Ring buffer do servidor — compare correlationId entre Builder e curl</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] rounded border bg-muted/30">
                    <pre className="text-xs p-4 font-mono">{JSON.stringify(data.recent_requests ?? [], null, 2)}</pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
