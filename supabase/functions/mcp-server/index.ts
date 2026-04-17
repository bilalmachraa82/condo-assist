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
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

// ── MCP Server ──
const mcp = new McpServer({
  name: "condo-assist-mcp",
  version: "1.0.0",
});

// 1. Health
mcp.tool("health_check", {
  description: "Verifica se a Agent API está operacional. Não requer parâmetros.",
  inputSchema: { type: "object", properties: {} },
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
