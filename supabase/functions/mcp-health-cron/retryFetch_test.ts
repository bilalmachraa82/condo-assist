import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { fetchWithSingleRetry } from "./retryFetch.ts";

Deno.test("fetchWithSingleRetry retries one transient gateway failure", async () => {
  let attempts = 0;
  const delays: number[] = [];

  const response = await fetchWithSingleRetry(
    async () => {
      attempts += 1;
      return attempts === 1
        ? new Response("Gateway Timeout", { status: 504 })
        : new Response("ok", { status: 200 });
    },
    { delayMs: 2000, sleep: async (ms: number) => delays.push(ms) },
  );

  assertEquals(response.status, 200);
  assertEquals(attempts, 2);
  assertEquals(delays, [2000]);
});

Deno.test("fetchWithSingleRetry does not retry a client error", async () => {
  let attempts = 0;

  const response = await fetchWithSingleRetry(async () => {
    attempts += 1;
    return new Response("Bad Request", { status: 400 });
  });

  assertEquals(response.status, 400);
  assertEquals(attempts, 1);
});
