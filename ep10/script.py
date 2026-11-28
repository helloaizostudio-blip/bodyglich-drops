"""Episode 10: "Don't Answer The Skinwalker" (horror, narrator Leo, ~65 s)

Cold open (v3): the two scariest moments flash first ("don't look up" + the peephole voice) so the first
3 seconds give goosebumps, then "Three nights ago" starts the story. Pauses tightened ~45% for retention.
Horror format from docs/competitor_breakdown_part2.md: one rule in the first line, numbered nights that escalate,
a quiet PLANT that the viewer ignores (the little sister is "right here, smiling", never scared, never speaks), a
twist that recontextualises every night (Leo is an only child: the thing was already inside), a ceiling jump scare, and a sting aimed
outward (it now has Leo's voice). The creature appears on screen in every night.
The creature is our own design: a very tall, thin, long-limbed mimic with too many finger joints and a stretched face.
Format: (id, speaker, tag, text, shots). Words in *stars* get the highlighted caption word.
"""
TITLE = "Don't Answer The Skinwalker"
SLUG = "ep10_skinwalker"

LINES = [
    ("cold1",  "leo",    "whisper", "Whatever you do, don't look *up*.",                                                         ["cold_up"]),
    ("cold2",  "mimicg", "calm",    "Leo. Let me *in*.",                                                                         ["cold_peep"]),
    ("hook",   "leo",    "tense",   "Three nights ago. Grandpa's cabin had one rule. If something calls your name from the trees, never *answer*.", ["treeline_eyes", "cabin_night"]),
    ("what",   "leo",    "whisper", "He says a skinwalker lives out there. Too tall. Too thin. And it copies *voices*.",          ["walker_legs", "walker_hand"]),
    ("invite", "leo",    "tense",   "It can't come inside. Unless somebody *invites* it.",                                        ["door_lock"]),
    ("n1",     "leo",    "whisper", "Night one. I heard my little sister screaming my name from the *woods*.",                   ["night1_card", "window_walker"]),
    ("sis",    "leo",    "tense",   "But my sister was right here. In the bed next to mine. *Smiling*.",                         ["sis_bed"]),
    ("n2",     "leo",    "tense",   "Night two. Grandpa's voice was at the front door. I looked through the *peephole*.",        ["night2_card", "door_leo", "peephole_body"]),
    ("fake",   "mimicg", "calm",    "Leo. Open up. It's so *cold* out here.",                                                    ["peephole_face"]),
    ("chair",  "leo",    "whisper", "Grandpa was asleep in his chair. Right behind *me*.",                                       ["grandpa_chair"]),
    ("n3",     "leo",    "tense",   "Night three. Something crawled across the roof. Long fingers slid down my window. Too many *joints*.", ["night3_card", "roof_crawl", "window_fingers"]),
    ("giggle", "leo",    "whisper", "My sister didn't look scared. She just *giggled*.",                                         ["sis_giggle"]),
    ("dawn",   "leo",    "calm",    "At sunrise, I told Grandpa *everything*.",                                                  ["dawn_kitchen"]),
    ("only",   "grandpa","sad",     "Your sister? Leo. You're an only *child*.",                                                 ["grandpa_only"]),
    ("empty",  "leo",    "whisper", "I ran to my room. Her bed was *empty*.",                                                    ["bed_empty"]),
    ("up",     "leo",    "whisper", "Then I looked *up*.",                                                                       ["ceiling_walker"]),
    ("gone",   "leo",    "tense",   "I screamed. Grandpa ran in. It was *gone*.",                                                ["grandpa_run", "ceiling_empty"]),
    ("trees",  "leo",    "tense",   "But from the trees, something was calling for Grandpa. In *my* voice.",                     ["walker_tall", "walker_face"]),
    ("sting",  "mimicl", "calm",    "Grandpa? It's me. Let me *in*.",                                                            ["door_end"]),
]

MIMIC = "lowpass=f=3000,highpass=f=120,aecho=0.7:0.5:45|90:0.22|0.12,volume=1.25"
VOICES = {
    "leo":     dict(voice="am_michael", speed=1.1, pitch=1.06, expressive=True),            # Leo's horror voice from Ep 7
    "grandpa": dict(voice="bm_george", speed=0.95, pitch=0.92, expressive=True),
    "mimicg":  dict(voice="bm_george", speed=0.82, pitch=0.9, expressive=True, filter=MIMIC),  # the creature using Grandpa's voice, wrong and slow
    "mimicl":  dict(voice="am_michael", speed=0.86, pitch=1.0, expressive=True, filter=MIMIC), # the creature using Leo's voice
}
LONG_GAPS = {'hook': 0.19, 'what': 0.17, 'invite': 0.28, 'sis': 0.33, 'n2': 0.11, 'fake': 0.25, 'chair': 0.28, 'n3': 0.17, 'giggle': 0.33, 'dawn': 0.17, 'only': 0.39, 'empty': 0.28, 'up': 0.33, 'gone': 0.22, 'trees': 0.28, 'cold1': 0.25, 'cold2': 0.35}
TAIL = 2.2
LEAD = 0.0
