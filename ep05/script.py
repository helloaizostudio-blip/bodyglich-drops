"""Episode: "Screen Time" (Gen Z comedy, ~65 s)

World rule: every hour on your phone ages you one day. Off your phone, you get the time back.
Built on what the stats taught us:
  - cold open on old Tobi's face, first line is a joke (no establishing shot, no silence)
  - ~65 s, a joke every 3-5 s, FOLLOW prompt in the middle, SHARE prompt at the end
Twist: Zash wins the no-phone week... and gets so young that Somi won't date a middle schooler.

Format: (id, speaker, tag, text, shots). Words in *stars* get the red caption.
"""
TITLE = "Screen Time"
SLUG = "ep05_screen_time"

LINES = [
    ("hook",    "zash", "tense",   "My best friend is fifteen. He looks *sixty*.",                          ["tobi_old_reveal"]),
    ("rule",    "zash", "calm",    "In my world, every hour on your phone ages you one day.",              ["phone_timer", "age_tick"]),
    ("adapt",   "zash", "calm",    "Phones come with wrinkle warnings. Teachers check your gray hairs instead of homework.", ["warning_box", "teacher_check"]),
    ("tobi",    "zash", "calm",    "Tobi scrolls nine hours a day. He has back pain. And a retirement plan.", ["tobi_back", "tobi_cane"]),
    ("onemore", "tobi", "calm",    "Bro, one more reel. Then I'm done.",                                    ["tobi_scroll"]),
    ("since",   "zash", "calm",    "He's been saying that since he was ten.",                              ["tobi_beard"]),
    ("bet",     "zash", "tense",   "Then Somi made me a bet.",                                              ["somi_walkup"]),
    ("somi",    "somi", "calm",    "One week. No phone. Win, and I'll go on a date with you.",             ["somi_bet"]),
    ("easy",    "zash", "excited", "Easy.",                                                                 ["zash_smug_phone"]),
    ("day1",    "zash", "excited", "Day one. I touched grass. Literally.",                                  ["grass_touch"]),
    ("day3",    "zash", "tense",   "Day three. I kept hearing notifications that weren't real.",           ["phantom_buzz"]),
    ("day5",    "zash", "tense",   "Day five. I tried to scroll a sandwich.",                              ["scroll_sandwich"]),
    ("day7",    "zash", "excited", "Day seven. I *did* it.",                                                 ["day7_win"]),
    ("young",   "zash", "excited", "And I looked younger. Like, a lot younger.",                           ["mirror_young"]),
    ("ran",     "zash", "excited", "I ran to Somi to claim my date.",                                       ["run_to_somi"]),
    ("no",      "somi", "calm",    "Zash. I don't date middle schoolers.",                                  ["somi_no_kid", "kid_zash_shock"]),
    ("fix",     "zash", "calm",    "So now I need about three months of reels.",                           ["kid_zash_phone"]),
    ("tobi2",   "tobi", "excited", "Welcome back, brother.",                                                ["tobi_welcome"]),
    ("cta",     "zash", "calm",    "Send this to your friend who's always on their phone.",               ["endcard"]),
]

VOICES = {
    "zash": dict(voice="am_liam", speed=1.12, pitch=1.40, expressive=True),
    "tobi": dict(voice="am_adam", speed=1.0, pitch=1.0, expressive=True),     # old-man Tobi: lower and slower
    "somi": dict(voice="af_bella", speed=1.05, pitch=1.10, expressive=True),
}
LONG_GAPS = {"hook": 0.25, "since": 0.35, "easy": 0.35, "day7": 0.3, "ran": 0.2, "no": 0.5, "fix": 0.3, "tobi2": 0.4}
TAIL = 2.6
LEAD = 0.0   # voice starts at frame 0 (no silent lead-in)
