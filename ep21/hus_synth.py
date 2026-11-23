"""Builds a "hus" sound from scratch (no speech voice): breath puff "h" -> short "u" vowel -> sharp "s" hiss.
Shaped to match the reference rhythm: ~0.18 s per hus, ~0.20 s apart, groups of six."""
import numpy as np, soundfile as sf
from scipy.signal import lfilter, butter, sosfilt
SR = 48000
rng = np.random.default_rng(7)

def reson(x, f, bw):
    r = np.exp(-np.pi * bw / SR); th = 2 * np.pi * f / SR
    return lfilter([1 - r], [1, -2 * r * np.cos(th), r * r], x)

def bp(x, lo, hi, order=4):
    return sosfilt(butter(order, [lo, hi], btype='band', fs=SR, output='sos'), x)

def hus(f0=210, voice=0.55, breath=1.0, ss=1.0, dur=0.185, seed=0):
    r = np.random.default_rng(seed); n = int(dur * SR); t = np.arange(n) / SR
    # source: glottal buzz (voiced "u") + breath noise
    f = f0 * (1.08 - 0.12 * t / dur)                              # pitch falls a little, like an exhale
    ph = np.cumsum(f) / SR; buzz = 2 * (ph % 1) - 1
    noise = r.normal(0, 1, n)
    env_h = np.clip(t / 0.005, 0, 1) * np.exp(-np.clip(t - 0.03, 0, None) / 0.03)          # "h" puff: fast attack
    env_v = np.clip((t - 0.008) / 0.01, 0, 1) * np.clip((0.075 - t) / 0.02, 0, 1)        # short "u"
    src = buzz * env_v * voice + noise * env_h * breath * 0.6
    # vocal tract for the "u/uh" vowel: formants ~620 / 1150 / 2400 Hz
    tract = reson(src, 620, 110) * 1.0 + reson(src, 1150, 140) * 0.7 + reson(src, 2400, 220) * 0.35
    # "s": bright hiss 4.5-10 kHz, starts as the vowel ends, quick swell and fade
    env_s = np.clip((t - 0.06) / 0.018, 0, 1) * np.exp(-np.clip(t - 0.085, 0, None) / 0.045)
    sss = bp(noise, 4500, 10500) * env_s * ss * 0.55
    y = tract / (np.abs(tract).max() + 1e-9) * 0.9 + sss
    y *= np.clip((n - np.arange(n)) / (0.01 * SR), 0, 1)
    return y / (np.abs(y).max() + 1e-9)

def pattern(k=6, gap=0.20, **kw):
    out = np.zeros(int((k * gap + 0.3) * SR))
    for i in range(k):
        h = hus(seed=i, f0=kw.get('f0', 210) * (1 + 0.03 * ((i % 3) - 1)), **{a: b for a, b in kw.items() if a != 'f0'}) * (1.0 if i % 3 == 0 else 0.85)
        a = int(i * gap * SR); out[a:a + len(h)] += h
    return out / np.abs(out).max() * 0.9

if __name__ == '__main__':
    import subprocess
    A = pattern(f0=215, voice=0.45, breath=1.1, ss=1.0)              # breathy (closest to the clip)
    B = pattern(f0=200, voice=0.75, breath=0.8, ss=1.1)              # more voiced, punchier
    C = pattern(f0=230, voice=0.35, breath=1.2, ss=1.4, gap=0.17)    # faster, more hiss
    sil = np.zeros(int(0.8 * SR))
    demo = np.concatenate([A, sil, A, sil, B, sil, B, sil, C, sil, C])
    sf.write('ep21/sfx/hus_demo.wav', demo, SR)
    for nm, x in (('A', A), ('B', B), ('C', C)): sf.write(f'ep21/sfx/hus_{nm}.wav', x, SR)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', 'ep21/sfx/hus_demo.wav', '-af', 'loudnorm=I=-14:TP=-1.5', '-c:a', 'libmp3lame', '-b:a', '192k', 'ep21/out/hus_options_ABC.mp3'], check=True)
    print('ok', len(demo) / SR)
