"""Episode 6: "The Clone Goes To School" (mid format, ~50 s)

Structure from docs/competitor_breakdown_part1.md:
  rule + image (0:00-0:03) -> mechanic -> 4 deadpan world jokes with numbers (one is a PLANT: clones can't eat pizza)
  -> Zash's flaw (laziest kid, 112 skips, lives on pizza) -> the clone becomes the better son (escalation + heart)
  -> "Then last Friday" -> crisis: two Zashes, only one goes home, Mom picks the clone (birthday question)
  -> flaw becomes the solution: Max brings pizza, the pizza test -> aftermath -> 4-word callback from a side character.
No Somi / Liza in this one.

Format: (id, speaker, tag, text, shots). Words in *stars* get the highlighted caption word.
"""
TITLE = "The Clone Goes To School"
SLUG = "ep06_clone"

LINES = [
    ("hook",    "zash", "tense",   "In my world, if you skip school, a *clone* goes for you.",                         ["clone_poof", "clone_walks", "zash_bed"]),
    ("princ",   "zash", "calm",    "Our principal hasn't shown up since nineteen ninety four. Nobody *noticed*.",        ["principal"]),
    ("pizza",   "zash", "calm",    "Only one way to spot a clone. Clones can't eat *pizza*.",                            ["pizza_test_old"]),
    ("lazy",    "zash", "excited", "Me? A hundred and twelve skips. All on the couch. Eating *pizza*.",                  ["skip_counter", "zash_couch"]),
    ("better",  "zash", "calm",    "My clone got straight *A's*. Mom put his drawings on the fridge.",                   ["report_card", "fridge"]),
    ("fish",    "zash", "sad",     "Dad took him *fishing*. Dad never took me fishing.",                                 ["dad_fishing", "zash_window"]),
    ("friday",  "zash", "tense",   "So I went back to school. And there were *two* of us.",                              ["two_zash"]),
    ("rule2",   "zash", "tense",   "Only one goes home. The other goes back to the clone factory. *Forever*.",           ["clone_van"]),
    ("bday",    "mom",  "calm",    "When's my birthday?",                                                                ["mom_bday"]),
    ("idk",     "zash", "whisper", "I didn't *know*. He did.",                                                           ["zash_sweat", "clone_smile"]),
    ("van",     "zash", "sad",     "The factory men grabbed my arms. Mom couldn't even *look* at me.",                   ["van_grab", "mom_turns"]),
    ("max",     "zash", "tense",   "Then my little brother walked in. With a *pizza*.",                                  ["max_pizza", "two_slices"]),
    ("chew",    "zash", "excited", "A hundred and twelve days on that couch. Nobody eats pizza *faster*.",               ["zash_eats"]),
    ("clone",   "zash", "tense",   "My clone took one bite. His face started to *glitch*.",                              ["clone_glitch"]),
    ("hug",     "zash", "sad",     "Mom hugged me so hard I couldn't *breathe*.",                                        ["mom_hug"]),
    ("button",  "max",  "excited", "Can I have his slice?",                                                              ["max_end"]),
]

VOICES = {
    # Zash: voice option 1 (Puck), smooth pipeline (generated slower, sped up cleanly, anti-fizz EQ)
    "zash": dict(voice="am_puck", speed=1.10, pitch=1.12, expressive=True, smooth=True, gen_speed=1.0),
    "mom":  dict(voice="af_heart", speed=1.05, pitch=1.0, expressive=True, smooth=True, gen_speed=1.0),
    "max":  dict(voice="af_sky", speed=1.10, pitch=1.22, expressive=True, smooth=True, gen_speed=1.0),
}
LONG_GAPS = {"pizza": 0.2, "fish": 0.3, "rule2": 0.3, "bday": 0.45, "idk": 0.45, "van": 0.35, "clone": 0.4, "hug": 0.45}
TAIL = 1.0
LEAD = 0.0
