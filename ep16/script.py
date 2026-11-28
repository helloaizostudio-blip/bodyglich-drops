"""Episode 16: "The Stinky Stone" (comedy, narrator Zash; follows Ep 15 without saying "part 2").

Tobi is now the only guy who likes guys. A 2 s black-and-white flashback points at the last video. Zash finds another
wish stone in the school toilet and offers Tobi one wish to flip back; Tobi says he's good and wishes everyone would
mind their own business. The stone takes it literally: everyone is running a shop. Cliffhanger: Brick finds a stone.
"""
TITLE = "The Stinky Stone"
SLUG = "ep16_stinky_stone"

LINES = [
    ("hook",   "zash",  "excited", "My best friend is the only guy in this world who likes *guys*.", ["caf_couples", "tobi_heart"]),
    ("bullied","zash",  "sad",     "So everyone started bullying *him*.", ["bullies_point"]),
    ("flash",  "zash",  "calm",    "And it was kind of my *fault*.", ["flashback_stone", "flashback_wave"]),
    ("search", "zash",  "tense",   "I felt bad. So I searched everywhere for another magic *stone*.", ["search_puddle", "search_bin"]),
    ("found",  "zash",  "tense",   "I found one. In the school *toilet*.", ["toilet_glow", "zash_horror"]),
    ("worst",  "zash",  "sad",     "Worst day of my life. But a wish is a *wish*.", ["fish_out", "fly_dies"]),
    ("offer",  "zash",  "excited", "One wish, bro. Flip yourself *back*.", ["stone_tray", "guy_waves"]),
    ("nah",    "tobi",  "calm",    "Nah. I'm *good*.", ["tobi_shrug"]),
    ("toilet", "zash",  "excited", "I touched toilet water for *this*?!", ["zash_rage"]),
    ("wish",   "tobi",  "tense",   "I wish everyone would just mind their own *business*.", ["tobi_grabs", "wish_flash"]),
    ("literal","zash",  "calm",    "The stone took it *literally*.", ["hall_shops"]),
    ("brick1", "brick", "excited", "I can't bully anyone! I have *customers*!", ["brick_lemonade"]),
    ("busy",   "zash",  "calm",    "Nobody laughed at Tobi again. They were too *busy*.", ["shop_cuts", "two_straws"]),
    ("turn",   "brick", "whisper", "My *turn*.", ["zash_sniff", "brick_stone"]),
    ("cta",    "zash",  "calm",    "Send this to your friend who likes the same gender... and tell them to mind their own *business*.", ["end_card"]),
]

CLEAR = "highpass=f=85,equalizer=f=320:t=q:w=1.0:g=-2.5,equalizer=f=3200:t=q:w=1.4:g=2.0,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=150:makeup=2,alimiter=limit=0.9"
CROWD = "aecho=0.8:0.5:18|31:0.35|0.25," + CLEAR
VOICES = {   # same clear chain as Ep 15
    "zash":  dict(voice="am_echo", speed=1.10, pitch=1.20, expressive=True, resample=True, gain_db=2.0, tag_amt=0.3, filter=CLEAR),
    "tobi":  dict(voice="am_puck", speed=1.05, pitch=1.12, expressive=True, resample=True, gain_db=1.0, tag_amt=0.3, filter=CLEAR),
    "brick": dict(voice="am_fenrir", speed=1.08, pitch=1.0, expressive=True, gain_db=1.0, tag_amt=0.4, filter=CLEAR),
}
LONG_GAPS = {"hook": 0.15, "bullied": 0.3, "flash": 0.3, "search": 0.25, "found": 0.3, "worst": 0.3, "offer": 0.45, "nah": 0.35, "toilet": 0.3,
             "wish": 0.6, "literal": 0.2, "brick1": 0.25, "busy": 0.5, "turn": 0.5}
TAIL = 1.6
LEAD = 0.0
