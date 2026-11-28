"""Episode 2 "The Wall": epic anime-style score + SFX, mixed with the voice.

Score: war drums (low toms), a synth "choir" (vowel formant pads), strings ostinato for the climb,
a big brass-like hit on the bell, a soaring major lift on the swing, a quiet warm piano-ish moment
for Dad, and a cold drone + low hit for the twist. Reuses the synth/mix helpers from the sample.
"""
import os, sys, json
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sample'))
import audio_sample as A
from audio_sample import SR, t_, env, tone, noise, lp_fast, hp_fast, sweep, Mix, pad, whoosh, step, clack, heartbeat, sting, riser, shimmer, power_up

rng = np.random.default_rng(22)


def tom(f=70, d=0.6, g=1.0):
    t = t_(d); fq = f * (1 + 0.6 * np.exp(-t * 18)); ph = 2 * np.pi * np.cumsum(fq) / SR
    return (np.sin(ph) * np.exp(-t * 5) + lp_fast(noise(d), 400) * np.exp(-t * 25) * 0.4) * g
def drums(bpm, d, pattern='x..x..x.x.x.....', f=62):
    beat = 60 / bpm / 4; x = np.zeros(int(d * SR) + SR); k = 0
    while k * beat < d:
        if pattern[k % len(pattern)] == 'x':
            h = tom(f * (1.0 if k % 8 else 0.85), 0.6, 0.9 if k % 4 else 1.1); a = int(k * beat * SR); x[a:a + len(h)] += h
        k += 1
    return x[:int(d * SR)]
def choir(notes, d, bright=0.5):
    """Vowel 'aah' pad: detuned saws through two formant band-pass bumps."""
    t = t_(d); x = np.zeros(len(t))
    for f in notes:
        for det in (-0.25, 0, 0.22):
            x += A.tone(f * (1 + det / 100), d, 'saw') * 0.1
    from scipy.signal import butter, lfilter
    out = np.zeros_like(x)
    for fc, bw, g in ((700, 300, 1.0), (1150, 300, 0.6 + bright * 0.4), (2600, 500, 0.25)):
        b, a = butter(2, [max(50, fc - bw / 2) / (SR / 2), (fc + bw / 2) / (SR / 2)], btype='band'); out += lfilter(b, a, x) * g
    vib = 1 + 0.03 * np.sin(2 * np.pi * 5 * t)
    return out * env(len(out), 0.6, 0.8) * vib * 2.2
def strings(notes, d, rate=8):
    """Fast ostinato (anime climb energy)."""
    x = np.zeros(int(d * SR)); step_ = 1 / rate; k = 0
    while k * step_ < d - 0.05:
        f = notes[k % len(notes)]; n = tone(f, step_ * 0.95, 'saw') * env(int(step_ * 0.95 * SR), 0.005, 0.04); n = lp_fast(n, 2400)
        a = int(k * step_ * SR); x[a:a + len(n)] += n[:len(x) - a] * 0.25; k += 1
    return x
def hit(d=2.4):
    t = t_(d); x = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * k) for f, k in ((55, 1.2), (110, 1.6), (164.8, 2.0), (220, 2.4)))
    tm = tom(48, 1.2, 1.4); tm = np.pad(tm, (0, max(0, len(t) - len(tm))))[:len(t)]
    return x * 0.5 + tm
def big_bell(d=4.0):
    t = t_(d); return sum(np.sin(2 * np.pi * f * t) * a * np.exp(-t * k) for f, a, k in ((130.8, 1, 0.6), (261.6, 0.6, 0.9), (392, 0.4, 1.2), (523, 0.3, 1.7), (155.6, 0.35, 0.8), (659, 0.15, 2.4))) * 0.55
def crumble(d=2.2):
    x = lp_fast(noise(d), 300) * 2.5 * np.exp(-t_(d) * 1.2)
    for _ in range(26):
        a = int(rng.uniform(0, d - 0.1) * SR); c = hp_fast(noise(0.05), 800) * np.exp(-np.linspace(0, 12, int(0.05 * SR))) * rng.uniform(0.3, 0.9); x[a:a + len(c)] += c
    return x
def giant_step():
    d = 1.2; t = t_(d); return (np.sin(2 * np.pi * 34 * t) * np.exp(-t * 4) * 1.6 + lp_fast(noise(d), 160) * np.exp(-t * 6) * 2.0) * 0.9
def snap():
    d = 0.18; x = hp_fast(noise(d), 1800) * np.exp(-t_(d) * 35); return x * 1.4 + sweep(1800, 300, d) * np.exp(-t_(d) * 20) * 0.4
def zip_(d):
    t = t_(d); return hp_fast(noise(d), 2500) * (0.3 + 0.2 * np.sin(2 * np.pi * 30 * t)) * env(len(t), 0.05, 0.2) * 0.6
def chirp():
    x = np.zeros(int(0.5 * SR))
    for k in range(3):
        c = sweep(2600, 4200, 0.07) * env(int(0.07 * SR), 0.005, 0.03) * 0.3; a = int(k * 0.12 * SR); x[a:a + len(c)] += c
    return x
def thud():
    d = 0.4; return lp_fast(noise(d), 300) * np.exp(-t_(d) * 14) * 2.2 + tone(60, d) * np.exp(-t_(d) * 12) * 0.8
def gasp():
    d = 0.6; return lp_fast(hp_fast(noise(d), 600), 3000) * env(int(d * SR), 0.05, 0.4) * 0.35
def boop():
    a = tone(523.25, 0.12, 'tri') * env(int(0.12 * SR), 0.005, 0.08); b = tone(659.3, 0.22, 'tri') * env(int(0.22 * SR), 0.005, 0.15)
    return np.concatenate([a, np.zeros(int(0.03 * SR)), b]) * 0.45


Dm = [146.8, 174.6, 220.0]; Bb = [116.5, 146.8, 174.6]; F = [174.6, 220.0, 261.6]; C = [130.8, 164.8, 196.0]; Am = [110.0, 130.8, 164.8]; G = [98.0, 123.5, 146.8]


def build(m, tl):
    seg = {s['id']: s for s in tl['segs']}; shots = tl['shots']
    def s_(i): return seg[i]['start']
    def e_(i): return seg[i]['end']
    def shot(n): return next(x for x in shots if x['name'] == n)
    total = tl['dur']
    def choirs(prog, a, b, gain, step=2.2, bright=0.5):
        t = a; i = 0
        while t < b - 0.1:
            d = min(step, b - t); m.put(choir(prog[i % len(prog)], d + 0.5, bright), t, gain, bus='music'); t += d; i += 1
    # 1. opening: choir + war drums (epic)
    choirs([Dm, Bb, F, C], 0.0, s_('adapt1'), 0.5, 2.4, 0.4)
    m.put(drums(96, s_('adapt1') - 0.2), 0.0, 0.55, bus='music')
    m.put(hit(), s_('rule2'), 0.5, bus='music')
    # 2. town life: light, bouncy (major) - pads + soft drums
    t = s_('adapt1'); prog = ['C', 'G', 'Am', 'F']; i = 0
    while t < s_('history'):
        d = min(1.8, s_('history') - t); m.put(pad(prog[i % 4], d + 0.4, 0.9), t, 0.45, bus='music'); t += d; i += 1
    m.put(drums(120, s_('history') - s_('adapt2'), 'x...x.x.x...x.x.', 90), s_('adapt2'), 0.28, bus='music')
    # 3. Dad memory + Zash's fear: quiet choir
    choirs([Am, F, C, G], s_('history'), s_('ring1'), 0.35, 2.4, 0.2)
    # 4. bells -> crack: drums + choir rise
    choirs([Dm, Bb], s_('ring1'), s_('closest'), 0.55, 1.6, 0.7)
    m.put(drums(110, s_('closest') - s_('crack')), s_('crack'), 0.65, bus='music')
    m.put(hit(), s_('crack'), 0.7, bus='music')
    # 5. the climb: strings ostinato + drums + riser into the bell hit
    m.put(strings([146.8, 220, 174.6, 220, 146.8, 233.1, 174.6, 233.1], s_('hit') - s_('closest')), s_('closest'), 0.6, bus='music')
    m.put(drums(132, s_('hit') - s_('stairs')), s_('stairs'), 0.6, bus='music')
    m.put(riser(s_('hit') - s_('think')), s_('think'), 0.8, bus='music')
    # 6. bell hit -> swing: huge major lift (F -> C -> G -> Am) with drums
    choirs([F, C, G, Am, F, C], s_('hit'), e_('land'), 0.7, 1.6, 0.9)
    m.put(drums(140, e_('forgot') - s_('hit')), s_('hit'), 0.7, bus='music')
    # 7. warm moment: soft major pads
    t = s_('hate'); prog = ['C', 'Am', 'F', 'G']; i = 0
    while t < e_('dadend') + 0.6:
        d = 2.0; m.put(pad(prog[i % 4], d + 0.4, 0.8), t, 0.45, bus='music'); t += d; i += 1
    # 8. twist: cold drone, low hit on "up"; CTA: choir swell under the end card
    m.put(pad('E', s_('wider') - s_('leave') + 0.4, 0.15) * 0.8, s_('leave'), 0.5, bus='music')
    m.put(hit(3.0), s_('up') + 0.6, 0.75, bus='music')
    choirs([Dm, Bb, F], s_('cta'), total, 0.5, 1.4, 0.5)
    m.put(drums(96, total - s_('cta')), s_('cta'), 0.45, bus='music')

    # ---------------- SFX
    for s in shots[1:]:
        m.put(whoosh(0.3), s['s'] - 0.12, 0.18, pan=rng.uniform(-0.4, 0.4))
    for n in ('giant_step', 'giant_enter', 'giant_leave', 'giant_turn'):
        s = shot(n); t = s['s'] + 0.2
        while t < s['e']: m.put(giant_step(), t, 0.9); t += 1.1
    m.put(gasp(), shot('giant_smile')['s'] + 0.2, 0.4)
    for n in ('baby_hook', 'kids_swing', 'somi_swing', 'somi_bird', 'rooftops_swing', 'swing_slowmo', 'swing_wide', 'zash_jump'):
        s = shot(n); m.put(whoosh(min(1.2, s['e'] - s['s'])), s['s'], 0.55)
    bz = shot('bread_zip'); m.put(zip_(bz['e'] - bz['s']), bz['s'], 0.8)
    m.put(chirp(), shot('somi_bird')['s'] + 0.3, 0.6)
    for k, n in enumerate(('bell_ring1', 'bell_ring2', 'bell_ring3')):
        m.put(big_bell(), shot(n)['s'], 0.85)
    m.put(gasp(), shot('crowd_freeze')['s'], 0.6)
    m.put(crumble(), shot('wall_crack')['s'], 1.0)
    m.put(snap(), shot('line_snap')['s'] + 0.35, 1.0)
    m.put(thud(), shot('somi_ground')['s'], 0.6)
    for s_id in ('smile', 'frozen'):
        t = seg[s_id]['start'] - 0.05
        for k in range(2): m.put(heartbeat(), t + k * 0.6, 0.75)
    for n in ('stairs_run', 'stairs_legs', 'stairs_top'):
        s = shot(n); t = s['s']; gap = 0.17 if n != 'stairs_legs' else 0.32
        while t < s['e']: m.put(step(), t, 0.55, pan=rng.uniform(-0.2, 0.2)); t += gap
    m.put(heartbeat(), shot('stairs_dizzy')['s'], 0.8)
    m.put(big_bell(5.0), shot('bell_hit')['s'] + 0.3, 1.1)
    m.put(big_bell(4.0), shot('bell_shockwave')['s'], 0.7)
    m.put(thud(), shot('land_face')['s'] + 0.35, 1.0)
    m.put(boop(), shot('land_face')['s'] + 0.6, 0.6)
    m.put(clack(), shot('hook_gift')['s'] + 0.2, 0.7)
    m.put(sting(), seg['up']['start'] + 0.5, 0.9)
    m.put(giant_step(), seg['stop']['start'] + 0.2, 0.7)


def mix(tl_path, voice_path, out_path):
    A.build_score = lambda m, tl: build(m, tl)
    A.build_sfx = lambda m, tl: None
    A.mix(tl_path, voice_path, out_path)
