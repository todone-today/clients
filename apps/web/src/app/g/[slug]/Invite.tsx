"use client";

import { INVITE } from "@/app/app/goalLinks";
import s from "./goal.module.css";
import { APP } from "@/lib/urls";

// The one way in: join the challenge, or make a goal like this one. It leads into the app, through sign-up if need
// be (the link survives it); the goal is also remembered in this browser in case sign-up loses the way.
export function Invite({ slug, challenge, full, owner }: { slug: string; challenge: boolean; full: boolean; owner: string }) {
  const go = (what: "join" | "clone") => {
    try {
      localStorage.setItem(INVITE, JSON.stringify({ slug, what, at: Date.now() }));
    } catch {}
    // new=1: without an account, sign-in opens on "Make an account".
    location.assign(`${APP}/?goal=${encodeURIComponent(slug)}&do=${what}&new=1`);
  };
  const open = challenge && !full;
  return (
    <div className={s.invite}>
      {open && (
        <button className={`btn ${s.cta}`} onClick={() => go("join")}>
          Join {owner}&apos;s challenge, free
        </button>
      )}
      <button className={open ? `btn ${s.second}` : `btn ${s.cta}`} onClick={() => go("clone")}>
        {open ? "Just copy the goal" : "Make a goal like this, free"}
      </button>
      {full && <p className={s.fine}>This challenge is full (6 people). You can still do it on your own.</p>}
    </div>
  );
}
