#!/usr/bin/env python3
"""Add a synthesized background beat to clips that are already cut.

    python3 add_music.py clip1.mp4 clip2.mp4 ... [--style trap|lofi|hype] [--db -10] [--suffix ""]

The video stream is copied untouched; only the audio is remixed. With the default empty
--suffix the files are replaced in place.
"""
import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sc import music  # noqa: E402


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json",
                          str(path)], capture_output=True, text=True, check=True).stdout
    return float(json.loads(out)["format"]["duration"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("clips", nargs="+")
    ap.add_argument("--style", choices=music.STYLES)
    ap.add_argument("--db", type=float, default=-10)
    ap.add_argument("--suffix", default="")
    a = ap.parse_args()
    for c in a.clips:
        src = Path(c)
        dest = src.with_name(src.stem + a.suffix + src.suffix)
        with tempfile.TemporaryDirectory() as tmp:
            wav, style, bpm = music.write(Path(tmp) / "bgm.wav", duration(src) + 1,
                                          seed=src.name, style=a.style)
            out = Path(tmp) / "out.mp4"
            chain = "[0:a]aresample=48000[voice];" + music.mix_filter("voice", "1:a", a.db)
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-nostdin", "-i", str(src), "-i", str(wav),
                            "-filter_complex", chain, "-map", "0:v", "-map", "[aud]", "-c:v", "copy",
                            "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)],
                           check=True)
            out.replace(dest)
        print(f"{dest}: {style} {bpm} bpm")


if __name__ == "__main__":
    main()
