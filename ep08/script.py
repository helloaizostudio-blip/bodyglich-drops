"""Episode 8: "I Ate The Worst Cursed Fruit" (mid format, ~60 s)

Pirate adventure in an anime-adventure spirit, fully original: own world rule (cursed fruits, sink in the sea),
own crew (Mako, Pip, Captain Gorr), own power (bubbles), own designs. No names, outfits, powers or places
from any existing series.

Structure (docs/competitor_breakdown_part1.md):
  rule + payoff image (0:00-0:03) -> bounty world joke with numbers -> Mako's flaw (3-coin bounty, leaky rowboat)
  -> the "useless" power with a PLANT (bubbles float) -> "Then..." crisis (billion-coin captain, Pip in the sea,
  Mako can't touch water) -> the plant becomes the solution twice (bubble saves Pip, bubble lifts Gorr into the sky)
  -> bounty payoff -> 2-word callback.
Art direction: bright tropical anime-adventure look (saturated sea + sky, bold rim light, speed lines on hits,
big impact frames), a new look for the channel.

Format: (id, speaker, tag, text, shots). Words in *stars* get the highlighted caption word.
"""
TITLE = "I Ate The Worst Cursed Fruit"
SLUG = "ep08_bubble_fruit"

LINES = [
    ("hook",   "mako", "tense",   "In my world, eat a cursed fruit and you get a *superpower*. But touch the sea, and you sink forever.", ["fruit_glow", "hero_power", "sink_dark"]),
    ("bounty", "mako", "calm",    "Every pirate has a bounty. The scariest one is worth a *billion* coins.",              ["poster_gorr"]),
    ("mine",   "mako", "calm",    "Mine is three *coins*.",                                                                  ["poster_mako"]),
    ("pip1",   "pip",  "calm",    "Honestly? That's *generous*.",                                                             ["pip_deadpan"]),
    ("boat",   "mako", "calm",    "Our ship is a rowboat. With a *leak*.",                                                   ["rowboat_leak"]),
    ("found",  "mako", "excited", "Then I found a cursed fruit. I ate the *whole* thing.",                                   ["fruit_find", "fruit_eat"]),
    ("power",  "mako", "excited", "My power? I can blow *bubbles*.",                                                         ["bubble_pop"]),
    ("laugh",  "mako", "sad",     "Pirates laughed so hard one fell off his *ship*.",                                        ["pirates_laugh", "pirate_falls"]),
    ("float",  "mako", "calm",    "They don't pop. They just float. *Really* float.",                                       ["bubble_float"]),
    ("pip2",   "pip",  "calm",    "So it's *useless*.",                                                                      ["pip_useless"]),
    ("then",   "mako", "tense",   "Then the billion-coin captain found *us*.",                                               ["gorr_ship", "gorr_reveal"]),
    ("gorr1",  "gorr", "angry",   "Cute *boat*.",                                                                            ["gorr_close"]),
    ("punch",  "mako", "tense",   "One punch. No more *boat*.",                                                              ["iron_punch", "boat_explode"]),
    ("sea",    "mako", "tense",   "Pip can't swim. And I can't touch the *sea*.",                                            ["pip_sinking", "mako_edge"]),
    ("idea",   "mako", "whisper", "But bubbles *float*.",                                                                    ["mako_idea"]),
    ("save",   "mako", "excited", "I blew the biggest bubble of my life. Pip floated up. Then I bubbled *myself*.",         ["giant_bubble", "pip_rises", "mako_bubble"]),
    ("gorr2",  "gorr", "angry",   "Bubbles can't stop *me*!",                                                                ["gorr_laughs"]),
    ("lift",   "mako", "excited", "He was right. But they can *lift* you.",                                                  ["gorr_bubbled", "gorr_lifts"]),
    ("sky",    "mako", "calm",    "Last I saw, he was floating somewhere above the *clouds*.",                               ["gorr_clouds"]),
    ("new",    "mako", "excited", "Next morning, my bounty was thirty *million*.",                                           ["poster_new"]),
    ("pip3",   "pip",  "calm",    "Still the worst fruit?",                                                                  ["pip_smile"]),
    ("button", "mako", "excited", "Best *fruit*.",                                                                           ["mako_grin_end"]),
]

VOICES = {
    "mako": dict(voice="am_michael", speed=1.12, pitch=1.08, expressive=True),   # the Blaze-style voice the user picked, a touch younger
    "pip":  dict(voice="af_bella", speed=1.05, pitch=1.04, expressive=True, smooth=True, gen_speed=1.0),
    "gorr": dict(voice="am_onyx", speed=0.95, pitch=0.86, expressive=True, smooth=True, gen_speed=1.0),
}
LONG_GAPS = {"mine": 0.3, "pip1": 0.25, "boat": 0.2, "laugh": 0.2, "pip2": 0.35, "gorr1": 0.3, "punch": 0.3, "idea": 0.45, "gorr2": 0.25, "sky": 0.35, "pip3": 0.35}
TAIL = 1.2
LEAD = 0.0
