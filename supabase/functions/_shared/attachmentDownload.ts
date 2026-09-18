/**
 * Secure, read-only attachment download for the agent API / MCP.
 *
 * AUTHORIZATION SCOPE (documented explicitly):
 * The agent API authenticates with a single shared credential (EXTERNAL_API_KEY).
 * There is currently no organization/tenant model, so that credential has global
 * scope over the whole LUVIMG estate. The only per-request authorization applied
 * here is: attachment exists -> parent record exists -> parent belongs to a
 * building -> that building is active. `assertCredentialScope` below is the single
 * seam where a future per-credential scope filter plugs in without touching any
 * of the four paths.
 */

export type AttachmentKind =
  | "email_pendency_attachment"
  | "insurance_claim_attachment"
  | "building_document"
  | "assistance_photo";

export type DownloadMode = "url" | "content";

export class AttachmentError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const DEFAULT_CONTENT_MAX_BYTES = 4 * 1024 * 1024; // 4 MB
export const MIN_EXPIRES_IN = 60;
export const MAX_EXPIRES_IN = 3600;
export const DEFAULT_EXPIRES_IN = 300;

/** MIME allowlist. Anything outside this set is refused. */
export const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/heic",
  "message/rfc822",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/octet-stream",
]);

const EXT_MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  eml: "message/rfc822",
  txt: "text/plain",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip",
};

/** Sniff the real container type from the first bytes. Returns null when unknown. */
export function sniffMime(bytes: Uint8Array): string | null {
  const b = bytes;
  const startsWith = (sig: number[]) => sig.every((v, i) => b[i] === v);
  if (startsWith([0x25, 0x50, 0x44, 0x46])) return "application/pdf";
  if (startsWith([0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith([0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    return "image/webp";
  }
  if (startsWith([0x50, 0x4b, 0x03, 0x04])) return "application/zip"; // also docx/xlsx
  return null;
}

/** Families that are interchangeable when comparing declared vs sniffed type. */
function sameFamily(a: string, b: string): boolean {
  if (a === b) return true;
  const zipFamily = new Set([
    "application/zip",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ]);
  if (zipFamily.has(a) && zipFamily.has(b)) return true;
  return false;
}

export function sanitizeFileName(name: string | null | undefined): string {
  const base = String(name ?? "ficheiro").split(/[\\/]/).pop() ?? "ficheiro";
  return base
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/_+/g, "_")
    .slice(-160) || "ficheiro";
}

export function normalizeMime(v: unknown): string {
  return String(v ?? "").toLowerCase().split(";")[0].trim();
}

export function parseExpiresIn(raw: string | null): number {
  if (raw === null || raw === "") return DEFAULT_EXPIRES_IN;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < MIN_EXPIRES_IN || n > MAX_EXPIRES_IN) {
    throw new AttachmentError(
      400,
      `'expires_in' must be an integer between ${MIN_EXPIRES_IN} and ${MAX_EXPIRES_IN} seconds`,
      "INVALID_INPUT",
      { field: "expires_in", min: MIN_EXPIRES_IN, max: MAX_EXPIRES_IN, given: raw },
    );
  }
  return n;
}

export function parseMode(raw: string | null): DownloadMode {
  const v = (raw ?? "url").toLowerCase().trim();
  if (v !== "url" && v !== "content") {
    throw new AttachmentError(400, `'mode' must be 'url' or 'content'`, "INVALID_INPUT", {
      field: "mode",
      allowed_values: ["url", "content"],
      given: raw,
    });
  }
  return v;
}

type SupabaseLike = {
  from: (t: string) => any;
  storage: { from: (b: string) => any };
};

interface KindConfig {
  table: string;
  bucket: string;
  pathColumn: string;
  select: string;
  /** Resolve building_id + parent id from the fetched row. */
  resolveParent: (
    supabase: SupabaseLike,
    row: Record<string, any>,
  ) => Promise<{ parentType: string; parentId: string | null; buildingId: string | null }>;
}

const KINDS: Record<AttachmentKind, KindConfig> = {
  email_pendency_attachment: {
    table: "email_pendency_attachments",
    bucket: "email-pendencies",
    pathColumn: "file_path",
    select: "id, pendency_id, file_name, file_path, file_size, mime_type",
    resolveParent: async (supabase, row) => {
      const { data } = await supabase
        .from("email_pendencies").select("id, building_id").eq("id", row.pendency_id).maybeSingle();
      return { parentType: "email_pendency", parentId: data?.id ?? null, buildingId: data?.building_id ?? null };
    },
  },
  insurance_claim_attachment: {
    table: "insurance_claim_attachments",
    bucket: "building-documents",
    pathColumn: "file_path",
    select: "id, claim_id, file_name, file_path, file_size, mime_type",
    resolveParent: async (supabase, row) => {
      const { data } = await supabase
        .from("insurance_claims").select("id, building_id").eq("id", row.claim_id).maybeSingle();
      return { parentType: "insurance_claim", parentId: data?.id ?? null, buildingId: data?.building_id ?? null };
    },
  },
  building_document: {
    table: "building_documents",
    bucket: "building-documents",
    pathColumn: "file_path",
    select: "id, building_id, file_name, file_path, file_size, mime_type",
    resolveParent: async (_supabase, row) => ({
      parentType: "building",
      parentId: row.building_id ?? null,
      buildingId: row.building_id ?? null,
    }),
  },
  assistance_photo: {
    table: "assistance_photos",
    bucket: "assistance-photos",
    pathColumn: "file_url",
    select: "id, assistance_id, file_url, photo_type, caption",
    resolveParent: async (supabase, row) => {
      const { data } = await supabase
        .from("assistances").select("id, building_id").eq("id", row.assistance_id).maybeSingle();
      return { parentType: "assistance", parentId: data?.id ?? null, buildingId: data?.building_id ?? null };
    },
  },
};

/**
 * Single seam for credential-scoped authorization. Today the shared API key has
 * global scope, so this only enforces that the building exists and is active.
 */
async function assertCredentialScope(supabase: SupabaseLike, buildingId: string | null) {
  if (!buildingId) {
    throw new AttachmentError(403, "Attachment is not linked to any building", "FORBIDDEN", {
      reason: "no_building_scope",
    });
  }
  const { data, error } = await supabase
    .from("buildings").select("id, is_active").eq("id", buildingId).maybeSingle();
  if (error) throw new AttachmentError(503, "Temporary failure resolving building", "UPSTREAM_ERROR");
  if (!data) throw new AttachmentError(404, "Building not found", "NOT_FOUND", { reason: "building_missing" });
  if (data.is_active === false) {
    throw new AttachmentError(403, "Building is inactive", "FORBIDDEN", { reason: "building_inactive" });
  }
}

async function readContentMaxBytes(supabase: SupabaseLike): Promise<number> {
  try {
    const { data } = await supabase
      .from("app_settings").select("value").eq("key", "attachment_content_max_bytes").maybeSingle();
    const raw = data?.value;
    const n = typeof raw === "number" ? raw : Number((raw as any)?.value ?? raw);
    if (Number.isFinite(n) && n > 0) return n;
  } catch {
    // fall through to default
  }
  return DEFAULT_CONTENT_MAX_BYTES;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export interface DownloadResult {
  attachment_id: string;
  kind: AttachmentKind;
  parent_type: string;
  parent_id: string | null;
  building_id: string | null;
  file_name: string;
  mime_type: string;
  size: number | null;
  requested_mode: DownloadMode;
  effective_mode: DownloadMode;
  fallback_reason?: string;
  expires_at: string;
  url?: string;
  content_base64?: string;
}

export async function resolveAttachmentDownload(
  supabase: SupabaseLike,
  kind: AttachmentKind,
  attachmentId: string,
  opts: { mode: DownloadMode; expiresIn: number },
): Promise<DownloadResult> {
  const cfg = KINDS[kind];
  if (!cfg) throw new AttachmentError(404, "Unknown attachment kind", "NOT_FOUND");

  const { data: row, error } = await supabase
    .from(cfg.table).select(cfg.select).eq("id", attachmentId).maybeSingle();
  if (error) throw new AttachmentError(503, "Temporary failure reading attachment", "UPSTREAM_ERROR");
  if (!row) throw new AttachmentError(404, "Attachment not found", "NOT_FOUND", { reason: "attachment_missing" });

  const parent = await cfg.resolveParent(supabase, row);
  if (!parent.parentId) {
    throw new AttachmentError(404, "Parent record no longer exists", "NOT_FOUND", { reason: "parent_missing" });
  }
  await assertCredentialScope(supabase, parent.buildingId);

  const path = row[cfg.pathColumn];
  if (!path || typeof path !== "string") {
    throw new AttachmentError(404, "Attachment has no stored file", "OBJECT_MISSING", { reason: "empty_path" });
  }

  const fileName = sanitizeFileName(row.file_name ?? path);
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  const declared = normalizeMime(row.mime_type) || EXT_MIME[ext] || "application/octet-stream";
  const byExtension = EXT_MIME[ext] ?? null;

  if (!ALLOWED_MIME.has(declared)) {
    throw new AttachmentError(403, `File type not allowed: ${declared}`, "FORBIDDEN", {
      reason: "mime_not_allowed",
      mime_type: declared,
    });
  }

  // Signed URL (never logged).
  const { data: signed, error: signErr } = await supabase
    .storage.from(cfg.bucket).createSignedUrl(path, opts.expiresIn);
  if (signErr || !signed?.signedUrl) {
    const msg = String((signErr as any)?.message ?? "");
    if (/not.?found|does not exist|Object not found/i.test(msg)) {
      throw new AttachmentError(404, "Stored object not found", "OBJECT_MISSING", { reason: "storage_object_missing" });
    }
    throw new AttachmentError(503, "Temporary failure generating download link", "UPSTREAM_ERROR");
  }
  const url: string = signed.signedUrl;
  const expiresAt = new Date(Date.now() + opts.expiresIn * 1000).toISOString();

  // Probe the real bytes: existence check + magic-byte validation.
  let head: Response;
  try {
    head = await fetch(url, { headers: { Range: "bytes=0-63" } });
  } catch {
    throw new AttachmentError(503, "Temporary failure reading stored object", "UPSTREAM_ERROR");
  }
  if (head.status === 404) {
    throw new AttachmentError(404, "Stored object not found", "OBJECT_MISSING", { reason: "storage_object_missing" });
  }
  if (!head.ok && head.status !== 206) {
    throw new AttachmentError(503, "Temporary failure reading stored object", "UPSTREAM_ERROR");
  }
  const probe = new Uint8Array(await head.arrayBuffer());
  const sniffed = sniffMime(probe);

  let effectiveMime = declared;
  let mismatch: string | undefined;
  if (sniffed && !sameFamily(sniffed, declared)) {
    mismatch = "signature_mismatch";
  } else if (byExtension && !sameFamily(byExtension, declared) && !(sniffed && sameFamily(sniffed, byExtension))) {
    mismatch = "extension_mismatch";
  }
  if (mismatch) {
    // Never advertise a misleading type: downgrade to generic binary.
    effectiveMime = "application/octet-stream";
  }

  const size = typeof row.file_size === "number"
    ? row.file_size
    : Number(head.headers.get("content-range")?.split("/")?.[1] ?? NaN);

  const result: DownloadResult = {
    attachment_id: String(row.id),
    kind,
    parent_type: parent.parentType,
    parent_id: parent.parentId,
    building_id: parent.buildingId,
    file_name: fileName,
    mime_type: effectiveMime,
    size: Number.isFinite(size) ? size : null,
    requested_mode: opts.mode,
    effective_mode: "url",
    expires_at: expiresAt,
    url,
  };
  if (mismatch) result.fallback_reason = mismatch;

  if (opts.mode === "content") {
    const maxBytes = await readContentMaxBytes(supabase);
    if (result.size !== null && result.size > maxBytes) {
      result.effective_mode = "url";
      result.fallback_reason = "content_size_limit";
      return result;
    }
    let full: Response;
    try {
      full = await fetch(url);
    } catch {
      throw new AttachmentError(503, "Temporary failure downloading stored object", "UPSTREAM_ERROR");
    }
    if (full.status === 404) {
      throw new AttachmentError(404, "Stored object not found", "OBJECT_MISSING", { reason: "storage_object_missing" });
    }
    if (!full.ok) throw new AttachmentError(503, "Temporary failure downloading stored object", "UPSTREAM_ERROR");
    const bytes = new Uint8Array(await full.arrayBuffer());
    if (bytes.length > maxBytes) {
      result.effective_mode = "url";
      result.fallback_reason = "content_size_limit";
      return result;
    }
    result.effective_mode = "content";
    result.size = bytes.length;
    result.content_base64 = bytesToBase64(bytes);
    delete result.url;
  }

  return result;
}
