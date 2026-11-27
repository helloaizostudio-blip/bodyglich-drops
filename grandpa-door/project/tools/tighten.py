"""Tighten the ElevenLabs take: shorten silences (keeping a few comedic holds), speed up with atempo (pitch kept),
and remap the Scribe word times through the edit -> data/narration.wav, data/lines.json, data/words.json."""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np
from scipy.io import wavfile

P = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
F = 1.18                     # speed-up (atempo)
SR = 44100
LEAD, TAIL = 0.15, 0.35
DEFAULT_GAP = 0.16
HOLDS = {'through.': 0.42, '1961.': 0.22, 'grandpa.': 0.28, 'away.': 0.22, 'elevator.': 0.3, 'hours.': 0.25, 'doors.': 0.18, 'week.': 0.32}
BEFORE = {'oh': 0.5, 'not': 0.12}

S = json.loads((P / 'script.json').read_text())
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(P / 'data/el_raw.mp3'), '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768

# silences from ffmpeg
out = subprocess.run(['ffmpeg', '-i', str(P / 'data/el_raw.mp3'), '-af', 'silencedetect=noise=-38dB:d=0.22', '-f', 'null', '-'], capture_output=True, text=True).stderr
st = [float(v) for v in re.findall(r'silence_start: ([0-9.]+)', out)]; en = [float(v) for v in re.findall(r'silence_end: ([0-9.]+)', out)]
sil = list(zip(st, en))
W = [w for w in json.loads((P / 'data/el_words.json').read_text())['words'] if w.get('type', 'word') == 'word' and not w['text'].startswith('[') and not w['text'].endswith(']')]
norm = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())

# target gap for each silence: by the word that ends before it / starts after it
segs, t_prev = [], 0.0
for a, b in sil:
    before = [w for w in W if w['start'] < a + 0.05]; after = [w for w in W if w['start'] >= a]
    wb = before[-1]['text'].lower() if before else ''; wa = norm(after[0]['text']) if after else ''
    g = HOLDS.get(wb, DEFAULT_GAP); g = max(g, BEFORE.get(wa, 0))
    g = min(g, b - a)
    pad = 0.04                                                  # keep a little breath on each side
    segs.append((a + pad, b - pad, max(0.0, g - 2 * pad)))
# build the cut list and a time map
pieces, tmap, cur, src = [], [], 0.0, 0.0
for a, b, g in segs:
    if b <= a: continue
    pieces.append(x[int(src * SR):int(a * SR)]); tmap.append((src, a, cur)); cur += a - src
    gl = int(g * SR); pieces.append(np.zeros(gl, np.float32)); tmap.append((a, b, cur, g)); cur += g; src = b
pieces.append(x[int(src * SR):]); tmap.append((src, len(x) / SR, cur))
y = np.concatenate(pieces)
def remap(t):
    for m in tmap:
        if m[0] <= t <= m[1]:
            if len(m) == 3: return m[2] + (t - m[0])
            return m[2] + (t - m[0]) / (m[1] - m[0]) * m[3]
    return tmap[-1][2] + (t - tmap[-1][0])
y = np.concatenate([np.zeros(int(LEAD * F * SR), np.float32), y, np.zeros(int(TAIL * F * SR), np.float32)])
wavfile.write(str(P / 'data/tight.wav'), SR, (np.clip(y, -1, 1) * 32767).astype(np.int16))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(P / 'data/tight.wav'), '-af', f'atempo={F},loudnorm=I=-16:TP=-1.5:LRA=9', '-ar', '24000', '-ac', '1', str(P / 'data/narration.wav')], check=True)
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(P / 'data/narration.wav')], capture_output=True, text=True).stdout)
T = lambda t: (remap(t) + LEAD * F) / F

# align script words to Scribe words in order
words, k = [], 0
for i, ln in enumerate(S['lines']):
    for tok in ln['text'].split():
        n = norm(tok)
        while k < len(W) and norm(W[k]['text']) != n: k += 1
        if k >= len(W): raise SystemExit(f'word not found: {tok} (line {i})')
        w = W[k]; k += 1
        e = min(w['end'], w['start'] + 0.55 + 0.06 * len(n))      # Scribe ends include trailing silence
        words.append({'w': tok, 'line': i, 's': round(T(w['start']), 3), 'e': round(T(e), 3)})
lines = []
for i, ln in enumerate(S['lines']):
    ws = [w for w in words if w['line'] == i]
    lines.append({'i': i, 'text': ln['text'], 'start': ws[0]['s'], 'end': ws[-1]['e']})
(P / 'data/words.json').write_text(json.dumps(words, indent=1))
(P / 'data/lines.json').write_text(json.dumps({'duration': round(dur, 3), 'lines': lines}, indent=1))
(P / 'data/words.txt').write_text('\n'.join(f"{w['s']:7.2f} {w['e']:7.2f}  L{w['line']:<2d} {w['w']}" for w in words))
print(f'narration {dur:.2f} s (raw 58.64), {len(words)} words, {len(lines)} lines')
for l in lines: print(f"{l['i']:2d} {l['start']:6.2f}-{l['end']:6.2f}  {l['text']}")
