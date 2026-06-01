// MCP Server — exposes Agent API operations as MCP tools
// Connect via Claude Desktop / MCP Inspector using Streamable HTTP transport
// URL: https://<project>.supabase.co/functions/v1/mcp-server
// Auth: header "x-api-key: <EXTERNAL_API_KEY>" (also accepts Authorization: Bearer)

import { Hono } from "hono";
import { McpServer, StreamableHttpTransport } from "mcp-lite";

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
  const result: {
    content: Array<{ type: "text"; text: string }>;
    structuredContent?: unknown;
  } = { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  if (data !== null && typeof data === "object") result.structuredContent = data;
  return result;
}

// Strict OpenAI search/fetch standard: exactly one content item with JSON-encoded text,
// no structuredContent, no extra fields.
function asJsonText(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

function titleFromName(name: string) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function defaultToolAnnotations(name: string) {
  const writes = /^(create|update|delete|upload|submit|save|add|import)/.test(name);
  return {
    readOnlyHint: !writes,
    destructiveHint: /^(delete)/.test(name),
    idempotentHint: !writes,
    openWorldHint: true,
  };
}

// ── MCP Server ──
const mcp = new McpServer({
  name: "condo-assist-mcp",
  version: "1.0.0",
});

const registeredTools: Array<Record<string, unknown>> = [];
const originalTool = mcp.tool.bind(mcp);
(mcp as any).tool = (name: string, def: Record<string, unknown>) => {
  const enriched = {
    ...def,
    title: (def.title as string | undefined) ?? titleFromName(name),
    inputSchema: def.inputSchema ?? { type: "object", properties: {} },
    annotations: {
      ...defaultToolAnnotations(name),
      ...((def.annotations as Record<string, unknown> | undefined) ?? {}),
    },
  };
  registeredTools.push({
    name,
    title: enriched.title,
    description: def.description,
    inputSchema: enriched.inputSchema,
    outputSchema: (def as any).outputSchema,
    annotations: enriched.annotations,
  });
  return originalTool(name, enriched);
};

// 1. Health
mcp.tool("health_check", {
  description: "Verifica se a Agent API está operacional. Não requer parâmetros.",
  inputSchema: { type: "object", properties: {} },
  outputSchema: {
    type: "object",
    properties: {
      status: { type: "string" },
      version: { type: "string" },
      timestamp: { type: "string" },
    },
    required: ["status"],
  },
  handler: async () => asText(await callAgentApi("GET", "/v1/health")),
});

// 2. Lookup building by email
mcp.tool("lookup_building_by_email", {
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
mcp.tool("list_assistances", {
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
mcp.tool("get_assistance", {
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
mcp.tool("list_intervention_types", {
  description: "Lista tipos de intervenção disponíveis (canalização, electricidade, etc). Use o id na criação de assistências.",
  inputSchema: { type: "object", properties: {} },
  handler: async () => asText(await callAgentApi("GET", "/v1/intervention-types")),
});

// 6. Create assistance
mcp.tool("create_assistance", {
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
mcp.tool("add_communication", {
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
mcp.tool("save_email_draft", {
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
mcp.tool("update_email_status", {
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
mcp.tool("import_contacts", {
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
mcp.tool("search_knowledge", {
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
mcp.tool("get_knowledge_article", {
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
mcp.tool("create_knowledge_article", {
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
mcp.tool("update_knowledge_article", {
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
mcp.tool("delete_knowledge_article", {
  description: "Elimina artigo da base de conhecimento.",
  inputSchema: {
    type: "object",
    properties: { article_id: { type: "string" } },
    required: ["article_id"],
  },
  handler: async ({ article_id }: { article_id: string }) =>
    asText(await callAgentApi("DELETE", `/v1/knowledge/${article_id}`)),
});

// ═══════════ BUILDINGS ═══════════

mcp.tool("list_buildings", {
  description: "[Edifícios] Lista edifícios/condomínios. Filtros: q (code/name/address), is_active, limit (max 200), offset.",
  inputSchema: {
    type: "object",
    properties: {
      q: { type: "string" },
      is_active: { type: "boolean" },
      limit: { type: "number" },
      offset: { type: "number" },
    },
  },
  handler: async ({ q, is_active, limit, offset }: Record<string, unknown>) =>
    asText(await callAgentApi("GET", "/v1/buildings", {
      query: { q: q as string, is_active: is_active !== undefined ? String(is_active) : undefined, limit: (limit as number)?.toString(), offset: (offset as number)?.toString() },
    })),
});

mcp.tool("get_building", {
  description: "[Edifícios] Detalhe completo de um edifício.",
  inputSchema: {
    type: "object",
    properties: { building_id: { type: "string" } },
    required: ["building_id"],
  },
  handler: async ({ building_id }: { building_id: string }) =>
    asText(await callAgentApi("GET", `/v1/buildings/${building_id}`)),
});

mcp.tool("create_building", {
  description: "[Edifícios] Cria novo edifício. Campos: code, name, address, nif, cadastral_code, admin_notes, is_active.",
  inputSchema: {
    type: "object",
    properties: {
      code: { type: "string" },
      name: { type: "string" },
      address: { type: "string" },
      nif: { type: "string" },
      cadastral_code: { type: "string" },
      admin_notes: { type: "string" },
      is_active: { type: "boolean" },
    },
    required: ["code", "name"],
  },
  handler: async (body: Record<string, unknown>) =>
    asText(await callAgentApi("POST", "/v1/buildings", { body })),
});

mcp.tool("update_building", {
  description: "[Edifícios] Atualiza edifício existente.",
  inputSchema: {
    type: "object",
    properties: {
      building_id: { type: "string" },
      code: { type: "string" },
      name: { type: "string" },
      address: { type: "string" },
      nif: { type: "string" },
      cadastral_code: { type: "string" },
      admin_notes: { type: "string" },
      is_active: { type: "boolean" },
    },
    required: ["building_id"],
  },
  handler: async ({ building_id, ...body }: { building_id: string; [k: string]: unknown }) =>
    asText(await callAgentApi("PATCH", `/v1/buildings/${building_id}`, { body })),
});

mcp.tool("list_building_contacts", {
  description: "[Edifícios] Lista contactos de condóminos de um edifício.",
  inputSchema: {
    type: "object",
    properties: { building_id: { type: "string" } },
    required: ["building_id"],
  },
  handler: async ({ building_id }: { building_id: string }) =>
    asText(await callAgentApi("GET", `/v1/buildings/${building_id}/contacts`)),
});

// ═══════════ ASSISTÊNCIAS (complementar) ═══════════

mcp.tool("update_assistance", {
  description: "[Assistências] Atualiza campos de uma assistência: status, priority, supplier, datas, notas, custos, etc.",
  inputSchema: {
    type: "object",
    properties: {
      assistance_id: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
      status: { type: "string", enum: ["pending", "awaiting_quotation", "quotation_rejected", "in_progress", "completed", "cancelled", "accepted", "scheduled"] },
      priority: { type: "string", enum: ["normal", "urgent", "critical"] },
      assigned_supplier_id: { type: "string" },
      intervention_type_id: { type: "string" },
      scheduled_start_date: { type: "string" },
      scheduled_end_date: { type: "string" },
      actual_start_date: { type: "string" },
      actual_end_date: { type: "string" },
      completed_date: { type: "string" },
      admin_notes: { type: "string" },
      supplier_notes: { type: "string" },
      progress_notes: { type: "string" },
      estimated_cost: { type: "number" },
      final_cost: { type: "number" },
      estimated_duration_hours: { type: "number" },
      requires_quotation: { type: "boolean" },
      requires_validation: { type: "boolean" },
      expected_completion_date: { type: "string" },
    },
    required: ["assistance_id"],
  },
  handler: async ({ assistance_id, ...body }: { assistance_id: string; [k: string]: unknown }) =>
    asText(await callAgentApi("PATCH", `/v1/assistances/${assistance_id}`, { body })),
});

mcp.tool("list_assistance_communications", {
  description: "[Assistências] Lista completa do log de comunicações de uma assistência.",
  inputSchema: {
    type: "object",
    properties: { assistance_id: { type: "string" } },
    required: ["assistance_id"],
  },
  handler: async ({ assistance_id }: { assistance_id: string }) =>
    asText(await callAgentApi("GET", `/v1/assistances/${assistance_id}/communications`)),
});

mcp.tool("list_assistance_photos", {
  description: "[Assistências] Lista fotos associadas a uma assistência.",
  inputSchema: {
    type: "object",
    properties: { assistance_id: { type: "string" } },
    required: ["assistance_id"],
  },
  handler: async ({ assistance_id }: { assistance_id: string }) =>
    asText(await callAgentApi("GET", `/v1/assistances/${assistance_id}/photos`)),
});

mcp.tool("list_assistance_progress", {
  description: "[Assistências] Timeline de progresso de uma assistência.",
  inputSchema: {
    type: "object",
    properties: { assistance_id: { type: "string" } },
    required: ["assistance_id"],
  },
  handler: async ({ assistance_id }: { assistance_id: string }) =>
    asText(await callAgentApi("GET", `/v1/assistances/${assistance_id}/progress`)),
});

// ═══════════ FORNECEDORES ═══════════

mcp.tool("list_suppliers", {
  description: "[Fornecedores] Lista fornecedores. Filtros: q, specialization, is_active.",
  inputSchema: {
    type: "object",
    properties: {
      q: { type: "string" },
      specialization: { type: "string" },
      is_active: { type: "boolean" },
      limit: { type: "number" },
      offset: { type: "number" },
    },
  },
  handler: async ({ q, specialization, is_active, limit, offset }: Record<string, unknown>) =>
    asText(await callAgentApi("GET", "/v1/suppliers", {
      query: { q: q as string, specialization: specialization as string, is_active: is_active !== undefined ? String(is_active) : undefined, limit: (limit as number)?.toString(), offset: (offset as number)?.toString() },
    })),
});

mcp.tool("get_supplier", {
  description: "[Fornecedores] Detalhe de um fornecedor.",
  inputSchema: {
    type: "object",
    properties: { supplier_id: { type: "string" } },
    required: ["supplier_id"],
  },
  handler: async ({ supplier_id }: { supplier_id: string }) =>
    asText(await callAgentApi("GET", `/v1/suppliers/${supplier_id}`)),
});

mcp.tool("create_supplier", {
  description: "[Fornecedores] Cria novo fornecedor.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string" },
      email: { type: "string" },
      phone: { type: "string" },
      address: { type: "string" },
      nif: { type: "string" },
      specialization: { type: "string" },
      admin_notes: { type: "string" },
      is_active: { type: "boolean" },
    },
    required: ["name"],
  },
  handler: async (body: Record<string, unknown>) =>
    asText(await callAgentApi("POST", "/v1/suppliers", { body })),
});

mcp.tool("update_supplier", {
  description: "[Fornecedores] Atualiza fornecedor.",
  inputSchema: {
    type: "object",
    properties: {
      supplier_id: { type: "string" },
      name: { type: "string" },
      email: { type: "string" },
      phone: { type: "string" },
      address: { type: "string" },
      nif: { type: "string" },
      specialization: { type: "string" },
      admin_notes: { type: "string" },
      is_active: { type: "boolean" },
      rating: { type: "number" },
    },
    required: ["supplier_id"],
  },
  handler: async ({ supplier_id, ...body }: { supplier_id: string; [k: string]: unknown }) =>
    asText(await callAgentApi("PATCH", `/v1/suppliers/${supplier_id}`, { body })),
});

// ═══════════ ACTAS (assembly_items) ═══════════

mcp.tool("list_assembly_items", {
  description: "[Actas] Lista itens de seguimento de actas. Filtros: building_id, building_code, status, category, year, q.",
  inputSchema: {
    type: "object",
    properties: {
      building_id: { type: "string" },
      building_code: { type: "number" },
      status: { type: "string" },
      category: { type: "string" },
      year: { type: "number" },
      q: { type: "string" },
      limit: { type: "number" },
      offset: { type: "number" },
    },
  },
  handler: async ({ building_id, building_code, status, category, year, q, limit, offset }: Record<string, unknown>) =>
    asText(await callAgentApi("GET", "/v1/assembly-items", {
      query: {
        building_id: building_id as string,
        building_code: (building_code as number)?.toString(),
        status: status as string,
        category: category as string,
        year: (year as number)?.toString(),
        q: q as string,
        limit: (limit as number)?.toString(),
        offset: (offset as number)?.toString(),
      },
    })),
});

mcp.tool("get_assembly_item", {
  description: "[Actas] Detalhe de um item de acta.",
  inputSchema: {
    type: "object",
    properties: { item_id: { type: "string" } },
    required: ["item_id"],
  },
  handler: async ({ item_id }: { item_id: string }) =>
    asText(await callAgentApi("GET", `/v1/assembly-items/${item_id}`)),
});

mcp.tool("create_assembly_item", {
  description: "[Actas] Cria novo item de seguimento de acta.",
  inputSchema: {
    type: "object",
    properties: {
      description: { type: "string" },
      building_code: { type: "number", description: "Código numérico do edifício (obrigatório)" },
      building_id: { type: "string" },
      building_address: { type: "string" },
      category: { type: "string" },
      status: { type: "string", description: "Default: pending" },
      status_notes: { type: "string" },
      priority: { type: "string", description: "Default: normal" },
      year: { type: "number" },
      assigned_to: { type: "string" },
      estimated_cost: { type: "number" },
      resolution_date: { type: "string" },
      source_sheet: { type: "string" },
      knowledge_article_id: { type: "string" },
    },
    required: ["description", "building_code"],
  },
  handler: async (body: Record<string, unknown>) =>
    asText(await callAgentApi("POST", "/v1/assembly-items", { body })),
});

mcp.tool("update_assembly_item", {
  description: "[Actas] Atualiza item de acta (status, notas, custos, etc).",
  inputSchema: {
    type: "object",
    properties: {
      item_id: { type: "string" },
      description: { type: "string" },
      building_id: { type: "string" },
      building_code: { type: "number" },
      building_address: { type: "string" },
      category: { type: "string" },
      status: { type: "string" },
      status_notes: { type: "string" },
      priority: { type: "string" },
      year: { type: "number" },
      assigned_to: { type: "string" },
      estimated_cost: { type: "number" },
      resolution_date: { type: "string" },
      source_sheet: { type: "string" },
      knowledge_article_id: { type: "string" },
    },
    required: ["item_id"],
  },
  handler: async ({ item_id, ...body }: { item_id: string; [k: string]: unknown }) =>
    asText(await callAgentApi("PATCH", `/v1/assembly-items/${item_id}`, { body })),
});

mcp.tool("delete_assembly_item", {
  description: "[Actas] Elimina item de acta.",
  inputSchema: {
    type: "object",
    properties: { item_id: { type: "string" } },
    required: ["item_id"],
  },
  handler: async ({ item_id }: { item_id: string }) =>
    asText(await callAgentApi("DELETE", `/v1/assembly-items/${item_id}`)),
});

// ═══════════ ORÇAMENTOS ═══════════

mcp.tool("list_quotations", {
  description: "[Orçamentos] Lista orçamentos. Filtros: assistance_id, supplier_id, status.",
  inputSchema: {
    type: "object",
    properties: {
      assistance_id: { type: "string" },
      supplier_id: { type: "string" },
      status: { type: "string" },
      limit: { type: "number" },
      offset: { type: "number" },
    },
  },
  handler: async ({ assistance_id, supplier_id, status, limit, offset }: Record<string, unknown>) =>
    asText(await callAgentApi("GET", "/v1/quotations", {
      query: {
        assistance_id: assistance_id as string,
        supplier_id: supplier_id as string,
        status: status as string,
        limit: (limit as number)?.toString(),
        offset: (offset as number)?.toString(),
      },
    })),
});

mcp.tool("get_quotation", {
  description: "[Orçamentos] Detalhe de um orçamento.",
  inputSchema: {
    type: "object",
    properties: { quotation_id: { type: "string" } },
    required: ["quotation_id"],
  },
  handler: async ({ quotation_id }: { quotation_id: string }) =>
    asText(await callAgentApi("GET", `/v1/quotations/${quotation_id}`)),
});

// ═══════════ FOLLOW-UPS & NOTIFICAÇÕES ═══════════

mcp.tool("list_follow_ups", {
  description: "[Follow-ups] Lista agendamentos de follow-up. Filtros: assistance_id, supplier_id, status.",
  inputSchema: {
    type: "object",
    properties: {
      assistance_id: { type: "string" },
      supplier_id: { type: "string" },
      status: { type: "string" },
      limit: { type: "number" },
      offset: { type: "number" },
    },
  },
  handler: async ({ assistance_id, supplier_id, status, limit, offset }: Record<string, unknown>) =>
    asText(await callAgentApi("GET", "/v1/follow-ups", {
      query: {
        assistance_id: assistance_id as string,
        supplier_id: supplier_id as string,
        status: status as string,
        limit: (limit as number)?.toString(),
        offset: (offset as number)?.toString(),
      },
    })),
});

mcp.tool("list_notifications", {
  description: "[Notificações] Lista notificações agendadas/enviadas.",
  inputSchema: {
    type: "object",
    properties: {
      assistance_id: { type: "string" },
      supplier_id: { type: "string" },
      status: { type: "string" },
      limit: { type: "number" },
      offset: { type: "number" },
    },
  },
  handler: async ({ assistance_id, supplier_id, status, limit, offset }: Record<string, unknown>) =>
    asText(await callAgentApi("GET", "/v1/notifications", {
      query: {
        assistance_id: assistance_id as string,
        supplier_id: supplier_id as string,
        status: status as string,
        limit: (limit as number)?.toString(),
        offset: (offset as number)?.toString(),
      },
    })),
});

// ═══════════ TIPOS DE INTERVENÇÃO (CRUD) ═══════════

mcp.tool("create_intervention_type", {
  description: "[Tipos Intervenção] Cria novo tipo de intervenção.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string" },
      category: { type: "string" },
      description: { type: "string" },
      urgency_level: { type: "string", enum: ["normal", "urgent", "critical"] },
    },
    required: ["name"],
  },
  handler: async (body: Record<string, unknown>) =>
    asText(await callAgentApi("POST", "/v1/intervention-types", { body })),
});

mcp.tool("update_intervention_type", {
  description: "[Tipos Intervenção] Atualiza tipo de intervenção.",
  inputSchema: {
    type: "object",
    properties: {
      type_id: { type: "string" },
      name: { type: "string" },
      category: { type: "string" },
      description: { type: "string" },
      urgency_level: { type: "string", enum: ["normal", "urgent", "critical"] },
    },
    required: ["type_id"],
  },
  handler: async ({ type_id, ...body }: { type_id: string; [k: string]: unknown }) =>
    asText(await callAgentApi("PATCH", `/v1/intervention-types/${type_id}`, { body })),
});

// ═══════════ FOTOS ═══════════

mcp.tool("upload_assistance_photo", {
  description: "[Fotos] Faz upload de uma foto associada a uma assistência. Body inclui file (base64) + photo_type (before/during/after/other) + caption opcional. Tamanho máx 10MB.",
  inputSchema: {
    type: "object",
    properties: {
      assistance_id: { type: "string" },
      photo_type: { type: "string", enum: ["before", "during", "after", "other"] },
      caption: { type: "string" },
      file: {
        type: "object",
        description: "{ name: string, type?: string (mime), data: string (base64, com ou sem data: prefix) }",
      },
      idempotency_key: { type: "string", description: "Chave única para evitar duplicação (TTL via activity_log)" },
    },
    required: ["assistance_id", "photo_type", "file"],
  },
  handler: async ({ assistance_id, idempotency_key, ...body }: { assistance_id: string; idempotency_key?: string; [k: string]: unknown }) =>
    asText(await callAgentApi("POST", `/v1/assistances/${assistance_id}/photos`, { body, idempotencyKey: idempotency_key })),
});

mcp.tool("delete_assistance_photo", {
  description: "[Fotos] Elimina uma foto (storage + registo). Apenas admin.",
  inputSchema: {
    type: "object",
    properties: { photo_id: { type: "string" } },
    required: ["photo_id"],
  },
  handler: async ({ photo_id }: { photo_id: string }) =>
    asText(await callAgentApi("DELETE", `/v1/photos/${photo_id}`)),
});

// ═══════════ ORÇAMENTOS (write) ═══════════

mcp.tool("create_quotation", {
  description: "[Orçamentos] Submete novo orçamento de um fornecedor para uma assistência.",
  inputSchema: {
    type: "object",
    properties: {
      assistance_id: { type: "string" },
      supplier_id: { type: "string" },
      amount: { type: "number" },
      description: { type: "string" },
      notes: { type: "string" },
      validity_days: { type: "number", description: "Default 30" },
      status: { type: "string", enum: ["pending", "submitted", "approved", "rejected", "expired"], description: "Default submitted" },
      is_requested: { type: "boolean" },
      idempotency_key: { type: "string" },
    },
    required: ["assistance_id", "supplier_id", "amount"],
  },
  handler: async ({ idempotency_key, ...body }: { idempotency_key?: string; [k: string]: unknown }) =>
    asText(await callAgentApi("POST", "/v1/quotations", { body, idempotencyKey: idempotency_key })),
});

mcp.tool("update_quotation", {
  description: "[Orçamentos] Atualiza orçamento (aprovar/rejeitar/alterar valor). Quando status=approved, aplica approved_at e approved_by.",
  inputSchema: {
    type: "object",
    properties: {
      quotation_id: { type: "string" },
      amount: { type: "number" },
      description: { type: "string" },
      notes: { type: "string" },
      validity_days: { type: "number" },
      status: { type: "string", enum: ["pending", "submitted", "approved", "rejected", "expired"] },
      is_requested: { type: "boolean" },
      approved_by: { type: "string", description: "UUID do profile (apenas usado se status=approved)" },
    },
    required: ["quotation_id"],
  },
  handler: async ({ quotation_id, ...body }: { quotation_id: string; [k: string]: unknown }) =>
    asText(await callAgentApi("PATCH", `/v1/quotations/${quotation_id}`, { body })),
});

mcp.tool("delete_quotation", {
  description: "[Orçamentos] Elimina orçamento (admin).",
  inputSchema: {
    type: "object",
    properties: { quotation_id: { type: "string" } },
    required: ["quotation_id"],
  },
  handler: async ({ quotation_id }: { quotation_id: string }) =>
    asText(await callAgentApi("DELETE", `/v1/quotations/${quotation_id}`)),
});

// ═══════════ RESPOSTAS DE FORNECEDOR ═══════════

mcp.tool("submit_supplier_response", {
  description: "[Respostas] Regista resposta de fornecedor a uma assistência (accepted/declined/needs_info). Quando accepted+scheduled_start_date, marca a assistência como 'scheduled'.",
  inputSchema: {
    type: "object",
    properties: {
      assistance_id: { type: "string" },
      supplier_id: { type: "string" },
      response_type: { type: "string", enum: ["accepted", "declined", "needs_info"] },
      decline_reason: { type: "string" },
      notes: { type: "string" },
      response_comments: { type: "string" },
      estimated_completion_date: { type: "string" },
      estimated_duration_hours: { type: "number" },
      scheduled_start_date: { type: "string" },
      scheduled_end_date: { type: "string" },
    },
    required: ["assistance_id", "supplier_id", "response_type"],
  },
  handler: async ({ assistance_id, ...body }: { assistance_id: string; [k: string]: unknown }) =>
    asText(await callAgentApi("POST", `/v1/assistances/${assistance_id}/supplier-response`, { body })),
});

mcp.tool("list_supplier_responses", {
  description: "[Respostas] Histórico de respostas de fornecedores para uma assistência.",
  inputSchema: {
    type: "object",
    properties: { assistance_id: { type: "string" } },
    required: ["assistance_id"],
  },
  handler: async ({ assistance_id }: { assistance_id: string }) =>
    asText(await callAgentApi("GET", `/v1/assistances/${assistance_id}/supplier-responses`)),
});

// ═══════════ NOTIFICAÇÕES & FOLLOW-UPS (write) ═══════════

mcp.tool("update_notification", {
  description: "[Notificações] Atualiza notificação (status sent/cancelled/failed, sent_at, etc).",
  inputSchema: {
    type: "object",
    properties: {
      notification_id: { type: "string" },
      status: { type: "string" },
      scheduled_for: { type: "string" },
      sent_at: { type: "string" },
      priority: { type: "string" },
      metadata: { type: "object" },
    },
    required: ["notification_id"],
  },
  handler: async ({ notification_id, ...body }: { notification_id: string; [k: string]: unknown }) =>
    asText(await callAgentApi("PATCH", `/v1/notifications/${notification_id}`, { body })),
});

mcp.tool("create_follow_up", {
  description: "[Follow-ups] Agenda manualmente um follow-up para uma assistência.",
  inputSchema: {
    type: "object",
    properties: {
      assistance_id: { type: "string" },
      follow_up_type: { type: "string", description: "Ex: quotation_reminder, work_reminder, completion_check" },
      scheduled_for: { type: "string", description: "ISO timestamp" },
      priority: { type: "string", enum: ["normal", "urgent", "critical"] },
      supplier_id: { type: "string" },
      max_attempts: { type: "number", description: "Default 3" },
      metadata: { type: "object" },
      status: { type: "string", description: "Default pending" },
      next_attempt_at: { type: "string" },
      idempotency_key: { type: "string" },
    },
    required: ["assistance_id", "follow_up_type", "scheduled_for"],
  },
  handler: async ({ idempotency_key, ...body }: { idempotency_key?: string; [k: string]: unknown }) =>
    asText(await callAgentApi("POST", "/v1/follow-ups", { body, idempotencyKey: idempotency_key })),
});

// ═══════════ ACTIVITY LOG ═══════════

mcp.tool("list_activity_log", {
  description: "[Audit] Lista entradas do registo de actividade. Filtros: assistance_id, supplier_id, user_id, action.",
  inputSchema: {
    type: "object",
    properties: {
      assistance_id: { type: "string" },
      supplier_id: { type: "string" },
      user_id: { type: "string" },
      action: { type: "string" },
      limit: { type: "number" },
      offset: { type: "number" },
    },
  },
  handler: async ({ assistance_id, supplier_id, user_id, action, limit, offset }: Record<string, unknown>) =>
    asText(await callAgentApi("GET", "/v1/activity-log", {
      query: {
        assistance_id: assistance_id as string,
        supplier_id: supplier_id as string,
        user_id: user_id as string,
        action: action as string,
        limit: (limit as number)?.toString(),
        offset: (offset as number)?.toString(),
      },
    })),
});

// ═══════════ BUILDING ADMINISTRATORS ═══════════
mcp.tool("list_building_administrators", {
  description: "[Edifícios] Lista administradores/contactos de gestão de um edifício (até 5).",
  inputSchema: { type: "object", properties: { building_id: { type: "string" } }, required: ["building_id"] },
  handler: async ({ building_id }: { building_id: string }) =>
    asText(await callAgentApi("GET", `/v1/buildings/${building_id}/administrators`)),
});
mcp.tool("create_building_administrator", {
  description: "[Edifícios] Cria um administrador para um edifício. Máx 5 por edifício.",
  inputSchema: {
    type: "object",
    properties: {
      building_id: { type: "string" }, name: { type: "string" },
      email: { type: "string" }, phone: { type: "string" }, floor: { type: "string" },
      role: { type: "string" }, notes: { type: "string" },
      is_primary: { type: "boolean" }, display_order: { type: "number" },
    },
    required: ["building_id", "name"],
  },
  handler: async ({ building_id, ...body }: { building_id: string; [k: string]: unknown }) =>
    asText(await callAgentApi("POST", `/v1/buildings/${building_id}/administrators`, { body })),
});
mcp.tool("update_building_administrator", {
  description: "[Edifícios] Actualiza administrador.",
  inputSchema: {
    type: "object",
    properties: {
      admin_id: { type: "string" }, name: { type: "string" }, email: { type: "string" },
      phone: { type: "string" }, floor: { type: "string" }, role: { type: "string" },
      notes: { type: "string" }, is_primary: { type: "boolean" }, display_order: { type: "number" },
    },
    required: ["admin_id"],
  },
  handler: async ({ admin_id, ...body }: { admin_id: string; [k: string]: unknown }) =>
    asText(await callAgentApi("PATCH", `/v1/building-administrators/${admin_id}`, { body })),
});
mcp.tool("delete_building_administrator", {
  description: "[Edifícios] Apaga administrador.",
  inputSchema: { type: "object", properties: { admin_id: { type: "string" } }, required: ["admin_id"] },
  handler: async ({ admin_id }: { admin_id: string }) =>
    asText(await callAgentApi("DELETE", `/v1/building-administrators/${admin_id}`)),
});

// ═══════════ KEY HANDOVERS ═══════════
mcp.tool("list_key_handovers", {
  description: "[Chaves] Lista entregas de chaves. Filtros: building_id, status (open/returned).",
  inputSchema: { type: "object", properties: { building_id: { type: "string" }, status: { type: "string", enum: ["open", "returned"] }, limit: { type: "number" }, offset: { type: "number" } } },
  handler: async (args: Record<string, unknown>) =>
    asText(await callAgentApi("GET", "/v1/key-handovers", { query: { building_id: args.building_id as string, status: args.status as string, limit: (args.limit as number)?.toString(), offset: (args.offset as number)?.toString() } })),
});
mcp.tool("create_key_handover", {
  description: "[Chaves] Regista entrega de chaves a alguém (fornecedor, condómino, etc).",
  inputSchema: {
    type: "object",
    properties: {
      building_id: { type: "string" }, picked_up_by_name: { type: "string" },
      picked_up_by_phone: { type: "string" }, picked_up_at: { type: "string" },
      purpose: { type: "string" }, notes: { type: "string" },
      assistance_id: { type: "string" }, supplier_id: { type: "string" },
    },
    required: ["building_id", "picked_up_by_name"],
  },
  handler: async (body: Record<string, unknown>) =>
    asText(await callAgentApi("POST", "/v1/key-handovers", { body })),
});
mcp.tool("update_key_handover", {
  description: "[Chaves] Actualiza registo (ex: marcar devolução com returned_at e returned_by_name).",
  inputSchema: {
    type: "object",
    properties: {
      handover_id: { type: "string" }, returned_by_name: { type: "string" }, returned_at: { type: "string" },
      picked_up_by_name: { type: "string" }, picked_up_by_phone: { type: "string" }, picked_up_at: { type: "string" },
      purpose: { type: "string" }, notes: { type: "string" },
    },
    required: ["handover_id"],
  },
  handler: async ({ handover_id, ...body }: { handover_id: string; [k: string]: unknown }) =>
    asText(await callAgentApi("PATCH", `/v1/key-handovers/${handover_id}`, { body })),
});

// ═══════════ BUILDING DOCUMENTS ═══════════
mcp.tool("list_building_documents", {
  description: "[Documentos] Lista documentos arquivados de um edifício (atas, certificados, orçamentos, contratos, seguros, etc).",
  inputSchema: { type: "object", properties: { building_id: { type: "string" }, category: { type: "string" } }, required: ["building_id"] },
  handler: async ({ building_id, category }: { building_id: string; category?: string }) =>
    asText(await callAgentApi("GET", `/v1/buildings/${building_id}/documents`, { query: { category } })),
});
mcp.tool("upload_building_document", {
  description: "[Documentos] Carrega documento (base64, máx 50MB) para a biblioteca de um edifício.",
  inputSchema: {
    type: "object",
    properties: {
      building_id: { type: "string" }, file_name: { type: "string" }, file_base64: { type: "string" },
      mime_type: { type: "string" }, category: { type: "string", description: "atas, certificados_gas, certificados_inspecao, orcamentos, contratos, seguros, fotos, outros" },
      title: { type: "string" }, description: { type: "string" }, document_date: { type: "string" },
    },
    required: ["building_id", "file_name", "file_base64"],
  },
  handler: async ({ building_id, ...body }: { building_id: string; [k: string]: unknown }) =>
    asText(await callAgentApi("POST", `/v1/buildings/${building_id}/documents`, { body })),
});
mcp.tool("delete_building_document", {
  description: "[Documentos] Apaga documento da biblioteca (e do storage).",
  inputSchema: { type: "object", properties: { doc_id: { type: "string" } }, required: ["doc_id"] },
  handler: async ({ doc_id }: { doc_id: string }) =>
    asText(await callAgentApi("DELETE", `/v1/building-documents/${doc_id}`)),
});

// ═══════════ INSURANCE CLAIMS / SINISTROS ═══════════
mcp.tool("list_insurance_claims", {
  description: "[Sinistros] Lista participações de sinistro. Filtros: building_id, status (aberto, em_analise, em_reparacao, fechado, indeferido).",
  inputSchema: { type: "object", properties: { building_id: { type: "string" }, status: { type: "string" }, limit: { type: "number" }, offset: { type: "number" } } },
  handler: async (args: Record<string, unknown>) =>
    asText(await callAgentApi("GET", "/v1/insurance-claims", { query: { building_id: args.building_id as string, status: args.status as string, limit: (args.limit as number)?.toString(), offset: (args.offset as number)?.toString() } })),
});
mcp.tool("get_insurance_claim", {
  description: "[Sinistros] Detalhe de um sinistro com notas e anexos.",
  inputSchema: { type: "object", properties: { claim_id: { type: "string" } }, required: ["claim_id"] },
  handler: async ({ claim_id }: { claim_id: string }) =>
    asText(await callAgentApi("GET", `/v1/insurance-claims/${claim_id}`)),
});
mcp.tool("create_insurance_claim", {
  description: "[Sinistros] Cria participação de sinistro (opcionalmente ligada a uma assistência e/ou apólice).",
  inputSchema: {
    type: "object",
    properties: {
      building_id: { type: "string" }, description: { type: "string" },
      assistance_id: { type: "string" }, insurance_id: { type: "string" },
      occurrence_date: { type: "string" }, reported_date: { type: "string" },
      damage_location: { type: "string" }, insurer_claim_ref: { type: "string" },
      insurer_contact: { type: "string" }, status: { type: "string" },
      estimated_amount: { type: "number" }, final_amount: { type: "number" }, notes: { type: "string" },
    },
    required: ["building_id", "description"],
  },
  handler: async (body: Record<string, unknown>) =>
    asText(await callAgentApi("POST", "/v1/insurance-claims", { body })),
});
mcp.tool("update_insurance_claim", {
  description: "[Sinistros] Actualiza dados/estado de um sinistro.",
  inputSchema: {
    type: "object",
    properties: {
      claim_id: { type: "string" }, description: { type: "string" }, assistance_id: { type: "string" },
      insurance_id: { type: "string" }, occurrence_date: { type: "string" }, reported_date: { type: "string" },
      damage_location: { type: "string" }, insurer_claim_ref: { type: "string" }, insurer_contact: { type: "string" },
      status: { type: "string" }, estimated_amount: { type: "number" }, final_amount: { type: "number" }, notes: { type: "string" },
    },
    required: ["claim_id"],
  },
  handler: async ({ claim_id, ...body }: { claim_id: string; [k: string]: unknown }) =>
    asText(await callAgentApi("PATCH", `/v1/insurance-claims/${claim_id}`, { body })),
});
mcp.tool("add_claim_note", {
  description: "[Sinistros] Adiciona nota ao sinistro (timeline).",
  inputSchema: { type: "object", properties: { claim_id: { type: "string" }, body: { type: "string" } }, required: ["claim_id", "body"] },
  handler: async ({ claim_id, body }: { claim_id: string; body: string }) =>
    asText(await callAgentApi("POST", `/v1/insurance-claims/${claim_id}/notes`, { body: { body } })),
});

// ── ChatGPT Apps SDK compatibility: required `search` and `fetch` tools ──
const APP_BASE_URL = "https://condo-assist.lovable.app";

const searchOutputSchema = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          url: { type: "string" },
        },
        required: ["id", "title", "url"],
        additionalProperties: false,
      },
    },
  },
  required: ["results"],
  additionalProperties: false,
} as const;

const fetchOutputSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    text: { type: "string" },
    url: { type: "string" },
    metadata: { type: "object", additionalProperties: true },
  },
  required: ["id", "title", "text", "url"],
  additionalProperties: false,
} as const;

const searchDef = {
  title: "Search",
  description: "Search across assistances, buildings, suppliers, knowledge base and assembly items. Returns a list of results with id, title and url, compatible with the ChatGPT/OpenAI Apps SDK search standard.",
  inputSchema: {
    type: "object",
    properties: { query: { type: "string", description: "Search query" } },
    required: ["query"],
    additionalProperties: false,
  },
  outputSchema: searchOutputSchema,
  annotations: {
    readOnlyHint: true,
    openWorldHint: false,
    destructiveHint: false,
    idempotentHint: true,
  },
  handler: async ({ query }: { query: string }) => {
    const q = (query ?? "").trim();
    const results: Array<{ id: string; title: string; url: string }> = [];
    if (!q) return asJsonText({ results });

    const safe = async <T,>(p: Promise<T>): Promise<T | null> => {
      try { return await p; } catch { return null; }
    };

    const [buildings, suppliers, knowledge, assemblyItems] = await Promise.all([
      safe(callAgentApi("GET", "/v1/buildings", { query: { q, limit: "10" } }) as Promise<any>),
      safe(callAgentApi("GET", "/v1/suppliers", { query: { q, limit: "10" } }) as Promise<any>),
      safe(callAgentApi("GET", "/v1/knowledge", { query: { q, limit: "10" } }) as Promise<any>),
      safe(callAgentApi("GET", "/v1/assembly-items", { query: { q, limit: "10" } }) as Promise<any>),
    ]);

    const pushArr = (data: any, key: string, mapper: (item: any) => { id: string; title: string; url: string } | null) => {
      const arr = Array.isArray(data) ? data : (data?.[key] ?? data?.items ?? data?.data ?? []);
      if (!Array.isArray(arr)) return;
      for (const item of arr) {
        const m = mapper(item);
        if (m) results.push(m);
      }
    };

    pushArr(buildings, "buildings", (b) => b?.id ? {
      id: `building:${b.id}`,
      title: `Edifício ${b.code ?? ""}${b.code && b.name ? " - " : ""}${b.name ?? ""}`.trim(),
      url: `${APP_BASE_URL}/edificios`,
    } : null);
    pushArr(suppliers, "suppliers", (s) => s?.id ? {
      id: `supplier:${s.id}`,
      title: `Fornecedor: ${s.name ?? s.id}`,
      url: `${APP_BASE_URL}/fornecedores`,
    } : null);
    pushArr(knowledge, "articles", (k) => k?.id ? {
      id: `knowledge:${k.id}`,
      title: k.title ?? "Artigo",
      url: `${APP_BASE_URL}/knowledge`,
    } : null);
    pushArr(assemblyItems, "items", (item) => item?.id ? {
      id: `assembly:${item.id}`,
      title: `Ata/pendência: ${item.description ?? item.status_notes ?? item.id}`,
      url: `${APP_BASE_URL}/assembly`,
    } : null);

    return asJsonText({ results: results.slice(0, 30) });
  },
};

const fetchDef = {
  title: "Fetch",
  description: "Fetch the full content of a single item by id. The id must be in the form `type:uuid` (assistance|building|supplier|knowledge|assembly). Returns id, title, text, url and metadata, compatible with the ChatGPT/OpenAI Apps SDK fetch standard.",
  inputSchema: {
    type: "object",
    properties: { id: { type: "string", description: "Identifier in the form `type:uuid`" } },
    required: ["id"],
    additionalProperties: false,
  },
  outputSchema: fetchOutputSchema,
  annotations: {
    readOnlyHint: true,
    openWorldHint: false,
    destructiveHint: false,
    idempotentHint: true,
  },
  handler: async ({ id }: { id: string }) => {
    const [type, uuid] = String(id ?? "").split(":");
    if (!type || !uuid) {
      return asJsonText({ id, title: "Invalid id", text: "id must be in the form `type:uuid` (assistance|building|supplier|knowledge|assembly).", url: APP_BASE_URL, metadata: { error: "invalid_id" } });
    }
    const pathMap: Record<string, string> = {
      assistance: `/v1/assistances/${uuid}`,
      building: `/v1/buildings/${uuid}`,
      supplier: `/v1/suppliers/${uuid}`,
      knowledge: `/v1/knowledge/${uuid}`,
      assembly: `/v1/assembly-items/${uuid}`,
    };
    const urlMap: Record<string, string> = {
      assistance: `${APP_BASE_URL}/assistencias`,
      building: `${APP_BASE_URL}/edificios`,
      supplier: `${APP_BASE_URL}/fornecedores`,
      knowledge: `${APP_BASE_URL}/knowledge`,
      assembly: `${APP_BASE_URL}/assembly`,
    };
    const path = pathMap[type];
    if (!path) {
      return asJsonText({ id, title: `Unknown type: ${type}`, text: "Allowed types: assistance, building, supplier, knowledge, assembly.", url: APP_BASE_URL, metadata: { error: "unknown_type", type } });
    }

    try {
      const data: any = await callAgentApi("GET", path);
      const title = data?.title ?? data?.name ?? `${type} ${uuid}`;
      return asJsonText({
        id,
        title,
        text: JSON.stringify(data, null, 2),
        url: urlMap[type],
        metadata: { type, uuid },
      });
    } catch (err) {
      return asJsonText({
        id,
        title: `${type} ${uuid}`,
        text: `Could not fetch: ${(err as Error).message}`,
        url: urlMap[type],
        metadata: { type, uuid, error: "fetch_failed" },
      });
    }
  },
};

mcp.tool("search", searchDef as any);
mcp.tool("fetch", fetchDef as any);

// ── ChatGPT-safe MCP endpoint: native JSON-RPC, ONLY `search` + `fetch` ──
// The Builder rejects connectors whose `tools/list` does not contain `search`
// and `fetch` exactly. We bypass mcp-lite here and emit a strict MCP
// 2025-06-18 JSON-RPC response to remove any surprises in transport,
// content-type, or descriptor shape.

const PROTOCOL_VERSION = "2025-06-18";

const chatgptSearchDescriptor = {
  name: "search",
  title: "Search",
  description:
    "Search across assistances, buildings, suppliers, knowledge base and assembly items. Returns results with id, title and url. Compatible with the ChatGPT Apps SDK / deep research `search` standard.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query string" },
    },
    required: ["query"],
    additionalProperties: false,
  },
  outputSchema: searchOutputSchema,
  annotations: {
    readOnlyHint: true,
    openWorldHint: false,
    destructiveHint: false,
    idempotentHint: true,
  },
};

const chatgptFetchDescriptor = {
  name: "fetch",
  title: "Fetch",
  description:
    "Fetch the full content of a single item by id (`type:uuid`, type ∈ assistance|building|supplier|knowledge|assembly). Compatible with the ChatGPT Apps SDK / deep research `fetch` standard.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Identifier in the form `type:uuid`" },
    },
    required: ["id"],
    additionalProperties: false,
  },
  outputSchema: fetchOutputSchema,
  annotations: {
    readOnlyHint: true,
    openWorldHint: false,
    destructiveHint: false,
    idempotentHint: true,
  },
};

const chatgptToolsList = [chatgptSearchDescriptor, chatgptFetchDescriptor];

async function runChatgptSearch(query: string) {
  const q = (query ?? "").trim();
  const results: Array<{ id: string; title: string; url: string }> = [];
  if (!q) return { results };

  const safe = async <T,>(p: Promise<T>): Promise<T | null> => {
    try { return await p; } catch { return null; }
  };

  const [buildings, suppliers, knowledge, assemblyItems] = await Promise.all([
    safe(callAgentApi("GET", "/v1/buildings", { query: { q, limit: "10" } }) as Promise<any>),
    safe(callAgentApi("GET", "/v1/suppliers", { query: { q, limit: "10" } }) as Promise<any>),
    safe(callAgentApi("GET", "/v1/knowledge", { query: { q, limit: "10" } }) as Promise<any>),
    safe(callAgentApi("GET", "/v1/assembly-items", { query: { q, limit: "10" } }) as Promise<any>),
  ]);

  const pushArr = (data: any, key: string, mapper: (item: any) => { id: string; title: string; url: string } | null) => {
    const arr = Array.isArray(data) ? data : (data?.[key] ?? data?.items ?? data?.data ?? []);
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      const m = mapper(item);
      if (m) results.push(m);
    }
  };

  pushArr(buildings, "buildings", (b) => b?.id ? {
    id: `building:${b.id}`,
    title: `Edifício ${b.code ?? ""}${b.code && b.name ? " - " : ""}${b.name ?? ""}`.trim(),
    url: `${APP_BASE_URL}/edificios`,
  } : null);
  pushArr(suppliers, "suppliers", (s) => s?.id ? {
    id: `supplier:${s.id}`,
    title: `Fornecedor: ${s.name ?? s.id}`,
    url: `${APP_BASE_URL}/fornecedores`,
  } : null);
  pushArr(knowledge, "articles", (k) => k?.id ? {
    id: `knowledge:${k.id}`,
    title: k.title ?? "Artigo",
    url: `${APP_BASE_URL}/knowledge`,
  } : null);
  pushArr(assemblyItems, "items", (item) => item?.id ? {
    id: `assembly:${item.id}`,
    title: `Ata/pendência: ${item.description ?? item.status_notes ?? item.id}`,
    url: `${APP_BASE_URL}/assembly`,
  } : null);

  return { results: results.slice(0, 30) };
}

async function runChatgptFetch(id: string) {
  const [type, uuid] = String(id ?? "").split(":");
  if (!type || !uuid) {
    return {
      id, title: "Invalid id",
      text: "id must be in the form `type:uuid` (assistance|building|supplier|knowledge|assembly).",
      url: APP_BASE_URL, metadata: { error: "invalid_id" },
    };
  }
  const pathMap: Record<string, string> = {
    assistance: `/v1/assistances/${uuid}`,
    building: `/v1/buildings/${uuid}`,
    supplier: `/v1/suppliers/${uuid}`,
    knowledge: `/v1/knowledge/${uuid}`,
    assembly: `/v1/assembly-items/${uuid}`,
  };
  const urlMap: Record<string, string> = {
    assistance: `${APP_BASE_URL}/assistencias`,
    building: `${APP_BASE_URL}/edificios`,
    supplier: `${APP_BASE_URL}/fornecedores`,
    knowledge: `${APP_BASE_URL}/knowledge`,
    assembly: `${APP_BASE_URL}/assembly`,
  };
  const path = pathMap[type];
  if (!path) {
    return {
      id, title: `Unknown type: ${type}`,
      text: "Allowed types: assistance, building, supplier, knowledge, assembly.",
      url: APP_BASE_URL, metadata: { error: "unknown_type", type },
    };
  }
  try {
    const data: any = await callAgentApi("GET", path);
    const title = data?.title ?? data?.name ?? `${type} ${uuid}`;
    return {
      id, title,
      text: JSON.stringify(data, null, 2),
      url: urlMap[type], metadata: { type, uuid },
    };
  } catch (err) {
    return {
      id, title: `${type} ${uuid}`,
      text: `Could not fetch: ${(err as Error).message}`,
      url: urlMap[type], metadata: { type, uuid, error: "fetch_failed" },
    };
  }
}

function jsonRpcResult(id: unknown, result: unknown) {
  return { jsonrpc: "2.0" as const, id: id ?? null, result };
}
function jsonRpcError(id: unknown, code: number, message: string, data?: unknown) {
  return { jsonrpc: "2.0" as const, id: id ?? null, error: { code, message, ...(data !== undefined ? { data } : {}) } };
}

// Native JSON-RPC handler for `/chatgpt`. Always responds with plain JSON
// (never SSE) and only supports the MCP methods needed by ChatGPT:
// initialize, notifications/initialized, ping, tools/list, tools/call.
// Auth is enforced by the outer middleware.
async function chatgptRpcHandler(req: Request): Promise<Response> {
  const baseHeaders: Record<string, string> = {
    ...corsHeaders,
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };

  if (req.method === "GET") {
    return new Response(JSON.stringify({
      name: "condo-assist-mcp-chatgpt",
      version: "2.0.0",
      protocolVersion: PROTOCOL_VERSION,
      tools: chatgptToolsList.map((t) => t.name),
    }), { status: 200, headers: baseHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify(jsonRpcError(null, -32000, "Method Not Allowed")), {
      status: 405, headers: baseHeaders,
    });
  }

  let body: any = null;
  try { body = await req.json(); }
  catch {
    return new Response(JSON.stringify(jsonRpcError(null, -32700, "Parse error")), {
      status: 200, headers: baseHeaders,
    });
  }

  const handleOne = async (msg: any): Promise<any | null> => {
    const id = msg?.id;
    const method = msg?.method;
    if (typeof method !== "string") return jsonRpcError(id ?? null, -32600, "Invalid Request");
    const isNotification = id === undefined || id === null;

    switch (method) {
      case "initialize":
        return jsonRpcResult(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "condo-assist-mcp-chatgpt", version: "2.0.0" },
          instructions: "Retrieval server exposing `search` and `fetch` tools for ChatGPT Apps / deep research.",
        });
      case "notifications/initialized":
      case "notifications/cancelled":
      case "notifications/roots/list_changed":
        return null;
      case "ping":
        return jsonRpcResult(id, {});
      case "tools/list":
        return jsonRpcResult(id, { tools: chatgptToolsList });
      case "tools/call": {
        const params = msg?.params ?? {};
        const name = params?.name;
        const args = params?.arguments ?? {};
        if (name === "search") {
          const out = await runChatgptSearch(String(args?.query ?? ""));
          return jsonRpcResult(id, {
            content: [{ type: "text", text: JSON.stringify(out) }],
            structuredContent: out,
          });
        }
        if (name === "fetch") {
          const out = await runChatgptFetch(String(args?.id ?? ""));
          return jsonRpcResult(id, {
            content: [{ type: "text", text: JSON.stringify(out) }],
            structuredContent: out,
          });
        }
        return jsonRpcError(id, -32601, `Unknown tool: ${name}`);
      }
      default:
        if (isNotification) return null;
        return jsonRpcError(id, -32601, `Method not found: ${method}`);
    }
  };

  if (Array.isArray(body)) {
    const results = (await Promise.all(body.map(handleOne))).filter((r) => r !== null);
    return new Response(JSON.stringify(results), { status: 200, headers: baseHeaders });
  }

  const result = await handleOne(body);
  if (result === null) {
    return new Response(null, { status: 202, headers: corsHeaders });
  }
  return new Response(JSON.stringify(result), { status: 200, headers: baseHeaders });
}

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

  const pathname = new URL(c.req.url).pathname;

  // Public health check via GET / (returns server info, no auth)
  if (c.req.method === "GET" && pathname.endsWith("/info")) {
    return c.json({
      name: "condo-assist-mcp",
      version: "1.2.0",
      transport: "streamable-http",
      tools: 66,
      protocol: "MCP Streamable HTTP",
      compatibility: ["ChatGPT Apps SDK", "ChatGPT Agent Builder", "Claude Desktop", "MCP Inspector"],
      required_tools: { search: true, fetch: true },
      endpoints: {
        full: "/functions/v1/mcp-server",
        chatgpt_safe: "/functions/v1/mcp-server/chatgpt",
      },
    }, 200, corsHeaders);
  }

  // Public discovery: returns the registered tool descriptors, the live
  // tools/list JSON-RPC response from the same handler the Agent Builder hits,
  // and the last N MCP requests (method + rpc + body snippet) so we can
  // compare discovery vs manual calls without auth.
  if (c.req.method === "GET" && pathname.endsWith("/debug/tools")) {
    const url = new URL(c.req.url);
    const variant = url.searchParams.get("variant") === "chatgpt" ? "chatgpt" : "full";
    const handler = variant === "chatgpt" ? mcpChatGptHandler : mcpHandler;

    let liveToolsList: unknown = null;
    let liveStatus = 0;
    let liveContentType = "";
    try {
      const probeReq = new Request("https://probe.local/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "debug-tools-list", method: "tools/list", params: {} }),
      });
      const probeRes = await handler(probeReq);
      liveStatus = probeRes.status;
      liveContentType = probeRes.headers.get("content-type") ?? "";
      const txt = await probeRes.text();
      try { liveToolsList = JSON.parse(txt); } catch { liveToolsList = txt; }
    } catch (e) {
      liveToolsList = { error: String(e) };
    }

    const tools = registeredTools.map((t) => ({ ...t }));
    return c.json({
      variant,
      count: tools.length,
      has_search: tools.some((t: any) => t.name === "search"),
      has_fetch: tools.some((t: any) => t.name === "fetch"),
      tools_registry: tools,
      live_tools_list: { status: liveStatus, content_type: liveContentType, body: liveToolsList },
      recent_requests: getRecentMcpRequests(),
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

const transportChatGpt = new StreamableHttpTransport();
const mcpChatGptHandler = transportChatGpt.bind(mcpChatGpt);

// Force JSON responses for clients that send mixed Accept headers (ChatGPT
// Agent Builder cannot reliably consume the `text/event-stream` form that
// mcp-lite emits by default when SSE is acceptable).
function forceJsonAccept(req: Request): Request {
  const headers = new Headers(req.headers);
  const accept = headers.get("accept") ?? "";
  if (accept.includes("text/event-stream") && accept.includes("application/json")) {
    headers.set("accept", "application/json");
  } else if (!accept || accept === "*/*") {
    headers.set("accept", "application/json");
  }
  return new Request(req.url, {
    method: req.method,
    headers,
    body: req.body,
    redirect: req.redirect,
    // @ts-ignore — required to forward the body in Deno
    duplex: "half",
  });
}

// Ring buffer of recent MCP requests for /debug/tools inspection.
type McpDebugEntry = {
  correlationId: string;
  at: string;
  mcp: string;
  httpMethod: string;
  rpc?: string;
  rpcId?: unknown;
  tool?: string;
  status: number;
  contentType: string | null;
  ua: string;
  accept: string;
  acceptOverridden: boolean;
  ms: number;
  requestBody?: unknown;
  responseBodySnippet?: string;
};
const RECENT_MAX = 30;
const recentRequests: McpDebugEntry[] = [];
function pushRecent(e: McpDebugEntry) {
  recentRequests.push(e);
  if (recentRequests.length > RECENT_MAX) recentRequests.shift();
}
function getRecentMcpRequests() {
  return [...recentRequests].reverse();
}

async function handleMcp(c: any, handler: (req: Request) => Promise<Response>, label: string) {
  const startedAt = Date.now();
  const correlationId = (globalThis.crypto?.randomUUID?.() ?? `cid-${startedAt}-${Math.random().toString(36).slice(2, 8)}`);
  const ua = (c.req.header("user-agent") ?? "").slice(0, 120);
  const originalAccept = c.req.header("accept") ?? "";
  let rpcMethod: string | undefined;
  let rpcId: unknown;
  let toolName: string | undefined;
  let requestBody: unknown = undefined;

  let req: Request = c.req.raw;
  let acceptOverridden = false;
  if (req.method === "POST") {
    try {
      const cloned = req.clone();
      const body = await cloned.json();
      rpcMethod = body?.method;
      rpcId = body?.id;
      toolName = body?.params?.name;
      requestBody = body;
    } catch { /* not JSON */ }
    const newReq = forceJsonAccept(req);
    acceptOverridden = newReq.headers.get("accept") !== originalAccept;
    req = newReq;
  }

  console.log(JSON.stringify({
    tag: "mcp.request",
    correlationId,
    mcp: label,
    httpMethod: c.req.method,
    rpc: rpcMethod,
    rpcId,
    tool: toolName,
    accept: originalAccept,
    acceptOverridden,
    ua,
  }));

  const res = await handler(req);
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
  headers.set("x-correlation-id", correlationId);

  // Capture response body for tools/list and tools/call so we can compare
  // discovery vs manual invocations. For other methods we stream through.
  let bodyForClient: BodyInit | null = res.body;
  let responseSnippet: string | undefined;
  const shouldCapture = rpcMethod === "tools/list" || rpcMethod === "tools/call";
  if (shouldCapture) {
    const buf = await res.clone().text();
    responseSnippet = buf.length > 8000 ? buf.slice(0, 8000) + `…(+${buf.length - 8000} bytes)` : buf;
    bodyForClient = buf;
  }

  const entry: McpDebugEntry = {
    correlationId,
    at: new Date(startedAt).toISOString(),
    mcp: label,
    httpMethod: c.req.method,
    rpc: rpcMethod,
    rpcId,
    tool: toolName,
    status: res.status,
    contentType: headers.get("content-type"),
    ua,
    accept: originalAccept,
    acceptOverridden,
    ms: Date.now() - startedAt,
    requestBody: shouldCapture ? requestBody : undefined,
    responseBodySnippet: responseSnippet,
  };
  pushRecent(entry);

  console.log(JSON.stringify({
    tag: "mcp.response",
    correlationId,
    mcp: label,
    rpc: rpcMethod,
    rpcId,
    tool: toolName,
    status: res.status,
    contentType: headers.get("content-type"),
    ms: entry.ms,
    bodyPreview: responseSnippet ? responseSnippet.slice(0, 500) : undefined,
  }));

  return new Response(bodyForClient, { status: res.status, headers });
}

// ChatGPT-safe sub-path: only search/fetch/health_check, strict descriptors.
app.all("/functions/v1/mcp-server/chatgpt", (c) => handleMcp(c, mcpChatGptHandler, "chatgpt"));
app.all("/mcp-server/chatgpt", (c) => handleMcp(c, mcpChatGptHandler, "chatgpt"));
app.all("/chatgpt", (c) => handleMcp(c, mcpChatGptHandler, "chatgpt"));

// Full catalog (Claude Desktop, MCP Inspector, etc.)
app.all("*", (c) => handleMcp(c, mcpHandler, "full"));

Deno.serve(app.fetch);

