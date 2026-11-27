# Body Glitch: why the channel stalled, and the format that fixes it

Analysis date: 20 Nov 2026. Data: YouTube Analytics API (1–20 Nov) for @bodyglitchx, 23 Shorts.

## What the numbers say

| Signal | Body Glitch | What it means |
|---|---|---|
| Views per Short | 1,000–1,450 on almost every upload (best: 2,941) | Every Short gets YouTube's first test batch, then stops. None "graduate" to a wider audience. |
| Engaged views ÷ views ("stayed to watch") | **~50%** (range 47–67%) | Half of viewers swipe away in the first second. Creator benchmarks put healthy Shorts at 70%+ ([vidIQ](https://vidiq.com/blog/post/youtube-shorts-algorithm/), [1of10](https://1of10.com/blog/youtube-shorts-analytics/)). **This is the main cause.** |
| Retention of those who stay | 55–108% average view percentage | The animation and stories are fine once someone is watching. |
| Story Shorts (e.g. Phineas Gage) | Watch ratio falls from 1.43 → 0.70 in the first 30%; relative retention **0.33** (bottom third vs similar Shorts) at the 5–12 s mark | The "In 1848, a man named…" exposition right after the hook loses people. |
| Best Short ("How long can you live without each organ") | Watch ratio stays ~1.0 to the end, relative retention 0.65–0.91, 108% AVP | A list with a new payoff every few seconds keeps people watching and rewatching. |
| Likes / comments / shares | ~2% likes, ~0 comments, ~0 shares | Nothing gives viewers a reason to comment or share. |
| Traffic | 93% Shorts feed, 5% search, 70% US viewers | It all depends on the feed; the audience is good (US). |
| Daily views | Peaked 13 Nov (3.9k), falling to ~1.2k/day while uploads went to 2–3/day | More uploads didn't add reach; each one got the same small batch. |

## Root causes

1. **Weak first second.** Every Short opens on the same wide shot of the orange studio with two characters standing. In the feed it looks like the last one, and nothing happens in frame 1 to stop the thumb.
2. **Exposition after the hook.** Names, years and setup in seconds 4–12 drop retention to the bottom third.
3. **Passive viewing.** No reason to comment, share or rewatch.
4. **Too many uploads.** 2–3 a day split attention without adding reach.

## The new format (apply to every Short)

1. **Frame 1 is the payoff.** Start on an extreme close-up of the most surprising visual, already moving, with a 2–4 word red text hook (e.g. "DO THIS RIGHT NOW 👇"). No wide studio shot in the first 3 seconds.
2. **Talk to the viewer.** Prefer topics the viewer can test on themselves or guess (body checks, "can you…", "which…"). The first line is an instruction or a question, not a story.
3. **A new visual every 2–3 seconds.** One fact per line. Lists and countdowns beat single stories.
4. **At most one line of setup** (names, years), and never before the first payoff.
5. **20–25 seconds.** Cut every line that doesn't add a new payoff.
6. **End on a comment question** with ✅ / ❌ options on screen, phrased so it loops back into the hook.
7. **One Short a day** at 8 PM IST. Don't stack extra uploads.
8. **Title** = the question or check ("Do You Have This Muscle? 💪"), with the comment prompt repeated in the description.

## How to judge a new Short (after 48 h)

- Stayed to watch (engagedViews ÷ views) **≥ 65%** → the hook works; make more like it.
- Below 55% → the first second failed; change the opening, not the topic.
- Views above 3,000 → it graduated; follow up on the same topic within 3 days.

First Short in the new format: "Do You Have This Muscle?" (palmaris longus, `examples/tendon-*`).

## Character rules (added 21 Nov)

- **Show the real Blip.** Every Short starts or ends with Blip as the little creature (the `blip` form). Don't begin the plan with him already human (`{ t: -5, form: 'human' }` hides him for the whole video).
- **Show the transformation.** Use the normal Shifter charge (glow-up, flash, ring, sparks). Don't pass `flashK` or a tiny `charge`, which made changes invisible. To avoid white-outs, scale `blip.light.intensity` down (~0.45×) and transform in medium or wide shots, not in extreme close-ups.
- **The human form has a human head:** hair, ears and a nose, with no antenna (see `src/core/shift.js`, `FORMS.human`).
- **Give every Short a twist:** a "But here's the twist…" reveal near the end, before the comment question.

## Check-in: 24 Nov (27 Shorts, 38.4k views, 46 subscribers)

| Signal | Old format | New format (tendon, glow, ears, tickle) | Verdict |
|---|---|---|---|
| Views per Short | 1,000–1,450 | 1,000–2,000 ("Do You Have This Muscle?": 1,990, best since the 7 Nov organ video) | Slightly better; still capped at YouTube's first test batch |
| Stayed to watch (engaged ÷ views) | ~50% | ~54% | **Still the bottleneck**: about half swipe away in the first second |
| Stayed to watch on phones only | — | 48% (TV 73%, tablet 53%) | The feed on phones is where the first frame loses people |
| Comments | ~0–2 per Short | 6 on the tendon Short ("I have 2", "I only have 1", "I don't have") | **Participation questions work**; keep them |
| Average view percentage | 55–108% | 79–108% | People who stay watch it all; content is fine |
| Subscriber conversion | | 46 subs / 38k views = 0.12% | Very low; no reason given to follow |
| Audience | | 70% US; ages 13–17 at 28%, 25–44 at 51% | |

What viewers say: "Pet is cute", "The blue guy name is 'bilp'". **Viewers notice and like Blip.**

### Changes from now on
1. **Frame 1 = Blip doing something already.** He's mid-transformation, or the payoff is already happening. Never a static studio shot, never Blip just bouncing. The tickle Short starts with a flash at 0.4 s; use that as the template.
2. **Faster voice energy:** `speed` 1.15, and try `am_puck` (lively) for the next three Shorts against `am_michael`. Compare stayed-to-watch between the two.
3. **Shorter:** aim for 18–24 s.
4. **Follow line:** the last caption pill shows "FOLLOW FOR DAILY GLITCHES 💙" for the final 1.5 s, small, under the ✅/❌ question.
5. **Reply to comments** on each new Short within 24 h, as the channel, short and friendly (done for the tendon and ears Shorts on 24 Nov).
6. **Post at 7:30 AM IST.** Evening uploads have been blocked by Zapier every night since 21 Nov, while morning uploads work. 7:30 AM IST is also 9 PM in New York, US prime time.

## 25 Nov: high-stakes direction (the user asked for more views)

The gentler "try this" hooks raised comments but not the stay-to-watch rate (still ~50%). The best performer remains the organ countdown (2,956 views). So:
- **Stakes first.** Open on life or death, extreme numbers or real records ("You can survive 3 minutes without air…"), not a mild prompt.
- **Dark, dramatic first second:** dark stage, coloured vignette (red/blue/orange), a huge on-screen number or timer that moves.
- **Fast list or countdown** in the first 5 s (a new number every ~1.2 s), then the twist, a real person or record with a big counter.
- **Visual payoff the viewer can see change** (e.g. a body slimming as the day counter runs).
- Keep: Blip transformations, the "🤯 THE TWIST" card, the ✅/❌ or "how long could you last?" question, the follow line, a safety pill when relevant.
- First Short in this style: "The Man Who Didn't Eat for 382 Days" (`examples/survive-*`).

## 27 Nov: why every Short stops at ~2k views, and the pivot

**Data:** every Short gets ~1–3k views. Stayed-to-watch is still ~50% (48% on phones). Comments have gone up, but reach hasn't. YouTube shows each Short to a first test batch; when half of that batch swipes away in the first second, the Short never gets shown to more people.

**What gets millions in our niche** (body Shorts since September, from free YouTube search):

| Short | Views | What it shows |
|---|---|---|
| 5 foods for your arteries | 89.1M | Realistic camera inside an artery, 31 s |
| Kidney transplant | 20.3M | Real surgery, step by step in 3D |
| ACL replacement | 13.3M | Real surgery in 3D |
| Pea plant grew in a man's lung | 7.7M | Real case, inside the body |
| Brain surgery without opening the head | 6.8M | Real procedure |

**Pattern:** a realistic inside-the-body view from frame 1, plus a **real medical procedure or real case** that adults care about, at 30–60 s. Our cartoon studio opener reads as kids' content, so adults swipe away.

**New direction:**
1. Open inside the body (artery, lung, stomach, bone), with realistic colour and lighting, already moving, plus a big red stakes number ("90% BLOCKED").
2. Topic = a real procedure or real case: "how doctors fix X without cutting you open", transplants, bizarre ER cases.
3. Blip and the host only appear in a short cut-away (the transformation and the twist), never as the opener.
4. Keep the twist card, the ✅/❌ question and the follow line.
5. Judge after 48 h: stayed-to-watch ≥ 65% means more like it.

First Short in this style: "How Doctors Unblock Your Heart Without Opening Your Chest" (`examples/artery-*`).

## Voice: ElevenLabs from 28 Nov

- **Voice:** ElevenLabs "Liam – Energetic, Social Media Creator" (`TX3LPaxmHKxFdv7VOQHJ`, young American, made for Shorts), model `eleven_v4`.
- **Budget:** the account is on the free tier (10,000 characters a month, shared with other projects). Body Glitch gets at most 1,800 a month.
  - Generate the whole script in one take, `generations_count` 1, and never re-run.
  - Check `account_get_usage` before and after each Short.
- **Fallback:** Kokoro (am_puck / am_michael) when the budget is short.
- **Judge it:** compare stayed-to-watch on the ElevenLabs Shorts with the Kokoro ones after 48 h.
