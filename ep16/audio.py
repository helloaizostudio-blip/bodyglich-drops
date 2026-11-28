"""Episode 16 "The Stinky Stone": the user's track ("Numbers", supplied by the user, kept out of git under
ep16/assets/) looped under the whole video, plus comedy SFX: whooshes on cuts, crowd laughs, record scratches,
heart pops, rain, the magic stone and the world-flip boom.
"""
import os, sys, subprocess
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'sample'))
import audio_sample as A
from audio_sample import SR, t_, env, noise, lp_fast, hp_fast, whoosh, riser, shimmer
import importlib.util
def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
E7 = _load('ep7audio', os.path.join(HERE, '..', 'ep07', 'audio.py'))
rng = np.random.default_rng(116)
SONG = os.path.join(HERE, 'assets', 'numbers_temporex.mp3')
SONG_GAIN = 0.55          # louder than a normal bed (the user asked for more); the mixer still ducks it under the voice


def song(total):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', SONG, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).astype(np.float64); x = x / (np.abs(x).max() + 1e-9)
    n, xf = int(total * SR), int(1.5 * SR); outp = np.zeros(n + len(x)); pos = 0
    while pos < n:   # loop with a 1.5 s crossfade
        seg = x.copy()
        if pos > 0: seg[:xf] *= np.linspace(0, 1, xf); outp[pos:pos + xf] *= np.linspace(1, 0, xf)[:len(outp[pos:pos + xf])]
        outp[pos:pos + len(seg)] += seg; pos += len(seg) - xf
    y = outp[:n]; f = int(0.4 * SR); y[:f] *= np.linspace(0, 1, f); g = int(1.6 * SR); y[-g:] *= np.linspace(1, 0, g); return y
def scratch(d=0.45):
    t = t_(d); f = 900 + 700 * np.sin(2 * np.pi * 9 * t); return hp_fast(noise(d), 1200) * 0.4 * env(len(t), 0.01, 0.1) + np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25 * np.exp(-t * 5)
def pop():
    t = t_(0.18); return np.sin(2 * np.pi * np.cumsum(500 + 900 * t / 0.18) / SR) * np.exp(-t * 22)
def laughs(d, n=7):
    x = np.zeros(int(d * SR))
    for k in range(n):
        f0 = rng.uniform(180, 320); t0 = rng.uniform(0, max(0.01, d - 0.6)); dd = rng.uniform(0.5, 0.9); t = t_(dd)
        burst = (np.sin(2 * np.pi * 6.5 * t) > 0) * 1.0; v = (np.sin(2 * np.pi * f0 * t) + 0.5 * np.sin(4 * np.pi * f0 * t)) * burst * env(len(t), 0.02, 0.2)
        v = lp_fast(v + hp_fast(noise(dd), 1500) * 0.15 * burst, 2800); a = int(t0 * SR); x[a:a + len(v)] += v[:len(x) - a] * rng.uniform(0.4, 0.8)
    return x
def rain(d):
    t = t_(d); return lp_fast(hp_fast(noise(d), 1200), 6000) * 0.35 * env(len(t), 0.3, 0.3)
def boom(d=2.2):
    t = t_(d); return (np.sin(2 * np.pi * np.cumsum(55 * np.exp(-t * 2) + 26) / SR) * 1.4 + lp_fast(noise(d), 500) * 0.9) * np.exp(-t * 2.2)
def ding():
    t = t_(1.2); return (np.sin(2 * np.pi * 1318.5 * t) + 0.4 * np.sin(2 * np.pi * 2637 * t)) * np.exp(-t * 4) * 0.5


def flush(d=1.6):
    t = t_(d); return lp_fast(hp_fast(noise(d), 200), 3000) * env(len(t), 0.05, 0.8) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t))
def buzz(d=0.6):
    t = t_(d); return np.sign(np.sin(2 * np.pi * (190 + 25 * np.sin(2 * np.pi * 9 * t)) * t)) * 0.2 * env(len(t), 0.02, 0.05)
def kaching():
    t = t_(0.7); return (np.sin(2 * np.pi * 2093 * t) + np.sin(2 * np.pi * 2637 * t) * 0.8) * np.exp(-t * 7) * 0.5 + hp_fast(noise(0.7), 4000) * 0.2 * np.exp(-t * 30)
def squelch():
    t = t_(0.35); return lp_fast(noise(0.35), 900) * np.exp(-t * 9) * (1 + np.sin(2 * np.pi * 30 * t)) * 0.6


def build(m, tl):
    shots = tl['shots']; total = tl['dur']
    def shot(n): return next(x for x in shots if x['name'] == n)
    m.put(song(total), 0.0, SONG_GAIN, bus='music')
    for s in shots[1:]:
        m.put(whoosh(0.22), s['s'] - 0.08, 0.06, pan=rng.uniform(-0.3, 0.3))
    sh = shot('bullies_point'); m.put(laughs(sh['e'] - sh['s'] + 0.4), sh['s'], 0.4)
    for n, off in (('tobi_heart', 0.3), ('tobi_shrug', 0.0)):
        sh = shot(n); m.put(pop(), sh['s'] + off * (sh['e'] - sh['s']), 0.5)
    m.put(scratch(), shot('flashback_stone')['s'], 0.35); m.put(boom(1.4), shot('flashback_wave')['s'], 0.5)
    r0 = shot('search_puddle')['s']; m.put(rain(shot('toilet_glow')['s'] - r0), r0, 0.45)
    m.put(flush(), shot('toilet_glow')['s'], 0.5); m.put(shimmer(1.2), shot('toilet_glow')['s'] + 0.2, 0.35)
    m.put(E7.hit(1.4), shot('zash_horror')['s'], 0.45)
    m.put(squelch(), shot('fish_out')['s'] + 0.5, 0.6)
    fd = shot('fly_dies')['s']; m.put(buzz(0.6), fd, 0.5); m.put(pop()[::-1].copy(), fd + 0.6, 0.4)
    m.put(squelch(), shot('stone_tray')['s'] + 0.3, 0.6)
    m.put(E7.hit(1.2), shot('zash_rage')['s'], 0.35)
    m.put(riser(shot('wish_flash')['e'] - shot('tobi_grabs')['s']), shot('tobi_grabs')['s'], 0.35, bus='music')
    m.put(boom(), shot('hall_shops')['s'] - 0.05, 0.8); m.put(scratch(), shot('hall_shops')['s'], 0.45)
    for n, off in (('hall_shops', 0.7), ('brick_lemonade', 0.3), ('shop_cuts', 0.05), ('shop_cuts', 0.55)):
        sh = shot(n); m.put(kaching(), sh['s'] + off * (sh['e'] - sh['s'] if n == 'shop_cuts' else 1), 0.35)
    m.put(pop(), shot('two_straws')['s'] + 0.2, 0.4)
    m.put(shimmer(1.6), shot('brick_stone')['s'], 0.45); m.put(E7.hit(2.0), shot('brick_stone')['s'] + 0.2, 0.5)
    m.put(ding(), shot('end_card')['s'] + 0.1, 0.3)


def mix(tl_path, voice_path, out_path):
    A.build_score = lambda m, tl: build(m, tl)
    A.build_sfx = lambda m, tl: None
    A.mix(tl_path, voice_path, out_path)
