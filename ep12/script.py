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

LINES = [   # v5: the user's own script, word for word
    ("cold",    "zash",  "tense",   "A fire knight just came out of the monster realm, and he's about to burn my mother alive! And the worst part? I'm the only person in this world who can't use *magic*.", ["cold_fire", "cold_mom", "cold_zash"]),
    ("intro",   "zash",  "excited", "My name is Zash. In this world, everyone receives a grimoire when they turn eighteen. A magical book that determines their power, and their *destiny*.", ["zash_intro", "grimoire_wall", "villager_magic"]),
    ("born",    "zash",  "sad",     "Everyone has magic. Except me. I was born with absolutely *zero* mana. No spells. No abilities. Nothing. Growing up, I was everyone's favourite punching *bag*.", ["bully_blast", "zash_empty", "zash_down"]),
    ("train",   "zash",  "excited", "But I refused to stay weak. If I couldn't train my magic, I'd train my *body*. Six years. Every single day. No *excuses*.", ["zash_fist", "train_pushups", "train_boulder", "train_buff"]),
    ("day",     "zash",  "tense",   "Then came the day of the Grimoire Ceremony. The entire city gathered to witness our destinies. One by one, the books *descended*.", ["ceremony_wide", "crowd_cheer", "books_float"]),
    ("fire",    "zash",  "excited", "A *fire* grimoire chose the fire kid. A *storm* grimoire chose my prodigy brother, Kai. The crowd went wild. The gods had clearly *blessed* them.", ["book_fire", "book_storm", "crowd_wild", "kai_blessed"]),
    ("mine",    "zash",  "sad",     "And then, it was my turn. A grey book floated towards me. No shine. No aura. Just a dull cover, with a *black sun* stamped right in the middle. The crowd went *silent*.", ["zash_steps", "book_grey", "black_sun", "crowd_silent"]),
    ("brick",   "brick", "excited", "Ha ha! Even the books know you're *cursed*!", ["brick_laugh"]),
    ("night",   "zash",  "tense",   "And things got *much* worse that night. A fire knight emerged from the monster *realm*.", ["night_village", "portal_open", "knight_reveal"]),
    ("kai",     "zash",  "tense",   "My brother Kai stepped forward first. The chosen one. The storm prodigy. He lasted ten *seconds*.", ["kai_steps", "kai_attacks", "kai_falls"]),
    ("me",      "zash",  "sad",     "Then it was my turn. I charged at the knight. One hit. I was on the ground. Completely *helpless*.", ["zash_charge", "zash_thrown", "zash_ground"]),
    ("mom",     "zash",  "tense",   "And then, he turned towards my *mother*. I couldn't let that happen.", ["knight_mom", "zash_reach"]),
    ("shake",   "zash",  "whisper", "That's when my grimoire started *shaking*. Its pages began flipping on their own.", ["book_shakes", "pages_flip"]),
    ("sword",   "zash",  "excited", "And suddenly, a *black katana* emerged from the book! It was insanely heavy. Good thing I'd spent six years lifting *boulders*.", ["katana_rises", "zash_grabs", "zash_lifts"]),
    ("deflect", "zash",  "excited", "The fire knight unleashed everything he had. But instead of burning me, my sword sent his own attack straight back at *him*!", ["fire_blast", "zash_guard", "deflect"]),
    ("done",    "zash",  "calm",    "One swing. Silence. The fire knight was *defeated*.", ["one_swing", "knight_gone"]),
    ("glow",    "zash",  "whisper", "But before I could even understand what had happened, the black sun on my grimoire began to *glow*. And something was waking up inside it.", ["aftermath", "sun_glow", "awake"]),
]

VOICES = {
    "zash":  dict(voice="am_echo", speed=1.10, pitch=1.28, expressive=True, resample=True, gain_db=2.0, polish=True, tag_amt=0.5),   # narrator voice the user picked (option V), exciting mode
    "brick": dict(voice="am_fenrir", speed=1.08, pitch=1.0, expressive=True),
}
LONG_GAPS = {"cold": 0.25, "intro": 0.15, "born": 0.2, "train": 0.15, "day": 0.2, "fire": 0.2, "mine": 0.35, "brick": 0.25, "night": 0.2, "kai": 0.25, "me": 0.3, "mom": 0.4, "shake": 0.5, "sword": 0.2, "deflect": 0.3, "done": 0.5}
TAIL = 2.0
LEAD = 0.0
