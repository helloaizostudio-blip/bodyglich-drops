"""Episode 19: "Rewind" (cinematic time-loop thriller, narrator Zash, original).

Opens on the last second of Zash's life: falling backward through a shattered window, a hooded figure reaching for
him. Rewinds: -10 s running from the figure; -30 s a note at the door in his own handwriting ("DON'T TOUCH THE
WATCH"); -1 min Grandpa's watch that runs backwards, which he winds. Then forward from the figure's side: it's a
future Zash, trying to save him. "Don't wind the watch." The last line loops into the first frame.
"""
TITLE = "Rewind"
SLUG = "ep19_rewind"

LINES = [
    ("last",    "zash",   "whisper", "This is the last second of my *life*.", ["freeze_fall"]),
    ("rewind",  "zash",   "calm",    "Let me *rewind*.", ["rewind_1"]),
    ("run",     "zash",   "tense",   "Ten seconds earlier, I was running from *him*.", ["card_10", "hall_chase", "figure_reach"]),
    ("note",    "zash",   "tense",   "Thirty seconds earlier, someone left this at my *door*.", ["card_30", "door_knock", "note_open"]),
    ("hand",    "zash",   "whisper", "It was *my* handwriting.", ["zash_pale"]),
    ("watch",   "zash",   "calm",    "One minute earlier, I found Grandpa's watch. It ran *backwards*.", ["card_60", "attic_box", "watch_spin"]),
    ("wound",   "zash",   "whisper", "So I *wound* it.", ["wind_crown"]),
    ("wrong",   "zash",   "tense",   "But I had it *backwards*.", ["pov_chase"]),
    ("chasing", "zash",   "tense",   "He wasn't chasing me...", ["hood_falls"]),
    ("save",    "zash",   "sad",     "He was trying to *save* me.", ["future_face"]),
    ("dont",    "future", "whisper", "Don't wind the *watch*.", ["the_catch", "wrist_reveal"]),
    ("loop",    "zash",   "whisper", "This is the last second of my life...", ["loop_fall"]),
]

CLEAR = "highpass=f=85,equalizer=f=320:t=q:w=1.0:g=-2.5,equalizer=f=3200:t=q:w=1.4:g=2.0,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=150:makeup=2,alimiter=limit=0.9"
VOICES = {
    "zash":   dict(voice="am_echo", speed=1.02, pitch=1.18, expressive=True, resample=True, gain_db=2.5, tag_amt=0.35, filter=CLEAR),
    # the same Zash from the future: lower, slower, hoarse
    "future": dict(voice="am_echo", speed=0.92, pitch=1.06, expressive=True, resample=True, gain_db=3.0, tag_amt=0.3,
                   filter="highpass=f=90,lowpass=f=6500,equalizer=f=240:t=q:w=1.0:g=2," + CLEAR),
}
LONG_GAPS = {"last": 0.9, "rewind": 1.3, "run": 1.4, "note": 0.5, "hand": 1.4, "watch": 0.4, "wound": 1.3, "wrong": 0.3,
             "chasing": 0.6, "save": 1.6, "dont": 1.6}
TAIL = 0.15
LEAD = 0.4
