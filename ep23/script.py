"""Episode 23: "Every Lie Makes You Old" (In my world..., narrator Zash, original).
Rule: every lie ages you. Mom is 38 and looks 90. Zash is ashamed - until he sees every lie was for him
("I already ate"). He slides the roti back: "I'm not hungry" - and gets his first wrinkle. Ends on Mom's smile + FOLLOW (no share line).
"""
TITLE = "Every Lie Makes You Old"
SLUG = "ep23_every_lie"

LINES = [
    ("hook",   "zash",    "tense",   "In my world... every lie makes you *older*.", ["world_open", "kid_beard"]),
    ("cookie", "kid",     "excited", "I didn't eat the *cookie*!", ["cookie_kid"]),
    ("teach",  "teacher", "calm",    "This won't be on the *exam*.", ["teacher_ages"]),
    ("nolie",  "zash",    "calm",    "So nobody lies. Nobody... except my *mom*.", ["mom_reveal"]),
    ("age",    "zash",    "calm",    "She's *thirty-eight*.", ["mom_cane"]),
    ("me",     "zash",    "excited", "Me? I *never* lie.", ["zash_proud"]),
    ("h1",     "zfast",   "calm",    "Huss huss huss.", ["zash_scroll"]),
    ("study",  "dad",     "tense",   "Are you *scrolling*?", ["dad_door"]),
    ("yes",    "zash",    "excited", "No, Dad! *Studying*!", ["zash_mustache"]),
    ("stache", "dad",     "calm",    "Nice *moustache*.", ["dad_stare"]),
    ("bully",  "crowd",   "excited", "Your mom's a *granny*!", ["school_gate"]),
    ("shame",  "zash",    "sad",     "And I was... *ashamed* of her.", ["zash_walks_away"]),
    ("ate",    "mom",     "calm",    "I already ate.", ["dinner_roti"]),
    ("shoes",  "mom",     "calm",    "I don't need new slippers.", ["torn_slippers"]),
    ("back",   "mom",     "sad",     "My back doesn't hurt.", ["mom_back"]),
    ("cycle",  "mom",     "calm",    "It wasn't expensive.", ["flash_cycle"]),
    ("tired",  "mom",     "sad",     "I'm not tired. Sleep, baby.", ["flash_lullaby"]),
    ("forme",  "zash",    "sad",     "Every wrinkle on her face... was a lie... for *me*.", ["zash_realize"]),
    ("hungry", "zash",    "sad",     "Mom... I'm not *hungry*.", ["roti_back", "zash_wrinkle"]),
    ("smile",  "mom",     "calm",    "You learned it *too*.", ["mom_smiles", "end_card"]),
]

CLEAR = "highpass=f=85,equalizer=f=320:t=q:w=1.0:g=-2.5,equalizer=f=3200:t=q:w=1.4:g=2.0,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=150:makeup=2,alimiter=limit=0.9"
# the voice recipe from ep22 (the one that sounded right), narrator a touch faster; Mom is the natural af_heart voice, unshifted
VOICES = {
    "zash":    dict(voice="am_echo", speed=1.16, pitch=1.20, expressive=True, resample=True, gain_db=2.0, tag_amt=0.3, filter=CLEAR),
    "zfast":   dict(voice="am_echo", speed=1.55, pitch=1.20, expressive=False, resample=True, tag_amt=0.0, filter=CLEAR),
    "kid":     dict(voice="am_puck", speed=1.10, pitch=1.24, expressive=True, resample=True, gain_db=1.5, tag_amt=0.3, filter=CLEAR),
    "teacher": dict(voice="bm_george", speed=1.05, pitch=1.0, expressive=True, gain_db=1.5, tag_amt=0.3, filter=CLEAR),
    "mom":     dict(voice="af_heart", speed=1.0, pitch=1.0, expressive=True, gain_db=2.5, tag_amt=0.3, filter=CLEAR),
    "dad":     dict(voice="bm_george", speed=1.05, pitch=1.0, expressive=True, gain_db=1.5, tag_amt=0.3, filter=CLEAR),
    "crowd":   dict(voice="am_liam", speed=1.12, pitch=1.10, expressive=True, resample=True, tag_amt=0.4, filter="aecho=0.8:0.5:18|31:0.35|0.25," + CLEAR),
}
LONG_GAPS = {"hook": 0.25, "cookie": 0.3, "teach": 0.35, "nolie": 0.2, "age": 0.55, "me": 0.15, "h1": 0.3, "study": 0.2, "yes": 0.45, "stache": 0.5, "bully": 0.3,
             "shame": 0.7, "ate": 0.55, "shoes": 0.55, "back": 0.55, "cycle": 0.55, "tired": 0.7, "forme": 0.7, "hungry": 0.8}
TAIL = 2.2
LEAD = 0.0
