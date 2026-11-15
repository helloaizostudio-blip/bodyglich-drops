"""Episode 11: "My Mom Had One Day Left" (narrator Leo, ~60 s)

Hook = stakes in the first line ("My mom has one day left to live") with the red "1" floating over her head.
World rule: everyone sees a number over everyone else's head = days until they die. Two PLANTS: you can't change your
number, and you can't see your own. Comedy montage (the safest day ever), a ticking-clock climax at 11:59 (gas leak,
explosion), the win (her number jumps to 14,000), then the twist that pays off both plants: in the window reflection
Leo sees HIS number. It moved to him. Ends on PART 2.
"""
TITLE = "My Mom Had One Day Left"
SLUG = "ep11_one_day"

LINES = [
    ("cold",   "leo", "whisper", "My mom has one day left to *live*.",                                                        ["cold_mom"]),
    ("hook",   "leo", "tense",   "In my world, everyone has a number over their head. Days until they *die*.",                ["street_numbers", "number_close"]),
    ("gpa",    "leo", "calm",    "Grandpa has three thousand. He goes skydiving every *week*.",                               ["gpa_sky"]),
    ("max",    "leo", "calm",    "My little brother has seventy thousand. He's still scared of the *vacuum*.",                ["max_vacuum"]),
    ("rule",   "leo", "tense",   "Two rules. You can't change your number. And you can't see your *own*.",                    ["rule_card"]),
    ("morning","leo", "tense",   "This morning, Mom's number said *one*.",                                                    ["mom_kitchen", "mom_number"]),
    ("idea",   "leo", "calm",    "She had no idea. So I made it the safest day of her *life*.",                               ["leo_plan"]),
    ("safe",   "leo", "excited", "Helmet. Bubble wrap. No stairs. No *toast*.",                                               ["mom_helmet", "bubble_wrap", "no_stairs", "no_toast"]),
    ("fridge", "mom", "calm",    "Leo, why is the fridge *padded*?",                                                          ["fridge_padded"]),
    ("clock",  "leo", "tense",   "Eleven fifty nine. I thought we made it. Then I smelled *gas*.",                            ["clock_1159", "leo_smell"]),
    ("drag",   "leo", "excited", "I dragged her out the door. The kitchen *exploded*.",                                       ["drag_out", "explosion"]),
    ("lawn",   "leo", "calm",    "We hit the grass. I looked up. Her number said fourteen *thousand*.",                       ["lawn_lie", "number_flip"]),
    ("changed","leo", "excited", "I changed it. Nobody has *ever* changed it.",                                               ["leo_proud"]),
    ("mom2",   "mom", "sad",     "Leo, what's that over your *head*?",                                                        ["mom_stare"]),
    ("window", "leo", "whisper", "You can't see your own number. But in the window, I saw *mine*.",                           ["window_turn", "reflection_one"]),
]

VOICES = {
    "leo": dict(voice="am_echo", speed=1.22, pitch=1.28, expressive=True, resample=True, gain_db=2.5),   # user pick: option V ("6"), a little louder and faster
    "mom": dict(voice="af_heart", speed=1.05, pitch=1.0, expressive=True, smooth=True, gen_speed=1.0),
}
LONG_GAPS = {"cold": 0.3, "hook": 0.15, "max": 0.15, "rule": 0.25, "morning": 0.3, "safe": 0.15, "fridge": 0.25, "clock": 0.25, "drag": 0.3, "lawn": 0.3, "changed": 0.25, "mom2": 0.45}   # deliberate beats; everything else runs tight
TAIL = 2.0
LEAD = 0.0
