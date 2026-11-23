"use client";

// Speaking types: words show in the box as you talk, to read and send yourself. Two ways, the first that works:
// 1. The device's own speech recognition (the browser's SpeechRecognition): Apple's in Safari on a Mac, iPhone or
//    iPad, Google's in Chrome and on Android. Live, free, nothing goes through todone.
// 2. todone's transcriber (server actions/ai.ts, worker/), for browsers without it (Firefox): the recording goes up
//    in 2-second pieces, and the words so far come back every second or two.
import { useEffect, useRef, useState } from "react";
import { api } from "./api";

type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
const System = () =>
  typeof window === "undefined"
    ? undefined
    : ((
        window as unknown as {
          SpeechRecognition?: new () => Rec;
          webkitSpeechRecognition?: new () => Rec;
        }
      ).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => Rec }).webkitSpeechRecognition);

export const MAX_SECONDS = 300;

// `onWords(text)`: everything heard so far in this go (replace, don't append, each time).
export function useDictation(onWords: (text: string) => void) {
  const [on, setOn] = useState(false);
  const [err, setErr] = useState("");
  const [secs, setSecs] = useState(0);
  const say = useRef(onWords);
  useEffect(() => {
    say.current = onWords;
  });
  const end = useRef<() => void>(() => {});
  const gen = useRef(0); // each go; words still arriving for an earlier one are dropped

  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setSecs((x) => (x + 1 >= MAX_SECONDS ? (end.current(), x + 1) : x + 1)), 1000);
    return () => clearInterval(t);
  }, [on]);
  useEffect(() => () => end.current(), []); // closing the page mid-sentence stops the mic

  const viaSystem = (Sys: new () => Rec, emit: (t: string) => void) => {
    let wanted = true;
    let before = ""; // words from earlier rounds: the system stops after a pause, and starts again here
    let now = "";
    let r: Rec;
    const round = () => {
      r = new Sys();
      r.lang = navigator.language || "en-US";
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (e) => {
        now = Array.from(e.results, (x) => x[0].transcript).join("");
        emit(`${before}${before && now ? " " : ""}${now}`.trim());
      };
      r.onerror = (e) => {
        if (e.error === "no-speech" || e.error === "aborted") return;
        wanted = false;
        setErr(
          e.error === "not-allowed" || e.error === "service-not-allowed"
            ? "No microphone. Allow it for this site, or type instead."
            : "Couldn't hear that. Try again, or type instead.",
        );
      };
      r.onend = () => {
        before = `${before} ${now}`.trim();
        now = "";
        if (wanted) round();
        else setOn(false);
      };
      r.start();
    };
    round();
    end.current = () => {
      wanted = false;
      r.stop();
    };
  };

  const viaServer = async (emit: (t: string) => void) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const type = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find((t) =>
      MediaRecorder.isTypeSupported(t),
    );
    const r = new MediaRecorder(stream, {
      ...(type ? { mimeType: type } : {}),
      audioBitsPerSecond: 24_000,
    });
    const mime = (r.mimeType || "audio/webm").split(";")[0];
    let id: Promise<string> | null = null;
    let chain = Promise.resolve();
    let done = false;
    const put = (piece: Blob, final: boolean) =>
      (chain = chain.then(async () => {
        if (!id) {
          id = fetch("/api/ai/voice", {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "content-type": mime,
              "x-words-only": "1",
              "x-live": "1",
            },
            body: piece,
          }).then(async (x) => {
            const d = await x.json().catch(() => null);
            if (!x.ok) throw new Error(d?.error ?? "Couldn't send the recording.");
            return d.id as string;
          });
          await id;
          if (final)
            await fetch(`/api/ai/voice/${await id}/more`, {
              method: "POST",
              credentials: "same-origin",
              headers: { "x-final": "1" },
              body: new Blob(),
            });
          return;
        }
        await fetch(`/api/ai/voice/${await id}/more`, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "content-type": "application/octet-stream",
            ...(final ? { "x-final": "1" } : {}),
          },
          body: piece,
        });
      }));
    r.ondataavailable = (e) => {
      if (e.data.size || r.state === "inactive") void put(e.data, r.state === "inactive").catch(fail);
    };
    r.onstop = () => stream.getTracks().forEach((t) => t.stop());
    const fail = (e: unknown) => {
      done = true;
      setErr(e instanceof Error ? e.message : "Couldn't hear that. Try again, or type instead.");
      setOn(false);
    };
    // The words so far, until the last piece is in and turned into words.
    const watch = async () => {
      const jobId = await id!;
      for (;;) {
        if (done) return;
        const j = await api<{
          status: string;
          transcript?: string;
          error?: string;
        }>("GET", `/ai/jobs/${jobId}`);
        if (j.transcript) emit(j.transcript);
        if (j.status === "ready" || j.status === "failed") {
          if (j.status === "failed") setErr(j.error ?? "Couldn't hear that. Try again, or type instead.");
          api("DELETE", `/ai/jobs/${jobId}`).catch(() => {});
          return;
        }
        await new Promise((t) => setTimeout(t, 1200));
      }
    };
    r.start(2000);
    setTimeout(() => void chain.then(() => id && watch()).catch(fail), 2500);
    // Stopping ends the mic at once; the last words still arrive a moment later.
    end.current = () => {
      if (r.state === "recording") r.stop();
      setOn(false);
    };
  };

  const start = async () => {
    if (on) return;
    setErr("");
    setSecs(0);
    setOn(true);
    const g = ++gen.current;
    const emit = (t: string) => g === gen.current && say.current(t);
    emit("");
    const Sys = System();
    try {
      if (Sys) viaSystem(Sys, emit);
      else await viaServer(emit);
    } catch {
      setErr("No microphone. Allow it for this site, or type instead.");
      setOn(false);
    }
  };
  const stop = () => end.current();
  return { on, err, secs, start, stop };
}
