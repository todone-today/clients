"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download, Link2, Share2, Swords, X } from "lucide-react";
import { usage } from "@/lib/usage";
import { type CardFormat, type CardSpec, cardBlob, drawCard } from "./shareCard";
import { type Mode, goalLink, unshareGoal } from "./goalLinks";
import { Diamond } from "./PlanPrompt";
import s from "./app.module.css";

// A card to share: a preview, Story or square, see-through for laying over a photo (progress cards), then the
// phone's share sheet (WhatsApp, Instagram…) or Save. Made on this device; nothing is uploaded.
// `link`: for a goal, a link to it as well (a view link is free; a challenge, for friends to join, needs Plus).
export function ShareSheet({
  spec: first,
  name,
  onClose,
  link,
  gated,
}: {
  spec: CardSpec;
  name: string;
  onClose: () => void;
  link?: (mode: Mode) => Promise<string>; // makes (or gets) the link; returns its slug
  gated?: boolean; // on the free plan: a challenge needs Plus
}) {
  const [shared, setShared] = useState<{ slug: string; mode: Mode } | null>(null);
  const [linkErr, setLinkErr] = useState("");
  const ref = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [format, setFormat] = useState<CardFormat>("story");
  const [overlay, setOverlay] = useState(false);
  const [said, setSaid] = useState("");
  const spec: CardSpec = first.kind === "progress" ? { ...first, overlay } : first;
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
    usage({ name: "share_sheet_opened", kind: first.kind });
  }, [first.kind]);
  useEffect(() => {
    if (canvas.current) drawCard(canvas.current, spec, format);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, overlay]);

  const file = async () => {
    const b = canvas.current && (await cardBlob(canvas.current));
    return b ? new File([b], `todone-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "card"}.png`, { type: "image/png" }) : null;
  };
  const save = async () => {
    const f = await file();
    if (!f) return;
    const url = URL.createObjectURL(f);
    Object.assign(document.createElement("a"), { href: url, download: f.name }).click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    usage({ name: "share_card_exported", kind: first.kind, via: "save" });
    setSaid("Saved");
  };
  const share = async () => {
    const f = await file();
    if (!f) return;
    if (navigator.canShare?.({ files: [f] })) {
      await navigator.share({ files: [f] }).then(
        () => (usage({ name: "share_card_exported", kind: first.kind, via: "share" }), setSaid("Shared")),
        () => {},
      );
    } else await save(); // this browser can't hand images to other apps: save it instead
  };
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <dialog ref={ref} className={`${s.goalDialog} ${s.shareSheet}`} aria-label="Share" onClose={onClose}>
      <header className={s.shareHead}>
        <h2 className="display">Show it off</h2>
        <button className={s.panelClose} onClick={() => ref.current?.close()} aria-label="Close" data-tip="Close" data-tip-end>
          <X size={18} strokeWidth={2.75} />
        </button>
      </header>
      <div className={s.sharePreview} data-format={format} data-overlay={(spec.kind === "progress" && overlay) || undefined}>
        <canvas ref={canvas} aria-label={`${name}: a card to share`} role="img" />
      </div>
      <div className={s.shareOpts}>
        <div className={s.seg} role="group" aria-label="Shape">
          {(
            [
              ["story", "Story"],
              ["square", "Square"],
            ] as const
          ).map(([k, label]) => (
            <button key={k} aria-pressed={format === k} onClick={() => setFormat(k)}>
              {label}
            </button>
          ))}
        </div>
        {first.kind === "progress" && (
          <label className={s.shareOverlay}>
            <input type="checkbox" checked={overlay} onChange={(e) => setOverlay(e.target.checked)} /> See-through, for a photo
          </label>
        )}
      </div>
      <div className={s.tools}>
        <button className={s.ghost} onClick={save}>
          <Download size={16} strokeWidth={2.5} aria-hidden /> Save image
        </button>
        {canShare && (
          <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} onClick={share}>
            <Share2 size={16} strokeWidth={2.5} aria-hidden /> Share
          </button>
        )}
      </div>
      {link && (
        // A link to the goal itself: a readable copy goes online (goals are otherwise end-to-end encrypted).
        <section className={s.shareLinks}>
          <p className={s.panelHint}>
            Or share a link. It puts a readable copy of this goal and its progress online, updated as you go; stop
            sharing any time.
          </p>
          <div className={s.tools}>
            {(["view", "challenge"] as const).map((m) => (
              <button
                key={m}
                className={m === "challenge" ? "btn" : s.ghost}
                style={m === "challenge" ? ({ "--fill": "var(--peri)" } as React.CSSProperties) : undefined}
                onClick={async () => {
                  setLinkErr("");
                  try {
                    const slug = await link(m);
                    await navigator.clipboard.writeText(goalLink(slug)).catch(() => {});
                    setShared({ slug, mode: m });
                    usage({ name: "goal_link_made", mode: m });
                  } catch (x) {
                    if ((x as { status?: number }).status !== 402) setLinkErr(x instanceof Error ? x.message : "Couldn't make the link.");
                  }
                }}
              >
                {m === "view" ? <Link2 size={16} strokeWidth={2.5} aria-hidden /> : <Swords size={16} strokeWidth={2.5} aria-hidden />}{" "}
                {m === "view" ? "Copy a link" : "Challenge friends"}
                {m === "challenge" && gated && <Diamond />}
              </button>
            ))}
          </div>
          {shared && (
            <p className={s.panelHint} role="status">
              <Check size={14} strokeWidth={3} aria-hidden />{" "}
              {shared.mode === "challenge" ? "Challenge link copied: up to 5 friends can join." : "Link copied."}{" "}
              <button
                className={s.link}
                onClick={async () => {
                  await unshareGoal(shared.slug).catch(() => {});
                  setShared(null);
                }}
              >
                Stop sharing
              </button>
            </p>
          )}
          {linkErr && (
            <p className={s.err} role="alert">
              {linkErr}
            </p>
          )}
        </section>
      )}
      {said && (
        <p className={s.panelHint} role="status">
          <Check size={14} strokeWidth={3} aria-hidden /> {said}
        </p>
      )}
    </dialog>
  );
}
