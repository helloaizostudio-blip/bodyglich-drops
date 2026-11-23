"""Episode 21 "Everyone's Playing": the user's track ("Numbers", supplied by the user, kept out of git under
ep21/assets/) looped under the whole video, plus comedy SFX: whooshes on cuts, crowd laughs, record scratches,
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
E10 = _load('ep10audio', os.path.join(HERE, '..', 'ep10', 'audio.py'))
rng = np.random.default_rng(121)
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


def wind(d):
    t = t_(d); return lp_fast(noise(d), 700) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.4 * t)) * env(len(t), 0.4, 0.6) * 0.8
def slamdoor():
    t = t_(0.35); return (np.sin(2 * np.pi * np.cumsum(110 * np.exp(-t * 20) + 50) / SR) + lp_fast(noise(0.35), 900) * 0.8) * np.exp(-t * 14)
def thunder(d=2.4):
    t = t_(d); return lp_fast(noise(d), 260) * 2.2 * (np.exp(-t * 1.6) + 0.5 * np.exp(-((t - 0.4) / 0.2) ** 2))
def punch():
    t = t_(0.3); return (np.sin(2 * np.pi * np.cumsum(140 * np.exp(-t * 25) + 45) / SR) * 1.3 + hp_fast(noise(0.3), 1500) * 0.5 * np.exp(-t * 30)) * np.exp(-t * 10)


def huss():
    t = t_(0.32); hh = lp_fast(hp_fast(noise(0.32), 700), 3500) * np.exp(-((t - 0.05) / 0.04) ** 2) * 0.8
    ss = hp_fast(noise(0.32), 5000) * np.exp(-((t - 0.17) / 0.07) ** 2) * 0.9
    return (hh + ss) * env(len(t), 0.01, 0.05)


def say_huss(k):
    """Robert saying "huss" (stock voice, generated into ep17/sfx/huss_*.wav)."""
    import soundfile as sf
    y, sr = sf.read(os.path.join(HERE, 'sfx', f'huss_{k % 3}.wav'))
    return np.interp(np.arange(int(len(y) * SR / sr)) * sr / SR, np.arange(len(y)), y)


def heli(d):
    t = t_(d); return lp_fast(noise(d), 500) * (np.sin(2 * np.pi * 11 * t) > 0.2) * 0.9 * env(len(t), 0.2, 0.3)
def engine(d):
    t = t_(d); f = 70 + 60 * np.minimum(1, t / d); return (np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.25 + lp_fast(noise(d), 900) * 0.4) * np.sin(np.pi * np.minimum(1, t / d)) ** 0.7
def siren2(d):
    t = t_(d); f = 650 + 350 * np.abs(np.sin(2 * np.pi * 0.9 * t)); return lp_fast(np.sin(2 * np.pi * np.cumsum(f) / SR), 2200) * 0.22 * env(len(t), 0.15, 0.3)
def vib(d=0.5):
    t = t_(d); return np.sign(np.sin(2 * np.pi * 165 * t)) * 0.2 * ((t * 12) % 1 < 0.6) * env(len(t), 0.01, 0.03)
def glitchfx(d):
    t = t_(d); return (hp_fast(noise(d), 900) * (np.sin(2 * np.pi * 27 * t) > 0.1) * 0.5 + np.sign(np.sin(2 * np.pi * (140 + 300 * (np.sin(2 * np.pi * 6 * t) > 0)) * t)) * 0.12) * env(len(t), 0.02, 0.1)
def braam(d=2.8):
    t = t_(d); x = sum(np.sign(np.sin(2 * np.pi * f * t)) * w for f, w in ((55, 0.5), (82.4, 0.35), (110, 0.25))); return lp_fast(x, 1400) * np.exp(-t * 1.1) * np.minimum(1, t / 0.05)
def suck(d):
    t = t_(d); f = 200 + 2400 * (t / d) ** 2; return (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3 + hp_fast(noise(d), 1500) * 0.3 * (t / d)) * env(len(t), 0.1, 0.02)
def blip():
    t = t_(0.12); return np.sign(np.sin(2 * np.pi * 880 * t)) * 0.2 * np.exp(-t * 20)


def build(m, tl):
    shots = tl['shots']; total = tl['dur']; seg = {s['id']: s for s in tl['segs']}
    def shot(n): return next(x for x in shots if x['name'] == n)
    cut = seg['news']['end'] + 0.05                       # the song stops dead on the news
    sg = song(total); n0 = int(cut * SR); sg[n0:] = 0; f = int(0.04 * SR); sg[n0 - f:n0] *= np.linspace(1, 0, f)
    m.put(sg, 0.0, SONG_GAIN, bus='music')
    m.put(E10.dark_pad(total - cut + 0.3, 55.0, 420), cut, 0.6, bus='music')
    m.put(scratch(), cut - 0.05, 0.55)
    for s in shots[1:]:
        m.put(whoosh(0.22), s['s'] - 0.08, 0.06, pan=rng.uniform(-0.3, 0.3))
    # chaos
    m.put(boom(2.2), 0.0, 0.9); m.put(E7.hit(1.8), 0.0, 0.6); m.put(engine(2.0), 0.1, 0.5)
    m.put(boom(1.4), shot('parachute')['s'] + 0.3, 0.5); m.put(whoosh(0.8), shot('parachute')['s'], 0.3)
    m.put(engine(1.6), shot('mom_car')['s'], 0.6); m.put(heli(1.5), shot('brick_heli')['s'], 0.6); m.put(laughs(1.2, 3), shot('brick_heli')['s'], 0.25)
    m.put(siren2(1.6), shot('principal_cop')['s'], 0.55); m.put(engine(1.5), shot('principal_cop')['s'], 0.4)
    zb = shot('zash_bench'); m.put(engine(2.0), zb['s'], 0.35); m.put(heli(2.0), zb['s'], 0.3); m.put(boom(1.2), zb['s'] + 0.6, 0.4)
    cf = shot('car_flip'); m.put(whoosh(0.7), cf['s'], 0.5); m.put(boom(1.8), cf['s'] + 0.85, 0.9)
    m.put(boom(1.2), shot('tobi_rocket')['s'] + 0.9, 0.3)
    fs = shot('five_stars')
    for k in range(5): m.put(blip(), fs['s'] + k * 0.2, 0.5)
    m.put(siren2(shot('zash_zero')['s'] - fs['s']), fs['s'], 0.55); m.put(heli(2.4), fs['s'], 0.4)
    # the turn
    na = shot('news_alert'); m.put(vib(), na['s'] + 0.05, 0.6)
    m.put(blip(), shot('tv_anchor')['s'], 0.4)
    pg = shot('players_glitch'); m.put(glitchfx(pg['e'] - pg['s']), pg['s'], 0.5); m.put(riser(pg['e'] - pg['s']), pg['s'], 0.3, bus='music')
    si = shot('sucked_in'); m.put(suck(si['e'] - si['s']), si['s'], 0.7); m.put(braam(), si['e'] - 0.05, 0.7); m.put(E7.hit(2.2), si['e'] - 0.05, 0.6)
    for n in ('max_npc', 'max_close'):
        sh = shot(n); m.put(glitchfx(0.15), sh['s'] + 0.02, 0.3)
    m.put(glitchfx(0.25), shot('max_close')['s'] + 1.7, 0.45); m.put(braam(), seg['brother']['words'][-1]['s'], 0.6)
    za = shot('zash_alone_street'); m.put(wind(za['e'] - za['s'] + 1.5), za['s'], 0.5)
    dp = shot('drop_phone'); m.put(punch(), dp['s'] + 0.75, 0.5); m.put(hp_fast(noise(0.2), 3000) * np.exp(-t_(0.2) * 25) * 0.5, dp['s'] + 0.76, 0.5)
    gc = shot('grab_controller'); m.put(riser(1.2), gc['s'] - 0.2, 0.35, bus='music'); m.put(braam(3.2), seg['pick']['words'][-1]['s'], 0.85); m.put(E7.hit(2.6), seg['pick']['words'][-1]['s'], 0.7)
    m.put(shimmer(2.0), shot('end_card')['s'], 0.35)


def mix(tl_path, voice_path, out_path):
    A.build_score = lambda m, tl: build(m, tl)
    A.build_sfx = lambda m, tl: None
    A.mix(tl_path, voice_path, out_path)
