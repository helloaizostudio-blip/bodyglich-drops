"""Episode: "Midnight Lights" (full version, ~2 min).

Beats:
  1 rule + threat ........ lights go off at midnight, the Dark comes out
  2 how the town adapted . HOME signs, flashlight shops, the 11:59 run
  3 Zash's stake ......... never late, until Liza goes missing
  4 "until last Friday" .. the figure under the dead streetlight is Liza
  5 set piece ............ the Dark comes for them; flashlight dies; nobody opens doors;
                           solved with the rule's own logic: the Dark can't touch light -> the firefly jar
  6 payoff + twist ....... Dad at the door, family hug; lights come back early and
                           something under the streetlight is holding Liza's jar. Tag: "Can we get it back?" "No."

Each line: (id, speaker, tag, text, shots). Shots split the line's duration (about 1-2 s each).
Words in *stars* get the red danger caption.
"""
TITLE = "Midnight Lights"

LINES = [
    ("rule",   "zash", "calm",    "In my town, at *midnight*, every streetlight turns off.",               ["drone_on", "street_low", "lights_off"]),
    ("dark0",  "zash", "tense",   "Because when the lights go out, the *Dark* comes out.",                  ["alley_tease", "dark_eyes_tease"]),
    ("rule2",  "zash", "tense",   "So nobody goes outside until they come back on.",                        ["door_lock", "window_dark"]),
    ("adapt1", "zash", "calm",    "Every house has a glowing HOME sign. The Dark can't touch light.",      ["home_sign", "home_row"]),
    ("adapt2", "zash", "calm",    "Shops sell flashlights by the dozen.",                                   ["shop"]),
    ("adapt3", "zash", "tense",   "And at eleven fifty nine, the whole city runs home.",                    ["clock_1159", "crowd_run", "crowd_low"]),
    ("me",     "zash", "calm",    "I'm Zash. I have never been late. Not once.",                            ["zash_intro", "zash_smug"]),
    ("until",  "zash", "tense",   "Until last Friday.",                                                     ["clock_1200"]),
    ("liza",   "zash", "whisper", "The lights went out, and my cousin Liza wasn't home.",                   ["lights_off2", "empty_room"]),
    ("run",    "zash", "tense",   "I grabbed the flashlight and ran.",                                      ["grab", "run_street"]),
    ("figure", "zash", "whisper", "*Something* was standing under the dead streetlight.",                   ["figure_wide", "figure_close"]),
    ("turn",   "zash", "tense",   "It turned around.",                                                      ["zash_eyes"]),
    ("reveal", "zash", "calm",    "It was Liza. Holding a jar full of fireflies.",                          ["reveal", "jar_close"]),
    ("q",      "liza", "excited", "Relax! I made my own streetlight.",                                     ["liza_talk"]),
    ("smack",  "zash", "calm",    "So I smacked her on the head.",                                          ["smack"]),
    ("why",    "zash", "excited", "Why are you outside?!",                                                  ["zash_yell"]),
    ("see",    "liza", "excited", "I just wanted to see the Dark! Nobody has ever seen it.",               ["liza_shrug", "liza_shrug2"]),
    ("flick",  "zash", "whisper", "Then her jar flickered.",                                                ["jar_flicker"]),
    ("dark1",  "zash", "tense",   "At the end of the street, the *darkness* started moving.",              ["dark_far", "dark_swallow"]),
    ("dark2",  "zash", "tense",   "And it was coming straight for us.",                                     ["dark_close", "kids_turn"]),
    ("grabh",  "zash", "excited", "I grabbed her hand, and we ran.",                                        ["grab_hand", "run_two"]),
    ("die",    "zash", "tense",   "My flashlight flickered. And *died*.",                                   ["flash_flicker", "flash_dead"]),
    ("faster", "liza", "excited", "Zash! It's faster than us!",                                             ["run_back"]),
    ("bang",   "zash", "tense",   "We banged on every door. But nobody opens after midnight.",             ["door_bang", "curtain_close"]),
    ("rulethk","zash", "calm",    "Then I remembered the rule. The Dark can't touch light.",               ["zash_think", "dark_near"]),
    ("onelight","zash","whisper", "And we had exactly one light left.",                                     ["jar_hold"]),
    ("open",   "zash", "excited", "I opened the jar.",                                                      ["jar_open"]),
    ("burst",  "zash", "excited", "Fireflies everywhere. A cloud of light. And the Dark stopped.",         ["firefly_burst", "firefly_wide", "dark_stop"]),
    ("home",   "zash", "tense",   "We ran the last block without breathing.",                               ["run_home"]),
    ("dad",    "zash", "calm",    "Dad was at the door, holding every flashlight in the house.",           ["dad_door", "dad_close"]),
    ("hug",    "zash", "sad",     "He didn't yell. He just hugged us. Really tight.",                       ["family_hug"]),
    ("pause1", None,   "pause",   None,                                                                     []),
    ("twist",  "zash", "whisper", "Then the lights came back on. Two minutes *early*.",                     ["lights_on", "clock_1201"]),
    ("twist2", "zash", "tense",   "And under the streetlight, something was holding Liza's jar.",          ["shadow_far", "shadow_jar"]),
    ("tag1",   "liza", "calm",    "Can we go get it back?",                                                 ["window_tag"]),
    ("tag2",   "zash", "calm",    "No.",                                                                    ["zash_no"]),
]

VOICES = {
    "zash": dict(voice="am_liam", speed=1.12, pitch=1.40, expressive=True),
    "liza": dict(voice="af_sky", speed=1.10, pitch=1.16, expressive=True),
}
# lines followed by a longer beat (seconds); everything else gets a tight 0.12 s gap
LONG_GAPS = {"until": 0.42, "turn": 0.42, "figure": 0.4, "q": 0.3, "smack": 0.35, "flick": 0.4, "die": 0.35, "onelight": 0.45,
             "open": 0.3, "hug": 0.5, "twist2": 0.7, "tag1": 0.55}
TAIL = 2.6   # seconds after the last line (end card)
