"""Download a public Google Drive file in byte ranges (works when whole-file downloads hit the quota page).
usage: python3 drive_chunks.py FILE_ID OUT.mp4"""
import sys, subprocess, os
from concurrent.futures import ThreadPoolExecutor

fid, out = sys.argv[1], sys.argv[2]
url = f"https://drive.usercontent.google.com/download?id={fid}&export=download&confirm=t"
CH = 32 * 1024 * 1024
tmp = out + ".parts"
os.makedirs(tmp, exist_ok=True)


def get(i):
    p = f"{tmp}/{i:05d}"
    if os.path.exists(p) and os.path.getsize(p) > 0:
        with open(p, "rb") as f:
            if not f.read(64).lstrip().lower().startswith(b"<!doctype"):
                return os.path.getsize(p)
    for _ in range(4):
        r = subprocess.run(["curl", "-sL", "-r", f"{i*CH}-{(i+1)*CH-1}", "-o", p, "-w", "%{http_code}",
                            "--max-time", "300", url], capture_output=True, text=True)
        if r.stdout.strip() in ("206", "200"):
            with open(p, "rb") as f:
                head = f.read(64)
            if not head.lstrip().lower().startswith(b"<!doctype"):
                return os.path.getsize(p)
        if r.stdout.strip() == "416":
            open(p, "wb").close()
            return 0
    raise SystemExit(f"chunk {i} failed ({r.stdout})")


i, done = 0, False
with ThreadPoolExecutor(6) as ex:
    while not done:
        sizes = list(ex.map(get, range(i, i + 6)))
        for k, s in enumerate(sizes):
            if s < CH:
                done = True
                last = i + k
                break
        i += 6
with open(out, "wb") as o:
    for j in range(last + 1):
        with open(f"{tmp}/{j:05d}", "rb") as f:
            o.write(f.read())
subprocess.run(["rm", "-rf", tmp])
print(out, os.path.getsize(out))
