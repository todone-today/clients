"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download, Image as ImageIcon, Link2, Share2, Swords, X } from "lucide-react";
import { usage } from "@/lib/usage";
import { type CardFormat, type CardSpec, cardBlob, drawCard } from "./shareCard";
import { type Mode, goalLink, unshareGoal } from "./goalLinks";
import { Diamond } from "./PlanPrompt";
import s from "./app.module.css";

// Show it off, in two tabs. Picture: a card made on this device (nothing uploaded), as a Story, a square, or
// see-through to lay over a photo; then the phone's share sheet (WhatsApp, Instagram…), or Save. Link: a page for
// the goal itself, to view (free) or to join as a challenge (Plus).
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
  const [tab, setTab] = useState<"picture" | "link">("picture");
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
  }, [format, overlay, tab]);

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

  const photo = spec.kind === "progress" && overlay;
  // The link's preview: what friends see on the page, in a few words.
  const peek =
    first.kind === "progress"
      ? { title: first.title, big: first.big, label: first.label, fill: first.fill }
      : first.kind === "win"
        ? { title: first.title, big: "Done", label: first.eyebrow, fill: first.fill }
        : null;
  const makeLink = async (m: Mode) => {
    if (!link) return;
    setLinkErr("");
    try {
      const slug = await link(m);
      await navigator.clipboard.writeText(goalLink(slug)).catch(() => {});
      setShared({ slug, mode: m });
      usage({ name: "goal_link_made", mode: m });
    } catch (x) {
      if ((x as { status?: number }).status !== 402) setLinkErr(x instanceof Error ? x.message : "Couldn't make the link.");
    }
  };

  return (
    <dialog ref={ref} className={`${s.goalDialog} ${s.shareSheet}`} aria-label="Show it off" onClose={onClose}>
      <header className={s.shareHead}>
        <h2 className="display">Show it off</h2>
        <button className={s.panelClose} onClick={() => ref.current?.close()} aria-label="Close" data-tip="Close" data-tip-end>
          <X size={18} strokeWidth={2.75} />
        </button>
      </header>
      {link && (
        <div className={s.shareTabs} role="tablist" aria-label="How to share">
          {(
            [
              ["picture", "Picture", ImageIcon],
              ["link", "Link", Link2],
            ] as const
          ).map(([k, label, Icon]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
              <Icon size={16} strokeWidth={2.5} aria-hidden /> {label}
            </button>
          ))}
        </div>
      )}

      {tab === "picture" ? (
        <>
          <div className={s.sharePreview} data-format={format} data-overlay={photo || undefined}>
            <canvas ref={canvas} aria-label={`${name}: a picture to share`} role="img" />
          </div>
          <div className={s.shareStyles} role="group" aria-label="Style">
            {(
              [
                ["story", "Story"],
                ["square", "Square"],
                ...(first.kind === "progress" ? ([["photo", "On a photo"]] as const) : []),
              ] as const
            ).map(([k, label]) => {
              const on = k === "photo" ? photo : !photo && format === k;
              return (
                <button
                  key={k}
                  aria-pressed={on}
                  onClick={() => {
                    setOverlay(k === "photo");
                    setFormat(k === "square" ? "square" : "story");
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className={s.shareDo}>
            {canShare ? (
              <>
                <button className={`btn ${s.shareMain}`} onClick={share}>
                  <Share2 size={18} strokeWidth={2.5} aria-hidden /> Share
                </button>
                <button className={s.ghost} onClick={save} aria-label="Save image" data-tip="Save image">
                  <Download size={18} strokeWidth={2.5} aria-hidden /> Save
                </button>
              </>
            ) : (
              <button className={`btn ${s.shareMain}`} onClick={save}>
                <Download size={18} strokeWidth={2.5} aria-hidden /> Save image
              </button>
            )}
          </div>
          {said && (
            <p className={s.panelHint} role="status">
              <Check size={14} strokeWidth={3} aria-hidden /> {said}
            </p>
          )}
        </>
      ) : (
        // A link to the goal itself: a readable copy goes online (goals are otherwise end-to-end encrypted).
        <div className={s.shareGoalLink}>
          {peek && (
            <div className={s.sharePeek} style={{ "--fill": peek.fill } as React.CSSProperties} aria-hidden>
              <small>todone.today/g/…</small>
              <b>{peek.title}</b>
              <span>
                <strong className="display">{peek.big}</strong> {peek.label}
              </span>
            </div>
          )}
          <button className={`btn ${s.shareMain}`} onClick={() => makeLink("view")}>
            <Link2 size={18} strokeWidth={2.5} aria-hidden /> Copy link
          </button>
          <button className={`btn ${s.shareAlt}`} onClick={() => makeLink("challenge")}>
            <Swords size={18} strokeWidth={2.5} aria-hidden /> Challenge up to 5 friends
            {gated && <Diamond />}
          </button>
          <p className={s.panelHint}>Anyone with the link sees this goal and how it&apos;s going. Stop any time.</p>
          {shared && (
            <p className={s.shareDone} role="status">
              <Check size={16} strokeWidth={3} aria-hidden />
              <span>{shared.mode === "challenge" ? "Challenge link copied. Send it to your friends." : "Link copied. Paste it anywhere."}</span>
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
        </div>
      )}
    </dialog>
  );
}
