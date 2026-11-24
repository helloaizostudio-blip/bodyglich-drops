"""Meme-style sound effects, synthesized from scratch (no samples, so no copyright claims).

Names the picker can use (put them in a pick's "sfx" list as {"t": seconds_from_clip_start, "sound": name}):
  boom       deep "vine boom" hit: punchline, shocked face, something absurd
  scratch    record scratch: "wait, what?", sudden stop, plan falls apart
  airhorn    hype: big win, crazy skill, celebration
  whoosh     fast swish: quick move, transition, something flies past
  ding       bright bell: correct, "aha", idea, money
  bonk       cartoon hit: someone gets hit, falls, crashes
  boing      cartoon spring: jump, bounce, silly physics
  dundun     dramatic "dun dun DUN": reveal, betrayal, plot twist
  sadtrombone wah-wah-wah: fail, loss, disappointment
  riser      rising tension before a reveal (place it ~1.5 s before the moment)
"""
import wave
from pathlib import Path

import numpy as np

SR = 44100


def _t(sec):
    return np.arange(int(sec * SR)) / SR


def _reverb(x, room=0.35, length=0.6):
    n = int(length * SR)
    rng = np.random.default_rng(7)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * (6 / length))
    ir[0] = 1 / room
    y = np.convolve(x, ir)[: len(x) + n] * room
    return y / max(1e-6, np.abs(y).max()) * np.abs(x).max()


def boom():
    t = _t(1.6)
    f = 38 + 70 * np.exp(-t * 9)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2)
    x += 0.4 * np.tanh(3 * x)                                       # grit
    click = np.random.default_rng(1).standard_normal(len(t)) * np.exp(-t * 90) * 0.4
    return _reverb(x + click, 0.5, 1.0)


def scratch():
    t = _t(0.55)
    rng = np.random.default_rng(2)
    noise = rng.standard_normal(len(t))
    # a pitch that sweeps up then down, like a record dragged back and forth
    f = 300 + 1600 * np.abs(np.sin(2 * np.pi * 2.2 * t))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR)
    x = (noise * 0.5 + tone) * np.sin(np.pi * t / t[-1]) ** 0.5
    return np.convolve(x, np.ones(6) / 6, "same")


def airhorn():
    t = _t(1.3)
    x = np.zeros(len(t))
    for i, base in enumerate((466, 470, 554)):
        ph = 2 * np.pi * base * t
        x += np.sign(np.sin(ph)) * 0.25 + np.sin(2 * ph) * 0.1
    gate = ((t % 0.32) < 0.24).astype(float) if False else np.ones(len(t))
    env = np.minimum(1, t / 0.02) * np.minimum(1, (t[-1] - t) / 0.15)
    # three blasts: short, short, long
    blasts = ((t < 0.18) | ((t > 0.24) & (t < 0.42)) | (t > 0.5)).astype(float)
    blasts = np.convolve(blasts, np.ones(200) / 200, "same")
    return np.tanh(2 * x * env * blasts * gate) * 0.8


def whoosh():
    t = _t(0.6)
    rng = np.random.default_rng(3)
    noise = rng.standard_normal(len(t))
    env = np.sin(np.pi * (t / t[-1]) ** 0.7) ** 2
    # band-pass sweep: smooth with a window that shrinks over time (low to high)
    out = np.zeros(len(t))
    for k, w in enumerate((40, 24, 14, 8, 5)):
        seg = slice(k * len(t) // 5, (k + 1) * len(t) // 5)
        lp = np.convolve(noise, np.ones(w) / w, "same")
        out[seg] = (lp - np.convolve(lp, np.ones(w * 4) / (w * 4), "same"))[seg]
    return out * env * 3


def ding():
    t = _t(1.4)
    x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * d)
            for f, a, d in ((1568, 1, 3), (3136, 0.4, 5), (4704, 0.2, 8), (2350, 0.25, 4)))
    return x * np.minimum(1, t / 0.002)


def bonk():
    t = _t(0.35)
    f = 520 * np.exp(-t * 6) + 180
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)
    wood = np.sin(2 * np.pi * 1250 * t) * np.exp(-t * 60) * 0.6
    return x + wood


def boing():
    t = _t(0.8)
    f = 220 + 160 * np.sin(2 * np.pi * 9 * t) * np.exp(-t * 3) + 120 * t
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3) * np.minimum(1, t / 0.005)


def _brass(freq, sec, bend=0.0):
    t = _t(sec)
    f = freq * (1 + bend * t / sec)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.5 * t)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    x = sum(np.sin(k * ph) / k ** 1.1 for k in range(1, 9))
    env = np.minimum(1, t / 0.04) * np.minimum(1, (t[-1] - t) / 0.08)
    return np.tanh(1.5 * x * env)


def dundun():
    parts = [_brass(98, 0.32), np.zeros(int(0.12 * SR)), _brass(92.5, 0.32),
             np.zeros(int(0.12 * SR)), _brass(87.3, 1.3)]
    x = np.concatenate(parts)
    hit = boom()[: len(x)] * 0.6
    start = int(0.88 * SR)
    pad = np.zeros(len(x))
    pad[start:] = hit[: len(x) - start]
    return _reverb(x * 0.8 + pad, 0.4, 0.9)


def sadtrombone():
    notes = [(_brass(233, 0.45), 0.08), (_brass(220, 0.45), 0.08), (_brass(208, 0.45), 0.08)]
    parts = []
    for n, gap in notes:
        parts += [n, np.zeros(int(gap * SR))]
    parts.append(_brass(196, 1.2, bend=-0.04) * (1 + 0.3 * np.sin(2 * np.pi * 6 * _t(1.2))))
    return np.concatenate(parts) * 0.8


def riser():
    t = _t(1.6)
    rng = np.random.default_rng(4)
    noise = rng.standard_normal(len(t))
    f = 200 * 2 ** (t * 2.2)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5
    env = (t / t[-1]) ** 2
    hp = noise - np.convolve(noise, np.ones(10) / 10, "same")
    return (tone + hp * 0.6) * env


SOUNDS = {"boom": boom, "scratch": scratch, "airhorn": airhorn, "whoosh": whoosh, "ding": ding,
          "bonk": bonk, "boing": boing, "dundun": dundun, "sadtrombone": sadtrombone, "riser": riser}
# relative loudness of each effect in the mix (dB)
GAIN = {"boom": -4, "scratch": -8, "airhorn": -12, "whoosh": -10, "ding": -12, "bonk": -8,
        "boing": -10, "dundun": -6, "sadtrombone": -8, "riser": -12}


def track(cues, seconds):
    """Mono float32 track of `seconds` with each {"t", "sound"} cue placed."""
    out = np.zeros(int((seconds + 3) * SR))
    for c in cues or []:
        name = str(c.get("sound", "")).lower().replace(" ", "").replace("_", "")
        if name not in SOUNDS:
            continue
        t = float(c.get("t", 0))
        if name == "riser":
            t -= 1.5
        x = SOUNDS[name]()
        x = x / max(1e-6, np.abs(x).max()) * 10 ** (GAIN[name] / 20)
        at = max(0, int(t * SR))
        end = min(len(out), at + len(x))
        out[at:end] += x[: end - at]
    out = out[: int(seconds * SR)]
    return np.clip(out, -1, 1).astype(np.float32)


def write(path, cues, seconds):
    data = track(cues, seconds)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((data * 32767).astype("<i2").tobytes())
    return Path(path)
