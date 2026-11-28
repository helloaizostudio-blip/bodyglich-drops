"""Episode 2: "The Wall"  (about 2:00, ~400 words)

Anime-inspired world (giants beyond the wall, a walled city, hook-line swinging, scout tryouts,
a warning bell), built entirely from original Blockheads designs. No names, logos, characters,
uniforms or emblems from any existing show.

Beats:
  1 rule + threat ........ we live inside a giant wall; outside, the Giants walk
  2 how the town adapted . Giants can't look up -> everything is built high, front doors on the
                           3rd floor, kids swing on hook lines, bread by zipline, the 3-ring bell
  3 Zash's stake ......... the only kid scared of heights; Somi is at Scout tryouts
  4 "until Friday" ....... the bell rings three times, a Giant walks in, Somi's line snaps
  5 set piece ............ 200 stairs up the bell tower; solved with the rule's own logic:
                           Giants can't look up but CAN hear -> ring the bell from above it
  6 payoff + twist ....... he jumps, swings, saves her ("You hate heights." "Not anymore.");
                           Dad (who lived through the last three-bell day) gives Zash his old hook line;
                           as the Giant leaves, it stops... and slowly looks UP at him.
  CTA .................... "Follow if you wanna live in this world."

Humour (warm, never over the emotional beats): Liza's "Giant-proof cookies", Tobi's skateboard
burn, Zash landing on his face.

Format: (id, speaker, tag, text, shots). Words in *stars* get the red danger caption.
"""
TITLE = "The Wall"
SLUG = "ep02_the_wall"

LINES = [
    # 1. rule + threat
    ("rule",    "zash", "tense",   "In my world, we all live inside one giant wall.",                         ["drone_wall", "wall_low"]),
    ("rule2",   "zash", "tense",   "Because outside it, the *Giants* walk.",                                  ["giant_silhouette", "giant_eye"]),
    ("rule3",   "zash", "calm",    "They're as tall as buildings. They smile all the time. And they eat anything that moves.", ["giant_smile", "giant_hand", "giant_step"]),
    ("weak",    "zash", "calm",    "But Giants have one weakness. They can't look up.",                       ["giant_neck", "kid_on_roof"]),
    # 2. how the town adapted
    ("adapt1",  "zash", "calm",    "So everything in town is built high. Our front doors are on the third floor.", ["tall_houses", "door_ladder"]),
    ("adapt2",  "zash", "excited", "Kids learn to swing on hook lines before they learn to walk.",           ["baby_hook", "kids_swing"]),
    ("adapt3",  "zash", "calm",    "The bakery delivers bread by zipline.",                                   ["bread_zip"]),
    ("adapt4",  "zash", "calm",    "Nobody owns a car. But everyone owns a really good rope.",                ["rope_shop"]),
    ("liza",    "liza", "excited", "Giant-proof cookies! Two for a dollar!",                                  ["liza_stand"]),
    ("cookie",  "zash", "calm",    "They're just regular cookies.",                                           ["cookie_close"]),
    ("bell",    "zash", "tense",   "And if the tower bell rings three times, it means a Giant got *inside*.", ["bell_tower", "bell_ecu"]),
    # 3. Zash's stake
    ("history", "zash", "whisper", "The last time it rang three times, my dad was my age. He still won't talk about it.", ["old_photo", "dad_window"]),
    ("me",      "zash", "calm",    "I'm Zash. And I'm the only kid in town who's scared of heights.",         ["zash_intro_wall", "zash_ladder_shake"]),
    ("tobi",    "tobi", "excited", "Bro, you get dizzy on a skateboard.",                                    ["tobi_laugh"]),
    ("tobi2",   "zash", "calm",    "Tobi is scared of heights too. He just screams quieter.",               ["tobi_scream"]),
    ("tryout",  "zash", "calm",    "Which is a problem, because Scout tryouts were on Friday.",               ["tryout_banner"]),
    ("scouts",  "zash", "calm",    "Scouts are the ones who go outside the wall. Every kid wants to be one.", ["scouts_march", "scouts_gate"]),
    ("somi",    "zash", "sad",     "And Somi was trying out. I wanted to be up there with her.",             ["somi_swing", "zash_watch"]),
    # 4. until Friday
    ("somi2",   "zash", "calm",    "She's the best swinger in school. She once caught a falling bird in mid air.", ["somi_bird", "somi_land"]),
    ("ring1",   "zash", "tense",   "Then the bell rang. Once.",                                               ["bell_ring1"]),
    ("ring2",   "zash", "tense",   "Twice.",                                                                  ["bell_ring2"]),
    ("ring3",   "zash", "whisper", "Three times.",                                                            ["bell_ring3", "crowd_freeze"]),
    ("crack",   "zash", "tense",   "The wall cracked, and a *Giant* walked into the square.",                ["wall_crack", "giant_enter"]),
    ("roofs",   "zash", "tense",   "Everyone shot up to the rooftops. Everyone except Somi.",                 ["rooftops_swing", "somi_ground"]),
    ("snap",    "zash", "whisper", "Her line had snapped.",                                                   ["line_snap"]),
    ("smile",   "zash", "tense",   "The Giant smiled at her.",                                                ["giant_smile_somi"]),
    # 5. set piece
    ("frozen",  "zash", "whisper", "Nobody moved. Not even the Scouts.",                                    ["scouts_frozen"]),
    ("closest", "zash", "tense",   "And I was the closest one to the bell tower.",                           ["zash_tower_look"]),
    ("stairs",  "zash", "tense",   "Two hundred steps. I counted every single one.",                         ["stairs_run", "stairs_dizzy"]),
    ("legs",    "zash", "tense",   "At step one hundred, my legs stopped working. At one fifty, I stopped looking down.", ["stairs_legs", "stairs_top"]),
    ("think",   "zash", "calm",    "Giants can't look up. But they can hear.",                               ["zash_think_tower"]),
    ("hit",     "zash", "excited", "So I rang that bell as hard as I could.",                                ["bell_hit", "bell_shockwave"]),
    ("turn",    "zash", "tense",   "The Giant froze. It spun in circles, looking for the sound.",            ["giant_turn", "giant_confused"]),
    ("above",   "zash", "tense",   "But it couldn't find me. Because I was above it.",                       ["zash_above", "overhead"]),
    ("jump",    "zash", "excited", "Somi ran. And I jumped.",                                                ["somi_run", "zash_jump"]),
    ("forgot",  "zash", "excited", "For one second, I forgot I was scared.",                                 ["swing_slowmo", "swing_wide"]),
    ("land",    "zash", "calm",    "I landed right next to her. On my face.",                                ["land_face"]),
    # 6. payoff + twist
    ("hate",    "somi", "calm",    "You hate heights.",                                                      ["somi_smile"]),
    ("notany",  "zash", "calm",    "Not anymore.",                                                           ["zash_proud"]),
    ("dadend",  "zash", "sad",     "Dad was waiting at home. He didn't say a word. He just put his old hook line in my hands.", ["dad_door_wall", "hook_gift"]),
    ("pause1",  None,   "pause",   None,                                                                     []),
    ("leave",   "zash", "whisper", "That night, the Giant walked back out through the crack.",              ["giant_leave"]),
    ("stop",    "zash", "tense",   "But right before the wall closed, it stopped.",                          ["giant_stop"]),
    ("up",      "zash", "whisper", "And slowly, it looked *up*.",                                            ["giant_lookup", "zash_eyes_twist"]),
    ("wider",   "zash", "whisper", "Right at me. And its smile got wider.",                                  ["giant_smile_wide"]),
    ("confused","zash", "calm",    "Giants eat everyone.",                                                   ["zash_confused_balcony"]),
    ("whyme",   "zash", "whisper", "So why did it smile at *me*?",                                           ["zash_confused_close"]),
    ("cta",     "zash", "calm",    "Follow for part 2.",                                                     ["endcard"]),
]

VOICES = {
    "zash": dict(voice="am_liam", speed=1.12, pitch=1.40, expressive=True),
    "liza": dict(voice="af_sky", speed=1.10, pitch=1.16, expressive=True),
    "tobi": dict(voice="am_adam", speed=1.12, pitch=1.30, expressive=True),
    "somi": dict(voice="af_bella", speed=1.05, pitch=1.10, expressive=True),
}
LONG_GAPS = {"weak": 0.3, "cookie": 0.3, "ring1": 0.45, "ring2": 0.45, "ring3": 0.5, "snap": 0.4, "smile": 0.4,
             "above": 0.3, "land": 0.35, "hate": 0.35, "notany": 0.6, "stop": 0.5, "up": 0.5, "dadend": 0.6, "wider": 0.8, "confused": 0.25, "whyme": 0.9}
TAIL = 2.8

# New production pieces this episode needs (beyond Midnight Lights):
#   sets   : the giant wall (+ crack), tall 3-storey houses with ladders, rooftops and hook lines,
#            bell tower with stairs, town square, bakery zipline, cookie stand, tryout banner
#   chars  : Giants (original huge blockheads, fixed wide grin, blank eyes, slow heavy walk),
#            Somi in a Scout cloak with an original emblem, Tobi, Liza, townsfolk crowd
#   rigs   : hook-line swing (rope + arc motion), climb, fall/land-on-face, look-up head tilt
#   look   : daylight -> golden hour -> dusk; dust clouds on Giant steps, speed lines on swings,
#            epic choir-style synth hits for the anime feel
