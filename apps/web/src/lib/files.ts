"use client";

// Attachments. Private ones are end-to-end encrypted here before upload (AES-256-GCM with the workspace's key, the
// file id bound as associated data) and decrypted here for viewing. Shared-task files go up as they are. Either
// way the bytes go straight to storage with a short-lived signed URL; the server only checks and confirms.
import type { FileRef } from "@todone/sdk/tasks";

const te = new TextEncoder();
type Headers = Record<string, string>;

async function call<T>(method: string, path: string, body?: unknown, headers: Headers = {}): Promise<T> {
  const r = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(data?.error ?? (r.status === 429 ? "Too many uploads. Try again in a bit." : `The server said ${r.status}.`));
  return data as T;
}

const EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/plain",
};
export const ACCEPT = Object.values(EXT).filter((v, i, a) => a.indexOf(v) === i).join(",");
const typeOf = (f: File) => (f.type === "image/jpg" ? "image/jpeg" : f.type) || EXT[f.name.split(".").pop()?.toLowerCase() ?? ""] || f.type;

async function put(url: string, body: Blob) {
  const r = await fetch(url, { method: "PUT", body });
  if (!r.ok) throw new Error("The upload didn't go through. Try again.");
}

// Photos are made smaller before they go up: at most 2560 px on the long side and re-encoded, which also drops
// their metadata (camera, location). GIFs (may be animated) and HEIC (most browsers can't draw it) go as they are, and
// so does anything that wouldn't come out smaller.
const EDGE = 2560;
const SHRINKS: Record<string, string> = { "image/jpeg": "image/jpeg", "image/png": "image/webp", "image/webp": "image/webp" };
export async function shrink(file: File): Promise<File> {
  const out = SHRINKS[typeOf(file)];
  if (!out || file.size < 300_000) return file;
  try {
    const img = await createImageBitmap(file);
    const k = Math.min(1, EDGE / Math.max(img.width, img.height));
    const c = Object.assign(document.createElement("canvas"), { width: Math.round(img.width * k), height: Math.round(img.height * k) });
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    img.close();
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, out, 0.85));
    if (!blob || blob.type !== out || blob.size >= file.size) return file;
    const name = out === file.type ? file.name : file.name.replace(/\.\w+$/, "") + ".webp";
    return new File([blob], name, { type: out });
  } catch {
    return file;
  }
}

// Private: encrypted with `key` (the workspace's), stored as iv ‖ ciphertext.
export async function uploadPrivate(original: File, key: CryptoKey): Promise<FileRef> {
  const file = await shrink(original);
  const type = typeOf(file);
  const { id, uploadUrl } = await call<{ id: string; uploadUrl: string }>("POST", "/files", {
    name: file.name,
    type,
    size: file.size,
  });
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: te.encode(`file:${id}`) },
    key,
    await file.arrayBuffer(),
  );
  await put(uploadUrl, new Blob([iv, ct]));
  return call<FileRef>("POST", `/files/${id}/done`);
}
export async function openPrivate(ref: FileRef, key: CryptoKey): Promise<Blob> {
  const { url } = await call<{ url: string }>("GET", `/files/${ref.id}`);
  const buf = new Uint8Array(await (await fetch(url)).arrayBuffer());
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: buf.slice(0, 12), additionalData: te.encode(`file:${ref.id}`) },
    key,
    buf.slice(12),
  );
  return new Blob([pt], { type: ref.type });
}
export const deletePrivate = (id: string) => call("DELETE", `/files/${id}`).catch(() => {});

// Shared: `base` is the owner's "/task-shares/<id>" or a guest's "/s/<token>" (with their x-guest header).
export async function uploadShared(base: string, original: File, headers?: Headers): Promise<FileRef> {
  const file = await shrink(original);
  const { id, uploadUrl } = await call<{ id: string; uploadUrl: string }>(
    "POST",
    `${base}/files`,
    { name: file.name, type: typeOf(file), size: file.size },
    headers,
  );
  await put(uploadUrl, file);
  return call<FileRef>("POST", `${base}/files/${id}/done`, {}, headers);
}
export const sharedUrl = async (base: string, id: string, headers?: Headers) =>
  (await call<{ url: string }>("GET", `${base}/files/${id}`, undefined, headers)).url;

export const shareCall = call;
export const isImage = (t: string) => t.startsWith("image/") && t !== "image/heic";
export const isVideo = (t: string) => t.startsWith("video/");
export const sizeLabel = (n: number) => (n < 1e6 ? `${Math.max(1, Math.round(n / 1e3))} KB` : `${(n / 1e6).toFixed(1)} MB`);
