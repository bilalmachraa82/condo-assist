import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { classifyQueryFailure } from "./queryFailure.ts";

Deno.test("classifyQueryFailure reports gateway timeouts as 504", () => {
  assertEquals(classifyQueryFailure("Gateway Timeout"), {
    httpStatus: 504,
    code: "UPSTREAM_TIMEOUT",
  });
});

Deno.test("classifyQueryFailure keeps ordinary query errors as 400", () => {
  assertEquals(classifyQueryFailure("invalid input syntax for type uuid"), {
    httpStatus: 400,
    code: "QUERY_ERROR",
  });
});
