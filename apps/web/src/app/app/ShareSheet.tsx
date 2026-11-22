"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download, Image as ImageIcon, Link2, Share2, Swords, X } from "lucide-react";
import { usage } from "@/lib/usage";
import { type CardSpec, cardBlob, drawCard } from "./shareCard";
import { type Mode, goalLink, unshareGoal } from "./goalLinks";
import { Diamond } from "./PlanPrompt";
import s from "./app.module.css";

// Let others see, in two tabs. Picture: a Story-sized card made on this device (nothing uploaded), in a colour you
// pick. A goal's card is see-through, to lay over your own photo (the preview shows it on a sample one); a week's
// recap is a full card. Share and Save are two icons on the right. Link: a page for the goal itself, to view (free)
// or to join as a challenge (Plus).
const SWATCHES = ["var(--lime)", "var(--butter)", "var(--pink)", "var(--peri)", "var(--cyan)", "var(--orange)"];

export function ShareSheet({
  spec: first,
  name,
  onClose,
  link,
  gated,
  title = "Let others see",
}: {
  spec: CardSpec;
  name: string;
  onClose: () => void;
  link?: (mode: Mode) => Promise<string>; // makes (or gets) the link; returns its slug
  gated?: boolean; // on the free plan: a challenge needs Plus
  title?: string;
}) {
  const [shared, setShared] = useState<{ slug: string; mode: Mode } | null>(null);
  const [linkErr, setLinkErr] = useState("");
  const [tab, setTab] = useState<"picture" | "link">("picture");
  const ref = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [fill, setFill] = useState(first.kind === "recap" ? (first.fill ?? "var(--peri)") : first.fill);
  const [said, setSaid] = useState("");
  const photo = first.kind !== "recap"; // over a photo: a goal's card; a recap fills its card
  const spec: CardSpec =
    first.kind === "progress"
      ? { ...first, fill, overlay: true }
      : first.kind === "win"
        ? { ...first, fill, overlay: true }
        : { ...first, fill };
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
    usage({ name: "share_sheet_opened", kind: first.kind });
  }, [first.kind]);
  useEffect(() => {
    if (canvas.current) drawCard(canvas.current, spec, "story");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fill, tab]);

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
    setSaid("Saved to your downloads.");
  };
  const share = async () => {
    const f = await file();
    if (!f) return;
    if (navigator.canShare?.({ files: [f] })) {
      await navigator.share({ files: [f] }).then(
        () => (usage({ name: "share_card_exported", kind: first.kind, via: "share" }), setSaid("Shared.")),
        () => {},
      );
    } else await save(); // this browser can't hand images to other apps: save it instead
  };
  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  // The link's preview: what friends see on the page, in a few words.
  const peek =
    first.kind === "progress"
      ? { title: first.title, big: first.big, label: first.label }
      : first.kind === "win"
        ? { title: first.title, big: "Done", label: first.eyebrow }
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
  const stop = async () => {
    if (shared) await unshareGoal(shared.slug).catch(() => {});
    setShared(null);
  };

  return (
    <dialog ref={ref} className={`${s.goalDialog} ${s.shareSheet}`} aria-label={title} onClose={onClose}>
      <header className={s.shareHead}>
        <h2 className="display">{title}</h2>
        <button className={s.panelClose} onClick={() => ref.current?.close()} aria-label="Close">
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
          <div className={s.sharePreview} data-photo={photo || undefined}>
            <canvas ref={canvas} aria-label={`${name}: a picture to share`} role="img" />
          </div>
          {/* The card's colour on the left; save and share, as icons, on the right. */}
          <div className={s.shareDo}>
            <div className={s.swatches} role="radiogroup" aria-label="Colour">
              {[...new Set([first.kind === "recap" ? "var(--peri)" : first.fill, ...SWATCHES])].map((c) => (
                <button
                  key={c}
                  role="radio"
                  aria-checked={fill === c}
                  aria-label={c.startsWith("var(") ? c.slice(6, -1) : "Its own colour"}
                  style={{ background: c }}
                  onClick={() => setFill(c)}
                />
              ))}
            </div>
            <button className={s.shareIcon} onClick={save} aria-label="Save image">
              <Download size={20} strokeWidth={2.5} />
            </button>
            {canShare && (
              <button className={`${s.shareIcon} ${s.shareIconMain}`} onClick={share} aria-label="Share">
                <Share2 size={20} strokeWidth={2.5} />
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
            <div className={s.sharePeek} style={{ "--fill": fill } as React.CSSProperties} aria-hidden>
              <small>todone.today/g/…</small>
              <b>{peek.title}</b>
              <span>
                <strong className="display">{peek.big}</strong> {peek.label}
              </span>
            </div>
          )}
          {/* Copy link; once shared, the same button stops sharing. */}
          {shared?.mode === "view" ? (
            <button className={`btn ${s.shareMain} ${s.shareStop}`} onClick={stop}>
              <X size={18} strokeWidth={2.75} aria-hidden /> Stop sharing
            </button>
          ) : (
            <button className={`btn ${s.shareMain}`} onClick={() => makeLink("view")}>
              <Link2 size={18} strokeWidth={2.5} aria-hidden /> Copy link
            </button>
          )}
          {shared?.mode === "challenge" ? (
            <button className={`btn ${s.shareAlt} ${s.shareStop}`} onClick={stop}>
              <X size={18} strokeWidth={2.75} aria-hidden /> Stop the challenge
            </button>
          ) : (
            <button className={`btn ${s.shareAlt}`} onClick={() => makeLink("challenge")}>
              <Swords size={18} strokeWidth={2.5} aria-hidden /> Challenge up to 5 friends
              {gated && <Diamond />}
            </button>
          )}
          {shared && (
            <p className={s.panelHint} role="status">
              <Check size={14} strokeWidth={3} aria-hidden />{" "}
              {shared.mode === "challenge" ? "Challenge link copied. Send it to your friends." : "Link copied. Paste it anywhere."}
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
