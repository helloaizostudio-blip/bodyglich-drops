"""Episode 6: "The Clone Goes To School" (long-story format, ~1:40)

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
    # rule + world
    ("hook",    "zash", "tense",   "In my world, if you skip school, a *clone* goes for you.",                        ["clone_poof", "clone_walks", "zash_bed"]),
    ("mech",    "zash", "calm",    "You stay in bed, you sneeze, and a copy of you walks out the door with your *backpack*.", ["sneeze", "clone_door"]),
    ("bus",     "zash", "calm",    "Clones never miss the bus. Not *once*.",                                            ["bus_clones"]),
    ("princ",   "zash", "calm",    "Our principal hasn't been to school since nineteen ninety four. Nobody has *noticed*.", ["principal"]),
    ("pizza",   "zash", "calm",    "There's only one way to tell a clone apart. Clones can't eat *pizza*.",             ["pizza_test_old"]),
    # flaw
    ("lazy",    "zash", "excited", "And me? I'm the laziest kid in town. A hundred and twelve skips in *one* year.",    ["skip_counter"]),
    ("couch",   "zash", "calm",    "I spent every single one on the couch. Eating *pizza*.",                             ["zash_couch"]),
    # the better son
    ("better",  "zash", "calm",    "Meanwhile, my clone got straight *A's*. Made the soccer team.",                      ["report_card", "soccer"]),
    ("fridge",  "zash", "calm",    "Mom put his drawings on the *fridge*.",                                              ["fridge"]),
    ("sorry",   "zash", "calm",    "He said sorry to my little brother. I never *have*.",                                ["clone_max"]),
    ("fish",    "zash", "sad",     "Dad took him *fishing*. Dad never took me fishing.",                                 ["dad_fishing", "zash_window"]),
    ("liked",   "zash", "calm",    "Everyone liked him more. Honestly? So did *I*.",                                     ["family_laugh"]),
    # crisis
    ("friday",  "zash", "tense",   "Then last Friday, I went back to school. And there were *two* of us.",               ["two_zash"]),
    ("rule2",   "zash", "tense",   "And when there are two, only one goes home. The other goes back to the clone factory. *Forever*.", ["clone_van"]),
    ("onlyone", "mom",  "calm",    "Only one of you is coming home.",                                                    ["mom_stern"]),
    ("bday",    "mom",  "calm",    "When's my birthday?",                                                                ["mom_bday"]),
    ("idk",     "zash", "whisper", "I didn't *know*.",                                                                   ["zash_sweat"]),
    ("he",      "zash", "sad",     "He did.",                                                                            ["clone_smile"]),
    ("van",     "zash", "sad",     "The men from the factory grabbed my arms. Mom couldn't even *look* at me.",          ["van_grab", "mom_turns"]),
    # flaw becomes the solution
    ("max",     "zash", "tense",   "Then my little brother walked in. Holding a *pizza*.",                               ["max_pizza"]),
    ("slice",   "zash", "calm",    "He gave us each a slice.",                                                           ["two_slices"]),
    ("chew",    "zash", "excited", "A hundred and twelve days on that couch. Nobody in history has eaten pizza *faster*.", ["zash_eats"]),
    ("clone",   "zash", "tense",   "My clone took one bite. And his face started to *glitch*.",                          ["clone_glitch"]),
    ("hug",     "zash", "sad",     "Mom dropped her keys. And hugged me so hard I couldn't *breathe*.",                  ["mom_hug"]),
    # aftermath + button
    ("now",     "zash", "calm",    "Now I go to school every day. Mom's birthday is March third. I'll never *forget* it.", ["zash_school", "calendar_heart"]),
    ("closet",  "zash", "calm",    "My clone lives in my closet now. He does my *homework*.",                            ["closet_clone"]),
    ("button",  "max",  "excited", "Can I have his slice?",                                                              ["max_end"]),
]

VOICES = {
    # Zash: voice option 1 (Puck), smooth pipeline (generated slower, sped up cleanly, anti-fizz EQ)
    "zash": dict(voice="am_puck", speed=1.25, pitch=1.12, expressive=True, smooth=True, gen_speed=1.05),
    "mom":  dict(voice="af_heart", speed=1.05, pitch=1.0, expressive=True, smooth=True, gen_speed=1.0),
    "max":  dict(voice="af_sky", speed=1.10, pitch=1.22, expressive=True, smooth=True, gen_speed=1.0),
}
LONG_GAPS = {"pizza": 0.25, "couch": 0.2, "fish": 0.35, "liked": 0.3, "rule2": 0.3, "onlyone": 0.3, "bday": 0.5,
             "idk": 0.45, "he": 0.6, "van": 0.4, "slice": 0.3, "clone": 0.45, "hug": 0.5, "closet": 0.35}
TAIL = 1.0
LEAD = 0.0
