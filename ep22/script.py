"""Episode 22: "The Name On My Wrist" (In my world..., narrator Zash, original; heart + a small laugh).

Built from the account's own data: a one-line mystery rule in the first 3 seconds, a personal school story, ~32 s,
and an ending aimed at one specific person. Everyone is born with their best friend's name on their wrist. Zash's is
blank. Tobi's says ZASH - until the rain makes it run: it's marker. Tobi's wrist is blank too; he's written Zash's
name every morning since first grade. Zash takes the marker and writes TOBI.
"""
TITLE = "The Name On My Wrist"
SLUG = "ep22_name_on_my_wrist"

LINES = [
    ("hook",   "zash",  "tense",   "In my world, you're born with your best friend's name on your wrist. Mine... is *blank*.", ["wrist_names", "zash_blank"]),
    ("school", "zash",  "calm",    "At school, everyone compares names. Me? I hide my *arm*.", ["kids_compare", "zash_hides"]),
    ("laugh",  "crowd", "excited", "Nobody's best *friend*!", ["bullies_point"]),
    ("tobi",   "zash",  "calm",    "Only Tobi sat with me. And his wrist said... *Zash*.", ["tobi_sits", "tobi_wrist"]),
    ("rain",   "zash",  "tense",   "Then one day it rained... and his name started to *run*.", ["rain_walk", "ink_runs"]),
    ("marker", "zash",  "whisper", "It was *marker*.", ["zash_stares"]),
    ("truth",  "tobi",  "sad",     "Mine's blank too. I've been writing your name every morning... since first *grade*.", ["tobi_confess"]),
    ("h1",     "zfast", "calm",    "Huss huss huss. Huss huss huss.", ["little_tobi"]),
    ("took",   "zash",  "calm",    "So I took the marker...", ["zash_marker"]),
    ("h2",     "zfast", "calm",    "Huss huss huss.", ["zash_writes"]),
    ("wrote",  "zash",  "calm",    "...and wrote *his*.", ["two_wrists"]),
    ("cta",    "zash",  "calm",    "Send this to the friend whose name you'd *write*.", ["end_card"]),
]

CLEAR = "highpass=f=85,equalizer=f=320:t=q:w=1.0:g=-2.5,equalizer=f=3200:t=q:w=1.4:g=2.0,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=150:makeup=2,alimiter=limit=0.9"
VOICES = {
    "zash":  dict(voice="am_echo", speed=1.08, pitch=1.20, expressive=True, resample=True, gain_db=2.0, tag_amt=0.3, filter=CLEAR),
    "zfast": dict(voice="am_echo", speed=1.55, pitch=1.20, expressive=False, resample=True, tag_amt=0.0, filter=CLEAR),   # placeholder, replaced by the hus hits (huss_patch.py)
    "tobi":  dict(voice="am_puck", speed=1.0, pitch=1.12, expressive=True, resample=True, gain_db=1.5, tag_amt=0.3, filter=CLEAR),
    "crowd": dict(voice="am_liam", speed=1.08, pitch=1.10, expressive=True, resample=True, tag_amt=0.4, filter="aecho=0.8:0.5:18|31:0.35|0.25," + CLEAR),
}
LONG_GAPS = {"hook": 0.35, "school": 0.2, "laugh": 0.3, "tobi": 0.45, "rain": 0.5, "marker": 0.6, "truth": 0.3, "h1": 0.5, "took": 0.2, "h2": 0.3, "wrote": 0.6}
TAIL = 1.5
LEAD = 0.0
