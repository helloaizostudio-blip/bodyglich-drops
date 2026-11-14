"""Episode 5 "Screen Time": comedy score + SFX.

Score: chill lo-fi groove for the world rule, a slow "old man" waltz for Tobi, a tension sting for the bet,
an upbeat day-counter montage (one ding per DAY), a triumphant hit on day seven, a magic poof for the de-aging,
a record scratch + dead silence on "middle schoolers", then the lo-fi groove back for the ending.
"""
import os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'sample'))
import audio_sample as A
from audio_sample import SR, t_, env, tone, noise, lp_fast, hp_fast, sweep, pad, whoosh, step, clack, riser, shimmer, power_up, click
import importlib.util
def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
E2 = _load('ep2audio', os.path.join(HERE, '..', 'ep02', 'audio.py'))
E4 = _load('ep4audio', os.path.join(HERE, '..', 'ep04', 'audio.py'))
N = E4.N
rng = np.random.default_rng(55)


def vibrate(d=0.5):
    t = t_(d); return np.sign(np.sin(2 * np.pi * 170 * t)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 9 * t))) * 0.18 * env(len(t), 0.01, 0.05)
def notif():
    d = 0.35; t = t_(d); return (np.sin(2 * np.pi * 1568 * t) * (t < 0.12) + np.sin(2 * np.pi * 2093 * t) * (t >= 0.12)) * np.exp(-((t % 0.12) * 18)) * 0.45
def crack():
    d = 0.18; return hp_fast(noise(d), 1800) * np.exp(-t_(d) * 40) * 1.1
def poof():
    d = 0.8; t = t_(d); return lp_fast(noise(d), 2500) * env(len(t), 0.01, 0.6) * 0.6 + shimmer(d) * 0.5
def waltz(d, gain=1.0):
    """slow oom-pah-pah in 3/4 for old Tobi"""
    x = np.zeros(int(d * SR) + SR); beat = 60 / 84; k = 0; roots = [N['F3'] / 2, N['C3'] / 2, N['G3'] / 2, N['C3'] / 2]
    while k * beat < d:
        a = int(k * beat * SR); bar = k // 3
        if k % 3 == 0: h = E4.bass(roots[bar % 4], 0.5)
        else: h = E4.pluck(roots[bar % 4] * 4, 0.25) * 0.5 + E4.pluck(roots[bar % 4] * 5, 0.25) * 0.35
        x[a:a + len(h)] += h * gain; k += 1
    return x[:int(d * SR)]
def lofi(d, bpm=86):
    x = E4.beat(bpm, d, False) * 0.8
    x += E4.riff([N['C3'], 0, 0, N['A3'] / 2, 0, 0, N['F3'] / 2, 0, N['G3'] / 2, 0, 0, 0], bpm, d, E4.bass) * 0.8
    x += E4.riff([N['E4'], 0, N['G4'], 0, N['C5'], 0, N['A4'], 0, 0, N['G4'], 0, N['E4'], 0, 0, N['D4'], 0], bpm, d) * 0.45
    return lp_fast(x, 3800)


def build(m, tl):
    seg = {s['id']: s for s in tl['segs']}; shots = tl['shots']
    def s_(i): return seg[i]['start']
    def e_(i): return seg[i]['end']
    def shot(n): return next(x for x in shots if x['name'] == n)
    def w_(sid, w):
        for x in seg[sid]['words']:
            if ''.join(c for c in x['w'].lower() if c.isalnum()) == w: return x['s']
        return s_(sid)
    total = tl['dur']
    # 1. world rule: lo-fi groove from frame 0 (no silent lead)
    m.put(lofi(s_('tobi')), 0.0, 0.55, bus='music')
    # 2. old Tobi: slow waltz
    m.put(waltz(s_('bet') - s_('tobi') + 0.3), s_('tobi'), 0.6, bus='music')
    # 3. the bet: suspense pad + riser into "Easy."
    m.put(pad('Am', s_('easy') - s_('bet') + 0.3, 0.3) * 0.8, s_('bet'), 0.45, bus='music')
    m.put(riser(s_('easy') - s_('somi')), s_('somi'), 0.45, bus='music')
    m.put(E2.hit(1.4), s_('easy'), 0.5, bus='music')
    # 4. day montage: bright beat
    d = s_('day7') - s_('day1')
    m.put(E4.beat(118, d), s_('day1'), 0.55, bus='music')
    m.put(E4.riff([N['C3'], N['C3'], N['E3'], N['C3'], N['F3'], N['F3'], N['G3'], N['G3']], 118, d, E4.bass), s_('day1'), 0.55, bus='music')
    m.put(E4.riff([N['C5'], N['G4'], N['E4'], N['G4'], N['A4'], N['G4'], N['E4'], N['D4']], 118, d), s_('day1'), 0.32, bus='music')
    # phantom notifications: music drops to a thin pulse
    # 5. day seven: triumph, then the de-aging shimmer and a run
    t = s_('day7'); i = 0
    while t < s_('no') - 0.2:
        dd = min(1.6, s_('no') - 0.2 - t); m.put(E2.choir([E2.F, E2.C, E2.G, E2.Am][i % 4], dd + 0.4, 0.9), t, 0.4, bus='music'); t += dd; i += 1
    m.put(E4.beat(140, s_('no') - s_('ran')), s_('ran'), 0.5, bus='music')
    # 6. "middle schoolers": scratch, silence, then lo-fi back for the ending
    m.put(lofi(total - s_('fix') + 0.5), s_('fix') + 0.1, 0.5, bus='music')

    # ---------------- SFX
    for s in shots[1:]:
        m.put(whoosh(0.28), s['s'] - 0.11, 0.15, pan=rng.uniform(-0.4, 0.4))
    m.put(E4.bonk(), w_('hook', 'sixty'), 0.55); m.put(E4.trombone(), w_('hook', 'sixty') + 0.35, 0.35)
    pt = shot('phone_timer'); t = pt['s']
    while t < pt['e']: m.put(click(), t, 0.35); t += 0.25
    m.put(E4.ding(), shot('age_tick')['s'] + 0.6, 0.6); m.put(E4.bonk(), shot('age_tick')['s'] + 0.62, 0.4)
    m.put(E2.thud(), shot('warning_box')['s'] + 0.05, 0.6)
    m.put(E4.ding(), shot('teacher_check')['s'] + 0.55 * (shot('teacher_check')['e'] - shot('teacher_check')['s']), 0.45)
    m.put(shimmer(1.0), w_('lib', 'twelve'), 0.5)
    m.put(crack(), shot('tobi_back')['s'] + 0.9, 0.8); m.put(crack(), shot('tobi_back')['s'] + 1.05, 0.6)
    tc = shot('tobi_cane'); t = tc['s'] + 0.2
    while t < tc['e']: m.put(clack(), t, 0.35); t += 0.7
    m.put(notif(), shot('tobi_scroll')['s'] + 0.2, 0.3)
    m.put(E4.ding(), shot('tobi_beard')['s'] + 0.3, 0.35); m.put(E4.trombone(), e_('since') - 0.2, 0.4)
    sw = shot('somi_walkup'); t = sw['s']
    while t < sw['e'] - 0.2: m.put(step(), t, 0.35); t += 0.32
    m.put(shimmer(1.0), w_('somi', 'date'), 0.45)
    m.put(whoosh(0.5), shot('zash_smug_phone')['s'] + 0.25, 0.7)
    for n in ('grass_touch', 'family_dinner', 'phantom_buzz', 'read_book', 'scroll_sandwich'):
        m.put(E4.ding(), shot(n)['s'] + 0.05, 0.45)
    m.put(E4.laugh(1.2), shot('family_dinner')['s'] + 0.6, 0.35)
    pb = shot('phantom_buzz')
    for k in range(5):
        tt = pb['s'] + 0.1 + k * 0.45; m.put(vibrate(0.4), tt, 0.7, pan=(-0.5 if k % 2 else 0.5)); m.put(notif(), tt + 0.05, 0.35)
    m.put(E4.bonk(), w_('day4', 'purpose'), 0.4)
    ss = shot('scroll_sandwich'); t = ss['s'] + 0.3
    while t < ss['e']: m.put(whoosh(0.18), t, 0.25); t += 0.62
    m.put(E4.trombone(), ss['e'] - 1.0, 0.3)
    m.put(E2.hit(2.0), w_('day7', 'did'), 0.7); m.put(E4.ding(), shot('day7_win')['s'], 0.5)
    m.put(poof(), w_('young', 'younger'), 0.9); m.put(power_up(), w_('young', 'younger') - 0.3, 0.4)
    rs = shot('run_to_somi'); t = rs['s']
    while t < rs['e']: m.put(step(), t, 0.4); t += 0.2
    m.put(E4.scratch(), s_('no') + 0.05, 0.9)
    m.put(E2.gasp(), shot('kid_zash_shock')['s'], 0.6); m.put(E4.trombone(), shot('kid_zash_shock')['s'] + 0.3, 0.5)
    m.put(notif(), shot('kid_zash_phone')['s'] + 0.3, 0.4)
    m.put(E4.ding(), shot('endcard')['s'] + 0.6, 0.6)


def mix(tl_path, voice_path, out_path):
    A.build_score = lambda m, tl: build(m, tl)
    A.build_sfx = lambda m, tl: None
    A.mix(tl_path, voice_path, out_path)
