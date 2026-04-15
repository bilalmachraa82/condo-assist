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
  if (!expectedKey) return false;
  return apiKey === expectedKey;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!validateApiKey(req)) {
    return jsonResponse({ error: "Unauthorized - invalid or missing x-api-key" }, 401);
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  try {
    switch (type) {
      case "buildings": {
        const { data, error } = await supabase
          .from("buildings")
          .select("id, name, code, address, nif, is_active")
          .eq("is_active", true)
          .order("name");
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ data });
      }

      case "suppliers": {
        const { data, error } = await supabase
          .from("suppliers")
          .select("id, name, email, phone, specialization, is_active, rating")
          .eq("is_active", true)
          .order("name");
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ data });
      }

      case "intervention_types": {
        const { data, error } = await supabase
          .from("intervention_types")
          .select("id, name, category, urgency_level")
          .order("name");
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ data });
      }

      default:
        return jsonResponse(
          { error: "Invalid type. Use: buildings, suppliers, intervention_types" },
          400
        );
    }
  } catch (err) {
    console.error("API error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
