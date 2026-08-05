import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  TestTube,
  Activity,
  Stethoscope,
  Bot,
  KeyRound,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { CHATGPT_URL, FULL_URL } from "@/lib/mcpClient";

const INFO_URL = `${FULL_URL}/info`;
const PROJECT_REF = "zmpitnpmplemfozvtbam";
const SUPABASE_AUTH_BASE = `https://${PROJECT_REF}.supabase.co/auth/v1`;

const HTTP_HEADERS = [
  { name: "x-api-key", value: "<EXTERNAL_API_KEY>", secret: true, required: true },
  { name: "accept", value: "application/json, text/event-stream", secret: false, required: true },
];

const OAUTH_FIELDS = [
  { label: "Client ID", value: "condo-assist-mcp", description: "Identificador do cliente OAuth" },
  { label: "Client secret", value: "<EXTERNAL_API_KEY>", description: "Usa a EXTERNAL_API_KEY do projeto", secret: true },
  { label: "Authorization endpoint", value: `${SUPABASE_AUTH_BASE}/authorize`, description: "Endpoint de autorização do Supabase Auth" },
  { label: "Token endpoint", value: `${SUPABASE_AUTH_BASE}/token`, description: "Endpoint de tokens do Supabase Auth" },
  { label: "Scopes", value: "(deixar vazio)", description: "O token de acesso Supabase não usa scopes" },
];

const QUICK_LINKS = [
  { label: "Testes MCP", path: "/mcp-test", icon: TestTube },
  { label: "Health MCP", path: "/mcp-health", icon: Activity },
  { label: "Diagnósticos MCP", path: "/mcp-diagnostics", icon: Stethoscope },
];

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          toast.success(`${label} copiado`);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("Erro ao copiar");
        }
      }}
    >
      {copied ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

function EndpointRow({ label, url }: { label: string; url: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground font-mono">{url}</p>
      </div>
      <CopyButton text={url} label={label} />
    </div>
  );
}

export default function McpSetup() {
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [statusInfo, setStatusInfo] = useState<Record<string, unknown> | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const checkStatus = async () => {
    setStatus("loading");
    setStatusError(null);
    try {
      const res = await fetch(INFO_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStatusInfo(data);
      setStatus("ok");
      toast.success(`Servidor MCP operacional (${data.tools ?? "?"} tools)`);
    } catch (e) {
      setStatus("error");
      setStatusError(String((e as Error)?.message ?? e));
      toast.error("Servidor MCP não responde");
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const renderHeaderValue = (value: string) => {
    if (value === "<EXTERNAL_API_KEY>") {
      return apiKey.trim() || "(cola a tua EXTERNAL_API_KEY acima)";
    }
    return value;
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="h-6 w-6" />
          Configuração MCP
        </h1>
        <p className="text-muted-foreground">
          Dados necessários para ligar o Condo Assist MCP a clientes externos (Grok Live, Claude Desktop, ChatGPT).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Chave de API
          </CardTitle>
          <CardDescription>
            Cola aqui a <code>EXTERNAL_API_KEY</code> do projeto. A chave nunca é guardada nem enviada para lado nenhum — serve apenas para preencher os exemplos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="api-key">EXTERNAL_API_KEY</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="b0951bfc0fd7360286c3123197bb87a1ccd2e6769adb35d67ffa62f345ec32da"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Encontra-a em <strong>Project Settings → Secrets → EXTERNAL_API_KEY</strong>. Não partilhes esta chave publicamente.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Server URLs</CardTitle>
          <CardDescription>
            O URL a colar no campo <em>Server URL</em> do cliente MCP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <EndpointRow label="Modo completo (133 tools)" url={FULL_URL} />
          <EndpointRow label="Modo ChatGPT-safe (search + fetch)" url={CHATGPT_URL} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>HTTP headers (modo API key)</CardTitle>
          <CardDescription>
            Adiciona estes headers no formulário "Add custom MCP server". Marca <code>x-api-key</code> como <strong>Secret</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Header</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Secret</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {HTTP_HEADERS.map((h) => (
                <TableRow key={h.name}>
                  <TableCell className="font-mono text-xs">{h.name}</TableCell>
                  <TableCell className="font-mono text-xs max-w-xs truncate">
                    {renderHeaderValue(h.value)}
                  </TableCell>
                  <TableCell>
                    {h.secret ? (
                      <Badge variant="secondary">Sim</Badge>
                    ) : (
                      <Badge variant="outline">Não</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <CopyButton
                      text={h.value === "<EXTERNAL_API_KEY>" ? apiKey.trim() || h.value : h.value}
                      label={h.name}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 rounded-md border border-warning/20 bg-warning/10 p-3 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
            <div className="text-sm text-warning-foreground">
              <strong>Não adiciones</strong> <code>Authorization: Bearer ...</code>. O servidor aceita <code>x-api-key</code> ou um token OAuth Supabase válido; um <code>Authorization</code> com a anon key causa 401.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>OAuth credentials (modo OAuth)</CardTitle>
          <CardDescription>
            Só preenches se o cliente MCP exigir OAuth em vez de API key. O servidor funciona como <em>resource server</em> e valida tokens emitidos pelo Supabase Auth.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {OAUTH_FIELDS.map((f) => (
            <div key={f.label} className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.description}</p>
                <p className="truncate text-xs text-muted-foreground font-mono mt-1">
                  {f.value === "<EXTERNAL_API_KEY>" ? renderHeaderValue(f.value) : f.value}
                </p>
              </div>
              <CopyButton
                text={f.value === "<EXTERNAL_API_KEY>" ? apiKey.trim() || f.value : f.value}
                label={f.label}
              />
            </div>
          ))}
          <div className="rounded-md border p-3 text-sm text-muted-foreground">
            <strong>Nota:</strong> o fluxo OAuth 2.1 requer que o Supabase Auth esteja configurado como authorization server no projeto. Se o cliente não suportar API key direta, contacta o administrador do projeto para confirmar que o OAuth 2.1 está activo.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verificação de estado</CardTitle>
          <CardDescription>
            Faz um pedido público <code>GET /mcp-server/info</code> para confirmar que o servidor está online.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={checkStatus} disabled={status === "loading"}>
              {status === "loading" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Verificar agora
            </Button>
            {status === "ok" && (
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Online</span>
              </div>
            )}
            {status === "error" && (
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Offline</span>
              </div>
            )}
          </div>
          {statusInfo && (
            <div className="rounded-md border p-3 text-sm space-y-1">
              <p><strong>Nome:</strong> {String(statusInfo.name)}</p>
              <p><strong>Versão:</strong> {String(statusInfo.version)}</p>
              <p><strong>Tools:</strong> {String(statusInfo.tools)}</p>
              <p><strong>Transporte:</strong> {String(statusInfo.protocol)}</p>
            </div>
          )}
          {statusError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {statusError}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instruções para Grok Live</CardTitle>
          <CardDescription>
            Passos curtos para adicionar o servidor MCP no Grok Live.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Em Grok Live, escolhe <strong>Add custom MCP server</strong>.</li>
            <li>Em <strong>Name</strong>, cola <em>Condo Assist MCP</em> (ou outro nome à tua escolha).</li>
            <li>Em <strong>Server URL</strong>, usa o URL do modo completo.</li>
            <li>
              Se o Grok mostrar <strong>HTTP headers</strong>:
              adiciona <code>x-api-key</code> com a <code>EXTERNAL_API_KEY</code> e marca-a como <strong>Secret</strong>.
            </li>
            <li>
              Se o Grok mostrar <strong>OAuth credentials</strong>:
              preenche os campos da secção "OAuth credentials" acima.
            </li>
            <li>Guarda e testa com: <em>"lista 3 edifícios"</em>.</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ligações rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {QUICK_LINKS.map((link) => (
              <Button key={link.path} variant="outline" asChild>
                <Link to={link.path} className="flex items-center gap-2">
                  <link.icon className="h-4 w-4" />
                  {link.label}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
