"""Episode 3: "The Wall, Part 2" (about 2:00)

Continues Ep 2. Answers: why did the Giant smile at Zash, when Giants eat everyone?
Anime-style escalation: Zash discovers he can become a Giant; the smiling Giant dies saving him;
she was his mom, who changed the night he was born and walked out so she'd never hurt them.
Fits Ep 2 continuity ("Dad still won't talk about it").

Beats:
  1 hook ............... Giants eat everything that moves. So why did that one smile at me?
  2 mystery ............ she comes back every evening; Scouts plan to hunt her; Zash heals fast, eyes glow gold
  3 set piece .......... dawn mission outside the wall; a pack of twelve; Zash falls and is grabbed
  4 rescue + loss ...... the smiling Giant saves him, fights them all, is bitten and falls
  5 anime turn ......... Zash transforms into a Giant for the first time; the pack runs
  6 emotional payoff ... she touches his face, hums Dad's song, dies; the locket; Dad's truth
  7 ending ............. "Giants eat everything that moves. Except their own kids." + CTA

Format: (id, speaker, tag, text, shots). Words in *stars* get the red danger caption.
"""
TITLE = "The Wall: Part 2"
SLUG = "ep03_the_wall_part2"

LINES = [
    # 1. hook
    ("hook",    "zash", "whisper", "Giants eat everything that moves. *Everything*.",                       ["pack_far", "giant_bite_far"]),
    ("why",     "zash", "tense",   "So why did that one smile at me?",                                      ["smiler_recap"]),
    # 2. mystery
    ("back",    "zash", "calm",    "Since that night, it came back to the wall every evening.",             ["wall_dusk", "smiler_at_wall"]),
    ("watch",   "zash", "calm",    "Same spot. Same smile. Just watching me.",                              ["smiler_watch", "zash_balcony"]),
    ("hunt",    "zash", "tense",   "The Scouts said it was *hunting* me.",                                 ["scouts_table"]),
    ("dawn",    "somi", "tense",   "We go out at dawn. We end this.",                                      ["somi_brief"]),
    ("wrong",   "zash", "calm",    "But something was wrong with me too.",                                  ["zash_mirror"]),
    ("heal",    "zash", "tense",   "My cuts healed in seconds.",                                            ["hand_heal"]),
    ("gold",    "zash", "tense",   "And when I got angry, my eyes turned *gold*.",                           ["eyes_gold"]),
    ("tobi",    "tobi", "excited", "Bro. That is NOT normal.",                                             ["tobi_shock"]),
    # 3. set piece
    ("gate",    "zash", "tense",   "At dawn, the Scouts went outside the wall. And I followed them.",       ["gate_open", "scouts_out", "zash_sneak"]),
    ("quiet",   "zash", "whisper", "Outside, it was quiet. Too quiet.",                                     ["field_wide", "field_trees"]),
    ("shake",   "zash", "tense",   "Then the ground started shaking.",                                      ["ground_shake"]),
    ("twelve",  "zash", "tense",   "Not one Giant. *Twelve*.",                                              ["pack_reveal", "pack_run"]),
    ("fall",    "zash", "excited", "The Scouts scattered. My line snapped, and I fell.",                    ["scatter", "zash_fall"]),
    ("grab",    "zash", "tense",   "A Giant grabbed me.",                                                   ["giant_grab"]),
    ("mouth",   "zash", "whisper", "It opened its mouth.",                                                  ["mouth_open"]),
    # 4. rescue + loss
    ("hit",     "zash", "excited", "Then something hit it so hard, it flew.",                               ["smiler_tackle", "giant_fly"]),
    ("itwas",   "zash", "tense",   "It was the smiling Giant.",                                             ["smiler_reveal"]),
    ("fought",  "zash", "excited", "It fought all of them. For me.",                                        ["smiler_fight1", "smiler_fight2", "smiler_fight3"]),
    ("bit",     "zash", "sad",     "Until one bit its shoulder, and it went down.",                         ["smiler_bitten", "smiler_falls"]),
    # 5. anime turn
    ("snap",    "zash", "tense",   "Something inside me snapped.",                                          ["zash_rage"]),
    ("light",   "zash", "excited", "Gold light. Heat. And then I was looking down at the trees.",          ["transform_flash", "transform_rise", "zash_giant_pov"]),
    ("too",     "zash", "excited", "I was a Giant too.",                                                    ["zash_giant_reveal"]),
    ("roar",    "zash", "excited", "I roared, and they ran.",                                               ["zash_roar", "pack_flee"]),
    # 6. emotional payoff
    ("knelt",   "zash", "sad",     "I knelt next to the smiling Giant. It was barely breathing.",          ["kneel_wide", "smiler_dying"]),
    ("touch",   "zash", "sad",     "It reached up and touched my face.",                                    ["smiler_touch"]),
    ("hum",     "zash", "sad",     "And it hummed. A song I knew. The song Dad hums every night.",          ["smiler_hum", "zash_giant_tear"]),
    ("closed",  "zash", "sad",     "Then it closed its eyes.",                                              ["smiler_eyes_close"]),
    ("woke",    "zash", "calm",    "When I woke up, I was small again. Next to me was a locket.",          ["zash_wake", "locket_grass"]),
    ("photo",   "zash", "sad",     "Inside was a photo. A woman, holding a baby.",                          ["locket_photo"]),
    ("dad",     "zash", "calm",    "Dad finally told me the truth.",                                        ["dad_table"]),
    ("born",    "zash", "sad",     "The night I was born, Mom changed. She walked out through the wall, so she would never hurt us.", ["flash_mom", "flash_walk"]),
    ("years",   "zash", "sad",     "And every night for twelve years, she came back. Just to watch me grow up.", ["flash_watch", "flash_wave"]),
    ("pause1",  None,   "pause",   None,                                                                    []),
    # 7. ending
    ("end1",    "zash", "calm",    "Giants eat everything that moves.",                                    ["end_wall"]),
    ("end2",    "zash", "sad",     "Except their own kids.",                                                ["end_locket"]),
    ("cta",     "zash", "calm",    "Follow if you wanna live in this world.",                               ["endcard"]),
]

VOICES = {
    "zash": dict(voice="am_liam", speed=1.12, pitch=1.40, expressive=True),
    "tobi": dict(voice="am_adam", speed=1.12, pitch=1.30, expressive=True),
    "somi": dict(voice="af_bella", speed=1.05, pitch=1.10, expressive=True),
}
LONG_GAPS = {"why": 0.5, "dawn": 0.3, "quiet": 0.4, "twelve": 0.3, "mouth": 0.6, "itwas": 0.35, "bit": 0.5, "snap": 0.35,
             "too": 0.4, "touch": 0.5, "hum": 0.6, "closed": 0.9, "photo": 0.5, "born": 0.4, "years": 0.6, "end1": 0.5, "end2": 0.9}
TAIL = 3.0
