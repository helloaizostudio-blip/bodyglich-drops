"""Append a spoken call-to-action end card to a finished episode.

    python3 sample/endcard.py <episode_dir> <input.mp4> <output.mp4> [--voice am_michael --speed 1.1 --pitch 1.06]
                               [--bg path/to/frame.jpg] [--accent "#ff2e2e"]

The narrator says: "Follow for more. Comment your 'in my world' idea. The most liked comment becomes my next video."
while the card shows the same lines popping in, a sample comment bubble with a like counter, and a pulsing FOLLOW
button. Background is a blurred, darkened frame from the episode (default: its last non-black frame).
"""
import os, sys, argparse, subprocess, tempfile
import numpy as np, soundfile as sf
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'voice'))

LINE = "Follow for more. Comment your in my world idea. The most liked comment becomes my next video."
W, H, FPS = 1080, 1920, 30


def voice(args):
    import voice_lab as VL
    k = VL.load_kokoro()
    y, sr = k.create(LINE, voice=args.voice, speed=args.speed, lang='en-us')
    y = VL.trim(y)
    if abs(args.pitch - 1) > 0.001: y = VL.pitch_shift(y, args.pitch)
    return y, VL.SR


def font(size):
    return ImageFont.truetype(os.path.join(HERE, 'assets', 'LuckiestGuy.ttf'), size)


def text_c(d, y, s, size, fill, stroke=10, sc=1.0):
    f = font(int(size * sc)); w = d.textlength(s, font=f)
    d.text(((W - w) / 2, y - size * sc / 2), s, font=f, fill=fill, stroke_width=int(stroke * sc), stroke_fill='#08080c')


def ease(t): t = max(0.0, min(1.0, t)); return 1 - (1 - t) ** 3


def frame(bg, t, dur, accent):
    im = bg.copy(); d = ImageDraw.Draw(im, 'RGBA')
    pop = lambda t0: (lambda k: 0.0 if k <= 0 else (1.25 - 0.25 * ease(k * 3)) if k < 0.33 else 1.0)((t - t0) / 0.5)
    # 1. FOLLOW FOR MORE
    s = pop(0.05)
    if s: text_c(d, 380, 'FOLLOW FOR MORE', 104, '#ffffff', sc=s)
    # 2. comment your "in my world" idea
    s = pop(dur * 0.22)
    if s:
        text_c(d, 560, 'COMMENT YOUR', 78, '#ffffff', sc=s)
        text_c(d, 660, '"IN MY WORLD..."', 92, accent, sc=s)
        text_c(d, 760, 'IDEA BELOW', 78, '#ffffff', sc=s)
    # 3. sample comment bubble with a like counter that climbs
    k = ease((t - dur * 0.45) / 0.6)
    if k > 0:
        x0, y0, bw, bh = 120, 880 + (1 - k) * 60, W - 240, 230
        d.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], 34, fill=(250, 250, 252, int(235 * k)))
        d.ellipse([x0 + 30, y0 + 40, x0 + 110, y0 + 120], fill=(120, 140, 200, int(255 * k)))
        f1, f2 = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 34), ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 36)
        d.text((x0 + 135, y0 + 38), '@you', font=f1, fill=(40, 40, 50, int(255 * k)))
        d.text((x0 + 135, y0 + 88), 'in my world, if you...', font=f2, fill=(30, 30, 40, int(255 * k)))
        likes = int(min(1.0, max(0.0, (t - dur * 0.5) / (dur * 0.35))) ** 2 * 9999)
        d.text((x0 + 135, y0 + 150), '♥ ' + (f'{likes/1000:.1f}K' if likes >= 1000 else str(likes)), font=f1, fill=(230, 40, 70, int(255 * k)))
    # 4. most liked becomes the next video
    s = pop(dur * 0.55)
    if s:
        text_c(d, 1250, 'MOST LIKED COMMENT', 76, '#ffffff', sc=s)
        text_c(d, 1345, 'BECOMES MY NEXT VIDEO', 76, accent, sc=s)
    # 5. pulsing FOLLOW button
    if t > dur * 0.15:
        p = 1 + 0.06 * np.sin(t * 7)
        bw, bh = 520 * p, 130 * p; x0, y0 = (W - bw) / 2, 1560 - bh / 2
        d.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], int(60 * p), fill=accent)
        text_c(d, 1560, 'FOLLOW', int(80 * p), '#ffffff', stroke=6)
    return im


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('ep'); ap.add_argument('inp'); ap.add_argument('out')
    ap.add_argument('--voice', default='am_michael'); ap.add_argument('--speed', type=float, default=1.1); ap.add_argument('--pitch', type=float, default=1.06)
    ap.add_argument('--bg'); ap.add_argument('--accent', default='#ff2e2e'); a = ap.parse_args()
    y, sr = voice(a); dur = len(y) / sr + 1.2
    tmp = tempfile.mkdtemp(dir=os.path.join(a.ep, 'out'))
    pad = np.zeros(int(0.35 * sr)); yy = np.concatenate([pad, y, np.zeros(int(0.85 * sr))])
    yy = yy / (np.max(np.abs(yy)) + 1e-9) * 0.7; sf.write(os.path.join(tmp, 'v.wav'), yy, sr)
    bgp = a.bg
    if not bgp:
        fr = sorted(os.listdir(os.path.join(a.ep, 'out', 'frames')))
        bgp = os.path.join(a.ep, 'out', 'frames', fr[int(len(fr) * 0.9)])
    bg = Image.open(bgp).convert('RGB').resize((W, H)).filter(ImageFilter.GaussianBlur(18))
    bg = Image.blend(bg, Image.new('RGB', (W, H), (6, 6, 12)), 0.62)
    n = int(dur * FPS)
    for i in range(n):
        frame(bg, i / FPS, dur, a.accent).save(os.path.join(tmp, f'{i:04d}.jpg'), quality=92)
    card = os.path.join(tmp, 'card.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', os.path.join(tmp, '%04d.jpg'), '-i', os.path.join(tmp, 'v.wav'),
                    '-af', 'loudnorm=I=-14:TP=-1.5', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-shortest', card], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a.inp, '-i', card, '-filter_complex',
                    '[0:v]fps=30,format=yuv420p[v0];[1:v]fps=30,format=yuv420p[v1];[0:a]aresample=48000,aformat=channel_layouts=stereo[a0];[1:a]aresample=48000,aformat=channel_layouts=stereo[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]',
                    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-maxrate', '16M', '-bufsize', '24M', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', a.out], check=True)
    print('end card %.1fs ->' % dur, a.out)


if __name__ == '__main__':
    main()
