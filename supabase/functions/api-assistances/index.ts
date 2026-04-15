import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validateApiKey(req: Request): boolean {
  const apiKey = req.headers.get("x-api-key");
  const expectedKey = Deno.env.get("EXTERNAL_API_KEY");
  if (!expectedKey) {
    console.error("EXTERNAL_API_KEY secret not configured");
    return false;
  }
  return apiKey === expectedKey;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!validateApiKey(req)) {
    return jsonResponse({ error: "Unauthorized - invalid or missing x-api-key" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);

  try {
    // GET - List or get single assistance
    if (req.method === "GET") {
      const id = url.searchParams.get("id");

      if (id) {
        const { data, error } = await supabase
          .from("assistances")
          .select(`
            *,
            buildings (id, name, code, address),
            suppliers (id, name, email, phone, specialization),
            intervention_types (id, name, category)
          `)
          .eq("id", id)
          .single();

        if (error) return jsonResponse({ error: error.message }, 404);
        return jsonResponse({ data });
      }

      // List with filters
      let query = supabase
        .from("assistances")
        .select(`
          *,
          buildings (id, name, code, address),
          suppliers (id, name, email, phone, specialization),
          intervention_types (id, name, category)
        `)
        .order("created_at", { ascending: false });

      const status = url.searchParams.get("status");
      if (status) query = query.eq("status", status);

      const priority = url.searchParams.get("priority");
      if (priority) query = query.eq("priority", priority);

      const buildingId = url.searchParams.get("building_id");
      if (buildingId) query = query.eq("building_id", buildingId);

      const supplierId = url.searchParams.get("supplier_id");
      if (supplierId) query = query.eq("assigned_supplier_id", supplierId);

      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ data, count: data?.length || 0 });
    }

    // POST - Create assistance
    if (req.method === "POST") {
      const body = await req.json();

      if (!body.title || !body.building_id || !body.intervention_type_id) {
        return jsonResponse(
          { error: "Missing required fields: title, building_id, intervention_type_id" },
          400
        );
      }

      // Generate assistance number
      const { data: numData } = await supabase.rpc("generate_assistance_number");
      const assistanceNumber = numData || 1;

      const { data, error } = await supabase
        .from("assistances")
        .insert({
          title: body.title,
          description: body.description || null,
          building_id: body.building_id,
          intervention_type_id: body.intervention_type_id,
          priority: body.priority || "normal",
          assigned_supplier_id: body.assigned_supplier_id || null,
          assistance_number: assistanceNumber,
          status: body.status || "pending",
        })
        .select()
        .single();

      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ data, id: data.id, assistance_number: data.assistance_number }, 201);
    }

    // PATCH - Update assistance
    if (req.method === "PATCH") {
      const id = url.searchParams.get("id");
      if (!id) return jsonResponse({ error: "Missing id parameter" }, 400);

      const body = await req.json();

      // Only allow specific fields to be updated
      const allowedFields: Record<string, unknown> = {};
      const updatable = [
        "status", "admin_notes", "supplier_notes", "priority",
        "assigned_supplier_id", "scheduled_start_date", "scheduled_end_date",
        "description", "title"
      ];

      for (const field of updatable) {
        if (body[field] !== undefined) {
          allowedFields[field] = body[field];
        }
      }

      if (Object.keys(allowedFields).length === 0) {
        return jsonResponse({ error: "No valid fields to update" }, 400);
      }

      allowedFields.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("assistances")
        .update(allowedFields)
        .eq("id", id)
        .select()
        .single();

      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ data });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (err) {
    console.error("API error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
