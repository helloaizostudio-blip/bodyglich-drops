#!/usr/bin/env python3
"""Build the sample episode end to end:  voice -> timeline -> render -> audio -> encode -> QA.

    python3 sample/make_sample.py all          # everything
    python3 sample/make_sample.py voice|render|audio|encode|qa

Config (env, all optional): BH_KOKORO_DIR, BH_WORKERS (render processes, default 2),
BH_W/BH_H (default 1080x1920), BH_FPS (30).
"""
import json, os, re, subprocess, sys
import numpy as np, soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, 'voice')); sys.path.insert(0, HERE)
OUT = os.path.join(HERE, 'out'); FR = os.path.join(OUT, 'frames')
W, H, FPS = int(os.environ.get('BH_W', 1080)), int(os.environ.get('BH_H', 1920)), int(os.environ.get('BH_FPS', 30))
SR = 24000
import script_sample as S


# ---------------------------------------------------------------- voice + timeline
def stage_voice():
    import voice_lab as VL
    k = VL.load_kokoro()
    clips, segs, t = [], [], 0.35          # small lead-in
    lead = np.zeros(int(0.35 * SR), np.float32); clips.append(lead)
    for (sid, who, tag, text, shots) in S.LINES:
        if tag == 'pause':
            n = int(0.6 * SR); clips.append(np.zeros(n, np.float32)); t += 0.6; continue
        V = S.VOICES[who]; T = VL.TAGS.get(tag, VL.TAGS['calm'])
        clean = text.replace('*', '')
        y, sr = k.create(clean, voice=V['voice'], speed=V['speed'] * T['speed'], lang='en-us')
        y = VL.trim(y)
        y = VL.pitch_shift(y, V['pitch'] * 2 ** (T['semi'] / 12))
        sents = re.findall(r'[^.!?]+[.!?]*', clean)
        end = 1.6 if clean.rstrip().endswith('?') else T['drop']
        y = VL.contour(y, end) * 10 ** (T['gain'] / 20)
        if tag == 'whisper':
            y = VL.ffmpeg_filter(y, 'highpass=f=300,treble=g=4')
        dur = len(y) / SR
        words = align_words(y, text, t)
        segs.append(dict(id=sid, who=who, tag=tag, text=clean, start=t, end=t + dur, words=words, shots=shots))
        clips.append(y.astype(np.float32)); t += dur
        gap = 0.12 if sid not in ('until', 'turn', 'figure') else 0.42   # longer beats before reveals
        clips.append(np.zeros(int(gap * SR), np.float32)); t += gap
    clips.append(np.zeros(int(1.6 * SR), np.float32)); t += 1.6     # tail for the final sting
    voice = np.concatenate(clips)
    os.makedirs(OUT, exist_ok=True)
    sf.write(os.path.join(OUT, 'voice_raw.wav'), voice, SR)
    # per-frame mouth envelope per speaker (drives lip-sync)
    env = {}
    for who in S.VOICES:
        e = np.zeros(int(t * FPS) + 2)
        for s in segs:
            if s['who'] != who: continue
            a = int(s['start'] * SR)
            seg = voice[a:int(s['end'] * SR)]
            for f in range(int(s['start'] * FPS), int(s['end'] * FPS)):
                i0 = int((f / FPS - s['start']) * SR); w = seg[max(0, i0 - 600):i0 + 600]
                if len(w): e[f] = float(np.sqrt(np.mean(w ** 2)))
        if e.max() > 0: e = np.clip(e / (np.percentile(e[e > 0], 90) + 1e-6), 0, 1)
        env[who] = [round(float(x), 3) for x in e]
    tl = dict(title=S.TITLE, dur=t, fps=FPS, segs=segs, mouth=env, shots=plan_shots(segs, t))
    json.dump(tl, open(os.path.join(OUT, 'timeline.json'), 'w'), indent=1)
    print(f"voice: {t:.1f}s, {sum(len(s['words']) for s in segs)} words, "
          f"{sum(len(s['words']) for s in segs) / (sum(s['end'] - s['start'] for s in segs) / 60):.0f} wpm while speaking, {len(tl['shots'])} shots")


def align_words(y, text, t0):
    """Word timings inside one line: split the voiced span by syllable weight, then snap each boundary
    to the quietest point within ±70 ms (the gaps between words)."""
    toks = re.findall(r"\*?[A-Za-z0-9']+[.,!?]*\*?", text)
    words = [dict(w=re.sub(r'[*.,!?]', '', x), red=x.startswith('*')) for x in toks]
    def syl(w): return max(1, len(re.findall(r'[aeiouy]+', w.lower())))
    wts = np.array([syl(w['w']) + 0.35 for w in words], float)
    n = len(y); cum = np.concatenate([[0], np.cumsum(wts)]) / wts.sum()
    hop = 120; rms = np.array([np.sqrt(np.mean(y[i:i + hop] ** 2)) for i in range(0, n, hop)])
    b = (cum * n).astype(int)
    for i in range(1, len(b) - 1):
        c = b[i] // hop; r = int(0.07 * SR / hop)
        lo, hi = max(0, c - r), min(len(rms), c + r + 1)
        b[i] = (lo + int(np.argmin(rms[lo:hi]))) * hop
    b = np.maximum.accumulate(b)
    for i, w in enumerate(words):
        w['s'] = round(t0 + b[i] / SR, 3); w['e'] = round(t0 + b[i + 1] / SR, 3)
    return words


def plan_shots(segs, total):
    """Each line's shots split its duration; cuts land on word starts so they feel motivated."""
    out = []
    for i, s in enumerate(segs):
        nxt = segs[i + 1]['start'] if i + 1 < len(segs) else total
        a, b = s['start'] - (0.0 if i else s['start']), nxt
        n = len(s['shots'])
        if not n: continue
        cuts = [a]
        for k in range(1, n):
            target = a + (b - a) * k / n
            ws = [w['s'] for w in s['words']]
            cuts.append(min(ws, key=lambda x: abs(x - target)) if ws else target)
        cuts.append(b)
        for k, name in enumerate(s['shots']):
            out.append(dict(name=name, s=round(cuts[k], 3), e=round(cuts[k + 1], 3), seg=s['id']))
    # stretch the final shot to the end
    out[-1]['e'] = round(total, 3)
    return out


# ---------------------------------------------------------------- render
def stage_render():
    os.makedirs(FR, exist_ok=True)
    tl = json.load(open(os.path.join(OUT, 'timeline.json')))
    n = int(tl['dur'] * FPS); workers = int(os.environ.get('BH_WORKERS', 2))
    todo = [f for f in range(n) if not os.path.exists(os.path.join(FR, f'{f:04d}.jpg'))]
    if not todo: print('render: all frames present'); return
    chunks = [todo[i::workers] for i in range(workers)]
    procs = [subprocess.Popen(['node', os.path.join(HERE, 'render_sample.mjs'), ','.join(map(str, c)), str(W), str(H)]) for c in chunks if c]
    rc = [p.wait() for p in procs]
    if any(rc): sys.exit(f'render failed: {rc}')


# ---------------------------------------------------------------- audio
def stage_audio():
    import audio_sample
    audio_sample.mix(os.path.join(OUT, 'timeline.json'), os.path.join(OUT, 'voice_raw.wav'), os.path.join(OUT, 'mix.wav'))


# ---------------------------------------------------------------- encode
def stage_encode():
    mp4 = os.path.join(OUT, 'blockheads_sample_midnight_lights.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', os.path.join(FR, '%04d.jpg'), '-i', os.path.join(OUT, 'mix.wav'),
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
                    '-shortest', '-movflags', '+faststart', mp4], check=True)
    print('encode:', mp4)


# ---------------------------------------------------------------- QA
def stage_qa():
    mp4 = os.path.join(OUT, 'blockheads_sample_midnight_lights.mp4'); tl = json.load(open(os.path.join(OUT, 'timeline.json')))
    pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_name,width,height,r_frame_rate,nb_frames:format=duration',
                                    '-of', 'json', mp4], capture_output=True, text=True).stdout)
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', mp4, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1]; TP = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r)[-1]
    # contact sheet: one frame per shot (middle)
    sheet = os.path.join(OUT, 'contact_sheet.jpg')
    mids = [round((s['s'] + s['e']) / 2 * FPS) for s in tl['shots']]
    sel = '+'.join(f'eq(n\\,{m})' for m in mids)
    cols = 8; rows = (len(mids) + cols - 1) // cols
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp4, '-vf', f"select='{sel}',scale=270:480,tile={cols}x{rows}", '-frames:v', '1', '-vsync', 'vfr', sheet], check=True)
    # black / frozen frame checks
    bl = subprocess.run(['ffmpeg', '-hide_banner', '-i', mp4, '-vf', 'blackdetect=d=0.3:pix_th=0.06', '-an', '-f', 'null', '-'], capture_output=True, text=True).stderr
    blacks = re.findall(r'black_start:([\d.]+) black_end:([\d.]+)', bl)
    # caption sync: every word shown within its spoken window (by construction) - report coverage
    words = [w for s in tl['segs'] for w in s['words']]
    short = [w['w'] for w in words if w['e'] - w['s'] < 0.06]
    shots = tl['shots']; lens = [s['e'] - s['s'] for s in shots]
    rep = [f"# QA report: {tl['title']}", '',
           f"- File: `{os.path.basename(mp4)}`",
           f"- Video: {pr['streams'][0]['codec_name']} {pr['streams'][0]['width']}x{pr['streams'][0]['height']} @ {pr['streams'][0]['r_frame_rate']}, {pr['streams'][0].get('nb_frames')} frames",
           f"- Audio: {pr['streams'][1]['codec_name']}",
           f"- Duration: {float(pr['format']['duration']):.2f} s",
           f"- Loudness: {I} LUFS integrated (target -14), true peak {TP} dBFS",
           f"- Shots: {len(shots)}, average {np.mean(lens):.2f} s, shortest {min(lens):.2f} s, longest {max(lens):.2f} s",
           f"- Caption words: {len(words)}; words shorter than 60 ms: {len(short)} {short[:6]}",
           f"- Black segments over 0.3 s: {blacks if blacks else 'none'}",
           f"- Contact sheet: `contact_sheet.jpg` (one frame per shot)"]
    open(os.path.join(OUT, 'QA.md'), 'w').write('\n'.join(rep) + '\n'); print('\n'.join(rep))


if __name__ == '__main__':
    st = sys.argv[1] if len(sys.argv) > 1 else 'all'
    for name in (['voice', 'render', 'audio', 'encode', 'qa'] if st == 'all' else [st]):
        globals()['stage_' + name]()
