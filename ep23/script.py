"""Episode 23: "Every Lie Makes You Old" (In my world..., narrator Zash, original).
Rule: every lie ages you. Dad is 38 and looks 90. Zash is ashamed - until he sees every lie was for him
("I already ate"). He slides the roti back: "I'm not hungry" - and gets his first wrinkle. One-person share ending.
"""
TITLE = "Every Lie Makes You Old"
SLUG = "ep23_every_lie"

LINES = [
    ("cookie", "kid",   "excited", "I didn't eat the *cookie*!", ["cookie_kid"]),
    ("hook",   "zash",  "tense",   "In my world, every lie you tell... makes you *older*.", ["kid_beard"]),
    ("dad",    "zash",  "calm",    "So nobody lies. Except... my *dad*.", ["dad_reveal"]),
    ("age",    "zash",  "calm",    "He's *thirty-eight*.", ["dad_cane"]),
    ("h1",     "zfast", "calm",    "Huss huss huss.", ["zash_scroll"]),
    ("mom",    "mom",   "calm",    "Studying?", ["mom_door"]),
    ("yes",    "zash",  "calm",    "Yes, Mom.", ["zash_mustache"]),
    ("bully",  "crowd", "excited", "Your dad's a *grandpa*!", ["school_gate"]),
    ("shame",  "zash",  "sad",     "I was ashamed of him. I thought he was just... a *liar*.", ["zash_walks_away"]),
    ("ate",    "dad",   "calm",    "I already ate.", ["dinner_roti"]),
    ("shoes",  "dad",   "calm",    "I don't need new shoes.", ["torn_shoes"]),
    ("work",   "dad",   "sad",     "Work was fine.", ["dad_door"]),
    ("forme",  "zash",  "whisper", "Every lie... was for *me*.", ["zash_realize"]),
    ("hungry", "zash",  "calm",    "Dad... I'm not *hungry*.", ["roti_back", "zash_wrinkle"]),
    ("cta",    "zash",  "calm",    "Send this to someone who always says... I already *ate*.", ["end_card"]),
]

CLEAR = "highpass=f=85,equalizer=f=320:t=q:w=1.0:g=-2.5,equalizer=f=3200:t=q:w=1.4:g=2.0,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=150:makeup=2,alimiter=limit=0.9"
VOICES = {
    "zash":  dict(voice="am_echo", speed=1.08, pitch=1.20, expressive=True, resample=True, gain_db=2.0, tag_amt=0.3, filter=CLEAR),
    "zfast": dict(voice="am_echo", speed=1.55, pitch=1.20, expressive=False, resample=True, tag_amt=0.0, filter=CLEAR),
    "kid":   dict(voice="am_puck", speed=1.12, pitch=1.30, expressive=True, resample=True, gain_db=1.5, tag_amt=0.4, filter=CLEAR),
    "mom":   dict(voice="af_heart", speed=0.95, pitch=1.0, expressive=True, resample=True, gain_db=1.5, tag_amt=0.3, filter=CLEAR),
    "dad":   dict(voice="am_michael", speed=0.88, pitch=0.92, expressive=True, resample=True, gain_db=2.0, tag_amt=0.2, filter=CLEAR),
    "crowd": dict(voice="am_liam", speed=1.08, pitch=1.10, expressive=True, resample=True, tag_amt=0.4, filter="aecho=0.8:0.5:18|31:0.35|0.25," + CLEAR),
}
LONG_GAPS = {"cookie": 0.35, "hook": 0.4, "dad": 0.3, "age": 0.5, "h1": 0.35, "mom": 0.35, "yes": 0.6, "bully": 0.3,
             "shame": 0.9, "ate": 0.8, "shoes": 0.8, "work": 0.8, "forme": 0.9, "hungry": 0.8}
TAIL = 1.5
LEAD = 0.0
