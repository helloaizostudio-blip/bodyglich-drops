"""Episode 6: "The Clone Goes To School" (v2, narrator Leo, ~55 s)

Cold open on the impossible choice (Mom has to pick: Leo or his clone), then the world rule. Deadpan world jokes with
a PLANT (clones can't eat pizza), Leo's flaw (laziest kid alive, lives on pizza), the clone becomes the better son
(escalation + heart), crisis (two Leos, one gets recycled, Mom asks the birthday question and the clone knows it),
then the flaw becomes the solution (the pizza test) and a side-character callback.
Leo's new voice: blend of am_adam 65% + af_bella 35% (option H / "8"), light pitch, fast clean pacing.
No Somi / Liza.
"""
TITLE = "The Clone Goes To School"
SLUG = "ep06_clone"

LINES = [
    ("cold",    "leo",  "tense",   "Today my mom had to choose. Me, or my *clone*.",                                     ["cold_choice"]),
    ("hook",    "leo",  "tense",   "In my world, if you skip school, a *clone* goes for you.",                           ["clone_poof", "clone_walks"]),
    ("same",    "leo",  "calm",    "Same face. Same voice. Same bad *breath*.",                                          ["side_by_side"]),
    ("princ",   "leo",  "calm",    "Our principal skipped in nineteen ninety four. Nobody *noticed*.",                   ["principal"]),
    ("pizza",   "leo",  "calm",    "Only one way to spot a clone. Clones can't eat *pizza*.",                            ["pizza_rule"]),
    ("lazy",    "leo",  "excited", "Me? I skipped a hundred and twelve days. Couch. Pizza. *Repeat*.",                   ["skip_counter", "leo_couch"]),
    ("better",  "leo",  "calm",    "My clone got straight *A's*.",                                                       ["report_card"]),
    ("fridge",  "leo",  "calm",    "Mom put his drawings on the fridge. She never kept *mine*.",                         ["fridge"]),
    ("fish",    "leo",  "sad",     "Dad took him *fishing*. Dad never took me fishing.",                                 ["dad_fishing", "leo_window"]),
    ("friday",  "leo",  "tense",   "So I went back to school. And there were *two* of us.",                              ["two_leo"]),
    ("rule2",   "leo",  "tense",   "Two of the same kid is illegal. One goes home. The other gets *recycled*.",          ["recycle_truck"]),
    ("onlyone", "mom",  "calm",    "Only one of you is coming home.",                                                    ["mom_stern"]),
    ("bday",    "mom",  "calm",    "When's my birthday?",                                                                ["mom_bday"]),
    ("idk",     "leo",  "whisper", "I didn't know. He *did*.",                                                           ["leo_sweat", "clone_smile"]),
    ("truck",   "leo",  "sad",     "The recycling men grabbed my arms. Mom couldn't even *look* at me.",                 ["van_grab", "mom_turns"]),
    ("max",     "leo",  "tense",   "Then my little brother walked in. With a *pizza*.",                                  ["max_pizza"]),
    ("chew",    "leo",  "excited", "Couch. Pizza. Repeat. Nobody eats pizza *faster*.",                                  ["leo_eats"]),
    ("clone",   "leo",  "tense",   "My clone took one bite. And *glitched*.",                                            ["clone_glitch"]),
    ("hug",     "leo",  "sad",     "Mom hugged me so hard I couldn't *breathe*.",                                        ["mom_hug"]),
    ("march",   "leo",  "calm",    "Her birthday is March third. I'll never *forget* it again.",                         ["calendar_heart"]),
    ("button",  "max",  "excited", "Can I have his slice?",                                                              ["max_end"]),
]

VOICES = {
    "leo": dict(voice=(("am_adam", 0.65), ("af_bella", 0.35)), speed=1.12, pitch=1.03, expressive=True),   # user's pick: option H ("8")
    "mom": dict(voice="af_heart", speed=1.05, pitch=1.0, expressive=True, smooth=True, gen_speed=1.0),
    "max": dict(voice="af_sky", speed=1.10, pitch=1.22, expressive=True, smooth=True, gen_speed=1.0),
}
LONG_GAPS = {"cold": 0.25, "same": 0.1, "pizza": 0.15, "fish": 0.2, "friday": 0.15, "rule2": 0.2, "onlyone": 0.2, "bday": 0.35, "idk": 0.3, "truck": 0.2, "clone": 0.3, "hug": 0.25, "march": 0.3}
TAIL = 1.0
LEAD = 0.0
