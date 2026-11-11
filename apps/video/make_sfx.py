#!/usr/bin/env python3
"""Placeholder sound effects for the onboarding video, synthesised so it renders without downloading anything.

Writes short WAVs into public/sfx/: pop, whoosh, ding, thud, chime, click. To use real sounds, replace these files
with recordings (e.g. from Pixabay or Mixkit) under the same names; nothing else changes.
Run: npm run video:sfx  (or python3 make_sfx.py)
"""
import math, os, random, struct, wave

RATE = 44100
OUT = os.path.join(os.path.dirname(__file__), "public", "sfx")
random.seed(7)


def write(name, samples):
    os.makedirs(OUT, exist_ok=True)
    peak = max(1e-9, max(abs(s) for s in samples))
    with wave.open(os.path.join(OUT, f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(s / peak * 0.85 * 32767)) for s in samples))


def env(i, n, attack=0.005, decay=6.0):
    t = i / RATE
    a = min(1.0, t / attack) if attack else 1.0
    return a * math.exp(-decay * t / (n / RATE))


def tone(freqs, secs, decay=6.0, attack=0.004, sweep=0.0):
    n = int(RATE * secs)
    out = []
    for i in range(n):
        t = i / RATE
        s = sum(math.sin(2 * math.pi * (f + sweep * t) * t) for f in freqs) / len(freqs)
        out.append(s * env(i, n, attack, decay))
    return out


def noise(secs, lo, hi, decay=4.0, attack=0.05):
    # Band-limited noise: a one-pole low- and high-pass, with the band gliding from lo to hi.
    n = int(RATE * secs)
    out, lp, hp, prev = [], 0.0, 0.0, 0.0
    for i in range(n):
        f = lo + (hi - lo) * (i / n)
        a = 1 - math.exp(-2 * math.pi * f / RATE)
        x = random.uniform(-1, 1)
        lp += a * (x - lp)
        hp = 0.97 * (hp + lp - prev)
        prev = lp
        out.append(hp * env(i, n, attack, decay))
    return out


write("pop", tone([520], 0.12, decay=8, sweep=900))
write("whoosh", noise(0.45, 300, 3000, decay=3, attack=0.18))
write("ding", tone([1320, 1980], 0.6, decay=5))
write("thud", tone([90, 60], 0.25, decay=7, sweep=-80))
write("chime", [a + b for a, b in zip(tone([784, 1175], 0.9, decay=4), [0.0] * 4410 + tone([1047, 1568], 0.8, decay=4))])
write("click", tone([2200], 0.03, decay=12, attack=0.0005))
print("sfx written to", OUT)
