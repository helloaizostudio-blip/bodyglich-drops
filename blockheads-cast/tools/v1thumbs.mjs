// Renders "before" thumbnails of the 22 original characters with the backed-up v1 builder.
import { openPage } from './harness.mjs'; import path from 'path'; import fs from 'fs';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const {browser,page,errors}=await openPage([path.join(root,'backup/builder_v1.js')]);
const thumbs=await page.evaluate(()=>{const R=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});R.setSize(220,264);R.outputEncoding=THREE.sRGBEncoding;
  const sc=new THREE.Scene();lights(sc);const cam=new THREE.PerspectiveCamera(28,220/264,0.1,100);cam.position.set(0,3.1,13.2);cam.lookAt(0,2.85,0);const o={};
  for(const c of CAST){const ch=buildChar(c);ch.rotation.y=-0.38;sc.add(ch);R.render(sc,cam);o[c.id]=R.domElement.toDataURL('image/webp',0.82);sc.remove(ch);}return o;});
fs.writeFileSync(path.join(root,'dist/v1_thumbs.json'),JSON.stringify(thumbs));console.log(Object.keys(thumbs).length,'thumbs',(JSON.stringify(thumbs).length/1024).toFixed(0)+'KB',errors);await browser.close();
