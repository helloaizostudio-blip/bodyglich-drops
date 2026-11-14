# Episode: "Midnight Lights" (full version, about 80 s)

In Zash's town, the streetlights go off at midnight and the Dark comes out. Liza sneaks out with a jar of fireflies. Zash finds her, smacks her on the head, and asks why she's outside. Then the Dark comes for them: they run hand in hand, the flashlight dies, and nobody opens their door. Zash remembers the rule that the Dark can't touch light, opens the jar, and the cloud of fireflies stops it. Dad is waiting at the door with every flashlight in the house. Then the twist: the lights come back two minutes early, and something under a streetlight is holding Liza's jar. The tag: "Can we go get it back?" "No."

One command builds it end to end:

```
BH_KOKORO_DIR=/path/to/kokoro python3 sample/make_sample.py all
# or one stage at a time: voice | render | audio | encode | qa
```

| Stage | What it does |
|---|---|
| voice | Kokoro voice lab option 6 (`am_liam`, speed 1.12, pitch ×1.40, emotion tags) for Zash, and `af_sky` ×1.16 for Liza. It writes `out/voice_raw.wav` and `out/timeline.json`, which holds the lines, word timings, the shot list, and per-frame mouth envelopes for lip-sync. |
| render | `render_sample.mjs` × `BH_WORKERS` headless Chromium workers draw `scene_sample.js` (three r128 + `blockheads-cast/dist/builder.js`) into `out/frames/*.jpg` at 1080×1920, 30 fps. Re-running only renders missing frames. |
| audio | `audio_sample.py` mixes the music (pad, pulse, riser), the SFX (whooshes, power down/up, bolts, clock, bell, footsteps, heartbeat, fireflies, sting) and the mastered voice. The music ducks about 7 dB under the voice, and the mix is normalised to −14 LUFS. |
| encode | x264 CRF 18 + AAC 192k produces `out/blockheads_midnight_lights_full.mp4`. |
| qa | Writes `out/QA.md`: ffprobe info, loudness, shot lengths, caption words, a black-frame check, and `out/contact_sheet.jpg` with one frame per shot. |

Files:
- **Script:** `script_sample.py`. Each line has an emotion tag and a shot list, and `*word*` makes that caption word red.
- **Shots:** the `SHOTS` table in `scene_sample.js`. Each shot is a small function of its progress, and cuts land on word starts.
- **Captions:** one word at a time in Luckiest Guy, white with a thick dark outline and a soft shadow, placed at 42 % of the frame height. Each word pops 1.0 → 1.08 → 1.0 over 80 ms.

Known limits of this sample:
- Word timings come from syllable weighting snapped to the gaps between words, not forced alignment. Whisper isn't installed.
- It renders on the CPU (SwiftShader) at about 1 frame per second with 3 workers.
