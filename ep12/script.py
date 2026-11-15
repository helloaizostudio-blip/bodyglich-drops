"""Episode 12: "The Cursed Book" (narrator Zash, ~55 s), v2

Magic-world underdog story in the shonen spirit, with our own world and symbols:
  - at eighteen a magic book chooses you (fire, wind, sand...); the GEM on the cover shows how blessed you are
  - Zash has zero magic and gets a black book with a dead gem ("a dead gem is a curse")
  - his brother Kai gets a golden book with a blazing gem and is taken to the castle by the king's knights
  - a monster that EATS magic attacks; the blessed are helpless against it; the cursed kid has nothing to eat
  - the black book opens: two black gauntlets, whatever he punches loses its magic (pays off six years of training)
No names, designs, symbols (no clovers), weapons or terms from any existing series.

Retention: cold open on the stakes + rivalry, fast world setup, humiliation, attack, reversal, one-punch payoff,
an emotional line from the brother, and a "the dead gem glowed" cliffhanger.
"""
TITLE = "The Cursed Book"
SLUG = "ep12_cursed_book"

LINES = [
    ("cold",    "zash",  "tense",   "My brother was chosen by the king. I was called *cursed*. Tonight, I'm the only one who can save him.", ["cold_monster", "cold_zash"]),
    ("world",   "zash",  "excited", "In my world, when you turn eighteen, a magic book chooses you! Fire! Wind! *Sand*!",               ["book_ceremony", "book_fire", "book_wind"]),
    ("kai",     "zash",  "calm",    "My brother Kai got a golden book. Its gem shone like the sun. Blessed by the *gods*.",             ["kai_book", "kai_gem"]),
    ("knights", "zash",  "calm",    "The king's knights took him to the castle that *night*.",                                          ["knights_take"]),
    ("mine",    "zash",  "sad",     "My book was black. Its gem was dead. And a dead gem means you're *cursed*.",                       ["zash_book", "dead_gem"]),
    ("brick",   "brick", "excited", "A cursed book for a cursed *boy*!",                                                                ["brick_laugh"]),
    ("train",   "zash",  "excited", "I never had magic. So I trained! Six years! Every single *day*!",                                  ["train_pushups", "train_boulder", "train_buff"]),
    ("attack",  "zash",  "tense",   "Then a monster attacked the castle. It eats magic! Every spell made it *bigger*!",                 ["monster_castle", "spells_eaten"]),
    ("bite",    "zash",  "tense",   "It swallowed my brother's magic in one *bite*.",                                                   ["kai_drained"]),
    ("run",     "kai",   "sad",     "Zash, *run*!",                                                                                     ["kai_run"]),
    ("stay",    "zash",  "calm",    "I didn't run. I had no magic to *eat*.",                                                           ["zash_walks"]),
    ("open",    "zash",  "whisper", "And my black book finally *opened*.",                                                              ["book_opens"]),
    ("fists",   "zash",  "excited", "Two black gauntlets! Whatever I punch loses its magic. *Forever*!",                                ["gauntlets", "zash_pose"]),
    ("punch",   "zash",  "excited", "That monster was made of stolen magic. One punch. *Gone*!",                                        ["one_punch", "monster_gone"]),
    ("cure",    "kai",   "calm",    "You're not cursed. You're the *cure*.",                                                            ["kai_smile"]),
    ("glow",    "zash",  "whisper", "Then my dead gem started to *glow*.",                                                              ["gem_glow"]),
]

VOICES = {
    "zash":  dict(voice="am_echo", speed=1.10, pitch=1.28, expressive=True, resample=True, gain_db=2.5, energy=True),   # narrator voice the user picked (option V), exciting mode
    "kai":   dict(voice="am_michael", speed=1.05, pitch=1.0, expressive=True),
    "brick": dict(voice="am_fenrir", speed=1.08, pitch=1.0, expressive=True),
}
LONG_GAPS = {"cold": 0.25, "kai": 0.15, "knights": 0.2, "mine": 0.3, "brick": 0.25, "train": 0.15, "attack": 0.15, "bite": 0.25, "run": 0.3, "stay": 0.3, "open": 0.45, "fists": 0.2, "punch": 0.35, "cure": 0.4}
TAIL = 2.0
LEAD = 0.0
