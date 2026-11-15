"""Episode 12: "The Cursed Grimoire" (narrator Zash, ~55 s), v3

Magic-world underdog story in the shonen spirit, with our own world and symbols:
  - at eighteen a magic book chooses you (fire, wind, sand...); the GEM on the cover shows how blessed you are
  - Zash has zero magic and gets a black book with a dead gem ("a dead gem is a curse")
  - his brother Kai gets a golden book with a blazing gem and is taken to the castle by the king's knights
  - v3: the villain is a fire mage who grabs Mom (cold open); Kai's storm can't touch him; the cursed mark is a black sun
  - the black book opens: two black gauntlets, whatever he punches loses its magic (pays off six years of training)
No names, designs, symbols (no clovers), weapons or terms from any existing series.

Retention: cold open on the stakes + rivalry, fast world setup, humiliation, attack, reversal, one-punch payoff,
an emotional line from the brother, and a "the dead gem glowed" cliffhanger.
"""
TITLE = "The Cursed Grimoire"
SLUG = "ep12_cursed_grimoire"

LINES = [
    ("cold",    "zash",  "tense",   "A fire mage is about to burn my mom alive! And I'm the only person in this world with *zero* magic.",   ["cold_fire", "cold_zash"]),
    ("intro",   "zash",  "excited", "I'm Zash. In my world, everyone gets a magic book when they turn eighteen. A *grimoire*!",              ["zash_intro", "grimoire_wall"]),
    ("born",    "zash",  "sad",     "I was born without a drop of magic. Kids used me for target *practice*.",                              ["bully_blast", "zash_down"]),
    ("alone",   "zash",  "sad",     "I ate lunch alone for twelve *years*.",                                                                ["lunch_alone"]),
    ("train",   "zash",  "excited", "So I trained my body instead! Six years! Every single *day*!",                                         ["train_pushups", "train_boulder", "train_buff"]),
    ("day",     "zash",  "tense",   "Then the day came. The whole city was watching. The books choose *you*.",                              ["ceremony_wide", "books_float"]),
    ("fire",    "zash",  "excited", "A fire grimoire chose the fire kid! A storm grimoire chose my brother Kai! Blessed by the *gods*!",     ["book_fire", "book_storm", "kai_blessed"]),
    ("mine",    "zash",  "sad",     "Mine was grey. Dull. And on the cover, a black sun. The mark of the *cursed*.",                         ["book_grey", "black_sun"]),
    ("brick",   "brick", "excited", "A cursed book for a cursed *boy*!",                                                                    ["brick_laugh"]),
    ("night",   "zash",  "tense",   "That night, the fire mage came. He grabbed my *mom*.",                                                 ["village_fire", "mage_mom"]),
    ("kai",     "zash",  "tense",   "My brother's storm couldn't even *touch* him.",                                                        ["kai_fails"]),
    ("fists",   "zash",  "excited", "So I ran at him with nothing but my *fists*!",                                                         ["zash_charge"]),
    ("open",    "zash",  "whisper", "And my cursed book *opened*.",                                                                         ["book_opens"]),
    ("gaunt",   "zash",  "excited", "Two black gauntlets! Whatever I punch loses its magic. *Forever*!",                                    ["gauntlets", "zash_pose"]),
    ("punch",   "zash",  "excited", "His fire died on my knuckles. One punch. *Done*!",                                                     ["fire_dies", "one_punch"]),
    ("mom",     "mom",   "excited", "That's my *son*!",                                                                                     ["mom_proud"]),
    ("glow",    "zash",  "whisper", "Then the black sun on my book began to *glow*.",                                                       ["sun_glow"]),
]

VOICES = {
    "zash":  dict(voice="am_echo", speed=1.10, pitch=1.28, expressive=True, resample=True, gain_db=2.5, energy=True),   # narrator voice the user picked (option V), exciting mode
    "mom":   dict(voice="af_heart", speed=1.05, pitch=1.0, expressive=True, smooth=True, gen_speed=1.0),
    "brick": dict(voice="am_fenrir", speed=1.08, pitch=1.0, expressive=True),
}
LONG_GAPS = {"cold": 0.25, "intro": 0.15, "born": 0.2, "alone": 0.3, "train": 0.15, "day": 0.2, "fire": 0.2, "mine": 0.35, "brick": 0.25, "night": 0.2, "kai": 0.2, "fists": 0.2, "open": 0.45, "gaunt": 0.2, "punch": 0.35, "mom": 0.4}
TAIL = 2.0
LEAD = 0.0
