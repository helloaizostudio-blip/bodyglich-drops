"""Episode 9: "The Fruit's Curse" (Part 2 of the pirate story, ~55 s)

Picks up on the Ep 8 cliffhanger. Original lore: the Noodle Fruit's catch is that every stretch makes you forget
something. Gorr hunted the fruit for ten years so it would never take his son the way it took his wife.
Structure: recap hook -> reveal + comic beat -> the curse (escalating forgets) -> PLANT (Mako's small forgets played
as jokes) -> the rule (just stop stretching) -> crisis (Crate falls) -> choice (he stretches) -> win -> twist sting
(he has forgotten Pip). Ends on "PART 3?".
"""
TITLE = "The Fruit's Curse"
SLUG = "ep09_fruits_curse"

LINES = [
    ("hook",   "mako", "tense",   "The billion-coin pirate who tried to kill me just said I have my mother's *eyes*.",        ["recap_gorr", "mako_shock"]),
    ("night",  "gorr", "sad",     "Ten years ago, I lost my wife and my son on the same *night*.",                              ["gorr_soft", "flashback_storm"]),
    ("dad",    "mako", "calm",    "So the scariest pirate alive is my *dad*. Normal Tuesday.",                                 ["mako_blank"]),
    ("pip1",   "pip",  "calm",    "Ask him why he wanted the *fruit*.",                                                        ["pip_arms"]),
    ("curse",  "gorr", "sad",     "Your mother ate a Noodle Fruit too. Every stretch made her *forget* something.",            ["gorr_tell", "mom_stretch"]),
    ("keys",   "gorr", "sad",     "First her keys. Then her friends. Then one morning, she looked at me like a *stranger*.",   ["mom_keys", "mom_friends", "mom_stranger"]),
    ("week",   "mako", "tense",   "I've been stretching all *week*.",                                                          ["mako_hands"]),
    ("forgot", "mako", "excited", "I couldn't find my boots. I called Basil Bob, twice. And Crate has been the box guy for *days*.", ["mako_boots", "basil_bob", "crate_box"]),
    ("hunt",   "gorr", "sad",     "I hunted that fruit for ten years so it would never find *you*.",                           ["gorr_hug"]),
    ("pip2",   "pip",  "calm",    "Then you just stop *stretching*.",                                                          ["pip_point"]),
    ("easy",   "mako", "calm",    "Easy. No more stretching. *Ever*.",                                                         ["mako_thumbs"]),
    ("mast",   "mako", "tense",   "Then Crate slipped off the mast. Forty meters *up*.",                                       ["crate_slip", "crate_fall"]),
    ("think",  "mako", "whisper", "I didn't think. I *stretched*.",                                                            ["mako_stretch", "arm_catch"]),
    ("cheer",  "mako", "excited", "I caught him. The whole crew *cheered*.",                                                   ["crew_cheer"]),
    ("pip3",   "pip",  "excited", "Mako! You *did* it!",                                                                       ["pip_hug"]),
    ("twist",  "mako", "calm",    "She hugged me like she knew me. Nice girl. I wonder who she *is*.",                          ["mako_smile", "mako_end"]),
]

VOICES = {
    "mako": dict(voice="am_fenrir", speed=1.05, pitch=1.0, expressive=True),   # voice option 5, natural pitch
    "pip":  dict(voice="af_bella", speed=1.05, pitch=1.04, expressive=True, smooth=True, gen_speed=1.0),
    "gorr": dict(voice="am_onyx", speed=0.95, pitch=0.86, expressive=True, smooth=True, gen_speed=1.0),
}
LONG_GAPS = {"hook": 0.25, "night": 0.4, "dad": 0.3, "keys": 0.45, "week": 0.35, "forgot": 0.3, "hunt": 0.35, "easy": 0.3, "think": 0.3, "pip3": 0.5, "twist": 0.2}
TAIL = 2.0
LEAD = 0.0
