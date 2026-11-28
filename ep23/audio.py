"""Episode 23 "Every Lie Makes You Old": a bouncy plucked bed for the funny half, soft piano from the turn on,
a pop on every instant-ageing gag, a clock tick + low note on each of Mom's lies, laughs on the bully, a warm lift at the end."""
import os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'sample'))
import audio_sample as A
from audio_sample import SR, t_, env, whoosh, shimmer
import importlib.util
def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
E22 = _load('ep22audio', os.path.join(HERE, '..', 'ep22', 'audio.py'))
rng = np.random.default_rng(123)


def pluck(f, d=0.35):
    t = t_(d); return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 14) * np.minimum(1, t * 400)
def bounce(total):
    """Original playful plucked loop (C - Am - F - G), 132 bpm."""
    n = int(total * SR) + SR; x = np.zeros(n); beat = 60 / 132
    ch = [[261.63, 329.63, 392], [220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66]]
    i = 0
    while i * beat < total:
        c = ch[(i // 4) % 4]; a0 = int(i * beat * SR)
        s = pluck(c[0] / 2, 0.4) * 0.6; x[a0:a0 + len(s)] += s
        a1 = int((i + 0.5) * beat * SR); s = (pluck(c[1]) + pluck(c[2])) * 0.3; x[a1:a1 + len(s)] += s
        i += 1
    y = x[:int(total * SR)]; g = int(0.8 * SR); y[-g:] *= np.linspace(1, 0, g); return y
def tick():
    t = t_(0.09); return np.sin(2 * np.pi * 2100 * t) * np.exp(-t * 70) * 0.8 + np.sin(2 * np.pi * 900 * t) * np.exp(-t * 50) * 0.4
def poof():
    return np.concatenate([E22.pop() * 0.9, np.zeros(10)])[:int(0.5 * SR)]


def build(m, tl):
    shots = tl['shots']; total = tl['dur']; seg = {s['id']: s for s in tl['segs']}
    def shot(n): return next(x for x in shots if x['name'] == n)
    turn = seg['shame']['start']
    m.put(bounce(turn + 0.4), 0.0, 0.34, bus='music')
    pn = E22.piano(total - turn + 0.3, seg['hungry']['start'] - turn); f = int(0.8 * SR); pn[:f] *= np.linspace(0, 1, f)
    m.put(pn, turn - 0.3, 0.46, bus='music')
    for s in shots:
        m.put(E22.softhit(), s['s'], 0.3); m.put(whoosh(0.22), max(0, s['s'] - 0.08), 0.07, pan=rng.uniform(-0.3, 0.3))
    m.put(A.riser(0.5) if hasattr(A, 'riser') else whoosh(0.4), 0.0, 0.15)
    for sid in ('cookie', 'teach', 'yes'):                       # instant-ageing gags
        m.put(poof(), seg[sid]['end'] + 0.08, 0.6); m.put(shimmer(0.7), seg[sid]['end'] + 0.1, 0.25)
    m.put(E22.scratch(), seg['age']['start'] - 0.12, 0.3)
    for w in seg['h1']['words']: m.put(E22.squeak(), w['s'] + 0.02, 0.45)
    m.put(E22.laughs(seg['bully']['end'] - seg['bully']['start'] + 0.5, 6), seg['bully']['start'] + 0.2, 0.4)
    for sid in ('ate', 'shoes', 'back', 'cycle', 'tired'):       # each lie: a clock tick as the wrinkle appears
        m.put(tick(), seg[sid]['end'] + 0.15, 0.55); m.put(tick(), seg[sid]['end'] + 0.33, 0.3)
    m.put(shimmer(1.6), seg['forme']['start'], 0.3)
    m.put(tick(), seg['hungry']['end'] + 0.2, 0.6); m.put(shimmer(2.0), seg['hungry']['end'] + 0.3, 0.4)
    m.put(E22.ding(), shot('end_card')['s'] + 0.15, 0.3)


def mix(tl_path, voice_path, out_path):
    A.build_score = lambda m, tl: build(m, tl)
    A.build_sfx = lambda m, tl: None
    A.mix(tl_path, voice_path, out_path)
