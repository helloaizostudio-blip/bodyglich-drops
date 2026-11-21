#!/usr/bin/env python3
"""Re-edit a finished episode without re-rendering: cold open + kept lines + on-screen hook/share/follow text.
usage: recut.py <episode dir> <out.mp4> <cold_open_seg> <keep ids comma|ALL> [--cta-len S]"""
import json, subprocess, sys, os
ep, outp, cold, keep = sys.argv[1:5]; cta_len = float(sys.argv[sys.argv.index('--cta-len') + 1]) if '--cta-len' in sys.argv else None
tl = json.load(open(os.path.join(ep, 'out/timeline.json'))); segs = tl['segs']; dur = tl['dur']
src = [f for f in os.listdir(os.path.join(ep, 'out')) if f.startswith('blockheads_') and f.endswith('.mp4') and 'share' not in f and 'cut' not in f][0]
src = os.path.join(ep, 'out', src)
ids = [s['id'] for s in segs] if keep == 'ALL' else keep.split(',')
def span(i):
    s = segs[i]; nx = segs[i + 1]['start'] if i + 1 < len(segs) else dur
    a = 0.3 if i == 0 else s['start']
    if s['id'] == 'cta' and cta_len: nx = min(nx, s['start'] + cta_len)
    return a, nx
iv = []
c = next(i for i, s in enumerate(segs) if s['id'] == cold); ca = segs[c]['start']; iv.append((ca, ca + 1.05))
for i, s in enumerate(segs):
    if s['id'] in ids:
        a, b = span(i)
        if iv and abs(iv[-1][1] - a) < 1e-3 and len(iv) > 1: iv[-1] = (iv[-1][0], b)
        else: iv.append((a, b))
# output-time position of a segment id
def out_t(sid):
    s = next(x for x in segs if x['id'] == sid)
    t = iv[0][1] - iv[0][0]
    for a, b in iv[1:]:
        if a - 1e-3 <= s['start'] < b: return t + (s['start'] - a)
        t += b - a
    return None
total = sum(b - a for a, b in iv)
import tempfile
tmp = tempfile.mkdtemp(dir=os.environ.get('BH_TMP', None)); lst = os.path.join(tmp, 'list.txt')
with open(lst, 'w') as L:
    for k, (a, b) in enumerate(iv):
        pf = os.path.join(tmp, f'p{k:02d}.mp4')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{a:.3f}', '-i', src, '-t', f'{b - a:.3f}', '-af', f'afade=t=in:d=0.02,afade=t=out:st={max(0, b - a - 0.03):.3f}:d=0.03',
                        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '12', '-pix_fmt', 'yuv420p', '-c:a', 'pcm_s16le', '-ar', '48000', pf.replace('.mp4', '.mov')], check=True)
        L.write(f"file '{pf.replace('.mp4', '.mov')}'\n")
joined = os.path.join(tmp, 'joined.mov')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', joined], check=True)
fc = []
F = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets/LuckiestGuy.ttf')
def dt(text, y, size, start, end, col='white', box=None):
    b = f":box=1:boxcolor={box}:boxborderw=22" if box else ''
    return f"drawtext=fontfile={F}:text='{text}':fontsize={size}:fontcolor={col}:borderw=8:bordercolor=0x0d0d12{b}:x=(w-text_w)/2:y={y}:enable='between(t,{start:.2f},{end:.2f})'"
ov = [dt('POV\\: YOUR FACE', 150, 82, 0, 3.4, '0xffd23f'), dt('DECIDES YOUR SUPERPOWER', 250, 70, 0, 3.4)]
fol = out_t('named'); end = out_t('end')
if fol: ov.append(dt('FOLLOW FOR MORE', 1180, 64, fol, fol + 2.6, 'white', '0xd62a2a@0.92'))
if end: ov.append(dt('SEND THIS TO YOUR', 150, 70, end, total, '0xffd23f')); ov.append(dt('CHOPPED FRIEND', 240, 82, end, total))
cmd = ['ffmpeg', '-v', 'error', '-y', '-i', joined, '-vf', ','.join(ov), '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-maxrate', '16M', '-bufsize', '32M', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outp]
subprocess.run(cmd, check=True); print(f'wrote {outp}: {total:.1f}s, {len(iv)} pieces')
