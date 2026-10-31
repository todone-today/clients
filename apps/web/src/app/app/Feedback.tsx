"use client";

import { useRef, useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { Select } from "@/components/Select";
import { sendFeedback } from "./actions";
import s from "./app.module.css";

const MAX = 5000;

// "Send feedback": a bug, an idea or anything else, saved with the page it came from.
export function Feedback() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState("bug");
  const [body, setBody] = useState("");
  const [state, setState] = useState<"" | "sending" | "sent" | "failed">("");
  const close = () => {
    dialog.current?.close();
    if (state === "sent") setBody("");
    setState("");
  };

  return (
    <>
      <button className={s.ghost} onClick={() => dialog.current?.showModal()}>
        <MessageSquare size={16} strokeWidth={2.5} aria-hidden /> Send feedback
      </button>
      <dialog ref={dialog} className={s.aiDialog} aria-labelledby="fb-title" onClose={close}>
        <div className={s.aiHead}>
          <h2 id="fb-title" className="display">
            Feedback
          </h2>
          <button className={s.ghost} onClick={close} aria-label="Close">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
        {state === "sent" ? (
          <div className={s.feedback}>
            <p>Thanks for telling us.</p>
            <button className="btn" onClick={close}>
              Close
            </button>
          </div>
        ) : (
          <form
            className={s.feedback}
            onSubmit={async (e) => {
              e.preventDefault();
              setState("sending");
              try {
                await sendFeedback(kind, body, location.pathname + location.search);
                setState("sent");
              } catch {
                setState("failed");
              }
            }}
          >
            <Select
              label="What is it?"
              value={kind}
              options={[
                { value: "bug", label: "Something's broken" },
                { value: "idea", label: "An idea" },
                { value: "other", label: "Something else" },
              ]}
              onChange={setKind}
            />
            <textarea
              aria-label="Your feedback"
              rows={6}
              required
              maxLength={MAX}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={kind === "bug" ? "What happened, and what did you expect?" : "Tell us what you'd like to see."}
            />
            {state === "failed" && <p className={s.err}>Couldn&apos;t send it. Try again.</p>}
            <button
              className="btn"
              style={{ "--fill": "var(--lime)" } as React.CSSProperties}
              disabled={!body.trim() || state === "sending"}
            >
              {state === "sending" ? "Sending…" : "Send"}
            </button>
          </form>
        )}
      </dialog>
    </>
  );
}
