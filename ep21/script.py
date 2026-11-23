"""Episode 21: "Everyone's Playing" (In my world..., narrator Zash, original).

GTA 6 finally comes out and everyone starts living like it (mom steals a car, Brick steals a helicopter, the
principal joins the cops). Zash just scrolls: whoosh whoosh whoosh. Chaos around him, everyone gets five stars,
Zash gets zero. He sees a reel of himself; the scene pulls back into a giant phone; a thumb is about to swipe him.
The game appears only as our own blocky open-world chaos (no real logos, characters or art).
"""
TITLE = "Everyone's Playing"
SLUG = "ep21_everyones_playing"

LINES = [
    ("hook",   "zash",  "excited", "In my world, GTA six finally came out... and *everyone* started living like it.", ["car_flies", "parachute"]),
    ("chaos",  "zash",  "excited", "My mom stole a car. Brick stole a helicopter. Even the principal joined the *cops*.", ["mom_car", "brick_heli", "principal_cop"]),
    ("except", "zash",  "calm",    "Everyone was playing. Except *me*.", ["zash_bench"]),
    ("w1",     "zfast", "calm",    "Whoosh whoosh whoosh. Whoosh whoosh whoosh.", ["thumb_blur"]),
    ("w2",     "zfast", "calm",    "Whoosh whoosh whoosh.", ["car_flip"]),
    ("tobi",   "tobi",  "excited", "Bro! We waited thirteen years for this and you're *scrolling*?!", ["tobi_rocket"]),
    ("shh",    "zash",  "calm",    "Shh. *Reels*.", ["zash_shh"]),
    ("w3",     "zfast", "calm",    "Whoosh whoosh whoosh.", ["thumb_blur2"]),
    ("stars",  "zash",  "excited", "Everyone got five stars. Me? *Zero* stars. Zero *problems*.", ["five_stars", "arrests", "zash_zero"]),
    ("reel",   "zash",  "tense",   "Then I saw a reel... of *me*.", ["phone_me", "pull_back"]),
    ("wait",   "zash",  "excited", "Wait. Wait! You're about to swipe me, aren't you?", ["giant_thumb"]),
    ("cta",    "zash",  "excited", "Don't scroll. Send this to the friend who's been waiting for GTA six since twenty *thirteen*.", ["end_card"]),
]

CLEAR = "highpass=f=85,equalizer=f=320:t=q:w=1.0:g=-2.5,equalizer=f=3200:t=q:w=1.4:g=2.0,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=150:makeup=2,alimiter=limit=0.9"
VOICES = {
    "zash":  dict(voice="am_echo", speed=1.10, pitch=1.20, expressive=True, resample=True, gain_db=2.0, tag_amt=0.3, filter=CLEAR),
    "zfast": dict(voice="am_echo", speed=1.55, pitch=1.20, expressive=False, resample=True, gain_db=1.0, tag_amt=0.0, filter=CLEAR),   # fast mumbled whooshes
    "tobi":  dict(voice="am_puck", speed=1.08, pitch=1.12, expressive=True, resample=True, gain_db=1.5, tag_amt=0.35, filter=CLEAR),
}
LONG_GAPS = {"hook": 0.3, "chaos": 0.3, "except": 0.2, "w1": 0.5, "w2": 0.3, "tobi": 0.2, "shh": 0.15, "w3": 0.4, "stars": 0.5, "reel": 0.4, "wait": 0.3}
TAIL = 1.4
LEAD = 0.2
