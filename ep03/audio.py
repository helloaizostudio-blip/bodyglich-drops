"""Episode 3 "The Wall: Part 2" score + SFX.

Musical idea: a simple lullaby ("the song Dad hums") is the emotional thread. It's heard hummed by the
dying Giant, and returns softly for the flashbacks and the final line. The fight uses the Ep 2 war drums
and choir; the transformation gets a huge rising hit; the ending is quiet and warm.
"""
import os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'sample')); sys.path.insert(0, os.path.join(HERE, '..', 'ep02'))
import audio_sample as A
from audio_sample import SR, t_, env, tone, noise, lp_fast, hp_fast, sweep, pad, whoosh, step, heartbeat, sting, riser, shimmer
import importlib.util
spec = importlib.util.spec_from_file_location('ep2audio', os.path.join(HERE, '..', 'ep02', 'audio.py')); E2 = importlib.util.module_from_spec(spec); spec.loader.exec_module(E2)
rng = np.random.default_rng(33)

# lullaby: (note Hz, beats)
LULL = [(392, 1), (440, 1), (392, 1), (329.6, 2), (293.7, 1), (329.6, 1), (392, 2), (440, 1), (523.3, 1), (440, 1), (392, 3)]


def lullaby(bpm=70, voice='hum', gain=1.0, octave=1.0):
    beat = 60 / bpm; out = np.zeros(int(sum(b for _, b in LULL) * beat * SR) + SR); t0 = 0
    for f, b in LULL:
        d = b * beat; n = int(d * SR); tt = np.arange(n) / SR; f = f * octave
        vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * tt)
        if voice == 'hum':   # closed-mouth hum: fundamental + a little 2nd harmonic, low-passed
            x = np.sin(2 * np.pi * f * vib * tt) + 0.35 * np.sin(4 * np.pi * f * vib * tt) + 0.1 * np.sin(6 * np.pi * f * tt)
            x = lp_fast(x, 900)
        else:                # music box
            x = (np.sin(2 * np.pi * f * 2 * tt) + 0.3 * np.sin(2 * np.pi * f * 4 * tt)) * np.exp(-tt * 3)
        x *= env(n, 0.04 if voice == 'hum' else 0.004, min(0.25, d * 0.4))
        a = int(t0 * SR); out[a:a + n] += x * gain; t0 += d
    return out


def build(m, tl):
    seg = {s['id']: s for s in tl['segs']}; shots = tl['shots']
    def s_(i): return seg[i]['start']
    def e_(i): return seg[i]['end']
    def shot(n): return next(x for x in shots if x['name'] == n)
    total = tl['dur']
    def choirs(prog, a, b, gain, step=2.2, bright=0.5):
        t = a; i = 0
        while t < b - 0.1:
            d = min(step, b - t); m.put(E2.choir(prog[i % len(prog)], d + 0.5, bright), t, gain, bus='music'); t += d; i += 1
    # 1. hook + mystery: low choir, a music-box hint of the lullaby (foreshadowing)
    choirs([E2.Dm, E2.Bb, E2.F, E2.C], 0.0, s_('gate'), 0.42, 2.4, 0.3)
    m.put(lullaby(80, 'box', 0.25, 1.0), s_('back'), 0.6, bus='music')
    m.put(E2.hit(), s_('hunt'), 0.4, bus='music')
    # 2. outside the wall: tense quiet -> drums from the shaking ground
    m.put(pad('E', s_('shake') - s_('gate') + 0.3, 0.2) * 0.8, s_('gate'), 0.45, bus='music')
    m.put(E2.drums(124, s_('hit') - s_('shake')), s_('shake'), 0.7, bus='music')
    m.put(riser(s_('hit') - s_('grab')), s_('grab'), 0.8, bus='music')
    # 3. rescue + fight: epic choir + drums
    choirs([E2.F, E2.C, E2.G, E2.Am], s_('hit'), s_('bit'), 0.7, 1.6, 0.9)
    m.put(E2.drums(140, s_('bit') - s_('hit')), s_('hit'), 0.75, bus='music')
    # 4. she falls: everything drops out to a single low note, then the transformation
    m.put(pad('Am', s_('light') - s_('bit') + 0.3, 0.2) * 0.7, s_('bit'), 0.5, bus='music')
    m.put(riser(s_('light') - s_('snap') + 0.2), s_('snap'), 1.0, bus='music')
    m.put(E2.hit(3.0), s_('light'), 1.0, bus='music')
    choirs([E2.Dm, E2.Bb, E2.F, E2.C], s_('light'), s_('knelt'), 0.8, 1.4, 1.0)
    m.put(E2.drums(150, s_('knelt') - s_('light')), s_('light'), 0.8, bus='music')
    # 5. her last moments: soft pads + she hums the lullaby
    t = s_('knelt'); prog = ['Am', 'F', 'C', 'G']; i = 0
    while t < s_('woke'):
        d = 2.4; m.put(pad(prog[i % 4], d + 0.4, 0.5), t, 0.35, bus='music'); t += d; i += 1
    m.put(lullaby(66, 'hum', 0.5, 0.5), s_('hum') - 0.3, 0.9, bus='music')
    # 6. locket + truth + flashbacks: music box lullaby over warm pads
    t = s_('woke'); prog = ['C', 'Am', 'F', 'G']; i = 0
    while t < total:
        d = 2.4; m.put(pad(prog[i % 4], d + 0.4, 0.7), t, 0.4, bus='music'); t += d; i += 1
    m.put(lullaby(72, 'box', 0.4), s_('born'), 0.7, bus='music')
    m.put(lullaby(66, 'hum', 0.35, 0.5), s_('end1'), 0.7, bus='music')

    # ---------------- SFX
    for s in shots[1:]:
        if s['seg'] not in ('knelt', 'touch', 'hum', 'closed', 'photo', 'born', 'years', 'end1', 'end2'):
            m.put(whoosh(0.3), s['s'] - 0.12, 0.18, pan=rng.uniform(-0.4, 0.4))
    for n in ('pack_far', 'pack_reveal', 'pack_run', 'pack_flee', 'smiler_tackle', 'flash_walk'):
        s = shot(n); t = s['s'] + 0.15
        while t < s['e']: m.put(E2.giant_step(), t, 0.8); t += 0.7 if n in ('pack_run', 'smiler_tackle') else 1.1
    m.put(E2.gasp(), shot('giant_bite_far')['s'], 0.4)
    m.put(shimmer(1.2), shot('hand_heal')['s'] + 0.3, 0.6)
    m.put(whoosh(0.5), shot('eyes_gold')['s'], 0.5)
    gs = shot('ground_shake'); m.put(E2.crumble(gs['e'] - gs['s'] + 0.5), gs['s'], 0.6)
    m.put(E2.snap(), shot('zash_fall')['s'] + 0.05, 0.9)
    m.put(whoosh(0.9), shot('zash_fall')['s'], 0.6)
    m.put(E2.thud(), shot('giant_grab')['s'] + 0.5, 0.8)
    for k in range(3): m.put(heartbeat(), s_('mouth') + k * 0.55, 0.9)
    m.put(E2.thud(), shot('giant_fly')['s'], 1.2); m.put(E2.crumble(1.5), shot('giant_fly')['s'] + 0.7, 0.8)
    for n in ('smiler_fight1', 'smiler_fight2', 'smiler_fight3'):
        m.put(E2.thud(), shot(n)['s'] + 0.3, 1.1); m.put(E2.giant_step(), shot(n)['s'] + 0.8, 0.8)
    m.put(E2.thud(), shot('smiler_bitten')['s'], 1.0)
    m.put(E2.giant_step(), shot('smiler_falls')['s'] + 0.9, 1.2); m.put(E2.crumble(2.0), shot('smiler_falls')['s'] + 0.9, 0.7)
    m.put(heartbeat(), s_('snap'), 1.0)
    m.put(E2.crumble(2.5), shot('transform_flash')['s'], 0.9); m.put(shimmer(2.0), shot('transform_flash')['s'], 1.0)
    roar_t = shot('zash_roar')['s']; d = 1.8; tt = t_(d)
    roar = (lp_fast(noise(d), 500) * 2.4 + np.sin(2 * np.pi * 70 * tt) * 0.8 + sweep(160, 90, d, 'tri') * 0.6) * env(len(tt), 0.08, 0.7)
    m.put(roar, roar_t, 1.1)
    m.put(shimmer(1.4), shot('locket_grass')['s'], 0.5)
    m.put(E2.clack(), shot('locket_photo')['s'] + 0.35, 0.5)
    m.put(sting(), shot('endcard')['s'] - 0.2, 0.5)


def mix(tl_path, voice_path, out_path):
    A.build_score = lambda m, tl: build(m, tl)
    A.build_sfx = lambda m, tl: None
    A.mix(tl_path, voice_path, out_path)
