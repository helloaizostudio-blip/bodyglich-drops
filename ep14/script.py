"""Episode 14: "Aisle 7" (narrator Zash, everyday horror, original).

A store intercom warns the last customer not to turn around. Zash, out for milk at 11:58 PM, is that customer.
Footsteps match his, a cart rolls by itself, Aisle 7 'closes' while he stands in it. A gray hand drops a name tag
with his name in his basket. The exit won't open; Mom texts he's been gone 3 days. Twist: he's wearing the uniform,
it's his 'first shift', and he starts the announcement for the next kid.
"""
TITLE = "Aisle 7"
SLUG = "ep14_aisle_7"

LINES = [
    ("hook",   "pa",   "calm",    "Attention shoppers. The last customer in the store... do *not* turn around.", ["black_intercom", "lights_on", "zash_frozen_wide"]),
    ("last",   "zash", "whisper", "I was the last *customer*.", ["zash_frozen"]),
    ("milk",   "zash", "calm",    "Mom sent me for milk. The store closes at *midnight*. Easy.", ["clock", "basket_walk"]),
    ("music",  "zash", "whisper", "Then the music *stopped*.", ["empty_checkouts"]),
    ("steps",  "zash", "tense",   "Every step I took... something behind me took one *too*.", ["feet_steps", "zash_stops"]),
    ("closed", "pa",   "calm",    "Aisle seven is now *closed*.", ["cart_rolls"]),
    ("in7",    "zash", "whisper", "I was in Aisle *seven*.", ["aisle_sign", "lights_dying"]),
    ("tag",    "zash", "tense",   "It put something in my basket. A name tag. With *my* name.", ["breath_shoulder", "gray_hand", "name_tag"]),
    ("walk",   "pa",   "calm",    "Keep walking. Don't *run*.", ["stiff_walk", "doors_shut"]),
    ("likes",  "pa",   "whisper", "It likes it when you *run*.", ["hand_closer"]),
    ("days",   "zash", "whisper", "Three... *days*?", ["mom_text"]),
    ("thanks", "pa",   "calm",    "Thank you for shopping with us...", ["zash_face"]),
    ("shift",  "pa",   "calm",    "...and welcome to your first *shift*.", ["tilt_uniform", "doors_open"]),
    ("copy",   "zashpa", "calm",  "Attention shoppers...", ["zash_mouth"]),
    ("cta",    "zash", "whisper", "Comment, aisle seven... before it's your *shift*.", ["freeze_smile"]),
]

PA = "highpass=f=320,lowpass=f=3600,acompressor=threshold=-20dB:ratio=4:attack=5:release=80,aecho=0.8:0.55:70|130:0.22|0.12,volume=1.6"
VOICES = {
    "zash":   dict(voice="am_echo", speed=1.21, pitch=1.28, expressive=True, resample=True, gain_db=2.0, polish=True, tag_amt=0.5),
    "pa":     dict(voice="af_sarah", speed=0.92, pitch=1.0, expressive=False, tag_amt=0.2, filter=PA),     # calm store intercom
    "zashpa": dict(voice="am_echo", speed=1.0, pitch=1.18, expressive=False, resample=True, tag_amt=0.0, filter=PA),  # Zash, now the intercom
}
LONG_GAPS = {"hook": 0.35, "last": 0.3, "milk": 0.4, "music": 0.6, "steps": 0.3, "closed": 0.25, "in7": 0.6,
             "tag": 0.35, "walk": 0.5, "likes": 0.9, "days": 0.7, "thanks": 0.4, "shift": 0.8, "copy": 0.5}
TAIL = 1.8
LEAD = 0.0
