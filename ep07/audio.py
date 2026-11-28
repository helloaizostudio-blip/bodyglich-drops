"""Episode 7 "Never Let Mom In After Midnight": horror score + SFX.

Low drone bed with a slow pulse, wind outside, knocks on the door, a phone ring, creaking stairs, a heartbeat that
speeds up, near-silence before the key lines, a hit on each twist, a frantic run, soft piano at Grandma's,
then a sting and a final heartbeat into black.
"""
import os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'sample'))
import audio_sample as A
from audio_sample import SR, t_, env, tone, noise, lp_fast, hp_fast, sweep, whoosh, step, clack, heartbeat, riser, click
import importlib.util
def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
E2 = _load('ep2audio', os.path.join(HERE, '..', 'ep02', 'audio.py'))
rng = np.random.default_rng(77)


def drone(d, f=55.0, dark=True):
    t = t_(d); x = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.498 * t + 0.3) + 0.35 * np.sin(2 * np.pi * f * 0.5 * t))
    x *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * t)
    x += lp_fast(noise(d), 300 if dark else 900) * 0.25
    return x * env(len(t), 1.5, 1.5) * 0.5
def wind(d):
    t = t_(d); return lp_fast(noise(d), 600) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.07 * t + 1)) * env(len(t), 1.0, 1.0) * 0.5
def knock():
    d = 0.18; t = t_(d); return (lp_fast(noise(d), 500) * 1.2 + np.sin(2 * np.pi * 110 * t) * 0.8) * np.exp(-t * 32)
def knocks(n=3, gap=0.28):
    x = np.zeros(int((n * gap + 0.3) * SR))
    for i in range(n):
        k = knock(); a = int(i * gap * SR); x[a:a + len(k)] += k
    return x
def ring(d=1.8):
    t = t_(d); on = ((t % 0.5) < 0.3).astype(float)
    return (np.sin(2 * np.pi * 880 * t) + np.sin(2 * np.pi * 1320 * t)) * 0.18 * on * env(len(t), 0.01, 0.05)
def vibrate(d=0.6):
    t = t_(d); return np.sign(np.sin(2 * np.pi * 160 * t)) * 0.12 * env(len(t), 0.01, 0.05)
def creak(d=0.6):
    t = t_(d); f = 180 + 120 * np.sin(2 * np.pi * 2.2 * t) + rng.uniform(-20, 20)
    return lp_fast(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.25 + noise(d) * 0.05, 1500) * env(len(t), 0.05, 0.2) * 0.6
def hit(d=2.4):
    t = t_(d); return (np.sin(2 * np.pi * np.cumsum(70 * np.exp(-t * 2) + 30) / SR) * 1.2 + lp_fast(noise(d), 800) * 0.6) * np.exp(-t * 2.2)
def sting():
    d = 1.6; t = t_(d); x = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) for f in (466, 493, 523, 554)) * 0.12
    return (x + hp_fast(noise(d), 3000) * 0.08) * np.exp(-t * 1.6) * env(len(t), 0.005, 0.3)
def lock():
    d = 0.25; t = t_(d); return (hp_fast(noise(d), 2000) * 0.6 + np.sin(2 * np.pi * 1800 * t) * 0.3) * np.exp(-t * 40) + np.roll(hp_fast(noise(d), 1500) * np.exp(-t * 50) * 0.5, int(0.09 * SR))
def piano(notes, d_each, d):
    x = np.zeros(int(d * SR) + SR); k = 0; tt = 0
    while tt < d:
        f = notes[k % len(notes)]; n = t_(2.0); h = (np.sin(2 * np.pi * f * n) + 0.4 * np.sin(4 * np.pi * f * n) + 0.15 * np.sin(6 * np.pi * f * n)) * np.exp(-n * 2.2) * 0.25
        a = int(tt * SR); x[a:a + len(h)] += h[:len(x) - a]; tt += d_each; k += 1
    return x[:int(d * SR)]
def hb_seq(d, bpm0, bpm1):
    x = np.zeros(int(d * SR) + SR); tt = 0
    while tt < d:
        h = heartbeat(); a = int(tt * SR); x[a:a + len(h)] += h[:len(x) - a]; tt += 60 / (bpm0 + (bpm1 - bpm0) * tt / d)
    return x[:int(d * SR)]


def build(m, tl):
    seg = {s['id']: s for s in tl['segs']}; shots = tl['shots']
    def s_(i): return seg[i]['start']
    def e_(i): return seg[i]['end']
    def shot(n): return next(x for x in shots if x['name'] == n)
    total = tl['dur']
    # beds
    m.put(drone(s_('grandma') + 0.5, 55), 0.0, 0.55, bus='music')
    m.put(wind(s_('grandma')), 0.0, 0.35, bus='music')
    m.put(drone(s_('grandma') - s_('knock'), 41.2), s_('knock'), 0.4, bus='music')
    # dusk memory (mom leaving): soft piano
    m.put(piano([261.6, 329.6, 392, 329.6], 0.45, shot('door_lock')['e'] - shot('mom_leaving')['s']), shot('mom_leaving')['s'], 0.35, bus='music')
    # heartbeat building from the second door line to the realisation, and again for the escape
    m.put(hb_seq(e_('never') - s_('door2'), 70, 120), s_('door2'), 0.7, bus='music')
    m.put(hb_seq(e_('window') - s_('upstairs'), 110, 150), s_('upstairs'), 0.6, bus='music')
    m.put(riser(s_('open') - s_('kept')), s_('kept'), 0.6, bus='music')
    # grandma: warm piano, then the final heartbeat into black
    m.put(piano([220, 261.6, 329.6, 261.6, 196, 246.9, 293.7, 246.9], 0.55, s_('sting') - s_('grandma') + 0.6), s_('grandma'), 0.4, bus='music')
    m.put(drone(total - s_('sting'), 49), s_('sting'), 0.5, bus='music')
    m.put(hb_seq(total - s_('sting') - 0.6, 60, 52), s_('sting'), 0.8, bus='music')

    # SFX
    for s in shots[1:]:
        m.put(whoosh(0.3), s['s'] - 0.12, 0.08, pan=rng.uniform(-0.3, 0.3))
    m.put(hit(1.8), 0.02, 0.45)
    m.put(lock(), shot('door_lock')['s'] + 0.5, 0.8)
    m.put(click(), shot('clock_3am')['s'], 0.4)
    m.put(knocks(3), shot('door_knock')['s'] + 0.05, 1.0)
    m.put(knocks(2, 0.34), shot('door_shadow')['s'] + 2.6, 0.7)
    m.put(ring(shot('phone_ring')['e'] - shot('phone_ring')['s']), shot('phone_ring')['s'], 0.8); m.put(vibrate(1.2), shot('phone_ring')['s'], 0.6)
    m.put(hit(2.0), s_('two'), 0.5)
    m.put(knocks(4, 0.22), shot('door_crying')['s'] + 0.4, 0.6)
    m.put(hit(2.6), s_('never'), 0.9); m.put(sting(), s_('never') + 0.05, 0.5)
    for i in range(3):
        m.put(creak(0.5), shot('stairs_dark')['s'] + 0.4 + i * 0.6, 0.6, pan=0.3)
    m.put(ring(1.4) * 0.6, shot('upstairs_glow')['s'] + 0.2, 0.5, pan=0.2)
    m.put(hit(2.4), s_('kept') + 0.1, 0.7)
    m.put(clack(), shot('lights_on')['s'] + 0.95, 0.9)
    m.put(E2.thud(), shot('door_open')['s'] + 0.05, 0.9)
    rc = shot('run_car'); tt = rc['s']
    while tt < rc['e']: m.put(step(), tt, 0.7); tt += 0.18
    hl = shot('house_lights')
    for i in range(5): m.put(clack(), hl['s'] + 0.25 * 1.0 + i * 0.28 * (hl['e'] - hl['s']) / 2.34 * 0.0 + i * 0.28, 0.7, pan=-0.5 + i * 0.25)
    m.put(sting(), shot('window_wave')['s'] + 0.3, 0.7)
    m.put(hit(3.0), s_('sting') + seg['sting']['words'][-4]['s'] - s_('sting') if len(seg['sting']['words']) >= 4 else s_('sting'), 0.9)
    m.put(sting(), shot('note_end')['s'] + 0.2, 0.6)


def mix(tl_path, voice_path, out_path):
    A.build_score = lambda m, tl: build(m, tl)
    A.build_sfx = lambda m, tl: None
    A.mix(tl_path, voice_path, out_path)
