# Blockheads cast v2

A full upgrade of the Blockheads character system: a v2 builder, a redesign of all 22 original characters, 15 new characters, and a character studio viewer. Everything stays original, built in code, with no game assets.

| Path | What it is |
|---|---|
| `src/builder.js` | v2 builder engine: geometry, fabrics, hair, faces, props, animation |
| `src/cast.js` | The cast specs (37 characters) |
| `dist/builder.js` | **Drop-in replacement for `render/builder.js`**: builder + cast in one file |
| `dist/studio.html` | The Character Studio viewer, as a single file |
| `dist/cast.json` | All specs as plain JSON |
| `dist/contact_sheet.png`, `dist/expressions.png` | QA renders |
| `backup/` | Untouched v1: `cast_v1.json`, `builder_v1.js`, `cast_viewer_v1.html` |
| `tools/` | Build, tests and QA renders (headless Chromium + SwiftShader) |

## Name changes

| Before | After | Notes |
|---|---|---|
| Leo (narrator) | **Zash** | id stays `leo`; `zash` works as an alias via `BH.castById('zash')` |
| none | **Somi** (`somi`) | The girl Zash likes |
| none | **Liza** (`liza`) | Zash's cousin |
| none | **Tobi** (`tobi`) | Zash's best friend |

Bios that mentioned "Leo" now say "Zash", and Mom/Dad's roles read "Zash's Mom/Dad". Episodes 1–10 were written and rendered with "Leo". If a script ever says the name out loud, only new episodes will say "Zash".

## Installing in the Reel pipeline

1. Back up `/home/claude/clip/render/builder.js`.
2. Copy `dist/builder.js` over it. It defines the same globals as v1 (`CAST`, `EXPR`, `buildChar`, `faceTexture`, `torsoTextures`, `limbTexture`, `MAT`, `TM`, `box`, `shade`, `cv`, `tex`, `rng`, `lights`, …) and keeps the same load order.
3. Render a test with `python3 render_ep.py 12 1.5,10,30` and compare it with an older frame.

The compatibility contract:
- Same ids, same order.
- Same `root.userData.P` parts (`root torso head headMesh armL armR legL legR baseArm pose`).
- Same pivots: arms `(±1.5,4,0)`, legs `(±0.5,2,0)`, head group at y=4.
- Same height (about 5.5 units), and faces still swap through `headMesh.material[0].map`.

Shot code that poses limbs directly keeps working. Coat tails, skirts and aprons follow the legs automatically at render time.

Switches, set before building:
- `BH.legacyFaces = true`: paints exact v1 faces. Use this if an already-rendered episode must be re-rendered with an identical look.
- `BH.detail = 0`: no bump maps and cheaper rounding, for faster renders.
- `BH.Q = 1`: a smaller face texture (default 1.5).

Optional new API:
- `BH.animate(P, t, {motion:'idle'|'walk'|'talk'|'wave', expr})`: blended motions (0.35 s cross-fade), automatic blinking and a talking mouth.
- `P.setFace(expr, {blink, mouthOpen})`: cached face swaps.

## What changed in the builder

- **Body:** rounded blocks with smooth normals, separate hands with thumbs, ears, a neck, cuffs, and real shoes (sneaker, boot, dress, heel, flat, bare).
- **Clothing:** procedural fabrics with bump maps (denim, knit, fleece, wool, tweed, leather, satin, nylon, canvas). Jackets are a separate layered shell over the shirt, with lapels, buttons, zips, pockets, stitching and folds. Long coats get tails that move with the legs. Hoods, collars, drawstrings, and pleated skirts or dresses.
- **Hair:** sculpted locks with a strand texture. 19 styles: messy, spiky, swept, slick, bun, ponytail, high pony, bob, long, wavy, curly, afro, frizzy, space buns, braids, undercut, flattop, buzz, sides.
- **Faces:** iris eyes with highlights and lids, tapered brows, noses, mouths with teeth and tongue, lips, lashes and eyeliner. Also age lines, freckles, scars, an eyepatch, moles and braces. Glasses and shades are 3D.
- **Expressions:** the same six (default, happy, sad, shocked, angry, smug), now stronger. Lids narrow, brows tilt, sad adds tears, shocked adds a sweat drop, angry adds an anger mark.
- **Props:** about 40 extras, including headphones, goggles, a clipboard, camera, wrench, lantern, handbag, pearls, dog tags, radio, lanyard, mug, apron, ball, cane, phone and laptop.

## Identity fixes

- **Mia:** her spec had long hair, but the cast doc says ponytail. She now has a ponytail.
- **Nova:** her spec had long hair, but the cast doc says bob. She now has a black bob.
- **Mom:** kept long hair, which is what aired in Ep 2, even though the cast doc says bun.

## Tests

`npm i three@0.128.0`, then:
```
node tools/test.mjs          # 37 chars × 6 expressions × 4 motions, v1-spec compatibility, legacy faces, timing
node tools/contact.mjs       # dist/contact_sheet.png (add "" default out.png back for back views)
node tools/expressions.mjs   # dist/expressions.png
node tools/build.mjs         # regenerate dist/
```
Measured in SwiftShader, with four characters at 540×960:

| | Triangles | Time per frame |
|---|---|---|
| v1 | about 2.7k | about 5 ms |
| v2 | about 26k | about 17 ms |

## Spec reference (all v2 fields optional)

- `hair`: `{style, color, tip, tie, bangs, part, shine}`
- `hat.style`: `fedora captain police beanie backcap snapback chef beret hood bucket headband bandana`
- `face`:
  - `eyes`: `dot big tired sharp happy wink closed shades`
  - `eyeColor`
  - `brows`: `normal thick arched flat bushy angry sad raised none`
  - `mouth`: `smile grin teeth flat frown smirk o gritted`
  - `nose`: `button round long pointy wide none`
  - Other features: `lips lashes liner shadow blush freckles age(mid|old) mole scar eyepatch braces dirt beard beardColor glasses glassColor mask bandage`
- `torso`:
  - `inner fabric pattern(check|stripes|pinstripe|floral|dots|camo) graphic{shape:star|bolt|heart|number|text|circuit|circle|wave, text, color, outline}`
  - `collar buttons pocket pens tie{style:normal|thin|bow} trim stripe badge patch{text} zipper stains brooch belt strap ruffle stetho chain torn`
- `torso.outer.style`:
  - `hoodie overalls open leather cardigan labcoat suit tweed waistcoat coat2 trench chef bomber varsity track ziphoodie fieldjacket puffer cloak`
  - Extra options: `{color, fabric, btn, trim, stripe, length:'long'}`
- `sleeves`: `{color, len:full|short|rolled|three|none, cuff, fabric, stripe}`
- `pants`:
  - `{color, style:skirt|dress|shorts|capri|torn, fabric, jeans, cargo, stripe, ripped, kneepads, stains, rolled, socks, sockStripe, tights, pleats}`
  - Shoes: `shoes, shoeStyle:sneaker|boot|dress|heel|flat|bare, sole, laces, accent`
- `extras`: `fur earrings hoops bow scarf briefcase duffel keys books backpack watch wristwatch headphones headset goggles clipboard notepad camera wrench lantern handbag medal medals pearls necklace dogtags radio gloves headshades wristband lanyard pocketsquare earpiece mug apron bandana map ball cane ring phone laptop whistle spoon` (most take `:#color`)
