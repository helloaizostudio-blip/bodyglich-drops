"""Episode 15: "The Odd One Out" (narrator Zash, comedy with a soft ending; the user's idea).

In Zash's world everyone loves the same gender; he likes girls and gets laughed at. His best friend Theo secretly does
too. A wish stone flips the whole world - including Zash, who is the odd one out again. A second stone flips only him
back, and he forgets Theo, who is now the one left out. Zash sits with him: the problem was the people laughing.
"""
TITLE = "The Odd One Out"
SLUG = "ep15_odd_one_out"

LINES = [
    ("hook",   "zash",  "excited", "In my world, everyone loves the same gender. I'm the only guy who likes *girls*.", ["hall_couples", "zash_alone"]),
    ("laugh1", "bully", "excited", "Straight boy!", ["bullies_point"]),
    ("jokes",  "zash",  "sad",     "Every day, same jokes. Same laughs. And Mia? She'd never even look at *me*.", ["locker_notes", "mia_girl"]),
    ("theo1",  "theo",  "whisper", "Bro... me too. I like girls too. Just... don't tell *anyone*.", ["theo_whisper"]),
    ("stone",  "zash",  "tense",   "So I made a wish. I wish the whole world would *flip*. Let them feel what it's like to be me.", ["rain_stone", "stone_glow", "shockwave"]),
    ("worked", "zash",  "excited", "It worked! Everyone flipped! Mia finally looked at me... and I felt...", ["hall_flipped", "mia_waves"]),
    ("nothing","zash",  "calm",    "...*nothing*?", ["heart_pop_guy"]),
    ("me",     "zash",  "whisper", "I flipped the whole world. Including... *me*.", ["zash_zoom"]),
    ("laugh2", "bully", "excited", "Look! He's the odd one out *again*!", ["bullies_again"]),
    ("kidding","zash",  "excited", "Are you *kidding* me?!", ["zash_scream"]),
    ("wish2",  "zash",  "tense",   "Another wish. This time, just me. Flip *me* back.", ["puddle_dig", "stone2_flash"]),
    ("fit",    "zash",  "calm", "Finally. I fit *in*.", ["mia_heart"]),
    ("forgot", "zash",  "sad",     "Then I remembered... Theo flipped too. And I only wished myself *back*.", ["cafeteria_pan", "theo_alone"]),
    ("theo2",  "theo",  "sad",     "Bro... where's *my* stone?", ["theo_eyes"]),
    ("cta",    "zash",  "calm",    "The problem was never who we liked. It was the people *laughing*.", ["sit_together", "freeze_tag"]),
]

CROWD = "aecho=0.8:0.75:23|41|67:0.55|0.45|0.35,equalizer=f=2500:t=q:w=1.2:g=2,volume=1.3"
VOICES = {
    "zash":  dict(voice="am_echo", speed=1.21, pitch=1.28, expressive=True, resample=True, gain_db=2.0, polish=True, tag_amt=0.5),
    "theo":  dict(voice="am_puck", speed=1.12, pitch=1.18, expressive=True, resample=True, gain_db=1.0, polish=True, tag_amt=0.5),
    "bully": dict(voice="am_liam", speed=1.15, pitch=1.15, expressive=True, resample=True, tag_amt=0.6, filter=CROWD),   # a laughing group
}
LONG_GAPS = {"hook": 0.1, "laugh1": 0.3, "jokes": 0.25, "theo1": 0.35, "stone": 0.3, "worked": 0.5, "nothing": 0.45, "me": 0.2,
             "laugh2": 0.15, "kidding": 0.4, "wish2": 0.3, "fit": 0.5, "forgot": 0.25, "theo2": 0.5}
TAIL = 1.8
LEAD = 0.0
