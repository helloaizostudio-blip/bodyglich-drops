"""Episode 6: "Ask Your Father" (short-twist format, ~35 s)

Rule: when your mom says "ask your father", you teleport straight to him (and back, if he says "ask your mother").
Built from docs/competitor_breakdown_part2.md: rule + image in 3 s, a relatable parent saying taken literally,
visible escalation (kitchen -> office -> faster -> car wash -> both at once), one repeating SFX (POOF),
a short last line that pays off the hook. No Somi / Liza in this one: family + Max only.

Format: (id, speaker, tag, text, shots). Words in *stars* get the highlighted caption word.
"""
TITLE = "Ask Your Father"
SLUG = "ep06_ask_your_father"

LINES = [
    ("hook",   "zash", "tense",   "In my world, when your mom says ask your father, you *teleport* straight to him.", ["mom_says", "poof", "dad_office"]),
    ("kids",   "zash", "calm",    "Every kid in my town has seen the inside of a *bank vault*.",       ["kid_vault"]),
    ("max",    "zash", "calm",    "My little brother once landed in a *submarine*.",                   ["max_sub"]),
    ("divorce","zash", "calm",    "Kids with divorced parents have *frequent flyer* miles.",           ["flyer_kid"]),
    ("money",  "zash", "excited", "So yesterday, I asked Mom for twenty *bucks*.",                     ["zash_ask"]),
    ("mom1",   "mom",  "calm",    "Ask your father.",                                                  ["mom_ask"]),
    ("land1",  "zash", "calm",    "Poof. I landed in Dad's meeting. On the *table*.",                  ["poof1", "meeting_table"]),
    ("dad1",   "dad",  "calm",    "Ask your mother.",                                                  ["dad_ask"]),
    ("loop",   "zash", "excited", "Poof. Kitchen. Poof. Office. Kitchen. Office. *Faster*.",           ["loop_kitchen", "loop_office", "loop_kitchen2", "loop_office2", "loop_blur"]),
    ("wash",   "zash", "excited", "I went through a car wash. *Twice*.",                               ["car_wash"]),
    ("shower", "zash", "excited", "Once I landed in Dad's shower. We *both* screamed.",               ["shower"]),
    ("both",   "zash", "tense",   "Then they both said it at the *same time*.",                        ["both_say"]),
    ("stuck",  "zash", "calm",    "I got stuck exactly halfway between them. In the *mailbox*. For three days.",                  ["mailbox"]),
    ("mail",   "zash", "calm",    "This morning, Dad *mailed* me twenty bucks.",                       ["mail_money"]),
    ("worth",  "zash", "excited", "*Worth* it.",                                                       ["worth_it"]),
]

VOICES = {
    "zash": dict(voice="am_puck", speed=1.30, pitch=1.12, expressive=True),   # new Zash voice (option 1)
    "mom":  dict(voice="af_heart", speed=1.10, pitch=1.0, expressive=True),
    "dad":  dict(voice="am_michael", speed=1.05, pitch=0.96, expressive=True),
}
LONG_GAPS = {"hook": 0.12, "money": 0.12, "mom1": 0.2, "dad1": 0.2, "wash": 0.25, "both": 0.45, "mail": 0.5}
TAIL = 1.2
LEAD = 0.0
