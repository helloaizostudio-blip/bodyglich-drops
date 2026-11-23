"""Replaces the w1/w2/w3 voice lines with tight, punchy "HUSS!" triplets (Zash's own voice, original recording made
with the same stock voice + pitch as the narrator). Rhythm: three hits ~0.2 s apart, a short breath, repeat.
Run after `make_sample.py voice`; rewrites voice_raw.wav and the caption words in timeline.json."""
import os, sys, json
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'voice'))
import voice_lab as VL
OUT = os.path.join(HERE, 'out'); SR = VL.SR
k = VL.load_kokoro()
y, _ = k.create("Huss!", voice='am_echo', speed=1.25 / 1.2, lang='en-us'); y = VL.trim(y)
y = VL.ffmpeg_filter(y, f"asetrate={SR}*1.2,aresample={SR}")                     # Zash's pitch, same as narration
y = VL.ffmpeg_filter(y, "atempo=1.6,highpass=f=90,equalizer=f=3200:t=q:w=1.4:g=3,acompressor=threshold=-24dB:ratio=4:attack=2:release=60:makeup=4,alimiter=limit=0.95")
L = int(0.19 * SR); y = y[:L] if len(y) > L else np.pad(y, (0, L - len(y)))
y *= np.minimum(1, np.arange(L) / (0.004 * SR)) * np.minimum(1, (L - np.arange(L)) / (0.03 * SR)); y = y / np.abs(y).max() * 0.9
sf.write(os.path.join(HERE, 'sfx', 'huss_zash.wav'), y, SR)
v, sr = sf.read(os.path.join(OUT, 'voice_raw.wav')); tl = json.load(open(os.path.join(OUT, 'timeline.json')))
for s in tl['segs']:
    if s['id'] not in ('w1', 'w2', 'w3'): continue
    a, b = int(s['start'] * sr), int(s['end'] * sr); v[a:b] = 0
    hits = [0.0, 0.21, 0.42] + ([0.80, 1.01, 1.22] if s['id'] == 'w1' else [])
    words = []
    for i, h in enumerate(hits):
        p = a + int(h * sr); seg = y * (1.0 if i % 3 == 0 else 0.9); m = min(len(seg), len(v) - p); v[p:p + m] += seg[:m]
        words.append(dict(w='HUSS!', s=round(s['start'] + h, 3), e=round(s['start'] + h + 0.19, 3), red=True))
    s['words'] = words; s['text'] = ' '.join('Huss' for _ in hits)
sf.write(os.path.join(OUT, 'voice_raw.wav'), v, sr); json.dump(tl, open(os.path.join(OUT, 'timeline.json'), 'w'))
print('patched', [(s['id'], len(s['words'])) for s in tl['segs'] if s['id'].startswith('w')])
