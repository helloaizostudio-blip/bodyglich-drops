"""Episode 25 "The Only Topper": the user's background track (numbers_temporex) under the whole video, plus gag sounds."""
import os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'sample'))
import audio_sample as A
from audio_sample import SR, whoosh, shimmer
import importlib.util
def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
E22 = _load('ep22audio', os.path.join(HERE, '..', 'ep22', 'audio.py'))
rng = np.random.default_rng(125)


def build(m, tl):
    shots = tl['shots']; total = tl['dur']; seg = {s['id']: s for s in tl['segs']}
    def shot(n): return next(x for x in shots if x['name'] == n)
    E22.SONG = os.path.join(HERE, 'assets', 'numbers_temporex.mp3')
    m.put(E22.song(total), 0.0, E22.SONG_GAIN, bus='music')   # the user's track, in every video, start to end
    for s in shots:
        m.put(E22.softhit(), s['s'], 0.3); m.put(whoosh(0.22), max(0, s['s'] - 0.08), 0.07, pan=rng.uniform(-0.3, 0.3))
    m.put(A.riser(0.5), 0.0, 0.15)
    m.put(E22.laughs(seg['nerd']['end'] - seg['nerd']['start'] + 0.5, 6), seg['nerd']['start'] + 0.2, 0.4)
    m.put(E22.buzz(0.35), seg['dad']['end'] + 0.02, 0.15)
    m.put(shimmer(1.2), shot('stone_find')['s'] + 0.2, 0.3)
    fl = seg['stone']['end']
    m.put(E22.suck(0.5), fl - 0.45, 0.35); m.put(E22.boom(1.6), fl + 0.05, 0.5); m.put(E22.pop(), fl + 0.1, 0.5)
    m.put(E22.scratch(), seg['fish']['start'] - 0.15, 0.3); m.put(E22.squeak(), seg['fish']['end'] - 0.25, 0.4)
    m.put(E22.ding(), seg['zero']['start'] + 0.1, 0.3); m.put(shimmer(1.0), seg['marry']['start'], 0.3)
    d0 = seg['door']['end']
    m.put(A.bonk(), d0 + 0.1, 0.6); m.put(A.bonk(), d0 + 0.45, 0.6)
    m.put(E22.scratch(), seg['who']['start'] - 0.15, 0.3)
    m.put(E22.boom(1.4), shot('brick_study')['s'], 0.35); m.put(shimmer(1.6), shot('all_books')['s'], 0.25)
    m.put(E22.squeak(), seg['pencil']['end'] + 0.05, 0.4)
    m.put(E22.ding(), shot('end_card')['s'] + 0.5, 0.3)


def mix(tl_path, voice_path, out_path):
    A.build_score = lambda m, tl: build(m, tl)
    A.build_sfx = lambda m, tl: None
    A.mix(tl_path, voice_path, out_path)
