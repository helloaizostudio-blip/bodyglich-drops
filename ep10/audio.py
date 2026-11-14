"""Episode 10 "Don't Answer The Skinwalker": horror score + SFX (synthesized, original).

Bed: a slow dark string-like pad (no noise bed, no rain/wind hiss), an owl, low piano notes on each night and a
detuned music-box lullaby under the "sister". Reuses the Ep 7 SFX (knocks, creaks, hits, stings). Night cards get a low boom,
the peephole face and the ceiling get the biggest hits, sunrise goes quiet and cold, the final door gets a creak
and a sting into black.
"""
import os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'sample'))
import audio_sample as A
from audio_sample import SR, t_, env, noise, lp_fast, hp_fast, whoosh, riser
import importlib.util
def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
E7 = _load('ep7audio', os.path.join(HERE, '..', 'ep07', 'audio.py'))
E2 = _load('ep2audio', os.path.join(HERE, '..', 'ep02', 'audio.py'))
rng = np.random.default_rng(1010)


def scratch_wood(d=1.2):
    t = t_(d); x = hp_fast(noise(d), 1800) * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t)) * env(len(t), 0.05, 0.3)
    return x * 0.35
def squeak(d=1.4):
    t = t_(d); f = 900 + 300 * np.sin(2 * np.pi * 0.8 * t); return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.1, 0.3) * 0.12 + hp_fast(noise(d), 3000) * 0.04
def giggle():
    out = np.zeros(int(1.2 * SR))
    for k in range(5):
        d = 0.12; t = t_(d); h = np.sin(2 * np.pi * (700 + 60 * k) * t) * np.exp(-t * 18) * 0.2; a = int(k * 0.17 * SR); out[a:a + len(h)] += h
    return out
def scream_hit(d=1.6):
    t = t_(d); return (np.tanh(np.sin(2 * np.pi * np.cumsum(500 + 200 * np.sin(2 * np.pi * 9 * t)) / SR) * 4) * 0.25 + hp_fast(noise(d), 1500) * 0.3) * np.exp(-t * 2.5)


def dark_pad(d, root=55.0, bright=500):
    """slow, detuned low strings-like pad (root, minor third, fifth) with a breathing filter"""
    t = t_(d); x = np.zeros(len(t))
    for f, g in ((root, 1.0), (root * 1.003, 0.8), (root * 2 * 1.189, 0.45), (root * 1.498, 0.55), (root * 2.997, 0.2)):
        x += (2 * ((f * t + rng.random()) % 1) - 1) * g
    x = lp_fast(lp_fast(lp_fast(x, bright), bright), bright) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.07 * t))
    return x * env(len(t), 2.0, 2.0) * 0.4
def night_air(d):
    """soft forest night: low air + crickets"""
    t = t_(d); air = lp_fast(noise(d), 350) * 0.25 * (0.8 + 0.2 * np.sin(2 * np.pi * 0.05 * t))
    cr = np.sin(2 * np.pi * 4600 * t) * (((t * 14) % 1) < 0.35) * (((t * 0.9) % 1) < 0.55) * 0.025
    cr2 = np.sin(2 * np.pi * 5100 * t + 1) * ((((t + 0.37) * 12) % 1) < 0.3) * ((((t + 0.2) * 0.7) % 1) < 0.5) * 0.018
    return (air + cr + cr2) * env(len(t), 1.5, 1.5)
def owl():
    out = np.zeros(int(1.6 * SR))
    for k, (st, dd) in enumerate(((0.0, 0.35), (0.5, 0.6))):
        t = t_(dd); h = np.sin(2 * np.pi * (370 + 15 * np.sin(2 * np.pi * 5 * t)) * t) * env(len(t), 0.05, 0.2) * 0.12
        a = int(st * SR); out[a:a + len(h)] += h
    return lp_fast(out, 1200)
def low_piano(f, d=3.0):
    t = t_(d); return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(4 * np.pi * f * t) + 0.25 * np.sin(6 * np.pi * f * t + 0.3)) * np.exp(-t * 1.3) * 0.28
def lullaby(d):
    """slightly detuned music-box lullaby for the 'sister'"""
    notes = [659.3, 587.3, 523.3, 587.3, 659.3, 659.3, 659.3, 0, 587.3, 587.3, 587.3, 0, 659.3, 784.0, 784.0, 0]
    x = np.zeros(int(d * SR) + SR); tt = 0; k = 0
    while tt < d:
        f = notes[k % len(notes)]
        if f:
            n = t_(1.2); h = (np.sin(2 * np.pi * f * 1.012 * n) + 0.3 * np.sin(2 * np.pi * f * 2.03 * n)) * np.exp(-n * 4) * 0.16
            a = int(tt * SR); x[a:a + len(h)] += h[:len(x) - a]
        tt += 0.32; k += 1
    return x[:int(d * SR)]


def build(m, tl):
    seg = {s['id']: s for s in tl['segs']}; shots = tl['shots']
    def s_(i): return seg[i]['start']
    def shot(n): return next(x for x in shots if x['name'] == n)
    total = tl['dur']
    # ---- beds: dark pad + night air instead of the old drone/wind
    m.put(dark_pad(s_('n2') + 1.0, 55.0, 420), 0.0, 0.8, bus='music')
    m.put(dark_pad(s_('dawn') - s_('n2') + 1.0, 49.0, 520), s_('n2'), 0.85, bus='music')
    m.put(dark_pad(total - s_('dawn'), 41.2, 380), s_('dawn'), 0.7, bus='music')
    m.put(owl(), 3.0, 0.8, pan=-0.6); m.put(owl(), s_('n3') + 0.8, 0.7, pan=0.6)
    for sid, f in (('n1', 82.4), ('n2', 73.4), ('n3', 65.4), ('only', 55.0)):
        m.put(low_piano(f, 3.5), s_(sid), 0.8, bus='music')
    m.put(lullaby(s_('n2') - s_('sis')), s_('sis'), 0.7, bus='music')
    m.put(lullaby(s_('dawn') - s_('giggle')), s_('giggle'), 0.75, bus='music')
    m.put(riser(s_('up') - s_('empty')), s_('empty'), 0.5, bus='music')
    m.put(E7.hb_seq(s_('up') - s_('empty'), 80, 120), s_('empty'), 0.35, bus='music')

    # ---- SFX
    for s in shots[1:]:
        m.put(whoosh(0.3), s['s'] - 0.12, 0.035, pan=rng.uniform(-0.3, 0.3))
    m.put(E7.hit(1.8), 0.02, 0.45)
    for n in ('night1_card', 'night2_card', 'night3_card'):
        m.put(E7.hit(2.2), shot(n)['s'], 0.8)
    m.put(E7.creak(0.6), shot('walker_legs')['s'] + 0.3, 0.5, pan=-0.4); m.put(E7.creak(0.6), shot('walker_legs')['s'] + 1.4, 0.5, pan=-0.2)
    m.put(scratch_wood(1.6), shot('walker_hand')['s'] + 0.3, 0.6)
    m.put(E7.lock(), shot('door_lock')['s'] + 1.2, 0.8)
    m.put(E7.sting(), shot('window_walker')['s'] + 0.2, 0.5)
    m.put(E7.knocks(3), shot('door_leo')['s'] + 0.1, 0.9)
    m.put(E7.hit(2.6), shot('peephole_face')['s'], 1.0); m.put(E7.sting(), shot('peephole_face')['s'] + 0.05, 0.6)
    for i in range(4): m.put(E7.creak(0.5), shot('roof_crawl')['s'] + 0.1 + i * 0.4, 0.6, pan=0.3)
    m.put(squeak(1.8), shot('window_fingers')['s'] + 0.1, 0.7)
    m.put(giggle(), shot('sis_giggle')['s'] + 0.3, 0.7)
    m.put(E7.hit(2.0), s_('only') + seg['only']['words'][-1]['s'] - s_('only') if seg['only']['words'] else s_('only'), 0.8)
    m.put(E7.hit(3.0), shot('ceiling_walker')['s'], 1.0); m.put(E7.sting(), shot('ceiling_walker')['s'] + 0.02, 0.8); m.put(scream_hit(), shot('ceiling_walker')['s'] + 0.1, 0.5)
    gr = shot('grandpa_run'); t = gr['s']
    while t < gr['e']: m.put(E2.giant_step() * 0.3, t, 0.4); t += 0.25
    m.put(E7.sting(), shot('walker_face')['s'] + 0.2, 0.6); m.put(E7.hit(2.4), shot('walker_face')['e'] - 0.3, 0.8)
    m.put(E7.creak(1.2), shot('door_end')['s'] + 2.2, 0.8)
    m.put(E7.hit(3.0), shot('door_end')['s'] + 3.3, 1.0)


def mix(tl_path, voice_path, out_path):
    A.build_score = lambda m, tl: build(m, tl)
    A.build_sfx = lambda m, tl: None
    A.mix(tl_path, voice_path, out_path)
