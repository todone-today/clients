"use client";

// A paper-into-the-bin sound, made on the fly (no audio file): a crumpling rustle, then a soft thud.
let ctx: AudioContext | null = null;

export function binSound() {
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 0.35;
    out.connect(ctx.destination);

    // Crumple: bursts of noise through a band-pass sweeping down.
    const len = 0.28;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.3 ? 1 : 0.25);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 1.2;
    band.frequency.setValueAtTime(3200, t);
    band.frequency.exponentialRampToValueAtTime(700, t + len);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.9, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + len);
    noise.connect(band).connect(nGain).connect(out);
    noise.start(t);

    // Thud: a quick low drop as it lands.
    const thud = ctx.createOscillator();
    thud.type = "sine";
    thud.frequency.setValueAtTime(160, t + 0.2);
    thud.frequency.exponentialRampToValueAtTime(55, t + 0.36);
    const tGain = ctx.createGain();
    tGain.gain.setValueAtTime(0.0001, t);
    tGain.gain.setValueAtTime(0.8, t + 0.2);
    tGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    thud.connect(tGain).connect(out);
    thud.start(t + 0.2);
    thud.stop(t + 0.4);
  } catch {
    // No audio here (or blocked): deleting still works, just silently.
  }
}
