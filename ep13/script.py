"""Episode 13: "The Mirror Rule" (narrator Zash, horror). The user's script, near word for word.

In this town mirrors show your soul and the law says you look before leaving. One Tuesday the reflection stops
copying, stares at his throat, fogs the glass. At night it slams the glass mouthing RUN. He raises a hammer - and
sees it is looking at the hallway BEHIND him: a long pale hand covers his mouth. The reflection smashes out and
tackles the thing into the dark. Payoff: it lies in the biggest shard bleeding black ink; a bloody hand matches his.
"""
TITLE = "The Mirror Rule"
SLUG = "ep13_mirror_rule"

LINES = [
    ("hook",    "zash", "tense",   "In my town, mirrors don't show your reflection. They show your *soul*. And if yours blinks first, you're already *dead*.", ["mirror_eyes", "town_mirrors", "blink_cu"]),
    ("law",     "zash", "calm",    "Every house has a silver mirror by the front door. By law, you look into it before you *leave*.", ["hall_wide", "law_sign"]),
    ("gran",    "zash", "calm",    "Mine was my grandmother's. For sixteen years, it smiled when I smiled, and waved when I *waved*.", ["frame_cu", "smile_sync", "wave_sync"]),
    ("tues",    "zash", "whisper", "Until *Tuesday*.", ["tuesday_card"]),
    ("stare",   "zash", "tense",   "I tied my shoes, looked up, and smiled. My reflection didn't move. It just stared at my *throat*. Breathing heavy. Fogging up the glass from the *inside*.", ["tie_shoes", "smile_up", "stare_throat", "fog_glass"]),
    ("sheet",   "zash", "tense",   "Terrified, I threw a bedsheet over it, and taped the edges *shut*.", ["sheet_throw", "tape"]),
    ("night",   "zash", "whisper", "That night, I woke up to the sound of tearing *fabric*.", ["wake_up"]),
    ("run",     "zash", "tense",   "The sheet was on the floor. My reflection was slamming its palms on the glass, mouthing one word, over and over. *Run*.", ["sheet_floor", "palms_slam", "mouth_run"]),
    ("hammer",  "zash", "tense",   "I grabbed a hammer. Breaking a mirror means execution by morning. But I couldn't let it *out*.", ["grab_hammer", "enforcers", "hammer_cu"]),
    ("raise",   "zash", "tense",   "I raised the hammer over my *head*.", ["raise_hammer"]),
    ("eyes",    "zash", "whisper", "That's when I realized, my reflection wasn't looking at me. Its eyes were locked on the dark hallway *behind* me.", ["reflection_eyes", "dark_hall"]),
    ("hand",    "zash", "whisper", "Something cold breathed down my neck. And a long, pale hand slid over my *mouth*.", ["breath_neck", "pale_hand"]),
    ("smash",   "zash", "excited", "My reflection didn't run. It reared back, shattered the glass from the inside, and tackled the shadow into the *dark*!", ["rear_back", "shatter", "tackle"]),
    ("sirens",  "zash", "calm",    "When the sirens came, the hallway was empty. Just broken *glass*.", ["sirens_hall"]),
    ("shard",   "zash", "sad",     "In the largest shard, my reflection was lying still, bleeding black *ink*.", ["shard_cu"]),
    ("thanks",  "zash", "sad",     "I knelt, whispered thank you, and touched the glass. Slowly, a bloody hand reached up to match *mine*.", ["kneel", "hands_match"]),
    ("reveal",  "zash", "whisper", "It wasn't trying to escape. It was trying to get in, to *save* me.", ["glitch_face"]),
    ("cta",     "zash", "whisper", "Check your bathroom mirror tonight. If your reflection looks tired, leave a comment, so it knows you're *awake*.", ["bathroom_mirror"]),
]

VOICES = {
    "zash": dict(voice="am_echo", speed=1.21, pitch=1.28, expressive=True, resample=True, gain_db=2.0, polish=True, tag_amt=0.5),
}
LONG_GAPS = {"hook": 0.25, "gran": 0.2, "tues": 0.45, "stare": 0.2, "night": 0.2, "run": 0.3, "hammer": 0.15, "raise": 0.35, "eyes": 0.2, "hand": 0.3, "smash": 0.35, "shard": 0.2, "thanks": 0.4, "reveal": 0.3}
TAIL = 1.8
LEAD = 0.0
