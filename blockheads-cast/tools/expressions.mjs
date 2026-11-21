// Expression sheet: rows = characters, columns = the 6 expressions (close-up).
import { openPage } from './harness.mjs'; import path from 'path'; import fs from 'fs';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const ids=(process.argv[2]||'leo,somi,liza,tobi').split(','); const out=process.argv[3]||path.join(root,'dist/expressions.png');
const {browser,page,errors}=await openPage([path.join(root,'src/builder.js'),path.join(root,'src/cast.js')]);
const url=await page.evaluate((ids)=>{const W=260,H=260,EX=Object.keys(EXPR);
  const R=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});R.setSize(W,H);R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;
  const sc=new THREE.Scene();sc.background=new THREE.Color('#2a2d38');lights(sc);const cam=new THREE.PerspectiveCamera(28,1,0.1,100);cam.position.set(0,4.75,5.6);cam.lookAt(0,4.65,0);
  const sheet=document.createElement('canvas');sheet.width=EX.length*W;sheet.height=ids.length*H;const g=sheet.getContext('2d');g.font='bold 16px sans-serif';g.fillStyle='#fff';
  ids.forEach((id,row)=>{const c=BH.castById(id);EX.forEach((e,col)=>{const ch=buildChar(c,e);ch.rotation.y=-0.2;sc.add(ch);R.render(sc,cam);g.drawImage(R.domElement,col*W,row*H);g.fillStyle='#fff';g.fillText(c.name+' · '+e,col*W+8,row*H+20);sc.remove(ch);});});
  return sheet.toDataURL('image/png');},ids);
fs.writeFileSync(out,Buffer.from(url.split(',')[1],'base64'));console.log('wrote',out,errors.length?errors:'no errors');await browser.close();
