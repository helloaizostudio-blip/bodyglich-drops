"""Episode 17: "The Job Thief" (comedy, narrator Zash). Parody of a celebrity's career as an original block caricature:
a guy named Robert steals every job in town (basketball player, barista, Mr. Goldbank's wife in the kitchen).
Backstory: magic school, sparkly vampire, a bat suit at night, now a detective. Zash walks up to him: he can't steal
Zash's job because Zash has none. Yin and yang. Twist: Robert steals his unemployment. No trademarked names or logos.
"""
TITLE = "The Job Thief"
SLUG = "ep17_job_thief"

LINES = [
    ("hook",    "zash",   "tense",   "In my world, there's a guy named Robert. If he comes to town, *hide*. He'll steal your *job*.", ["doors_slam", "robert_walks"]),
    ("ball",    "zash",   "excited", "He stole a basketball player's *job*.", ["dunk_steal"]),
    ("cafe",    "zash",   "excited", "A barista's *job*.", ["cafe_steal"]),
    ("honey",   "robert", "calm",    "Dinner's ready, *honey*.", ["goldbank_home", "robert_apron"]),
    ("wife",    "zash",   "excited", "He even stole Mr. Goldbank's *wife's* job.", ["wife_window"]),
    ("magic",   "zash",   "calm",    "They say he started at a magic *school*.", ["back_wizard"]),
    ("vamp",    "zash",   "calm",    "Then he became a sparkly *vampire*.", ["back_vampire"]),
    ("bat",     "zash",   "tense",   "Then he took over his parents' business, put on a bat suit with little bat ears, and punched people at *night*.", ["back_rich", "back_bat"]),
    ("detect",  "zash",   "calm",    "Now he's a *detective*.", ["back_detective"]),
    ("but",     "zash",   "calm",    "But me? I'm not *scared*.", ["robert_arrives", "zash_steps_out"]),
    ("crowd",   "crowd",  "excited", "Come back! He'll steal your *job*!", ["crowd_windows"]),
    ("nojob",   "zash",   "calm",    "He can't steal my job... because I don't *have* one.", ["magnify_search", "zash_shrug"]),
    ("yinyang", "zash",   "calm",    "Me with no job. Him who takes every job. We're yin and yang. We complete each *other*.", ["high_five", "yin_yang"]),
    ("twist",   "zash",   "excited", "Then he stole my *unemployment*.", ["couch_robert", "zash_barista"]),
    ("cta",     "zash",   "calm",    "Send this to your unemployed friend... they're *safe*.", ["end_card"]),
]

CLEAR = "highpass=f=85,equalizer=f=320:t=q:w=1.0:g=-2.5,equalizer=f=3200:t=q:w=1.4:g=2.0,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=150:makeup=2,alimiter=limit=0.9"
CROWD = "aecho=0.8:0.5:18|31:0.35|0.25," + CLEAR
VOICES = {
    "zash":   dict(voice="am_echo", speed=1.10, pitch=1.20, expressive=True, resample=True, gain_db=2.0, tag_amt=0.3, filter=CLEAR),
    "robert": dict(voice="bm_george", speed=0.92, pitch=0.97, expressive=True, gain_db=1.5, tag_amt=0.3, filter=CLEAR),   # stock voice, deadpan
    "crowd":  dict(voice="am_liam", speed=1.10, pitch=1.10, expressive=True, resample=True, tag_amt=0.4, filter=CROWD),
}
LONG_GAPS = {"hook": 0.3, "ball": 0.15, "cafe": 0.25, "honey": 0.45, "wife": 0.4, "magic": 0.1, "vamp": 0.15, "bat": 0.15,
             "detect": 0.5, "but": 0.2, "crowd": 0.25, "nojob": 0.5, "yinyang": 0.5, "twist": 0.4}
TAIL = 1.6
LEAD = 0.0
