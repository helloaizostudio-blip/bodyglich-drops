"""Episode 8 "I Ate The Worst Cursed Fruit": adventure score + SFX (all synthesized, original).

Score: bright island groove (plucky strings + bass + light drums) for the world and the crew, a comic drop for
"bubbles", a dark low drone + drums when Gorr's ship arrives, near-silence on the idea, a heroic choir swell for the
bubble rescue, a big hit when Gorr is lifted, then the island groove back, warm, for the bounty and the ending.
"""
import os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'sample'))
import audio_sample as A
from audio_sample import SR, t_, env, tone, noise, lp_fast, hp_fast, sweep, whoosh, riser, shimmer, power_up, click
import importlib.util
def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
E2 = _load('ep2audio', os.path.join(HERE, '..', 'ep02', 'audio.py'))
E4 = _load('ep4audio', os.path.join(HERE, '..', 'ep04', 'audio.py'))
N = dict(E4.N, B4=493.9, D5=587.3, E5=659.3)
rng = np.random.default_rng(88)


def pop():
    d = 0.12; t = t_(d); return np.sin(2 * np.pi * np.cumsum(900 + 1400 * np.exp(-t * 60)) / SR) * np.exp(-t * 40) * 0.6
def blub():
    d = 0.18; t = t_(d); return np.sin(2 * np.pi * np.cumsum(300 + 500 * t / d) / SR) * env(len(t), 0.005, 0.08) * 0.4
def splash(d=1.0):
    t = t_(d); return (lp_fast(noise(d), 2500) * 0.8 + hp_fast(noise(d), 4000) * 0.3) * np.exp(-t * 3.5) * env(len(t), 0.005, 0.2)
def waves(d):
    t = t_(d); return lp_fast(noise(d), 500) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.12 * t)) * env(len(t), 0.8, 0.8) * 0.5
def gull():
    d = 0.5; t = t_(d); f = 1500 + 500 * np.sin(np.pi * t / d); return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.02, 0.2) * np.exp(-t * 3) * 0.25
def crack():
    d = 0.5; t = t_(d); return (hp_fast(noise(d), 1200) * 1.0 + lp_fast(noise(d), 300) * 0.8) * np.exp(-t * 9)
def sizzle(d):
    t = t_(d); return hp_fast(noise(d), 5000) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t)) * env(len(t), 0.05, 0.2) * 0.35
def chomp():
    d = 0.14; t = t_(d); return lp_fast(noise(d), 1200) * np.exp(-t * 30) * 0.9
def boom(d=2.0):
    t = t_(d); return (np.sin(2 * np.pi * np.cumsum(60 * np.exp(-t * 1.5) + 25) / SR) * 1.4 + lp_fast(noise(d), 600) * 0.9) * np.exp(-t * 2.0)
def clink():
    d = 0.4; t = t_(d); return (np.sin(2 * np.pi * 2600 * t) + 0.6 * np.sin(2 * np.pi * 3900 * t)) * np.exp(-t * 14) * 0.25
def island(d, bpm=112, gain=1.0):
    """bright plucky island groove"""
    x = E4.beat(bpm, d, False) * 0.6
    x += E4.riff([N['C3'], 0, N['G3'] / 2, 0, N['A3'] / 2, 0, N['F3'] / 2, N['G3'] / 2], bpm, d, E4.bass) * 0.8
    x += E4.riff([N['E4'], N['G4'], N['C5'], N['G4'], N['A4'], N['C5'], N['E5'], N['C5'], N['F4'], N['A4'], N['C5'], N['A4'], N['G4'], N['B4'], N['D5'], N['B4']], bpm * 2, d) * 0.4
    return x * gain
def drone(d, f=46.0):
    t = t_(d); x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.5 * t) + lp_fast(noise(d), 200) * 0.4
    return x * (0.7 + 0.3 * np.sin(2 * np.pi * 0.3 * t)) * env(len(t), 0.4, 0.6) * 0.5


def build(m, tl):
    seg = {s['id']: s for s in tl['segs']}; shots = tl['shots']
    def s_(i): return seg[i]['start']
    def e_(i): return seg[i]['end']
    def shot(n): return next(x for x in shots if x['name'] == n)
    def w_(sid, w):
        for x in seg[sid]['words']:
            if ''.join(c for c in x['w'].lower() if c.isalnum()) == w: return x['s']
        return s_(sid)
    total = tl['dur']
    # ---- score
    m.put(E2.hit(1.6), 0.0, 0.5, bus='music')
    m.put(island(s_('then') - 0.0), 0.0, 0.5, bus='music')
    m.put(waves(total), 0.0, 0.35, bus='music')
    # the "bubbles" drop: music thins for a beat (comic)
    m.put(E4.trombone(), w_('power', 'bubbles') + 0.3, 0.35, bus='music')
    # Gorr: drone + war drums
    gd = s_('idea') - s_('then')
    m.put(drone(gd + 0.4), s_('then'), 0.6, bus='music')
    m.put(E2.drums(96, gd, 'x..x..x.x.x.....', 60), s_('then'), 0.55, bus='music')
    # idea: shimmer, then heroic choir through the rescue and the lift
    m.put(shimmer(1.6), s_('idea'), 0.5, bus='music')
    t = s_('save'); i = 0
    while t < s_('sky'):
        dd = min(1.6, s_('sky') - t); m.put(E2.choir([E2.C, E2.G, E2.Am, E2.F][i % 4], dd + 0.4, 0.9), t, 0.45, bus='music'); t += dd; i += 1
    m.put(riser(s_('lift') - s_('gorr2')), s_('gorr2'), 0.45, bus='music')
    m.put(E2.hit(2.2), s_('lift'), 0.7, bus='music')
    # ending: island groove back, warm
    m.put(island(total - s_('sky') + 0.5, 112, 1.0), s_('sky'), 0.5, bus='music')

    # ---- SFX
    for s in shots[1:]:
        m.put(whoosh(0.28), s['s'] - 0.11, 0.1, pan=rng.uniform(-0.3, 0.3))
    m.put(shimmer(1.4), 0.05, 0.4)
    m.put(boom(1.6), shot('hero_power')['s'] + 1.2, 0.7)
    for k in range(5): m.put(blub(), shot('sink_dark')['s'] + 0.2 + k * 0.28, 0.5)
    m.put(clink(), w_('mine', 'coins'), 0.6); m.put(E4.bonk(), w_('mine', 'coins') + 0.05, 0.4)
    rl = shot('rowboat_leak'); t = rl['s']
    while t < rl['e']: m.put(blub(), t, 0.35, pan=0.3); t += 0.35
    m.put(sizzle(shot('basil_burn')['e'] - shot('basil_burn')['s']), shot('basil_burn')['s'], 0.6)
    m.put(E4.bonk(), shot('crate_box')['s'] + 0.6, 0.4)
    m.put(gull(), 0.6, 0.6, pan=-0.5); m.put(gull(), shot('fruit_find')['s'] + 0.2, 0.6, pan=0.5)
    m.put(power_up(), shot('fruit_find')['s'], 0.4)
    for k in range(3): m.put(chomp(), shot('fruit_eat')['s'] + 0.5 + k * 0.22, 0.8)
    m.put(pop(), shot('bubble_pop')['s'] + 1.45, 0.9)
    m.put(E4.laugh(1.4), shot('pirates_laugh')['s'], 0.5)
    m.put(splash(1.2), shot('pirate_falls')['s'] + 0.75, 0.8)
    bf = shot('bubble_float')
    for k in range(6): m.put(pop() * 0.4, bf['s'] + 0.3 + k * 0.35, 0.4, pan=rng.uniform(-0.6, 0.6))
    m.put(E2.giant_step(), shot('gorr_ship')['s'], 0.7)
    m.put(E2.hit(1.6), shot('gorr_reveal')['s'], 0.6)
    m.put(whoosh(0.5), shot('iron_punch')['s'], 0.8)
    m.put(boom(2.2), shot('boat_explode')['s'], 1.0); m.put(crack(), shot('boat_explode')['s'] + 0.02, 0.9); m.put(splash(1.4), shot('boat_explode')['s'] + 0.1, 0.8)
    m.put(splash(1.2), shot('pip_sinking')['s'], 0.6)
    m.put(power_up(), shot('giant_bubble')['s'], 0.5)
    m.put(splash(0.8), shot('pip_rises')['s'] + 0.1, 0.5)
    m.put(E4.laugh(1.6), shot('gorr_laughs')['s'] + 0.1, 0.35)
    m.put(pop() * 1.2, shot('gorr_bubbled')['s'], 0.9); m.put(E2.gasp(), shot('gorr_bubbled')['s'] + 0.15, 0.5)
    m.put(E4.zap(0.8) * 0.5, shot('gorr_lifts')['s'], 0.4)
    m.put(E4.trombone(), shot('gorr_clouds')['s'] + 1.2, 0.35)
    pn = shot('poster_new')
    for k in range(10): m.put(clink(), pn['s'] + 0.1 + k * 0.13, 0.45, pan=rng.uniform(-0.6, 0.6))
    m.put(E4.ding(), pn['s'] + 0.05, 0.6)
    m.put(E4.ding(), shot('mako_grin_end')['s'] + 0.3, 0.5)


def mix(tl_path, voice_path, out_path):
    A.build_score = lambda m, tl: build(m, tl)
    A.build_sfx = lambda m, tl: None
    A.mix(tl_path, voice_path, out_path)
