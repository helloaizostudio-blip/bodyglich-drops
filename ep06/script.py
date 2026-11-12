"""Episode 6: "Every Lie Rings a Bell" (short-twist format, ~35 s)

Built from docs/competitor_breakdown_part2.md:
  - rule + payoff image in the first 3 s, twist by ~0:08, 3-step visible escalation
  - ~280-300 wpm, a cut every ~1 s, one repeating SFX as the joke engine (DING)
  - last line is 1 word that flips the hook; cut to black, no "follow me" in the video
Continuity: Dad's "five minutes" is never a lie (it was a to-do list), so his bell never rings.

Format: (id, speaker, tag, text, shots). Words in *stars* get the highlighted caption word.
"""
TITLE = "Every Lie Rings a Bell"
SLUG = "ep06_lie_bell"

LINES = [
    ("hook",   "zash", "tense",   "In my world, every time you lie, a *bell* rings over your head.", ["bell_town", "bell_ding", "bell_crowd"]),
    ("liza",   "zash", "calm",    "My cousin's room sounds like a *church*.",                          ["liza_room"]),
    ("dad",    "zash", "calm",    "Dad says five minutes every morning. It never rings. Nobody knows *how*.", ["dad_five", "dad_nobell"]),
    ("plugs",  "zash", "calm",    "The richest store in town sells *earplugs*.",                       ["earplug_store"]),
    ("pols",   "zash", "calm",    "Every politician in my town is *deaf*.",                            ["politician"]),
    ("me",     "zash", "calm",    "Me? Fifteen years. Never rung *once*.",                             ["zash_clean"]),
    ("cost",   "zash", "calm",    "Honesty has cost me every friend except *Tobi*.",                   ["tobi_shrug"]),
    ("then",   "zash", "tense",   "Then Somi showed me her *drawing*.",                                ["somi_walk"]),
    ("ask",    "somi", "calm",    "Be honest. Is it good?",                                            ["somi_ask"]),
    ("horse",  "zash", "calm",    "It was a horse. I think. It had six *legs*.",                                        ["drawing_close"]),
    ("lie",    "zash", "excited", "It's *amazing*!",                                                   ["zash_lie"]),
    ("spread", "zash", "excited", "One bell. Then ten. Then the whole *city*.",                        ["bells_1", "bells_2", "bells_town"]),
    ("truth",  "zash", "calm",    "So I told the truth. It's terrible. But I really *like* you.",      ["zash_truth"]),
    ("quiet",  "zash", "whisper", "No bell.",                                                          ["no_bell"]),
    ("too",    "somi", "calm",    "I like you too.",                                                   ["somi_too"]),
    ("ding",   "zash", "calm",    "*Ding*.",                                                           ["final_ding"]),
]

VOICES = {
    "zash": dict(voice="am_liam", speed=1.32, pitch=1.40, expressive=True),
    "somi": dict(voice="af_bella", speed=1.15, pitch=1.10, expressive=True),
}
LONG_GAPS = {"hook": 0.12, "me": 0.15, "ask": 0.2, "horse": 0.15, "lie": 0.5, "spread": 0.4, "truth": 0.35, "quiet": 0.5, "too": 0.7}
TAIL = 1.2
LEAD = 0.0
