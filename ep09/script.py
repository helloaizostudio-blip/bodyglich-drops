"""Episode 9: "I Wasted All Three Wishes" (mid format, ~60 s)

Original premise. Rule + payoff image first, deadpan world jokes with a PLANT (Dad never told anyone his wish; he's
bald, so it wasn't hair), Zash's flaw (panics, wastes wishes), escalation (wish 2 removes his brother's mouth), a real
choice (his perfect list vs his brother), then the twist that pays off the plant (Dad spent his last wish on baby Zash)
and a two-word callback.
No Somi / Liza in this one.
"""
TITLE = "I Wasted All Three Wishes"
SLUG = "ep09_three_wishes"

LINES = [
    ("hook",    "zash", "tense",   "In my world, on your thirteenth birthday, you get three *wishes*.",                    ["cake_candles", "lady_poof"]),
    ("rules",   "zash", "calm",    "No wishing for more wishes. And no take *backs*.",                                    ["rules_card"]),
    ("grandma", "zash", "calm",    "Grandma wished for peace and quiet. Grandpa hasn't said a word since *ninety eight*.", ["grandpa_silent"]),
    ("dad",     "zash", "calm",    "Dad never told anyone what he wished for. He's bald, so it wasn't *hair*.",           ["dad_bald"]),
    ("list",    "zash", "excited", "I had a list. Three perfect wishes. Rich. Tall. *Famous*.",                           ["list_reveal"]),
    ("then",    "zash", "tense",   "Then the Wish Lady appeared, and I *panicked*.",                                      ["lady_close", "zash_sweat"]),
    ("first",   "lady", "calm",    "Your first wish?",                                                                    ["lady_ask"]),
    ("w1",      "zash", "excited", "I said, I wish I had my *list*.",                                                     ["list_poof"]),
    ("gone",    "zash", "sad",     "Poof. One wish *gone*.",                                                              ["counter_two"]),
    ("max",     "zash", "tense",   "Then my little brother wouldn't stop screaming. So I yelled, I wish you'd be *quiet*!", ["max_scream", "zash_yell"]),
    ("mouth",   "zash", "whisper", "His mouth *disappeared*.",                                                            ["max_nomouth"]),
    ("last",    "zash", "tense",   "One wish left. Rich. Tall. Famous. Or my *brother*.",                                 ["list_vs_max"]),
    ("choose",  "zash", "calm",    "I wish Max could talk *again*.",                                                      ["zash_wish", "max_back"]),
    ("worst",   "max",  "excited", "You're the worst brother *ever*.",                                                    ["max_angry"]),
    ("funny",   "lady", "calm",    "Funny. Your dad spent his last wish the same way. On a baby who couldn't *breathe*.", ["lady_secret", "flash_baby"]),
    ("told",    "zash", "whisper", "That's why he never *told* me.",                                                      ["zash_dad"]),
    ("button",  "dad",  "calm",    "Worth it.",                                                                           ["dad_bald_end"]),
]

VOICES = {
    "zash": dict(voice="am_michael", speed=1.1, pitch=1.06, expressive=True),    # the Blaze voice the user picked for Zash
    "lady": dict(voice="af_nicole", speed=0.98, pitch=1.0, expressive=True),
    "max":  dict(voice="af_sky", speed=1.10, pitch=1.22, expressive=True, smooth=True, gen_speed=1.0),
    "dad":  dict(voice="am_onyx", speed=1.0, pitch=0.95, expressive=True),
}
LONG_GAPS = {"rules": 0.2, "grandma": 0.3, "dad": 0.35, "then": 0.2, "first": 0.3, "gone": 0.35, "mouth": 0.5, "last": 0.4, "choose": 0.35, "worst": 0.45, "funny": 0.5, "told": 0.6}
TAIL = 1.4
LEAD = 0.0
