// Regression tests for secure attachment downloads.
// Run: deno test --allow-net supabase/functions/agent-api/attachment_download_test.ts

import { assertEquals, assertRejects } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  AttachmentError,
  parseExpiresIn,
  parseMode,
  resolveAttachmentDownload,
  sanitizeFileName,
  sniffMime,
} from "../_shared/attachmentDownload.ts";

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const B = "11111111-1111-4111-8111-111111111111"; // building (active)
const B_OFF = "22222222-2222-4222-8222-222222222222"; // building (inactive)
const A = "33333333-3333-4333-8333-333333333333"; // attachment id

type Rows = Record<string, Record<string, any>[]>;

function makeDb(rows: Rows, opts: { signedError?: string; logFails?: boolean } = {}) {
  const logged: any[] = [];
  const db: any = {
    logged,
    from(table: string) {
      const q: any = {
        _filters: {} as Record<string, unknown>,
        select() { return q; },
        eq(col: string, val: unknown) { q._filters[col] = val; return q; },
        maybeSingle() {
          const list = rows[table] ?? [];
          const found = list.find((r) =>
            Object.entries(q._filters).every(([k, v]) => r[k] === v)
          ) ?? null;
          return Promise.resolve({ data: found, error: null });
        },
        insert(payload: unknown) {
          logged.push({ table, payload });
          return Promise.resolve({ error: opts.logFails ? { message: "log down" } : null });
        },
      };
      return q;
    },
    storage: {
      from(_bucket: string) {
        return {
          createSignedUrl(path: string, expiresIn: number) {
            if (opts.signedError) {
              return Promise.resolve({ data: null, error: { message: opts.signedError } });
            }
            return Promise.resolve({
              data: { signedUrl: `https://storage.test/${path}?token=secret&exp=${expiresIn}` },
              error: null,
            });
          },
        };
      },
    },
  };
  return db;
}

function stubFetch(handler: (url: string, init?: RequestInit) => Response) {
  const original = globalThis.fetch;
  globalThis.fetch = ((input: any, init?: any) =>
    Promise.resolve(handler(String(input), init))) as typeof fetch;
  return () => { globalThis.fetch = original; };
}

function okBytes(bytes: Uint8Array, total = bytes.length) {
  return (url: string, init?: RequestInit) => {
    const range = (init?.headers as Record<string, string> | undefined)?.Range;
    if (range) {
      return new Response(bytes.subarray(0, 64), {
        status: 206,
        headers: { "content-range": `bytes 0-63/${total}` },
      });
    }
    if (!url) return new Response(null, { status: 404 });
    return new Response(bytes, { status: 200 });
  };
}

const activeBuilding = { id: B, is_active: true };
const inactiveBuilding = { id: B_OFF, is_active: false };

// ── Pure helpers ──────────────────────────────────────────────────────────
Deno.test("sniffMime detects PDF and PNG", () => {
  assertEquals(sniffMime(PDF_BYTES), "application/pdf");
  assertEquals(sniffMime(PNG_BYTES), "image/png");
});

Deno.test("sanitizeFileName strips paths and unsafe chars", () => {
  assertEquals(sanitizeFileName("../../etc/pa ss;wd.pdf"), "pa ss_wd.pdf");
});

Deno.test("parseMode / parseExpiresIn enforce bounds", () => {
  assertEquals(parseMode(null), "url");
  assertEquals(parseMode("content"), "content");
  assertEquals(parseExpiresIn(null), 300);
  assertEquals(parseExpiresIn("600"), 600);
  for (const bad of ["59", "3601", "abc"]) {
    let code = "";
    try { parseExpiresIn(bad); } catch (e) { code = (e as AttachmentError).code; }
    assertEquals(code, "INVALID_INPUT");
  }
  let modeCode = "";
  try { parseMode("binary"); } catch (e) { modeCode = (e as AttachmentError).code; }
  assertEquals(modeCode, "INVALID_INPUT");
});

// ── Path 1: pendency attachment → pendency → building ─────────────────────
Deno.test("email pendency attachment resolves to a signed URL", async () => {
  const db = makeDb({
    email_pendency_attachments: [{ id: A, pendency_id: "p1", file_name: "carta.pdf", file_path: "p1/carta.pdf", file_size: 1024, mime_type: "application/pdf" }],
    email_pendencies: [{ id: "p1", building_id: B }],
    buildings: [activeBuilding],
  });
  const restore = stubFetch(okBytes(PDF_BYTES, 1024));
  try {
    const r = await resolveAttachmentDownload(db, "email_pendency_attachment", A, { mode: "url", expiresIn: 300 });
    assertEquals(r.effective_mode, "url");
    assertEquals(r.mime_type, "application/pdf");
    assertEquals(r.file_name, "carta.pdf");
    assertEquals(r.parent_type, "email_pendency");
    assertEquals(r.building_id, B);
    assertEquals(typeof r.url, "string");
  } finally { restore(); }
});

// ── Path 2: claim attachment → claim → building ───────────────────────────
Deno.test("insurance claim attachment resolves", async () => {
  const db = makeDb({
    insurance_claim_attachments: [{ id: A, claim_id: "c1", file_name: "peritagem.pdf", file_path: "claims/c1/peritagem.pdf", file_size: 2048, mime_type: "application/pdf" }],
    insurance_claims: [{ id: "c1", building_id: B }],
    buildings: [activeBuilding],
  });
  const restore = stubFetch(okBytes(PDF_BYTES, 2048));
  try {
    const r = await resolveAttachmentDownload(db, "insurance_claim_attachment", A, { mode: "url", expiresIn: 300 });
    assertEquals(r.parent_type, "insurance_claim");
    assertEquals(r.building_id, B);
  } finally { restore(); }
});

// ── Path 3: building document → building ──────────────────────────────────
Deno.test("building document resolves", async () => {
  const db = makeDb({
    building_documents: [{ id: A, building_id: B, file_name: "ata.pdf", file_path: `${B}/atas/ata.pdf`, file_size: 512, mime_type: "application/pdf" }],
    buildings: [activeBuilding],
  });
  const restore = stubFetch(okBytes(PDF_BYTES, 512));
  try {
    const r = await resolveAttachmentDownload(db, "building_document", A, { mode: "url", expiresIn: 300 });
    assertEquals(r.parent_type, "building");
    assertEquals(r.parent_id, B);
  } finally { restore(); }
});

// ── Path 4: photo → assistance → building ─────────────────────────────────
Deno.test("assistance photo resolves and returns content when small", async () => {
  const db = makeDb({
    assistance_photos: [{ id: A, assistance_id: "a1", file_url: "a1/before_1.png" }],
    assistances: [{ id: "a1", building_id: B }],
    buildings: [activeBuilding],
    app_settings: [],
  });
  const restore = stubFetch(okBytes(PNG_BYTES, PNG_BYTES.length));
  try {
    const r = await resolveAttachmentDownload(db, "assistance_photo", A, { mode: "content", expiresIn: 300 });
    assertEquals(r.parent_type, "assistance");
    assertEquals(r.effective_mode, "content");
    assertEquals(r.mime_type, "image/png");
    assertEquals(typeof r.content_base64, "string");
    assertEquals(r.url, undefined);
  } finally { restore(); }
});

// ── Authorization / not-found cases ───────────────────────────────────────
Deno.test("missing attachment → NOT_FOUND", async () => {
  const db = makeDb({ email_pendency_attachments: [], buildings: [activeBuilding] });
  const err = await assertRejects(() =>
    resolveAttachmentDownload(db, "email_pendency_attachment", A, { mode: "url", expiresIn: 300 }), AttachmentError);
  assertEquals(err.status, 404);
  assertEquals(err.extra?.reason, "attachment_missing");
});

Deno.test("parent record deleted → NOT_FOUND", async () => {
  const db = makeDb({
    email_pendency_attachments: [{ id: A, pendency_id: "gone", file_name: "x.pdf", file_path: "x.pdf", mime_type: "application/pdf" }],
    email_pendencies: [],
    buildings: [activeBuilding],
  });
  const err = await assertRejects(() =>
    resolveAttachmentDownload(db, "email_pendency_attachment", A, { mode: "url", expiresIn: 300 }), AttachmentError);
  assertEquals(err.extra?.reason, "parent_missing");
});

Deno.test("inactive building → FORBIDDEN", async () => {
  const db = makeDb({
    email_pendency_attachments: [{ id: A, pendency_id: "p1", file_name: "x.pdf", file_path: "x.pdf", mime_type: "application/pdf" }],
    email_pendencies: [{ id: "p1", building_id: B_OFF }],
    buildings: [inactiveBuilding],
  });
  const err = await assertRejects(() =>
    resolveAttachmentDownload(db, "email_pendency_attachment", A, { mode: "url", expiresIn: 300 }), AttachmentError);
  assertEquals(err.status, 403);
  assertEquals(err.extra?.reason, "building_inactive");
});

Deno.test("attachment of an unknown building → NOT_FOUND on building", async () => {
  const db = makeDb({
    email_pendency_attachments: [{ id: A, pendency_id: "p1", file_name: "x.pdf", file_path: "x.pdf", mime_type: "application/pdf" }],
    email_pendencies: [{ id: "p1", building_id: "99999999-9999-4999-8999-999999999999" }],
    buildings: [activeBuilding],
  });
  const err = await assertRejects(() =>
    resolveAttachmentDownload(db, "email_pendency_attachment", A, { mode: "url", expiresIn: 300 }), AttachmentError);
  assertEquals(err.extra?.reason, "building_missing");
});

Deno.test("row exists but object missing in storage → OBJECT_MISSING", async () => {
  const db = makeDb({
    building_documents: [{ id: A, building_id: B, file_name: "ata.pdf", file_path: "missing.pdf", mime_type: "application/pdf" }],
    buildings: [activeBuilding],
  });
  const restore = stubFetch(() => new Response(null, { status: 404 }));
  try {
    const err = await assertRejects(() =>
      resolveAttachmentDownload(db, "building_document", A, { mode: "url", expiresIn: 300 }), AttachmentError);
    assertEquals(err.status, 404);
    assertEquals(err.code, "OBJECT_MISSING");
  } finally { restore(); }
});

Deno.test("stored bytes contradict declared type → generic binary + fallback_reason", async () => {
  const db = makeDb({
    building_documents: [{ id: A, building_id: B, file_name: "ata.pdf", file_path: "ata.pdf", file_size: 8, mime_type: "application/pdf" }],
    buildings: [activeBuilding],
  });
  const restore = stubFetch(okBytes(PNG_BYTES, 8));
  try {
    const r = await resolveAttachmentDownload(db, "building_document", A, { mode: "url", expiresIn: 300 });
    assertEquals(r.mime_type, "application/octet-stream");
    assertEquals(r.fallback_reason, "signature_mismatch");
  } finally { restore(); }
});

Deno.test("disallowed mime → FORBIDDEN", async () => {
  const db = makeDb({
    building_documents: [{ id: A, building_id: B, file_name: "script.sh", file_path: "script.sh", mime_type: "application/x-sh" }],
    buildings: [activeBuilding],
  });
  const err = await assertRejects(() =>
    resolveAttachmentDownload(db, "building_document", A, { mode: "url", expiresIn: 300 }), AttachmentError);
  assertEquals(err.status, 403);
  assertEquals(err.extra?.reason, "mime_not_allowed");
});

Deno.test("mode=content above the limit falls back to url with explicit reason", async () => {
  const db = makeDb({
    building_documents: [{ id: A, building_id: B, file_name: "grande.pdf", file_path: "grande.pdf", file_size: 50 * 1024 * 1024, mime_type: "application/pdf" }],
    buildings: [activeBuilding],
    app_settings: [{ key: "attachment_content_max_bytes", value: 4 * 1024 * 1024 }],
  });
  const restore = stubFetch(okBytes(PDF_BYTES, 50 * 1024 * 1024));
  try {
    const r = await resolveAttachmentDownload(db, "building_document", A, { mode: "content", expiresIn: 300 });
    assertEquals(r.requested_mode, "content");
    assertEquals(r.effective_mode, "url");
    assertEquals(r.fallback_reason, "content_size_limit");
    assertEquals(r.content_base64, undefined);
  } finally { restore(); }
});

Deno.test("signed URL failure is a temporary error, not a 404", async () => {
  const db = makeDb({
    building_documents: [{ id: A, building_id: B, file_name: "ata.pdf", file_path: "ata.pdf", mime_type: "application/pdf" }],
    buildings: [activeBuilding],
  }, { signedError: "gateway timeout" });
  const err = await assertRejects(() =>
    resolveAttachmentDownload(db, "building_document", A, { mode: "url", expiresIn: 300 }), AttachmentError);
  assertEquals(err.status, 503);
});

Deno.test("response never exposes internal bucket paths", async () => {
  const db = makeDb({
    building_documents: [{ id: A, building_id: B, file_name: "ata.pdf", file_path: "secret/internal/ata.pdf", file_size: 8, mime_type: "application/pdf" }],
    buildings: [activeBuilding],
  });
  const restore = stubFetch(okBytes(PDF_BYTES, 8));
  try {
    const r = await resolveAttachmentDownload(db, "building_document", A, { mode: "url", expiresIn: 300 });
    const keys = Object.keys(r);
    assertEquals(keys.includes("file_path"), false);
    assertEquals(keys.includes("bucket"), false);
  } finally { restore(); }
});
