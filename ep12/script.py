"""Episode 12: "The Cursed Grimoire" (narrator Zash, ~55 s), v3

Magic-world underdog story in the shonen spirit, with our own world and symbols:
  - at eighteen a magic book chooses you (fire, wind, sand...); the GEM on the cover shows how blessed you are
  - Zash has zero magic and gets a black book with a dead gem ("a dead gem is a curse")
  - his brother Kai gets a golden book with a blazing gem and is taken to the castle by the king's knights
  - v3: the villain is a fire mage who grabs Mom (cold open); Kai's storm can't touch him; the cursed mark is a black sun
  - v4: an evil fire knight from the monster realm beats the blessed brother, then Zash; when he turns on Mom the
    grimoire shakes and a heavy black katana rises from it (only liftable thanks to the training); it sends the
    knight's attack straight back at him
No names, designs, symbols (no clovers), weapons or terms from any existing series.

Retention: cold open on the stakes + rivalry, fast world setup, humiliation, attack, reversal, one-punch payoff,
an emotional line from the brother, and a "the dead gem glowed" cliffhanger.
"""
TITLE = "The Cursed Grimoire"
SLUG = "ep12_cursed_grimoire"

LINES = [
    ("cold",    "zash",  "tense",   "A fire knight from the monster realm is about to burn my mom alive! And I'm the only person in this world with *zero* magic.", ["cold_fire", "cold_zash"]),
    ("intro",   "zash",  "excited", "I'm Zash. In my world, everyone gets a grimoire when they turn eighteen. A magic *book*!",              ["zash_intro", "grimoire_wall"]),
    ("born",    "zash",  "sad",     "I was born without a drop of magic. Kids used me for target *practice*.",                              ["bully_blast", "zash_down"]),
    ("train",   "zash",  "excited", "So I trained my body instead! Six years! Every single *day*!",                                         ["train_pushups", "train_boulder", "train_buff"]),
    ("day",     "zash",  "tense",   "Then the day came. The whole city was watching. The books choose *you*.",                              ["ceremony_wide", "books_float"]),
    ("fire",    "zash",  "excited", "A fire grimoire chose the fire kid! A storm grimoire chose my brother Kai! Blessed by the *gods*!",     ["book_fire", "book_storm", "kai_blessed"]),
    ("mine",    "zash",  "sad",     "Mine was grey. Dull. With a black sun on the cover. The mark of the *cursed*.",                         ["book_grey", "black_sun"]),
    ("brick",   "brick", "excited", "A cursed book for a cursed *boy*!",                                                                    ["brick_laugh"]),
    ("night",   "zash",  "tense",   "That night, a fire knight walked out of the monster *realm*.",                                         ["portal_open", "knight_reveal"]),
    ("kai",     "zash",  "tense",   "My brother fought him first. The blessed one. He lost in ten *seconds*.",                              ["kai_attacks", "kai_falls"]),
    ("me",      "zash",  "sad",     "Then I tried. He broke me with one *hit*.",                                                            ["zash_charge", "zash_thrown"]),
    ("mom",     "zash",  "tense",   "Then he turned to my *mom*.",                                                                          ["knight_mom"]),
    ("shake",   "zash",  "whisper", "And my grimoire started to *shake*.",                                                                  ["book_shakes"]),
    ("sword",   "zash",  "excited", "A black katana rose out of the pages! Heavy as a boulder. Good thing I lift *boulders*!",              ["katana_rises", "zash_lifts"]),
    ("deflect", "zash",  "excited", "He threw everything he had. My sword sent it right back at *him*!",                                    ["fire_blast", "deflect"]),
    ("done",    "zash",  "calm",    "One swing. *Done*.",                                                                                   ["one_swing"]),
    ("glow",    "zash",  "whisper", "Then the black sun on my book began to *glow*.",                                                       ["sun_glow"]),
]

VOICES = {
    "zash":  dict(voice="am_echo", speed=1.10, pitch=1.28, expressive=True, resample=True, gain_db=2.0, polish=True, tag_amt=0.5),   # narrator voice the user picked (option V), exciting mode
    "brick": dict(voice="am_fenrir", speed=1.08, pitch=1.0, expressive=True),
}
LONG_GAPS = {"cold": 0.25, "intro": 0.15, "born": 0.2, "train": 0.15, "day": 0.2, "fire": 0.2, "mine": 0.35, "brick": 0.25, "night": 0.2, "kai": 0.25, "me": 0.3, "mom": 0.4, "shake": 0.5, "sword": 0.2, "deflect": 0.3, "done": 0.5}
TAIL = 2.0
LEAD = 0.0
