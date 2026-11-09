// Renders frames of the sample episode: node render_sample.mjs <frameList> <W> <H>
// frameList = "0,1,2" ; output dir = $BH_FRAMES or sample/out/frames
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url); let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node-tools/node_modules/playwright'); }
const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '..');
const frames = process.argv[2].split(',').filter(Boolean).map(Number), W = +process.argv[3] || 1080, H = +process.argv[4] || 1920;
const outDir = process.env.BH_FRAMES || path.join(here, 'out/frames'); fs.mkdirSync(outDir, { recursive: true });
const three = [process.env.THREE_JS, path.join(root, 'blockheads-cast/node_modules/three/build/three.min.js')].find(p => p && fs.existsSync(p));
const tl = JSON.parse(fs.readFileSync(path.join(here, 'out/timeline.json'), 'utf8'));
const font = 'data:font/ttf;base64,' + fs.readFileSync(path.join(here, 'assets/LuckiestGuy.ttf')).toString('base64');
const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
page.on('pageerror', e => { console.error('PAGE ERROR', e); process.exitCode = 1; });
page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
await page.setContent('<!doctype html><html><body></body></html>');
for (const p of [three, path.join(root, 'blockheads-cast/dist/builder.js'), path.join(here, 'scene_sample.js')]) await page.addScriptTag({ path: p });
await page.evaluate(async ([tl, W, H, font]) => { await SAMPLE.init(tl, W, H, font); }, [tl, W, H, font]);
const t0 = Date.now(); let n = 0;
for (const f of frames) {
  const url = await page.evaluate(f => SAMPLE.frame(f), f);
  fs.writeFileSync(path.join(outDir, String(f).padStart(4, '0') + '.jpg'), Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
  if (++n % 50 === 0) console.log(`worker: ${n}/${frames.length} frames, ${((Date.now() - t0) / n).toFixed(0)} ms/frame`);
}
console.log(`worker done: ${n} frames, ${((Date.now() - t0) / Math.max(1, n)).toFixed(0)} ms/frame`);
await browser.close();
