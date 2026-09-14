type RetryOptions = {
  delayMs?: number;
  sleep?: (ms: number) => Promise<unknown>;
};

const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

const defaultSleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchWithSingleRetry(
  fetcher: () => Promise<Response>,
  options: RetryOptions = {},
): Promise<Response> {
  const delayMs = options.delayMs ?? 2000;
  const sleep = options.sleep ?? defaultSleep;

  try {
    const response = await fetcher();
    if (!RETRYABLE_STATUSES.has(response.status)) return response;
  } catch {
    // A network failure is transient unless the retry proves otherwise.
  }

  await sleep(delayMs);
  return fetcher();
}
