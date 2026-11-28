"""Episode 15 "The Odd One Out": the user's track ("Numbers", supplied by the user, kept out of git under
ep15/assets/) looped under the whole video, plus comedy SFX: whooshes on cuts, crowd laughs, record scratches,
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
rng = np.random.default_rng(115)
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


def build(m, tl):
    shots = tl['shots']; total = tl['dur']
    def shot(n): return next(x for x in shots if x['name'] == n)
    m.put(song(total), 0.0, SONG_GAIN, bus='music')
    for s in shots[1:]:
        m.put(whoosh(0.22), s['s'] - 0.08, 0.06, pan=rng.uniform(-0.3, 0.3))
    for n in ('bullies_point', 'bullies_again'):
        sh = shot(n); m.put(laughs(sh['e'] - sh['s'] + 0.4), sh['s'], 0.35)
    m.put(scratch(), shot('heart_pop_guy')['s'] + 0.5, 0.45); m.put(scratch(), shot('zash_zoom')['s'], 0.4)
    m.put(E7.hit(1.6), shot('zash_zoom')['s'] + 0.05, 0.4)
    for n, off in (('heart_pop_guy', 0.6), ('mia_heart', 0.0), ('tobi_alone', 0.75)):
        sh = shot(n); m.put(pop(), sh['s'] + off * (sh['e'] - sh['s'] if n == 'tobi_alone' else 1), 0.5)
    r0 = shot('rain_stone')['s']; m.put(rain(shot('shockwave')['s'] - r0 + 0.4), r0, 0.5)
    r1 = shot('puddle_dig')['s']; m.put(rain(shot('mia_heart')['s'] - r1), r1, 0.5)
    m.put(shimmer(1.6), shot('stone_glow')['s'], 0.45); m.put(riser(1.2), shot('stone_glow')['s'] + 0.2, 0.3, bus='music')
    m.put(boom(), shot('shockwave')['s'], 0.85); m.put(E7.hit(2.0), shot('shockwave')['s'], 0.6)
    m.put(shimmer(1.2), shot('stone2_flash')['s'] + 0.3, 0.45); m.put(E7.hit(1.4), shot('stone2_flash')['s'] + 0.9, 0.45)
    m.put(E7.hit(1.2), shot('zash_scream')['s'], 0.4)
    m.put(ding(), shot('freeze_tag')['s'] + 0.1, 0.35)


def mix(tl_path, voice_path, out_path):
    A.build_score = lambda m, tl: build(m, tl)
    A.build_sfx = lambda m, tl: None
    A.mix(tl_path, voice_path, out_path)
