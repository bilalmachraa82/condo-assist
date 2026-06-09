import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { CHATGPT_URL, FULL_URL, checkApiKey, rpc, type RpcResult } from "@/lib/mcpClient";

type TestStatus = "idle" | "running" | "pass" | "fail" | "skipped";

type TestCase = {
  id: string;
  label: string;
  blocking: boolean;
  endpoint: "chatgpt" | "mcp-server";
  status: TestStatus;
  expected: string;
  result?: RpcResult;
  failReason?: string;
  hint?: string;
};

const INITIAL_TESTS: TestCase[] = [
  { id: "1", label: "POST /chatgpt initialize (sem auth)", blocking: true, endpoint: "chatgpt", status: "idle", expected: "HTTP 200, protocolVersion presente" },
  { id: "2", label: "POST /chatgpt ping (sem auth)", blocking: true, endpoint: "chatgpt", status: "idle", expected: "HTTP 200" },
  { id: "3", label: "POST /chatgpt tools/list (sem auth) — search + fetch descobríveis", blocking: true, endpoint: "chatgpt", status: "idle", expected: "HTTP 200, lista search e fetch com inputSchema e outputSchema" },
  { id: "4", label: "POST /chatgpt tools/call search SEM auth → deve recusar", blocking: true, endpoint: "chatgpt", status: "idle", expected: "HTTP 401 / erro de auth" },
  { id: "5", label: "POST /chatgpt tools/call search com chave INVÁLIDA → deve recusar", blocking: true, endpoint: "chatgpt", status: "idle", expected: "HTTP 401 / erro de auth" },
  { id: "6", label: "POST /chatgpt tools/call search com chave real", blocking: true, endpoint: "chatgpt", status: "idle", expected: "HTTP 200, results[] válido" },
  { id: "7", label: "POST /chatgpt tools/call fetch com id devolvido por search", blocking: true, endpoint: "chatgpt", status: "idle", expected: "HTTP 200, objecto com id, title, text, url" },
  { id: "8", label: "POST /mcp-server tools/list com chave real (diagnóstico)", blocking: false, endpoint: "mcp-server", status: "idle", expected: "HTTP 200, lista de tools nomeadas" },
  { id: "9", label: "POST /mcp-server tools/call health_check (diagnóstico)", blocking: false, endpoint: "mcp-server", status: "idle", expected: "HTTP 200" },
];

const EXECUTION_TEST_IDS = new Set(["6", "7", "8", "9"]);

function StatusBadge({ status, blocking }: { status: TestStatus; blocking: boolean }) {
  if (status === "running") return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />a correr</Badge>;
  if (status === "pass") return <Badge className="bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" />passou</Badge>;
  if (status === "fail")
    return blocking ? (
      <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />falhou</Badge>
    ) : (
      <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400"><XCircle className="h-3 w-3 mr-1" />falhou (não bloqueia)</Badge>
    );
  if (status === "skipped") return <Badge variant="outline">saltado</Badge>;
  return <Badge variant="outline">pendente</Badge>;
}

function looksLikeAuthError(r: RpcResult): boolean {
  if (r.status === 401 || r.status === 403) return true;
  const err = r.body?.error;
  if (!err) return false;
  const msg = (err.message ?? "").toLowerCase();
  return msg.includes("unauth") || msg.includes("api key") || msg.includes("api_key") || msg.includes("auth");
}

export default function McpTest() {
  const [apiKey, setApiKey] = useState("");
  const [query, setQuery] = useState("infiltracao");
  const [tests, setTests] = useState<TestCase[]>(INITIAL_TESTS);
  const [running, setRunning] = useState(false);
  const [verdict, setVerdict] = useState<"unknown" | "green" | "red">("unknown");

  const updateTest = (id: string, patch: Partial<TestCase>) =>
    setTests((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  async function runAll() {
    if (!apiKey.trim()) {
      toast.error("Cola a EXTERNAL_API_KEY primeiro");
      return;
    }
    setRunning(true);
    setVerdict("unknown");
    setTests(INITIAL_TESTS.map((t) => ({ ...t, status: "running", result: undefined, failReason: undefined, hint: undefined })));

    // 1. initialize
    {
      const r = await rpc(CHATGPT_URL, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "mcp-test", version: "1" } });
      const ok = r.status === 200 && !!r.body?.result?.protocolVersion;
      updateTest("1", { status: ok ? "pass" : "fail", result: r, failReason: ok ? undefined : "Sem protocolVersion na resposta", hint: ok ? undefined : "O endpoint pode estar offline ou o handler de initialize partido. Verifica os logs do edge function." });
    }

    // 2. ping
    {
      const r = await rpc(CHATGPT_URL, "ping");
      const ok = r.status === 200 && !r.body?.error;
      updateTest("2", { status: ok ? "pass" : "fail", result: r, failReason: ok ? undefined : "ping não respondeu OK" });
    }

    // 3. tools/list
    let toolNames: string[] = [];
    {
      const r = await rpc(CHATGPT_URL, "tools/list");
      const tools: any[] = r.body?.result?.tools ?? [];
      toolNames = tools.map((t) => t.name);
      const hasSearch = tools.find((t) => t.name === "search");
      const hasFetch = tools.find((t) => t.name === "fetch");
      const schemasOk =
        hasSearch?.inputSchema?.type === "object" &&
        hasSearch?.outputSchema?.type === "object" &&
        hasFetch?.inputSchema?.type === "object" &&
        hasFetch?.outputSchema?.type === "object";
      const ok = r.status === 200 && !!hasSearch && !!hasFetch && schemasOk;
      updateTest("3", {
        status: ok ? "pass" : "fail",
        result: r,
        failReason: ok ? undefined : !hasSearch || !hasFetch ? "Falta search ou fetch em tools/list" : "Schemas em falta ou inválidos",
        hint: ok ? undefined : "Se o ChatGPT Builder mostra 0 actions, é porque tools/list não devolve as tools — o problema está aqui.",
      });
    }

    // 4. tools/call sem auth → deve falhar
    {
      const r = await rpc(CHATGPT_URL, "tools/call", { name: "search", arguments: { query: "ping" } });
      const ok = looksLikeAuthError(r);
      updateTest("4", { status: ok ? "pass" : "fail", result: r, failReason: ok ? undefined : "Deveria recusar sem auth (401/403)", hint: ok ? undefined : "O endpoint está a aceitar chamadas anónimas — risco de segurança." });
    }

    // 5. tools/call com chave errada → deve falhar
    {
      const r = await rpc(CHATGPT_URL, "tools/call", { name: "search", arguments: { query: "ping" } }, "OBVIOUSLY_WRONG_KEY_xxx");
      const ok = looksLikeAuthError(r);
      updateTest("5", { status: ok ? "pass" : "fail", result: r, failReason: ok ? undefined : "Deveria recusar com chave inválida" });
    }

    // Pré-validação da chave real: evita disparar vários 401 seguidos e torna claro
    // se o problema é valor colado diferente do secret EXTERNAL_API_KEY ativo.
    {
      const r = await checkApiKey(apiKey.trim());
      if (r.status !== 200 || r.body?.ok !== true) {
        const reason = r.body?.reason === "invalid-key"
          ? "A chave colada não coincide com a EXTERNAL_API_KEY ativa no edge function."
          : "A EXTERNAL_API_KEY não está configurada ou não chegou no header x-api-key.";
        for (const id of EXECUTION_TEST_IDS) {
          updateTest(id, {
            status: "fail",
            result: id === "6" ? r : undefined,
            failReason: id === "6" ? "Chave rejeitada antes do search" : "Saltado porque a chave real falhou a pré-validação",
            hint: id === "6" ? `${reason} Atualiza o secret ou cola aqui exatamente o mesmo valor, sem Bearer e sem espaços.` : undefined,
          });
        }
        setRunning(false);
        setVerdict("red");
        return;
      }
    }

    // 6. tools/call search com chave real
    let firstResultId: string | undefined;
    {
      const r = await rpc(CHATGPT_URL, "tools/call", { name: "search", arguments: { query: query.trim() || "test" } }, apiKey.trim());
      let results: any[] = [];
      const sc = r.body?.result?.structuredContent;
      if (sc?.results) results = sc.results;
      else {
        const text = r.body?.result?.content?.[0]?.text;
        if (typeof text === "string") {
          try { results = JSON.parse(text)?.results ?? []; } catch {}
        }
      }
      const ok = r.status === 200 && !r.body?.error && Array.isArray(results);
      firstResultId = results[0]?.id;
      updateTest("6", {
        status: ok ? "pass" : "fail",
        result: r,
        failReason: ok ? undefined : looksLikeAuthError(r) ? "Chave rejeitada" : "search não devolveu results[]",
        hint: !ok && looksLikeAuthError(r) ? "Rotaciona EXTERNAL_API_KEY em Edge Function Secrets e cola aqui o novo valor." : undefined,
      });
    }

    // 7. fetch usando id da search
    if (firstResultId) {
      const r = await rpc(CHATGPT_URL, "tools/call", { name: "fetch", arguments: { id: firstResultId } }, apiKey.trim());
      const sc = r.body?.result?.structuredContent;
      let obj: any = sc;
      if (!obj) {
        const text = r.body?.result?.content?.[0]?.text;
        if (typeof text === "string") {
          try { obj = JSON.parse(text); } catch {}
        }
      }
      const ok = r.status === 200 && !r.body?.error && !!obj?.id && !!obj?.title;
      updateTest("7", {
        status: ok ? "pass" : "fail",
        result: r,
        failReason: ok ? undefined : "fetch não devolveu objecto válido (id+title)",
      });
    } else {
      updateTest("7", {
        status: "skipped",
        failReason: "Search não devolveu resultados — tenta outra query (ex.: nome de um edifício real).",
      });
    }

    // 8. /mcp-server tools/list (diagnóstico)
    {
      const r = await rpc(FULL_URL, "tools/list", undefined, apiKey.trim());
      const tools: any[] = r.body?.result?.tools ?? [];
      const ok = r.status === 200 && tools.length > 0;
      updateTest("8", {
        status: ok ? "pass" : "fail",
        result: r,
        failReason: ok ? undefined : "tools/list completo falhou ou veio vazio",
      });
    }

    // 9. /mcp-server health_check (diagnóstico)
    {
      const r = await rpc(FULL_URL, "tools/call", { name: "health_check", arguments: {} }, apiKey.trim());
      const ok = r.status === 200 && !r.body?.error;
      updateTest("9", {
        status: ok ? "pass" : "fail",
        result: r,
        failReason: ok ? undefined : "health_check falhou",
      });
    }

    setRunning(false);

    // Verdict — only blocking tests count
    setTests((prev) => {
      const blockingFails = prev.filter((t) => t.blocking && t.status !== "pass");
      setVerdict(blockingFails.length === 0 ? "green" : "red");
      return prev;
    });
  }

  const copy = (txt: string, what: string) => {
    navigator.clipboard.writeText(txt);
    toast.success(`${what} copiado`);
  };

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Validador MCP / ChatGPT</h1>
          <p className="text-muted-foreground mt-1">
            Verifica se a EXTERNAL_API_KEY é válida e se o endpoint <code>/chatgpt</code> está descobrível pelo ChatGPT.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/mcp-diagnostics">← Diagnóstico técnico</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Cola a tua API key e executa</CardTitle>
          <CardDescription>
            A chave fica só na memória do browser. Nunca é guardada nem enviada para mais lado nenhum além do nosso edge function.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <Input
              type="password"
              placeholder="EXTERNAL_API_KEY"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
            <Input
              placeholder='Query de teste (ex: "infiltracao")'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button onClick={runAll} disabled={running || !apiKey.trim()}>
              {running ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />a validar…</> : "Validar agora"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {verdict !== "unknown" && (
        <Card className={verdict === "green" ? "border-emerald-500" : "border-destructive"}>
          <CardContent className="pt-6 flex items-start gap-3">
            {verdict === "green" ? (
              <ShieldCheck className="h-8 w-8 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="h-8 w-8 text-destructive shrink-0" />
            )}
            <div>
              <h2 className="text-xl font-semibold">
                {verdict === "green"
                  ? "Chave válida. /chatgpt está descobrível e executável."
                  : "Há testes bloqueantes a falhar — vê os detalhes abaixo."}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {verdict === "green"
                  ? "Podes recriar o conector no ChatGPT Builder / Developer Mode com o bloco copy-paste mais abaixo."
                  : "Resolve a primeira falha bloqueante e volta a correr. Os testes 8 e 9 são só diagnóstico e não bloqueiam."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>2. Resultados</CardTitle>
          <CardDescription>Testes 1-7 são bloqueantes (focados em <code>/chatgpt</code>). 8-9 são diagnóstico.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tests.map((t) => (
            <div key={t.id} className="border rounded-lg p-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    <span className="text-muted-foreground mr-2">#{t.id}</span>
                    {t.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Esperado: {t.expected}
                  </div>
                  {t.failReason && (
                    <div className="text-sm text-destructive mt-2 flex items-start gap-1">
                      <XCircle className="h-4 w-4 mt-0.5 shrink-0" /> {t.failReason}
                    </div>
                  )}
                  {t.hint && (
                    <div className="text-sm text-amber-700 dark:text-amber-400 mt-1 flex items-start gap-1">
                      <Info className="h-4 w-4 mt-0.5 shrink-0" /> {t.hint}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {t.result && (
                    <span className="text-xs text-muted-foreground">
                      HTTP {t.result.status || "—"} · {t.result.durationMs}ms
                    </span>
                  )}
                  <StatusBadge status={t.status} blocking={t.blocking} />
                </div>
              </div>
              {t.result && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer">Ver resposta</summary>
                  <ScrollArea className="h-40 mt-2">
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                      {typeof t.result.body === "string" ? t.result.body : JSON.stringify(t.result.body, null, 2)}
                    </pre>
                  </ScrollArea>
                </details>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Configuração no ChatGPT (copy-paste)</CardTitle>
          <CardDescription>Usar exatamente estes valores. Recriar o conector se já existir (o Builder mantém cache do descriptor).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <label className="text-sm font-medium">MCP Server URL</label>
            <div className="flex gap-2">
              <Input readOnly value={CHATGPT_URL} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copy(CHATGPT_URL, "URL")}><Copy className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Header name</label>
              <div className="flex gap-2">
                <Input readOnly value="x-api-key" className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copy("x-api-key", "Header")}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Header value</label>
              <div className="flex gap-2">
                <Input readOnly type="password" value={apiKey || ""} placeholder="(cola a chave acima)" className="font-mono text-xs" />
                <Button variant="outline" size="icon" disabled={!apiKey} onClick={() => copy(apiKey, "API key")}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Transport: <strong>HTTP (Streamable HTTP)</strong>. Auth type: <strong>Custom header</strong>. Não usar Bearer.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Guia: ligar ao ChatGPT</CardTitle>
          <CardDescription>Dois caminhos. Escolhe o que se aplica.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          <section>
            <h3 className="font-semibold text-base mb-2">A. Developer Mode (ChatGPT app, recomendado para uso pessoal/admin)</h3>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>ChatGPT → Settings → <strong>Connectors</strong> → Advanced → ativar <strong>Developer mode</strong>.</li>
              <li>Connectors → <strong>Create</strong> → <strong>Custom connector</strong>.</li>
              <li>Name: <code>Condominio</code>. MCP URL e header: usar o bloco acima.</li>
              <li>Marcar "I trust this application" → <strong>Save</strong>.</li>
              <li>O conector deve listar <strong>search</strong> e <strong>fetch</strong>. Se aparecer 0 actions, ver troubleshooting D.</li>
              <li>Em nova conversa, ativar o conector no composer e testar: <em>"procura assistências pendentes desta semana"</em>.</li>
            </ol>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">B. Agent Builder (platform.openai.com)</h3>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>No agente, Tools → <strong>Add MCP server</strong> (NÃO "Add action/OpenAPI" — não é a mesma coisa).</li>
              <li>URL, transport HTTP (Streamable), Auth = Custom header <code>x-api-key</code> com a chave.</li>
              <li>Se já existia um conector com problemas: <strong>apagar e criar com nome novo</strong>. Editar não recarrega <code>tools/list</code>.</li>
              <li>"Test connection" tem de listar 2 actions.</li>
            </ol>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">D. Troubleshooting "0 actions" — por ordem de probabilidade</h3>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>O conector foi criado como <strong>Action / OpenAPI</strong> em vez de <strong>MCP</strong>. Recriar como MCP.</li>
              <li><strong>Cache do Builder</strong>. Apagar e criar de novo com nome diferente.</li>
              <li>A <strong>URL</strong> tem de terminar em <code>/chatgpt</code>, não em <code>/mcp-server</code>.</li>
              <li>O <strong>header</strong> tem de ser <code>x-api-key</code> em minúsculas, sem prefixo <code>Bearer</code>.</li>
              <li><strong>Workspace sem MCP ativo</strong> (planos Free / alguns Team antigos). Alternativa: usar Developer Mode na app de ChatGPT.</li>
              <li>Chave <strong>revogada ou rotada</strong>. Corre o validador acima; se o teste 6 falhar com 401, rotaciona em Edge Function Secrets.</li>
            </ol>
          </section>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild variant="outline" size="sm">
              <a href="https://chatgpt.com/" target="_blank" rel="noreferrer">Abrir ChatGPT <ExternalLink className="h-3 w-3 ml-1" /></a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="https://platform.openai.com/" target="_blank" rel="noreferrer">Abrir Agent Builder <ExternalLink className="h-3 w-3 ml-1" /></a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="https://supabase.com/dashboard/project/zmpitnpmplemfozvtbam/settings/functions" target="_blank" rel="noreferrer">Edge Function Secrets <ExternalLink className="h-3 w-3 ml-1" /></a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
