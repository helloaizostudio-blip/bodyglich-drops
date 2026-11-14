"""Episode 11 "My Mom Had One Day Left": score + SFX (synthesized, original).

A ticking clock runs under the whole story. Emotional low piano + pad for the cold open and the rules, a bouncy
comedy groove for the "safest day" montage, the tick speeds up into 11:59, gas hiss, a big explosion, then a warm
swell when her number flips, and a cold hit + heartbeat on the reflection twist.
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
E4 = _load('ep4audio', os.path.join(HERE, '..', 'ep04', 'audio.py'))
E7 = _load('ep7audio', os.path.join(HERE, '..', 'ep07', 'audio.py'))
E9 = _load('ep9audio', os.path.join(HERE, '..', 'ep09', 'audio.py'))
E10 = _load('ep10audio', os.path.join(HERE, '..', 'ep10', 'audio.py'))
N = E9.N
rng = np.random.default_rng(111)


def tick():
    d = 0.05; t = t_(d); return (hp_fast(noise(d), 3000) * 0.5 + np.sin(2 * np.pi * 2400 * t) * 0.3) * np.exp(-t * 90)
def ticks(d, bpm0, bpm1):
    x = np.zeros(int(d * SR) + SR); tt = 0; k = 0
    while tt < d:
        h = tick() * (1.0 if k % 2 == 0 else 0.7); a = int(tt * SR); x[a:a + len(h)] += h; tt += 60 / (bpm0 + (bpm1 - bpm0) * tt / d); k += 1
    return x[:int(d * SR)]
def boom(d=2.6):
    t = t_(d); return (np.sin(2 * np.pi * np.cumsum(55 * np.exp(-t * 1.5) + 25) / SR) * 1.5 + lp_fast(noise(d), 700) * 1.1 + hp_fast(noise(d), 2500) * 0.3 * np.exp(-t * 6)) * np.exp(-t * 1.6)
def hiss(d):
    t = t_(d); return hp_fast(noise(d), 4000) * env(len(t), 0.4, 0.2) * 0.25


def build(m, tl):
    seg = {s['id']: s for s in tl['segs']}; shots = tl['shots']
    def s_(i): return seg[i]['start']
    def shot(n): return next(x for x in shots if x['name'] == n)
    total = tl['dur']
    # ---- score
    m.put(E7.hit(2.0), 0.0, 0.5, bus='music')
    m.put(E10.dark_pad(s_('safe') + 0.5, 55.0, 420), 0.0, 0.8, bus='music')
    for sid, f in (('cold', 110.0), ('rule', 98.0), ('morning', 82.4)):
        m.put(E10.low_piano(f, 3.5), s_(sid), 0.8, bus='music')
    m.put(ticks(s_('clock') - 0.0, 60, 80), 0.0, 0.5, bus='music')
    m.put(E9.party(s_('clock') - s_('safe') + 0.2, 128) * 0.9, s_('safe'), 0.45, bus='music')
    m.put(ticks(s_('drag') - s_('clock'), 120, 220), s_('clock'), 0.8, bus='music')
    m.put(riser(s_('drag') - s_('clock')), s_('clock'), 0.5, bus='music')
    m.put(E2.choir(E2.F, s_('mom2') - s_('lawn') + 0.4, 0.9), s_('lawn'), 0.45, bus='music')
    m.put(E2.choir(E2.C, 2.0, 0.9), shot('number_flip')['s'] + 1.2, 0.4, bus='music')
    m.put(E10.dark_pad(total - s_('mom2') + 0.5, 41.2, 380), s_('mom2'), 0.8, bus='music')
    m.put(E7.hb_seq(total - s_('window'), 70, 110), s_('window'), 0.5, bus='music')
    # ---- SFX
    for s in shots[1:]:
        m.put(whoosh(0.26), s['s'] - 0.1, 0.09, pan=rng.uniform(-0.3, 0.3))
    m.put(E7.sting(), 0.1, 0.4)
    m.put(E4.ding(), shot('mom_number')['s'], 0.5); m.put(E7.hit(1.6), shot('mom_number')['s'], 0.6)
    for n in ('mom_helmet', 'bubble_wrap', 'no_stairs', 'no_toast'):
        m.put(E4.bonk(), shot(n)['s'] + 0.03, 0.55)
    m.put(E4.trombone(), shot('fridge_padded')['e'] - 1.0, 0.35)
    m.put(hiss(shot('leo_smell')['e'] - shot('leo_smell')['s']), shot('leo_smell')['s'], 0.7)
    m.put(E7.lock(), shot('drag_out')['s'] + 0.1, 0.6)
    m.put(boom(), shot('explosion')['s'], 1.0)
    m.put(shimmer(1.6), shot('number_flip')['s'] + 0.3, 0.6); m.put(E4.ding(), shot('number_flip')['s'] + 1.3, 0.5)
    m.put(E7.hit(3.0), shot('reflection_one')['s'], 1.0); m.put(E7.sting(), shot('reflection_one')['s'] + 0.05, 0.7)


def mix(tl_path, voice_path, out_path):
    A.build_score = lambda m, tl: build(m, tl)
    A.build_sfx = lambda m, tl: None
    A.mix(tl_path, voice_path, out_path)
