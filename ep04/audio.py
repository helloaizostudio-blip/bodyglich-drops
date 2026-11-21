"""Episode 4 "The Glow Up": comedy score + SFX.

Score: bouncy intro groove, sneaky plucks for following Blaze, an upbeat "locked in" montage beat,
riser + choir hit for the S-rank reveal, soft romantic pads that get cut by a record scratch on every "no".
"""
import os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'sample'))
import audio_sample as A
from audio_sample import SR, t_, env, tone, noise, lp_fast, hp_fast, sweep, pad, whoosh, step, clack, heartbeat, riser, shimmer, power_up, click
import importlib.util
spec = importlib.util.spec_from_file_location('ep2audio', os.path.join(HERE, '..', 'ep02', 'audio.py')); E2 = importlib.util.module_from_spec(spec); spec.loader.exec_module(E2)
rng = np.random.default_rng(44)

N = dict(C3=130.8, D3=146.8, E3=164.8, F3=174.6, G3=196.0, A3=220.0, B3=246.9, C4=261.6, D4=293.7, E4=329.6, F4=349.2, G4=392.0, A4=440.0, C5=523.3)


def kick(): t = t_(0.22); return np.sin(2 * np.pi * np.cumsum(50 + 110 * np.exp(-t * 30)) / SR) * np.exp(-t * 14) * 1.2
def snare(): d = 0.16; return (hp_fast(noise(d), 1500) * 0.7 + tone(190, d) * 0.4) * np.exp(-t_(d) * 22)
def hat(): d = 0.05; return hp_fast(noise(d), 6000) * np.exp(-t_(d) * 60) * 0.35
def beat(bpm, d, fill=True):
    x = np.zeros(int(d * SR) + SR); s16 = 60 / bpm / 4; k = 0
    while k * s16 < d:
        a = int(k * s16 * SR); b = k % 16
        if b in (0, 6, 8): h = kick(); x[a:a + len(h)] += h
        if b in (4, 12): h = snare(); x[a:a + len(h)] += h
        if b % 2 == 0 or (fill and b == 15): h = hat(); x[a:a + len(h)] += h
        k += 1
    return x[:int(d * SR)]
def pluck(f, d=0.22):
    t = t_(d); return (tone(f, d, 'tri') + 0.3 * tone(f * 2, d)) * np.exp(-t * 14)
def bass(f, d=0.25): t = t_(d); return lp_fast(tone(f, d, 'saw'), 500) * np.exp(-t * 6) * 0.9
def riff(notes, bpm, d, fn=pluck, gain=1.0):
    x = np.zeros(int(d * SR) + SR); s8 = 60 / bpm / 2; k = 0
    while k * s8 < d:
        n = notes[k % len(notes)]
        if n: h = fn(n) * gain; a = int(k * s8 * SR); x[a:a + len(h)] += h
        k += 1
    return x[:int(d * SR)]
def scratch():
    d = 0.35; t = t_(d); f = 900 + 700 * np.sin(2 * np.pi * 7 * t); return lp_fast(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3 + noise(d) * 0.25, 3000) * env(len(t), 0.01, 0.1)
def bonk():
    t = t_(0.3); return np.sin(2 * np.pi * np.geomspace(900, 300, len(t)) * t) * np.exp(-t * 12) * 0.8
def tink():
    d = 0.25; t = t_(d); return (np.sin(2 * np.pi * 2400 * t) + 0.5 * np.sin(2 * np.pi * 3650 * t)) * np.exp(-t * 26) * 0.6
def trombone():
    out = []
    for f, d in ((233, 0.3), (220, 0.3), (207.6, 0.3), (196, 0.7)):
        t = t_(d); out.append(lp_fast(tone(f * (1 - 0.02 * t / d), d, 'saw'), 1200) * env(len(t), 0.03, 0.08) * 0.5)
    return np.concatenate(out)
def ding(): d = 0.9; t = t_(d); return (np.sin(2 * np.pi * 1318 * t) + 0.5 * np.sin(2 * np.pi * 1976 * t)) * np.exp(-t * 5) * 0.4
def rewind(d):
    t = t_(d); f = np.geomspace(300, 1800, len(t)); return (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3 + hp_fast(noise(d), 2000) * 0.15) * (0.6 + 0.4 * np.sin(2 * np.pi * 24 * t)) * env(len(t), 0.02, 0.05)
def zap(d=0.5):
    t = t_(d); return np.sign(np.sin(2 * np.pi * np.cumsum(200 + 1500 * rng.random(len(t))) / SR)) * 0.2 * env(len(t), 0.01, 0.1)
def laugh(d=1.2):
    x = np.zeros(int(d * SR))
    for k in range(int(d / 0.16)):
        f = 380 + 120 * rng.random(); h = tone(f, 0.1, 'tri') * env(int(0.1 * SR), 0.01, 0.05) * 0.25; a = int(k * 0.16 * SR); x[a:a + len(h)] += h[:len(x) - a]
    return x
def hum(d):
    t = t_(d); return (np.sin(2 * np.pi * 150 * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * t))) * 0.3 * env(len(t), 0.2, 0.3)


def build(m, tl):
    seg = {s['id']: s for s in tl['segs']}; shots = tl['shots']
    def s_(i): return seg[i]['start']
    def e_(i): return seg[i]['end']
    def shot(n): return next(x for x in shots if x['name'] == n)
    total = tl['dur']
    def pads(prog, a, b, warm, gain, stepd=2.0):
        t = a; i = 0
        while t < b - 0.1:
            d = min(stepd, b - t); m.put(pad(prog[i % len(prog)], d + 0.4, warm), t, gain, bus='music'); t += d; i += 1
    C, G, Am, F = N['C3'], N['G3'], N['A3'], N['F3']
    # 1. the rule + school: bouncy groove
    d = s_('blaze') - 0.0
    m.put(beat(104, d), 0.0, 0.5, bus='music')
    m.put(riff([C, 0, N['E3'], C, G / 2, 0, N['E3'], G / 2], 104, d, bass), 0.0, 0.5, bus='music')
    m.put(riff([N['C4'], N['E4'], N['G4'], N['E4'], N['A4'], N['G4'], N['E4'], 0], 104, d), 0.0, 0.3, bus='music')
    # 2. Blaze: heavier, slower swagger
    d = s_('follow') - s_('blaze')
    m.put(beat(88, d, False), s_('blaze'), 0.6, bus='music')
    m.put(riff([N['E3'] / 2, 0, N['E3'] / 2, N['G3'] / 2, 0, N['E3'] / 2, 0, N['D3'] / 2], 88, d, bass), s_('blaze'), 0.7, bus='music')
    # 3. sneaking: sparse plucks
    d = s_('year') - s_('follow')
    m.put(riff([N['A3'], 0, 0, N['C4'], 0, N['E3'], 0, 0, N['A3'], 0, N['B3'], 0, N['C4'], 0, 0, 0], 96, d), s_('follow'), 0.5, bus='music')
    m.put(pad('Am', s_('hammer') - s_('photo') + 0.3, 0.2) * 0.7, s_('photo'), 0.35, bus='music')
    # 4. montage: fast and bright
    d = s_('again') - s_('year')
    m.put(beat(132, d), s_('year'), 0.65, bus='music')
    m.put(riff([C, C, N['E3'], C, F, F, G, G], 132, d, bass), s_('year'), 0.6, bus='music')
    m.put(riff([N['C5'], N['G4'], N['E4'], N['G4'], N['A4'], N['G4'], N['E4'], N['D4']], 132, d), s_('year'), 0.4, bus='music')
    # 5. evaluation: tension -> big hit -> triumphant
    m.put(pad('E', s_('srank') - s_('again') + 0.2, 0.2) * 0.8, s_('again'), 0.45, bus='music')
    m.put(riser(s_('srank') - s_('shake')), s_('shake'), 0.9, bus='music')
    m.put(E2.hit(2.6), s_('srank'), 0.9, bus='music')
    t = s_('srank'); i = 0
    while t < s_('import'):
        dd = min(1.7, s_('import') - t); m.put(E2.choir([E2.F, E2.C, E2.G, E2.Am][i % 4], dd + 0.5, 0.9), t, 0.55, bus='music'); t += dd; i += 1
    m.put(beat(120, s_('import') - s_('third')), s_('third'), 0.55, bus='music')
    # 6. the date: soft romance, cut by scratches; deadpan outro groove
    pads(['C', 'Am', 'F', 'G'], s_('import'), s_('no1') + 1.2, 0.9, 0.5)
    pads(['F', 'G'], s_('no2') - 0.4, s_('no2') + 1.0, 0.9, 0.4, 1.0)
    d = s_('reveal') - s_('count'); m.put(beat(150, d), s_('count'), 0.55, bus='music')
    pads(['Am'], s_('reveal'), s_('tobi3'), 0.3, 0.4, 3.0)
    d = total - s_('end'); m.put(beat(104, d), s_('end'), 0.45, bus='music'); m.put(riff([N['C4'], N['E4'], N['G4'], N['E4'], N['A4'], N['G4'], N['E4'], 0], 104, d), s_('end'), 0.3, bus='music')

    # ---------------- SFX
    for s in shots[1:]:
        m.put(whoosh(0.28), s['s'] - 0.11, 0.16, pan=rng.uniform(-0.4, 0.4))
    m.put(zap(0.8), 0.1, 0.35); m.put(ding(), shot('s_rank_flex')['s'], 0.7); m.put(shimmer(1.2), shot('s_rank_flex')['s'], 0.6)
    m.put(trombone(), shot('e_rank_nothing')['s'] + 0.2, 0.55)
    for w in ('chopped', 'low', 'mid', 'high', 'chad', 'true'):
        ws = next((x['s'] for x in seg['chart']['words'] if x['w'].lower() == w), None)
        if ws: m.put(pluck({'chopped': 196, 'low': 220, 'mid': 261.6, 'high': 329.6, 'chad': 392, 'true': 523.3}[w], 0.3), ws, 0.6)
    m.put(zap(0.6), shot('zash_eval_old')['s'], 0.3)
    m.put(E2.thud(), shot('e_rank_stamp')['s'] + 0.3, 1.0); m.put(trombone(), shot('e_rank_stamp')['s'] + 0.45, 0.5)
    m.put(laugh(1.6), shot('hallway_laugh')['s'] + 0.1, 0.7, pan=-0.4); m.put(laugh(1.4), shot('hallway_laugh')['s'] + 0.35, 0.6, pan=0.4)
    m.put(E2.giant_step(), shot('blaze_walk')['s'], 0.5); m.put(shimmer(1.0), shot('blaze_walk')['s'] + 0.2, 0.5)
    fu = shot('float_up'); m.put(hum(fu['e'] - fu['s'] + 0.6), fu['s'], 0.9); m.put(sweep(180, 700, fu['e'] - fu['s']) * 0.25, fu['s'], 0.7)
    m.put(clack(), shot('flagpole_hang')['s'], 0.7)
    m.put(bonk(), shot('zash_deadpan')['s'] + 0.1, 0.5)
    fs = shot('follow_street'); t = fs['s']
    while t < fs['e']: m.put(step(), t, 0.45); t += 0.34
    m.put(clack(), shot('blaze_house')['e'] - 0.3, 0.6)
    m.put(E2.gasp(), shot('photo_close')['s'], 0.5)
    for n in ('tink_shadow', 'hammer_reveal'):
        s = shot(n); t = s['s'] + 0.1
        while t < s['e']: m.put(tink(), t, 0.9 if n == 'hammer_reveal' else 0.55); t += 0.42
    m.put(E2.gasp(), shot('zash_horror')['s'], 0.7); m.put(E2.hit(1.6), shot('hammer_reveal')['s'], 0.6)
    m.put(ding(), shot('photo_vs_blaze')['s'] + 0.6, 0.5)
    m.put(scratch(), shot('zash_nope')['s'], 0.6); m.put(ding(), shot('zash_idea')['s'] + 0.15, 0.8)
    cf = shot('calendar_flip'); t = cf['s']
    while t < cf['e']: m.put(click(), t, 0.6); t += max(0.03, 0.14 - (t - cf['s']) * 0.06)
    for n in ('mewing', 'skincare', 'sleep', 'gym', 'posture'): m.put(ding(), shot(n)['s'], 0.35)
    m.put(zap(1.2), shot('streamer_3am')['s'], 0.35)
    m.put(trombone(), shot('tobi_quit')['s'] + 0.5, 0.4)
    ms = shot('machine_shake'); m.put(E2.crumble(ms['e'] - ms['s'] + 0.4), ms['s'], 0.6); m.put(zap(ms['e'] - ms['s']), ms['s'], 0.6)
    m.put(shimmer(2.2), shot('s_rank_reveal')['s'], 1.0); m.put(E2.big_bell(3.0), shot('s_rank_reveal')['s'], 0.5)
    m.put(E2.gasp(), shot('crowd_gasp')['s'], 0.9); m.put(bonk(), shot('blaze_shock')['s'] + 0.1, 0.5)
    m.put(power_up(), shot('eyes_glow')['s'], 0.7); m.put(E2.hit(2.2), shot('almighty_title')['s'], 0.7)
    m.put(whoosh(0.5), shot('blaze_try')['s'] + 0.5, 0.7); m.put(clack(), shot('blaze_on_pole')['s'], 0.8); m.put(laugh(1.0), shot('blaze_on_pole')['s'] + 0.3, 0.5)
    for n in ('somi_no', 'somi_no2'): m.put(scratch(), shot(n)['s'], 0.9); m.put(bonk(), shot(n)['s'] + 0.12, 0.6)
    for n in ('rewind', 'rewind2'): s = shot(n); m.put(rewind(s['e'] - s['s']), s['s'], 0.8)
    nm = shot('no_montage'); t = nm['s']
    while t < nm['e']: m.put(bonk(), t, 0.5); t += 0.22
    ct = shot('counter'); t = ct['s']
    while t < ct['e'] - 0.3: m.put(click(), t, 0.5); t += 0.05
    m.put(E2.thud(), ct['e'] - 0.3, 0.9)
    m.put(power_up(), shot('somi_reveal')['s'], 0.6); m.put(shimmer(1.2), shot('somi_eyes')['s'], 0.6)
    m.put(trombone(), shot('zash_dead')['s'] + 0.6, 0.5)
    m.put(scratch(), shot('chart_crossout')['s'], 0.6); m.put(E2.thud(), shot('chart_crossout')['s'] + 0.22, 0.9)
    m.put(ding(), shot('endcard')['s'] + 0.3, 0.6)


def mix(tl_path, voice_path, out_path):
    A.build_score = lambda m, tl: build(m, tl)
    A.build_sfx = lambda m, tl: None
    A.mix(tl_path, voice_path, out_path)
