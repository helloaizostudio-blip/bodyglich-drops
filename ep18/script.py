"""Episode 18: "The Hiccup Rule" (comedy, narrator Zash, original).

In Zash's world you hiccup every time someone thinks about you. The popular kid hiccups 300 times a day, couples hiccup
in sync, Brick never does, Zash has never hiccuped. In the middle of a math test: hic. Then hundreds, until he's
bouncing off the ceiling. Not Mia. Twist: Mom posted his baby bath photo in the 247-member family group.
"""
TITLE = "The Hiccup Rule"
SLUG = "ep18_hiccup_rule"

LINES = [
    ("hook",   "zash",  "excited", "In my world, you hiccup every time someone *thinks* about you.", ["girl_hic", "rule_card"]),
    ("rule",   "zash",  "excited", "The popular kid hiccups three hundred times a day. Couples hiccup in sync. Brick? *Zero*.", ["popular_kid", "couple_sync", "brick_zero"]),
    ("me",     "zash",  "sad",     "Me? Sixteen years. Not *one* hiccup.", ["zash_cobweb"]),
    ("test",   "zash",  "whisper", "Then, in the middle of a math test...", ["math_test"]),
    ("hic1",   "zash",  "tense",   "*Hic*!", ["first_hic"]),
    ("class",  "crowd", "whisper", "Someone's thinking about *Zash*?!", ["class_turns"]),
    ("worse",  "zash",  "excited", "Ten. Fifty. Two *hundred*. Who was thinking about me this hard?!", ["hic_counter", "ceiling_bounce"]),
    ("mia",    "zash",  "calm",    "Mia? ...No. *Not* Mia.", ["mia_window"]),
    ("mom",    "zash",  "tense",   "Mom posted my baby bath photo... in the family group. With two hundred forty seven *relatives*.", ["mom_phone", "group_chat"]),
    ("cta",    "zash",  "calm",    "Send this to the person who makes you hiccup... *hic*.", ["end_card"]),
]

CLEAR = "highpass=f=85,equalizer=f=320:t=q:w=1.0:g=-2.5,equalizer=f=3200:t=q:w=1.4:g=2.0,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=150:makeup=2,alimiter=limit=0.9"
CROWD = "aecho=0.8:0.5:18|31:0.35|0.25," + CLEAR
VOICES = {
    "zash":  dict(voice="am_echo", speed=1.10, pitch=1.20, expressive=True, resample=True, gain_db=2.0, tag_amt=0.3, filter=CLEAR),
    "crowd": dict(voice="af_nicole", speed=1.05, pitch=1.10, expressive=True, resample=True, tag_amt=0.4, filter=CROWD),
}
LONG_GAPS = {"hook": 0.25, "rule": 0.3, "me": 0.35, "test": 0.6, "hic1": 0.5, "class": 0.3, "worse": 0.3, "mia": 0.45, "mom": 0.5}
TAIL = 1.6
LEAD = 0.0
