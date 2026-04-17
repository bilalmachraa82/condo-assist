import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── PII Masking (Correcção 4) ──
function maskPII(s: string): string {
  return s
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "***@***")
    .replace(/\+?\d[\d\s-]{7,}\d/g, "+***");
}

// ── Input Validation (Ajuste menor 4) ──
function requireString(v: unknown, field: string): string {
  if (typeof v !== "string" || v.trim() === "") {
    throw new HttpError(400, `Field '${field}' is required and must be a non-empty string`, "INVALID_INPUT");
  }
  return v.trim();
}

function requireUUID(v: unknown, field: string): string {
  const s = requireString(v, field);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
    throw new HttpError(400, `Field '${field}' must be a valid UUID`, "INVALID_INPUT");
  }
  return s;
}

class HttpError extends Error {
  constructor(public status: number, message: string, public code: string) {
    super(message);
  }
}

// ── SHA-256 hashing (Blocker 2) ──
async function hashApiKey(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Response helpers ──
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, idempotency-key",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, error: string, code: string): Response {
  return json({ error, code }, status);
}

// ── Supabase client (service role — bypasses RLS) ──
function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ── Auth (Correcção 2 — dual headers) ──
function extractToken(req: Request): string | null {
  return (
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    req.headers.get("x-api-key") ??
    null
  );
}

function validateToken(token: string | null): void {
  const expected = Deno.env.get("EXTERNAL_API_KEY");
  if (!token || !expected || token !== expected) {
    throw new HttpError(401, "Unauthorized", "UNAUTHORIZED");
  }
}

// ── Rate Limiting (Blocker 2 — Postgres-backed, SHA-256) ──
async function checkRateLimit(supabase: ReturnType<typeof getSupabase>, token: string): Promise<void> {
  const keyHash = await hashApiKey(token);
  const windowStart = new Date(Date.now() - 60_000).toISOString();

  // Insert current request
  await supabase.from("agent_api_rate_limit").insert({ api_key_hash: keyHash });

  // Count requests in window
  const { count } = await supabase
    .from("agent_api_rate_limit")
    .select("*", { count: "exact", head: true })
    .eq("api_key_hash", keyHash)
    .gte("request_at", windowStart);

  if (count !== null && count > 100) {
    throw new HttpError(429, "Rate limit exceeded. Max 100 requests per minute.", "RATE_LIMITED");
  }
}

// ── Route matching ──
function matchRoute(method: string, pathname: string): { handler: string; params: Record<string, string> } | null {
  const routes: Array<{ method: string; pattern: RegExp; handler: string; paramNames: string[] }> = [
    { method: "GET", pattern: /^\/v1\/health$/, handler: "health", paramNames: [] },
    { method: "POST", pattern: /^\/v1\/lookup-building-by-email$/, handler: "lookupBuilding", paramNames: [] },
    { method: "GET", pattern: /^\/v1\/buildings\/([^/]+)\/assistances$/, handler: "listAssistances", paramNames: ["buildingId"] },
    { method: "GET", pattern: /^\/v1\/assistances\/([^/]+)$/, handler: "getAssistance", paramNames: ["assistanceId"] },
    { method: "GET", pattern: /^\/v1\/intervention-types$/, handler: "listInterventionTypes", paramNames: [] },
    { method: "POST", pattern: /^\/v1\/assistances$/, handler: "createAssistance", paramNames: [] },
    { method: "POST", pattern: /^\/v1\/assistances\/([^/]+)\/communications$/, handler: "addCommunication", paramNames: ["assistanceId"] },
    { method: "POST", pattern: /^\/v1\/assistances\/([^/]+)\/email-log$/, handler: "saveEmailDraft", paramNames: ["assistanceId"] },
    { method: "PATCH", pattern: /^\/v1\/email-log\/([^/]+)\/status$/, handler: "updateEmailLogStatus", paramNames: ["emailLogId"] },
    { method: "POST", pattern: /^\/v1\/import-contacts$/, handler: "importContacts", paramNames: [] },
    { method: "GET", pattern: /^\/v1\/knowledge$/, handler: "searchKnowledge", paramNames: [] },
    { method: "GET", pattern: /^\/v1\/knowledge\/([^/]+)$/, handler: "getKnowledgeArticle", paramNames: ["articleId"] },
    { method: "POST", pattern: /^\/v1\/knowledge$/, handler: "createKnowledgeArticle", paramNames: [] },
    { method: "PATCH", pattern: /^\/v1\/knowledge\/([^/]+)$/, handler: "updateKnowledgeArticle", paramNames: ["articleId"] },
    { method: "DELETE", pattern: /^\/v1\/knowledge\/([^/]+)$/, handler: "deleteKnowledgeArticle", paramNames: ["articleId"] },
    // Buildings CRUD
    { method: "GET", pattern: /^\/v1\/buildings$/, handler: "listBuildings", paramNames: [] },
    { method: "GET", pattern: /^\/v1\/buildings\/([^/]+)$/, handler: "getBuilding", paramNames: ["buildingId"] },
    { method: "POST", pattern: /^\/v1\/buildings$/, handler: "createBuilding", paramNames: [] },
    { method: "PATCH", pattern: /^\/v1\/buildings\/([^/]+)$/, handler: "updateBuilding", paramNames: ["buildingId"] },
    { method: "GET", pattern: /^\/v1\/buildings\/([^/]+)\/contacts$/, handler: "listBuildingContacts", paramNames: ["buildingId"] },
    // Assistances extra
    { method: "PATCH", pattern: /^\/v1\/assistances\/([^/]+)$/, handler: "updateAssistance", paramNames: ["assistanceId"] },
    { method: "GET", pattern: /^\/v1\/assistances\/([^/]+)\/communications$/, handler: "listAssistanceCommunications", paramNames: ["assistanceId"] },
    { method: "GET", pattern: /^\/v1\/assistances\/([^/]+)\/photos$/, handler: "listAssistancePhotos", paramNames: ["assistanceId"] },
    { method: "GET", pattern: /^\/v1\/assistances\/([^/]+)\/progress$/, handler: "listAssistanceProgress", paramNames: ["assistanceId"] },
    // Suppliers
    { method: "GET", pattern: /^\/v1\/suppliers$/, handler: "listSuppliers", paramNames: [] },
    { method: "GET", pattern: /^\/v1\/suppliers\/([^/]+)$/, handler: "getSupplier", paramNames: ["supplierId"] },
    { method: "POST", pattern: /^\/v1\/suppliers$/, handler: "createSupplier", paramNames: [] },
    { method: "PATCH", pattern: /^\/v1\/suppliers\/([^/]+)$/, handler: "updateSupplier", paramNames: ["supplierId"] },
    // Assembly items (Actas)
    { method: "GET", pattern: /^\/v1\/assembly-items$/, handler: "listAssemblyItems", paramNames: [] },
    { method: "GET", pattern: /^\/v1\/assembly-items\/([^/]+)$/, handler: "getAssemblyItem", paramNames: ["itemId"] },
    { method: "POST", pattern: /^\/v1\/assembly-items$/, handler: "createAssemblyItem", paramNames: [] },
    { method: "PATCH", pattern: /^\/v1\/assembly-items\/([^/]+)$/, handler: "updateAssemblyItem", paramNames: ["itemId"] },
    { method: "DELETE", pattern: /^\/v1\/assembly-items\/([^/]+)$/, handler: "deleteAssemblyItem", paramNames: ["itemId"] },
    // Quotations
    { method: "GET", pattern: /^\/v1\/quotations$/, handler: "listQuotations", paramNames: [] },
    { method: "GET", pattern: /^\/v1\/quotations\/([^/]+)$/, handler: "getQuotation", paramNames: ["quotationId"] },
    // Follow-ups & Notifications
    { method: "GET", pattern: /^\/v1\/follow-ups$/, handler: "listFollowUps", paramNames: [] },
    { method: "GET", pattern: /^\/v1\/notifications$/, handler: "listNotifications", paramNames: [] },
    // Intervention types CRUD
    { method: "POST", pattern: /^\/v1\/intervention-types$/, handler: "createInterventionType", paramNames: [] },
    { method: "PATCH", pattern: /^\/v1\/intervention-types\/([^/]+)$/, handler: "updateInterventionType", paramNames: ["typeId"] },
  ];

  for (const route of routes) {
    if (route.method !== method) continue;
    const match = pathname.match(route.pattern);
    if (match) {
      const params: Record<string, string> = {};
      route.paramNames.forEach((name, i) => { params[name] = match[i + 1]; });
      return { handler: route.handler, params };
    }
  }
  return null;
}

// ── Handlers ──

async function handleHealth(): Promise<Response> {
  return json({ status: "ok", version: "1.0.0", timestamp: new Date().toISOString() });
}

async function handleLookupBuilding(req: Request, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const body = await req.json();
  const email = requireString(body.email, "email").toLowerCase();

  const { data: contact, error } = await supabase
    .from("condominium_contacts")
    .select("*, buildings(*)")
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    console.error("Lookup error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Internal error", "INTERNAL_ERROR");
  }

  if (!contact) {
    return errorResponse(404, "No building found for this email", "NOT_FOUND");
  }

  return json({
    building_id: contact.buildings.id,
    building_code: contact.buildings.code,
    name: contact.buildings.name,
    address: contact.buildings.address,
    contact: {
      first_name: contact.first_name,
      last_name: contact.last_name,
      fraction: contact.fraction,
      role: contact.role,
    },
  });
}

async function handleListAssistances(
  url: URL,
  params: Record<string, string>,
  supabase: ReturnType<typeof getSupabase>
): Promise<Response> {
  const buildingId = params.buildingId;
  const statusFilter = url.searchParams.get("status") || "open";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0"), 0);

  let query = supabase
    .from("assistances")
    .select("id, assistance_number, title, status, priority, created_at, updated_at, intervention_type_id, assigned_supplier_id, intervention_types(id, name), suppliers(id, name)", { count: "exact" })
    .eq("building_id", buildingId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (statusFilter === "open") {
    query = query.in("status", ["pending", "awaiting_quotation", "in_progress", "scheduled", "accepted"]);
  } else if (statusFilter === "closed") {
    query = query.in("status", ["completed", "cancelled"]);
  } else {
    query = query.eq("status", statusFilter);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("List assistances error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Internal error", "INTERNAL_ERROR");
  }

  return json({
    building_id: buildingId,
    total: count ?? data?.length ?? 0,
    limit,
    offset,
    assistances: (data || []).map((a: any) => ({
      id: a.id,
      assistance_number: a.assistance_number,
      title: a.title,
      status: a.status,
      priority: a.priority,
      intervention_type: a.intervention_types ? { id: a.intervention_types.id, name: a.intervention_types.name } : null,
      assigned_supplier: a.suppliers ? { id: a.suppliers.id, name: a.suppliers.name } : null,
      created_at: a.created_at,
      last_update_at: a.updated_at,
    })),
  });
}

async function handleGetAssistance(
  params: Record<string, string>,
  supabase: ReturnType<typeof getSupabase>
): Promise<Response> {
  const id = params.assistanceId;

  // Correcção 3 — Parallel queries
  const [assistanceRes, commsRes, progressRes, emailsRes] = await Promise.all([
    supabase
      .from("assistances")
      .select("*, buildings(id, code, name, address), suppliers(id, name, email), intervention_types(id, name)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("communications_log")
      .select("id, message, sender_type, sender_id, message_type, created_at")
      .eq("assistance_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("assistance_progress")
      .select("id, progress_type, title, description, created_at")
      .eq("assistance_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("email_logs")
      .select("id, subject, recipient_email, ai_draft_status, status, created_at")
      .eq("assistance_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (assistanceRes.error || !assistanceRes.data) {
    if (!assistanceRes.data) return errorResponse(404, "Assistance not found", "NOT_FOUND");
    console.error("Get assistance error:", maskPII(JSON.stringify(assistanceRes.error)));
    throw new HttpError(500, "Internal error", "INTERNAL_ERROR");
  }

  const a = assistanceRes.data;
  return json({
    id: a.id,
    assistance_number: a.assistance_number,
    building: a.buildings,
    title: a.title,
    description: a.description,
    status: a.status,
    priority: a.priority,
    intervention_type: a.intervention_types,
    supplier: a.suppliers,
    source: a.source,
    admin_notes: a.admin_notes,
    supplier_notes: a.supplier_notes,
    created_at: a.created_at,
    updated_at: a.updated_at,
    communications_log: commsRes.data || [],
    progress: progressRes.data || [],
    email_logs: emailsRes.data || [],
  });
}

async function handleListInterventionTypes(supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const { data, error } = await supabase
    .from("intervention_types")
    .select("id, name, category, urgency_level")
    .order("name");

  if (error) {
    console.error("List intervention types error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Internal error", "INTERNAL_ERROR");
  }

  return json({ intervention_types: data || [] });
}

async function handleCreateAssistance(
  req: Request,
  supabase: ReturnType<typeof getSupabase>
): Promise<Response> {
  const body = await req.json();
  const buildingId = requireUUID(body.building_id, "building_id");
  const title = requireString(body.title, "title").substring(0, 140);
  const description = requireString(body.description, "description");
  const interventionTypeId = requireUUID(body.intervention_type_id, "intervention_type_id");
  const priority = body.priority || "normal";
  const source = body.source || "email_agent";
  const triggeredBy = body.triggered_by_contact_email || null;

  if (!["normal", "urgent", "critical"].includes(priority)) {
    throw new HttpError(400, "priority must be 'normal', 'urgent', or 'critical'", "INVALID_INPUT");
  }

  // Blocker 3 — Idempotency
  const idempotencyKey = req.headers.get("idempotency-key");
  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from("assistances")
      .select("id, assistance_number")
      .eq("idempotency_key", idempotencyKey)
      .gt("idempotency_key_expires_at", new Date().toISOString())
      .maybeSingle();

    if (existing) {
      return json({ id: existing.id, assistance_number: existing.assistance_number }, 200);
    }
  }

  // Generate assistance number
  const { data: numData } = await supabase.rpc("generate_assistance_number");
  const assistanceNumber = numData || 1;

  const insertData: Record<string, unknown> = {
    title,
    description,
    building_id: buildingId,
    intervention_type_id: interventionTypeId,
    priority,
    source,
    assistance_number: assistanceNumber,
  };

  if (idempotencyKey) {
    insertData.idempotency_key = idempotencyKey;
    insertData.idempotency_key_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }

  if (body.assigned_supplier_id) {
    insertData.assigned_supplier_id = body.assigned_supplier_id;
  }

  const { data, error } = await supabase
    .from("assistances")
    .insert(insertData)
    .select("id, assistance_number")
    .single();

  if (error) {
    console.error("Create assistance error:", maskPII(JSON.stringify(error)));
    // Check for idempotency conflict (race condition)
    if (error.code === "23505" && idempotencyKey) {
      const { data: existing } = await supabase
        .from("assistances")
        .select("id, assistance_number")
        .eq("idempotency_key", idempotencyKey)
        .single();
      if (existing) return json({ id: existing.id, assistance_number: existing.assistance_number }, 200);
    }
    throw new HttpError(500, "Failed to create assistance", "INTERNAL_ERROR");
  }

  // Log triggered_by for audit
  if (triggeredBy) {
    await supabase.from("activity_log").insert({
      assistance_id: data.id,
      action: "ai_agent_created",
      details: `Assistência criada pelo agente AI`,
      metadata: { source, triggered_by_contact_email: triggeredBy },
    });
  }

  return json({ id: data.id, assistance_number: data.assistance_number }, 201);
}

async function handleAddCommunication(
  req: Request,
  params: Record<string, string>,
  supabase: ReturnType<typeof getSupabase>
): Promise<Response> {
  const assistanceId = params.assistanceId;
  const body = await req.json();
  const message = requireString(body.message, "message");
  const senderType = body.sender_type || "ai_agent";
  const metadata = body.metadata || null;

  const { data, error } = await supabase
    .from("communications_log")
    .insert({
      assistance_id: assistanceId,
      message,
      sender_type: senderType,
      message_type: body.message_type || "general",
    })
    .select("id, created_at")
    .single();

  if (error) {
    console.error("Add communication error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Failed to add communication", "INTERNAL_ERROR");
  }

  return json({ id: data.id, created_at: data.created_at }, 201);
}

async function handleSaveEmailDraft(
  req: Request,
  params: Record<string, string>,
  supabase: ReturnType<typeof getSupabase>
): Promise<Response> {
  const assistanceId = params.assistanceId;
  const body = await req.json();
  const recipientEmail = requireString(body.recipient_email, "recipient_email");
  const subject = requireString(body.subject, "subject");
  const content = requireString(body.content, "content");

  // v2-C — Idempotency obrigatória
  const idempotencyKey = req.headers.get("idempotency-key");
  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from("email_logs")
      .select("id, ai_draft_status")
      .eq("idempotency_key", idempotencyKey)
      .gt("idempotency_key_expires_at", new Date().toISOString())
      .maybeSingle();

    if (existing) {
      return json({ id: existing.id, ai_draft_status: existing.ai_draft_status }, 200);
    }
  }

  const insertData: Record<string, unknown> = {
    assistance_id: assistanceId,
    recipient_email: recipientEmail,
    subject,
    email_content: content,
    status: "draft",
    ai_draft_status: "pending_review",
    template_used: body.template_used || "ai_agent_v1",
    metadata: {
      source_email_id: body.source_email_id || null,
      classification: body.classification || null,
      recipient_name: body.recipient_name || null,
    },
  };

  if (idempotencyKey) {
    insertData.idempotency_key = idempotencyKey;
    insertData.idempotency_key_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }

  const { data, error } = await supabase
    .from("email_logs")
    .insert(insertData)
    .select("id, ai_draft_status")
    .single();

  if (error) {
    console.error("Save email draft error:", maskPII(JSON.stringify(error)));
    if (error.code === "23505" && idempotencyKey) {
      const { data: existing } = await supabase
        .from("email_logs")
        .select("id, ai_draft_status")
        .eq("idempotency_key", idempotencyKey)
        .single();
      if (existing) return json({ id: existing.id, ai_draft_status: existing.ai_draft_status }, 200);
    }
    throw new HttpError(500, "Failed to save email draft", "INTERNAL_ERROR");
  }

  return json({ id: data.id, ai_draft_status: data.ai_draft_status }, 201);
}

async function handleUpdateEmailLogStatus(
  req: Request,
  params: Record<string, string>,
  supabase: ReturnType<typeof getSupabase>
): Promise<Response> {
  const emailLogId = params.emailLogId;
  const body = await req.json();
  const newStatus = requireString(body.ai_draft_status, "ai_draft_status");

  if (!["approved", "rejected", "sent", "auto_sent"].includes(newStatus)) {
    throw new HttpError(400, "ai_draft_status must be 'approved', 'rejected', 'sent', or 'auto_sent'", "INVALID_INPUT");
  }

  const updateData: Record<string, unknown> = { ai_draft_status: newStatus };
  if (body.approved_by) {
    updateData.approved_by = body.approved_by;
    updateData.approved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("email_logs")
    .update(updateData)
    .eq("id", emailLogId)
    .select("id, ai_draft_status")
    .single();

  if (error) {
    console.error("Update email log error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Failed to update email log status", "INTERNAL_ERROR");
  }

  return json({ id: data.id, ai_draft_status: data.ai_draft_status });
}

async function handleImportContacts(
  req: Request,
  supabase: ReturnType<typeof getSupabase>
): Promise<Response> {
  const body = await req.json();
  const contacts = body.contacts;

  if (!Array.isArray(contacts) || contacts.length === 0) {
    throw new HttpError(400, "contacts must be a non-empty array", "INVALID_INPUT");
  }

  if (contacts.length > 500) {
    throw new HttpError(400, "Maximum 500 contacts per request", "INVALID_INPUT");
  }

  const results = { inserted: 0, updated: 0, errors: [] as Array<{ row: number; error: string }> };

  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i];
    try {
      const email = requireString(c.email, "email").toLowerCase();

      // Resolve building_id from building_code if provided
      let buildingId = c.building_id;
      if (!buildingId && c.building_code) {
        const { data: building } = await supabase
          .from("buildings")
          .select("id")
          .eq("code", c.building_code)
          .maybeSingle();

        if (!building) {
          results.errors.push({ row: i, error: `building_code not found: ${c.building_code}` });
          continue;
        }
        buildingId = building.id;
      }

      if (!buildingId) {
        results.errors.push({ row: i, error: "building_id or building_code required" });
        continue;
      }

      // Check if contact exists (upsert by email)
      const { data: existing } = await supabase
        .from("condominium_contacts")
        .select("id")
        .ilike("email", email)
        .maybeSingle();

      const contactData = {
        email,
        building_id: buildingId,
        first_name: c.first_name || null,
        last_name: c.last_name || null,
        phone: c.phone || null,
        fraction: c.fraction || null,
        role: c.role || "owner",
        is_primary_contact: c.is_primary_contact !== undefined ? c.is_primary_contact : true,
      };

      if (existing) {
        await supabase.from("condominium_contacts").update(contactData).eq("id", existing.id);
        results.updated++;
      } else {
        await supabase.from("condominium_contacts").insert(contactData);
        results.inserted++;
      }
    } catch (e) {
      results.errors.push({ row: i, error: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  return json(results);
}

// ── Knowledge Base Handlers ──

async function handleSearchKnowledge(
  url: URL,
  supabase: ReturnType<typeof getSupabase>
): Promise<Response> {
  const q = url.searchParams.get("q");
  const category = url.searchParams.get("category");
  const buildingId = url.searchParams.get("building_id");
  const tagsParam = url.searchParams.get("tags");
  const tags = tagsParam?.split(",").filter(Boolean);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0"), 0);

  // Use PostgreSQL full-text search function with relevance ranking
  const { data, error } = await supabase.rpc("search_knowledge_articles", {
    search_query: q || null,
    filter_category: category || null,
    filter_building_id: buildingId || null,
    filter_tags: tags?.length ? tags : null,
    result_limit: limit,
    result_offset: offset,
  });

  if (error) {
    console.error("Search knowledge error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Internal error", "INTERNAL_ERROR");
  }

  // Strip content from list results for performance
  const articles = (data || []).map(({ content: _c, rank: _r, ...rest }: Record<string, unknown>) => rest);

  return json({ total: articles.length, limit, offset, articles });
}

async function handleGetKnowledgeArticle(
  params: Record<string, string>,
  supabase: ReturnType<typeof getSupabase>
): Promise<Response> {
  const id = params.articleId;
  const { data, error } = await supabase
    .from("knowledge_articles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Get knowledge article error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Internal error", "INTERNAL_ERROR");
  }
  if (!data) return errorResponse(404, "Article not found", "NOT_FOUND");

  return json(data);
}

async function handleCreateKnowledgeArticle(
  req: Request,
  supabase: ReturnType<typeof getSupabase>
): Promise<Response> {
  const body = await req.json();
  const title = requireString(body.title, "title");
  const content = requireString(body.content, "content");
  const category = requireString(body.category, "category");

  const insertData: Record<string, unknown> = {
    title,
    content,
    category,
    subcategory: body.subcategory || null,
    tags: body.tags || [],
    building_id: body.building_id || null,
    is_global: body.is_global ?? false,
    is_published: body.is_published ?? true,
    metadata: body.metadata || {},
  };

  const { data, error } = await supabase
    .from("knowledge_articles")
    .insert(insertData)
    .select("id, title, category, created_at")
    .single();

  if (error) {
    console.error("Create knowledge article error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Failed to create article", "INTERNAL_ERROR");
  }

  return json(data, 201);
}

async function handleUpdateKnowledgeArticle(
  req: Request,
  params: Record<string, string>,
  supabase: ReturnType<typeof getSupabase>
): Promise<Response> {
  const id = params.articleId;
  const body = await req.json();

  const updateData: Record<string, unknown> = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.content !== undefined) updateData.content = body.content;
  if (body.category !== undefined) updateData.category = body.category;
  if (body.subcategory !== undefined) updateData.subcategory = body.subcategory;
  if (body.tags !== undefined) updateData.tags = body.tags;
  if (body.building_id !== undefined) updateData.building_id = body.building_id;
  if (body.is_global !== undefined) updateData.is_global = body.is_global;
  if (body.is_published !== undefined) updateData.is_published = body.is_published;
  if (body.metadata !== undefined) updateData.metadata = body.metadata;

  if (Object.keys(updateData).length === 0) {
    throw new HttpError(400, "No fields to update", "INVALID_INPUT");
  }

  const { data, error } = await supabase
    .from("knowledge_articles")
    .update(updateData)
    .eq("id", id)
    .select("id, title, category, updated_at")
    .single();

  if (error) {
    console.error("Update knowledge article error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Failed to update article", "INTERNAL_ERROR");
  }

  return json(data);
}

async function handleDeleteKnowledgeArticle(
  params: Record<string, string>,
  supabase: ReturnType<typeof getSupabase>
): Promise<Response> {
  const id = params.articleId;
  const { error } = await supabase
    .from("knowledge_articles")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Delete knowledge article error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Failed to delete article", "INTERNAL_ERROR");
  }

  return json({ success: true });
}

// ── Buildings Handlers ──
async function handleListBuildings(url: URL, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const q = url.searchParams.get("q");
  const isActive = url.searchParams.get("is_active");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0"), 0);

  let query = supabase.from("buildings").select("*", { count: "exact" }).order("code").range(offset, offset + limit - 1);
  if (q) query = query.or(`code.ilike.%${q}%,name.ilike.%${q}%,address.ilike.%${q}%`);
  if (isActive !== null && isActive !== "") query = query.eq("is_active", isActive === "true");

  const { data, error, count } = await query;
  if (error) {
    console.error("List buildings error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Internal error", "INTERNAL_ERROR");
  }
  return json({ total: count ?? 0, limit, offset, buildings: data || [] });
}

async function handleGetBuilding(params: Record<string, string>, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const { data, error } = await supabase.from("buildings").select("*").eq("id", params.buildingId).maybeSingle();
  if (error) {
    console.error("Get building error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Internal error", "INTERNAL_ERROR");
  }
  if (!data) return errorResponse(404, "Building not found", "NOT_FOUND");
  return json(data);
}

async function handleCreateBuilding(req: Request, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const body = await req.json();
  const code = requireString(body.code, "code");
  const name = requireString(body.name, "name");
  const insertData = {
    code,
    name,
    address: body.address || null,
    nif: body.nif || null,
    cadastral_code: body.cadastral_code || null,
    admin_notes: body.admin_notes || null,
    is_active: body.is_active ?? true,
  };
  const { data, error } = await supabase.from("buildings").insert(insertData).select("*").single();
  if (error) {
    console.error("Create building error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Failed to create building", "INTERNAL_ERROR");
  }
  return json(data, 201);
}

async function handleUpdateBuilding(req: Request, params: Record<string, string>, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const body = await req.json();
  const updateData: Record<string, unknown> = {};
  for (const k of ["code", "name", "address", "nif", "cadastral_code", "admin_notes", "is_active"]) {
    if (body[k] !== undefined) updateData[k] = body[k];
  }
  if (Object.keys(updateData).length === 0) throw new HttpError(400, "No fields to update", "INVALID_INPUT");

  const { data, error } = await supabase.from("buildings").update(updateData).eq("id", params.buildingId).select("*").single();
  if (error) {
    console.error("Update building error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Failed to update building", "INTERNAL_ERROR");
  }
  return json(data);
}

async function handleListBuildingContacts(params: Record<string, string>, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const { data, error } = await supabase
    .from("condominium_contacts")
    .select("id, email, first_name, last_name, phone, role, fraction, is_primary_contact, created_at")
    .eq("building_id", params.buildingId)
    .order("is_primary_contact", { ascending: false });
  if (error) {
    console.error("List contacts error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Internal error", "INTERNAL_ERROR");
  }
  return json({ building_id: params.buildingId, contacts: data || [] });
}

// ── Assistances extra handlers ──
async function handleUpdateAssistance(req: Request, params: Record<string, string>, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const body = await req.json();
  const allowed = [
    "title", "description", "status", "priority", "assigned_supplier_id", "intervention_type_id",
    "scheduled_date", "scheduled_start_date", "scheduled_end_date", "actual_start_date", "actual_end_date",
    "completed_date", "admin_notes", "supplier_notes", "progress_notes", "estimated_cost", "final_cost",
    "estimated_duration_hours", "requires_quotation", "requires_validation", "expected_completion_date",
    "deadline_response", "response_deadline",
  ];
  const updateData: Record<string, unknown> = {};
  for (const k of allowed) if (body[k] !== undefined) updateData[k] = body[k];
  if (Object.keys(updateData).length === 0) throw new HttpError(400, "No fields to update", "INVALID_INPUT");

  const { data, error } = await supabase.from("assistances").update(updateData).eq("id", params.assistanceId).select("id, status, updated_at").single();
  if (error) {
    console.error("Update assistance error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Failed to update assistance", "INTERNAL_ERROR");
  }
  return json(data);
}

async function handleListAssistanceCommunications(params: Record<string, string>, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const { data, error } = await supabase
    .from("communications_log")
    .select("*")
    .eq("assistance_id", params.assistanceId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("List comms error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Internal error", "INTERNAL_ERROR");
  }
  return json({ assistance_id: params.assistanceId, communications: data || [] });
}

async function handleListAssistancePhotos(params: Record<string, string>, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const { data, error } = await supabase
    .from("assistance_photos")
    .select("*")
    .eq("assistance_id", params.assistanceId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("List photos error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Internal error", "INTERNAL_ERROR");
  }
  return json({ assistance_id: params.assistanceId, photos: data || [] });
}

async function handleListAssistanceProgress(params: Record<string, string>, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const { data, error } = await supabase
    .from("assistance_progress")
    .select("*")
    .eq("assistance_id", params.assistanceId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("List progress error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Internal error", "INTERNAL_ERROR");
  }
  return json({ assistance_id: params.assistanceId, progress: data || [] });
}

// ── Suppliers handlers ──
async function handleListSuppliers(url: URL, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const q = url.searchParams.get("q");
  const specialization = url.searchParams.get("specialization");
  const isActive = url.searchParams.get("is_active");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0"), 0);

  let query = supabase.from("suppliers").select("*", { count: "exact" }).order("name").range(offset, offset + limit - 1);
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,specialization.ilike.%${q}%`);
  if (specialization) query = query.eq("specialization", specialization);
  if (isActive !== null && isActive !== "") query = query.eq("is_active", isActive === "true");

  const { data, error, count } = await query;
  if (error) {
    console.error("List suppliers error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Internal error", "INTERNAL_ERROR");
  }
  return json({ total: count ?? 0, limit, offset, suppliers: data || [] });
}

async function handleGetSupplier(params: Record<string, string>, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const { data, error } = await supabase.from("suppliers").select("*").eq("id", params.supplierId).maybeSingle();
  if (error) {
    console.error("Get supplier error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Internal error", "INTERNAL_ERROR");
  }
  if (!data) return errorResponse(404, "Supplier not found", "NOT_FOUND");
  return json(data);
}

async function handleCreateSupplier(req: Request, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const body = await req.json();
  const name = requireString(body.name, "name");
  const insertData: Record<string, unknown> = {
    name,
    email: body.email || null,
    phone: body.phone || null,
    address: body.address || null,
    nif: body.nif || null,
    specialization: body.specialization || null,
    admin_notes: body.admin_notes || null,
    is_active: body.is_active ?? true,
  };
  const { data, error } = await supabase.from("suppliers").insert(insertData).select("*").single();
  if (error) {
    console.error("Create supplier error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Failed to create supplier", "INTERNAL_ERROR");
  }
  return json(data, 201);
}

async function handleUpdateSupplier(req: Request, params: Record<string, string>, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const body = await req.json();
  const updateData: Record<string, unknown> = {};
  for (const k of ["name", "email", "phone", "address", "nif", "specialization", "admin_notes", "is_active", "rating"]) {
    if (body[k] !== undefined) updateData[k] = body[k];
  }
  if (Object.keys(updateData).length === 0) throw new HttpError(400, "No fields to update", "INVALID_INPUT");

  const { data, error } = await supabase.from("suppliers").update(updateData).eq("id", params.supplierId).select("*").single();
  if (error) {
    console.error("Update supplier error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Failed to update supplier", "INTERNAL_ERROR");
  }
  return json(data);
}

// ── Assembly items (Actas) handlers ──
async function handleListAssemblyItems(url: URL, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const buildingId = url.searchParams.get("building_id");
  const buildingCode = url.searchParams.get("building_code");
  const status = url.searchParams.get("status");
  const category = url.searchParams.get("category");
  const year = url.searchParams.get("year");
  const q = url.searchParams.get("q");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0"), 0);

  let query = supabase
    .from("assembly_items")
    .select("*, buildings(id, code, name)", { count: "exact" })
    .order("building_code")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (buildingId) query = query.eq("building_id", buildingId);
  if (buildingCode) query = query.eq("building_code", parseInt(buildingCode));
  if (status) query = query.eq("status", status);
  if (category) query = query.eq("category", category);
  if (year) query = query.eq("year", parseInt(year));
  if (q) query = query.or(`description.ilike.%${q}%,status_notes.ilike.%${q}%`);

  const { data, error, count } = await query;
  if (error) {
    console.error("List assembly items error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Internal error", "INTERNAL_ERROR");
  }
  return json({ total: count ?? 0, limit, offset, items: data || [] });
}

async function handleGetAssemblyItem(params: Record<string, string>, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const { data, error } = await supabase
    .from("assembly_items")
    .select("*, buildings(id, code, name)")
    .eq("id", params.itemId)
    .maybeSingle();
  if (error) {
    console.error("Get assembly item error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Internal error", "INTERNAL_ERROR");
  }
  if (!data) return errorResponse(404, "Assembly item not found", "NOT_FOUND");
  return json(data);
}

async function handleCreateAssemblyItem(req: Request, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const body = await req.json();
  const description = requireString(body.description, "description");
  if (body.building_code === undefined || body.building_code === null) {
    throw new HttpError(400, "building_code is required", "INVALID_INPUT");
  }
  const insertData: Record<string, unknown> = {
    description,
    building_code: parseInt(String(body.building_code)),
    building_id: body.building_id || null,
    building_address: body.building_address || null,
    category: body.category || null,
    status: body.status || "pending",
    status_notes: body.status_notes || null,
    priority: body.priority || "normal",
    year: body.year || new Date().getFullYear(),
    assigned_to: body.assigned_to || null,
    estimated_cost: body.estimated_cost ?? null,
    resolution_date: body.resolution_date || null,
    source_sheet: body.source_sheet || null,
    knowledge_article_id: body.knowledge_article_id || null,
  };
  const { data, error } = await supabase.from("assembly_items").insert(insertData).select("*").single();
  if (error) {
    console.error("Create assembly item error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Failed to create assembly item", "INTERNAL_ERROR");
  }
  return json(data, 201);
}

async function handleUpdateAssemblyItem(req: Request, params: Record<string, string>, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const body = await req.json();
  const updateData: Record<string, unknown> = {};
  for (const k of [
    "description", "building_id", "building_code", "building_address", "category", "status",
    "status_notes", "priority", "year", "assigned_to", "estimated_cost", "resolution_date",
    "source_sheet", "knowledge_article_id",
  ]) {
    if (body[k] !== undefined) updateData[k] = body[k];
  }
  if (Object.keys(updateData).length === 0) throw new HttpError(400, "No fields to update", "INVALID_INPUT");

  const { data, error } = await supabase.from("assembly_items").update(updateData).eq("id", params.itemId).select("*").single();
  if (error) {
    console.error("Update assembly item error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Failed to update assembly item", "INTERNAL_ERROR");
  }
  return json(data);
}

async function handleDeleteAssemblyItem(params: Record<string, string>, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const { error } = await supabase.from("assembly_items").delete().eq("id", params.itemId);
  if (error) {
    console.error("Delete assembly item error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Failed to delete assembly item", "INTERNAL_ERROR");
  }
  return json({ success: true });
}

// ── Quotations handlers ──
async function handleListQuotations(url: URL, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const assistanceId = url.searchParams.get("assistance_id");
  const supplierId = url.searchParams.get("supplier_id");
  const status = url.searchParams.get("status");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0"), 0);

  let query = supabase
    .from("quotations")
    .select("*, suppliers(id, name), assistances(id, assistance_number, title)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (assistanceId) query = query.eq("assistance_id", assistanceId);
  if (supplierId) query = query.eq("supplier_id", supplierId);
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) {
    console.error("List quotations error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Internal error", "INTERNAL_ERROR");
  }
  return json({ total: count ?? 0, limit, offset, quotations: data || [] });
}

async function handleGetQuotation(params: Record<string, string>, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const { data, error } = await supabase
    .from("quotations")
    .select("*, suppliers(id, name, email), assistances(id, assistance_number, title)")
    .eq("id", params.quotationId)
    .maybeSingle();
  if (error) {
    console.error("Get quotation error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Internal error", "INTERNAL_ERROR");
  }
  if (!data) return errorResponse(404, "Quotation not found", "NOT_FOUND");
  return json(data);
}

// ── Follow-ups & Notifications ──
async function handleListFollowUps(url: URL, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const assistanceId = url.searchParams.get("assistance_id");
  const supplierId = url.searchParams.get("supplier_id");
  const status = url.searchParams.get("status");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0"), 0);

  let query = supabase
    .from("follow_up_schedules")
    .select("*", { count: "exact" })
    .order("scheduled_for", { ascending: true })
    .range(offset, offset + limit - 1);

  if (assistanceId) query = query.eq("assistance_id", assistanceId);
  if (supplierId) query = query.eq("supplier_id", supplierId);
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) {
    console.error("List follow-ups error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Internal error", "INTERNAL_ERROR");
  }
  return json({ total: count ?? 0, limit, offset, follow_ups: data || [] });
}

async function handleListNotifications(url: URL, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const assistanceId = url.searchParams.get("assistance_id");
  const supplierId = url.searchParams.get("supplier_id");
  const status = url.searchParams.get("status");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0"), 0);

  let query = supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .order("scheduled_for", { ascending: false })
    .range(offset, offset + limit - 1);

  if (assistanceId) query = query.eq("assistance_id", assistanceId);
  if (supplierId) query = query.eq("supplier_id", supplierId);
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) {
    console.error("List notifications error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Internal error", "INTERNAL_ERROR");
  }
  return json({ total: count ?? 0, limit, offset, notifications: data || [] });
}

// ── Intervention types CRUD ──
async function handleCreateInterventionType(req: Request, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const body = await req.json();
  const name = requireString(body.name, "name");
  const urgencyLevel = body.urgency_level || "normal";
  if (!["normal", "urgent", "critical"].includes(urgencyLevel)) {
    throw new HttpError(400, "urgency_level must be 'normal', 'urgent', or 'critical'", "INVALID_INPUT");
  }
  const { data, error } = await supabase.from("intervention_types").insert({
    name,
    category: body.category || null,
    description: body.description || null,
    urgency_level: urgencyLevel,
  }).select("*").single();
  if (error) {
    console.error("Create intervention type error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Failed to create intervention type", "INTERNAL_ERROR");
  }
  return json(data, 201);
}

async function handleUpdateInterventionType(req: Request, params: Record<string, string>, supabase: ReturnType<typeof getSupabase>): Promise<Response> {
  const body = await req.json();
  const updateData: Record<string, unknown> = {};
  for (const k of ["name", "category", "description", "urgency_level"]) {
    if (body[k] !== undefined) updateData[k] = body[k];
  }
  if (Object.keys(updateData).length === 0) throw new HttpError(400, "No fields to update", "INVALID_INPUT");

  const { data, error } = await supabase.from("intervention_types").update(updateData).eq("id", params.typeId).select("*").single();
  if (error) {
    console.error("Update intervention type error:", maskPII(JSON.stringify(error)));
    throw new HttpError(500, "Failed to update intervention type", "INTERNAL_ERROR");
  }
  return json(data);
}

// ── Main handler ──
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Strip function name prefix from pathname
    const pathname = url.pathname.replace(/^\/agent-api/, "");

    const route = matchRoute(req.method, pathname);
    if (!route) {
      return errorResponse(404, "Not found", "NOT_FOUND");
    }

    // Health endpoint has no auth
    if (route.handler === "health") {
      return await handleHealth();
    }

    // Auth
    const token = extractToken(req);
    validateToken(token);

    // Rate limit
    const supabase = getSupabase();
    await checkRateLimit(supabase, token!);

    // Route to handler
    switch (route.handler) {
      case "lookupBuilding":
        return await handleLookupBuilding(req, supabase);
      case "listAssistances":
        return await handleListAssistances(url, route.params, supabase);
      case "getAssistance":
        return await handleGetAssistance(route.params, supabase);
      case "listInterventionTypes":
        return await handleListInterventionTypes(supabase);
      case "createAssistance":
        return await handleCreateAssistance(req, supabase);
      case "addCommunication":
        return await handleAddCommunication(req, route.params, supabase);
      case "saveEmailDraft":
        return await handleSaveEmailDraft(req, route.params, supabase);
      case "updateEmailLogStatus":
        return await handleUpdateEmailLogStatus(req, route.params, supabase);
      case "importContacts":
        return await handleImportContacts(req, supabase);
      case "searchKnowledge":
        return await handleSearchKnowledge(url, supabase);
      case "getKnowledgeArticle":
        return await handleGetKnowledgeArticle(route.params, supabase);
      case "createKnowledgeArticle":
        return await handleCreateKnowledgeArticle(req, supabase);
      case "updateKnowledgeArticle":
        return await handleUpdateKnowledgeArticle(req, route.params, supabase);
      case "deleteKnowledgeArticle":
        return await handleDeleteKnowledgeArticle(route.params, supabase);
      // Buildings
      case "listBuildings":
        return await handleListBuildings(url, supabase);
      case "getBuilding":
        return await handleGetBuilding(route.params, supabase);
      case "createBuilding":
        return await handleCreateBuilding(req, supabase);
      case "updateBuilding":
        return await handleUpdateBuilding(req, route.params, supabase);
      case "listBuildingContacts":
        return await handleListBuildingContacts(route.params, supabase);
      // Assistances extra
      case "updateAssistance":
        return await handleUpdateAssistance(req, route.params, supabase);
      case "listAssistanceCommunications":
        return await handleListAssistanceCommunications(route.params, supabase);
      case "listAssistancePhotos":
        return await handleListAssistancePhotos(route.params, supabase);
      case "listAssistanceProgress":
        return await handleListAssistanceProgress(route.params, supabase);
      // Suppliers
      case "listSuppliers":
        return await handleListSuppliers(url, supabase);
      case "getSupplier":
        return await handleGetSupplier(route.params, supabase);
      case "createSupplier":
        return await handleCreateSupplier(req, supabase);
      case "updateSupplier":
        return await handleUpdateSupplier(req, route.params, supabase);
      // Assembly items
      case "listAssemblyItems":
        return await handleListAssemblyItems(url, supabase);
      case "getAssemblyItem":
        return await handleGetAssemblyItem(route.params, supabase);
      case "createAssemblyItem":
        return await handleCreateAssemblyItem(req, supabase);
      case "updateAssemblyItem":
        return await handleUpdateAssemblyItem(req, route.params, supabase);
      case "deleteAssemblyItem":
        return await handleDeleteAssemblyItem(route.params, supabase);
      // Quotations
      case "listQuotations":
        return await handleListQuotations(url, supabase);
      case "getQuotation":
        return await handleGetQuotation(route.params, supabase);
      // Follow-ups & Notifications
      case "listFollowUps":
        return await handleListFollowUps(url, supabase);
      case "listNotifications":
        return await handleListNotifications(url, supabase);
      // Intervention types CRUD
      case "createInterventionType":
        return await handleCreateInterventionType(req, supabase);
      case "updateInterventionType":
        return await handleUpdateInterventionType(req, route.params, supabase);
      default:
        return errorResponse(404, "Not found", "NOT_FOUND");
    }
  } catch (e) {
    if (e instanceof HttpError) {
      return errorResponse(e.status, e.message, e.code);
    }
    console.error("Unhandled error:", maskPII(e instanceof Error ? e.message : String(e)));
    return errorResponse(500, "Internal server error", "INTERNAL_ERROR");
  }
});
