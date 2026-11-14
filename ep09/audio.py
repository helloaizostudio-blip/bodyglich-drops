"""Episode 9 "I Wasted All Three Wishes": score + SFX (all synthesized, original).

Score: a bouncy party groove for the world jokes, a magic shimmer + harp-like arpeggio for the Wish Lady, a comic
bonk/trombone on the wasted wish, chaos drums for the scream, a record scratch and silence when Max's mouth vanishes,
then a soft music-box melody for the choice, the flashback and the ending.
"""
import os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'sample'))
import audio_sample as A
from audio_sample import SR, t_, env, tone, noise, lp_fast, hp_fast, sweep, whoosh, riser, shimmer, power_up
import importlib.util
def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
E2 = _load('ep2audio', os.path.join(HERE, '..', 'ep02', 'audio.py'))
E4 = _load('ep4audio', os.path.join(HERE, '..', 'ep04', 'audio.py'))
E5 = _load('ep5audio', os.path.join(HERE, '..', 'ep05', 'audio.py'))
N = dict(E4.N, B4=493.9, D5=587.3, E5=659.3, G5=784.0)
rng = np.random.default_rng(99)


def poof():
    d = 0.7; t = t_(d); return lp_fast(noise(d), 3000) * env(len(t), 0.005, 0.5) * 0.6 + shimmer(d) * 0.5
def chime(f, d=1.2):
    t = t_(d); return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.01 * t) + 0.15 * np.sin(2 * np.pi * f * 3.02 * t)) * np.exp(-t * 3) * 0.3
def music_box(notes, each, d):
    x = np.zeros(int(d * SR) + SR); tt = 0; k = 0
    while tt < d:
        h = chime(notes[k % len(notes)] * 2, 1.4); a = int(tt * SR); x[a:a + len(h)] += h[:len(x) - a]; tt += each; k += 1
    return x[:int(d * SR)]
def harp(d):
    notes = [N['C4'], N['E4'], N['G4'], N['C5'], N['E5'], N['G5']]
    return music_box(notes, 0.09, d) * 0.7
def scream(d):
    t = t_(d); f = 700 + 120 * np.sin(2 * np.pi * 6 * t); return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * 3) * env(len(t), 0.03, 0.2) * 0.18 + hp_fast(noise(d), 2000) * 0.05
def party(d, bpm=118):
    x = E4.beat(bpm, d, False) * 0.6
    x += E4.riff([N['C3'], 0, N['C3'], 0, N['F3'], 0, N['G3'], 0], bpm, d, E4.bass) * 0.8
    x += E4.riff([N['E4'], N['G4'], N['C5'], 0, N['A4'], N['C5'], N['E5'], 0, N['F4'], N['A4'], N['C5'], 0, N['G4'], N['B4'], N['D5'], 0], bpm * 2, d) * 0.38
    return x


def build(m, tl):
    seg = {s['id']: s for s in tl['segs']}; shots = tl['shots']
    def s_(i): return seg[i]['start']
    def shot(n): return next(x for x in shots if x['name'] == n)
    total = tl['dur']
    # ---- score
    m.put(harp(1.6), 0.0, 0.5, bus='music')
    m.put(party(s_('then') + 0.2), 0.0, 0.5, bus='music')
    m.put(riser(s_('first') - s_('then')), s_('then'), 0.4, bus='music')
    m.put(E2.choir(E2.F, s_('w1') - s_('first') + 0.3, 0.9), s_('first'), 0.35, bus='music')     # magic pad under the question
    m.put(party(s_('max') - s_('w1')), s_('w1'), 0.45, bus='music')
    m.put(E2.drums(150, s_('mouth') - s_('max'), 'x.x.x.x.xxx.x.x.', 64), s_('max'), 0.5, bus='music')
    # mouth gone: scratch, then near silence, then the soft music box for the choice
    m.put(music_box([N['C4'], N['E4'], N['G4'], N['E4'], N['A3'], N['C4'], N['E4'], N['C4']], 0.42, s_('worst') - s_('last') + 0.2), s_('last'), 0.6, bus='music')
    m.put(party(s_('funny') - s_('worst'), 118) * 0.6, s_('worst'), 0.4, bus='music')
    m.put(music_box([N['F3'], N['A3'], N['C4'], N['A3'], N['C4'], N['E4'], N['G4'], N['E4']], 0.5, total - s_('funny') + 0.3), s_('funny'), 0.65, bus='music')
    m.put(E2.choir(E2.C, total - s_('told') + 0.3, 0.6), s_('told'), 0.35, bus='music')

    # ---- SFX
    for s in shots[1:]:
        m.put(whoosh(0.26), s['s'] - 0.1, 0.1, pan=rng.uniform(-0.3, 0.3))
    m.put(poof(), shot('lady_poof')['s'], 0.8); m.put(shimmer(1.2), shot('lady_poof')['s'] + 0.1, 0.5)
    m.put(E4.ding(), shot('rules_card')['s'] + 0.9, 0.4); m.put(E4.bonk(), shot('rules_card')['s'] + 1.5, 0.35)
    m.put(E4.trombone(), shot('grandpa_silent')['e'] - 1.3, 0.35)
    m.put(E4.ding(), shot('dad_bald')['s'] + 0.45, 0.5)
    m.put(E4.ding(), shot('list_reveal')['s'] + 0.1, 0.4)
    m.put(E2.gasp(), shot('zash_sweat')['s'], 0.5)
    m.put(poof(), shot('list_poof')['s'] + 0.05, 0.8)
    m.put(E4.bonk(), shot('counter_two')['s'] + 0.5, 0.7); m.put(E4.trombone(), shot('counter_two')['s'] + 0.7, 0.4)
    m.put(scream(shot('max_scream')['e'] - shot('max_scream')['s']), shot('max_scream')['s'], 0.6)
    m.put(poof(), shot('max_nomouth')['s'], 0.7); m.put(E4.scratch(), shot('max_nomouth')['s'] + 0.05, 0.8)
    m.put(shimmer(1.6), shot('zash_wish')['s'], 0.6); m.put(poof(), shot('max_back')['s'], 0.8)
    m.put(chime(N['C5'] * 2, 2.0), shot('flash_baby')['s'] + 0.1, 0.4)
    m.put(E4.ding(), shot('dad_bald_end')['s'] + 0.55, 0.5)


def mix(tl_path, voice_path, out_path):
    A.build_score = lambda m, tl: build(m, tl)
    A.build_sfx = lambda m, tl: None
    A.mix(tl_path, voice_path, out_path)
