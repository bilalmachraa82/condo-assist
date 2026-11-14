import { describe, expect, test, mock } from "bun:test";
const rpc = mock();
mock.module("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
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
  test("large or invalid page parameters cannot overflow the database offset", () => {
    for (const raw of ["999999999999", "-1", "3abc"]) {
      expect(m.parseAssistanceSearchParams(new URLSearchParams({ page: raw })).page).toBe(1);
    }
  });
  test("list requests a single page and export retrieves every filtered row", async () => {
    const query = { search: "#11", filters: { status: "completed" }, elevatorOnly: false };
    const rows = Array.from({ length: 63 }, (_, id) => ({ id, quotation_count: id % 3 }));
    rpc.mockReset();
    rpc.mockImplementation(async (name, params) => {
      expect(name).toBe("search_assistances_page");
      expect(params.p_status).toBe("completed");
      expect(params.p_search).toBe("#11");
      return { data: { total: rows.length, rows: rows.slice(params.p_offset, params.p_offset + params.p_limit) } };
    });
    expect((await m.fetchAssistancePage(query, 2)).rows).toEqual(rows.slice(30, 60));
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(await m.fetchAllMatchingAssistances(query, 30)).toEqual(rows);
    expect(rpc).toHaveBeenCalledTimes(4);
  });
  test("a failed RPC is reported instead of returning an empty list", async () => {
    rpc.mockImplementationOnce(async () => ({ error: new Error("unavailable") }));
    await expect(m.fetchAssistancePage({ search: "", filters: {}, elevatorOnly: false }, 1)).rejects.toThrow("unavailable");
  });
});
