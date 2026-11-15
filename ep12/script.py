"""Episode 12: "Born With Zero Magic" (narrator Zash, ~55 s)

Magic-world underdog story in the shonen spirit (powerless kid, bullied, trains, late power), told with our own
world, names, designs and twist: his book is the OFF SWITCH. It turns everyone's magic off, and in a world where
nobody ever trained their body, the kid who did six years of push-ups wins. No names, designs, symbols or terms
from any existing series.

Retention structure: cold open inside the climax (Mom about to be burned, hero has no magic), fast rewind with
world jokes, bullying + training montage, the book ceremony humiliation, back to the climax, the reveal, a
one-punch payoff, and a "page two" cliffhanger.
"""
TITLE = "Born With Zero Magic"
SLUG = "ep12_zero_magic"

LINES = [
    ("cold",   "zash",  "tense",   "A fire mage is about to burn my mom alive! And I'm the only kid in the world with *zero* magic.",   ["cold_fire", "cold_zash"]),
    ("world",  "zash",  "excited", "In my world, everyone is born with magic! Babies float. Grandmas shoot *lightning*!",               ["baby_float", "grandma_zap"]),
    ("candle", "zash",  "calm",    "I couldn't even light a *candle*.",                                                                 ["candle_fail"]),
    ("mom1",   "mom",   "calm",    "Maybe your magic comes when you turn *eighteen*.",                                                  ["mom_hope"]),
    ("zero",   "zash",  "sad",     "They called me Zero. They used me for target *practice*.",                                          ["bully_blast"]),
    ("train",  "zash",  "excited", "So I trained! Every day! For six years! Push-ups! Boulders! *Waterfalls*!",                         ["train_pushups", "train_boulder", "train_waterfall", "train_buff"]),
    ("books",  "zash",  "excited", "At eighteen, a spellbook chooses you! Gold! Silver! *Flame*!",                                      ["book_ceremony", "book_flame"]),
    ("mine",   "zash",  "sad",     "Mine was grey. Cracked. And it wouldn't even *open*.",                                              ["book_grey"]),
    ("brick",  "brick", "excited", "Even the book thinks you're a *zero*!",                                                             ["brick_laugh"]),
    ("night",  "zash",  "tense",   "That night, a fire mage attacked our village. He grabbed my *mom*.",                                ["village_fire", "mage_mom"]),
    ("fists",  "zash",  "excited", "I ran at him with nothing but my *fists*!",                                                         ["zash_charge"]),
    ("open",   "zash",  "whisper", "And for the first time, my book *opened*.",                                                         ["book_opens"]),
    ("off",    "zash",  "excited", "His fire went out! Everyone's magic went out! I didn't get magic. I got the *off switch*!",          ["fire_out", "magic_off", "zash_reveal"]),
    ("guy",    "zash",  "calm",    "And without magic, he was just a guy. A guy who never did one *push-up*.",                          ["mage_scared", "one_punch"]),
    ("mom2",   "mom",   "excited", "Told you! *Eighteen*!",                                                                             ["mom_proud"]),
    ("page",   "zash",  "whisper", "Then the book turned itself to page *two*.",                                                        ["page_two"]),
]

VOICES = {
    "zash":  dict(voice="am_echo", speed=1.10, pitch=1.28, expressive=True, resample=True, gain_db=2.5, energy=True),   # the narrator voice the user picked (option V), exciting mode
    "mom":   dict(voice="af_heart", speed=1.05, pitch=1.0, expressive=True, smooth=True, gen_speed=1.0),
    "brick": dict(voice="am_fenrir", speed=1.08, pitch=1.0, expressive=True),
}
LONG_GAPS = {"cold": 0.25, "candle": 0.25, "mom1": 0.2, "zero": 0.2, "mine": 0.35, "brick": 0.25, "night": 0.2, "fists": 0.2, "open": 0.45, "off": 0.25, "guy": 0.3, "mom2": 0.35}
TAIL = 2.0
LEAD = 0.0
