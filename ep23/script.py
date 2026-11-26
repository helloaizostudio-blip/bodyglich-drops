"""Episode 23: "Every Lie Makes You Old" (In my world..., narrator Zash, original).
Rule: every lie ages you. Dad is 38 and looks 90. Zash is ashamed - until he sees every lie was for him
("I already ate"). He slides the roti back: "I'm not hungry" - and gets his first wrinkle. One-person share ending.
"""
TITLE = "Every Lie Makes You Old"
SLUG = "ep23_every_lie"

LINES = [
    ("cookie", "kid",   "excited", "I didn't eat the *cookie*!", ["cookie_kid"]),
    ("hook",   "zash",  "tense",   "In my world, every lie you tell... makes you *older*.", ["kid_beard"]),
    ("teach",  "teacher","calm",   "This won't be on the *exam*.", ["teacher_ages"]),
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
    ("cycle",  "dad",   "calm",    "It wasn't expensive.", ["flash_cycle"]),
    ("tired",  "dad",   "calm",    "I'm not tired. Hop on.", ["flash_shoulders"]),
    ("forme",  "zash",  "whisper", "Every lie... every wrinkle... was for *me*.", ["zash_realize"]),
    ("hungry", "zash",  "calm",    "Dad... I'm not *hungry*.", ["roti_back", "zash_wrinkle"]),
    ("smile",  "dad",   "calm",    "Heh. You learned it *too*.", ["dad_smiles"]),
    ("cta",    "zash",  "calm",    "Send this to someone who always says... I already *ate*.", ["end_card"]),
]

CLEAR = "highpass=f=85,equalizer=f=320:t=q:w=1.0:g=-2.5,equalizer=f=3200:t=q:w=1.4:g=2.0,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=150:makeup=2,alimiter=limit=0.9"
VOICES = {
    "zash":  dict(voice="am_echo", speed=1.19, pitch=1.20, expressive=True, resample=True, gain_db=2.0, tag_amt=0.3, filter=CLEAR),
    "zfast": dict(voice="am_echo", speed=1.55, pitch=1.20, expressive=False, resample=True, tag_amt=0.0, filter=CLEAR),
    "kid":   dict(voice="am_puck", speed=1.23, pitch=1.30, expressive=True, resample=True, gain_db=1.5, tag_amt=0.4, filter=CLEAR),
    "teacher": dict(voice="bm_george", speed=1.10, pitch=1.0, expressive=True, resample=True, gain_db=1.5, tag_amt=0.3, filter=CLEAR),
    "mom":   dict(voice="af_heart", speed=1.04, pitch=1.0, expressive=True, resample=True, gain_db=1.5, tag_amt=0.3, filter=CLEAR),
    "dad":   dict(voice="am_michael", speed=0.97, pitch=0.92, expressive=True, resample=True, gain_db=2.0, tag_amt=0.2, filter=CLEAR),
    "crowd": dict(voice="am_liam", speed=1.19, pitch=1.10, expressive=True, resample=True, tag_amt=0.4, filter="aecho=0.8:0.5:18|31:0.35|0.25," + CLEAR),
}
LONG_GAPS = {"cookie": 0.3, "hook": 0.3, "teach": 0.35, "dad": 0.25, "age": 0.45, "h1": 0.3, "mom": 0.3, "yes": 0.5, "bully": 0.25,
             "shame": 0.8, "ate": 0.7, "shoes": 0.7, "work": 0.7, "cycle": 0.7, "tired": 0.8, "forme": 0.8, "hungry": 0.9, "smile": 0.6}
TAIL = 1.5
LEAD = 0.0
