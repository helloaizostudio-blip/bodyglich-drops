#!/usr/bin/env python3
"""Add meme sound effects to a finished clip at given times (seconds from the clip start).

    python3 add_sfx.py clip.mp4 "boom@3.2,scratch@7.5"         # replaces the clip in place
    python3 add_sfx.py --words clip.mp4                        # print word timings to choose from

Sounds: boom scratch airhorn whoosh ding bonk boing dundun sadtrombone riser (see sc/sfx.py).
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sc import sfx  # noqa: E402


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json",
                          str(path)], capture_output=True, text=True, check=True).stdout
    return float(json.loads(out)["format"]["duration"])


def words(path):
    from faster_whisper import WhisperModel
    model = WhisperModel("base", device="cpu", compute_type="int8",
                         download_root=str(Path.home() / ".streamclips" / "models" / "whisper"))
    import numpy as np
    raw = subprocess.run(["ffmpeg", "-v", "error", "-nostdin", "-i", str(path), "-ac", "1", "-ar", "16000",
                          "-f", "s16le", "-"], capture_output=True, check=True).stdout
    audio = np.frombuffer(raw, "<i2").astype(np.float32) / 32768
    segs, _ = model.transcribe(audio, word_timestamps=True, language="en")
    line, start = [], None
    for s in segs:
        for w in s.words:
            start = w.start if start is None else start
            line.append(w.word.strip())
            if len(line) >= 8 or w.word.strip().endswith((".", "?", "!")):
                print(f"[{start:5.1f}] {' '.join(line)}")
                line, start = [], None
    if line:
        print(f"[{start:5.1f}] {' '.join(line)}")


def main():
    if sys.argv[1] == "--words":
        for c in sys.argv[2:]:
            print(f"== {c}  ({duration(c):.1f}s)")
            words(c)
        return
    src, spec = Path(sys.argv[1]), sys.argv[2]
    cues = []
    for part in spec.split(","):
        name, at = part.strip().split("@")
        cues.append({"sound": name, "t": float(at)})
    with tempfile.TemporaryDirectory() as tmp:
        wav = sfx.write(Path(tmp) / "fx.wav", cues, duration(src))
        out = Path(tmp) / "out.mp4"
        chain = ("[1:a]aresample=48000,aformat=channel_layouts=stereo[fx];"
                 "[0:a][fx]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[aud]")
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-nostdin", "-i", str(src), "-i", str(wav),
                        "-filter_complex", chain, "-map", "0:v", "-map", "[aud]", "-c:v", "copy",
                        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)], check=True)
        out.replace(src)
    print(f"{src}: " + ", ".join(f"{c['sound']}@{c['t']}" for c in cues))


if __name__ == "__main__":
    main()
