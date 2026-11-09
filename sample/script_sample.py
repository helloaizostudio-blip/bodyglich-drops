"""Sample episode: "Midnight Lights" (new format teaser, ~40 s).

Beats (compressed version of the 6-beat structure):
  1 rule + threat   2 how the town adapted   3 Zash's stake   4 "until last Friday"
  5 tense set piece  6 warm payoff + twist

Each line: (id, speaker, tag, text, shots). Shots split the line's duration (1-2 s each).
Speaker 'zash' = narrator voice (voice lab option 6), 'liza' = Liza's voice.
Words wrapped in *stars* get the red danger caption.
"""
TITLE = "Midnight Lights"

LINES = [
    ("rule",   "zash", "calm",    "In my town, at *midnight*, every streetlight turns off.",       ["drone_on", "street_low", "lights_off"]),
    ("rule2",  "zash", "tense",   "And nobody goes outside until they come back on.",               ["door_lock", "window_dark"]),
    ("adapt1", "zash", "calm",    "So we adapted. Every house has a glowing HOME sign.",           ["home_sign", "home_row"]),
    ("adapt2", "zash", "calm",    "Shops sell flashlights by the dozen.",                           ["shop"]),
    ("adapt3", "zash", "tense",   "And at eleven fifty nine, the whole city runs home.",            ["clock_1159", "crowd_run", "crowd_low"]),
    ("me",     "zash", "calm",    "I'm Zash. I have never been late. Not once.",                    ["zash_intro", "zash_smug"]),
    ("until",  "zash", "tense",   "Until last Friday.",                                             ["clock_1200"]),
    ("liza",   "zash", "whisper", "The lights went out, and my cousin Liza wasn't home.",           ["lights_off2", "empty_room"]),
    ("run",    "zash", "tense",   "I grabbed the flashlight and ran.",                              ["grab", "run_street"]),
    ("figure", "zash", "whisper", "*Something* was standing under the dead streetlight.",           ["figure_wide", "figure_close"]),
    ("turn",   "zash", "tense",   "It turned around.",                                              ["zash_eyes"]),
    ("reveal", "zash", "calm",    "It was Liza. Holding a jar full of fireflies.",                  ["reveal", "jar_close"]),
    ("q",      "liza", "excited", "Relax! I made my own streetlight.",                             ["liza_talk"]),
    ("hug",    "zash", "sad",     "I hugged her so hard the jar almost broke.",                     ["hug"]),
    ("pause1", None,   "pause",   None,                                                             []),
    ("twist",  "zash", "whisper", "Then the lights came back on. Two minutes *early*.",             ["lights_on", "clock_1201"]),
    ("twist2", "zash", "calm",    "Somebody else was out tonight.",                                 ["shadow_end"]),
]

VOICES = {
    "zash": dict(voice="am_liam", speed=1.12, pitch=1.40, expressive=True),
    "liza": dict(voice="af_sky", speed=1.10, pitch=1.16, expressive=True),
}
