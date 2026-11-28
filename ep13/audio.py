"""Episode 13 "The Mirror Rule": score + SFX (synthesized, original).

A low dark drone runs under the whole video so it is never silent. Cold open: bass rumble + hit. Setup: warm music
box (grandma's mirror). "Until Tuesday": the music box cuts dead, a clock starts ticking. Night: heartbeat that
speeds up, fabric tearing, palms slamming glass. Twist: ear-ringing tone and near silence, a breath, then the glass
explodes. Payoff: sirens far away and a soft low piano. Reveal: glitch burst. CTA: drone + faint music box.
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
E7 = _load('ep7audio', os.path.join(HERE, '..', 'ep07', 'audio.py'))
E9 = _load('ep9audio', os.path.join(HERE, '..', 'ep09', 'audio.py'))
E10 = _load('ep10audio', os.path.join(HERE, '..', 'ep10', 'audio.py'))
rng = np.random.default_rng(113)


def fade(x, a=0.02, r=0.05):
    n = len(x); e = np.ones(n); na, nr = min(n // 2, int(a * SR)), min(n // 2, int(r * SR))
    e[:na] = np.linspace(0, 1, na); e[n - nr:] = np.linspace(1, 0, nr); return x * e
def tick():
    d = 0.05; t = t_(d); return (hp_fast(noise(d), 3000) * 0.5 + np.sin(2 * np.pi * 2400 * t) * 0.3) * np.exp(-t * 90)
def ticks(d, bpm):
    x = np.zeros(int(d * SR) + SR); tt = 0; k = 0
    while tt < d:
        h = tick() * (1.0 if k % 2 == 0 else 0.6); a = int(tt * SR); x[a:a + len(h)] += h; tt += 60 / bpm; k += 1
    return x[:int(d * SR)]
def rumble(d):
    t = t_(d); return fade(lp_fast(noise(d), 90) * 3 + np.sin(2 * np.pi * 36 * t) * 0.6, 0.3, 0.6)
def tear(d=0.9):
    t = t_(d); g = (np.sin(2 * np.pi * 38 * t) > 0) * 0.6 + 0.4; return hp_fast(noise(d), 1500) * g * np.exp(-t * 1.5) * env(len(t), 0.01, 0.2)
def slam():
    t = t_(0.35); return (np.sin(2 * np.pi * np.cumsum(90 * np.exp(-t * 18) + 45) / SR) + hp_fast(noise(0.35), 2500) * 0.25 * np.exp(-t * 40)) * np.exp(-t * 12)
def ring(d):
    t = t_(d); return np.sin(2 * np.pi * 3600 * t) * 0.25 * env(len(t), 0.05, d * 0.6)
def breath(d=1.4):
    t = t_(d); return lp_fast(hp_fast(noise(d), 300), 1800) * np.sin(np.pi * np.minimum(1, t / d)) ** 2 * 0.8
def shatter(d=2.2):
    t = t_(d); x = hp_fast(noise(d), 2000) * np.exp(-t * 4) * 1.2 + lp_fast(noise(d), 400) * np.exp(-t * 10) * 1.2
    for _ in range(40):
        a = int(rng.uniform(0.02, d - 0.3) * SR); f = rng.uniform(3000, 7000); tt = t_(0.25); x[a:a + len(tt)] += np.sin(2 * np.pi * f * tt) * np.exp(-tt * 30) * rng.uniform(0.1, 0.35)
    return x
def thud():
    t = t_(0.6); return np.sin(2 * np.pi * np.cumsum(60 * np.exp(-t * 8) + 30) / SR) * np.exp(-t * 6) + lp_fast(noise(0.6), 300) * np.exp(-t * 12) * 0.6
def siren(d):
    t = t_(d); f = 700 + 250 * (np.sin(2 * np.pi * 0.35 * t) > 0); x = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return lp_fast(x, 1400) * 0.25 * env(len(t), 0.8, 1.0)
def glitch(d=0.4):
    t = t_(d); return hp_fast(noise(d), 800) * (np.sin(2 * np.pi * 23 * t) > 0.3) * 0.6 + np.sign(np.sin(2 * np.pi * 180 * t)) * 0.12 * (np.sin(2 * np.pi * 9 * t) > 0)


def build(m, tl):
    seg = {s['id']: s for s in tl['segs']}; shots = tl['shots']; total = tl['dur']
    def s_(i): return seg[i]['start']
    def shot(n): return next(x for x in shots if x['name'] == n)
    # ---- constant bed: a low dark drone the whole way through (never silent)
    m.put(E10.dark_pad(total + 0.5, 55.0, 380), 0.0, 0.55, bus='music')
    # cold open: rumble + hit
    m.put(rumble(s_('law') + 0.3), 0.0, 0.7, bus='music'); m.put(E7.hit(2.2), 0.0, 0.7); m.put(E7.sting(), shot('blink_cu')['s'], 0.4)
    # setup: warm music box, cut dead at "Until Tuesday"
    mb_a, mb_b = s_('law'), s_('tues')
    m.put(fade(E9.music_box([523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880.0, 698.46], 0.32, mb_b - mb_a), 0.4, 0.01), mb_a, 0.5, bus='music')
    m.put(E10.low_piano(130.81, 3.0), mb_a, 0.4, bus='music')
    # escalation: clock ticking
    m.put(ticks(s_('night') - s_('tues'), 72), s_('tues') + 0.2, 0.55, bus='music')
    m.put(E7.hit(1.6), s_('tues'), 0.5)
    m.put(whoosh(0.5), shot('sheet_throw')['s'] + 0.1, 0.4)
    for k in range(4): m.put(E7.knock() * 0.5 if hasattr(E7, 'knock') else thud(), shot('tape')['s'] + 0.15 + k * 0.33, 0.25)
    # dread: heartbeat speeding up, tearing fabric, slams
    m.put(E7.hb_seq(s_('eyes') - s_('night'), 60, 120), s_('night'), 0.55, bus='music')
    m.put(tear(1.0), s_('night') + 0.2, 0.7)
    ps = shot('palms_slam'); tt = 0.0
    while tt < (shot('mouth_run')['e'] - ps['s']):
        m.put(slam(), ps['s'] + tt + (np.pi / 2) / 9, 0.6); tt += 2 * np.pi / 9
    m.put(riser(s_('raise') - s_('hammer') + 1.0), s_('hammer'), 0.3, bus='music')
    # twist: ear ring, breath, pale hand sting, glass shatter, tackle
    m.put(ring(s_('smash') - s_('eyes')), s_('eyes'), 0.5)
    m.put(breath(1.6), shot('breath_neck')['s'] + 0.1, 0.8)
    m.put(E7.sting(), shot('pale_hand')['s'] + 0.2, 0.6)
    m.put(shatter(), shot('shatter')['s'] + 0.1, 1.0); m.put(E7.hit(2.6), shot('shatter')['s'] + 0.1, 0.8)
    m.put(thud(), shot('tackle')['s'] + 0.4, 1.0); m.put(whoosh(0.5), shot('tackle')['s'], 0.6)
    # payoff: sirens + soft low piano
    m.put(siren(s_('reveal') - s_('sirens') + 1.5), s_('sirens'), 0.5, bus='music')
    for k, f in enumerate((110.0, 98.0, 87.31, 82.41)):
        m.put(E10.low_piano(f, 3.5), s_('sirens') + k * 2.4, 0.55, bus='music')
    m.put(shimmer(1.6), shot('hands_match')['s'] + 0.8, 0.4)
    # reveal + CTA: glitch bursts, then drone and a faint music box
    gf = shot('glitch_face')['s']; m.put(glitch(0.4), gf, 0.6); m.put(glitch(0.3), gf + 1.6, 0.5)
    m.put(fade(E9.music_box([523.25, 659.25, 783.99, 659.25], 0.5, total - s_('cta')), 0.3, 1.2) * 0.6, s_('cta'), 0.35, bus='music')
    for s in shots[1:]:
        m.put(whoosh(0.22), s['s'] - 0.08, 0.05, pan=rng.uniform(-0.3, 0.3))


def mix(tl_path, voice_path, out_path):
    A.build_score = lambda m, tl: build(m, tl)
    A.build_sfx = lambda m, tl: None
    A.mix(tl_path, voice_path, out_path)
