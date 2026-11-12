"""Episode 7: "The Fourteenth Step" (horror, ~70 s)

Twist structure: a creepy rule + personal threat (0-4 s) -> the family vanishes one step per night (14, 15)
-> a voice under the stairs (Dad: "don't step on me") -> REVEAL: the stairs aren't taking people, the stairs ARE the people
-> Max sleepwalks onto Dad's step and Dad catches him -> the rule of exchange -> Zash lies down and becomes a step
-> everyone returns -> FINAL TWIST: the narrator is the 14th step -> sting aimed at the viewer.
Original premise; no dog / guardian-pet structure.

Format: (id, speaker, tag, text, shots). Words in *stars* get the highlighted caption word.
"""
TITLE = "The Fourteenth Step"
SLUG = "ep07_fourteenth_step"

LINES = [
    # cold open: rule + personal threat
    ("hook",   "zash", "tense",   "In my world, every staircase has thirteen steps. If you count *fourteen*, someone in your house is gone by morning.", ["stairs_dark", "step_glow", "zash_top"]),
    ("hook2",  "zash", "whisper", "Last night, I counted *fourteen*.",                                       ["card_14"]),
    ("lore",   "zash", "calm",    "They never find the person. Just their slippers. On the new *step*.",    ["slippers_step"]),
    # the family vanishes, one step per night
    ("n1",     "zash", "tense",   "Night one. Dad's slippers were on step fourteen. Dad was *gone*.",       ["dad_slippers", "dad_chair_empty"]),
    ("n2",     "zash", "tense",   "Night two. Fifteen steps. Mom's *slippers*.",                            ["card_15", "mom_slippers"]),
    ("n3",     "zash", "sad",     "Night three, I tied my little brother's wrist to mine. And I didn't *sleep*.", ["rope_wrist", "zash_awake"]),
    # the voice under the stairs
    ("voice",  "zash", "tense",   "At three in the morning, something whispered from under the stairs.",    ["clock_3am", "under_stairs"]),
    ("dad",    "dad",  "whisper", "Zash. Don't step on me.",                                                ["voice_dark"]),
    ("wood",   "zash", "whisper", "I put my ear on step fourteen. The wood was warm. It was *breathing*.",  ["ear_wood", "wood_breath"]),
    ("reveal", "zash", "tense",   "The stairs weren't taking people. The stairs *were* the people.",         ["stairs_reveal", "faces_in_wood"]),
    # the sacrifice
    ("slack",  "zash", "tense",   "Then the rope went slack. Max was sleepwalking. Straight *down*.",        ["rope_slack", "max_sleepwalk"]),
    ("catch",  "zash", "sad",     "He stepped on fourteen. The step bent like arms. Dad *caught* him.",      ["step_bends", "max_held"]),
    ("rule",   "zash", "sad",     "A step only comes back if someone takes its *place*.",                   ["zash_decides"]),
    ("lay",    "zash", "whisper", "So I lay down on the stairs. And I counted. *Thirteen*.",               ["zash_lies", "fade_wood"]),
    # aftermath + twist ending (narrator is now the step) + sting at the viewer
    ("morn",   "zash", "calm",    "In the morning, Dad was back. Mom was back. Max was *safe*.",           ["morning_family"]),
    ("count",  "zash", "whisper", "They count thirteen now. Only Max counts *fourteen*.",                   ["max_counts", "max_touches_step"]),
    ("sting",  "zash", "whisper", "If you count fourteen tonight, step softly. It might be *me*.",          ["viewer_stairs"]),
]

VOICES = {
    "zash": dict(voice="am_michael", speed=1.1, pitch=1.06, expressive=True),
    "dad":  dict(voice="am_onyx", speed=0.95, pitch=0.97, expressive=True, smooth=True, gen_speed=0.95),
}
LONG_GAPS = {"hook": 0.2, "hook2": 0.5, "lore": 0.35, "n1": 0.35, "n2": 0.3, "n3": 0.45, "voice": 0.4, "dad": 0.6, "wood": 0.5, "reveal": 0.7, "slack": 0.3, "catch": 0.45, "rule": 0.45, "lay": 0.9, "morn": 0.4, "count": 0.6}
TAIL = 1.5
LEAD = 0.0
