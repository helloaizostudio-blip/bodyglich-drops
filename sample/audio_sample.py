"""Music + sound design for the sample episode, synthesised with numpy.

- Score: a dark, warm pad (minor chords) + soft pulse that builds through the chase,
  drops to near-silence for the reveal, swells warmly for the hug, then a low drone for the twist.
- SFX: whooshes on cuts, power-down / power-up for the streetlights, bolt clacks, clock tick
  and bell, running footsteps, flashlight click, a heartbeat on the tense beats, firefly shimmer, final sting.
- Mix: voice is mastered (high-pass 80 Hz, compressor, de-esser); music is side-chain ducked
  about 7 dB under the voice; the full mix is normalised to -14 LUFS, true peak -1.5 dBFS.
"""
import json, subprocess, tempfile, os
import numpy as np, soundfile as sf

SR = 48000
rng = np.random.default_rng(7)


def t_(d): return np.arange(int(d * SR)) / SR
def env(n, a=0.01, r=0.1):
    e = np.ones(n); ai, ri = max(1, int(a * SR)), max(1, int(r * SR))
    e[:ai] = np.linspace(0, 1, ai)[:n]; e[-ri:] *= np.linspace(1, 0, ri)[-n:] if ri <= n else 1
    return e
def tone(f, d, typ='sine'):
    t = t_(d); ph = 2 * np.pi * f * t
    if typ == 'sine': return np.sin(ph)
    if typ == 'tri': return 2 / np.pi * np.arcsin(np.sin(ph))
    if typ == 'saw': return 2 * ((f * t) % 1) - 1
def noise(d): return rng.standard_normal(int(d * SR))
def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.zeros_like(x); s = 0.0
    for i in range(len(x)): s = (1 - a) * x[i] + a * s; y[i] = s
    return y
def lp_fast(x, fc):  # vectorised one-pole via scipy if present
    try:
        from scipy.signal import lfilter
        a = np.exp(-2 * np.pi * fc / SR); return lfilter([1 - a], [1, -a], x)
    except Exception: return lp(x, fc)
def hp_fast(x, fc): return x - lp_fast(x, fc)
def sweep(f0, f1, d, typ='sine'):
    t = t_(d); f = np.geomspace(f0, f1, len(t)); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) if typ == 'sine' else 2 / np.pi * np.arcsin(np.sin(ph))


class Mix:
    def __init__(self, dur):
        self.n = int(dur * SR) + SR; self.music = np.zeros((self.n, 2)); self.sfx = np.zeros((self.n, 2))
    def put(self, x, t, gain=1.0, pan=0.0, bus='sfx'):
        x = np.asarray(x, float) * gain; a = int(t * SR); b = min(self.n, a + len(x))
        if b <= a or a < 0: return
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        B = self.music if bus == 'music' else self.sfx
        B[a:b, 0] += x[:b - a] * l * 1.41; B[a:b, 1] += x[:b - a] * r * 1.41


# ------------------------------------------------------------------ sfx
def whoosh(d=0.35):
    x = hp_fast(lp_fast(noise(d), 2500), 200); e = np.sin(np.linspace(0, np.pi, len(x))) ** 2; return x * e * 0.5
def power_down():
    d = 0.7; x = sweep(240, 38, d, 'tri') * np.linspace(1, 0, int(d * SR)) ** 1.4 * 0.7
    thunk = lp_fast(noise(0.12), 400) * np.exp(-np.linspace(0, 10, int(0.12 * SR))); x[:len(thunk)] += thunk * 0.9; return x
def power_up():
    x = sweep(40, 260, 0.45, 'tri') * np.linspace(0.2, 1, int(0.45 * SR)); hum = tone(120, 0.6) * env(int(0.6 * SR), 0.01, 0.5) * 0.3
    return np.concatenate([x * 0.6, hum])
def clack():
    x = noise(0.06) * np.exp(-np.linspace(0, 12, int(0.06 * SR))); return hp_fast(x, 1200) * 0.9 + tone(900, 0.06) * np.exp(-np.linspace(0, 20, int(0.06 * SR))) * 0.4
def tick(): x = noise(0.02) * np.exp(-np.linspace(0, 30, int(0.02 * SR))); return hp_fast(x, 3000) * 0.8
def bell():
    d = 3.0; t = t_(d); x = sum(np.sin(2 * np.pi * f * t) * a * np.exp(-t * k) for f, a, k in [(196, 1, 0.9), (392, 0.5, 1.3), (587, 0.35, 1.8), (784, 0.2, 2.5), (247, 0.3, 1.1)])
    return x * 0.5
def step():
    x = lp_fast(noise(0.07), 900) * np.exp(-np.linspace(0, 14, int(0.07 * SR))); return x * 1.4 + tone(70, 0.07) * np.exp(-np.linspace(0, 18, int(0.07 * SR))) * 0.6
def click(): return hp_fast(noise(0.015), 2000) * np.exp(-np.linspace(0, 25, int(0.015 * SR))) * 0.9
def heartbeat():
    def thump(): t = t_(0.18); return np.sin(2 * np.pi * 55 * t) * np.exp(-t * 22)
    x = np.zeros(int(0.7 * SR)); a = thump(); x[:len(a)] += a; b = thump() * 0.7; x[int(0.22 * SR):int(0.22 * SR) + len(b)] += b; return x * 1.1
def shimmer(d=1.4):
    x = np.zeros(int(d * SR))
    for _ in range(18):
        f = rng.uniform(2200, 4200); t0 = rng.uniform(0, d - 0.2); g = tone(f, 0.18) * np.exp(-np.linspace(0, 8, int(0.18 * SR)))
        a = int(t0 * SR); x[a:a + len(g)] += g * 0.12
    return x
def sting():
    t = t_(2.6); x = (np.sin(2 * np.pi * 55 * t) + 0.6 * np.sin(2 * np.pi * 58.3 * t) + 0.3 * np.sin(2 * np.pi * 110 * t)) * np.exp(-t * 0.9)
    return x * 0.8 + lp_fast(noise(2.6), 300) * np.exp(-t * 1.5) * 0.4
def riser(d):
    return hp_fast(noise(d), 400) * np.linspace(0, 1, int(d * SR)) ** 2 * 0.35 + sweep(80, 320, d, 'tri') * np.linspace(0, 1, int(d * SR)) ** 2 * 0.2


# ------------------------------------------------------------------ score
A, C, D, E, F, G = 55.0, 65.41, 73.42, 82.41, 87.31, 98.0
CHORDS = {'Am': [A, C * 2, E * 2], 'F': [F, A * 2, C * 2 * 1], 'C': [C, E * 2, G * 2], 'G': [G, 123.47 * 2, D * 4], 'Dm': [D, F * 2, A * 4], 'E': [E, 103.83 * 2, 123.47 * 2]}
def pad(chord, d, warm=0.5):
    t = t_(d); x = np.zeros(len(t))
    for f in CHORDS[chord]:
        for det in (-0.12, 0.0, 0.11):
            x += tone(f * 2 * (1 + det / 100), d, 'saw') * 0.12 + tone(f * (1 + det / 100), d, 'tri') * 0.1
    x = lp_fast(x, 600 + 900 * warm); e = env(len(x), 0.35, 0.5); return x * e
def pulse(bpm, d, f=55.0):
    beat = 60 / bpm; x = np.zeros(int(d * SR)); k = 0
    while k * beat < d - 0.05:
        g = tone(f, 0.22, 'tri') * np.exp(-np.linspace(0, 9, int(0.22 * SR))); a = int(k * beat * SR); x[a:a + len(g)] += g[:len(x) - a]; k += 1
    return x


def build_score(m, tl):
    seg = {s['id']: s for s in tl['segs']}
    def s_(i): return seg[i]['start']
    def e_(i): return seg[i]['end']
    total = tl['dur']
    # 1. intro/world-building: slow minor progression
    t = 0.0; prog = ['Am', 'F', 'C', 'G']; i = 0
    while t < s_('until'):
        d = min(2.4, s_('until') - t); m.put(pad(prog[i % 4], d + 0.4, 0.4), t, 0.5, bus='music'); t += d; i += 1
    m.put(pulse(92, s_('until') - s_('adapt3')), s_('adapt3'), 0.45, bus='music')
    # 2. "Until last Friday": drop to a low drone, tension builds through the chase
    m.put(pad('Dm', e_('turn') - s_('until') + 0.3, 0.2) * 0.8, s_('until'), 0.5, bus='music')
    m.put(pulse(118, e_('figure') - s_('run'), 41.2), s_('run'), 0.55, bus='music')
    m.put(riser(e_('figure') - s_('figure') + 0.2), s_('figure'), 0.7, bus='music')
    # 3. reveal + hug: warm major swell
    t = s_('reveal'); prog = ['C', 'G', 'Am', 'F']; i = 0
    while t < e_('hug') + 0.4:
        d = 1.8; m.put(pad(prog[i % 4], d + 0.4, 0.9), t, 0.6, bus='music'); t += d; i += 1
    # 4. twist: cold drone to the end
    m.put(pad('E', total - s_('twist') + 0.2, 0.15) * 0.7, s_('twist'), 0.5, bus='music')


def build_sfx(m, tl):
    seg = {s['id']: s for s in tl['segs']}; shots = tl['shots']
    def word(sid, w):
        for x in seg[sid]['words']:
            if x['w'].lower() == w: return x['s']
        return seg[sid]['start']
    for s in shots[1:]:
        m.put(whoosh(0.3), s['s'] - 0.12, 0.22, pan=rng.uniform(-0.4, 0.4))
    m.put(power_down(), word('rule', 'off'), 0.8)
    door = next(s for s in shots if s['name'] == 'door_lock')
    for i in range(3): m.put(clack(), door['s'] + 0.12 + i * 0.22, 0.7, pan=0.3)
    for n in ('clock_1159', 'clock_1200', 'clock_1201'):
        s = next(x for x in shots if x['name'] == n)
        for k in range(int((s['e'] - s['s']) / 0.5) + 1): m.put(tick(), s['s'] + k * 0.5, 0.5)
    m.put(bell(), next(x for x in shots if x['name'] == 'clock_1200')['s'], 0.55)
    cr = [x for x in shots if x['name'] in ('crowd_run', 'crowd_low')]
    for s in cr:
        t = s['s']
        while t < s['e']: m.put(step(), t, 0.35 * rng.uniform(0.6, 1.0), pan=rng.uniform(-0.8, 0.8)); t += rng.uniform(0.03, 0.08)
    m.put(power_down(), seg['liza']['start'], 0.7)
    g = next(x for x in shots if x['name'] == 'grab'); m.put(click(), g['s'] + 0.3, 0.9)
    r = next(x for x in shots if x['name'] == 'run_street'); t = r['s']
    while t < r['e'] + 0.6: m.put(step(), t, 0.7, pan=0.1); t += 0.21
    for s_id in ('figure', 'turn'):
        t = seg[s_id]['start'] - 0.1
        for k in range(3): m.put(heartbeat(), t + k * 0.62, 0.8)
    m.put(shimmer(2.6), seg['reveal']['start'] + 0.3, 0.8)
    m.put(shimmer(1.6), seg['q']['start'], 0.5)
    m.put(power_up(), word('twist', 'on'), 0.8)
    m.put(sting(), seg['twist2']['start'] - 0.1, 0.8)


def master_voice(path):
    with tempfile.TemporaryDirectory() as d:
        o = os.path.join(d, 'v.wav')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-af',
                        'highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=90:makeup=2,deesser=i=0.4:m=0.5:f=0.5,aresample=48000',
                        '-ac', '1', o], check=True)
        v, _ = sf.read(o)
    return v


def mix(tl_path, voice_path, out_path):
    tl = json.load(open(tl_path)); m = Mix(tl['dur'])
    build_score(m, tl); build_sfx(m, tl)
    v = master_voice(voice_path); v = np.pad(v, (0, max(0, m.n - len(v))))[:m.n]
    # side-chain ducking: ~7 dB under the voice, 40 ms attack, 250 ms release
    e = np.abs(v); k = int(0.02 * SR); e = np.convolve(e, np.ones(k) / k, 'same')
    on = (e > 0.02).astype(float); a_up, a_dn = 1 - np.exp(-1 / (0.04 * SR)), 1 - np.exp(-1 / (0.25 * SR))
    from scipy.signal import lfilter
    # asymmetric smoothing in two passes
    up = lfilter([a_up], [1, -(1 - a_up)], on); dn = lfilter([a_dn], [1, -(1 - a_dn)], on); sm = np.clip(np.maximum(up, dn), 0, 1)
    duck = 10 ** (-7 * sm / 20)
    music = m.music * duck[:, None]
    full = music * 0.55 + m.sfx * 0.6 + np.stack([v, v], 1) * 1.0
    # fade out the last 0.6 s
    n = int(0.6 * SR); full[-n - SR:-SR] *= np.linspace(1, 0, n)[:, None]; full[-SR:] = 0
    full = full[:int(tl['dur'] * SR)]
    tmp = out_path + '.pre.wav'; sf.write(tmp, full / max(1.0, np.abs(full).max()), SR)
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', tmp, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True)
    j = json.loads(r.stderr[r.stderr.rfind('{'):])
    ln = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
          f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', ln + ',aresample=48000', out_path], check=True); os.remove(tmp)
    print('audio:', out_path)
