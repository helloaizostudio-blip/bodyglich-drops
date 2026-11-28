"""Episode 25: "The Only Topper" (narrator Zash; comedy, a wish that backfires, a twist).

In Zash's world failing is cool and he is the only guy who gets full marks. He wishes to be the dumbest guy alive.
It works: zero marks, everybody loves him - but he forgets how doors work. Twist: everyone else was faking it, they
all study in secret. Ends on him not knowing what a pencil is.
"""
TITLE = "The Only Topper"
SLUG = "ep25_only_topper"

LINES = [
    ("hook",   "zash",  "excited", "In my world, failing is cool. I'm the only guy who gets *full marks*.", ["hall_fail", "zash_100"]),
    ("nerd",   "crowd", "excited", "Ew! He got a *hundred*!", ["bullies_point"]),
    ("dad",    "dad",   "sad",     "A hundred again? I'm so *disappointed*.", ["dad_paper"]),
    ("stone",  "zash",  "tense",   "So I found a wish stone. Make me the *dumbest* guy alive!", ["stone_find", "stone_flash"]),
    ("fish",   "zslow", "calm",    "Two plus two is... *fish*.", ["zash_fish"]),
    ("zero",   "zash",  "excited", "It worked! Zero marks! Everybody *loved* me.", ["zero_cheer"]),
    ("marry",  "mia",   "excited", "Zero? *Marry* me.", ["mia_marry"]),
    ("door",   "zash",  "calm",    "Then I forgot how *doors* work.", ["door_pull"]),
    ("bro",    "tobi",  "calm",    "Bro. It says *pull*.", ["tobi_bro"]),
    ("who",    "zslow", "calm",    "Who's *bro*?", ["zash_who"]),
    ("fake",   "zash",  "tense",   "Then I found out. Everyone was *faking* it.", ["brick_study", "all_books"]),
    ("only",   "zash",  "sad",     "They all study in secret. I'm the only one who's *actually* dumb.", ["zash_alone"]),
    ("pencil", "zslow", "calm",    "What's a... *pencil*?", ["exam_pencil", "end_card"]),
]

CLEAR = "highpass=f=85,equalizer=f=320:t=q:w=1.0:g=-2.5,equalizer=f=3200:t=q:w=1.4:g=2.0,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=150:makeup=2,alimiter=limit=0.9"
VOICES = {
    "zash":  dict(voice="am_echo", speed=1.16, pitch=1.20, expressive=True, resample=True, gain_db=2.0, tag_amt=0.3, filter=CLEAR),
    "zslow": dict(voice="am_echo", speed=0.98, pitch=1.20, expressive=True, resample=True, gain_db=2.0, tag_amt=0.3, filter=CLEAR),   # same boy, brain off
    "mia":   dict(voice="af_bella", speed=1.05, pitch=1.06, expressive=True, resample=True, gain_db=2.0, tag_amt=0.3, filter=CLEAR),
    "tobi":  dict(voice="am_puck", speed=1.05, pitch=1.12, expressive=True, resample=True, gain_db=1.0, tag_amt=0.3, filter=CLEAR),
    "dad":   dict(voice="bm_george", speed=1.05, pitch=1.0, expressive=True, gain_db=1.5, tag_amt=0.3, filter=CLEAR),
    "crowd": dict(voice="am_liam", speed=1.12, pitch=1.10, expressive=True, resample=True, tag_amt=0.4, filter="aecho=0.8:0.5:18|31:0.35|0.25," + CLEAR),
}
LONG_GAPS = {"hook": 0.2, "nerd": 0.3, "dad": 0.35, "stone": 0.5, "fish": 0.45, "zero": 0.2, "marry": 0.4, "door": 0.75, "bro": 0.3, "who": 0.5,
             "fake": 0.3, "only": 0.5}
TAIL = 2.2
LEAD = 0.0
