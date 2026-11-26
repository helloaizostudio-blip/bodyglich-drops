"""Episode 23: "Red Ears" (In my world..., narrator Zash, original).
Rule: when someone talks behind your back, your ears turn red. Zash's burn every night at 8 PM; he finds a group chat
"Without Zash" and cuts his friends off - it was his surprise birthday. Ends on a one-friend share.
"""
TITLE = "Red Ears"
SLUG = "ep23_red_ears"

LINES = [
    ("hook",   "zash",  "tense",   "In my world, when someone talks behind your back... your ears turn *red*.", ["ears_glow"]),
    ("caught", "zash",  "excited", "Snitches get caught. Liars get caught. *Nobody* can hide.", ["hallway_red"]),
    ("eight",  "zash",  "tense",   "Then every night at eight... *mine* started burning.", ["bed_red"]),
    ("chat",   "zash",  "whisper", "I found a group chat. Named... *Without Zash*.", ["phone_chat"]),
    ("h1",     "zfast", "calm",    "Huss huss huss.", ["scroll_chat"]),
    ("best",   "zash",  "sad",     "My best friends. Talking about me. *Every* night.", ["scroll_chat2"]),
    ("stop",   "zash",  "sad",     "So I stopped talking to them.", ["rain_alone"]),
    ("surp",   "tobi",  "excited", "SURPRISE! Bro, we planned this for three *weeks*!", ["door_party"]),
    ("love",   "zash",  "calm",    "Turns out... some people talk behind your back... because they *love* you.", ["all_red"]),
    ("cta",    "zash",  "calm",    "Send this to the friend whose ears should be red right *now*.", ["end_card"]),
]

CLEAR = "highpass=f=85,equalizer=f=320:t=q:w=1.0:g=-2.5,equalizer=f=3200:t=q:w=1.4:g=2.0,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=150:makeup=2,alimiter=limit=0.9"
VOICES = {
    "zash":  dict(voice="am_echo", speed=1.08, pitch=1.20, expressive=True, resample=True, gain_db=2.0, tag_amt=0.3, filter=CLEAR),
    "zfast": dict(voice="am_echo", speed=1.55, pitch=1.20, expressive=False, resample=True, tag_amt=0.0, filter=CLEAR),
    "tobi":  dict(voice="am_puck", speed=1.0, pitch=1.12, expressive=True, resample=True, gain_db=1.5, tag_amt=0.3, filter=CLEAR),
}
LONG_GAPS = {"hook": 0.4, "caught": 0.3, "eight": 0.45, "chat": 0.4, "h1": 1.1, "best": 0.35, "stop": 0.7, "surp": 0.45, "love": 0.6}
TAIL = 1.5
LEAD = 0.0
