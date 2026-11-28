"""Episode 8: "I Ate The Pirate's Fruit" (mid format, ~60 s), v2

Pirate adventure, fully original world and crew. Mako eats the Noodle Fruit (rubber/stretch body, a classic superpower
trope with our own name and rules). Engagement beats: a stakes hook (the scariest pirate hunted this fruit for ten
years), comic power montage with the crew, the sea-rule plant, a slingshot fight, a moral choice (save the man who tried
to kill him), and a cliffhanger twist (Gorr is Mako's dad) that sets up Part 2.

Format: (id, speaker, tag, text, shots). Words in *stars* get the highlighted caption word.
"""
TITLE = "I Ate The Pirate's Fruit"
SLUG = "ep08_noodle_fruit"

LINES = [
    ("hook",    "mako", "tense",   "The scariest pirate alive spent ten years hunting one cursed fruit. I ate it by *accident*.", ["gorr_silhouette", "fruit_glow", "mako_bite"]),
    ("plum",    "mako", "excited", "I thought it was a weird plum. Then my arm stretched forty *meters*.",                       ["fruit_find", "arm_stretch"]),
    ("pip1",    "pip",  "excited", "You ate the *Noodle* Fruit?!",                                                                 ["pip_shock"]),
    ("bounce",  "mako", "excited", "My body turned to rubber. Punches bounce. Cannonballs bounce. Even Basil's cooking *bounces*.", ["crate_punch", "cannon_bounce", "basil_bounce"]),
    ("rule",    "mako", "calm",    "Every cursed fruit has one catch. Touch the sea, and you *sink*.",                              ["sink_dark"]),
    ("then",    "mako", "tense",   "Then his ship found us. Captain Gorr. Iron fists. A billion-coin *bounty*.",                    ["gorr_ship", "gorr_reveal", "poster_gorr"]),
    ("mine",    "gorr", "angry",   "That fruit was *mine*.",                                                                        ["gorr_close"]),
    ("punch",   "mako", "tense",   "He punched me so hard I stretched halfway across the *ocean*.",                                 ["iron_punch", "mako_stretch_far"]),
    ("snap",    "mako", "excited", "And like any rubber band, I snapped *back*.",                                                   ["mako_slingshot"]),
    ("into",    "mako", "excited", "Straight into Gorr. Straight off his own *ship*.",                                              ["mako_hits_gorr", "gorr_falls"]),
    ("sinking", "mako", "tense",   "Gorr ate a cursed fruit too. And he was *sinking*.",                                            ["gorr_sinking"]),
    ("pip2",    "pip",  "calm",    "Let him go. He tried to *kill* you.",                                                           ["pip_serious"]),
    ("didnt",   "mako", "whisper", "I didn't let him go.",                                                                          ["mako_decide"]),
    ("reach",   "mako", "tense",   "I stretched my arm into the sea. Every second down there drained me. But I didn't let *go*.",   ["arm_into_sea", "deep_grab", "mako_weak"]),
    ("pull",    "mako", "excited", "I pulled him *out*.",                                                                           ["gorr_pulled"]),
    ("hat",     "mako", "calm",    "He coughed up half the ocean. Then he took off his *hat*.",                                     ["gorr_coughs", "hat_off"]),
    ("eyes",    "gorr", "sad",     "You have your mother's *eyes*.",                                                                ["gorr_soft"]),
    ("what",    "mako", "whisper", "Wait. *What*?",                                                                                 ["mako_shock_end"]),
]

VOICES = {
    # Mako: Fenrir (voice option 5)
    "mako": dict(voice="am_fenrir", speed=1.05, pitch=1.0, expressive=True),   # user picked option 5 (Fenrir), natural pitch, no shifting
    "pip":  dict(voice="af_bella", speed=1.05, pitch=1.04, expressive=True, smooth=True, gen_speed=1.0),
    "gorr": dict(voice="am_onyx", speed=0.95, pitch=0.86, expressive=True, smooth=True, gen_speed=1.0),
}
LONG_GAPS = {"hook": 0.2, "pip1": 0.25, "rule": 0.3, "mine": 0.3, "snap": 0.15, "sinking": 0.35, "pip2": 0.35, "didnt": 0.45, "pull": 0.3, "hat": 0.45, "eyes": 0.6}
TAIL = 1.8
LEAD = 0.0
