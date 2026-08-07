import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  inspectionDateIsRequired,
  inspectionDatesForSave,
  nextDueDateIsRequired,
} from "../../../src/utils/inspectionRules.ts";

Deno.test("elevator pending records accept no date and discard the historical date", () => {
  assertEquals(inspectionDateIsRequired("elevador"), false);
  assertEquals(nextDueDateIsRequired("elevador", "pendente_relatorio"), false);
  assertEquals(
    inspectionDatesForSave({
      categoryKey: "elevador",
      result: "pendente_relatorio",
      inspectionDate: "2026-08-06",
      nextDueDate: "",
    }),
    {
      inspection_date: null,
      next_due_date: null,
      result: "pendente_relatorio",
    },
  );
});

Deno.test("non-pending elevators require only the next date", () => {
  assertEquals(nextDueDateIsRequired("elevador", "aprovado"), true);
  assertEquals(inspectionDateIsRequired("elevador"), false);
});

Deno.test("ordinary inspections retain their inspection date", () => {
  assertEquals(inspectionDateIsRequired("extintor"), true);
  assertEquals(nextDueDateIsRequired("extintor", "aprovado"), false);
});

Deno.test("insurance status migration exposes every policy", async () => {
  const migrationUrl = new URL(
    "../../migrations/20260806120000_fix_luvimg_inspections_insurances_elevators.sql",
    import.meta.url,
  );
  const sql = await Deno.readTextFile(migrationUrl);
  assertStringIncludes(
    sql,
    "LEFT JOIN public.building_insurances i ON i.building_id = b.id",
  );
  assertEquals(sql.includes("DISTINCT ON (building_id)"), false);
  assertStringIncludes(sql, "bi.inspection_date DESC NULLS FIRST");
});

Deno.test("all inspection write boundaries allow the elevator date rules", async () => {
  const agentApi = await Deno.readTextFile(
    new URL("./index.ts", import.meta.url),
  );
  const mcpServer = await Deno.readTextFile(
    new URL("../mcp-server/index.ts", import.meta.url),
  );

  assertStringIncludes(
    agentApi,
    'inspection_date: optionalNullableString(body.inspection_date, "inspection_date")',
  );
  assertStringIncludes(
    agentApi,
    'next_due_date: optionalNullableString(body.next_due_date, "next_due_date")',
  );
  assertStringIncludes(
    mcpServer,
    'required: ["building_id", "category_id", "result"]',
  );
});

Deno.test("insurance policy editing and alert deduplication are backed by the migration", async () => {
  const migrationUrl = new URL(
    "../../migrations/20260806120000_fix_luvimg_inspections_insurances_elevators.sql",
    import.meta.url,
  );
  const sql = await Deno.readTextFile(migrationUrl);

  assertStringIncludes(sql, "i.policy_path");
  assertStringIncludes(sql, "idx_insurance_alerts_policy_lookup");
  assertStringIncludes(sql, "insurance_id, alert_type, alert_date");
});

Deno.test("the scheduled insurance cron satisfies Edge Function JWT verification", async () => {
  const migration = await Deno.readTextFile(
    new URL(
      "../../migrations/20260806120000_fix_luvimg_inspections_insurances_elevators.sql",
      import.meta.url,
    ),
  );
  const config = await Deno.readTextFile(
    new URL("../../config.toml", import.meta.url),
  );

  assertStringIncludes(config, "[functions.insurance-alerts-cron]");
  assertStringIncludes(
    config,
    "[functions.insurance-alerts-cron]\nverify_jwt = true",
  );
  assertStringIncludes(migration, "'Authorization', 'Bearer ");
  assertStringIncludes(migration, "cron.unschedule('insurance-alerts-daily')");
});
