"""Episode 7: "The Fourteenth Step" (horror-twist format, ~60 s)

Built from docs/competitor_breakdown_part2.md (video C structure, original premise):
  two hooks in 4 s (creepy rule + "last night I counted fifteen"), world lore with a number,
  numbered nights as chapter cards (15, 18, 23), a planted detail (slippers on step 14) that returns,
  a voice-mimic scare, a reveal that reframes everything (the house is sinking), and a sting aimed at the viewer.
No dogs / guardian-pet premise (avoid looking like the reference video).

Format: (id, speaker, tag, text, shots). Words in *stars* get the highlighted caption word.
"""
TITLE = "The Fourteenth Step"
SLUG = "ep07_fourteenth_step"

LINES = [
    ("hook",   "zash", "tense",   "In my world, every staircase has thirteen steps. If you ever count *fourteen*, don't go down.", ["stairs_dark", "step_glow", "zash_top"]),
    ("hook2",  "zash", "whisper", "Last night, I counted *fifteen*.",                                       ["card_15"]),
    ("lore",   "zash", "calm",    "Everyone in my town counts their stairs before bed. Out *loud*.",       ["town_count"]),
    ("ruiz",   "zash", "tense",   "Our neighbor counted fourteen once. They found his slippers on step fourteen. Just his *slippers*.", ["slippers_step"]),
    ("n1",     "zash", "tense",   "Night one. Fifteen steps. Something at the bottom was *breathing*.",    ["night1", "dark_bottom"]),
    ("dad",    "zash", "calm",    "Dad said it's an old house. Old houses *breathe*.",                     ["dad_shrug"]),
    ("n2",     "zash", "tense",   "Night two. Eighteen steps. The basement light turned on by *itself*.",  ["card_18", "light_on"]),
    ("n3",     "zash", "tense",   "Night three. Twenty three. Then I heard my name.",                      ["card_23", "zash_bed"]),
    ("call",   "mom",  "whisper", "Zash. Come down here.",                                                 ["voice_dark"]),
    ("asleep", "zash", "whisper", "It was Mom's voice. Mom was asleep in the room next to *mine*.",        ["mom_asleep"]),
    ("n4",     "zash", "tense",   "Night four, my little brother's bed was *empty*.",                      ["max_bed_empty"]),
    ("slip",   "zash", "sad",     "His slippers were on step *fourteen*.",                                 ["max_slippers"]),
    ("down",   "zash", "tense",   "So I went down. Counting. Thirty. Forty. *Fifty*.",                     ["descent1", "descent2", "descent3"]),
    ("max",    "zash", "tense",   "Max was at the bottom. Staring at a window.",                           ["max_window"]),
    ("dirt",   "zash", "whisper", "Behind the glass was dirt. Roots. *Worms*.",                            ["window_dirt"]),
    ("sink",   "zash", "tense",   "The stairs weren't getting longer. Our house was *sinking*.",           ["house_sink"]),
    ("run",    "zash", "excited", "I grabbed Max and ran. I counted every step back up. All *ninety*.",    ["run_up", "door_top"]),
    ("safe",   "zash", "calm",    "We moved out the next morning.",                                        ["moving_truck"]),
    ("new",    "zash", "tense",   "Tonight, in our new house, I counted *fourteen*.",                      ["new_stairs"]),
    ("sting",  "zash", "whisper", "Go count yours. Out *loud*.",                                           ["viewer_stairs"]),
]

VOICES = {
    "zash": dict(voice="am_michael", speed=1.1, pitch=1.06, expressive=True),
    "mom":  dict(voice="af_heart", speed=0.95, pitch=0.97, expressive=True, smooth=True, gen_speed=0.95),
}
LONG_GAPS = {"hook": 0.15, "hook2": 0.4, "ruiz": 0.35, "n1": 0.3, "n3": 0.4, "call": 0.6, "asleep": 0.45, "n4": 0.3,
             "slip": 0.5, "down": 0.4, "dirt": 0.5, "sink": 0.5, "safe": 0.4, "new": 0.7}
TAIL = 1.5
LEAD = 0.0
