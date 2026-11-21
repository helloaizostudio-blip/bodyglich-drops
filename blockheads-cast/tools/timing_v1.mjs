import { openPage } from './harness.mjs'; import path from 'path';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const {browser,page}=await openPage([path.join(root,'backup/builder_v1.js')]);
const t=await page.evaluate(()=>{const R2=new THREE.WebGLRenderer({antialias:true});R2.setSize(540,960);const s2=new THREE.Scene();lights(s2);const c2=new THREE.PerspectiveCamera(35,540/960,0.1,100);c2.position.set(0,4,18);c2.lookAt(0,3,0);
 let t0=performance.now();['leo','mom','dad','max'].forEach((id,i)=>{const ch=buildChar(CAST.find(c=>c.id===id));ch.position.x=(i-1.5)*3.2;s2.add(ch);});const b=performance.now()-t0;
 t0=performance.now();for(let f=0;f<30;f++)R2.render(s2,c2);R2.getContext().finish();return {build:b,frame:(performance.now()-t0)/30,tris:R2.info.render.triangles,calls:R2.info.render.calls};});
console.log('v1:',JSON.stringify(t));await browser.close();
