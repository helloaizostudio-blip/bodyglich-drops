/* Episode 7 "Never Let Mom In After Midnight" (horror, narrator Leo). HQ renderer + horror grade (grain, flicker, vignette).
   Entry points: SAMPLE.init(timeline, W, H, fontUrl), SAMPLE.frame(f) */
(function(){
const S=window.SAMPLE={};
let TL,W,H,R,scene,cam,out,og,world={},chars={},curShot=null,SS=1.25;
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const lerp=(a,b,t)=>a+(b-a)*t,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);},easeOut=t=>1-Math.pow(1-clamp(t,0,1),3),easeIn=t=>Math.pow(clamp(t,0,1),2);
const rnd=rng('midnight');
const FONT='"Luckiest Guy", Impact, sans-serif',HAND='italic 400 {S}px "DejaVu Serif", serif';
const EXT=200,WIN=600,GMA=400;

/* ---------------- textures */
function canvasTex(w,h,draw){const [c,g]=cv(w,h);draw(g,w,h);return tex(c);}
function glowTex(col){return canvasTex(128,128,(g)=>{const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.25,col);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);});}
function plankTex(col){return canvasTex(256,256,(g,w,h)=>{fabricFill(g,0,0,w,h,col,'canvas');g.strokeStyle='rgba(0,0,0,0.25)';g.lineWidth=2;for(let y=0;y<h;y+=32){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}});}
function tileTex(a,b){return canvasTex(256,256,(g)=>{for(let y=0;y<4;y++)for(let x=0;x<4;x++){g.fillStyle=(x+y)%2?a:b;g.fillRect(x*64,y*64,64,64);}});}
function wallTex(col,stripe){return canvasTex(256,256,(g,w,h)=>{fabricFill(g,0,0,w,h,col,'cotton');if(stripe){g.fillStyle=stripe;for(let x=0;x<w;x+=32)g.fillRect(x,0,10,h);}});}
const SM=(o)=>new THREE.MeshStandardMaterial(o);
function rcv(m){m.receiveShadow=true;return m;} function cst(m){m.castShadow=true;m.receiveShadow=true;return m;}
function box(w,h,d,col,x,y,z,parent,opt){const m=cst(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),SM(Object.assign({color:col,roughness:0.8},opt||{}))));m.position.set(x,y,z);(parent||scene).add(m);return m;}

/* handwriting on a canvas: per-letter jitter, dotless i + custom dot (heart or plain) */
function hand(g,text,x,y,size,col,hearts,seed,dots){const r=rng(seed||text);g.save();g.fillStyle=col;g.strokeStyle=col;g.textBaseline='alphabetic';g.font=HAND.replace('{S}',size);let cx=x;
  for(const ch of text){const c=ch==='i'?'ı':ch;const w=g.measureText(c).width;g.save();g.translate(cx,y+(r()-0.5)*size*0.06);g.rotate((r()-0.5)*0.08);g.fillText(c,0,0);
    if(ch==='i'){const dx=w*0.55,dy=-size*0.78;if(hearts){const s=size*0.13;g.fillStyle='#d6336c';g.beginPath();g.moveTo(dx,dy+s);g.bezierCurveTo(dx-s*2,dy-s*0.4,dx-s*0.6,dy-s*1.7,dx,dy-s*0.5);g.bezierCurveTo(dx+s*0.6,dy-s*1.7,dx+s*2,dy-s*0.4,dx,dy+s);g.fill();}
      else{g.beginPath();g.arc(dx,dy,size*0.06,0,7);g.fill();}if(dots){const m=g.getTransform();dots.push([m.e+m.a*dx+m.c*dy,m.f+m.b*dx+m.d*dy]);}}
    g.restore();cx+=w*1.02;}
  g.restore();return cx;}
function noteCanvas(lines,hearts,seed){const [c,g]=cv(512,400);c.dots=[];g.fillStyle='#fbf3c9';g.fillRect(0,0,512,400);g.fillStyle='rgba(0,0,0,0.05)';for(let y=60;y<400;y+=44)g.fillRect(0,y,512,2);
  g.fillStyle='rgba(255,255,255,0.55)';g.fillRect(186,-6,140,40);lines.forEach((l,i)=>hand(g,l,40,120+i*80,58,'#1c1c2a',hearts,seed+i,c.dots));return c;}

/* ---------------- world */
function buildWorld(){
  scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x070a14,0.008);
  world.skyCanvas=cv(16,512);world.skyTex=tex(world.skyCanvas[0]);scene.background=world.skyTex;
  world.hemi=new THREE.HemisphereLight(0x8aa0d8,0x1a1420,0.3);scene.add(world.hemi);
  const moon=world.moon=new THREE.DirectionalLight(0x9ab4ff,0.55);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);const sc=moon.shadow.camera;sc.left=-30;sc.right=30;sc.top=30;sc.bottom=-30;sc.near=1;sc.far=260;moon.shadow.bias=-0.0004;moon.shadow.normalBias=0.06;moon.shadow.radius=4;scene.add(moon);scene.add(moon.target);
  world.sunDir=V3(-0.5,0.7,0.5).normalize();world.look=V3(0,0,0);
  world.L=[];buildHouse();buildExterior();buildWindowSet();buildGrandma();
  world.note=new THREE.Mesh(new THREE.PlaneGeometry(1.1,0.86),new THREE.MeshStandardMaterial({map:tex(noteCanvas(['Never let Mom','in after midnight.'],false,'n')),roughness:0.9}));world.note.position.set(-9.9,5.6,-8.55);world.house.add(world.note);
}
function pl(col,int,dist,x,y,z,parent){const L=new THREE.PointLight(col,int,dist,1.6);L.position.set(x,y,z);(parent||scene).add(L);world.L.push(L);L.userData.base=int;return L;}
function buildHouse(){const g=world.house=new THREE.Group();scene.add(g);
  const wt=wallTex('#3e4a5e','rgba(255,255,255,0.03)');wt.wrapS=wt.wrapT=THREE.RepeatWrapping;wt.repeat.set(3,2);
  const room=new THREE.Mesh(new THREE.BoxGeometry(26,18,22),SM({map:wt,roughness:0.95,side:THREE.BackSide}));room.position.y=9;room.receiveShadow=true;g.add(room);
  const ft=plankTex('#5a4232');ft.wrapS=ft.wrapT=THREE.RepeatWrapping;ft.repeat.set(4,4);const fl=rcv(new THREE.Mesh(new THREE.PlaneGeometry(26,22),SM({map:ft,roughness:0.7})));fl.rotation.x=-Math.PI/2;fl.position.y=0.02;g.add(fl);
  // kitchen corner: fridge, counter, clock
  const fr=box(2.6,6.4,2,0xd8dce2,-10,3.2,-9.6,g,{roughness:0.35,metalness:0.2});box(0.12,1.6,0.12,0xa8acb2,-8.9,4.8,-8.55,g,{metalness:0.8});
  box(8,3,2,0x6a5444,-4,1.5,-9.8,g);box(8.2,0.3,2.2,0xc8c0b0,-4,3.1,-9.7,g);
  world.magnet=box(0.3,0.3,0.1,0xd6336c,-9.4,6.05,-8.55,g);
  // front door (back wall, x=4) with frosted window; porch light outside drawn into the glass canvas
  world.doorG=new THREE.Group();world.doorG.position.set(4,0,-10.9);g.add(world.doorG);
  const df=box(4.4,7.6,0.3,0x2a2026,0,3.8,0,world.doorG);world.doorPivot=new THREE.Group();world.doorPivot.position.set(-1.9,0,0.15);world.doorG.add(world.doorPivot);
  const door=box(3.8,7.2,0.25,0x6a3a2a,1.9,3.6,0.05,world.doorPivot,{roughness:0.6});
  world.glassCanvas=cv(256,256);world.glassTex=tex(world.glassCanvas[0]);const gl=new THREE.Mesh(new THREE.PlaneGeometry(2.0,2.2),new THREE.MeshBasicMaterial({map:world.glassTex,toneMapped:false}));gl.position.set(1.9,5.2,0.2);world.doorPivot.add(gl);
  box(0.3,0.3,0.3,0xd4af37,3.3,3.6,0.3,world.doorPivot,{metalness:0.9,roughness:0.2});world.lock=box(0.5,0.25,0.15,0xd4af37,3.2,4.3,0.3,world.doorPivot,{metalness:0.9,roughness:0.2});
  world.porch=pl(0xffb060,0,14,4,6,-8.5,g);
  // stairs (right wall), 13 steps up to a landing at y=8
  const st=plankTex('#4a3426');world.steps=[];for(let i=0;i<13;i++){const s=box(4,0.62,1.1,0x5a4030,10.5,0.31+i*0.62,7-i*1.05,g,{map:st});world.steps.push(s);}
  box(6,0.4,6,0x4a3426,10,7.9,-8,g);box(26,0.4,4,0x30283a,0,8.1,-9,g).visible=false;
  // upstairs door with light leaking under it
  world.upPivot=new THREE.Group();world.upPivot.position.set(8.4,8.1,-10.85);g.add(world.upPivot);box(3.4,6.4,0.2,0x3a2a24,1.7,3.2,0,world.upPivot);
  world.upGlow=new THREE.Mesh(new THREE.PlaneGeometry(3.4,0.25),new THREE.MeshBasicMaterial({color:0xffc070,transparent:true,opacity:0}));world.upGlow.position.set(10.1,8.25,-10.7);g.add(world.upGlow);
  world.upRoom=new THREE.Mesh(new THREE.PlaneGeometry(3.4,6.4),new THREE.MeshBasicMaterial({color:0xffb860,toneMapped:false}));world.upRoom.position.set(10.1,11.3,-10.95);g.add(world.upRoom);
  world.upL=pl(0xffb060,0,16,10,11,-9.5,g);world.stairL=pl(0x7a90d0,0.9,18,7,6,3,g);
  world.doorway=new THREE.Mesh(new THREE.PlaneGeometry(3.8,7.2),new THREE.MeshBasicMaterial({map:canvasTex(128,256,(q)=>{const gr=q.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#0a1028');gr.addColorStop(0.7,'#1a1c30');gr.addColorStop(1,'#3a2a1a');q.fillStyle=gr;q.fillRect(0,0,128,256);const r2=q.createRadialGradient(64,30,4,64,30,90);r2.addColorStop(0,'rgba(255,190,110,0.8)');r2.addColorStop(1,'rgba(255,190,110,0)');q.fillStyle=r2;q.fillRect(0,0,128,256);}),toneMapped:false}));world.doorway.position.set(4,3.6,-10.7);world.doorway.visible=false;g.add(world.doorway);
  // living area: couch, lamp, table, window with moonlight
  box(6,1.6,2.4,0x4a5a7a,-5,0.8,4,g);box(6,2.4,0.6,0x4a5a7a,-5,2,5.2,g);
  box(1.6,1.4,1.6,0x5a4030,0,0.7,1,g);world.phoneG=makePhone();world.phoneG.position.set(0,1.45,1);world.phoneG.rotation.x=-Math.PI/2;g.add(world.phoneG);
  world.lamp=pl(0xffc890,0.5,12,-8,4,3,g);box(0.4,3.6,0.4,0x2a2a2a,-8,1.8,3,g);const sh=new THREE.Mesh(new THREE.CylinderGeometry(0.6,1,1,16,1,true),new THREE.MeshBasicMaterial({color:0xffe0b0,side:THREE.DoubleSide}));sh.position.set(-8,4,3);g.add(sh);world.shade=sh;
  const win=new THREE.Mesh(new THREE.PlaneGeometry(4,4.6),new THREE.MeshBasicMaterial({color:0x2a3a6a}));win.position.set(-12.95,5,0);win.rotation.y=Math.PI/2;g.add(win);
  // clock
  world.clockCanvas=cv(256,96);world.clockTex=tex(world.clockCanvas[0]);const ck=new THREE.Mesh(new THREE.PlaneGeometry(1.6,0.6),new THREE.MeshBasicMaterial({map:world.clockTex,toneMapped:false}));ck.position.set(-4,3.6,-8.68);g.add(ck);drawClock('3:00');
  // family photo with hearts note list (mom's handwriting) on the fridge
  world.list=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.7),new THREE.MeshStandardMaterial({map:tex(noteCanvas(['milk, cookies','for Leo :)'],true,'l')),roughness:0.9}));world.list.position.set(-10.6,4.2,-8.56);world.list.rotation.z=0.06;g.add(world.list);
}
function drawClock(t){const [c,g]=world.clockCanvas;g.fillStyle='#08090c';g.fillRect(0,0,256,96);g.font='bold 64px "DejaVu Sans Mono", monospace';g.textAlign='center';g.textBaseline='middle';g.shadowColor='#ff3030';g.shadowBlur=14;g.fillStyle='#ff3a3a';g.fillText(t,128,52);world.clockTex.needsUpdate=true;}
function makePhone(){const g=new THREE.Group();g.add(rbox(0.5,0.92,0.07,0.06,MAT('#111',0.3)));world.phCanvas=world.phCanvas||cv(128,256);world.phTex=world.phTex||tex(world.phCanvas[0]);const s=new THREE.Mesh(new THREE.PlaneGeometry(0.44,0.84),new THREE.MeshBasicMaterial({map:world.phTex,toneMapped:false}));s.position.z=0.04;g.add(s);return g;}
function drawPhoneTex(on){const [c,g]=world.phCanvas;g.fillStyle=on?'#1a2a1a':'#000';g.fillRect(0,0,128,256);if(on){g.fillStyle='#fff';g.font='22px "DejaVu Sans"';g.textAlign='center';g.fillText('MOM',64,90);g.fillStyle='#2fbf5a';g.beginPath();g.arc(64,190,16,0,7);g.fill();}world.phTex.needsUpdate=true;}
function buildExterior(){const g=world.ext=new THREE.Group();g.position.set(EXT,0,0);scene.add(g);
  const gt=canvasTex(256,256,(q,w,h)=>{fabricFill(q,0,0,w,h,'#22361e','fleece');});gt.wrapS=gt.wrapT=THREE.RepeatWrapping;gt.repeat.set(30,30);const gr=rcv(new THREE.Mesh(new THREE.PlaneGeometry(300,300),SM({map:gt,roughness:1})));gr.rotation.x=-Math.PI/2;g.add(gr);
  const rd=rcv(new THREE.Mesh(new THREE.PlaneGeometry(300,10),SM({color:0x1e2026,roughness:0.9})));rd.rotation.x=-Math.PI/2;rd.position.set(0,0.03,22);g.add(rd);
  const hs=box(22,10,14,0x5a6070,0,5,-6,g,{roughness:0.9});const rf=cst(new THREE.Mesh(new THREE.ConeGeometry(16,6,4),SM({color:0x2a2030,roughness:0.8})));rf.position.set(0,13,-6);rf.rotation.y=Math.PI/4;g.add(rf);
  box(3,6.6,0.3,0x6a3a2a,0,3.3,1.05,g);world.extPorch=pl(0xffb060,1.2,12,0,7,3,g);box(6,0.4,3,0x4a4a4a,0,0.2,2.5,g);
  world.wins=[];[[-7,3.2],[7,3.2],[-7,8],[0,8],[7,8]].forEach(([x,y])=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(3,2.8),new THREE.MeshBasicMaterial({color:0x10131c,toneMapped:false}));m.position.set(x,y,1.02);g.add(m);world.wins.push(m);box(3.4,0.25,0.3,0xd8d0c0,x,y-1.5,1.1,g);});
  // car
  const car=world.car=new THREE.Group();car.position.set(10,0,14);g.add(car);box(7,1.8,3.4,0x8a2a2a,0,1.4,0,car,{roughness:0.35,metalness:0.4});box(4,1.4,3.2,0x6a1f1f,-0.4,2.9,0,car,{roughness:0.3,metalness:0.4});
  [[-2.3,1.7],[2.3,1.7],[-2.3,-1.7],[2.3,-1.7]].forEach(([x,z])=>{const w=new THREE.Mesh(new THREE.CylinderGeometry(0.75,0.75,0.5,16),SM({color:0x111111}));w.rotation.x=Math.PI/2;w.position.set(x,0.75,z);car.add(w);});
  world.headL=new THREE.SpotLight(0xfff0d0,0,40,0.5,0.5,1);world.headL.position.set(3.6,1.6,0);const ht=new THREE.Object3D();ht.position.set(20,0,0);car.add(ht);world.headL.target=ht;car.add(world.headL);
  const tg=new THREE.SphereGeometry(3.4,10,8);tg.translate(0,8,0);const tk=new THREE.CylinderGeometry(0.5,0.7,6,6);tk.translate(0,3,0);const tm=new THREE.InstancedMesh(tg,SM({color:0x14241a,roughness:1}),16),km=new THREE.InstancedMesh(tk,SM({color:0x2a1e16}),16);const m4=new THREE.Matrix4();
  for(let i=0;i<16;i++){const x=(i%2?-1:1)*(18+rnd()*30),z=-30+rnd()*40;m4.makeTranslation(x,0,z);tm.setMatrixAt(i,m4);km.setMatrixAt(i,m4);}g.add(tm);g.add(km);
  world.moonSpr=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex('rgba(200,215,255,0.9)'),transparent:true,depthWrite:false,fog:false}));world.moonSpr.scale.set(30,30,1);world.moonSpr.position.set(EXT-60,70,-160);scene.add(world.moonSpr);}
function buildWindowSet(){const g=world.win=new THREE.Group();g.position.set(WIN,0,0);scene.add(g);
  const wc=0x5a6070;box(20,4,0.8,wc,0,2,0,g);box(20,4,0.8,wc,0,12,0,g);box(8,6,0.8,wc,-6,7,0,g);box(8,6,0.8,wc,6,7,0,g);
  [[0,4.1,4.4,0.3],[0,9.9,4.4,0.3]].forEach(([x,y,w,h])=>box(w,h,1,0xd8d0c0,x,y,0.3,g));box(0.3,6,1,0xd8d0c0,-2.1,7,0.3,g);box(0.3,6,1,0xd8d0c0,2.1,7,0.3,g);
  const inner=new THREE.Mesh(new THREE.BoxGeometry(8,8,8),SM({map:wallTex('#a87a4a'),side:THREE.BackSide,roughness:0.9}));inner.position.set(0,7,-4.2);g.add(inner);world.winL=pl(0xffb060,1.4,12,0,9,-3,g);}
function buildGrandma(){const g=world.gma=new THREE.Group();g.position.set(GMA,0,0);scene.add(g);
  const room=new THREE.Mesh(new THREE.BoxGeometry(22,12,18),SM({map:wallTex('#e8d8b8','rgba(200,120,120,0.12)'),roughness:0.95,side:THREE.BackSide}));room.position.y=6;room.receiveShadow=true;g.add(room);
  const fl=rcv(new THREE.Mesh(new THREE.PlaneGeometry(22,18),SM({map:tileTex('#e8e0d0','#c8b8a0'),roughness:0.6})));fl.rotation.x=-Math.PI/2;fl.position.y=0.02;g.add(fl);
  box(2.6,6.4,2,0xf2f0ea,-8,3.2,-7.8,g,{roughness:0.35});box(0.12,1.6,0.12,0xa8acb2,-6.9,4.8,-6.75,g,{metalness:0.8});
  world.gNoteCanvas=noteCanvas(['Never let Leo','in after midnight.'],false,'g');world.gNote=new THREE.Mesh(new THREE.PlaneGeometry(1.1,0.86),new THREE.MeshStandardMaterial({map:tex(world.gNoteCanvas),roughness:0.9}));world.gNote.position.set(-8,5.6,-6.76);world.gNote.rotation.z=-0.04;g.add(world.gNote);
  box(6,0.3,3.6,0x8a5a3a,2,2.6,0,g);[[-0.6,-1.3],[4.6,-1.3],[-0.6,1.3],[4.6,1.3]].forEach(([x,z])=>box(0.3,2.5,0.3,0x6a4428,x,1.25,z,g));
  const win=new THREE.Mesh(new THREE.PlaneGeometry(5,4),new THREE.MeshBasicMaterial({color:0xfff2c8,toneMapped:false}));win.position.set(6,6.5,-8.95);g.add(win);world.gL=pl(0xffe2b0,0,30,0,10,0,g);}


/* ---------------- characters */
function clone(id,nid,mod){const c=JSON.parse(JSON.stringify(BH.castById(id)));c.id=nid;if(mod)mod(c);return c;}
function buildChars(){
  const add=(id,spec,sc)=>{const g=buildChar(spec);if(sc)g.scale.setScalar(sc);scene.add(g);g.visible=false;chars[id]=g;return g;};
  add('leo',{id:'leo7',name:'Leo',skin:'#e6b48c',hair:{style:'messy',color:'#17110e'},face:{eyes:'dot',eyeColor:'#3a2a1a',brows:'normal',mouth:'flat',nose:'button'},
    torso:{inner:'#cfd2d8',outer:{style:'hoodie',color:'#2c3240',fabric:'fleece',strings:'#e8e8e8'}},sleeves:{color:'#2c3240',len:'full',fabric:'fleece'},pants:{color:'#3a3f4a',fabric:'cotton',shoes:'#d8d8d8'}});
  add('mom',clone('mom','mom7',c=>{c.torso={inner:'#6aa8b0',fabric:'cotton',collar:true};c.sleeves={color:'#6aa8b0',len:'short'};c.pants={color:'#6aa8b0',fabric:'cotton',shoes:'#f2f2f2'};c.extras=['lanyard:#2a6aa8'];}));
  add('copy',clone('mom','copy7',c=>{Object.assign(c.face,{eyes:'dot',eyeColor:'#000000',mouth:'smile',brows:'none'});}));
  world.ph={};['leo','copy'].forEach(id=>{const p=makePhone();chars[id].userData.P.armR.add(p);p.position.set(0.05,-2.15,0.2);p.visible=false;world.ph[id]=p;});
}
function showOnly(ids){Object.keys(chars).forEach(k=>chars[k].visible=ids.includes(k));}
function reset(P){['armL','armR','legL','legR','head'].forEach(k=>P[k].rotation.set(0,0,0));P.torso.rotation.set(0,0,0);P.torso.position.y=0;P._anim=null;P.armL.position.set(-1.5,4,0);P.armR.position.set(1.5,4,0);}
function st(id,x,y,z,ry,e){const c=chars[id];c.position.set(x,y,z);c.rotation.set(0,ry||0,0);c.visible=true;const P=c.userData.P;reset(P);if(e)P.setFace(e);return P;}
function mouth(P,who,t,e){const env=TL.mouth[who];const f=Math.round(t*TL.fps);const a=env?env[f]||0:0;P.setFace(e||P.expr||'default',{mouthOpen:a>0.12?Math.min(1,a*1.1):0});}
function walk(P,t,sp,e){BH.animate(P,t*(sp||1),{motion:'walk',blend:0.01,face:false});P.setFace(e||'default');}
function lw0(o,v){let r=o;while(r.parent&&r.parent!==scene)r=r.parent;r.updateMatrixWorld(true);return o.localToWorld(v);}
const head=id=>lw0(chars[id].userData.P.head,V3(0,0.6,0));
const faceCam=(id,x,y,d)=>lw0(chars[id].userData.P.head,V3(x,0.6+y,d));
function close(id,d,x,y,fov){const hp=head(id);camAt(faceCam(id,x==null?0.5:x,y==null?0.05:y,(d||3.4)*1.75),hp.clone().add(V3(0,-0.05,0)),fov||36);}
function phoneEar(id){const P=chars[id].userData.P;P.armR.rotation.set(-2.6,0,-0.55);const p=world.ph[id];p.visible=true;p.position.set(0.1,-2.1,0.1);p.rotation.set(0,0,0);return P;}

/* ---------------- look */
function sky(a,b,c){const [cc,g]=world.skyCanvas;const gr=g.createLinearGradient(0,0,0,512);gr.addColorStop(0,a);gr.addColorStop(0.6,b);gr.addColorStop(1,c);g.fillStyle=gr;g.fillRect(0,0,16,512);world.skyTex.needsUpdate=true;}
function mood(m){if(world.mood===m)return;world.mood=m;
  const M={night:['#02030a','#070b1a','#0e1428',0x8aa0d8,0.28,0x9ab4ff,0.55,0x070a14,0.008],dusk:['#1a2048','#a86a5a','#f0a070',0xffd0b0,0.6,0xffb070,1.1,0x3a2a30,0.004],morning:['#7ab0e8','#cfe4f4','#fff4dc',0xfff2e0,0.6,0xfff0d0,0.9,0xe8e0d0,0.002]}[m];
  sky(M[0],M[1],M[2]);world.hemi.color.setHex(M[3]);world.hemi.intensity=M[4];world.moon.color.setHex(M[5]);world.moon.intensity=M[6];scene.fog.color.setHex(M[7]);scene.fog.density=M[8];}
function camAt(p,l,fov){cam.position.copy(p);cam.lookAt(l);cam.fov=fov||40;cam.updateProjectionMatrix();world.look.copy(l);}
function shake(a,t){cam.position.x+=Math.sin(t*23.1)*a+Math.sin(t*41.7)*a*0.5;cam.position.y+=Math.cos(t*19.3)*a;}
const segT=(id)=>{const s=TL.segs.find(x=>x.id===id);return s?s.start:0;};
const shotS=n=>TL.shots.find(s=>s.name===n).s;
/* frosted glass: porch light + a blurry silhouette (k = presence, lean, knock) */
function drawGlass(k,t,opt){opt=opt||{};const [c,g]=world.glassCanvas;const gr=g.createRadialGradient(128,90,10,128,128,200);gr.addColorStop(0,'#ffd28a');gr.addColorStop(1,'#a8602a');g.fillStyle=gr;g.fillRect(0,0,256,256);
  if(k>0){g.save();g.globalAlpha=k;g.filter='blur(9px)';g.fillStyle='#1a0f0c';const sx=128+(opt.sway||0)*Math.sin(t*1.3)*6,hy=opt.low?120:90;g.beginPath();g.ellipse(sx,hy,38,46,0,0,7);g.fill();g.beginPath();g.ellipse(sx,hy+150,92,100,0,0,7);g.fill();
    if(opt.knock){const kk=Math.abs(Math.sin(t*9));g.beginPath();g.ellipse(sx+60,140-kk*14,18,22,0,0,7);g.fill();}if(opt.hand){g.beginPath();g.ellipse(sx+40,110,26,30,0,0,7);g.fill();}g.restore();}
  g.fillStyle='rgba(255,255,255,0.08)';for(let i=0;i<40;i++){g.fillRect((i*53)%256,(i*97)%256,3,3);}world.glassTex.needsUpdate=true;}

/* ---------------- shots */
const INT=V3(0,0,0);
const SH={
  fridge_note:(u,t)=>{mood('night');const n=V3(-9.9,5.0,-8.55);camAt(V3(lerp(-7.2,-8.2,u),5.2,lerp(-1.5,-3.5,ease(u))),n,40);showOnly([]);world.flick=1;},
  note_close:(u,t)=>{mood('night');const n=V3(-9.9,5.6,-8.55);camAt(V3(-9.9+lerp(0.3,0.1,u),5.6,-8.55+lerp(2.4,1.7,ease(u))),n,36);showOnly([]);},
  leo_kitchen:(u,t)=>{mood('night');const P=st('leo',-7,0,-5,-2.4,'default');P.head.rotation.y=0.3;close('leo',lerp(4.4,3.8,u),-0.8,0.1,38);showOnly(['leo']);},
  mom_leaving:(u,t)=>{mood('dusk');world.porch.intensity=1.2;const M=st('mom',4,0,lerp(-6,-8.6,u),Math.PI,'happy');walk(M,t,0.6,'happy');M.armL.rotation.set(0,0,-0.2);world.doorPivot.rotation.y=-1.2;const Lp=st('leo',1,0,-3,Math.PI-0.4,'happy');Lp.armR.rotation.set(-2.6,0,0.3+Math.sin(t*8)*0.25);
    camAt(V3(6.5,4.6,1.5),V3(3,4.4,-7),44);showOnly(['mom','leo']);S.tag='6:00 PM';},
  door_lock:(u,t,lt)=>{mood('night');world.porch.intensity=0.6;world.lock.rotation.z=lt>0.5?Math.PI/2:0;const P=st('leo',5.4,0,-8.2,Math.PI+0.5,'default');P.armR.rotation.set(-1.7,0,0.5);camAt(V3(lerp(6,5.4,u),5,lerp(-3.6,-4.6,u)),V3(5,4.4,-10.6),40);showOnly(['leo']);},
  clock_3am:(u,t)=>{mood('night');drawClock((t*2|0)%2?'3:00':'3 00');const c=V3(-4,3.6,-8.68);camAt(c.clone().add(V3(0,0,lerp(3,2.2,u))),c,36);showOnly([]);S.flash2=0;},
  door_knock:(u,t)=>{mood('night');world.porch.intensity=1.4;drawGlass(1,t,{knock:true});world.doorG.position.x=4+Math.sin(t*60)*0.015*Math.abs(Math.sin(t*9));camAt(V3(lerp(5,4.4,u),4.6,lerp(-3,-4.5,u)),V3(4,4.6,-10.8),44);showOnly([]);S.shakeA=0.02;},
  door_shadow:(u,t)=>{mood('night');world.porch.intensity=1.4;drawGlass(1,t,{sway:1});const P=st('leo',2,0,-3.4,Math.PI+0.3,'shocked');camAt(V3(lerp(-2.6,-1.6,u),5,lerp(4,2.4,ease(u))),V3(3.6,4.8,-10),40);showOnly(['leo']);},
  leo_frozen:(u,t)=>{mood('night');world.porch.intensity=1.4;drawGlass(1,t,{sway:1});const P=st('leo',2,0,-3.4,0.2,'shocked');P.armL.rotation.x=-0.3;close('leo',lerp(4.2,3.3,ease(u)),0.4,0.05,36);showOnly(['leo']);},
  phone_ring:(u,t)=>{mood('night');drawPhoneTex(true);world.phoneG.position.y=1.45+Math.abs(Math.sin(t*40))*0.02;const p=V3(0,1.45,1);world.phoneL=1;camAt(p.clone().add(V3(0.8,lerp(2.4,1.8,u),1.2)),p,40);showOnly([]);S.phoneUI={t,call:true};},
  phone_screen:(u,t)=>{mood('night');drawPhoneTex(true);const P=st('leo',0.6,0,2.4,Math.PI-0.3,'shocked');phoneEar('leo');close('leo',lerp(4.6,4.0,u),-0.7,0.05,38);showOnly(['leo']);S.phoneUI={t,call:false,talking:true};world.phoneL=1;},
  leo_phone:(u,t)=>{mood('night');world.porch.intensity=1.4;drawGlass(1,t,{sway:1});const P=st('leo',0.6,0,2.4,Math.PI-0.3,'shocked');phoneEar('leo');P.head.rotation.y=-0.5;camAt(V3(-1.8,4.8,-4.5),V3(0.8,4.4,2.4),44);showOnly(['leo']);world.phoneL=1;},
  door_shadow2:(u,t)=>{mood('night');world.porch.intensity=1.4;drawGlass(1,t,{hand:true});const d=V3(4,5.2,-10.55);camAt(d.clone().add(V3(lerp(0.4,0,u),0,lerp(4,2.8,ease(u)))),d,40);showOnly([]);},
  split_door_phone:(u,t)=>{mood('night');world.porch.intensity=1.4;drawGlass(1,t,{sway:1});camAt(V3(4,4.8,-4),V3(4.6,4.8,-10.8),46);showOnly([]);S.split=u;},
  door_crying:(u,t)=>{mood('night');world.porch.intensity=1.2;drawGlass(1,t,{low:true,hand:true});const P=st('leo',2.6,0,-6.6,Math.PI,'sad');camAt(V3(0.4,4.2,-1.6),V3(4.2,4.4,-10.4),42);showOnly(['leo']);},
  note_macro:(u,t)=>{mood('night');showOnly([]);camAt(V3(-9.9,5.6,-7.2),V3(-9.9,5.6,-8.9),36);S.compare={k:easeOut(u*2),circ:0};},
  no_hearts:(u,t)=>{mood('night');showOnly([]);camAt(V3(-9.9,5.6,-7.2),V3(-9.9,5.6,-8.9),36);S.compare={k:1,circ:easeOut(u*1.6)};},
  leo_realizes:(u,t,lt)=>{mood('night');const P=st('leo',-7,0,-5,-2.4,'shocked');P.setFace('shocked',{mouthOpen:0.7});close('leo',lerp(3.8,2.8,easeOut(lt/0.4)),-0.4,0.05,36);showOnly(['leo']);S.zoomPunch=lt<0.25?1-lt/0.25:0;},
  stairs_dark:(u,t)=>{mood('night');world.upGlow.material.opacity=0.6;world.upL.intensity=0.4;world.stairL.intensity=1.4;camAt(V3(lerp(5,6,u),lerp(2.2,3,u),lerp(11,9.5,u)),V3(10.4,6,-6),48);showOnly([]);},
  upstairs_glow:(u,t)=>{mood('night');world.upGlow.material.opacity=0.9+Math.sin(t*30)*0.1;world.upL.intensity=0.9;world.stairL.intensity=1.2;const P=st('leo',9.4,0.62*2,5.0,Math.PI,'shocked');P.legL.rotation.x=-0.4;camAt(V3(11.9,lerp(4.2,5.4,ease(u)),lerp(10,8,ease(u))),V3(10.2,9.5,-10.5),44);showOnly(['leo']);},
  upstairs_door:(u,t,lt)=>{mood('night');world.upPivot.rotation.y=-lerp(0.05,0.55,ease(u));world.upL.intensity=1.4;world.upGlow.material.opacity=1;const C=st('copy',10.1,8.1,-10.5,0,'default');phoneEar('copy');C.head.rotation.x=-0.1;world.upL.intensity=0.6;camAt(V3(10.4,11.2,lerp(-3.2,-5.0,ease(u))),V3(10.1,12.6,-10.6),42);showOnly(['copy']);world.copyPhone=1;},
  house_wide:(u,t)=>{mood('night');world.upL.intensity=1.2;world.upGlow.material.opacity=1;world.upPivot.rotation.y=-0.55;drawGlass(1,t,{sway:1});world.porch.intensity=1.2;const P=st('leo',3,0,-2,Math.PI*0.8,'shocked');camAt(V3(lerp(-11,-10,u),lerp(15,13.5,u),lerp(9,8,u)),V3(3,3,-5),50);showOnly(['leo']);},
  lights_on:(u,t,lt)=>{mood('night');const k=lt>0.4?1:0;world.lamp.intensity=k?1.6:0.5;world.upL.intensity=1.6;world.upGlow.material.opacity=1;world.upPivot.rotation.y=-1.45;const C=st('copy',10.1,8.1,-9.9,0,'default');C.head.rotation.x=0.25;world.stairL.intensity=1.2;
    camAt(V3(10.4,5.8,3),V3(10.1,11.6,-9.6),44);showOnly(['copy']);if(lt>0.4&&lt<0.5)S.flash=0.5;S.shakeA=0.01;},
  door_open:(u,t,lt)=>{mood('night');world.porch.intensity=1.6;world.doorPivot.rotation.y=-easeOut(lt/0.3)*1.5;world.doorway.visible=true;drawGlass(0,t);const P=st('leo',4,0,-6.6,Math.PI,'shocked');const M=st('mom',4,0,lerp(-10.4,-8.6,ease(u)),0,'sad');M.armL.rotation.set(-1.6,0,0.2);M.armR.rotation.set(-1.6,0,-0.2);
    camAt(V3(6.2,5,-2.6),V3(4,4.4,-9.6),42);showOnly(['leo','mom']);if(lt<0.12)S.flash=0.35;},
  run_car:(u,t)=>{mood('night');world.headL.intensity=0;const x=lerp(-1,9,u);const M=st('mom',EXT+x,0,lerp(4,12,u),0.9,'shocked');walk(M,t,1.7,'shocked');const P=st('leo',EXT+x-1.8,0,lerp(4.4,12.4,u),0.9,'shocked');walk(P,t+0.3,1.7,'shocked');M.armL.rotation.x=-0.9;
    camAt(V3(EXT+x-8,3.2,lerp(18,22,u)),V3(EXT+x+1,3.2,lerp(5,11,u)),46);showOnly(['mom','leo']);S.shakeA=0.03;},
  house_lights:(u,t,lt)=>{mood('night');world.wins.forEach((w,i)=>{const on=lt>0.25+i*0.28;w.material.color.setHex(on?0xffb060:0x10131c);});world.headL.intensity=2;camAt(V3(EXT+lerp(-4,4,u),3,lerp(34,30,u)),V3(EXT,6.5,-2),40);showOnly([]);},
  window_wave:(u,t)=>{mood('night');const C=st('copy',WIN,4.6,-2.6,0,'default');C.armR.rotation.set(-2.7,0,-0.15+Math.sin(t*4)*0.3);C.armR.position.x=2.0;C.setFace('default');camAt(V3(WIN+lerp(0.3,0,u),8.4,lerp(11,7.5,ease(u))),V3(WIN,8.6,-2.4),36);showOnly(['copy']);world.copyStare=1;},
  grandma_house:(u,t)=>{mood('morning');world.gL.intensity=0.7;const M=st('mom',GMA+0.6,0,2.8,Math.PI*0.95,'sad');M.legL.rotation.x=-1.5;M.legR.rotation.x=-1.5;chars.mom.position.y=0.25;const P=st('leo',GMA+3.6,0,2.8,Math.PI*1.05,'sad');P.legL.rotation.x=-1.5;P.legR.rotation.x=-1.5;chars.leo.position.y=0.25;
    M.armR.rotation.set(-0.9,0,-0.7);P.armL.rotation.set(-0.9,0,0.7);camAt(V3(GMA+lerp(1,2.5,u),5.6,lerp(-6,-5,u)),V3(GMA+2,3.6,2.8),46);showOnly(['mom','leo']);},
  hand_hold:(u,t)=>{mood('morning');world.gL.intensity=0.7;const M=st('mom',GMA+0.6,0,2.8,Math.PI*0.95,'sad');M.legL.rotation.x=-1.5;M.legR.rotation.x=-1.5;chars.mom.position.y=0.25;const P=st('leo',GMA+3.6,0,2.8,Math.PI*1.05,'default');P.legL.rotation.x=-1.5;P.legR.rotation.x=-1.5;chars.leo.position.y=0.25;
    M.armR.rotation.set(-0.9,0,-0.7);P.armL.rotation.set(-0.9,0,0.7);const hp=lw0(P.armL,V3(0,-2,0.2));camAt(V3(GMA+2.1,4.4,lerp(-3.2,-2.2,u)),V3(GMA+2.1,3.4,2.8),40);showOnly(['mom','leo']);},
  new_note:(u,t)=>{mood('morning');world.gL.intensity=0.7;const n=V3(GMA-8,5.6,-6.7);camAt(V3(GMA-8+lerp(1.4,0.6,u),5.5,lerp(-2.6,-4.2,ease(u))),n,40);showOnly([]);},
  note_end:(u,t,lt)=>{mood('morning');world.gL.intensity=1.2-0.9*u;const n=V3(GMA-8,5.6,-6.7);camAt(V3(GMA-8+0.1,5.6,-6.7+lerp(1.9,1.25,ease(u))),n,34);showOnly([]);S.black=clamp((lt-(3.86-1.0))/0.8,0,1);S.heartbeat=1;},
};

/* ---------------- 2D overlays */
function T(text,x,y,size,fill,stroke,lw,align){og.font=`${size}px ${FONT}`;og.textAlign=align||'center';og.textBaseline='middle';og.lineJoin='round';if(stroke){og.lineWidth=lw||size*0.18;og.strokeStyle=stroke;og.strokeText(text,x,y);}og.fillStyle=fill;og.fillText(text,x,y);}
function RR(x,y,w,h,r){og.beginPath();og.moveTo(x+r,y);og.arcTo(x+w,y,x+w,y+h,r);og.arcTo(x+w,y+h,x,y+h,r);og.arcTo(x,y+h,x,y,r);og.arcTo(x,y,x+w,y,r);og.closePath();}
function drawPhoneUI(p){const w=W*0.46,h=w*1.9,x=W*0.27,y=H*0.1;og.save();og.shadowColor='rgba(80,255,140,0.35)';og.shadowBlur=W*0.05;og.fillStyle='#08090c';RR(x,y,w,h,w*0.13);og.fill();og.shadowBlur=0;
  const g2=og.createLinearGradient(0,y,0,y+h);g2.addColorStop(0,'#1a2a22');g2.addColorStop(1,'#0a0f0c');og.fillStyle=g2;RR(x+w*0.04,y+w*0.04,w*0.92,h-w*0.08,w*0.1);og.fill();
  og.fillStyle='#d6336c';og.beginPath();og.arc(W/2,y+h*0.25,w*0.17,0,7);og.fill();T('M',W/2,y+h*0.255,w*0.18,'#fff');
  og.font=`${w*0.11}px "Inter", sans-serif`;og.fillStyle='#fff';og.textAlign='center';og.fillText('Mom ❤',W/2,y+h*0.42);og.font=`${w*0.06}px "Inter", sans-serif`;og.fillStyle='#9ab0a0';og.fillText(p.talking?'00:0'+(Math.floor(p.t)%10):'incoming call…',W/2,y+h*0.48);
  if(!p.talking){const pulse=1+Math.sin(p.t*10)*0.08;[[0.3,'#e03131'],[0.7,'#2fbf5a']].forEach(([fx,c])=>{og.fillStyle=c;og.beginPath();og.arc(x+w*fx,y+h*0.82,w*0.11*(fx>0.5?pulse:1),0,7);og.fill();});}og.restore();}
function drawSplit(u){const k=easeOut(u*3);og.save();og.fillStyle='rgba(0,0,0,0.85)';og.fillRect(W*(1-0.5*k),0,W*0.5,H);og.fillStyle='#ffffff';og.fillRect(W*(1-0.5*k)-W*0.006,0,W*0.012,H);
  const x=W*(1-0.5*k)+W*0.25;og.globalAlpha=k;og.fillStyle='#08090c';RR(x-W*0.13,H*0.3,W*0.26,H*0.28,W*0.03);og.fill();og.strokeStyle='#2fbf5a';og.lineWidth=W*0.006;og.stroke();
  og.font=`${W*0.05}px "Inter", sans-serif`;og.fillStyle='#fff';og.textAlign='center';og.fillText('Mom ❤',x,H*0.4);og.fillStyle='#2fbf5a';og.font=`${W*0.035}px "Inter", sans-serif`;og.fillText('on call',x,H*0.45);og.restore();
  T('DOOR',W*0.25,H*0.2,W*0.08,'#ffb060','#000');T('PHONE',x,H*0.2,W*0.08,'#2fbf5a','#000');}
function drawCompare(c){const k=c.k;const pw=W*0.7,ph=pw*0.78;og.save();og.globalAlpha=k;og.fillStyle='rgba(0,0,0,0.6)';og.fillRect(0,0,W,H);
  const draw=(cv0,y,label,col)=>{og.save();og.translate(W/2,y);og.rotate(label==='NOTE'?-0.02:0.03);og.shadowColor='rgba(0,0,0,0.6)';og.shadowBlur=W*0.03;og.drawImage(cv0,-pw/2,-ph/2,pw,ph);og.restore();T(label,W*0.5,y-ph/2-H*0.02,W*0.05,col,'#000');};
  draw(world.listCanvas,H*0.24,"MOM'S LIST",'#ff8fb1');draw(world.noteCanvas,H*0.58,'THE NOTE','#ffffff');
  if(c.circ>0){og.strokeStyle='#ff2a2a';og.lineWidth=W*0.008;[[0.5,0.18],[0.5,0.52]].forEach(([fx,fy],i)=>{});
    const mk=(cv0,cy,rot)=>cv0.dots.map(([dx,dy])=>{const lx=(dx/512-0.5)*pw,ly=(dy/400-0.5)*ph;return [W/2+lx*Math.cos(rot)-ly*Math.sin(rot),cy+lx*Math.sin(rot)+ly*Math.cos(rot)];});
    const marks=mk(world.listCanvas,H*0.24,0.03).concat(mk(world.noteCanvas,H*0.58,-0.02));marks.forEach(([x,y],i)=>{og.beginPath();og.arc(x,y,W*0.03,-1.5,-1.5+6.3*clamp(c.circ*1.6-i*0.12,0,1));og.stroke();});}
  og.restore();}
function drawOverlays(t){
  // film look: vignette + grain + flicker
  const vg=og.createRadialGradient(W/2,H*0.48,H*0.25,W/2,H/2,H*0.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,`rgba(0,0,0,${world.mood==='morning'?0.3:0.62})`);og.fillStyle=vg;og.fillRect(0,0,W,H);
  if(S.phoneUI)drawPhoneUI(S.phoneUI);
  if(S.split!=null)drawSplit(S.split);
  if(S.compare)drawCompare(S.compare);
  if(S.tag){og.font=`${W*0.05}px ${FONT}`;const tw=og.measureText(S.tag).width+W*0.08;og.fillStyle='rgba(0,0,0,0.7)';RR((W-tw)/2,H*0.1,tw,H*0.05,H*0.025);og.fill();T(S.tag,W/2,H*0.127,W*0.05,'#ffd8a0');}
  const r=rng('gr'+Math.floor(t*24));og.fillStyle='rgba(255,255,255,0.05)';for(let i=0;i<420;i++){og.fillRect(r()*W,r()*H,1.6,1.6);}og.fillStyle='rgba(0,0,0,0.07)';for(let i=0;i<420;i++){og.fillRect(r()*W,r()*H,1.6,1.6);}
  if(world.mood!=='morning'){const fl=0.035*Math.max(0,Math.sin(t*37)*Math.sin(t*13));og.fillStyle=`rgba(0,0,0,${fl})`;og.fillRect(0,0,W,H);}
  og.fillStyle='#000';og.fillRect(0,0,W,H*0.012);og.fillRect(0,H*0.988,W,H*0.012);
  if(S.flash>0){og.fillStyle=`rgba(255,240,220,${S.flash})`;og.fillRect(0,0,W,H);}
  if(S.black>0){og.fillStyle=`rgba(0,0,0,${S.black})`;og.fillRect(0,0,W,H);}
}
function captionAt(t){for(const s of TL.segs){for(let i=0;i<s.words.length;i++){const w=s.words[i];const nx=s.words[i+1];const end=nx?nx.s:Math.min(w.e+0.25,s.end+0.25);if(t>=w.s&&t<end)return {w,since:t-w.s,who:s.who};}}return null;}
function drawCaption(t){const c=captionAt(t);if(!c)return;const text=c.w.w.toUpperCase();const base=W*0.105*(text.length>8?8/text.length*1.05:1);const k=c.since<0.05?lerp(1.12,1,c.since/0.05):1;
  og.save();og.translate(W/2,H*0.68);og.scale(k,k);og.font=`${base}px ${FONT}`;og.textAlign='center';og.textBaseline='middle';og.lineJoin='round';og.shadowColor='rgba(0,0,0,0.8)';og.shadowBlur=base*0.3;og.lineWidth=base*0.2;og.strokeStyle='#050507';og.strokeText(text,0,0);og.shadowColor='transparent';
  og.fillStyle=c.w.red?'#ff2e2e':(c.who==='phone'?'#7dffa8':c.who==='mom'?'#ffd0a0':'#ffffff');og.fillText(text,0,0);og.restore();}

/* ---------------- entry points */
S.init=async function(timeline,w,h,fontUrl){TL=timeline;W=w;H=h;SS=window.BH_SS||1.25;
  const ff=new FontFace('Luckiest Guy',`url(${fontUrl})`);await ff.load();document.fonts.add(ff);
  R=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});R.setPixelRatio(1);R.setSize(Math.round(W*SS),Math.round(H*SS));R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.15;R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
  cam=new THREE.PerspectiveCamera(40,W/H,0.1,2000);
  buildWorld();buildChars();world.noteCanvas=noteCanvas(['Never let Mom','in after midnight.'],false,'n');world.listCanvas=noteCanvas(['milk, cookies','for Leo :)'],true,'l');
  world.phL=new THREE.PointLight(0x7affb0,0,5,1.6);scene.add(world.phL);world.cpL=new THREE.PointLight(0x9ab8ff,0,4,1.6);scene.add(world.cpL);
  drawGlass(0,0);drawPhoneTex(false);
  const [oc,o2]=cv(W,H);out=oc;og=o2;og.imageSmoothingEnabled=true;og.imageSmoothingQuality='high';scene.updateMatrixWorld(true);return true;};
const KEYS=['flash','flash2','tag','phoneUI','split','compare','black','heartbeat','shakeA','zoomPunch'];
S.frame=function(f,q){const t=f/TL.fps;const shot=TL.shots.find(s=>t>=s.s&&t<s.e)||TL.shots[TL.shots.length-1];
  KEYS.forEach(k=>S[k]=null);world.mood=null;world.flick=0;world.phoneL=0;world.copyPhone=0;world.copyStare=0;
  world.porch.intensity=0;world.upL.intensity=0;world.upGlow.material.opacity=0;world.upPivot.rotation.y=0;world.doorPivot.rotation.y=0;world.doorG.position.x=4;world.lamp.intensity=0.5;world.lock.rotation.z=Math.PI/2;world.gL.intensity=0;world.headL.intensity=0;
  world.wins.forEach(w=>w.material.color.setHex(0x10131c));world.doorway.visible=false;world.stairL.intensity=0.5;Object.values(world.ph).forEach(p=>p.visible=false);drawGlass(0,t);
  if(shot!==curShot){curShot=shot;showOnly([]);}
  Object.values(chars).forEach(c=>{c.rotation.set(0,0,0);});
  const u=(t-shot.s)/(shot.e-shot.s),lt=t-shot.s;scene.updateMatrixWorld(true);
  (SH[shot.name]||SH.note_end)(u,t,lt);
  if(S.shakeA)shake(S.shakeA,t);
  world.phL.intensity=0;world.cpL.intensity=0;
  if(world.phoneL){const p=world.ph.leo.visible?lw0(world.ph.leo,V3(0,0,0.4)):V3(0,1.9,1);world.phL.position.copy(p);world.phL.intensity=1.2;}
  if(world.copyPhone){world.cpL.position.copy(lw0(world.ph.copy,V3(0,0,0.4)));world.cpL.intensity=1.4;}
  world.L.forEach(L=>{if(L===world.lamp&&world.mood==='night'&&L.intensity<1)L.intensity=0.5*(0.85+0.15*Math.sin(t*31)*Math.sin(t*7));});
  world.moon.target.position.copy(world.look);world.moon.position.copy(world.look).addScaledVector(world.sunDir,110);
  scene.updateMatrixWorld(true);R.render(scene,cam);
  const grade=world.mood==='morning'?'contrast(1.05) saturate(1.05)':world.mood==='dusk'?'contrast(1.08) saturate(0.95)':'contrast(1.12) saturate(0.78) brightness(0.98)';
  og.globalAlpha=1;og.globalCompositeOperation='source-over';og.filter=grade;
  if(S.zoomPunch){const z=1+0.06*S.zoomPunch;og.drawImage(R.domElement,(W-W*z)/2,(H-H*z)/2,W*z,H*z);}else og.drawImage(R.domElement,0,0,W,H);
  og.filter=`blur(${Math.round(W*0.016)}px) brightness(1.2)`;og.globalCompositeOperation='screen';og.globalAlpha=0.22;og.drawImage(R.domElement,0,0,W,H);og.filter='none';og.globalCompositeOperation='source-over';og.globalAlpha=1;
  if(world.mood!=='morning'){og.globalCompositeOperation='multiply';og.fillStyle='rgba(150,170,255,0.18)';og.fillRect(0,0,W,H);og.globalCompositeOperation='source-over';}
  drawOverlays(t);drawCaption(t);
  return out.toDataURL('image/jpeg',q||0.94);};
})();
