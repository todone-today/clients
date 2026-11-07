"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Lock } from "lucide-react";
import type { FileRef } from "@todone/sdk/tasks";
import { isImage, isVideo, sizeLabel } from "@/lib/files";
import s from "./Media.module.css";

// One attachment: images and videos shown inline, anything else as a download chip. `load` returns where to get it
// (a signed URL, or a decrypted Blob for private files), asked for only when it's shown.
export function Media({ file, load }: { file: FileRef; load: () => Promise<string | Blob> }) {
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const inline = isImage(file.type) || isVideo(file.type);
  useEffect(() => {
    if (!inline) return;
    let url = "";
    let live = true;
    load()
      .then((x) => {
        url = typeof x === "string" ? x : URL.createObjectURL(x);
        if (live) setSrc(url);
      })
      .catch(() => live && setErr("Couldn't load"));
    return () => {
      live = false;
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    };
    // Load once per file; `load` is recreated on every render by callers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id, inline]);
  const open = async () => {
    const x = await load();
    const url = typeof x === "string" ? x : URL.createObjectURL(x);
    const a = Object.assign(document.createElement("a"), { href: url, download: file.name, target: "_blank", rel: "noopener" });
    a.click();
    if (url.startsWith("blob:")) setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };
  if (inline)
    return (
      <figure className={s.media}>
        {err ? (
          <span className={s.err}>{err}</span>
        ) : !src ? (
          <span className={s.loading} aria-label="Loading" />
        ) : isImage(file.type) ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed or decrypted blob URLs; nothing to optimise
          <img src={src} alt={file.name} />
        ) : (
          <video src={src} controls preload="metadata" />
        )}
        <figcaption>
          {file.enc && <Lock size={11} strokeWidth={2.5} aria-label="End-to-end encrypted" />} {file.name}
        </figcaption>
      </figure>
    );
  return (
    <button type="button" className={s.chip} onClick={() => open().catch(() => setErr("Couldn't open"))}>
      <FileText size={15} strokeWidth={2.5} aria-hidden />
      <span>{file.name}</span>
      <small>{err || sizeLabel(file.size)}</small>
      {file.enc ? <Lock size={11} strokeWidth={2.5} aria-label="End-to-end encrypted" /> : null}
      <Download size={14} strokeWidth={2.5} aria-hidden />
    </button>
  );
}
