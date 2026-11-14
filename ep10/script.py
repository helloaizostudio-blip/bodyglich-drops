"""Episode 10: "Don't Answer The Skinwalker" (horror, narrator Leo, ~65 s)

Horror format from docs/competitor_breakdown_part2.md: one rule in the first line, numbered nights that escalate,
a quiet PLANT that the viewer ignores (the little sister is "right here, smiling", never scared, never speaks), a
twist that recontextualises every night (Leo is an only child: the thing was already inside), and a sting aimed
outward (it now has Leo's voice).
The creature is our own design: a very tall, thin, long-limbed mimic with too many finger joints and a stretched face.
Format: (id, speaker, tag, text, shots). Words in *stars* get the highlighted caption word.
"""
TITLE = "Don't Answer The Skinwalker"
SLUG = "ep10_skinwalker"

LINES = [
    ("hook",   "leo",   "tense",   "Grandpa's cabin has one rule. If something calls your name from the trees, never *answer*.", ["cabin_night", "trees_eyes"]),
    ("what",   "leo",   "whisper", "He says a skinwalker lives out there. Too tall. Too thin. And it copies *voices*.",          ["walker_glimpse", "walker_legs"]),
    ("invite", "leo",   "tense",   "It can't come inside. Unless somebody *invites* it.",                                        ["door_lock"]),
    ("n1",     "leo",   "whisper", "Night one. I heard my little sister screaming my name from the *woods*.",                   ["night1_card", "woods_scream"]),
    ("sis",    "leo",   "tense",   "But my sister was right here. In the bed next to mine. *Smiling*.",                         ["sis_bed"]),
    ("n2",     "leo",   "tense",   "Night two. Grandpa's voice was at the front door.",                                         ["night2_card", "door_shadow"]),
    ("fake",   "mimicg","calm",    "Leo. Open up. It's so *cold* out here.",                                                    ["door_close"]),
    ("chair",  "leo",   "whisper", "Grandpa was asleep in his chair. Right behind *me*.",                                       ["grandpa_chair"]),
    ("n3",     "leo",   "tense",   "Night three. Something crawled across the roof. Long fingers slid down the window. Too many *joints*.", ["night3_card", "roof_crawl", "window_fingers"]),
    ("giggle", "leo",   "whisper", "My sister didn't look scared. She just *giggled*.",                                         ["sis_giggle"]),
    ("dawn",   "leo",   "calm",    "At sunrise, I told Grandpa *everything*.",                                                  ["dawn_kitchen"]),
    ("only",   "grandpa","sad",    "Your sister? Leo. You're an only *child*.",                                                 ["grandpa_only"]),
    ("empty",  "leo",   "whisper", "I turned around. The bed next to mine was *empty*.",                                        ["bed_empty"]),
    ("trees",  "leo",   "tense",   "And from the trees, something was calling for Grandpa. In *my* voice.",                     ["walker_tall", "walker_face"]),
    ("sting",  "mimicl","calm",    "Grandpa? It's me. Let me *in*.",                                                            ["door_end"]),
]

MIMIC = "lowpass=f=3000,highpass=f=120,aecho=0.7:0.5:45|90:0.22|0.12,volume=1.25"
VOICES = {
    "leo":     dict(voice="am_michael", speed=1.1, pitch=1.06, expressive=True),            # Leo's horror voice from Ep 7
    "grandpa": dict(voice="bm_george", speed=0.95, pitch=0.92, expressive=True),
    "mimicg":  dict(voice="bm_george", speed=0.82, pitch=0.9, expressive=True, filter=MIMIC),  # the creature using Grandpa's voice, wrong and slow
    "mimicl":  dict(voice="am_michael", speed=0.86, pitch=1.0, expressive=True, filter=MIMIC), # the creature using Leo's voice
}
LONG_GAPS = {"hook": 0.35, "what": 0.3, "invite": 0.5, "sis": 0.6, "fake": 0.45, "chair": 0.5, "n3": 0.3, "giggle": 0.6, "dawn": 0.3, "only": 0.7, "empty": 0.6, "trees": 0.5}
TAIL = 2.2
LEAD = 0.0
