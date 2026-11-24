# GTA 6 clipping autopilot: runbook for one scheduled run

The owner set this up on purpose: every run finds fresh viral moments from big GTA 6 streamers on Twitch,
cuts vertical Shorts and posts **one new Short to each channel** in `autopilot/channels.json` through
the owner's Zapier YouTube connections. The owner submits paid-campaign links in Content Rewards
themselves. Follow every step; when unsure, skip the clip rather than post something risky.

## 0. Get the tools (about 5 minutes)
```
cd <repo root>
git fetch origin ccr-5b710d78-d8tir0
git checkout FETCH_HEAD -- .claude/skills/stream-clips autopilot
mkdir -p ~/.claude/skills && cp -r .claude/skills/stream-clips ~/.claude/skills/
python3 ~/.claude/skills/stream-clips/scripts/streamclips.py setup      # wait for READY
```
Only Twitch works from the cloud (YouTube blocks cloud downloads). Twitch audio and clip video are
fetched segment by segment by the skill, so this is normal.

## 0b. Pending clips first
Read `autopilot/pending.json` (from the branch). Those clips are already cut and sit in `uploads/` on branch
ccr-5b710d78-d8tir0; their raw URL is `https://raw.githubusercontent.com/helloaizostudio-blip/bodyglich-drops/ccr-5b710d78-d8tir0/<file>`.
Post them (same upload steps as section 4, using the stored title/description/tags). A channel with a pending clip
gets that clip this run instead of a new one.

## 1. What each channel already has (free, no Zapier tasks)
For every channel in `autopilot/channels.json`, read its public feed:
`curl -s "https://www.youtube.com/feeds/videos.xml?channel_id=<channel_id>"`
Each Short's description contains a line `Source: <creator> on Twitch, VOD <vod_id> at <h:mm:ss>`.
Collect those (vod_id, seconds) pairs: never clip within 2 minutes of one of them again.
Also treat every section in `autopilot/state.json` → `covered` as already clipped (those were cut before
the autopilot existed).
Skip a channel that already got a Short in the last 20 hours.

## 2. Find footage for each channel's creator
`yt-dlp --flat-playlist --playlist-end 6 --print "%(id)s|%(duration)s|%(title)s" "https://www.twitch.tv/<twitch>/videos?filter=archives&sort=time"`
(use `~/.streamclips/venv/bin/yt-dlp`). Use the newest broadcast whose title mentions GTA (GTA 6 / GTA VI /
GTAVI). If none, skip that channel this run. Pick a 2-hour `--section` that has not been clipped yet
(after the first 20 minutes, which are usually waiting screens). For streams that are still live,
choose a section that ended at least 1 hour ago.

## 3. Cut
```
python3 ~/.claude/skills/stream-clips/scripts/streamclips.py clip https://www.twitch.tv/videos/<vod_id> \
  --topic "GTA 6" --campaign <campaign> --section "<h:mm:ss>-<h:mm:ss>" --clips 2 --language en --brain agent
```
It stops with exit code 3 and lists `part_*.prompt.txt` files. Answer each (you or subagents in parallel):
read it, write only the JSON array to the matching `.answer.json`. Rules on top of the prompt:
- The creator's own reaction must be the point of the clip; titles say exactly what happened and name him.
- Never: nudity or sexual moments, drug or cocaine missions, slurs (also not right before/after the clip),
  real-world violence talk, donation/sub reading, anything that makes the creator look bad, drama framing.
- Be strict: score 60+ only for clips that hook in the first 2 seconds.
Run the exact same command again to cut. Then look at every `checks/*.jpg`: the creator's face must be
visible (corner box or crop), captions inside the frame, title correct. Drop any clip that fails. The 3-frame check images can miss blurry stretches (some streams blur the screen during loading or spoilers), so also sample a frame every 2 seconds of the gameplay area (rows 30%-85%) with OpenCV Laplacian variance: if the first seconds are blurry, trim them off with ffmpeg (-ss); if a blurry stretch sits in the middle, drop the clip.
Every clip gets a quiet synthesized background beat (copyright-free, ducks under speech; preset `bg_music`). For clips cut before that, run `python3 ~/.claude/skills/stream-clips/scripts/add_music.py <clips>`.
Each pick should carry 1-3 meme sound effects in its `sfx` list (boom, scratch, airhorn, whoosh, ding, bonk, boing, dundun, sadtrombone, riser) timed on the punchline/reaction; they are synthesized (copyright-free) and mixed in automatically. For an already-cut clip: `~/.streamclips/venv/bin/python ~/.claude/skills/stream-clips/scripts/add_sfx.py --words clip.mp4` to get word times, then `... add_sfx.py clip.mp4 "boom@8.8,scratch@16.3"`.
Campaign `kreekcraft-gta6` must show the KreekCraft logo the whole time (the preset adds it).

## 4. Post (one Short per channel per run)
**Order matters:** cut and check every clip first. Post the channels with `paid: false` first, then the
`paid: true` channels last, back to back, and send the report (step 6) straight away. The owner has to
submit paid links in Content Rewards within 30 minutes of posting, and the report is how they find out.
Pick the best remaining clip for the channel. Host it briefly in this public repo (the owner approved this):
copy it to `uploads/<short-name>.mp4`, `git add -f`, commit, push to **your session branch**, and check
`https://raw.githubusercontent.com/helloaizostudio-blip/bodyglich-drops/<your-branch>/uploads/<short-name>.mp4` returns 200.
Then Zapier → YouTube "Upload Video" (`upload_video`) with `connection_id` = the channel's `zapier_connection`:
- title: the clip title + ` #Shorts` (max 100 characters)
- description: the caption and hashtags from POSTING.md, then a blank line, then
  `Source: <creator> on Twitch, VOD <vod_id> at <h:mm:ss>` (clip start), then `#Shorts`
- tags: creator name, GTA6, GTA 6, Grand Theft Auto VI, Shorts; privacy_status public; made_for_kids false;
  default_language en; default_audio_language en
Then Zapier "Make API Mutating Request": PUT `https://www.googleapis.com/youtube/v3/videos?part=snippet,paidProductPlacementDetails`
with the same title/description/tags, `categoryId` "20", and `paidProductPlacementDetails.hasPaidProductPlacement`
= the channel's `paid` value. When every upload is done: `git rm -r uploads`, commit, push.

## 5. Limits
- **Daily cap: Zapier allows only about 4-5 uploads per day in total** (more get "throttled without retry" for many hours). **At most 4 uploads per run** (Zapier/YouTube stops new channels after about 5 a day). Always include the 3 `paid: true` channels; fill the other 2 slots with pending clips first, then the non-paid channels that went longest without a Short. Channels left out wait for the next run.
- Zapier throttles bursts of uploads ("throttled without retry"). Upload one Short at a time, wait 5 minutes between uploads, and on a throttle error wait 30 minutes, then 60, before retrying. Keep the clip in uploads/ until its upload succeeded.
- At most 1 Short per channel per run, and stop posting if Zapier reports the task limit.
- Never post the same clip to two channels.
- If a step fails for a channel, skip that channel and continue with the others.

## 6. Report (last message, right after the paid posts)
Start with "SUBMIT NOW (30-min window):" and the paid links, one per line with its campaign name. Then a table: channel, creator, Short title, link, paid yes/no. Under it: "Submit these in Content
Rewards: ..." listing only links for channels with `paid: true`, plus anything that went wrong.
