import { describe, expect, test, mock } from "bun:test";
mock.module("@/integrations/supabase/client", () => ({ supabase: {} }));
const m = await import("./assistanceQuery");

describe("assistance list query", () => {
  test("legacy ?status= deep link becomes a status filter on page 1", () => {
    const s = m.parseAssistanceSearchParams(new URLSearchParams("status=pending"));
    expect(s.filters).toEqual({ status: "pending" });
    expect(s.page).toBe(1);
  });
  test("URL round-trip keeps search, combined filters, elevator and page", () => {
    const state = { search: "#12", page: 3, elevatorOnly: true,
      filters: { status: "completed", priority: "urgent", buildingId: "b", supplierId: "s", dateFrom: "2026-01-01", dateTo: "2026-02-01", assistanceNumber: "12" } };
    expect(m.parseAssistanceSearchParams(m.toAssistanceSearchParams(state))).toEqual(state);
  });
  test("page N maps to offset (N-1)*size and dateTo is inclusive end of day", () => {
    const p = m.buildAssistanceRpcParams({ search: "", elevatorOnly: false, filters: { dateFrom: "2026-03-01", dateTo: "2026-03-31" } }, 30, 60);
    expect(p.p_offset).toBe(60);
    expect(p.p_limit).toBe(30);
    expect(p.p_search).toBeNull();
    expect(p.p_date_from).toBe(new Date("2026-03-01").toISOString());
    expect(p.p_date_to).toBe(new Date("2026-03-31T23:59:59").toISOString());
  });
});
