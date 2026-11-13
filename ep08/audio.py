"""Episode 8 "I Ate The Pirate's Fruit": adventure score + SFX (all synthesized, original).

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
    def shot(n): return next(x for x in shots if x['name'] == n)
    total = tl['dur']
    # ---- score
    m.put(drone(s_('plum') + 0.3, 44), 0.0, 0.55, bus='music')                         # ominous hook (Gorr hunting)
    m.put(E2.hit(1.6), 0.0, 0.55, bus='music')
    m.put(island(s_('rule') - s_('plum') + 0.3), s_('plum'), 0.5, bus='music')          # fun: the power montage
    m.put(shimmer(2.0), s_('rule'), 0.35, bus='music')
    gd = s_('sinking') - s_('then')                                                      # Gorr: drone + war drums
    m.put(drone(gd + 0.4), s_('then'), 0.6, bus='music')
    m.put(E2.drums(104, gd, 'x..x..x.x.x.....', 60), s_('then'), 0.6, bus='music')
    m.put(riser(s_('snap') - s_('punch')), s_('punch'), 0.45, bus='music')
    m.put(drone(s_('pull') - s_('sinking') + 0.3, 38), s_('sinking'), 0.6, bus='music')   # the choice: dark, quiet
    t = s_('reach'); i = 0                                                               # the rescue: choir swell
    while t < s_('hat'):
        dd = min(1.6, s_('hat') - t); m.put(E2.choir([E2.Am, E2.F, E2.C, E2.G][i % 4], dd + 0.4, 0.9), t, 0.45, bus='music'); t += dd; i += 1
    m.put(E2.hit(2.0), s_('pull'), 0.6, bus='music')
    m.put(E2.choir(E2.Am, total - s_('eyes') + 0.2, 0.5), s_('eyes'), 0.35, bus='music')  # the reveal
    m.put(E2.hit(2.6), seg['what']['start'] + 0.35, 0.8, bus='music')

    # ---- SFX
    for s in shots[1:]:
        m.put(whoosh(0.28), s['s'] - 0.11, 0.1, pan=rng.uniform(-0.3, 0.3))
    m.put(waves(total), 0.0, 0.25)
    m.put(boom(1.2), shot('gorr_silhouette')['s'] + 0.95, 0.5)
    m.put(shimmer(1.4), shot('fruit_glow')['s'], 0.4)
    for k in range(3): m.put(chomp(), shot('mako_bite')['s'] + 0.6 + k * 0.22, 0.8)
    m.put(gull(), shot('fruit_find')['s'] + 0.2, 0.5, pan=0.5)
    m.put(sweep(300, 1200, 0.8) * 0.3, shot('arm_stretch')['s'], 0.5)
    m.put(E4.bonk(), shot('crate_punch')['s'] + 0.45, 0.7); m.put(sweep(200, 600, 0.3) * 0.4, shot('crate_punch')['s'] + 0.47, 0.5)
    m.put(boom(1.0), shot('cannon_bounce')['s'] + 0.05, 0.4); m.put(E4.bonk(), shot('cannon_bounce')['s'] + 0.55, 0.7)
    m.put(E4.bonk(), shot('basil_bounce')['s'] + 0.6, 0.6); m.put(E4.trombone(), shot('basil_bounce')['s'] + 0.8, 0.3)
    for k in range(5): m.put(blub(), shot('sink_dark')['s'] + 0.3 + k * 0.4, 0.5)
    m.put(E2.giant_step(), shot('gorr_ship')['s'], 0.7)
    m.put(E2.hit(1.6), shot('gorr_reveal')['s'], 0.6)
    m.put(clink(), shot('poster_gorr')['s'] + 0.2, 0.5)
    m.put(whoosh(0.5), shot('iron_punch')['s'] + 0.6, 0.8); m.put(boom(1.6), shot('iron_punch')['s'] + 1.2, 0.9)
    m.put(sweep(500, 120, 1.2) * 0.4, shot('mako_stretch_far')['s'], 0.6)
    m.put(sweep(150, 900, 0.9) * 0.4, shot('mako_slingshot')['s'], 0.6); m.put(whoosh(0.8), shot('mako_slingshot')['s'] + 0.8, 0.8)
    m.put(boom(1.8), shot('mako_hits_gorr')['s'], 1.0); m.put(crack(), shot('mako_hits_gorr')['s'] + 0.02, 0.6)
    m.put(splash(1.4), shot('gorr_falls')['s'] + 0.65, 0.9)
    for k in range(6): m.put(blub(), shot('gorr_sinking')['s'] + 0.2 + k * 0.35, 0.5)
    m.put(splash(1.0), shot('arm_into_sea')['s'] + 0.1, 0.6)
    for k in range(4): m.put(blub(), shot('deep_grab')['s'] + 0.1 + k * 0.3, 0.4)
    m.put(splash(1.4), shot('gorr_pulled')['s'], 0.9)
    for k in range(3): m.put(splash(0.3) * 0.4, shot('gorr_coughs')['s'] + 0.2 + k * 0.4, 0.5)
    m.put(E2.gasp(), shot('mako_shock_end')['s'] + 0.05, 0.4)


def mix(tl_path, voice_path, out_path):
    A.build_score = lambda m, tl: build(m, tl)
    A.build_sfx = lambda m, tl: None
    A.mix(tl_path, voice_path, out_path)
