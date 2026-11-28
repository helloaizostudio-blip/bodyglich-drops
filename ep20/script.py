"""Episode 20: "The Text From The Future" (In my world..., narrator Zash, original).

On your 16th birthday you get one text from your future self. Brick, Mia and Tobi get theirs. Zash's says
"DON'T TRUST ME", then four more arrive, the last one "LOOK BEHIND YOU": two identical future Zashes, each saying
the other is from the future where he dies. Only one has a reflection. Cliffhanger: left or right? Part 2 tomorrow.
"""
TITLE = "The Text From The Future"
SLUG = "ep20_future_text"

LINES = [
    ("hook",   "zash",  "tense",   "In my world, on your sixteenth birthday, you get *one* text... from your future self.", ["phone_midnight", "screen_from"]),
    ("world",  "zash",  "excited", "People get warnings. Lottery numbers. Love advice. Everyone gets *one*.", ["brick_text", "mia_text", "tobi_text"]),
    ("mine",   "zash",  "whisper", "Mine said... *don't trust me*.", ["midnight_cake", "dont_trust"]),
    ("five",   "zash",  "tense",   "Everyone gets one text. I got *five*. And the last one said...", ["texts_stack", "look_behind", "slow_turn"]),
    ("left",   "fleft", "tense",   "He's from the future where you *die*.", ["two_zash", "left_points"]),
    ("right",  "fright","excited", "No, *he* is! Come with me. *Now*!", ["right_points", "both_reach"]),
    ("mirror", "zash",  "whisper", "Then I looked in the mirror. Only *one* of them had a reflection.", ["mirror_push", "mirror_reveal"]),
    ("cta",    "zash",  "calm",    "Which one would you trust? Comment left or right... part two *tomorrow*.", ["end_card"]),
]

CLEAR = "highpass=f=85,equalizer=f=320:t=q:w=1.0:g=-2.5,equalizer=f=3200:t=q:w=1.4:g=2.0,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=150:makeup=2,alimiter=limit=0.9"
OLD = "highpass=f=90,lowpass=f=6500,equalizer=f=240:t=q:w=1.0:g=2," + CLEAR
VOICES = {
    "zash":   dict(voice="am_echo", speed=1.08, pitch=1.20, expressive=True, resample=True, gain_db=2.0, tag_amt=0.35, filter=CLEAR),
    "fleft":  dict(voice="am_echo", speed=0.98, pitch=1.06, expressive=True, resample=True, gain_db=3.0, tag_amt=0.35, filter=OLD),   # future Zash, calm and cold
    "fright": dict(voice="am_echo", speed=1.04, pitch=1.10, expressive=True, resample=True, gain_db=3.0, tag_amt=0.45, filter=OLD),   # future Zash, panicked
}
LONG_GAPS = {"hook": 0.4, "world": 0.4, "mine": 0.9, "five": 1.2, "left": 0.25, "right": 0.9, "mirror": 0.8}
TAIL = 1.6
LEAD = 0.2
