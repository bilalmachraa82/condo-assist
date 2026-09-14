/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { collectAllPages } from "./paginatedQuery.ts";

Deno.test("collectAllPages returns rows beyond the Supabase 1000-row ceiling", async () => {
  const source = Array.from({ length: 1174 }, (_, id) => ({ id }));
  const requestedRanges: Array<[number, number]> = [];

  const rows = await collectAllPages(async (from, to) => {
    requestedRanges.push([from, to]);
    return source.slice(from, to + 1);
  }, 500);

  assertEquals(rows, source);
  assertEquals(requestedRanges, [
    [0, 499],
    [500, 999],
    [1000, 1499],
  ]);
});
