// Headless test harness: loads three r128 + builder + cast in Chromium (SwiftShader WebGL).
import { createRequire } from 'module'; const require = createRequire(import.meta.url); let pw; try { pw = require('playwright'); } catch(e) { pw = require(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright'); } const { chromium } = pw;
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)); const root = path.resolve(here, '..');
export function threePath(){
  const c=[process.env.THREE_JS, path.join(root,'node_modules/three/build/three.min.js'), '/home/claude/clip/render/node_modules/three/build/three.min.js']
    .concat((process.env.THREE_SEARCH||'').split(':').filter(Boolean).map(p=>path.join(p,'three/build/three.min.js')));
  for(const p of c) if(p && fs.existsSync(p)) return p;
  throw new Error('three.min.js r128 not found: npm i three@0.128.0 in blockheads-cast, or set THREE_JS');
}
export async function openPage(extraScripts=[], {width=1200,height=900}={}){
  const browser = await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page = await browser.newPage({viewport:{width,height}});
  const errors=[]; page.on('pageerror',e=>errors.push(String(e))); page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.setContent('<!doctype html><html><body style="margin:0;background:#20222b"></body></html>');
  await page.addScriptTag({path:threePath()});
  for(const s of extraScripts) await page.addScriptTag(s.endsWith('.js')?{path:s}:{content:s});
  return {browser,page,errors};
}
