"""Episode 6 "The Clone Goes To School" (v2): score + SFX (synthesized, original).

Dramatic sting for the cold open, a chill lo-fi groove for the world jokes and Leo's couch life, a sad soft piano
when the clone becomes the better son, tension drums + truck beeps for the street climax, a silence-then-hit on the
birthday question, a bright triumphant groove for the pizza test, and warm chords for the hug.
"""
import os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'sample'))
import audio_sample as A
from audio_sample import SR, t_, env, noise, lp_fast, hp_fast, whoosh, riser, shimmer, power_up, click
import importlib.util
def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
E2 = _load('ep2audio', os.path.join(HERE, '..', 'ep02', 'audio.py'))
E4 = _load('ep4audio', os.path.join(HERE, '..', 'ep04', 'audio.py'))
E5 = _load('ep5audio', os.path.join(HERE, '..', 'ep05', 'audio.py'))
E9 = _load('ep9audio', os.path.join(HERE, '..', 'ep09', 'audio.py'))
N = E9.N
rng = np.random.default_rng(66)


def beep(d=0.25):
    t = t_(d); return np.sin(2 * np.pi * 1000 * t) * env(len(t), 0.005, 0.03) * 0.25
def glitch(d=1.0):
    t = t_(d); x = np.sign(np.sin(2 * np.pi * np.cumsum(200 + 1800 * rng.random(len(t)) * (rng.random(len(t)) < 0.01)) / SR))
    gate = (np.floor(t * 30) % 3 != 0).astype(float); return lp_fast(x * gate, 5000) * 0.18 * env(len(t), 0.01, 0.2)
def chomp():
    d = 0.14; t = t_(d); return lp_fast(noise(d), 1200) * np.exp(-t * 30) * 0.9


def build(m, tl):
    seg = {s['id']: s for s in tl['segs']}; shots = tl['shots']
    def s_(i): return seg[i]['start']
    def shot(n): return next(x for x in shots if x['name'] == n)
    total = tl['dur']
    # ---- score
    m.put(E2.hit(2.0), 0.0, 0.6, bus='music'); m.put(E2.choir(E2.Am, s_('hook') + 0.3, 0.7), 0.0, 0.35, bus='music')
    m.put(E5.lofi(s_('better') - s_('hook') + 0.3), s_('hook'), 0.55, bus='music')
    m.put(E9.music_box([N['A3'], N['C4'], N['E4'], N['C4'], N['F3'], N['A3'], N['C4'], N['A3']], 0.45, s_('friday') - s_('better') + 0.2), s_('better'), 0.6, bus='music')
    gd = s_('max') - s_('friday')
    m.put(E2.drums(110, gd, 'x..x..x.x.x.....', 60), s_('friday'), 0.5, bus='music')
    m.put(E2.choir(E2.Dm, gd, 0.6), s_('friday'), 0.3, bus='music')
    m.put(E5.lofi(total - s_('max') + 0.3, 104), s_('max'), 0.55, bus='music')
    m.put(E2.hit(2.0), s_('clone'), 0.6, bus='music')
    m.put(E2.choir(E2.F, total - s_('hug') + 0.3, 0.8), s_('hug'), 0.4, bus='music')
    # ---- SFX
    for s in shots[1:]:
        m.put(whoosh(0.26), s['s'] - 0.1, 0.08, pan=rng.uniform(-0.3, 0.3))
    m.put(E9.poof(), shot('clone_poof')['s'], 0.8)
    m.put(E4.ding(), shot('principal')['s'] + 1.5, 0.3); m.put(E4.trombone(), shot('principal')['e'] - 1.0, 0.3)
    m.put(glitch(0.8), shot('pizza_rule')['s'] + 1.2, 0.6)
    sc = shot('skip_counter'); t = sc['s']
    while t < sc['e']: m.put(click(), t, 0.35); t += 0.07
    m.put(E4.ding(), shot('report_card')['s'] + 0.2, 0.5)
    m.put(E2.gasp(), shot('two_leo')['s'], 0.5); m.put(E2.hit(1.6), shot('two_leo')['s'] + 0.05, 0.6)
    rt = shot('recycle_truck'); t = rt['s'] + 1.6
    while t < rt['e']: m.put(beep(), t, 0.5); t += 0.5
    m.put(E2.hit(2.2), shot('mom_bday')['s'] + 0.1, 0.5)
    m.put(E2.hit(2.0), shot('clone_smile')['s'], 0.7)
    for k in range(5): m.put(chomp(), shot('leo_eats')['s'] + 0.2 + k * 0.33, 0.8)
    m.put(chomp(), shot('clone_glitch')['s'] + 0.3, 0.8); m.put(glitch(1.4), shot('clone_glitch')['s'] + 0.6, 0.8)
    m.put(shimmer(1.4), shot('mom_hug')['s'], 0.4); m.put(E4.ding(), shot('calendar_heart')['s'] + 0.3, 0.5)


def mix(tl_path, voice_path, out_path):
    A.build_score = lambda m, tl: build(m, tl)
    A.build_sfx = lambda m, tl: None
    A.mix(tl_path, voice_path, out_path)
