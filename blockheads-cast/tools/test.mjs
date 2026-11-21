// Full test suite for the v2 builder. Exit code 1 on any failure.
import { openPage } from './harness.mjs'; import path from 'path'; import fs from 'fs';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const v1=JSON.parse(fs.readFileSync(path.join(root,'backup/cast_v1.json'),'utf8'));
const fails=[]; const ok=(c,m)=>{ if(!c) fails.push(m); };
const {browser,page,errors}=await openPage([path.join(root,'src/builder.js'),path.join(root,'src/cast.js')]);
const res=await page.evaluate(async (v1)=>{
  const out={chars:[],v1compat:[],legacy:null,timing:{}};
  const R=new THREE.WebGLRenderer({preserveDrawingBuffer:true});R.setSize(160,200);R.outputEncoding=THREE.sRGBEncoding;
  const sc=new THREE.Scene();lights(sc);const cam=new THREE.PerspectiveCamera(28,0.8,0.1,100);cam.position.set(0,3,14);cam.lookAt(0,2.8,0);
  const gl=R.getContext();const px=new Uint8Array(160*200*4);
  const coverage=()=>{gl.readPixels(0,0,160,200,gl.RGBA,gl.UNSIGNED_BYTE,px);let n=0;for(let i=3;i<px.length;i+=4)if(px[i]>0)n++;return n/(160*200);};
  const need=['root','torso','head','headMesh','armL','armR','legL','legR','baseArm'];
  const EX=Object.keys(EXPR);
  for(const c of CAST){const r={id:c.id,errs:[]};
    try{for(const e of EX){const ch=buildChar(c,e);sc.add(ch);R.render(sc,cam);const cov=coverage();if(cov<0.04)r.errs.push('blank render '+e+' cov='+cov.toFixed(3));
        const P=ch.userData.P;for(const k of need)if(!P[k])r.errs.push('missing P.'+k);
        if(!(P.headMesh.material[0].map instanceof THREE.Texture))r.errs.push('face map missing');
        if(Math.abs(P.armL.position.x+1.5)>1e-6||P.armL.position.y!==4||P.legR.position.x!==0.5||P.legR.position.y!==2||P.head.position.y!==4)r.errs.push('pivot moved');
        const bb=new THREE.Box3().setFromObject(ch.children[0].children[0]);// torso mesh
        // animate with v2 + with the v1 viewer loop
        for(const m of BH.MOTIONS){for(let t=0;t<1.2;t+=0.3)BH.animate(P,t,{motion:m});R.render(sc,cam);}
        sc.remove(ch);P.dispose();}
      const h=new THREE.Box3().setFromObject(buildChar(c));r.height=+(h.max.y-h.min.y).toFixed(2);r.minY=+h.min.y.toFixed(3);
    }catch(err){r.errs.push(String(err.stack||err));}
    out.chars.push(r);}
  // v1 specs through the v2 builder + v1 viewer animation code
  for(const c of v1.CAST){const r={id:c.id,errs:[]};try{const ch=buildChar(c,'happy');const P=ch.userData.P;sc.add(ch);
      // verbatim v1 motion code
      for(const motion of ['idle','walk','talk','wave'])for(let t=0;t<1;t+=0.25){let al=P.baseArm.lx,ar=P.baseArm.rx,ll=0,lr=0,bob=0,hz=0,hx=0,arz=P.pose==='hold'?-0.22:0;
        if(motion==='idle'){bob=Math.sin(t*2)*0.03;al+=Math.sin(t*2)*0.04;ar-=Math.sin(t*2)*0.04;hz=Math.sin(t*0.9)*0.05;}
        if(motion==='walk'){const s=Math.sin(t*7);if(P.pose!=='hold'){al=s*0.7;ar=-s*0.7;}ll=-s*0.6;lr=s*0.6;bob=Math.abs(Math.cos(t*7))*0.12;}
        if(motion==='talk'){hx=Math.sin(t*9)*0.05;hz=Math.sin(t*3)*0.06;if(P.pose!=='hold'){ar=-0.5+Math.sin(t*4)*0.25;}bob=Math.sin(t*2)*0.02;}
        if(motion==='wave'){if(P.pose!=='hold'){P.armR.rotation.z=2.6+Math.sin(t*8)*0.35;ar=0;}hz=0.08;}
        if(motion!=='wave')P.armR.rotation.z=arz;
        P.armL.rotation.x=al;P.armR.rotation.x=ar;P.legL.rotation.x=ll;P.legR.rotation.x=lr;
        P.torso.position.y=bob;P.armL.position.y=4+bob;P.armR.position.y=4+bob;P.head.rotation.z=hz;P.head.rotation.x=hx;R.render(sc,cam);}
      // v1-style face swap
      const mat=P.headMesh.material[0];mat.map.dispose();mat.map=faceTexture(c,'angry');mat.needsUpdate=true;R.render(sc,cam);
      sc.remove(ch);}catch(err){r.errs.push(String(err.stack||err));}out.v1compat.push(r);}
  // legacy faces
  BH.legacyFaces=true;try{buildChar(CAST[0],'smug');out.legacy='ok';}catch(e){out.legacy=String(e);}BH.legacyFaces=false;
  // timing: build + render 30 frames of a 4-character scene at 540x960
  const R2=new THREE.WebGLRenderer({antialias:true});R2.setSize(540,960);const s2=new THREE.Scene();lights(s2);const c2=new THREE.PerspectiveCamera(35,540/960,0.1,100);c2.position.set(0,4,18);c2.lookAt(0,3,0);
  let t0=performance.now();const chars=['leo','mom','dad','max'].map((id,i)=>{const ch=buildChar(BH.castById(id));ch.position.x=(i-1.5)*3.2;s2.add(ch);return ch;});out.timing.build4=performance.now()-t0;
  t0=performance.now();for(let f=0;f<30;f++){chars.forEach((ch,i)=>BH.animate(ch.userData.P,f/30,{motion:i%2?'walk':'talk'}));R2.render(s2,c2);}R2.getContext().finish();out.timing.frame=(performance.now()-t0)/30;
  out.timing.tris=R2.info.render.triangles;out.timing.calls=R2.info.render.calls;
  return out;
},v1);
for(const r of res.chars){ok(r.errs.length===0,`${r.id}: ${r.errs.join('; ')}`);ok(r.height>4.8&&r.height<7.6,`${r.id}: odd height ${r.height}`);ok(r.minY>-0.05,`${r.id}: below floor ${r.minY}`);}
for(const r of res.v1compat)ok(r.errs.length===0,`v1 spec ${r.id}: ${r.errs.join('; ')}`);
ok(res.legacy==='ok','legacy faces: '+res.legacy);
const ids=new Set();for(const c of res.chars){ok(!ids.has(c.id),'duplicate id '+c.id);ids.add(c.id);}
for(const c of v1.CAST)ok(ids.has(c.id),'v1 id missing: '+c.id);
ok(errors.length===0,'page errors: '+errors.join(' | '));
console.log(`characters: ${res.chars.length} (${res.chars.length*6} expression builds, ${res.chars.length*6*4} motion runs)`);
console.log(`v1 specs rendered through v2 with v1 animation code: ${res.v1compat.length}`);
console.log(`timing (SwiftShader, 4 chars, 540x960): build ${res.timing.build4.toFixed(0)} ms, ${res.timing.frame.toFixed(0)} ms/frame, ${res.timing.tris} tris, ${res.timing.calls} draw calls`);
console.log(`heights: ${res.chars.map(c=>c.id+'='+c.height).join(' ')}`);
if(fails.length){console.log('FAIL\n - '+fails.join('\n - '));process.exitCode=1;}else console.log('ALL TESTS PASSED');
await browser.close();
