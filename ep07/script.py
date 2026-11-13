"""Episode 7: "Never Let Mom In After Midnight" (horror, ~65 s). Narrator: LEO (not Zash).

Premise: a rule taped to the fridge says never let Mom in after midnight. At 3 a.m. "Mom" knocks; then Mom calls
from work: don't open the door. Two moms, one door, one rule.
Twist 1: the rule isn't in Mom's handwriting (no hearts on the i's) -> Mom never wrote it.
Twist 2: the phone voice is coming from upstairs -> the thing is INSIDE; the rule kept the real Mom OUT.
Final sting: at Grandma's, a new note on the fridge: "Never let Leo in after midnight."

Format: (id, speaker, tag, text, shots). Words in *stars* get the highlighted caption word.
"""
TITLE = "Never Let Mom In After Midnight"
SLUG = "ep07_never_let_mom_in"

LINES = [
    ("hook",    "leo",   "tense",   "In my house, there's one rule taped to the fridge. Never let Mom in after *midnight*.", ["fridge_note", "note_close", "leo_kitchen"]),
    ("deal",    "leo",   "calm",    "Mom works nights. She gets home at six. That's the *deal*.",           ["mom_leaving", "door_lock"]),
    ("knock",   "leo",   "tense",   "Last night, at three in the morning, someone *knocked*.",              ["clock_3am", "door_knock"]),
    ("door1",   "mom",   "calm",    "Leo, honey, open up. I forgot my keys. It's freezing out here.",       ["door_shadow"]),
    ("rule",    "leo",   "whisper", "I didn't move. A rule is a *rule*.",                                    ["leo_frozen"]),
    ("ring",    "leo",   "tense",   "Then my phone rang. It was *Mom*.",                                     ["phone_ring"]),
    ("phone1",  "phone", "whisper", "Leo, I'm still at work. Whatever is at that door, do not let it in.",   ["phone_screen", "leo_phone"]),
    ("door2",   "mom",   "sad",     "Baby, that is not me on the phone.",                                    ["door_shadow2"]),
    ("two",     "leo",   "tense",   "Two moms. One door. One *rule*.",                                       ["split_door_phone"]),
    ("door3",   "mom",   "sad",     "Please. Look at the note. Look at the handwriting.",                    ["door_crying"]),
    ("hearts",  "leo",   "whisper", "Mom dots every i with a little heart. The note had *none*.",            ["note_macro", "no_hearts"]),
    ("never",   "leo",   "tense",   "Mom never wrote the *rule*.",                                           ["leo_realizes"]),
    ("upstairs","leo",   "whisper", "Then I heard it. The voice in my ear was also coming from *upstairs*.", ["stairs_dark", "upstairs_glow"]),
    ("phone2",  "phone", "whisper", "Leo. Don't open the door.",                                             ["upstairs_door"]),
    ("kept",    "leo",   "tense",   "The rule wasn't keeping something out. It was keeping Mom out. So it could stay *in*.", ["house_wide", "lights_on"]),
    ("open",    "leo",   "excited", "I ripped the door open. Mom grabbed me and we *ran*.",                  ["door_open", "run_car"]),
    ("window",  "leo",   "tense",   "Behind us, every light in the house turned on. And in my window, Mom was *waving*.", ["house_lights", "window_wave"]),
    ("grandma", "leo",   "calm",    "We're at Grandma's now. It's warm. Mom hasn't let go of my *hand*.",     ["grandma_house", "hand_hold"]),
    ("sting",   "leo",   "whisper", "But this morning, on Grandma's fridge, there was a new note. Never let Leo in after *midnight*.", ["new_note", "note_end"]),
]

VOICES = {
    "leo":   dict(voice="am_michael", speed=1.1, pitch=1.06, expressive=True),
    "mom":   dict(voice="af_heart", speed=1.0, pitch=1.0, expressive=True, smooth=True, gen_speed=1.0),
    "phone": dict(voice="af_heart", speed=1.0, pitch=1.0, expressive=True, smooth=True, gen_speed=1.0,
                  filter="highpass=f=350,lowpass=f=3400,acompressor=threshold=-18dB:ratio=4,volume=1.4"),
}
LONG_GAPS = {"hook": 0.3, "deal": 0.25, "knock": 0.45, "door1": 0.4, "rule": 0.35, "ring": 0.25, "phone1": 0.4, "door2": 0.5,
             "two": 0.4, "door3": 0.35, "hearts": 0.45, "never": 0.6, "upstairs": 0.3, "phone2": 0.7, "kept": 0.4, "open": 0.25,
             "window": 0.5, "grandma": 0.6}
TAIL = 1.6
LEAD = 0.0
