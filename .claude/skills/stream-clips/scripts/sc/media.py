"""yt-dlp wrappers. A stream is fetched as audio first; video only for the seconds that
become clips, so a 6-hour stream costs a few hundred MB instead of many GB."""

import concurrent.futures
import shutil
import time
import urllib.parse
import urllib.request
from pathlib import Path

from .common import Problem, read_json, run, say, write_json

META_KEYS = ("id", "title", "channel", "uploader", "duration", "view_count", "live_status",
             "is_live", "was_live", "webpage_url", "extractor_key", "timestamp",
             "release_timestamp", "upload_date")


def ytdlp_args(url, cookies=None):
    """Options every yt-dlp call for this URL needs."""
    args = ["--no-playlist", "--no-warnings"]
    if url.startswith("file://"):
        args.append("--enable-file-urls")
    youtube = "youtu" in url
    if youtube and not shutil.which("deno"):
        for runtime in ("node", "bun"):
            path = shutil.which(runtime)
            if path:
                args += ["--js-runtimes", f"{runtime}:{path}"]
                break
    if cookies:
        args += ["--cookies-from-browser", cookies]
    return args


def friendly(exc, url):
    """Turn common yt-dlp failures into the fix the user needs."""
    text = str(exc)
    low = text.lower()
    if "confirm your age" in low or "sign in to confirm" in low or "age-restricted" in low:
        return Problem("YouTube needs a login for this video (age-restricted). Run again with "
                       "--cookies chrome (or the browser you are signed in with).")
    if "kick" in url and ("403" in text or "forbidden" in low):
        return Problem("Kick blocked the download. Run again with --cookies chrome.")
    if "subscriber" in low or "sub-only" in low or "only available to" in low:
        return Problem("This VOD is subscriber-only. Run again with --cookies <browser> from an "
                       "account that can watch it.")
    if "not a bot" in low:
        return Problem("YouTube is asking to confirm you're not a bot. Run again with "
                       "--cookies chrome, or wait a while.")
    return exc if isinstance(exc, Problem) else Problem(text)


def metadata(url, args, work, refresh=False):
    cached = work / "meta.json"
    meta = read_json(cached)
    stale = meta and meta.get("live_status") == "is_live" and time.time() - meta.get("_at", 0) > 300
    if meta and not refresh and not stale:
        return meta
    import json
    try:
        full = json.loads(run(["yt-dlp", "-J", *args, url], timeout=240))
    except Problem as exc:
        raise friendly(exc, url) from None
    meta = {k: full.get(k) for k in META_KEYS}
    meta["name"] = meta.get("channel") or meta.get("uploader") or "creator"
    meta["_at"] = time.time()
    write_json(cached, meta)
    return meta


def _finished(folder, stem):
    return [p for p in folder.glob(stem + ".*")
            if not p.name.endswith((".part", ".ytdl", ".json", ".tmp")) and ".part-" not in p.name]


def audio(url, args, work, live=False):
    """The full audio track of the stream (reused between runs unless the stream is live)."""
    have = _finished(work, "audio")
    if have and not live:
        say(f"reusing downloaded audio ({have[0].stat().st_size / 1e6:.0f} MB)", "good")
        return have[0]
    for old in work.glob("audio.*"):
        old.unlink(missing_ok=True)
    say("downloading the audio track (video comes later, only for the clips)...", "step")
    if "twitch.tv" in url:
        dest = hls_slice(url, args, "Audio_Only/audio_only/worst", 0, 1e9, work / "audio.m4a")
        say(f"audio ready ({dest.stat().st_size / 1e6:.0f} MB)", "good")
        return dest
    extra = ["--live-from-start"] if live and "youtu" in url else []
    try:
        run(["yt-dlp", *args, *extra, "-f", "ba/b", "-N", "4",
             "-o", str(work / "audio.%(ext)s"), url], timeout=4 * 3600)
    except Problem as exc:
        raise friendly(exc, url) from None
    have = _finished(work, "audio")
    if not have:
        raise Problem("the download finished but no audio file appeared")
    say(f"audio ready ({have[0].stat().st_size / 1e6:.0f} MB)", "good")
    return have[0]


def _get(u, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(u, timeout=60) as r:
                return r.read()
        except OSError:
            if i == tries - 1:
                raise
            time.sleep(2 * (i + 1))


def hls_slice(url, args, fmt, start, end, dest: Path):
    """[start, end] seconds of an HLS VOD (Twitch), fetched segment by segment in Python and
    joined locally. Used because ffmpeg can't read HTTPS through some proxies."""
    m3u8 = run(["yt-dlp", *args, "-f", fmt, "-g", url], timeout=240).strip().splitlines()[0]
    text = _get(m3u8).decode()
    init, segs, t = None, [], 0.0
    dur = None
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("#EXT-X-MAP:"):
            init = line.split('URI="', 1)[1].split('"', 1)[0]
        elif line.startswith("#EXTINF:"):
            dur = float(line[8:].split(",", 1)[0])
        elif line and not line.startswith("#") and dur is not None:
            if t + dur > start and t < end:
                segs.append((t, line))
            t += dur
            dur = None
    if not segs:
        raise Problem(f"no segments for {start:.0f}-{end:.0f}s")
    urls = [urllib.parse.urljoin(m3u8, u) for _, u in segs]
    raw = dest.with_suffix(".raw.mp4" if init or segs[0][1].endswith(".mp4") else ".raw.ts")
    with open(raw, "wb") as f, concurrent.futures.ThreadPoolExecutor(8) as pool:
        if init:
            f.write(_get(urllib.parse.urljoin(m3u8, init)))
        for i in range(0, len(urls), 64):          # in batches, written in order
            for b in pool.map(_get, urls[i:i + 64]):
                f.write(b)
    run(["ffmpeg", "-y", "-v", "error", "-nostdin", "-ss", f"{max(0.0, start - segs[0][0]):.2f}",
         "-i", str(raw), "-t", f"{end - start:.2f}", "-c", "copy", "-movflags", "+faststart",
         str(dest)], timeout=900)
    raw.unlink(missing_ok=True)
    return dest


def video_slice(url, args, start, end, dest: Path, max_height):
    """Only [start, end] seconds of the video, as an mp4."""
    if dest.exists() and dest.stat().st_size > 50_000:
        return dest
    if url.startswith("file://") or Path(url).exists():
        from urllib.parse import unquote, urlparse
        src = unquote(urlparse(url).path) if url.startswith("file://") else url
        run(["ffmpeg", "-y", "-v", "error", "-nostdin", "-ss", f"{max(0, start):.3f}", "-to", f"{end:.3f}",
             "-i", src, "-c", "copy", "-avoid_negative_ts", "make_zero", str(dest)], timeout=1800)
        return dest
    if "twitch.tv" in url:
        h = "1080p60" if max_height >= 1080 else "720p60"
        return hls_slice(url, args, f"{h}/720p60/best", max(0, start), end, dest)
    for old in dest.parent.glob(dest.stem + ".*"):
        old.unlink(missing_ok=True)
    fmt = (f"bv*[height<={max_height}][vcodec^=avc1]+ba/bv*[height<={max_height}]+ba/"
           f"b[height<={max_height}]/bv*+ba/b")
    try:
        run(["yt-dlp", *args, "-f", fmt, "--merge-output-format", "mp4",
             "--download-sections", f"*{max(0, start):.2f}-{end:.2f}",
             "-o", str(dest.with_suffix(".%(ext)s")), url], timeout=1800)
    except Problem as exc:
        raise friendly(exc, url) from None
    got = _finished(dest.parent, dest.stem)
    if not got:
        raise Problem(f"no video came back for {start:.0f}-{end:.0f}s")
    if got[0] != dest:
        got[0].replace(dest)
    return dest
