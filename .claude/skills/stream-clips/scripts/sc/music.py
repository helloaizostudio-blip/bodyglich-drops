"""Background beat for clips, synthesized from scratch (no samples, so no copyright claims).

Each clip gets its own beat: the style, key, tempo and pattern come from a seed, so two
channels posting clips at the same time never share an identical track.
"""
import hashlib
import random
import wave
from pathlib import Path

import numpy as np

SR = 44100
STYLES = ("trap", "lofi", "hype")
# natural minor scale steps
MINOR = (0, 2, 3, 5, 7, 8, 10)
PROGRESSIONS = ((0, 5, 3, 4), (0, 3, 5, 4), (0, 5, 6, 4), (0, 6, 5, 3))


def _freq(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def _env(n, attack, decay_rate):
    t = np.arange(n) / SR
    e = np.exp(-t * decay_rate)
    a = max(1, int(attack * SR))
    e[:a] *= np.linspace(0, 1, a)
    return e


def _kick(n, punch=1.0):
    t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 28)
    phase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(phase) * np.exp(-t * (7 / punch)) * 0.9


def _snare(n, rng, soft=False):
    t = np.arange(n) / SR
    noise = rng.uniform(-1, 1, n)
    noise = np.convolve(noise, [1, -0.6], "same")
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)
    return (noise * np.exp(-t * (22 if soft else 16)) * (0.35 if soft else 0.55) + tone * 0.3)


def _hat(n, rng, open_=False):
    t = np.arange(n) / SR
    noise = rng.uniform(-1, 1, n)
    noise = noise - np.convolve(noise, np.ones(4) / 4, "same")   # crude high-pass
    return noise * np.exp(-t * (14 if open_ else 70)) * 0.22


def _tone(midi, n, kind):
    t = np.arange(n) / SR
    f = _freq(midi)
    if kind == "808":
        return np.sin(2 * np.pi * f * t) * _env(n, 0.005, 1.6) * 0.75
    if kind == "pluck":
        w = np.sign(np.sin(2 * np.pi * f * t)) * 0.3 + np.sin(2 * np.pi * f * t) * 0.7
        return w * _env(n, 0.003, 9) * 0.22
    if kind == "pad":
        w = sum(np.sin(2 * np.pi * f * d * t) for d in (0.996, 1.0, 1.004)) / 3
        e = np.minimum(1, t / 0.25) * np.minimum(1, (t[-1] - t + 1e-3) / 0.3)
        return w * e * 0.12
    if kind == "bass":
        w = 2 * ((f * t) % 1) - 1
        w = np.convolve(w, np.ones(24) / 24, "same")
        return w * _env(n, 0.005, 3) * 0.45
    raise ValueError(kind)


def _add(buf, sig, at):
    at = int(at)
    if at >= len(buf):
        return
    end = min(len(buf), at + len(sig))
    buf[at:end] += sig[: end - at]


def beat(seconds, seed=None, style=None):
    """Return a mono float32 array of `seconds` of music."""
    if seed is not None and not isinstance(seed, int):
        seed = int(hashlib.sha1(str(seed).encode()).hexdigest()[:12], 16)
    rng = np.random.default_rng(seed)
    r = random.Random(seed)
    style = style or r.choice(STYLES)
    bpm = {"trap": r.choice((140, 145, 150)), "lofi": r.choice((80, 85, 90)),
           "hype": r.choice((122, 126, 128))}[style]
    root = 36 + r.randrange(12)                      # C2..B2
    prog = r.choice(PROGRESSIONS)
    step = 60 / bpm / 4                              # 16th note, seconds
    bar = step * 16
    n_total = int((seconds + bar) * SR)
    drums = np.zeros(n_total)
    music = np.zeros(n_total)
    s = int(step * SR)

    def deg(d, octave=0):
        return root + MINOR[d % 7] + 12 * (octave + d // 7)

    if style == "trap":
        kicks = r.choice(([0, 10], [0, 7, 10], [0, 3, 10]))
    elif style == "lofi":
        kicks = r.choice(([0, 9], [0, 7, 10]))
    else:
        kicks = [0, 4, 8, 12]
    melody = [r.choice((0, 2, 4, 4, 7, 6, None, None)) for _ in range(16)]

    bars = int(np.ceil(seconds / bar)) + 1
    for b in range(bars):
        t0 = b * bar * SR
        chord = prog[b % 4]
        for i in range(16):
            at = t0 + i * s
            if i in kicks:
                _add(drums, _kick(int(0.45 * SR), 1.4 if style == "trap" else 1.0), at)
            if i in (4, 12):
                _add(drums, _snare(int(0.3 * SR), rng, soft=style == "lofi"), at)
            if style == "trap":
                if i % 2 == 0 or (b % 2 == 1 and i >= 12):
                    _add(drums, _hat(int(0.08 * SR), rng), at)
                    if b % 2 == 1 and i >= 12:            # hi-hat roll
                        _add(drums, _hat(int(0.05 * SR), rng) * 0.7, at + s / 2)
            elif style == "lofi":
                if i % 2 == 0:
                    _add(drums, _hat(int(0.08 * SR), rng) * (0.8 if i % 4 else 1), at + (s * 0.12 if i % 4 else 0))
            else:
                if i % 4 == 2:
                    _add(drums, _hat(int(0.25 * SR), rng, open_=True), at)
                elif i % 2 == 0:
                    _add(drums, _hat(int(0.06 * SR), rng), at)
        # harmony
        if style == "trap":
            _add(music, _tone(deg(chord), int(bar * SR * 0.95), "808"), t0)
            for i, m in enumerate(melody):
                if m is not None and i % 2 == 0:
                    _add(music, _tone(deg(chord + m, 3), int(step * 2 * SR), "pluck"), t0 + i * s)
        elif style == "lofi":
            for d in (0, 2, 4, 6):
                _add(music, _tone(deg(chord + d, 2), int(bar * SR), "pad") * 1.3, t0)
            _add(music, _tone(deg(chord, 1), int(bar * SR * 0.5), "bass"), t0)
            _add(music, _tone(deg(chord, 1), int(bar * SR * 0.4), "bass"), t0 + 10 * s)
        else:
            for i in range(16):
                if i % 4 == 2:
                    _add(music, _tone(deg(chord, 1), int(step * 2 * SR), "bass"), t0 + i * s)
            for d in (0, 2, 4):
                _add(music, _tone(deg(chord + d, 2), int(bar * SR), "pad"), t0)
            for i, m in enumerate(melody):
                if m is not None and i % 4 in (0, 3):
                    _add(music, _tone(deg(chord + m, 3), int(step * SR), "pluck"), t0 + i * s)

    out = drums * 0.9 + np.tanh(music * 1.2)
    out = out[: int(seconds * SR)]
    fade = int(min(1.0, seconds / 4) * SR)
    out[-fade:] *= np.linspace(1, 0, fade)
    out[: int(0.05 * SR)] *= np.linspace(0, 1, int(0.05 * SR))
    # same loudness for every style: fixed RMS, soft-clipped peaks
    out *= 0.18 / max(1e-6, np.sqrt(np.mean(out ** 2)))
    out = np.tanh(out * 1.1) * 0.95
    return out.astype(np.float32), style, bpm


def write(path, seconds, seed=None, style=None):
    """Write a 16-bit mono WAV; returns (path, style, bpm)."""
    data, style, bpm = beat(seconds, seed, style)
    path = Path(path)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((data * 32767).astype("<i2").tobytes())
    return path, style, bpm


def mix_filter(voice_label, music_label, volume_db, out_label="aud"):
    """ffmpeg filter that lays the beat under the stream audio and ducks it while people talk."""
    return (f"[{music_label}]aresample=48000,aformat=channel_layouts=stereo,volume={volume_db}dB[bgm];"
            f"[{voice_label}]asplit=2[vmain][vkey];"
            f"[bgm][vkey]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[bgduck];"
            f"[vmain][bgduck]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[{out_label}]")
