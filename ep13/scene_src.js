/* Episode 13 "The Mirror Rule" (horror, narrator Zash). A hallway with a silver heirloom mirror. The "mirror" is a
   real hole in the wall into a mirrored copy of the hallway, so the reflection is a second Zash that can act on its
   own: stare, fog the glass, slam the glass, smash out and tackle the pale thing behind him. Creature code is shared
   with Ep 10 (walker.js). ep13/scene.js = this + cast_ep13.js + walker.js (build_scene.py).
   Entry points: SAMPLE.init(timeline, W, H, fontUrl), SAMPLE.frame(f) */
(function(){
/*@CAST@*/
const S=window.SAMPLE={};
let TL,W,H,R,scene,cam,out,og,tmpC,tg,gC,gg,world={},chars={},curShot=null,SS=1.25;
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const lerp=(a,b,t)=>a+(b-a)*t,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);},easeOut=t=>1-Math.pow(1-clamp(t,0,1),3),easeIn=t=>Math.pow(clamp(t,0,1),2),eio=t=>{t=clamp(t,0,1);return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;};
const FONT='"Luckiest Guy", Impact, sans-serif';
const BED=80;                 // bedroom set x offset
const HZ=4.6;                 // where Zash stands in front of the mirror (z), reflection at -HZ
const SHARD=V3(4.2,0,8.4);    // the big shard on the floor

/* ---------------- textures */
function canvasTex(w,h,draw){const [c,g]=cv(w,h);draw(g,w,h);const t=tex(c);t._c=c;return t;}
function glowTex(col){return canvasTex(128,128,(g)=>{const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.3,col);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);});}
function plankTex(col){return canvasTex(256,256,(g,w,h)=>{fabricFill(g,0,0,w,h,col,'canvas');g.strokeStyle='rgba(0,0,0,0.3)';g.lineWidth=3;for(let y=0;y<h;y+=32){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}const r=rng('pl');for(let i=0;i<14;i++){const y=Math.floor(r()*8)*32,x=r()*w;g.beginPath();g.moveTo(x,y);g.lineTo(x,y+32);g.stroke();}});}
function paperTex(){return canvasTex(256,256,(g,w,h)=>{g.fillStyle='#4a5a48';g.fillRect(0,0,w,h);g.fillStyle='rgba(30,40,30,0.5)';for(let y=0;y<4;y++)for(let x=0;x<4;x++){const cx=x*64+(y%2)*32+16,cy=y*64+32;g.beginPath();g.ellipse(cx,cy,10,20,0,0,7);g.fill();g.beginPath();g.ellipse(cx,cy,20,8,0,0,7);g.fill();}
  g.fillStyle='rgba(255,240,200,0.06)';for(let x=0;x<w;x+=16)g.fillRect(x,0,2,h);g.fillStyle='#2e241a';g.fillRect(0,h-30,w,30);});}
function plaqueTex(){return canvasTex(512,640,(g,w,h)=>{g.fillStyle='#d8ccae';g.fillRect(0,0,w,h);g.strokeStyle='#5a4a2a';g.lineWidth=14;g.strokeRect(16,16,w-32,h-32);g.lineWidth=3;g.strokeRect(40,40,w-80,h-80);
  g.fillStyle='#2a2216';g.textAlign='center';g.font='bold 40px "DejaVu Serif", Georgia, serif';g.fillText('TOWN LAW',w/2,120);g.font='bold 30px "DejaVu Serif", Georgia, serif';g.fillText('ARTICLE 1',w/2,175);
  g.font='34px "DejaVu Serif", Georgia, serif';['LOOK INTO YOUR','MIRROR BEFORE','YOU LEAVE.'].forEach((s,i)=>g.fillText(s,w/2,250+i*46));g.fillStyle='#8a1a12';g.font='bold 30px "DejaVu Serif", Georgia, serif';['BREAKING A MIRROR','IS PUNISHABLE','BY DEATH.'].forEach((s,i)=>g.fillText(s,w/2,440+i*44));});}
function frameTex(){return canvasTex(256,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,'#f2f2f4');gr.addColorStop(0.5,'#9a9aa2');gr.addColorStop(1,'#e2e2e6');g.fillStyle=gr;g.fillRect(0,0,w,h);g.strokeStyle='rgba(60,60,70,0.6)';g.lineWidth=4;for(let i=0;i<8;i++){g.beginPath();g.arc(w/2,h/2,20+i*16,i,i+2.5);g.stroke();}});}
function fogTex(){return canvasTex(256,256,(g,w,h)=>{const gr=g.createRadialGradient(128,128,10,128,128,128);gr.addColorStop(0,'rgba(235,240,245,0.85)');gr.addColorStop(0.6,'rgba(220,228,235,0.5)');gr.addColorStop(1,'rgba(220,228,235,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);const r=rng('fog');g.fillStyle='rgba(255,255,255,0.4)';for(let i=0;i<60;i++){g.beginPath();g.arc(64+r()*128,64+r()*128,1+r()*3,0,7);g.fill();}});}
function inkTex(){return canvasTex(256,256,(g,w,h)=>{g.fillStyle='rgba(6,4,10,0.95)';const r=rng('ink');for(let i=0;i<18;i++){g.beginPath();g.ellipse(128+(r()-0.5)*110,128+(r()-0.5)*110,10+r()*40,8+r()*30,r()*3,0,7);g.fill();}});}
const SHARD_PTS=[[-1.9,-1.4],[1.6,-1.7],[2.1,0.4],[0.6,1.8],[-1.5,1.2]];
function shardHoleTex(){return canvasTex(512,512,(g,w,h)=>{g.fillStyle='#fff';g.fillRect(0,0,w,h);g.fillStyle='#000';g.beginPath();SHARD_PTS.forEach(([x,y],i)=>{const px=w/2+x/5*w,py=h/2-y/5*h;i?g.lineTo(px,py):g.moveTo(px,py);});g.closePath();g.fill();});}

const SM=(o)=>new THREE.MeshStandardMaterial(o);
function cst(m){m.castShadow=true;m.receiveShadow=true;return m;}
function box(w,h,d,mat,x,y,z,parent){const m=cst(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat.isMaterial?mat:SM({color:mat,roughness:0.85})));m.position.set(x,y,z);(parent||scene).add(m);return m;}
function sprite(t,s,parent,op){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,opacity:op==null?1:op}));m.scale.set(s,s,1);(parent||scene).add(m);return m;}
function pl(col,int,dist,x,y,z,parent){const L=new THREE.PointLight(col,int,dist,1.6);L.position.set(x,y,z);(parent||scene).add(L);return L;}
function plane(w,h,mat,x,y,z,rx,parent){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);m.position.set(x,y,z);m.rotation.x=rx||0;m.receiveShadow=true;(parent||scene).add(m);return m;}

/*@WALKER@*/

/* ---------------- world */
function buildRoom(g,side){ // side=+1 real hallway (z>0), -1 the mirrored copy (z<0). Built in +z and flipped.
  const pm=SM({map:plankTex('#6a4a30'),roughness:0.9});const wm=SM({map:paperTex(),roughness:0.95});const cm=SM({color:'#d8d0c0',roughness:1});
  const fl=plane(26,18,pm,0,0,9,-Math.PI/2,g);fl.material.map.wrapS=fl.material.map.wrapT=THREE.RepeatWrapping;fl.material.map.repeat.set(4,3);
  // floor around the shard pit (real side only): pit spans x 1.7..6.7, z 6.0..10.8
  if(side>0){g.remove(fl);const P=[[-13,1.7,0,18],[6.7,13,0,18],[1.7,6.7,0,6.0],[1.7,6.7,10.8,18]];P.forEach(([x0,x1,z0,z1])=>{const m=plane(x1-x0,z1-z0,SM({map:plankTex('#6a4a30'),roughness:0.9}),(x0+x1)/2,0,(z0+z1)/2,-Math.PI/2,g);});}
  plane(26,18,cm,0,14,9,Math.PI/2,g);
  [-13,13].forEach(x=>{const w=plane(18,14,wm,x,7,9,0,g);w.rotation.y=x<0?Math.PI/2:-Math.PI/2;});
  // back wall (far end) with a doorway into a dark corridor
  const bw=(w,h,x,y)=>{const m=box(w,h,0.6,wm,x,y,18.3,g);return m;};bw(10.5,14,-7.75,7);bw(10.5,14,7.75,7);bw(5,5,0,11.5);
  box(5,9,12,SM({color:'#14121a',roughness:1,side:THREE.BackSide}),0,4.5,24.6,g);box(0.4,9.4,0.7,'#2a1e14',-2.6,4.7,18.3,g);box(0.4,9.4,0.7,'#2a1e14',2.6,4.7,18.3,g);box(5.6,0.4,0.7,'#2a1e14',0,9.4,18.3,g);
  // mirror wall (z=0) with the mirror hole x -2.6..2.6, y 1.0..10.4 and the front door at x=8
  const mw=(w,h,x,y)=>box(w,h,0.5,wm,x,y,0.25,g);mw(10.4,14,-7.8,7);mw(3.4,14,4.3,7);mw(2.6,14,11.7,7);mw(5.2,1.0,0,0.5);mw(5.2,3.6,0,12.2);mw(4.6,4.6,8.3,11.7);
  const door=box(4.6,9.4,0.4,SM({map:plankTex('#4a2a1a'),roughness:0.8}),8.3,4.7,0.3,g);box(0.3,0.3,0.5,'#c8a040',6.6,4.6,0.6,g);
  // window on the left wall (moonlight / sirens)
  const win=box(0.3,4,5,SM({color:'#1a2a48',emissive:0x2a3a68,emissiveIntensity:0.6}),-12.8,7.5,10,g);
  // side table + lamp + photo of grandma
  box(3,0.3,2,'#3a2416',-8,4,2.2,g);[[-9.2,1.3],[-6.8,1.3],[-9.2,3.1],[-6.8,3.1]].forEach(([x,z])=>box(0.25,4,0.25,'#2a1a10',x,2,z,g));
  const lamp=new THREE.Mesh(new THREE.ConeGeometry(0.9,1.4,12,1,true),SM({color:'#e8d2a0',emissive:0xffc070,emissiveIntensity:0.6,side:THREE.DoubleSide}));lamp.position.set(-8,6.4,2.2);g.add(lamp);box(0.15,2,0.15,'#3a2a1a',-8,5,2.2,g);
  return {win,door};}
function buildWorld(){
  scene=new THREE.Scene();scene.background=new THREE.Color('#050406');scene.fog=new THREE.Fog(0x050406,30,90);
  world.hemi=new THREE.HemisphereLight(0xfff0dc,0x302820,0.5);scene.add(world.hemi);
  world.look=V3(0,0,0);
  const real=new THREE.Group();scene.add(real);world.real=buildRoom(real,1);
  const mir=new THREE.Group();mir.scale.z=-1;scene.add(mir);world.mir=buildRoom(mir,-1);world.mirG=mir;
  world.lampL=pl(0xffc27a,1.2,40,-8,6.2,2.6);world.lampLm=pl(0xffc27a,1.2,40,-8,6.2,-2.6);
  world.keyR=pl(0xfff0e0,1.0,20,0.5,8.5,1.6);world.keyM=pl(0xfff0e0,1.0,20,0.5,8.5,-1.6);
  world.moon=pl(0x6a8adc,0,60,-10,8,10);world.moonM=pl(0x6a8adc,0,60,-10,8,-10);
  world.siren=pl(0xff2020,0,80,-11,8,10);world.sirenM=pl(0xff2020,0,80,-11,8,-10);
  world.under=pl(0xbfc8ff,0,10,0,3.5,-1.6);world.corr=pl(0x9aa8d8,0,16,0,7,21);
  // ornate silver frame on both faces of the hole
  const fm=SM({map:frameTex(),roughness:0.25,metalness:0.85,color:0xdedee4});
  [1,-1].forEach(sd=>{const fz=sd*0.62;box(0.7,10.2,0.35,fm,-2.95,5.7,fz);box(0.7,10.2,0.35,fm,2.95,5.7,fz);box(6.6,0.7,0.35,fm,0,10.75,fz);box(6.6,0.7,0.35,fm,0,0.65,fz);
    const crest=new THREE.Mesh(new THREE.TorusGeometry(0.9,0.22,8,20,Math.PI),fm);crest.position.set(0,11.1,fz);scene.add(crest);
    [-2.95,2.95].forEach(x=>{const k=new THREE.Mesh(new THREE.SphereGeometry(0.42,12,10),fm);k.position.set(x,10.75,fz);scene.add(k);});});
  world.glass=plane(5.4,9.6,new THREE.MeshStandardMaterial({color:0xdde6ee,transparent:true,opacity:0.07,roughness:0.05,metalness:0.6,depthWrite:false,side:THREE.DoubleSide}),0,5.7,0.0);
  world.glassSheen=plane(5.4,9.6,new THREE.MeshBasicMaterial({map:canvasTex(256,512,(g,w,h)=>{const gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(0.42,'rgba(255,255,255,0)');gr.addColorStop(0.5,'rgba(255,255,255,0.16)');gr.addColorStop(0.58,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);}),transparent:true,depthWrite:false}),0,5.7,0.03);
  world.fog=plane(3.2,3.2,new THREE.MeshBasicMaterial({map:fogTex(),transparent:true,depthWrite:false,opacity:0}),0,5.6,0.06);
  world.cracks=plane(5.4,9.6,new THREE.MeshBasicMaterial({map:canvasTex(256,512,(g)=>{g.strokeStyle='rgba(230,235,245,0.9)';g.lineWidth=2.5;const r=rng('crk');for(let i=0;i<14;i++){let a=i/14*Math.PI*2,x=128,y=230;g.beginPath();g.moveTo(x,y);for(let k=0;k<7;k++){a+=(r()-0.5)*0.6;x+=Math.cos(a)*26;y+=Math.sin(a)*26;g.lineTo(x,y);}g.stroke();}}),transparent:true,depthWrite:false}),0,5.7,0.08);world.cracks.visible=false;
  world.voidP=plane(5.4,9.6,SM({color:'#020203',roughness:1}),0,5.7,-0.35);world.voidP.visible=false;
  // the sheet (over the mirror, then torn on the floor) + tape strips
  const shm=SM({map:canvasTex(256,256,(g,w,h)=>{fabricFill(g,0,0,w,h,'#e8e4dc','cotton');g.strokeStyle='rgba(0,0,0,0.12)';g.lineWidth=6;for(let i=0;i<6;i++){g.beginPath();g.moveTo(i*45,0);g.quadraticCurveTo(i*45+20,h/2,i*45-10,h);g.stroke();}}),roughness:0.95,side:THREE.DoubleSide});
  world.sheet=plane(7.2,11.4,shm,0,5.7,0.9);world.sheet.visible=false;
  world.sheetFloor=new THREE.Mesh(new THREE.DodecahedronGeometry(1.6,1),shm);world.sheetFloor.scale.set(2.2,0.35,1.5);world.sheetFloor.position.set(1.2,0.4,2.8);scene.add(world.sheetFloor);world.sheetFloor.visible=false;
  world.tape=[];[[0,11.3,6.6,0.5],[0,0.15,6.6,0.5],[-3.45,5.7,0.5,11],[3.45,5.7,0.5,11]].forEach(([x,y,w,h])=>{const t=box(w,h,0.06,SM({color:'#c8b890',roughness:0.7}),x,y,1.0);t.visible=false;world.tape.push(t);});
  world.plaque=plane(2.6,3.25,SM({map:plaqueTex(),roughness:0.6}),-5.0,6.6,0.62);box(2.9,3.55,0.12,'#3a2a14',-5,6.6,0.48);
  // shard on the floor: a cut-out patch over a pit that holds the mirror-world (reflection lies at the bottom)
  const pit=new THREE.Group();pit.position.copy(SHARD);scene.add(pit);world.pit=pit;
  const ptm=SM({map:plankTex('#6a4a30'),roughness:0.9});const pw=SM({map:paperTex(),roughness:0.95,side:THREE.BackSide});
  const pb=new THREE.Mesh(new THREE.BoxGeometry(5,9,4.8),pw);pb.position.set(0,-4.5,0);pit.add(pb);plane(5,4.8,ptm,0,-8.9,0,-Math.PI/2,pit);
  const patch=new THREE.Mesh(new THREE.PlaneGeometry(5,4.8),SM({map:plankTex('#6a4a30'),alphaMap:shardHoleTex(),alphaTest:0.5,roughness:0.9}));patch.rotation.x=-Math.PI/2;patch.position.set(0,0.01,0);pit.add(patch);world.patch=patch;
  const shp=new THREE.Shape();SHARD_PTS.forEach(([x,y],i)=>i?shp.lineTo(x,y):shp.moveTo(x,y));
  world.shardGlass=new THREE.Mesh(new THREE.ShapeGeometry(shp),new THREE.MeshStandardMaterial({color:0xe8eef6,transparent:true,opacity:0.12,roughness:0.05,metalness:0.7,depthWrite:false}));world.shardGlass.rotation.x=-Math.PI/2;world.shardGlass.position.y=0.04;pit.add(world.shardGlass);
  const edge=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(SHARD_PTS.map(([x,y])=>V3(x,0.06,-y))),new THREE.LineBasicMaterial({color:0xf2f6ff}));pit.add(edge);
  world.ink=plane(4,4,new THREE.MeshBasicMaterial({map:inkTex(),transparent:true,depthWrite:false}),0,-8.85,0,-Math.PI/2,pit);
  world.pitL=pl(0xc8d0ff,0,14,0,-3,0,pit);pit.visible=false;
  // flying + fallen glass shards
  world.shards=[];const sm=new THREE.MeshStandardMaterial({color:0xeef2f8,roughness:0.05,metalness:0.85,transparent:true,opacity:0.85,side:THREE.DoubleSide});const r=rng('sh');
  for(let i=0;i<46;i++){const a=0.25+r()*0.6;const sh=new THREE.Shape();sh.moveTo(0,0);sh.lineTo(a,r()*0.3);sh.lineTo(r()*a*0.6,a*(0.8+r()));const m=new THREE.Mesh(new THREE.ShapeGeometry(sh),sm);m.visible=false;scene.add(m);
    m.userData={p0:V3((r()-0.5)*5,1.4+r()*8.6,0),v:V3((r()-0.5)*9,(r()-0.2)*5,4+r()*10),spin:V3(r()*9,r()*9,r()*9),fl:V3((r()-0.5)*10,0.05,1+r()*8),fr:r()*6};world.shards.push(m);}
  buildBedroom();buildProps();
  world.T={glow:glowTex('rgba(150,190,255,0.8)'),soul:glowTex('rgba(140,200,255,0.7)'),red:glowTex('rgba(255,40,40,0.9)')};
  world.soul=sprite(world.T.soul,9,scene,0);world.soul.position.set(0,6,-4.8);
  world.walker=makeWalker();world.walker.scale.setScalar(0.66);
  world.eyes=[-1,1].map(s=>{const e=sprite(glowTex('rgba(255,250,220,0.95)'),0.45,scene);e.visible=false;return e;});
}
function buildBedroom(){const g=new THREE.Group();g.position.set(BED,0,0);scene.add(g);world.bedroom=g;
  plane(24,20,SM({map:plankTex('#5a3e28'),roughness:0.9}),0,0,0,-Math.PI/2,g);const wm=SM({map:paperTex(),roughness:0.95});plane(24,14,wm,0,7,-6,0,g);const sw=plane(20,14,wm,-9,7,2,0,g);sw.rotation.y=Math.PI/2;
  box(6,1.4,10,'#3a2416',-2,0.9,0,g);box(5.6,0.8,9.6,'#e8e2d6',-2,1.9,0,g);box(6.2,4,0.5,'#3a2416',-2,2.2,-5,g);box(2.6,0.6,1.6,'#f4f0e8',-2,2.6,-3.6,g);
  world.blanket=box(5.8,0.5,6,SM({color:'#3a4a7a',roughness:0.95}),-2,2.45,1.6,g);
  const win=box(4,4.5,0.2,SM({color:'#1a2a48',emissive:0x3a5a98,emissiveIntensity:0.8}),5,7.5,-5.85,g);box(0.25,4.7,0.3,'#2a1e14',5,7.5,-5.8,g);box(4.2,0.25,0.3,'#2a1e14',5,7.5,-5.8,g);
  world.bedMoon=pl(0x7a9ae8,0,40,BED+5,8,-2);}
function buildProps(){const h=new THREE.Group();const hd=box(1.3,0.5,0.5,SM({color:'#4a4a52',metalness:0.8,roughness:0.35}),0,2.3,0,h);const hn=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.15,2.6,8),SM({color:'#7a4a28',roughness:0.7}));hn.position.y=1.0;h.add(hn);
  box(0.4,0.35,0.4,SM({color:'#4a4a52',metalness:0.8,roughness:0.35}),-0.8,2.3,0,h);scene.add(h);h.visible=false;world.hammer=h;
  // standalone pale arm (the hand over his mouth) + hand props for the final touch
  const pm=SM({map:skinTex(),roughness:0.88});const arm=new THREE.Group();const fa=cst(new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.24,6,10),pm));fa.rotation.x=Math.PI/2;fa.position.z=-3;arm.add(fa);
  const hand=makeHand(pm,0.9);hand.rotation.x=-Math.PI/2;arm.add(hand);world.paleHand=hand;scene.add(arm);arm.visible=false;world.paleArm=arm;
  const zs=BH.castById('leo').skin||'#e8b98f';
  const mk=(col,sleeve)=>{const g=new THREE.Group();box(1.0,0.26,1.3,SM({color:col,roughness:0.6}),0,0,0,g);const sl=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,3,10),SM({color:sleeve,roughness:0.9}));sl.rotation.x=Math.PI/2;sl.position.z=2.1;g.add(sl);scene.add(g);g.visible=false;return g;};
  world.myHand=mk(zs,'#1e2638');world.refHand=mk(zs,'#1e2638');const blood=box(0.9,0.3,0.9,SM({color:'#9a0a0a',emissive:0x5a0000,emissiveIntensity:0.8,roughness:0.4}),0.05,0.01,0.1,world.refHand);blood.scale.set(0.9,1,0.7);}
function hideAll(){world.sheet.visible=false;world.sheetFloor.visible=false;world.tape.forEach(t=>t.visible=false);world.fog.material.opacity=0;world.cracks.visible=false;world.voidP.visible=false;world.glass.visible=true;world.glassSheen.visible=true;
  world.pit.visible=false;world.pitL.intensity=0;world.patch.visible=true;world.shards.forEach(s=>s.visible=false);world.hammer.visible=false;world.paleArm.visible=false;world.myHand.visible=false;world.refHand.visible=false;world.walker.visible=false;world.walker.scale.setScalar(0.66);
  world.soul.material.opacity=0;world.under.intensity=0;world.corr.intensity=0;world.walker.position.y=0;world.eyes.forEach(e=>e.visible=false);}

/* ---------------- characters */
function buildChars(){const add=(id,cid)=>{const g=buildChar(BH.castById(cid));scene.add(g);g.visible=false;chars[id]=g;return g;};add('me','leo');add('ref','leo');
  Object.values(chars).forEach(c=>c.traverse(o=>{if(o.isMesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m&&m.isMeshStandardMaterial&&m.metalness<0.3&&m.roughness<0.9)m.roughness=0.92;});}));}
function showOnly(ids){Object.keys(chars).forEach(k=>chars[k].visible=ids.includes(k));}
function reset(P){['armL','armR','legL','legR','head'].forEach(k=>P[k].rotation.set(0,0,0));P.torso.rotation.set(0,0,0);P.torso.position.y=0;P.torso.scale.set(1,1,1);P._anim=null;}
function st(id,x,y,z,ry,e){const c=chars[id];c.position.set(x,y,z);c.rotation.set(0,ry||0,0);c.visible=true;const P=c.userData.P;reset(P);P._e=e||'default';P._o={};P._noIdle=false;P.setFace(P._e);return P;}
function face(P,e,o){P._e=e;P._o=o||{};}
function kneel(P){P.legL.rotation.x=-0.2;P.legR.rotation.x=-1.4;P.torso.rotation.x=0.25;}
function lw0(o,v){let r=o;while(r.parent&&r.parent!==scene)r=r.parent;r.updateMatrixWorld(true);return o.localToWorld(v);}
const head=id=>lw0(chars[id].userData.P.head,V3(0,0.6,0));
const faceCam=(id,x,y,d)=>lw0(chars[id].userData.P.head,V3(x,0.6+y,d));
const handOf=(id,arm)=>lw0(chars[id].userData.P[arm||'armR'],V3(0,-2.1,0.2));
// the reflection copies Zash like a mirror: z flipped, left/right limbs swapped, y/z rotations negated
function mirrorOf(){const a=chars.me,b=chars.ref,A=a.userData.P,B=b.userData.P;b.visible=true;b.position.set(a.position.x,a.position.y,-a.position.z);b.rotation.set(-a.rotation.x,Math.PI-a.rotation.y,-a.rotation.z);
  const cp=(s,d)=>{d.rotation.set(s.rotation.x,-s.rotation.y,-s.rotation.z);};cp(A.armL,B.armR);cp(A.armR,B.armL);cp(A.legL,B.legR);cp(A.legR,B.legL);cp(A.head,B.head);cp(A.torso,B.torso);B.torso.position.y=A.torso.position.y;B._e=A._e;B._o=A._o;B._noIdle=true;B._mirror=true;return B;}
function act(t){Object.entries(chars).forEach(([id,c],i)=>{if(!c.visible)return;const P=c.userData.P;if(!P._noIdle){const ph=i*1.7;P.torso.scale.y=1+0.012*Math.sin(t*2.4+ph);P.head.rotation.x+=0.025*Math.sin(t*0.9+ph);P.head.rotation.y+=0.04*Math.sin(t*0.6+ph);}
  const o=Object.assign({},P._o||{});if(o.blink==null)o.blink=((t+i*0.9)%3.4)<0.1;P.setFace(P._e,o);});
  if(chars.ref.visible&&chars.ref.userData.P._mirror&&chars.me.visible){const A=chars.me.userData.P,B=chars.ref.userData.P;B.head.rotation.set(A.head.rotation.x,-A.head.rotation.y,-A.head.rotation.z);B.torso.scale.copy(A.torso.scale);}}

/* ---------------- camera kit */
function camAt(p,l,fov){cam.position.copy(p);cam.up.set(0,1,0);cam.lookAt(l);cam.fov=fov||40;cam.updateProjectionMatrix();world.look.copy(l);}
function dolly(p0,p1,l0,l1,u,f0,f1){const k=eio(u);camAt(p0.clone().lerp(p1,k),l0.clone().lerp(l1,k),lerp(f0||40,f1||f0||40,k));}
function cu(id,d,x,y,fov,u,push){const hp=head(id);const dd=d*(1-(push||0.12)*eio(u||0));camAt(faceCam(id,x,y,dd*1.75),hp.clone().add(V3(0,-0.1,0)),fov||34);S.focus=focusOf(id);}
function ots(u,fov,push){const hp=head('ref');const p0=V3(1.9,7.4,HZ+5.2),p1=p0.clone().lerp(hp,push||0.15);dolly(p0,p1,hp.clone().add(V3(0,-0.4,0)),hp.clone().add(V3(0,-0.3,0)),u,fov||34,(fov||34)-2);S.focus=focusOf('ref');}
function handheld(t,a){cam.position.x+=(Math.sin(t*1.3)+Math.sin(t*2.9)*0.5)*a;cam.position.y+=(Math.sin(t*1.7+1)+Math.sin(t*3.3)*0.4)*a*0.7;}
function shake(a,t){cam.position.x+=Math.sin(t*23.1)*a+Math.sin(t*41.7)*a*0.5;cam.position.y+=Math.cos(t*19.3)*a;}
function focusOf(id){cam.updateMatrixWorld(true);const p=head(id).clone().add(V3(0,-0.6,0)).project(cam);return {x:(p.x+1)/2,y:(1-p.y)/2,r:0.34};}
function mood(m,t){world.mood=m;const night=m!=='warm';
  world.hemi.color.setHex(night?0x6a7ab8:0xfff0dc);world.hemi.intensity={warm:0.55,cold:0.4,night:0.16,dark:0.08,sirens:0.12}[m];
  const lamp={warm:1.3,cold:0.9,night:0.25,dark:0.1,sirens:0}[m];world.lampL.intensity=world.lampLm.intensity=lamp;
  const key={warm:0.9,cold:0.7,night:0.35,dark:0.2,sirens:0.15}[m];world.keyR.intensity=world.keyM.intensity=key;world.keyR.color.setHex(night?0x9ab0ff:0xfff0e0);world.keyM.color.setHex(night?0x9ab0ff:0xfff0e0);
  world.moon.intensity=world.moonM.intensity=night?(m==='sirens'?0.3:1.0):0;
  const sOn=m==='sirens';const ph=Math.floor((t||0)*3.2)%2;world.siren.intensity=world.sirenM.intensity=sOn?2.6:0;world.siren.color.setHex(ph?0xff2020:0x2050ff);world.sirenM.color.setHex(ph?0xff2020:0x2050ff);
  world.real.win.material.emissive.setHex(sOn?(ph?0xff2020:0x2050ff):0x2a3a68);world.real.win.material.emissiveIntensity=sOn?1.4:(night?0.8:0.3);world.bedMoon.intensity=night?1.4:0;}

/* ---------------- shots */
function me(e,o){const P=st('me',0,0,HZ,Math.PI,e);if(o)face(P,e,o);return P;}
function refFree(e,z){const P=st('ref',0,0,z==null?-HZ:z,0,e);P._noIdle=false;P._mirror=false;return P;}
function wave(P,t){P.armR.rotation.set(0,0,2.5+Math.sin(t*9)*0.35);}
function slam(t){return Math.max(0,Math.sin(t*9));}
function walkerBehind(t,z,lean){const P=wStand(0.6,0,z,Math.PI,t,{tilt:0.5,headX:lean==null?0.4:lean});P.torso.rotation.x=0.55;P.neck.rotation.x=0.5;return P;}
const SH={
  mirror_eyes:(u,t)=>{mood('night',t);me('shocked',{mouthOpen:0.3});const R=refFree('smug');R._noIdle=true;face(R,'smug',{blink:false});world.under.intensity=2.2;world.soul.material.opacity=0.12;
    const hp=head('ref');dolly(V3(1.6,7.1,HZ+4.6),V3(1.1,6.9,HZ+3.0),hp.clone().add(V3(0,-0.3,0)),hp.clone().add(V3(0,-0.2,0)),u,32,26);S.focus=focusOf('ref');showOnly(['me','ref']);S.vign=0.7;S.flash=u<0.06?0.5:0;},
  town_mirrors:(u,t)=>{mood('cold',t);me('default');const R=mirrorOf();world.soul.material.opacity=0.55+0.15*Math.sin(t*3);world.soul.position.set(0,6.2,-HZ-0.4);world.soul.scale.setScalar(8+Math.sin(t*2));
    dolly(V3(-3,6,15),V3(-1.4,6.2,11),V3(0,5.8,-HZ),V3(0,5.8,-HZ),u,40,34);showOnly(['me','ref']);S.sparkle=1;},
  blink_cu:(u,t,lt)=>{mood('night',t);me('default',{blink:false});const R=refFree('default');R._noIdle=true;const b=lt>0.6&&lt<0.85;face(R,'default',{blink:b});world.under.intensity=1.2;
    cu('ref',4.0,0,0,30,u,0.3);showOnly(['ref']);S.vign=0.7;S.zoomPunch=b?0.6:0;},
  hall_wide:(u,t)=>{mood('warm',t);const P=st('me',lerp(-7,-1.5,u),0,lerp(10,HZ+1,u),Math.PI*0.85,'happy');BH.animate(P,t,{motion:'walk',blend:0.01,face:false});P._noIdle=true;mirrorOf();
    dolly(V3(11,7.5,15),V3(10,7,13),V3(-2,5,3),V3(0,5,2),u,46,44);showOnly(['me','ref']);},
  law_sign:(u,t)=>{mood('warm',t);dolly(V3(-4.2,6.9,5.5),V3(-4.8,6.7,3.6),V3(-5,6.6,0.5),V3(-5,6.6,0.5),u,40,38);showOnly([]);},
  frame_cu:(u,t)=>{mood('warm',t);me('happy');mirrorOf();dolly(V3(0.6,8.2,HZ+10),V3(0.4,7.6,HZ+7.5),V3(0,8.4,0),V3(0,7,0),u,42,40);showOnly(['me','ref']);S.sparkle=1;S.grade='warm';},
  smile_sync:(u,t)=>{mood('warm',t);me('happy');mirrorOf();ots(u,34,0.2);showOnly(['me','ref']);S.grade='warm';},
  wave_sync:(u,t)=>{mood('warm',t);const P=me('happy');wave(P,t);mirrorOf();dolly(V3(8,7,9),V3(7,7,8),V3(0,6,0),V3(0,6,0),u,44,42);showOnly(['me','ref']);S.grade='warm';},
  tuesday_card:(u,t)=>{mood('cold',t);me('default');mirrorOf();camAt(V3(0,6,HZ+11),V3(0,6,0),42);showOnly(['me','ref']);S.card={text:'TUESDAY',sub:'7:42 AM',k:u};},
  tie_shoes:(u,t)=>{mood('cold',t);const P=me('default');kneel(P);P.armR.rotation.set(-0.9,0,0);P.armL.rotation.set(-0.9,0,0);P.head.rotation.x=0.4;const R=mirrorOf();
    dolly(V3(0.8,3.4,-0.6),V3(0.6,3.6,-0.2),V3(0,2.4,HZ),V3(0,2.8,HZ),u,50,46);showOnly(['me']);},
  smile_up:(u,t)=>{mood('cold',t);me('happy');const R=refFree('default');R._noIdle=true;R.head.rotation.x=0.25;cu('me',3.8,0.2,0,32,u,0.18);showOnly(['me','ref']);},
  stare_throat:(u,t)=>{mood('cold',t);me('happy');const R=refFree('default');R._noIdle=true;R.head.rotation.x=0.28;R.torso.scale.y=1+0.03*Math.sin(t*5);R.torso.scale.z=1+0.04*Math.sin(t*5);face(R,'default',{blink:false,mouthOpen:0.35+0.25*Math.sin(t*5)});
    ots(u,30,0.3);showOnly(['me','ref']);S.vign=0.6;S.grade='cold';},
  fog_glass:(u,t)=>{mood('cold',t);me('shocked');const R=refFree('default',-1.8);R._noIdle=true;R.head.rotation.x=0.2;face(R,'default',{blink:false,mouthOpen:0.5+0.3*Math.sin(t*5)});const mp=head('ref');
    world.fog.position.set(mp.x,mp.y-0.7,0.06);world.fog.material.opacity=clamp(0.6+u*0.4+0.1*Math.sin(t*5),0,1);world.fog.scale.setScalar(0.9+u*0.8);camAt(V3(0.6,mp.y-0.3,3.4),V3(0,mp.y-0.5,-1),36);S.focus={x:0.5,y:0.5,r:0.3};showOnly(['me','ref']);S.grade='cold';},
  sheet_throw:(u,t,lt)=>{mood('cold',t);const P=me('shocked');P.armL.rotation.set(-2.6+lt,0,0.3);P.armR.rotation.set(-2.6+lt,0,-0.3);const k=easeOut(lt/0.7);world.sheet.visible=true;world.sheet.position.set(0,lerp(9,5.7,k),lerp(3.5,0.9,k));world.sheet.rotation.x=lerp(-0.9,0,k);
    refFree('angry');dolly(V3(7,6,12),V3(6.4,6.2,11),V3(0,5.6,1),V3(0,5.6,1),u,46,44);showOnly(['me','ref']);S.whip=1;},
  tape:(u,t,lt)=>{mood('cold',t);world.sheet.visible=true;world.tape.forEach((tp,i)=>tp.visible=lt>i*0.25);dolly(V3(4,6.5,16.5),V3(3,6.4,15),V3(0,6,0.9),V3(0,5.8,0.9),u,50,48);showOnly([]);},
  wake_up:(u,t,lt)=>{mood('night',t);const k=easeOut((lt-0.5)/0.6);const P=st('me',BED-2,2.2,-1.2,0,k>0?'shocked':'default');P.legL.rotation.x=-1.5;P.legR.rotation.x=-1.5;P.torso.rotation.x=lerp(-1.4,0,k);face(P,k>0?'shocked':'default',{blink:k<=0,mouthOpen:k>0?0.4:0});P._noIdle=true;
    dolly(V3(BED+4,9,11),V3(BED+3,8.8,9.5),V3(BED-2,6.4,-1.2),V3(BED-2,6.8,-1.2),u,48,44);showOnly(['me']);S.vign=0.7;S.shakeA=k>0&&k<1?0.06:0;},
  sheet_floor:(u,t)=>{mood('night',t);world.sheetFloor.visible=true;refFree('angry',-2);dolly(V3(2.5,1.0,HZ+8),V3(2.0,1.6,HZ+5),V3(0.4,1.5,0),V3(0,3.5,0),u,46,42);showOnly(['ref']);S.vign=0.75;},
  palms_slam:(u,t)=>{mood('night',t);world.sheetFloor.visible=true;const sl=slam(t);const R=refFree('angry',-1.15-sl*0.25);R._noIdle=true;R.armL.rotation.set(-1.65,0,0.25);R.armR.rotation.set(-1.65,0,-0.25);face(R,'angry',{mouthOpen:0.7});world.under.intensity=1.3;
    {const hp=head('ref');camAt(hp.clone().add(V3(0.4,0.4,4.2)),hp.clone().add(V3(0,-0.9,0)),50);};showOnly(['ref']);S.shakeA=sl>0.9?0.08:0.01;S.flash=sl>0.97?0.12:0;S.vign=0.65;},
  mouth_run:(u,t,lt)=>{mood('night',t);const R=refFree('shocked',-1.2);R._noIdle=true;R.armL.rotation.set(-1.65,0,0.25);R.armR.rotation.set(-1.65,0,-0.25);face(R,'shocked',{mouthOpen:Math.abs(Math.sin(lt*4.2))*0.95,blink:false});world.under.intensity=1.6;
    cu('ref',3.1,0,-0.1,30,u,0.25);showOnly(['ref']);S.tag={text:'RUN',col:'#ff2a2a'};S.vign=0.7;},
  grab_hammer:(u,t,lt)=>{mood('night',t);const P=st('me',-6.5,0,HZ+2,0.7,'angry');const k=easeOut(lt/0.6);P.armR.rotation.set(lerp(-1.2,-0.6,k),0,-0.1);P.torso.rotation.x=lerp(0.35,0,k);const h=world.hammer;h.visible=true;const hp=handOf('me');h.position.copy(hp).add(V3(0,-1.0,0));h.rotation.set(0,0,0.2);
    dolly(V3(-2,4.5,HZ+8),V3(-3,4.8,HZ+6.5),V3(-6.5,3.5,HZ+2),V3(-6.5,4,HZ+2),u,46,44);showOnly(['me']);S.vign=0.65;},
  enforcers:(u,t)=>{mood('night',t);world.siren.intensity=0;dolly(V3(-4.6,5.6,3.4),V3(-5,5.5,2.6),V3(-5,5.6,0.5),V3(-5,5.5,0.5),u,38,34);showOnly([]);S.tag={text:'BREAK A MIRROR = DEATH',col:'#ff3a2a'};S.vign=0.7;},
  hammer_cu:(u,t)=>{mood('night',t);const P=me('angry');P.armR.rotation.set(-1.3,0,-0.1);const h=world.hammer;h.visible=true;h.position.copy(handOf('me')).add(V3(0,-0.9,0));h.rotation.set(-1.3,Math.PI,0);h.rotation.z=Math.sin(t*30)*0.03;const R=refFree('shocked',-1.3);R.armL.rotation.set(-1.65,0,0.25);R.armR.rotation.set(-1.65,0,-0.25);
    const hp=h.position.clone().add(V3(0,1.6,0));cu('me',3.8,0.6,-0.5,38,u,0.15);showOnly(['me','ref']);S.vign=0.65;},
  raise_hammer:(u,t,lt)=>{mood('night',t);const P=me('angry',{mouthOpen:0.6});const k=easeOut(lt/0.7);P.armR.rotation.set(lerp(-1.3,-3.0,k),0,-0.15);P.armL.rotation.set(lerp(-0.4,-2.8,k),0,0.2);const h=world.hammer;h.visible=true;h.position.copy(handOf('me')).add(V3(0,0.2,0));h.rotation.set(lerp(-1.3,0.5,k),Math.PI,0);
    const R=refFree('shocked',-1.3);R.armL.rotation.set(-1.65,0,0.25);R.armR.rotation.set(-1.65,0,-0.25);world.keyR.intensity=0.9;camAt(V3(1.0,2.6,-0.5),V3(0,6.6,HZ),54);showOnly(['me']);S.vign=0.6;S.shakeA=0.02;},
  reflection_eyes:(u,t)=>{mood('night',t);const R=refFree('shocked',-1.3);R._noIdle=true;R.head.rotation.set(-0.22,-0.1,0);face(R,'shocked',{blink:false});R.armL.rotation.set(-1.65,0,0.25);R.armR.rotation.set(-1.65,0,-0.25);world.under.intensity=1.5;
    cu('ref',3.0,0.2,0.05,28,u,0.3);showOnly(['ref']);S.vign=0.75;},
  dark_hall:(u,t)=>{mood('dark',t);const P=me('angry');P.armR.rotation.set(-3,0,-0.15);world.hammer.visible=true;world.hammer.position.copy(handOf('me')).add(V3(0,0.2,0));world.hammer.rotation.set(0.5,Math.PI,0);walkerBehind(t,21.5-u*1.5,0.3);world.corr.intensity=0.9;
    world.eyes.forEach((e,i)=>{e.visible=true;e.position.copy(wHead()).add(V3((i?1:-1)*0.3,-0.2,-0.3));e.material.opacity=0.5+0.3*u;});dolly(V3(-0.8,6.8,-1.6),V3(-0.6,6.8,0.6),V3(0,6.2,20),V3(0,6.4,20),u,34,26);showOnly(['me']);S.focus={x:0.5,y:0.45,r:0.25};S.vign=0.8;},
  breath_neck:(u,t)=>{mood('dark',t);const P=me('shocked',{blink:false,mouthOpen:0.2});P._noIdle=true;const W0=walkerBehind(t,lerp(9.0,8.2,u),0.9);world.walker.position.x=0.9;world.walker.position.y=-3.6;world.eyes.forEach((e,i)=>{e.visible=true;e.position.copy(wHead()).add(V3((i?1:-1)*0.3,-0.2,-0.4));e.material.opacity=0.8;});
    const hp=head('me');camAt(hp.clone().add(V3(-4.2,0.5,-0.4)),hp.clone().add(V3(0.6,0.3,1.6)),44);world.keyR.intensity=0.5;world.corr.intensity=0.6;showOnly(['me']);S.vign=0.8;S.breath=1;},
  pale_hand:(u,t,lt)=>{mood('dark',t);const P=me('shocked',{blink:false});P._noIdle=true;walkerBehind(t,8.4,0.9);world.walker.position.x=0.9;world.walker.position.y=-3.6;const F=lw0(P.head,V3(0,0.25,0.8));const k=easeOut(lt/0.8);
    const arm=world.paleArm;arm.visible=true;const B=lw0(P.head,V3(1.4,1.8,-2.0));arm.position.copy(B.clone().lerp(F,lerp(0.55,1,k)));arm.lookAt(B.clone().lerp(F,2));curl(world.paleHand,0.25,0.15);
    cu('me',3.2,0.4,-0.1,34,u,0.15);S.focus=null;showOnly(['me']);S.vign=0.8;S.shakeA=0.015;},
  rear_back:(u,t,lt)=>{mood('dark',t);const P=me('shocked');P._noIdle=true;const R=refFree('angry',-1.6);R._noIdle=true;const k=easeOut(lt/0.6);R.torso.rotation.x=lerp(0,-0.35,k);R.armR.rotation.set(lerp(-1,-2.8,k),0,-0.3);R.armL.rotation.set(-1.0,0,0.4);face(R,'angry',{mouthOpen:0.8,blink:false});world.under.intensity=1.8;
    ots(u,34,0.25);showOnly(['me','ref']);S.vign=0.7;},
  shatter:(u,t,lt)=>{mood('night',t);world.under.intensity=2.5;world.keyR.intensity=1.0;world.glass.visible=lt<0.15;world.glassSheen.visible=lt<0.15;world.cracks.visible=lt<0.15;world.voidP.visible=lt>0.15;
    world.shards.forEach(s=>{const d=s.userData;s.visible=lt>0.12;const tt=Math.max(0,lt-0.12);s.position.copy(d.p0).addScaledVector(d.v,tt*0.9);s.position.y-=4.9*tt*tt*0.6;s.rotation.set(d.spin.x*tt,d.spin.y*tt,d.spin.z*tt);});
    const k=easeOut((lt-0.1)/0.6);const R=refFree('angry',lerp(-1.6,2.2,k));R._noIdle=true;R.torso.rotation.x=0.4;R.armR.rotation.set(-1.6,0,0);R.armL.rotation.set(-1.6,0,0);chars.ref.position.y=Math.sin(clamp(k,0,1)*Math.PI)*1.2;face(R,'angry',{mouthOpen:0.9});
    camAt(V3(7,5.5,11),V3(0,5,1),50);showOnly(['ref']);S.impact=lt>0.1&&lt<0.18?1:0;S.flash=lt>0.1&&lt<0.3?0.5:0;S.shakeA=0.2*(1-u);S.speed={k:0.8,col:'#e8f0ff'};},
  tackle:(u,t,lt)=>{mood('night',t);world.corr.intensity=1.2;world.keyR.intensity=0.9;world.glass.visible=false;world.glassSheen.visible=false;world.voidP.visible=true;world.shards.forEach(s=>{const d=s.userData;s.visible=true;s.position.set(d.fl.x,0.05,d.fl.z);s.rotation.set(-Math.PI/2,0,d.fr);});
    const P=me('shocked');P._noIdle=true;const k=easeOut(lt/0.5);const R=refFree('angry',lerp(2,14,k));R._noIdle=true;chars.ref.position.x=lerp(0.5,0.6,k);chars.ref.position.y=lerp(2.5,1.2,k);chars.ref.rotation.x=1.1;R.armR.rotation.set(-2.8,0,0);R.armL.rotation.set(-2.8,0,0);
    const W0=walkerBehind(t,lerp(15,22,easeIn(clamp((lt-0.35)/0.6,0,1))),0.2);world.walker.rotation.x=-lerp(0,0.7,clamp((lt-0.35)/0.4,0,1));chars.ref.position.z=Math.min(chars.ref.position.z,world.walker.position.z-1);
    camAt(V3(11,5.5,HZ+3),V3(0,5,13),50);showOnly(['me','ref']);S.impact=lt>0.4&&lt<0.48?1:0;S.shakeA=lt>0.4?0.12*(1-u):0.03;S.speed={k:1,col:'#ffffff'};},
  sirens_hall:(u,t)=>{mood('sirens',t);world.glass.visible=false;world.glassSheen.visible=false;world.voidP.visible=true;world.shards.forEach(s=>{const d=s.userData;s.visible=true;s.position.set(d.fl.x,0.05,d.fl.z);s.rotation.set(-Math.PI/2,0,d.fr);});
    world.pit.visible=true;world.ink.visible=false;dolly(V3(9,9,17),V3(7,8,15),V3(0,3,4),V3(1,3,5),u,48,46);showOnly([]);S.sirenWash=1;},
  shard_cu:(u,t)=>{mood('sirens',t);world.pit.visible=true;world.ink.visible=true;world.pitL.intensity=1.6;world.shards.forEach(s=>{const d=s.userData;s.visible=true;s.position.set(d.fl.x,0.05,d.fl.z);s.rotation.set(-Math.PI/2,0,d.fr);});
    const R=st('ref',SHARD.x,-8.4,SHARD.z+2.4,0,'sad');chars.ref.rotation.x=-Math.PI/2;R._noIdle=true;face(R,'sad',{blink:true});R.armL.rotation.set(0,0,0.5);
    dolly(V3(SHARD.x+0.3,7.5,SHARD.z+0.8),V3(SHARD.x+0.2,5.5,SHARD.z+0.6),V3(SHARD.x,-6,SHARD.z),V3(SHARD.x,-6,SHARD.z),u,40,38);showOnly(['ref']);S.sirenWash=0.6;S.vign=0.7;},
  kneel:(u,t)=>{mood('sirens',t);world.pit.visible=true;world.ink.visible=true;world.pitL.intensity=1.2;world.voidP.visible=true;world.glass.visible=false;world.glassSheen.visible=false;const P=st('me',SHARD.x-1.5,0,SHARD.z-3.4,0.25,'sad');kneel(P);P.torso.rotation.x=0.55;P.armR.rotation.set(-1.0,0,0);P.head.rotation.x=0.45;P._noIdle=true;
    const R=st('ref',SHARD.x,-8.4,SHARD.z+2.4,0,'sad');chars.ref.rotation.x=-Math.PI/2;R._noIdle=true;face(R,'sad',{blink:true});
    dolly(V3(SHARD.x+6,4,SHARD.z+4),V3(SHARD.x+5,3.6,SHARD.z+3),V3(SHARD.x-0.6,2,SHARD.z-1),V3(SHARD.x-0.6,2,SHARD.z-1),u,44,42);showOnly(['me','ref']);S.sirenWash=0.4;S.vign=0.6;},
  hands_match:(u,t,lt)=>{mood('sirens',t);world.pit.visible=true;world.ink.visible=true;world.pitL.intensity=1.6;const c=SHARD.clone().add(V3(0.2,0,0.1));
    const a=world.myHand;a.visible=true;a.position.set(c.x,0.2,c.z);a.rotation.set(0,Math.PI,0);
    const b=world.refHand;b.visible=true;b.position.set(c.x+0.1,lerp(-4.5,-0.22,easeOut((lt-0.2)/1.4)),c.z+0.15);b.rotation.set(Math.PI/2,0,0);
    const R=st('ref',SHARD.x,-8.4,SHARD.z+2.4,0,'sad');chars.ref.rotation.x=-Math.PI/2;R._noIdle=true;face(R,'sad',{blink:true});
    world.patch.visible=false;camAt(V3(c.x+3.6,1.1,c.z+0.6),V3(c.x,-0.5,c.z),44);S.focus={x:0.5,y:0.5,r:0.3};showOnly(['ref']);S.vign=0.7;S.sirenWash=0.3;},
  glitch_face:(u,t,lt)=>{mood('sirens',t);world.pit.visible=true;world.ink.visible=true;world.pitL.intensity=1.6;const R=st('ref',SHARD.x,-8.4,SHARD.z+2.4,0,'default');chars.ref.rotation.x=-Math.PI/2;R._noIdle=true;face(R,'default',{blink:lt<1.0});
    const hp=head('ref');camAt(hp.clone().add(V3(0,4.6,0.4)),hp.clone().add(V3(0,0,0)),lerp(30,24,u));showOnly(['ref']);S.glitch=lt<0.35||(lt>1.6&&lt<1.85)?1:0.25;S.vign=0.75;},
  bathroom_mirror:(u,t,lt)=>{mood('night',t);const P=me('sad',{blink:false});P._noIdle=true;P.visible=true;const R=refFree('sad');R._noIdle=true;R.head.rotation.set(0.22,0,0.12);face(R,'sad',{blink:((lt%2.6)<0.35)});world.under.intensity=0.7;
    const hp=head('ref');dolly(V3(0,6.2,HZ+5.5),V3(0,6.1,HZ-0.8),hp.clone().add(V3(0,-0.4,0)),hp.clone().add(V3(0,-0.2,0)),u,38,30);showOnly(['ref']);S.vign=0.8;S.follow=clamp((lt-1.0)/0.4,0,1);S.black=clamp((u-0.92)/0.08,0,1)*0.85;},
};

/* ---------------- 2D overlays + post */
function T(text,x,y,size,fill,stroke,lw,align){og.font=`${size}px ${FONT}`;og.textAlign=align||'center';og.textBaseline='middle';og.lineJoin='round';if(stroke){og.lineWidth=lw||size*0.18;og.strokeStyle=stroke;og.strokeText(text,x,y);}og.fillStyle=fill;og.fillText(text,x,y);}
function RR(x,y,w,h,r){og.beginPath();og.moveTo(x+r,y);og.arcTo(x+w,y,x+w,y+h,r);og.arcTo(x+w,y+h,x,y+h,r);og.arcTo(x,y+h,x,y,r);og.arcTo(x,y,x+w,y,r);og.closePath();}
function composite(src){const f=S.focus;
  if(f){og.filter=`blur(${Math.round(W*0.007)}px)`;og.drawImage(src,0,0,W,H);og.filter='none';tg.clearRect(0,0,W,H);tg.globalCompositeOperation='source-over';tg.drawImage(src,0,0,W,H);tg.globalCompositeOperation='destination-in';const cx=f.x*W,cy=f.y*H,r=f.r*W;
    const gr=tg.createRadialGradient(cx,cy,r*0.5,cx,cy,r*1.3);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(1,'rgba(0,0,0,0)');tg.fillStyle=gr;tg.fillRect(0,0,W,H);tg.globalCompositeOperation='source-over';og.drawImage(tmpC,0,0);}
  else og.drawImage(src,0,0,W,H);}
function drawOverlays(t){
  if(S.sirenWash){const ph=Math.floor(t*3.2)%2;og.save();og.globalCompositeOperation='overlay';og.fillStyle=ph?`rgba(255,30,30,${0.35*S.sirenWash})`:`rgba(40,80,255,${0.35*S.sirenWash})`;og.fillRect(0,0,W,H);og.restore();}
  if(S.speed){const r=rng('sp'+Math.floor(t*30));og.save();og.translate(W/2,H/2);og.strokeStyle=S.speed.col;for(let i=0;i<70;i++){const a=r()*Math.PI*2,r0=H*(0.3+r()*0.12),r1=H*(0.75+r()*0.2);og.globalAlpha=S.speed.k*(0.25+r()*0.45);og.lineWidth=W*(0.002+r()*0.006);og.beginPath();og.moveTo(Math.cos(a)*r0,Math.sin(a)*r0);og.lineTo(Math.cos(a)*r1,Math.sin(a)*r1);og.stroke();}og.restore();}
  if(S.sparkle){const r=rng('spk');og.save();og.fillStyle='rgba(255,250,235,0.85)';for(let i=0;i<10;i++){const x=W*0.3+r()*W*0.4,y=H*0.15+r()*H*0.5,s=W*0.01*(0.5+0.5*Math.sin(t*7+i));og.beginPath();og.moveTo(x,y-s*2);og.lineTo(x+s*0.5,y-s*0.5);og.lineTo(x+s*2,y);og.lineTo(x+s*0.5,y+s*0.5);og.lineTo(x,y+s*2);og.lineTo(x-s*0.5,y+s*0.5);og.lineTo(x-s*2,y);og.lineTo(x-s*0.5,y-s*0.5);og.fill();}og.restore();}
  if(S.breath){og.save();og.globalAlpha=0.18+0.12*Math.sin(t*3);og.filter=`blur(${Math.round(W*0.03)}px)`;og.fillStyle='#cfd8e8';og.beginPath();og.ellipse(W*0.72,H*0.36,W*0.16,H*0.05,0.4,0,7);og.fill();og.restore();og.filter='none';}
  if(S.glitch){const r=rng('gl'+Math.floor(t*24));const n=Math.floor(4+S.glitch*10);for(let i=0;i<n;i++){const y=r()*H,h=H*(0.01+r()*0.05),dx=(r()-0.5)*W*0.12*S.glitch;og.drawImage(out,0,y,W,h,dx,y,W,h);}
    og.save();og.globalCompositeOperation='screen';og.globalAlpha=0.35*S.glitch;og.drawImage(gC,W*0.012,0);og.restore();}
  if(S.tag){const big=S.tag.text.length<6;const fs=big?W*0.2:W*0.06;og.font=`${fs}px ${FONT}`;const tw=og.measureText(S.tag.text).width+W*0.08;og.save();og.translate(W/2,big?H*0.2:H*0.11);og.rotate(-0.03);if(!big){og.fillStyle='rgba(0,0,0,0.78)';RR(-tw/2,-fs*0.75,tw,fs*1.5,H*0.02);og.fill();}T(S.tag.text,0,0,fs,S.tag.col,big?'#0a0a12':null,fs*0.12);og.restore();}
  if(S.card){const k=S.card.k;og.fillStyle=`rgba(0,0,0,${0.82})`;og.fillRect(0,0,W,H);og.save();og.globalAlpha=Math.min(1,k*4);T(S.card.text,W/2,H*0.44,W*0.15,'#f2ece0','#000',W*0.01);og.font=`${W*0.05}px "DejaVu Sans Mono", monospace`;og.fillStyle='#ff3a2a';og.textAlign='center';og.fillText(S.card.sub,W/2,H*0.53);og.restore();}
  const vg=og.createRadialGradient(W/2,H*0.48,H*0.28,W/2,H/2,H*0.78);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,`rgba(0,0,0,${S.vign||0.45})`);og.fillStyle=vg;og.fillRect(0,0,W,H);
  const r=rng('gr'+Math.floor(t*24));og.fillStyle='rgba(255,255,255,0.045)';for(let i=0;i<420;i++)og.fillRect(r()*W,r()*H,1.5,1.5);
  if(S.flash>0){og.fillStyle=`rgba(240,245,255,${S.flash})`;og.fillRect(0,0,W,H);}
  if(S.follow){const k=easeOut(S.follow),p=1+0.05*Math.sin(t*7);og.save();og.translate(W/2,H*0.88);og.scale(k*p,k*p);og.fillStyle='#ff2a3a';RR(-W*0.24,-H*0.032,W*0.48,H*0.064,H*0.03);og.fill();T('FOLLOW',0,0,W*0.075,'#fff');og.restore();}
  if(S.black>0){og.fillStyle=`rgba(0,0,0,${S.black})`;og.fillRect(0,0,W,H);}
}
function captionAt(t){for(const s of TL.segs){for(let i=0;i<s.words.length;i++){const w=s.words[i];const nx=s.words[i+1];const end=nx?nx.s:Math.min(w.e+0.25,s.end+0.25);if(t>=w.s&&t<end)return {w,since:t-w.s};}}return null;}
function drawCaption(t){if(S.black>=0.8||S.card)return;const c=captionAt(t);if(!c)return;const text=c.w.w.toUpperCase();const base=W*0.1*(text.length>8?8/text.length*1.05:1);const k=c.since<0.07?lerp(1.3,1,easeOut(c.since/0.07)):1;
  og.save();og.translate(W/2,H*0.7);og.scale(k,k);og.font=`${base}px ${FONT}`;og.textAlign='center';og.textBaseline='middle';og.lineJoin='round';og.shadowColor='rgba(0,0,0,0.7)';og.shadowBlur=base*0.3;og.lineWidth=base*0.22;og.strokeStyle='#0a0a12';og.strokeText(text,0,0);og.shadowColor='transparent';
  og.fillStyle=c.w.red?'#ff3a3a':'#ffffff';og.fillText(text,0,0);og.restore();}

/* ---------------- entry points */
S.init=async function(timeline,w,h,fontUrl){TL=timeline;W=w;H=h;SS=window.BH_SS||1.25;
  const ff=new FontFace('Luckiest Guy',`url(${fontUrl})`);await ff.load();document.fonts.add(ff);
  R=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});R.setPixelRatio(1);R.setSize(Math.round(W*SS),Math.round(H*SS));R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.15;R.shadowMap.enabled=false;
  cam=new THREE.PerspectiveCamera(40,W/H,0.1,1000);
  buildWorld();buildChars();
  const [oc,o2]=cv(W,H);out=oc;og=o2;og.imageSmoothingEnabled=true;og.imageSmoothingQuality='high';const [tc,t2]=cv(W,H);tmpC=tc;tg=t2;const [gc2,gg2]=cv(W,H);gC=gc2;gg=gg2;scene.updateMatrixWorld(true);return true;};
const KEYS=['flash','black','shakeA','zoomPunch','speed','focus','whip','sparkle','vign','tag','impact','card','grade','sirenWash','breath','glitch','follow'];
S.frame=function(f,q){const t=f/TL.fps;const shot=TL.shots.find(s=>t>=s.s&&t<s.e)||TL.shots[TL.shots.length-1];
  KEYS.forEach(k=>S[k]=null);hideAll();
  if(shot!==curShot){curShot=shot;showOnly([]);}
  Object.values(chars).forEach(c=>{c.rotation.set(0,0,0);c.userData.P._mirror=false;});
  const u=(t-shot.s)/(shot.e-shot.s),lt=t-shot.s;scene.updateMatrixWorld(true);
  (SH[shot.name]||SH.bathroom_mirror)(u,t,lt);
  act(t);scene.updateMatrixWorld(true);
  handheld(t,0.035);if(S.shakeA)shake(S.shakeA,t);
  scene.updateMatrixWorld(true);R.render(scene,cam);
  og.globalAlpha=1;og.globalCompositeOperation='source-over';og.filter='none';og.fillStyle='#000';og.fillRect(0,0,W,H);
  if(S.zoomPunch){const z=1+0.06*S.zoomPunch;og.drawImage(R.domElement,(W-W*z)/2,(H-H*z)/2,W*z,H*z);}else composite(R.domElement);
  const m=world.mood;const grade=S.impact?'invert(1) contrast(1.6) grayscale(1)':S.grade==='warm'||m==='warm'?'contrast(1.06) saturate(1.12) sepia(0.12)':m==='cold'?'contrast(1.1) saturate(0.75) hue-rotate(-8deg)':'contrast(1.18) saturate(0.7)';
  gg.clearRect(0,0,W,H);gg.drawImage(out,0,0);og.filter=grade;og.drawImage(gC,0,0);og.filter='none';
  if(S.whip&&lt<0.12){const k=1-lt/0.12;og.save();og.globalAlpha=0.35*k;for(let i=1;i<6;i++)og.drawImage(R.domElement,-i*W*0.05*k,0,W,H);og.restore();}
  og.filter=`blur(${Math.round(W*0.016)}px) brightness(1.2)`;og.globalCompositeOperation='screen';og.globalAlpha=0.12;og.drawImage(R.domElement,0,0,W,H);og.filter='none';og.globalCompositeOperation='source-over';og.globalAlpha=1;
  gg.clearRect(0,0,W,H);gg.drawImage(out,0,0);
  drawOverlays(t);drawCaption(t);
  return out.toDataURL('image/jpeg',q||0.94);};
})();
