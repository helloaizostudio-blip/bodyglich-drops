#!/usr/bin/env python3
"""Blockheads voice lab.

Renders the same three test lines (calm, scared, emotional) with several Kokoro
voice candidates, measures pitch median / p10 / p90 and words per minute, and
writes one combined MP3 (with spoken "Option N" labels) plus a metrics table.

    python3 voice/voice_lab.py                 # all candidates
    python3 voice/voice_lab.py --only 1,5      # a subset

Paths come from config (env or defaults relative to the repo):
    BH_KOKORO_DIR  folder with kokoro-v1.0.onnx and voices-v1.0.bin
    BH_OUT         output folder (default: voice/out)
"""
import argparse, json, os, re, subprocess, sys, tempfile
import numpy as np, soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
KOKORO_DIR = os.environ.get('BH_KOKORO_DIR', os.path.join(HERE, '..', 'models', 'kokoro'))
OUT = os.environ.get('BH_OUT', os.path.join(HERE, 'out'))
SR = 24000

# The three test lines. Tags drive the expressive delivery: [calm] [tense] [whisper] [excited] [sad] [pause]
LINES = [
    ("calm",      "[calm] In my town, every night at midnight, the streetlights turn off. All of them. And nobody is allowed outside until they come back on."),
    ("scared",    "[tense] Until last Friday. [whisper] The lights went out, and Liza wasn't home. [tense] I grabbed the flashlight and opened the door. Was that a mistake?"),
    ("emotional", "[sad] Dad didn't say anything. He just held the jacket I'd been looking for all year. [pause] Then he smiled and said, [calm] you found it, kiddo."),
]

# Per-tag delivery: speed multiplier, extra pitch (semitones), gain (dB), end-of-sentence drop (semitones)
TAGS = {
    'calm':    dict(speed=1.00, semi=0.0,  gain=0.0,  drop=-1.2),
    'tense':   dict(speed=1.06, semi=0.6,  gain=1.0,  drop=-0.6),
    'whisper': dict(speed=0.97, semi=-0.4, gain=-5.0, drop=-0.8),
    'excited': dict(speed=1.10, semi=1.5,  gain=2.0,  drop=0.0),
    'sad':     dict(speed=0.92, semi=-0.8, gain=-1.5, drop=-1.8),
}

# Candidates: (label, voice or blend, speed, pitch factor, expressive?)
CANDIDATES = [
    ("Current: am_puck 1.15, pitch 1.26",            'am_puck',             1.15, 1.26, False),
    ("am_liam 1.12, pitch 1.40",                     'am_liam',             1.12, 1.40, False),
    ("am_liam 1.12, pitch 1.30",                     'am_liam',             1.12, 1.30, False),
    ("am_puck 1.12, pitch 1.38",                     'am_puck',             1.12, 1.38, False),
    ("Blend 50/50 puck + liam 1.12, pitch 1.36",     ('am_puck', 'am_liam'), 1.12, 1.36, False),
    ("am_liam 1.12, pitch 1.40, expressive tags",    'am_liam',             1.12, 1.40, True),
    ("Blend 50/50 1.12, pitch 1.36, expressive tags", ('am_puck', 'am_liam'), 1.12, 1.36, True),
]

GAP_SENT = 0.09     # gap between sentences (s)
GAP_PAUSE = 0.55    # [pause] before reveals (s)


def load_kokoro():
    from kokoro_onnx import Kokoro
    m, v = os.path.join(KOKORO_DIR, 'kokoro-v1.0.onnx'), os.path.join(KOKORO_DIR, 'voices-v1.0.bin')
    if not (os.path.exists(m) and os.path.exists(v)):
        sys.exit(f"Kokoro model files not found in {KOKORO_DIR}. Set BH_KOKORO_DIR.")
    return Kokoro(m, v)


def style(k, voice):
    if isinstance(voice, tuple):
        return np.mean([k.get_voice_style(v) for v in voice], axis=0)
    return voice


def ffmpeg_filter(y, af):
    with tempfile.TemporaryDirectory() as d:
        a, b = os.path.join(d, 'a.wav'), os.path.join(d, 'b.wav')
        sf.write(a, y, SR)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a, '-af', af, '-ar', str(SR), '-ac', '1', b], check=True)
        out, _ = sf.read(b)
    return out.astype(np.float32)


def pitch_shift(y, factor):
    """Same method as the production pipeline (vomake.py): resample up, then restore tempo."""
    if abs(factor - 1) < 1e-3:
        return y
    return ffmpeg_filter(y, f"asetrate={SR}*{factor:.4f},aresample={SR},atempo={1/factor:.4f}")


def contour(y, semis_end, tail=0.45):
    """Small pitch contour over the last `tail` seconds (rise for questions, drop for statements).
    Time-varying resample: local pitch + tempo change, kept subtle (≤ 2 semitones)."""
    n = len(y); t = int(min(tail * SR, n * 0.6))
    if t < 10 or abs(semis_end) < 0.05:
        return y
    r = np.ones(n)
    ramp = np.linspace(0, 1, t) ** 1.6
    r[n - t:] = 2 ** (semis_end * ramp / 12)
    pos = np.concatenate([[0], np.cumsum(r)[:-1]])
    pos = pos[pos < n - 1]
    return np.interp(pos, np.arange(n), y).astype(np.float32)


def split_tagged(text):
    """'[calm] a. b? [sad] c.' -> [('calm','a.'),('calm','b?'),('sad','c.'),...] with ('pause',None) markers"""
    parts, tag = [], 'calm'
    for tok in re.split(r'(\[[a-z]+\])', text):
        tok = tok.strip()
        if not tok:
            continue
        m = re.fullmatch(r'\[([a-z]+)\]', tok)
        if m:
            if m.group(1) == 'pause':
                parts.append(('pause', None))
            else:
                tag = m.group(1)
            continue
        for s in re.findall(r'[^.!?]+[.!?]*', tok):
            if s.strip():
                parts.append((tag, s.strip()))
    return parts


def render_line(k, cand, text):
    label, voice, speed, pitch, expressive = cand
    st = style(k, voice)
    chunks = []
    for tag, sent in split_tagged(text):
        if tag == 'pause':
            chunks.append(np.zeros(int(GAP_PAUSE * SR), np.float32)); continue
        T = TAGS.get(tag, TAGS['calm']) if expressive else dict(speed=1, semi=0, gain=0, drop=0)
        y, sr = k.create(sent, voice=st, speed=speed * T['speed'], lang='en-us')
        assert sr == SR
        y = trim(y)
        y = pitch_shift(y, pitch * 2 ** (T['semi'] / 12))
        if expressive:
            end = 1.6 if sent.endswith('?') else T['drop']
            y = contour(y, end)
            y = y * 10 ** (T['gain'] / 20)
            if tag == 'whisper':
                y = ffmpeg_filter(y, 'highpass=f=300,treble=g=4')
        chunks.append(y)
        chunks.append(np.zeros(int(GAP_SENT * SR), np.float32))
    return np.concatenate(chunks[:-1]) if chunks else np.zeros(1, np.float32)


def trim(y, thr=0.01):
    idx = np.where(np.abs(y) > thr)[0]
    if not len(idx):
        return y
    a, b = max(0, idx[0] - int(0.02 * SR)), min(len(y), idx[-1] + int(0.04 * SR))
    return y[a:b]


def master(y):
    """High-pass 80 Hz, gentle compression, de-ess, loudness -14 LUFS (two-pass loudnorm)."""
    pre = 'highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=90:makeup=2,deesser=i=0.4:m=0.5:f=0.5'
    with tempfile.TemporaryDirectory() as d:
        a = os.path.join(d, 'a.wav'); sf.write(a, y, SR)
        r = subprocess.run(['ffmpeg', '-hide_banner', '-i', a, '-af', pre + ',loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json', '-f', 'null', '-'],
                           capture_output=True, text=True)
        j = json.loads(r.stderr[r.stderr.rfind('{'):])
        ln = (f"loudnorm=I=-14:TP=-1.5:LRA=9:measured_I={j['input_i']}:measured_TP={j['input_tp']}:"
              f"measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
        return ffmpeg_filter(y, pre + ',' + ln)


def metrics(y, text):
    import librosa
    f0, vf, _ = librosa.pyin(y.astype(np.float64), fmin=70, fmax=500, sr=SR, frame_length=1024, hop_length=256)
    f = f0[vf & ~np.isnan(f0)]
    words = len(re.findall(r"[A-Za-z']+", re.sub(r'\[[a-z]+\]', '', text)))
    return dict(median=float(np.median(f)), p10=float(np.percentile(f, 10)), p90=float(np.percentile(f, 90)),
                wpm=words / (len(y) / SR) * 60, dur=len(y) / SR, words=words)


def lufs(y):
    import pyloudnorm as pyln
    return pyln.Meter(SR).integrated_loudness(y.astype(np.float64))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', help='comma list of option numbers (1-based)')
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    k = load_kokoro()
    sel = [int(x) for x in a.only.split(',')] if a.only else list(range(1, len(CANDIDATES) + 1))
    announcer = 'af_heart'
    reel, rows = [], []
    for n in sel:
        cand = CANDIDATES[n - 1]
        ann, _ = k.create(f"Option {n}.", voice=announcer, speed=1.0, lang='en-us')
        reel += [trim(ann) * 0.6, np.zeros(int(0.35 * SR), np.float32)]
        per = []
        for name, text in LINES:
            y = render_line(k, cand, text)
            m = metrics(y, text); m['line'] = name; per.append(m)
            reel += [master(y), np.zeros(int(0.6 * SR), np.float32)]
        allw = sum(m['words'] for m in per); alld = sum(m['dur'] for m in per)
        row = dict(n=n, label=cand[0], median=np.mean([m['median'] for m in per]), p10=np.mean([m['p10'] for m in per]),
                   p90=np.mean([m['p90'] for m in per]), wpm=allw / alld * 60, lines=per)
        rows.append(row)
        print(f"{n}. {cand[0]:<48} median {row['median']:5.0f} Hz  p10-p90 {row['p10']:4.0f}-{row['p90']:4.0f}  {row['wpm']:4.0f} wpm", flush=True)
        reel.append(np.zeros(int(0.5 * SR), np.float32))
    full = np.concatenate(reel)
    wav = os.path.join(OUT, 'voice_lab.wav'); mp3 = os.path.join(OUT, 'voice_lab.mp3')
    sf.write(wav, full, SR)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '160k', mp3], check=True)
    with open(os.path.join(OUT, 'voice_lab_metrics.json'), 'w') as f:
        json.dump(rows, f, indent=1)
    md = ['| # | Candidate | Median Hz | p10–p90 Hz | WPM |', '|---|---|---|---|---|']
    md += [f"| {r['n']} | {r['label']} | {r['median']:.0f} | {r['p10']:.0f}–{r['p90']:.0f} | {r['wpm']:.0f} |" for r in rows]
    md += ['', 'Target (reference narrators): median 155–190 Hz, p10–p90 about 125–260 Hz, 200–220 WPM.']
    open(os.path.join(OUT, 'voice_lab_metrics.md'), 'w').write('\n'.join(md) + '\n')
    print(f"\nwrote {mp3}  (loudness {lufs(full):.1f} LUFS overall incl. gaps)")


if __name__ == '__main__':
    main()
