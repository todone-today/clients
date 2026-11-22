"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText, Lock, X } from "lucide-react";
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
          // Tap to see it full screen, like a chat app.
          <Viewer src={src} name={file.name} />
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

// An image, and full screen when tapped: the whole picture on a dark page; tap it for full size (scroll to look
// around), × or Esc or the dark around it to close, and a download.
function Viewer({ src, name }: { src: string; name: string }) {
  const box = useRef<HTMLDialogElement>(null);
  const [big, setBig] = useState(false);
  return (
    <>
      <button type="button" className={s.thumb} onClick={() => box.current?.showModal()} aria-label={`Open ${name}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- signed or decrypted blob URLs; nothing to optimise */}
        <img src={src} alt={name} />
      </button>
      <dialog
        ref={box}
        className={s.viewer}
        aria-label={name}
        onClose={() => setBig(false)}
        onClick={(e) => e.target === e.currentTarget && box.current?.close()}
      >
        <div className={s.viewerTools}>
          <a href={src} download={name} aria-label={`Download ${name}`} data-tip="Download">
            <Download size={20} strokeWidth={2.5} />
          </a>
          <button type="button" onClick={() => box.current?.close()} aria-label="Close" data-tip="Close" data-tip-end>
            <X size={22} strokeWidth={2.75} />
          </button>
        </div>
        <div className={s.viewerStage} data-big={big || undefined} onClick={(e) => e.target === e.currentTarget && box.current?.close()}>
          {/* eslint-disable-next-line @next/next/no-img-element -- signed or decrypted blob URLs; nothing to optimise */}
          <img src={src} alt={name} onClick={() => setBig((b) => !b)} />
        </div>
      </dialog>
    </>
  );
}
