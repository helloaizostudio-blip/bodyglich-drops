"""Replaces the w1/w2/w3 voice lines with tight, punchy "HUSS!" triplets (Zash's own voice, original recording made
with the same stock voice + pitch as the narrator). Rhythm: three hits ~0.2 s apart, a short breath, repeat.
Run after `make_sample.py voice`; rewrites voice_raw.wav and the caption words in timeline.json."""
import os, sys, json
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'voice'))
import voice_lab as VL
OUT = os.path.join(HERE, 'out'); SR = VL.SR
# the six "hus" hits cut from the trending sound the user supplied (only the hus hits, no narration)
HITS = [sf.read(os.path.join(HERE, 'sfx', f'hus_rec_{i}.wav'))[0] for i in range(6)]
v, sr = sf.read(os.path.join(OUT, 'voice_raw.wav')); tl = json.load(open(os.path.join(OUT, 'timeline.json')))
for s in tl['segs']:
    if s['id'] not in ('h1',): continue
    a, b = int(s['start'] * sr), int(s['end'] * sr); v[a:b] = 0
    hits = [0.0, 0.22, 0.42] + ([0.96, 1.20, 1.38] if s['id'] == 'h1' else [])
    words = []
    for i, h in enumerate(hits):
        p = a + int(h * sr); seg = HITS[i % 6]; m = min(len(seg), len(v) - p); v[p:p + m] += seg[:m]
        words.append(dict(w='HUS!', s=round(s['start'] + h, 3), e=round(s['start'] + h + 0.19, 3), red=True))
    s['words'] = words; s['text'] = ' '.join('Huss' for _ in hits)
sf.write(os.path.join(OUT, 'voice_raw.wav'), v, sr); json.dump(tl, open(os.path.join(OUT, 'timeline.json'), 'w'))
print('patched', [(s['id'], len(s['words'])) for s in tl['segs'] if s['id'].startswith('w')])
