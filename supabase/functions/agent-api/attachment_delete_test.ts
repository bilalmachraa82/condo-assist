import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { removeStorageObjectShared, StorageRemoveError } from "../_shared/storageRemove.ts";

function fakeStorage(result: { error: unknown }, calls: Array<{ bucket: string; paths: string[] }>) {
  return {
    storage: {
      from: (bucket: string) => ({
        remove: (paths: string[]) => {
          calls.push({ bucket, paths });
          return Promise.resolve(result);
        },
      }),
    },
  };
}

Deno.test("removes the object from the real bucket", async () => {
  const calls: Array<{ bucket: string; paths: string[] }> = [];
  const r = await removeStorageObjectShared(fakeStorage({ error: null }, calls), "email-pendencies", "a/b.pdf");
  assertEquals(r, "removed");
  assertEquals(calls, [{ bucket: "email-pendencies", paths: ["a/b.pdf"] }]);
});

Deno.test("missing object is treated as success (idempotent)", async () => {
  const calls: Array<{ bucket: string; paths: string[] }> = [];
  for (const msg of ["Object not found", "The resource does not exist", "no such key"]) {
    const r = await removeStorageObjectShared(fakeStorage({ error: { message: msg } }, calls), "building-documents", "x.pdf");
    assertEquals(r, "missing");
  }
});

Deno.test("other storage failures abort so the row is never orphaned", async () => {
  const calls: Array<{ bucket: string; paths: string[] }> = [];
  await assertRejects(
    () => removeStorageObjectShared(fakeStorage({ error: { message: "connection reset" } }, calls), "building-documents", "x.pdf"),
    StorageRemoveError,
  );
});

Deno.test("no automatic orphan cleanup: only the given path is removed", async () => {
  const calls: Array<{ bucket: string; paths: string[] }> = [];
  await removeStorageObjectShared(fakeStorage({ error: null }, calls), "assistance-photos", "p/1.jpg");
  assertEquals(calls.length, 1);
  assertEquals(calls[0].paths.length, 1);
});
