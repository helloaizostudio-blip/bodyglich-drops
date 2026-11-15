"""Episode 12 "The Cursed Grimoire": score + SFX (synthesized, original).

One continuous, mild music bed runs under the whole video (no noise / rain beds): a warm pad and a soft plucked
arpeggio over a four-chord loop (Am F C G, 100 bpm) with a quiet bass. It never stops; it only changes colour:
lighter for the village and training, a low drum pulse and staccato strings once the portal opens, and a choir
lift when the katana rises. SFX sit on top: whooshes on cuts, fire, lightning, impacts, the slash.
"""
import os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'sample'))
import audio_sample as A
from audio_sample import SR, t_, env, noise, lp_fast, hp_fast, whoosh, riser, shimmer
import importlib.util
def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
E2 = _load('ep2audio', os.path.join(HERE, '..', 'ep02', 'audio.py'))
E7 = _load('ep7audio', os.path.join(HERE, '..', 'ep07', 'audio.py'))
rng = np.random.default_rng(112)

BPM = 100.0; BEAT = 60 / BPM; BAR = BEAT * 4
A2, C3, D3, E3, F2, G2, B2 = 110.0, 130.81, 146.83, 164.81, 87.31, 98.0, 123.47
PROG = [(A2, [A2 * 2, C3 * 2, E3 * 2]), (F2, [F2 * 2, A2 * 2, C3 * 2]), (C3 / 2 * 1, [C3, E3, G2 * 2]), (G2, [G2 * 2, B2 * 2, D3 * 2])]


def fade(x, a=0.02, r=0.05):
    n = len(x); e = np.ones(n); na, nr = min(n // 2, int(a * SR)), min(n // 2, int(r * SR))
    e[:na] = np.linspace(0, 1, na); e[n - nr:] = np.linspace(1, 0, nr); return x * e
def pad_chord(notes, d, bright):
    t = t_(d); x = np.zeros(len(t))
    for f in notes:
        for det in (-0.004, 0.0, 0.004):
            ph = 2 * np.pi * f * (1 + det) * t
            x += np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)
    return fade(lp_fast(x, bright) / (len(notes) * 3), 0.5, 0.6)
def pluck(f, d=0.55):
    t = t_(d); return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t) * np.exp(-t * 9)) * np.exp(-t * 6.5) * np.minimum(1, t * 400)
def bass(f, d):
    t = t_(d); return fade((np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)), 0.03, 0.2)
def taiko(g=1.0):
    t = t_(0.5); return (np.sin(2 * np.pi * np.cumsum(48 + 40 * np.exp(-t * 30)) / SR) * np.exp(-t * 9) + lp_fast(noise(0.5), 300) * 0.3 * np.exp(-t * 20)) * g
def stab(notes, d=0.16):
    t = t_(d); x = sum(2 * (f * t % 1) - 1 for f in notes) / len(notes); return lp_fast(x, 2600) * np.exp(-t * 16) * np.minimum(1, t * 300)


def bed(total, night_t, sword_t):
    """The continuous bed: returns (soft_layer, drive_layer)."""
    n = int(total * SR) + SR; soft = np.zeros(n); drive = np.zeros(n)
    def add(buf, x, at, g):
        a = int(at * SR)
        if a >= n: return
        x = x[:n - a]; buf[a:a + len(x)] += x * g
    bars = int(total / BAR) + 2
    for b in range(bars):
        t0 = b * BAR; root, ch = PROG[b % 4]; dark = t0 >= night_t - 0.5; big = t0 >= sword_t - 0.5
        add(soft, pad_chord(ch, BAR + 0.7, 900 if dark else 1500), t0, 0.5)
        add(soft, bass(root / (2 if dark else 1), BAR), t0, 0.32)
        arp = [ch[0], ch[1], ch[2], ch[1] * 2, ch[2], ch[1], ch[0] * 2, ch[1]]
        for i, f in enumerate(arp):
            add(soft, pluck(f * (1 if dark else 2)), t0 + i * BEAT / 2, 0.16 if i % 2 else 0.22)
        if dark:
            for i in (0, 1.5, 2, 3, 3.5):
                add(drive, taiko(1.0 if i in (0, 2) else 0.6), t0 + i * BEAT, 0.5)
            for i in range(8):
                add(drive, stab([ch[0] * 2, ch[2] * 2]), t0 + i * BEAT / 2, 0.13 if i % 2 else 0.2)
        if big:
            add(drive, E2.choir([ch[0] * 2, ch[1] * 2, ch[2] * 2], BAR + 0.4, 0.8), t0, 0.3)
    return soft[:int(total * SR)], drive[:int(total * SR)]


def fire_whoosh(d=1.0):
    t = t_(d); return lp_fast(noise(d), 1800) * np.sin(np.pi * np.minimum(1, t / d)) ** 1.5 * (0.7 + 0.3 * np.sin(2 * np.pi * 14 * t))
def zap(d=0.5):
    t = t_(d); return hp_fast(noise(d), 2500) * (np.sin(2 * np.pi * 60 * t) > 0.2) * np.exp(-t * 6) * 0.8
def boom(d=1.8):
    t = t_(d); return (np.sin(2 * np.pi * np.cumsum(60 * np.exp(-t * 2) + 28) / SR) * 1.4 + lp_fast(noise(d), 600) * 0.9) * np.exp(-t * 2.4)
def slash(d=0.45):
    t = t_(d); return hp_fast(noise(d), 3500) * np.exp(-((t - 0.12) / 0.07) ** 2) + np.sin(2 * np.pi * np.cumsum(3200 * np.exp(-t * 5) + 900) / SR) * 0.25 * np.exp(-t * 9)
def hum(d):
    t = t_(d); return fade((np.sin(2 * np.pi * 73.4 * t) + 0.5 * np.sin(2 * np.pi * 110.3 * t)) * (0.7 + 0.3 * np.sin(2 * np.pi * 5 * t)) * np.minimum(1, t / d * 1.5), 0.2, 0.3)
def thud():
    t = t_(0.4); return np.sin(2 * np.pi * np.cumsum(70 * np.exp(-t * 12) + 35) / SR) * np.exp(-t * 11)


def build(m, tl):
    shots = tl['shots']; total = tl['dur']
    def shot(n): return next(x for x in shots if x['name'] == n)
    night_t, sword_t = shot('portal_open')['s'], shot('katana_rises')['s']
    # ---- the constant bed (cold open also plays the darker colour, then it lightens for the village)
    soft, drive = bed(total, night_t, sword_t)
    m.put(soft, 0.0, 0.85, bus='music')
    m.put(drive, 0.0, 0.8, bus='music')
    cold_e = shot('cold_zash')['e']
    m.put(fade(bed(cold_e, 0.0, 99)[1], 0.05, 0.6), 0.0, 0.7, bus='music')
    m.put(riser(1.6), sword_t - 1.6, 0.35, bus='music')
    m.put(E2.choir([A2 * 2, C3 * 2, E3 * 2], total - shot('aftermath')['s'] - 0.3, 0.9), shot('aftermath')['s'], 0.35, bus='music')
    # ---- SFX
    for s in shots[1:]:
        m.put(whoosh(0.26), s['s'] - 0.1, 0.08, pan=rng.uniform(-0.3, 0.3))
    m.put(E7.hit(2.0), 0.0, 0.6); m.put(fire_whoosh(2.6), 0.2, 0.5)
    m.put(E7.sting(), shot('cold_zash')['s'], 0.35)
    for k in range(3): m.put(zap(0.25), shot('bully_blast')['s'] + 0.3 + k * 0.55, 0.35, pan=0.3)
    for n in ('train_pushups', 'train_boulder', 'train_buff'): m.put(thud(), shot(n)['s'] + 0.02, 0.6)
    m.put(shimmer(1.4), shot('books_float')['s'], 0.4)
    m.put(fire_whoosh(0.9), shot('book_fire')['s'] + 0.4, 0.5)
    m.put(zap(0.7), shot('book_storm')['s'] + 0.6, 0.6); m.put(E7.hit(1.4), shot('book_storm')['s'] + 0.6, 0.45)
    m.put(shimmer(1.2), shot('kai_blessed')['s'], 0.4)
    m.put(E7.hit(2.2), shot('black_sun')['s'], 0.7)
    m.put(boom(2.2), night_t, 0.9); m.put(fire_whoosh(1.4), night_t, 0.6)
    for k in range(3): m.put(thud(), shot('knight_reveal')['s'] + 0.2 + k * 0.42, 0.7)
    for k in range(4): m.put(zap(0.4), shot('kai_attacks')['s'] + 0.1 + k * 0.4, 0.5, pan=-0.3)
    m.put(fire_whoosh(0.7), shot('kai_falls')['s'], 0.7); m.put(boom(1.2), shot('kai_falls')['s'] + 0.05, 0.7)
    m.put(boom(1.2), shot('zash_thrown')['s'], 0.8)
    m.put(fire_whoosh(1.8), shot('knight_mom')['s'], 0.5)
    bs = shot('book_shakes'); m.put(hum(bs['e'] - bs['s'] + 0.3), bs['s'], 0.6)
    m.put(shimmer(2.0), sword_t + 0.3, 0.5); m.put(E7.hit(2.6), sword_t + 0.3, 0.8)
    m.put(boom(1.4), shot('zash_lifts')['s'] + 0.25, 0.7)
    m.put(fire_whoosh(1.7), shot('fire_blast')['s'], 0.8)
    m.put(slash(), shot('deflect')['s'], 0.7); m.put(boom(1.8), shot('deflect')['s'] + 0.45, 0.9)
    m.put(slash(), shot('one_swing')['s'] + 0.15, 0.9); m.put(E7.hit(2.4), shot('one_swing')['s'] + 0.25, 0.8)
    m.put(hum(shot('awake')['e'] - shot('sun_glow')['s']), shot('sun_glow')['s'], 0.5)
    m.put(E7.hit(3.0), shot('awake')['s'] + 0.5, 0.9); m.put(E7.sting(), shot('awake')['s'] + 0.55, 0.5)
    for k in range(3): m.put(slash(0.3), shot('pages_flip')['s'] + 0.2 + k * 0.35, 0.3)
    m.put(boom(1.4), shot('night_village')['e'] - 0.4, 0.5)


def mix(tl_path, voice_path, out_path):
    A.build_score = lambda m, tl: build(m, tl)
    A.build_sfx = lambda m, tl: None
    A.mix(tl_path, voice_path, out_path)
