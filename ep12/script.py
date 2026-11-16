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

LINES = [   # v6: tightened cut (~50 s) of the user's script; full version kept in script_full97.py
    ("cold",    "zash",  "tense",   "This fire knight is about to burn my mother alive. And I'm the only person in this world with *zero* magic.", ["cold_fire", "cold_mom", "cold_zash"]),
    ("intro",   "zash",  "excited", "At eighteen, everyone gets a grimoire. A magic book that decides your *power*.", ["grimoire_wall", "villager_magic"]),
    ("born",    "zash",  "sad",     "I got nothing. So I became everyone's punching *bag*.", ["bully_blast", "zash_down"]),
    ("train",   "zash",  "excited", "So I trained my body instead. Six years. No *excuses*.", ["train_pushups", "train_boulder", "train_buff"]),
    ("fire",    "zash",  "excited", "Ceremony day. A fire grimoire chose the fire kid. A storm grimoire chose my brother, *Kai*.", ["ceremony_wide", "book_fire", "book_storm", "kai_blessed"]),
    ("mine",    "zash",  "sad",     "Mine was grey. Dull. With a *black sun* on the cover.", ["book_grey", "black_sun"]),
    ("brick",   "brick", "excited", "Even the books know you're *cursed*!", ["brick_laugh"]),
    ("night",   "zash",  "tense",   "That night, a fire knight came out of the monster *realm*.", ["portal_open", "knight_reveal"]),
    ("kai",     "zash",  "tense",   "Kai lasted ten *seconds*. I lasted one *hit*.", ["kai_attacks", "kai_falls", "zash_thrown"]),
    ("mom",     "zash",  "tense",   "Then he turned to my *mother*.", ["knight_mom", "zash_reach"]),
    ("shake",   "zash",  "whisper", "And my grimoire started *shaking*.", ["book_shakes", "pages_flip"]),
    ("sword",   "zash",  "excited", "A *black katana* came out. Insanely heavy. Good thing I'd lifted boulders for six *years*.", ["katana_rises", "zash_lifts"]),
    ("deflect", "zash",  "excited", "He threw everything he had. My sword sent it straight back at *him*!", ["zash_guard", "deflect"]),
    ("done",    "zash",  "calm",    "One swing. *Silence*.", ["one_swing", "knight_gone"]),
    ("glow",    "zash",  "whisper", "Then the black sun began to *glow*. And something inside it was waking *up*.", ["sun_glow", "awake"]),
]

VOICES = {
    "zash":  dict(voice="am_echo", speed=1.21, pitch=1.28, expressive=True, resample=True, gain_db=2.0, polish=True, tag_amt=0.5),   # narrator voice the user picked (option V), exciting mode
    "brick": dict(voice="am_fenrir", speed=1.19, pitch=1.0, expressive=True),
}
LONG_GAPS = {"cold": 0.18, "born": 0.09, "mine": 0.22, "brick": 0.14, "kai": 0.18, "mom": 0.27, "shake": 0.32, "deflect": 0.18, "done": 0.32}
TAIL = 1.6
LEAD = 0.0
