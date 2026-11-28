"""Episode: "The Glow Up" (Gen Z comedy, ~2:00)

World rule: at fourteen, everyone is evaluated on looks; your rank (E..S) decides your superpower.
Zash is E-rank ("Mr. Chopped"). Bully Blaze is A-rank with gravity powers and hangs him on the
flagpole every morning. Zash follows him home: an old photo of a kid even more chopped than him,
and Blaze hitting his own face with a hammer -> Blaze looksmaxxed his way up. Zash refuses the
hammer (explicit "don't do that") and spends a year on mewing, skincare, sleep, gym, posture,
3 AM streamers. Next evaluation: S-rank, the third in history. Power: see the future and change it
("Almighty"). He uses it to ask Somi out... 312 futures, 312 no's: she's an S-rank who sees the
future too. Tobi's hypergamy chart is proven wrong. Tag: "Anyway. Back to mewing."

Charts on screen: the official Rank Chart (Chopped / LTN / MTN / HTN / Chadlite / Chad / True Chad)
and Tobi's "hypergamy chart" (shown, then crossed out by the ending).

Format: (id, speaker, tag, text, shots). Words in *stars* get the red caption.
"""
TITLE = "The Glow Up"
SLUG = "ep04_the_glow_up"

LINES = [
    # 1. the rule
    ("hook",    "zash", "tense",   "In my world, your face decides your superpower.",                        ["eval_hall", "rank_screen"]),
    ("eval",    "zash", "calm",    "At fourteen, everyone gets evaluated. S-rank gets god powers. E-rank gets nothing.", ["s_rank_flex", "e_rank_nothing"]),
    ("chart",   "zash", "calm",    "There's even an official chart. Chopped. Low tier. Mid tier. High tier. Chad. True Chad.", ["chart_reveal", "chart_climb"]),
    ("guess",   "zash", "calm",    "Guess where I landed.",                                                  ["zash_eval_old"]),
    ("erank",   "zash", "sad",     "*E-rank*. Bottom of the chart.",                                         ["e_rank_stamp"]),
    ("name",    "zash", "calm",    "At school, nobody calls me Zash. They call me Mr. Chopped.",             ["hallway_laugh", "locker_note"]),
    # 2. the bully
    ("blaze",   "zash", "tense",   "And then there's Blaze. Six foot two. A-rank. Gravity powers.",          ["blaze_walk", "blaze_glow"]),
    ("pole",    "zash", "calm",    "Every morning, he floats me up the flagpole. Every. Single. Morning.",   ["float_up", "flagpole_hang"]),
    ("bline",   "blaze","calm",    "Morning, Chopped. Enjoy the view.",                                      ["blaze_smirk"]),
    ("tobi1",   "tobi", "excited", "Bro, according to the hypergamy chart, you're literally invisible.",     ["tobi_chart"]),
    ("thanks",  "zash", "calm",    "Thanks, Tobi.",                                                          ["zash_deadpan"]),
    # 3. the secret
    ("follow",  "zash", "whisper", "So one day, I followed Blaze home. I needed to know his secret.",        ["follow_street", "blaze_house"]),
    ("photo",   "zash", "whisper", "On the wall was a photo of a kid. Even more chopped than me.",          ["photo_wall", "photo_close"]),
    ("sound",   "zash", "tense",   "Then I heard something in the next room.",                              ["door_crack"]),
    ("tink",    "zash", "whisper", "Tink. Tink. Tink.",                                                     ["tink_shadow"]),
    ("hammer",  "zash", "tense",   "Blaze was hitting his own face. With a *hammer*.",                       ["hammer_reveal", "zash_horror"]),
    ("real",    "zash", "calm",    "He wasn't born an A-rank. He looksmaxxed his way up.",                  ["photo_vs_blaze"]),
    ("dont",    "zash", "calm",    "Don't do the hammer thing. Seriously. But it gave me an idea.",          ["zash_nope", "zash_idea"]),
    # 4. the grind
    ("year",    "zash", "excited", "So for one whole year, I locked in.",                                   ["calendar_flip"]),
    ("mont",    "zash", "excited", "Mewing. Skincare. Eight hours of sleep. Gym. Posture.",                 ["mewing", "skincare", "sleep", "gym", "posture"]),
    ("stream",  "zash", "excited", "Streamers at three in the morning screaming at me to lock in.",         ["streamer_3am"]),
    ("tobi2",   "tobi", "sad",     "Bro, I'm sore from mewing.",                                            ["tobi_quit"]),
    ("tquit",   "zash", "calm",    "Tobi lasted one day.",                                                  ["tobi_couch"]),
    # 5. the evaluation
    ("again",   "zash", "tense",   "Then evaluation day came again.",                                        ["eval_hall2"]),
    ("shake",   "zash", "tense",   "The machine started shaking.",                                          ["machine_shake", "crowd_lean"]),
    ("srank",   "zash", "excited", "S-rank.",                                                               ["s_rank_reveal"]),
    ("third",   "zash", "excited", "Only the third S-rank in history.",                                     ["crowd_gasp", "blaze_shock"]),
    ("power",   "zash", "tense",   "My power? I can see the future. And change it.",                        ["eyes_glow", "future_vision"]),
    ("named",   "zash", "excited", "I named it *Almighty*.",                                                 ["almighty_title"]),
    ("payback", "zash", "calm",    "Next morning, Blaze tried the flagpole again. I saw it coming. He ended up on the pole instead.", ["blaze_try", "blaze_on_pole"]),
    # 6. the most important thing
    ("import",  "zash", "calm",    "Then I used Almighty for the most important thing in the world.",        ["zash_serious"]),
    ("ask",     "zash", "calm",    "I asked Somi out.",                                                     ["ask_somi"]),
    ("no1",     "zash", "calm",    "She said no. So I changed the future.",                                 ["somi_no", "rewind"]),
    ("no2",     "zash", "calm",    "She said no again. So I changed it again.",                             ["somi_no2", "rewind2"]),
    ("count",   "zash", "excited", "Three hundred and twelve futures. Three hundred and twelve no's.",      ["no_montage", "counter"]),
    ("reveal",  "somi", "calm",    "Zash. I can see the future too.",                                       ["somi_reveal"]),
    ("oh",      "zash", "whisper", "Oh. She was the second S-rank.",                                        ["zash_dead", "somi_eyes"]),
    ("tobi3",   "tobi", "excited", "So the chart was wrong?",                                               ["chart_crossout"]),
    ("end",     "zash", "calm",    "Anyway. Back to mewing.",                                               ["end_mew"]),
    ("cta",     "zash", "calm",    "Comment your rank. Follow for more.",                                 ["endcard"]),
]

VOICES = {
    "zash":  dict(voice="am_liam", speed=1.12, pitch=1.40, expressive=True),
    "tobi":  dict(voice="am_adam", speed=1.12, pitch=1.30, expressive=True),
    "somi":  dict(voice="af_bella", speed=1.05, pitch=1.10, expressive=True),
    "blaze": dict(voice="am_michael", speed=1.0, pitch=1.06, expressive=True),
}
LONG_GAPS = {"guess": 0.4, "erank": 0.4, "bline": 0.3, "thanks": 0.4, "sound": 0.3, "tink": 0.4, "hammer": 0.5,
             "tquit": 0.35, "shake": 0.4, "srank": 0.5, "named": 0.4, "ask": 0.4, "count": 0.4, "reveal": 0.6, "oh": 0.4, "end": 0.6}
TAIL = 2.8
