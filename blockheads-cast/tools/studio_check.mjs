// Loads dist/studio.html (with a local three.js) and screenshots it at desktop + phone width.
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import { threePath } from './harness.mjs';
const require=createRequire(import.meta.url); const { chromium }=require('/opt/node-tools/node_modules/playwright');
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
let html=fs.readFileSync(path.join(root,'dist/studio.html'),'utf8').replace(/<script src="https:\/\/cdnjs[^"]+three.min.js"><\/script>/,()=>`<script>${fs.readFileSync(threePath(),'utf8')}</script>`);
const out=process.argv[2]||'/tmp'; const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
for(const [w,h,name,scheme] of [[1280,1000,'desktop','dark'],[400,860,'phone','light']]){const p=await b.newPage({viewport:{width:w,height:h},colorScheme:scheme});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>${html}</body></html>`);
  await p.waitForTimeout(9000); if(name==='desktop'){await p.click('button[data-e="happy"]');await p.click('button[data-m="wave"]');await p.waitForTimeout(800);}
  const sw=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  await p.screenshot({path:path.join(out,`studio_${name}.png`),fullPage:name==='desktop'});console.log(name,'errors:',errs.length?errs:'none','hscroll:',sw);}
await b.close();
