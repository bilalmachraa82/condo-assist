import { supabase } from "@/integrations/supabase/client";
import type { Assistance } from "@/hooks/useAssistances";
import type { AssistanceFilters } from "@/components/assistance/AssistanceFilters";

export const ASSISTANCE_PAGE_SIZE = 30;

export type AssistanceListRow = Assistance & { quotation_count: number };

export interface AssistanceListQuery {
  search: string;
  filters: AssistanceFilters;
  elevatorOnly: boolean;
}

/**
 * Translate UI filters into RPC params, preserving the former client-side semantics:
 * - dateFrom: `new Date("YYYY-MM-DD")` (UTC midnight)
 * - dateTo: `new Date("YYYY-MM-DDT23:59:59")` (local end of day, inclusive)
 * - empty/whitespace search matches everything
 */
export function buildAssistanceRpcParams(q: AssistanceListQuery, limit: number, offset: number) {
  const f = q.filters;
  const toIso = (s: string) => {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };
  return {
    p_search: q.search ? q.search : null,
    p_status: f.status || null,
    p_priority: f.priority || null,
    p_building_id: f.buildingId || null,
    p_supplier_id: f.supplierId || null,
    p_assistance_number: f.assistanceNumber || null,
    p_date_from: f.dateFrom ? toIso(f.dateFrom) : null,
    p_date_to: f.dateTo ? toIso(f.dateTo + "T23:59:59") : null,
    p_elevator_only: q.elevatorOnly,
    p_limit: limit,
    p_offset: offset,
  };
}

export async function fetchAssistancePage(q: AssistanceListQuery, page: number, pageSize = ASSISTANCE_PAGE_SIZE) {
  const params = buildAssistanceRpcParams(q, pageSize, Math.max(0, page - 1) * pageSize);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("search_assistances_page", params);
  if (error) throw error;
  const res = (data ?? { total: 0, rows: [] }) as { total: number; rows: AssistanceListRow[] };
  return { total: Number(res.total) || 0, rows: res.rows ?? [] };
}

/** All rows matching the query (for exports), fetched in server-filtered chunks. */
export async function fetchAllMatchingAssistances(q: AssistanceListQuery, chunk = 500) {
  const rows: AssistanceListRow[] = [];
  for (let page = 1; ; page++) {
    const res = await fetchAssistancePage(q, page, chunk);
    rows.push(...res.rows);
    if (res.rows.length < chunk || rows.length >= res.total) return rows;
  }
}

/** URL <-> state. Keeps legacy `?status=` deep links working. */
export function parseAssistanceSearchParams(sp: URLSearchParams) {
  const filters: AssistanceFilters = {};
  const map: Record<string, keyof AssistanceFilters> = {
    status: "status", priority: "priority", building: "buildingId", supplier: "supplierId",
    from: "dateFrom", to: "dateTo", number: "assistanceNumber",
  };
  for (const [k, key] of Object.entries(map)) {
    const v = sp.get(k);
    if (v) filters[key] = v;
  }
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
  return { filters, search: sp.get("q") || "", page, elevatorOnly: sp.get("elevator") === "1" };
}

export function toAssistanceSearchParams(s: { filters: AssistanceFilters; search: string; page: number; elevatorOnly: boolean }) {
  const sp = new URLSearchParams();
  const f = s.filters;
  if (s.search) sp.set("q", s.search);
  if (f.status) sp.set("status", f.status);
  if (f.priority) sp.set("priority", f.priority);
  if (f.buildingId) sp.set("building", f.buildingId);
  if (f.supplierId) sp.set("supplier", f.supplierId);
  if (f.dateFrom) sp.set("from", f.dateFrom);
  if (f.dateTo) sp.set("to", f.dateTo);
  if (f.assistanceNumber) sp.set("number", f.assistanceNumber);
  if (s.elevatorOnly) sp.set("elevator", "1");
  if (s.page > 1) sp.set("page", String(s.page));
  return sp;
}
