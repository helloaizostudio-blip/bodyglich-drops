#!/usr/bin/env python3
"""Free views table for every channel in channels.json, from public YouTube RSS feeds (no credits).
Prints: channel | Shorts | views | best Short (views), and the overall total."""
import json, re, urllib.request
from pathlib import Path

T = N = 0
for c in json.load(open(Path(__file__).with_name("channels.json")))["channels"]:
    x = urllib.request.urlopen(f"https://www.youtube.com/feeds/videos.xml?channel_id={c['channel_id']}", timeout=30).read().decode()
    es = [(int(re.search(r'views="(\d+)"', e).group(1)), re.search(r"<title>(.*?)</title>", e).group(1)[:45])
          for e in x.split("<entry>")[1:]]
    tot = sum(v for v, _ in es); T += tot; N += len(es)
    best = max(es) if es else (0, "-")
    print(f"{c['channel']} | {len(es)} | {tot} | {best[1]} ({best[0]})")
print(f"TOTAL | {N} Shorts | {T} views")
