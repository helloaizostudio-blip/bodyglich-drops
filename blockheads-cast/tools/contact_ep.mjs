// Renders a contact sheet of the cast (or a subset) to dist/ for visual QA.
import { openPage } from './harness.mjs'; import path from 'path'; import fs from 'fs';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const ids=(process.argv[2]||'').split(',').filter(Boolean); const expr=process.argv[3]||'default'; const out=process.argv[4]||path.join(root,'dist/contact_sheet.png');
const view=process.argv[5]||'front';
const {browser,page,errors}=await openPage([`window.SC=${process.env.SC||1};window.ZOOM=${process.env.ZOOM||0};window.COLS=${process.env.COLS||8};`,path.join(root,'src/builder.js'),path.join(root,'src/cast.js'),'/home/user/bodyglich-drops/ep08/cast_ep08.js']);
const url=await page.evaluate(async ({ids,expr,view})=>{
  const list=ids.length?ids.map(i=>BH.castById(i)):CAST; const SC=window.SC||1;const W=300*SC,H=380*SC,cols=Math.min(list.length,window.COLS||8),rows=Math.ceil(list.length/cols);
  const R=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});R.setSize(W,H);R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.05;
  const sc=new THREE.Scene();sc.background=new THREE.Color('#2a2d38');lights(sc);const cam=new THREE.PerspectiveCamera(28,W/H,0.1,100);const Z=window.ZOOM||0;cam.position.set(0,Z?4.3:3.2,Z?6:14);cam.lookAt(0,Z?4.4:2.9,0);
  const sheet=document.createElement('canvas');sheet.width=cols*W;sheet.height=rows*H;const g=sheet.getContext('2d');g.font='bold 18px sans-serif';
  for(let i=0;i<list.length;i++){const c=list[i];const ch=buildChar(c,expr);ch.rotation.y=view==='back'?Math.PI:view==='side'?Math.PI/2:-0.35;sc.add(ch);R.render(sc,cam);
    g.drawImage(R.domElement,(i%cols)*W,Math.floor(i/cols)*H);g.fillStyle='#fff';g.fillText(c.name,(i%cols)*W+10,Math.floor(i/cols)*H+24);sc.remove(ch);}
  return sheet.toDataURL('image/png');
},{ids,expr,view});
fs.writeFileSync(out,Buffer.from(url.split(',')[1],'base64'));
console.log('wrote',out,'errors:',errors.length?errors:'none'); await browser.close();
