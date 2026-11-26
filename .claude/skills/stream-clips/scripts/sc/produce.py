"""Build one finished clip: fetch its video, sync it to the stream audio, caption it,
frame it 9:16, put the title bar on, encode, and save a check image."""

import subprocess
from functools import lru_cache

import numpy as np

from . import frame, listen, media, subs, titlecard
from .common import Problem, decode, probe, run, say, slug

PAD = 5.0          # extra seconds fetched on each side; trimmed after syncing
ENV_RATE = 100     # envelope samples per second used for syncing


def _envelope(samples, rate=8000):
    hop = rate // ENV_RATE
    n = len(samples) // hop
    if not n:
        return np.zeros(0, np.float32)
    e = np.log(np.sqrt(np.mean(samples[: n * hop].reshape(n, hop) ** 2, axis=1)) + 1e-4)
    k = ENV_RATE                                   # remove the slow trend (1 s mean)
    trend = np.convolve(np.pad(e, k // 2, mode="edge"), np.ones(k) / k, mode="valid")[: len(e)]
    return (e - trend).astype(np.float32)


def sync(part, audio, guess, reach=25.0):
    """Stream time of the part's first frame, by matching its sound to the stream audio.
    Returns (seconds, confidence 0-1)."""
    probe_len = 20.0
    a = _envelope(decode(part, 8000, 0.5, probe_len))
    lo = max(0.0, guess + 0.5 - reach)
    b = _envelope(decode(audio, 8000, lo, probe_len + 2 * reach))
    if len(a) < ENV_RATE * 5 or len(b) <= len(a):
        return guess, 0.0
    a = (a - a.mean()) / (a.std() + 1e-6)
    win = np.lib.stride_tricks.sliding_window_view(b, len(a))
    mu, sd = win.mean(axis=1), win.std(axis=1) + 1e-6
    score = (win @ a - mu * a.sum()) / (len(a) * sd)
    k = int(np.argmax(score))
    return lo + k / ENV_RATE - 0.5, float(score[k])


@lru_cache(maxsize=1)
def video_encoder(fast):
    """libx264, or a hardware encoder that actually works on this machine when fast=True."""
    if not fast:
        return "libx264"
    for enc in ("h264_videotoolbox", "h264_nvenc", "h264_qsv", "h264_amf"):
        test = ["ffmpeg", "-v", "error", "-nostdin", "-f", "lavfi", "-i",
                "color=c=black:s=256x256:d=0.2", "-c:v", enc, "-f", "null", "-"]
        if subprocess.run(test, capture_output=True).returncode == 0:
            return enc
    return "libx264"


def _encode_args(enc, cfg):
    if enc == "libx264":
        return ["-c:v", "libx264", "-crf", str(cfg["crf"]), "-preset", cfg["x264_preset"],
                "-profile:v", "high", "-pix_fmt", "yuv420p"]
    return ["-c:v", enc, "-b:v", "16M", "-maxrate", "20M", "-bufsize", "30M", "-pix_fmt", "yuv420p"]


def check_image(clip, length, dest):
    """Three frames side by side, so a person (or an agent that can see images) can check
    the framing, the title and the captions without playing the video."""
    from PIL import Image
    shots = []
    for i, f in enumerate((0.2, 0.5, 0.8)):
        tmp = dest.with_name(dest.stem + f"_{i}.jpg")
        run(["ffmpeg", "-y", "-v", "error", "-nostdin", "-ss", f"{length * f:.2f}", "-i", str(clip),
             "-frames:v", "1", "-vf", "scale=360:-2", str(tmp)])
        with Image.open(tmp) as im:
            shots.append(im.convert("RGB"))
        tmp.unlink(missing_ok=True)
    sheet = Image.new("RGB", (sum(s.width for s in shots) + 20, shots[0].height), (20, 20, 20))
    x = 0
    for s in shots:
        sheet.paste(s, (x, 0))
        x += s.width + 10
    sheet.save(dest, quality=85)
    return dest


def make(index, pick, ctx, cfg, memory):
    """ctx: url, args, audio, work, outdir, language, fast, cam. Returns the clip record."""
    start, end = pick["start"], pick["end"]
    length = end - start
    name = f"{index:02d}_{slug(pick.get('title') or pick.get('type'), 48)}"
    say(f"clip {index}: {pick.get('title') or pick.get('type')}  ({length:.0f}s at "
        f"{int(start // 3600)}:{int(start // 60 % 60):02d}:{int(start % 60):02d})", "step")
    clips_dir = ctx["work"] / "clips"
    clips_dir.mkdir(exist_ok=True)
    part = media.video_slice(ctx["url"], ctx["args"], start - PAD, end + PAD,
                             clips_dir / f"{name}.src.mp4", cfg["video_height"])
    info = probe(part)
    if not info["width"]:
        raise Problem("the downloaded video has no picture")

    at, conf = sync(part, ctx["audio"], start - PAD)
    offset = start - at if conf >= 0.45 else min(PAD, max(0.0, start))
    offset = min(max(0.0, offset), max(0.0, info["duration"] - length))
    if conf < 0.45:
        say(f"  weak sound match ({conf:.2f}); using the requested times, may be off by ~1 s", "warn")

    words, _ = listen.transcribe(cfg["caption_model"], decode(part, 16000, offset, length),
                                 ctx["language"])
    ass = subs.write(words, length, clips_dir / f"{name}.ass", cfg)
    graph, look, seam = frame.plan(part, offset, length, info, cfg, memory, ctx.get("cam"))

    inputs = ["-ss", f"{offset:.3f}", "-t", f"{length:.3f}", "-i", str(part)]
    if cfg.get("auto_brighten", True) and "setsar=1[g1]" in graph:
        try:                                     # dark night scenes: lift the gameplay so viewers can see it
            import cv2
            cap = cv2.VideoCapture(str(part))
            fps = cap.get(5) or 30
            lum = []
            for f in (0.25, 0.5, 0.75):
                cap.set(1, int((offset + length * f) * fps))
                ok, fr = cap.read()
                if ok:
                    lum.append(cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY).mean())
            if lum and sum(lum) / len(lum) < 55:
                graph = graph.replace("setsar=1[g1]", "eq=gamma=1.45:contrast=1.06:saturation=1.12,setsar=1[g1]", 1)
                say("  dark scene: brightened the gameplay", "info")
        except Exception:
            pass
    pay = pick.get("payoff")
    if pay and cfg.get("payoff_zoom", True):     # punch in on the big moment, then settle back
        W, H = cfg["width"], cfg["height"]
        a, b = pay - 0.15, pay + 1.1
        z = f"if(between(t,{a:.2f},{b:.2f}),1+0.14*min(1,(t-{a:.2f})/0.12),1)"
        zoom = (f"scale=w='trunc({W}*{z}/2)*2':h='trunc({H}*{z}/2)*2':eval=frame,"
                f"crop={W}:{H}:(in_w-{W})/2:(in_h-{H})/2")
        if "[g1][c1]overlay" in graph:           # corner layout: zoom the gameplay, keep the cam still
            graph = graph.replace("[g1][c1]overlay", "[g1z][c1]overlay") + f";[g1]{zoom}[g1z]"
        else:
            graph = graph.replace("[framed]", "[prezoom]") + f";[prezoom]{zoom}[framed]"
    chain = f"{graph};[framed]ass={ass.name}[subbed]"
    out_label = "subbed"
    title = pick.get("title")
    hooks = [h for h in (cfg.get("title_hooks") or []) if "wait for it" not in h.lower()]
    if pick.get("hook"):
        title = pick["hook"]                     # hook written for this clip by the picker
    elif title and hooks:
        import zlib
        title = hooks[zlib.crc32(f"{ctx['url']}|{start}".encode()) % len(hooks)]
    if title:
        try:
            if isinstance(seam, dict):            # corner facecam: hook sits beside it
                W = cfg["width"]
                gap = 22
                left = seam["x"] + gap if seam["side"] == "left" else 30
                room = (W - left - 30) if seam["side"] == "left" else (W - seam["x"] - gap - 30)
                png, tw, th = titlecard.render(title, cfg, clips_dir / f"{name}.title.png", max_width=room)
                tx = left if seam["side"] == "left" else 30
                tx = int(tx + max(0, (room - tw) / 2))
                y = int(seam["y"] + (seam["h"] - th) / 2)
            else:
                png, _, th = titlecard.render(title, cfg, clips_dir / f"{name}.title.png")
                tx = None
                y = int(seam - th / 2) if seam else int(cfg["height"] * cfg["title_top"])
            inputs += ["-i", str(png)]
            xs = "(W-w)/2" if tx is None else str(tx)
            chain += f";[subbed][1:v]overlay={xs}:{max(0, y)}[titled]"
            out_label = "titled"
        except (OSError, ValueError) as exc:
            say(f"  title bar skipped ({exc})", "warn")
    if cfg.get("logo_file"):
        idx = inputs.count("-i")
        inputs += ["-i", str(cfg["logo_file"])]
        lw = int(cfg["width"] * cfg["logo_width"])
        ly = int(cfg["height"] * cfg["logo_y"])
        lx = {"left": "40", "right": "W-w-40"}.get(cfg.get("logo_x"), "(W-w)/2")
        chain += (f";[{idx}:v]scale={lw}:-1[logo];[{out_label}][logo]overlay={lx}:{ly}"
                  f":eof_action=repeat[logoed]")
        out_label = "logoed"
    voice = "premix" if not cfg.get("bg_music") else "voice"
    if cfg["loudness"] is not None:
        chain += f";[0:a]loudnorm=I={cfg['loudness']}:TP=-1.5:LRA=11,aresample=48000[{voice}]"
    else:
        chain += f";[0:a]aresample=48000[{voice}]"
    if cfg.get("bg_music"):
        from . import music
        wav, style, bpm = music.write(clips_dir / f"{name}.bgm.wav", length + 1,
                                      seed=f"{ctx['url']}|{start}", style=cfg.get("bg_music_style"))
        idx = inputs.count("-i")
        inputs += ["-i", str(wav)]
        chain += ";" + music.mix_filter(voice, f"{idx}:a", cfg["bg_music_db"], out_label="premix")
        say(f"  background beat: {style} {bpm} bpm", "info")
    cues = pick.get("sfx") if cfg.get("sfx", True) else None
    if cues:
        from . import sfx
        wav = sfx.write(clips_dir / f"{name}.sfx.wav", cues, length)
        idx = inputs.count("-i")
        inputs += ["-i", str(wav)]
        chain += (f";[{idx}:a]aresample=48000,aformat=channel_layouts=stereo[fx];"
                  f"[premix][fx]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[aud]")
        say("  sound effects: " + ", ".join(f"{c['sound']}@{c['t']:.1f}s" for c in cues), "info")
    else:
        chain += ";[premix]anull[aud]"

    ctx["outdir"].mkdir(parents=True, exist_ok=True)
    dest = ctx["outdir"] / f"{name}.mp4"
    enc = video_encoder(ctx.get("fast", False))
    run(["ffmpeg", "-y", "-v", "error", "-nostdin", *inputs, "-filter_complex", chain,
         "-map", f"[{out_label}]", "-map", "[aud]", *_encode_args(enc, cfg),
         "-r", f"{min(60.0, info['fps']):.3f}", "-c:a", "aac", "-b:a", f"{cfg['audio_kbps']}k",
         "-movflags", "+faststart", dest.name], timeout=3600, cwd=str(clips_dir))
    # ffmpeg ran inside clips_dir (so the .ass path needs no escaping); move the result out
    produced = clips_dir / dest.name
    pay = pick.get("payoff")
    if pay and cfg.get("cold_open", True) and pay > 3.0:
        # cold open: show the payoff first (about 1.5 s), quick white flash, then the whole clip
        a = max(0.0, pay - 0.4)
        b = min(length - 0.05, pay + 1.1)
        cold = clips_dir / f"{name}.cold.mp4"
        run(["ffmpeg", "-y", "-v", "error", "-nostdin",
             "-ss", f"{a:.3f}", "-t", f"{b - a:.3f}", "-i", str(produced), "-i", str(produced),
             "-filter_complex",
             f"[0:v]setpts=PTS-STARTPTS,fade=t=out:st={b - a - 0.08:.3f}:d=0.08:color=white[cv];"
             f"[0:a]asetpts=PTS-STARTPTS,afade=t=out:st={b - a - 0.08:.3f}:d=0.08[ca];"
             f"[1:v]fade=t=in:st=0:d=0.12:color=white,setpts=PTS-STARTPTS[mv];[1:a]asetpts=PTS-STARTPTS[ma];"
             f"[cv][ca][mv][ma]concat=n=2:v=1:a=1[v][a]",
             "-map", "[v]", "-map", "[a]", *_encode_args(enc, cfg), "-c:a", "aac",
             "-b:a", f"{cfg['audio_kbps']}k", "-movflags", "+faststart", str(cold)], timeout=3600)
        cold.replace(produced)
    if cfg.get("outro_file"):
        secs = float(cfg.get("outro_seconds") or 2.0)
        W, H = cfg["width"], cfg["height"]
        with_outro = clips_dir / f"{name}.outro.mp4"
        run(["ffmpeg", "-y", "-v", "error", "-nostdin", "-i", str(produced),
             "-loop", "1", "-t", f"{secs}", "-i", str(cfg["outro_file"]),
             "-f", "lavfi", "-t", f"{secs}", "-i", "anullsrc=r=48000:cl=stereo",
             "-filter_complex",
             f"[1:v]scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=black,"
             f"setsar=1,fps={min(60.0, info['fps']):.3f},format=yuv420p[ov];"
             f"[0:v]setsar=1,format=yuv420p[mv];[0:a]aformat=sample_rates=48000:channel_layouts=stereo[ma];"
             f"[mv][ma][ov][2:a]concat=n=2:v=1:a=1[v][a]",
             "-map", "[v]", "-map", "[a]", *_encode_args(enc, cfg), "-c:a", "aac",
             "-b:a", f"{cfg['audio_kbps']}k", "-movflags", "+faststart", str(with_outro)], timeout=3600)
        with_outro.replace(produced)
    produced.replace(dest)
    checks = ctx["outdir"] / "checks"
    checks.mkdir(exist_ok=True)
    try:
        check_image(dest, length, checks / f"{name}.jpg")
    except Problem:
        pass
    part.unlink(missing_ok=True)
    say(f"  saved {dest.name} ({look})", "good")
    caption = (pick.get("caption") or "").strip()
    if cfg.get("caption_prefix"):
        if caption and caption[-1] not in ".!?":
            caption += "."
        caption = f"{caption} {cfg['caption_prefix']}".strip()
    tags = list(cfg.get("required_hashtags") or [])
    tags += [t for t in pick.get("hashtags", []) if t.lower() not in {x.lower() for x in tags}]
    return {"file": dest.name, "type": pick.get("type"), "title": pick.get("title") or title, "hook": title,
            "caption": caption, "hashtags": tags[:6],
            "score": pick.get("score"), "why": pick.get("why"), "look": look,
            "start": round(start, 1), "end": round(end, 1), "seconds": round(length, 1),
            "sync": round(conf, 2)}
