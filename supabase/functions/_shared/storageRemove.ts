/**
 * Idempotent storage object removal shared by the attachment delete handlers.
 * Contract: storage is always removed BEFORE the database row, so a failure
 * here aborts the delete and never leaves an orphaned file.
 */

export class StorageRemoveError extends Error {
  constructor(message: string, public code = "UPSTREAM_ERROR", public status = 503) {
    super(message);
  }
}

type StorageLike = { storage: { from: (b: string) => { remove: (p: string[]) => Promise<{ error: unknown }> } } };

/** Returns "removed" when the object was deleted, "missing" when it was already gone. */
export async function removeStorageObjectShared(
  supabase: StorageLike,
  bucket: string,
  path: string,
): Promise<"removed" | "missing"> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (!error) return "removed";
  const msg = String((error as { message?: string })?.message ?? "");
  if (/not.?found|does not exist|no such/i.test(msg)) return "missing";
  throw new StorageRemoveError("Temporary failure removing stored file");
}
