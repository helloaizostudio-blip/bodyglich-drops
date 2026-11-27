"""Episode 24: "The Only Tall Guy" (narrator Zash; comedy, a wish that backfires, a soft twist).

In Zash's world short guys get all the girls and he is the only tall one. He wishes to be the shortest guy alive and
shrinks to ant size: now he is the hottest guy in school and nobody can see him. Then he meets the only tall girl,
who made the same wish. Ends on a shoe coming down.
"""
TITLE = "The Only Tall Guy"
SLUG = "ep24_only_tall_guy"

LINES = [
    ("hook",  "zash",  "excited", "In my world, short guys get all the girls. I'm the only *tall* one.", ["hall_shorts", "zash_bonk"]),
    ("lamp",  "crowd", "excited", "Hey, *lamp post*!", ["bullies_point"]),
    ("door",  "zash",  "sad",     "Even Mia needs a ladder just to *reject* me.", ["mia_ladder"]),
    ("no",    "mia",   "calm",    "*No*.", ["mia_no"]),
    ("stone", "zash",  "tense",   "So I found a wish stone. Make me the *shortest* guy alive!", ["stone_find", "stone_flash"]),
    ("tiny",  "ztiny", "calm",    "Too... *short*.", ["ant_zash"]),
    ("hot",   "ztiny", "excited", "Now I'm the hottest guy in school. And nobody can even *see* me.", ["hall_search", "ant_wave"]),
    ("mia2",  "mia",   "excited", "Where's that cute short guy?", ["mia_steps"]),
    ("small", "ztiny", "sad",     "I got everything I wished for. And I never felt so *small*.", ["ant_sad"]),
    ("hey",   "nova",  "whisper", "Hey... you wished it *too*?", ["nova_tiny"]),
    ("same",  "ztiny", "calm",    "The only tall girl in school. Same stone. Same *wish*.", ["nova_flash", "two_tiny"]),
    ("moral", "ztiny", "calm",    "I didn't need to fit in. I just needed someone my *size*.", ["sit_eraser"]),
    ("uhoh",  "ztiny", "tense",   "Uh oh.", ["shoe_shadow", "end_card"]),
]

CLEAR = "highpass=f=85,equalizer=f=320:t=q:w=1.0:g=-2.5,equalizer=f=3200:t=q:w=1.4:g=2.0,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=150:makeup=2,alimiter=limit=0.9"
VOICES = {
    "zash":  dict(voice="am_echo", speed=1.16, pitch=1.20, expressive=True, resample=True, gain_db=2.0, tag_amt=0.3, filter=CLEAR),
    "ztiny": dict(voice="am_echo", speed=1.16, pitch=1.42, expressive=True, resample=True, gain_db=2.5, tag_amt=0.3, filter=CLEAR),   # same boy, shrunk
    "mia":   dict(voice="af_bella", speed=1.05, pitch=1.06, expressive=True, resample=True, gain_db=2.0, tag_amt=0.3, filter=CLEAR),
    "nova":  dict(voice="af_sarah", speed=1.05, pitch=1.30, expressive=True, resample=True, gain_db=3.0, tag_amt=0.3, filter=CLEAR),
    "crowd": dict(voice="am_liam", speed=1.12, pitch=1.10, expressive=True, resample=True, tag_amt=0.4, filter="aecho=0.8:0.5:18|31:0.35|0.25," + CLEAR),
}
LONG_GAPS = {"hook": 0.2, "lamp": 0.3, "door": 0.25, "no": 0.45, "stone": 0.5, "tiny": 0.45, "hot": 0.25, "mia2": 0.4, "small": 0.6,
             "hey": 0.45, "same": 0.4, "moral": 0.6}
TAIL = 2.2
LEAD = 0.0
