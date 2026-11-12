"""Episode 6: "The Clone Goes To School" (short-twist format, ~40 s)

Rule: if you skip school, a clone goes for you. Zash skips so much that his clone becomes the better son.
When he comes back there are two of them, Mom asks one question, and the clone wins. Twist that flips the hook:
now the clone is Zash, and Zash is the clone who goes to school whenever he skips.
Built from docs/competitor_breakdown_*.md: rule + image in 3 s, escalation in visible steps, an emotional turn,
a question everyone answers in their head ("do YOU know your mom's birthday?"), a 4-word last line.
No Somi / Liza in this one.

Format: (id, speaker, tag, text, shots). Words in *stars* get the highlighted caption word.
"""
TITLE = "The Clone Goes To School"
SLUG = "ep06_clone"

LINES = [
    ("hook",    "zash", "tense",   "In my world, if you skip school, a *clone* goes for you.",          ["clone_poof", "clone_walks", "zash_bed"]),
    ("same",    "zash", "calm",    "Same face. Same voice. Nobody can *tell*.",                          ["side_by_side"]),
    ("skip",    "zash", "excited", "So I skipped. A *lot*.",                                              ["calendar_x"]),
    ("better",  "zash", "calm",    "My clone got straight *A's*. Made the soccer team.",                  ["report_card", "soccer"]),
    ("fridge",  "zash", "calm",    "Mom put his drawings on the *fridge*.",                               ["fridge"]),
    ("sorry",   "zash", "calm",    "He said sorry to my little brother. I never *have*.",                 ["clone_max"]),
    ("fish",    "zash", "sad",     "Dad took him *fishing*. Dad never took me fishing.",                  ["dad_fishing", "zash_window"]),
    ("liked",   "zash", "calm",    "Everyone liked him more. Honestly? So did *I*.",                      ["family_laugh"]),
    ("back",    "zash", "tense",   "So I went back to school. And there were *two* of us.",               ["two_zash"]),
    ("onlyone", "mom",  "calm",    "Only one of you is coming home.",                                     ["mom_stern"]),
    ("q",       "zash", "tense",   "She asked one question.",                                             ["mom_close"]),
    ("bday",    "mom",  "calm",    "When's my birthday?",                                                 ["mom_bday"]),
    ("idk",     "zash", "whisper", "I didn't *know*.",                                                    ["zash_sweat"]),
    ("he",      "zash", "sad",     "He did.",                                                             ["clone_smile"]),
    ("now",     "zash", "calm",    "So now he's Zash. And I'm the one who goes to school when he *skips*.", ["swap_poof", "zash_school"]),
    ("end",     "zash", "calm",    "He skips a *lot*.",                                                   ["end_desk"]),
]

VOICES = {
    "zash": dict(voice="am_adam", speed=1.30, pitch=1.38, expressive=True),   # new Zash voice (option 6)
    "mom":  dict(voice="af_heart", speed=1.05, pitch=1.0, expressive=True),
}
LONG_GAPS = {"skip": 0.15, "fish": 0.3, "liked": 0.25, "back": 0.2, "onlyone": 0.3, "bday": 0.45, "idk": 0.4, "he": 0.6, "now": 0.35}
TAIL = 1.2
LEAD = 0.0
