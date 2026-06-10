
CREATE TABLE public.mcp_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at timestamptz NOT NULL DEFAULT now(),
  tool_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('ok','fail')),
  http_status integer,
  latency_ms integer,
  error text,
  response_size integer,
  run_id uuid
);

CREATE INDEX idx_mcp_health_checks_checked_at ON public.mcp_health_checks (checked_at DESC);
CREATE INDEX idx_mcp_health_checks_tool ON public.mcp_health_checks (tool_name, checked_at DESC);

GRANT SELECT ON public.mcp_health_checks TO authenticated;
GRANT ALL ON public.mcp_health_checks TO service_role;

ALTER TABLE public.mcp_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read mcp health checks"
ON public.mcp_health_checks
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert mcp health checks"
ON public.mcp_health_checks
FOR INSERT
TO service_role
WITH CHECK (true);
