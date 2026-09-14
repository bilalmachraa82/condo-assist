export type QueryFailureClassification = {
  httpStatus: 400 | 504;
  code: "QUERY_ERROR" | "UPSTREAM_TIMEOUT";
};

export function classifyQueryFailure(
  message: string,
): QueryFailureClassification {
  if (/\b(?:gateway|statement|upstream)?\s*time(?:d\s*)?out\b/i.test(message)) {
    return { httpStatus: 504, code: "UPSTREAM_TIMEOUT" };
  }

  return { httpStatus: 400, code: "QUERY_ERROR" };
}
