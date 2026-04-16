// MCP Server — exposes Agent API operations as MCP tools
// Connect via Claude Desktop / MCP Inspector using Streamable HTTP transport
// URL: https://<project>.supabase.co/functions/v1/mcp-server
// Auth: header "x-api-key: <EXTERNAL_API_KEY>" (also accepts Authorization: Bearer)

import { Hono } from "hono";
import { McpServer, StreamableHttpTransport } from "mcp-lite";
import { z } from "zod";

const AGENT_API_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/agent-api`;
const EXTERNAL_API_KEY = Deno.env.get("EXTERNAL_API_KEY") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// ── HTTP helper that calls the underlying agent-api ──
async function callAgentApi(
  method: string,
  path: string,
  opts: { body?: unknown; query?: Record<string, string | undefined>; idempotencyKey?: string } = {},
): Promise<unknown> {
  const url = new URL(`${AGENT_API_URL}${path}`);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": EXTERNAL_API_KEY,
    // Supabase Edge runtime requires the apikey header for function-to-function calls
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  };
  if (opts.idempotencyKey) headers["idempotency-key"] = opts.idempotencyKey;

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  let data: unknown;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    throw new Error(`agent-api ${method} ${path} → ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return data;
}

function asText(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

// ── MCP Server ──
const mcp = new McpServer({
  name: "condo-assist-mcp",
  version: "1.0.0",
});

// 1. Health
mcp.tool({
  name: "health_check",
  description: "Verifica se a Agent API está operacional. Não requer parâmetros.",
  inputSchema: { type: "object", properties: {} },
  handler: async () => asText(await callAgentApi("GET", "/v1/health")),
});

// 2. Lookup building by email
mcp.tool({
  name: "lookup_building_by_email",
  description: "Procura o edifício/condomínio associado a um email de condómino registado. Devolve building_id, código, nome, morada e contacto.",
  inputSchema: {
    type: "object",
    properties: { email: { type: "string", description: "Email do condómino" } },
    required: ["email"],
  },
  handler: async ({ email }: { email: string }) =>
    asText(await callAgentApi("POST", "/v1/lookup-building-by-email", { body: { email } })),
});

// 3. List assistances for a building
mcp.tool({
  name: "list_assistances",
  description: "Lista assistências de um edifício. Filtra por estado (open/closed/pending/in_progress/completed/etc). Suporta paginação.",
  inputSchema: {
    type: "object",
    properties: {
      building_id: { type: "string", description: "UUID do edifício" },
      status: { type: "string", description: "Filtro: open (default), closed, ou estado exato (pending, in_progress, completed, ...)" },
      limit: { type: "number", description: "Máx 100. Default 20." },
      offset: { type: "number", description: "Default 0." },
    },
    required: ["building_id"],
  },
  handler: async ({ building_id, status, limit, offset }: { building_id: string; status?: string; limit?: number; offset?: number }) =>
    asText(await callAgentApi("GET", `/v1/buildings/${building_id}/assistances`, {
      query: { status, limit: limit?.toString(), offset: offset?.toString() },
    })),
});

// 4. Get assistance detail
mcp.tool({
  name: "get_assistance",
  description: "Detalhe completo de uma assistência: dados, edifício, fornecedor, comunicações, progresso e emails.",
  inputSchema: {
    type: "object",
    properties: { assistance_id: { type: "string", description: "UUID da assistência" } },
    required: ["assistance_id"],
  },
  handler: async ({ assistance_id }: { assistance_id: string }) =>
    asText(await callAgentApi("GET", `/v1/assistances/${assistance_id}`)),
});

// 5. List intervention types
mcp.tool({
  name: "list_intervention_types",
  description: "Lista tipos de intervenção disponíveis (canalização, electricidade, etc). Use o id na criação de assistências.",
  inputSchema: { type: "object", properties: {} },
  handler: async () => asText(await callAgentApi("GET", "/v1/intervention-types")),
});

// 6. Create assistance
mcp.tool({
  name: "create_assistance",
  description: "Cria uma nova assistência para um edifício. Use idempotency_key para evitar duplicados em retries.",
  inputSchema: {
    type: "object",
    properties: {
      building_id: { type: "string", description: "UUID do edifício" },
      title: { type: "string", description: "Título curto (máx 140 chars)" },
      description: { type: "string", description: "Descrição detalhada do problema" },
      intervention_type_id: { type: "string", description: "UUID do tipo de intervenção" },
      priority: { type: "string", enum: ["normal", "urgent", "critical"], description: "Default: normal" },
      source: { type: "string", description: "Default: email_agent" },
      assigned_supplier_id: { type: "string", description: "UUID do fornecedor (opcional)" },
      triggered_by_contact_email: { type: "string", description: "Email do condómino que originou o pedido (audit)" },
      idempotency_key: { type: "string", description: "Chave única para evitar duplicação (TTL 24h)" },
    },
    required: ["building_id", "title", "description", "intervention_type_id"],
  },
  handler: async (args: Record<string, unknown>) => {
    const { idempotency_key, ...body } = args;
    return asText(await callAgentApi("POST", "/v1/assistances", { body, idempotencyKey: idempotency_key as string | undefined }));
  },
});

// 7. Add communication
mcp.tool({
  name: "add_communication",
  description: "Adiciona uma comunicação/mensagem ao log de uma assistência (sender_type default: ai_agent).",
  inputSchema: {
    type: "object",
    properties: {
      assistance_id: { type: "string" },
      message: { type: "string" },
      sender_type: { type: "string", description: "Default: ai_agent. Outros: admin, supplier" },
      message_type: { type: "string", description: "Default: general" },
    },
    required: ["assistance_id", "message"],
  },
  handler: async ({ assistance_id, ...body }: { assistance_id: string; [k: string]: unknown }) =>
    asText(await callAgentApi("POST", `/v1/assistances/${assistance_id}/communications`, { body })),
});

// 8. Save email draft
mcp.tool({
  name: "save_email_draft",
  description: "Guarda um rascunho de email gerado pelo AI para revisão admin. Estado inicial: pending_review.",
  inputSchema: {
    type: "object",
    properties: {
      assistance_id: { type: "string" },
      recipient_email: { type: "string" },
      subject: { type: "string" },
      content: { type: "string", description: "Corpo do email (HTML ou texto)" },
      template_used: { type: "string", description: "Default: ai_agent_v1" },
      source_email_id: { type: "string" },
      classification: { type: "string" },
      recipient_name: { type: "string" },
      idempotency_key: { type: "string", description: "Chave única (TTL 24h)" },
    },
    required: ["assistance_id", "recipient_email", "subject", "content"],
  },
  handler: async (args: Record<string, unknown>) => {
    const { assistance_id, idempotency_key, ...body } = args;
    return asText(await callAgentApi("POST", `/v1/assistances/${assistance_id}/email-log`, {
      body,
      idempotencyKey: idempotency_key as string | undefined,
    }));
  },
});

// 9. Update email log status
mcp.tool({
  name: "update_email_status",
  description: "Aprova/rejeita/marca como enviado um rascunho de email.",
  inputSchema: {
    type: "object",
    properties: {
      email_log_id: { type: "string" },
      ai_draft_status: { type: "string", enum: ["approved", "rejected", "sent", "auto_sent"] },
      approved_by: { type: "string", description: "UUID do profile que aprovou (opcional)" },
    },
    required: ["email_log_id", "ai_draft_status"],
  },
  handler: async ({ email_log_id, ...body }: { email_log_id: string; [k: string]: unknown }) =>
    asText(await callAgentApi("PATCH", `/v1/email-log/${email_log_id}/status`, { body })),
});

// 10. Import contacts (bulk)
mcp.tool({
  name: "import_contacts",
  description: "Importa/atualiza contactos de condóminos em bulk (máx 500). Faz upsert por email.",
  inputSchema: {
    type: "object",
    properties: {
      contacts: {
        type: "array",
        description: "Lista de contactos. Cada item: {email, building_id OU building_code, first_name, last_name, phone, fraction, role, is_primary_contact}",
        items: { type: "object" },
      },
    },
    required: ["contacts"],
  },
  handler: async ({ contacts }: { contacts: unknown[] }) =>
    asText(await callAgentApi("POST", "/v1/import-contacts", { body: { contacts } })),
});

// 11. Search knowledge base
mcp.tool({
  name: "search_knowledge",
  description: "Pesquisa artigos da base de conhecimento (full-text). Filtros: q, category, building_id, tags.",
  inputSchema: {
    type: "object",
    properties: {
      q: { type: "string", description: "Termo de pesquisa" },
      category: { type: "string" },
      building_id: { type: "string" },
      tags: { type: "string", description: "Tags separadas por vírgula" },
      limit: { type: "number", description: "Máx 50. Default 20." },
      offset: { type: "number", description: "Default 0." },
    },
  },
  handler: async ({ q, category, building_id, tags, limit, offset }: Record<string, unknown>) =>
    asText(await callAgentApi("GET", "/v1/knowledge", {
      query: {
        q: q as string,
        category: category as string,
        building_id: building_id as string,
        tags: tags as string,
        limit: limit?.toString(),
        offset: offset?.toString(),
      },
    })),
});

// 12. Get knowledge article
mcp.tool({
  name: "get_knowledge_article",
  description: "Detalhe completo de um artigo da base de conhecimento (incluindo conteúdo).",
  inputSchema: {
    type: "object",
    properties: { article_id: { type: "string" } },
    required: ["article_id"],
  },
  handler: async ({ article_id }: { article_id: string }) =>
    asText(await callAgentApi("GET", `/v1/knowledge/${article_id}`)),
});

// 13. Create knowledge article
mcp.tool({
  name: "create_knowledge_article",
  description: "Cria novo artigo na base de conhecimento.",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      content: { type: "string" },
      category: { type: "string" },
      subcategory: { type: "string" },
      tags: { type: "array", items: { type: "string" } },
      building_id: { type: "string", description: "UUID — null para artigo global" },
      is_global: { type: "boolean", description: "Default false" },
      is_published: { type: "boolean", description: "Default true" },
      metadata: { type: "object" },
    },
    required: ["title", "content", "category"],
  },
  handler: async (body: Record<string, unknown>) =>
    asText(await callAgentApi("POST", "/v1/knowledge", { body })),
});

// 14. Update knowledge article
mcp.tool({
  name: "update_knowledge_article",
  description: "Atualiza artigo existente. Apenas envia os campos a alterar.",
  inputSchema: {
    type: "object",
    properties: {
      article_id: { type: "string" },
      title: { type: "string" },
      content: { type: "string" },
      category: { type: "string" },
      subcategory: { type: "string" },
      tags: { type: "array", items: { type: "string" } },
      building_id: { type: "string" },
      is_global: { type: "boolean" },
      is_published: { type: "boolean" },
      metadata: { type: "object" },
    },
    required: ["article_id"],
  },
  handler: async ({ article_id, ...body }: { article_id: string; [k: string]: unknown }) =>
    asText(await callAgentApi("PATCH", `/v1/knowledge/${article_id}`, { body })),
});

// 15. Delete knowledge article
mcp.tool({
  name: "delete_knowledge_article",
  description: "Elimina artigo da base de conhecimento.",
  inputSchema: {
    type: "object",
    properties: { article_id: { type: "string" } },
    required: ["article_id"],
  },
  handler: async ({ article_id }: { article_id: string }) =>
    asText(await callAgentApi("DELETE", `/v1/knowledge/${article_id}`)),
});

// ── HTTP transport (Hono) ──
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, mcp-session-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

const app = new Hono();

// Auth middleware — accepts Bearer token, x-api-key, or query param ?api_key=
app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Public health check via GET / (returns server info, no auth)
  if (c.req.method === "GET" && new URL(c.req.url).pathname.endsWith("/info")) {
    return c.json({
      name: "condo-assist-mcp",
      version: "1.0.0",
      transport: "streamable-http",
      tools: 15,
    }, 200, corsHeaders);
  }

  const authHeader = c.req.header("authorization") ?? "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "");
  const apiKey = c.req.header("x-api-key") ?? bearer ?? new URL(c.req.url).searchParams.get("api_key") ?? "";

  if (!EXTERNAL_API_KEY || apiKey !== EXTERNAL_API_KEY) {
    return c.json({ error: "Unauthorized. Provide x-api-key header or Bearer token." }, 401, corsHeaders);
  }

  await next();
});

const transport = new StreamableHttpTransport();
const mcpHandler = transport.bind(mcp);

app.all("*", async (c) => {
  const res = await mcpHandler(c.req.raw);
  // Merge CORS headers
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
});

Deno.serve(app.fetch);
