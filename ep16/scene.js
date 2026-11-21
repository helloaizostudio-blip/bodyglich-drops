/* Episode 16 "The Stinky Stone" (comedy, narrator Zash). Follows Ep 15: Tobi is the only guy who likes guys; Zash finds
   a wish stone in the school toilet; Tobi wishes everyone would mind their own business and the whole school opens
   shops. Sets: hallway + shop stalls (x=0), cafeteria (CAF), rainy street (ST), bathroom (BATH).
   ep16/scene.js = this + cast_ep16.js (build_scene.py). Entry points: SAMPLE.init(timeline, W, H, fontUrl), SAMPLE.frame(f) */
(function(){
/* Episode 16 "The Stinky Stone": main-cast designs only (Zash, Tobi, Brick + classmates). */

const S=window.SAMPLE={};
let TL,W,H,R,scene,cam,out,og,tmpC,tg,gC,gg,world={},chars={},curShot=null,SS=1.25;
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const lerp=(a,b,t)=>a+(b-a)*t,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);},easeOut=t=>1-Math.pow(1-clamp(t,0,1),3),easeIn=t=>Math.pow(clamp(t,0,1),2),eio=t=>{t=clamp(t,0,1);return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;};
const FONT='"Luckiest Guy", Impact, sans-serif';
const CAF=200, ST=400, BATH=600;

/* ---------------- textures */
function canvasTex(w,h,draw){const [c,g]=cv(w,h);draw(g,w,h);const t=tex(c);t._c=c;return t;}
function glowTex(col){return canvasTex(128,128,(g)=>{const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.3,col);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);});}
function tileTex(a,b){return canvasTex(256,256,(g)=>{for(let y=0;y<4;y++)for(let x=0;x<4;x++){g.fillStyle=(x+y)%2?a:b;g.fillRect(x*64,y*64,64,64);}g.strokeStyle='rgba(0,0,0,0.12)';g.lineWidth=2;for(let i=0;i<=4;i++){g.beginPath();g.moveTo(i*64,0);g.lineTo(i*64,256);g.stroke();g.beginPath();g.moveTo(0,i*64);g.lineTo(256,i*64);g.stroke();}});}
function lockerTex(){return canvasTex(256,512,(g,w,h)=>{g.fillStyle='#3a6ab8';g.fillRect(0,0,w,h);for(let x=0;x<w;x+=64){g.fillStyle='rgba(0,0,0,0.28)';g.fillRect(x,0,3,h);g.fillStyle='rgba(0,0,0,0.3)';for(let y=40;y<120;y+=12)g.fillRect(x+16,y,32,4);g.fillStyle='#c9ccd2';g.fillRect(x+48,230,6,40);}g.fillStyle='rgba(255,255,255,0.06)';g.fillRect(0,0,w,8);});}
function wallTex(col,stripe){return canvasTex(256,256,(g,w,h)=>{fabricFill(g,0,0,w,h,col,'cotton');if(stripe){g.fillStyle=stripe;g.fillRect(0,h*0.78,w,h*0.08);}});}
function noteTex(text,col){return canvasTex(128,128,(g,w,h)=>{g.fillStyle=col;g.fillRect(0,0,w,h);g.fillStyle='rgba(0,0,0,0.08)';g.fillRect(0,0,w,16);g.fillStyle='#1a1a2a';g.textAlign='center';g.textBaseline='middle';let fs=34;g.font=`${fs}px ${FONT}`;while(g.measureText(text).width>w-14&&fs>14){fs-=2;g.font=`${fs}px ${FONT}`;}
  const words=text.split(' ');if(words.length>1&&g.measureText(text).width>w-14){g.fillText(words[0],w/2,h*0.4);g.fillText(words.slice(1).join(' '),w/2,h*0.66);}else g.fillText(text,w/2,h*0.55);});}
function bldgTex(seed){return canvasTex(256,512,(g,w,h)=>{g.fillStyle='#2a2c3a';g.fillRect(0,0,w,h);const r=rng(seed);for(let y=20;y<h-20;y+=46)for(let x=16;x<w-30;x+=48){g.fillStyle=r()<0.55?`rgba(255,${200+r()*40|0},${120+r()*60|0},${0.5+r()*0.4})`:'rgba(20,22,34,0.9)';g.fillRect(x,y,30,30);}});}
function stoneTex(){return canvasTex(256,256,(g,w,h)=>{g.fillStyle='#5a2a9a';g.fillRect(0,0,w,h);const r=rng('stn');for(let i=0;i<40;i++){g.strokeStyle=`rgba(${200+r()*55|0},${120+r()*80|0},255,${0.3+r()*0.5})`;g.lineWidth=1+r()*3;g.beginPath();let x=r()*w,y=r()*h;g.moveTo(x,y);for(let k=0;k<5;k++){x+=(r()-0.5)*50;y+=(r()-0.5)*50;g.lineTo(x,y);}g.stroke();}});}
function labelTex(text,col){return canvasTex(512,128,(g,w,h)=>{g.font=`80px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.shadowColor=col;g.shadowBlur=30;g.fillStyle='#fff';g.fillText(text,w/2,h/2+4);g.shadowBlur=0;g.lineWidth=3;g.strokeStyle=col;g.strokeText(text,w/2,h/2+4);});}

const SM=(o)=>new THREE.MeshStandardMaterial(o);
function cst(m){m.castShadow=true;m.receiveShadow=true;return m;}
function box(w,h,d,mat,x,y,z,parent){const m=cst(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat.isMaterial?mat:SM({color:mat,roughness:0.85})));m.position.set(x,y,z);(parent||scene).add(m);return m;}
function sprite(t,s,parent,op){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,opacity:op==null?1:op}));m.scale.set(s,s,1);(parent||scene).add(m);return m;}
function pl(col,int,dist,x,y,z,parent){const L=new THREE.PointLight(col,int,dist,1.6);L.position.set(x,y,z);(parent||scene).add(L);return L;}
function plane(w,h,mat,x,y,z,rx,parent){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);m.position.set(x,y,z);m.rotation.x=rx||0;m.receiveShadow=true;(parent||scene).add(m);return m;}

/* ---------------- world */
function buildHall(){const g=new THREE.Group();scene.add(g);
  const ft=tileTex('#e2ded2','#cfc8b8');ft.wrapS=ft.wrapT=THREE.RepeatWrapping;ft.repeat.set(4,20);plane(16,160,SM({map:ft,roughness:0.55}),0,0,0,-Math.PI/2,g);
  const lt=lockerTex();lt.wrapS=THREE.RepeatWrapping;lt.repeat.set(20,1);[-1,1].forEach(s=>{const L=box(0.8,9,160,SM({map:lt,roughness:0.6,metalness:0.25}),s*7.6,4.5,0,g);});
  const wm=SM({map:wallTex('#efe8d6','#d06a3a'),roughness:0.95});[-1,1].forEach(s=>box(0.4,8.4,160,wm,s*8.2,13.2,0,g));box(16.8,0.4,160,SM({color:'#f4f2ea',roughness:1}),0,17.2,0,g);
  for(let z=-70;z<=70;z+=10)box(3,0.2,1.4,SM({color:'#fff',emissive:0xffffff,emissiveIntensity:0.9}),0,17,z,g);
  // far end: windows with daylight
  box(16,17,0.4,SM({color:'#bfe0ff',emissive:0x9fcfff,emissiveIntensity:0.7}),0,8.5,-62,g);
  // banners on the upper wall
  [[-8.0,-10,'#e04a6a'],[8.0,6,'#3aa0e0'],[-8.0,22,'#f0b030']].forEach(([x,z,c])=>{const b=box(0.1,3,6,SM({color:c,roughness:0.9}),x*0.99,12.5,z,g);});
  // Zash's locker (left wall around z=4) with sticky notes
  const notes=new THREE.Group();g.add(notes);world.notes=notes;const NT=[['WEIRDO','#ffe95a'],['ODD ONE OUT','#ff9ad0'],['STRAIGHT LOL','#9af0ff'],['LOSER','#b8ff9a'],['WHY R U LIKE THIS','#ffd08a'],['FREAK','#ffe95a'],['EW','#ff9ad0'],['NO 1 LIKES U','#9af0ff']];
  const r=rng('nt');NT.forEach(([t,c],i)=>{const p=plane(1.15,1.15,SM({map:noteTex(t,c),roughness:0.9,side:THREE.DoubleSide}),0,0,0,0,notes);p.position.set(-7.15,3.4+(i%4)*1.25+(r()-0.5)*0.25,2.2+Math.floor(i/4)*1.35+(r()-0.5)*0.3);p.rotation.y=Math.PI/2;p.rotation.x=(r()-0.5)*0.3;});
  world.hallKey=pl(0xfff4e8,1.0,80,0,15,8);world.hallKey2=pl(0xfff4e8,0.8,80,0,15,-20);}
function buildCaf(){const g=new THREE.Group();g.position.set(CAF,0,0);scene.add(g);
  const ft=tileTex('#e8e0cc','#bcd6c8');ft.wrapS=ft.wrapT=THREE.RepeatWrapping;ft.repeat.set(8,8);plane(60,60,SM({map:ft,roughness:0.6}),0,0,0,-Math.PI/2,g);
  const wm=SM({map:wallTex('#f2ead8','#3a9a7a'),roughness:0.95});const bw=box(60,18,0.5,wm,0,9,-24,g);box(60,18,0.5,wm,0,9,30,g);box(60,0.4,60,SM({color:'#f4f2ea',roughness:1}),0,18,3,g);[-1,1].forEach(s=>box(0.5,18,60,wm,s*30,9,0,g));
  for(let i=0;i<4;i++)box(8,7,0.2,SM({color:'#bfe0ff',emissive:0x9fcfff,emissiveIntensity:0.6}),-21+i*14,10,-23.6,g);
  world.tables=[];const tm=SM({color:'#e0e4ea',roughness:0.6}),bm=SM({color:'#3a7ac8',roughness:0.7});
  [[-14,-10],[0,-10],[14,-10],[-14,4],[0,4],[14,4]].forEach(([x,z])=>{box(10,0.35,3.6,tm,x,3.2,z,g);box(0.3,3,0.3,'#8a9098',x-4,1.55,z,g);box(0.3,3,0.3,'#8a9098',x+4,1.55,z,g);
    [-1,1].forEach(s=>box(10,0.3,1.2,bm,x,1.8,z+s*2.7,g));world.tables.push(V3(CAF+x,0,z));
    for(let k=0;k<3;k++){box(1.6,0.12,1.1,SM({color:['#e86a4a','#f0c040','#5ab0e0'][k],roughness:0.7}),x-3+k*3,3.45,z+(k%2?0.6:-0.6),g);}});
  // the lonely corner table (Tobi)
  box(5,0.35,3.2,tm,20,3.2,16,g);box(0.3,3,0.3,'#8a9098',20,1.55,16,g);box(5,0.3,1.2,bm,20,1.8,13.4,g);world.corner=V3(CAF+20,0,16);
  world.cafKey=pl(0xfff4e8,1.1,90,CAF,16,6);world.cafKey2=pl(0xfff0dc,0.6,60,CAF+18,10,22);}
function buildStreet(){const g=new THREE.Group();g.position.set(ST,0,0);scene.add(g);
  plane(200,200,SM({color:'#26262e',roughness:0.35,metalness:0.2}),0,-0.05,0,-Math.PI/2,g);
  box(8,0.5,200,SM({color:'#5a5a62',roughness:0.8}),-6,0.25,0,g);   // sidewalk
  for(let i=0;i<22;i++){const x=(i%2?1:-1)*(14+(i*7)%18),z=-90+i*9;const hgt=18+(i*13)%30;const b=box(10,hgt,8,SM({map:bldgTex('b'+i),roughness:0.9,emissive:0xffffff,emissiveMap:bldgTex('b'+i),emissiveIntensity:0.35}),x,hgt/2,z,g);}
  // street lamp
  box(0.35,13,0.35,'#2a2a30',-9,6.5,-2,g);box(3,0.3,0.5,'#2a2a30',-7.6,13,-2,g);const lamp=box(1.2,0.3,0.8,SM({color:'#ffe6b0',emissive:0xffd890,emissiveIntensity:1.2}),-6.4,12.8,-2,g);
  world.stLamp=pl(0xffc880,1.6,40,ST-6.4,12,-2);world.stFill=pl(0x6a7ad8,0.6,60,ST+6,10,10);
  // puddle + stone
  const pd=new THREE.Mesh(new THREE.CircleGeometry(2.4,32),SM({color:'#101420',roughness:0.05,metalness:0.9}));pd.rotation.x=-Math.PI/2;pd.position.set(-4,0.52,4);pd.scale.set(1.3,1,1);g.add(pd);world.puddle=V3(ST-4,0.55,4);
  const st=new THREE.Mesh(new THREE.IcosahedronGeometry(0.55,1),SM({map:stoneTex(),emissive:0x9a3aff,emissiveIntensity:0.9,roughness:0.4}));st.scale.set(1,0.75,1);scene.add(st);world.stone=st;st.visible=false;
  world.stoneGlow=sprite(glowTex('rgba(170,80,255,0.8)'),4,scene,0.8);world.stoneGlow.visible=false;world.stoneL=pl(0xb060ff,0,18,0,0,0);
  world.stoneLbl=sprite(labelTex('ONE WISH','#c070ff'),3,scene);world.stoneLbl.scale.set(3.4,0.85,1);world.stoneLbl.visible=false;
  // the flip shockwave ring
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1,0.09,8,96),new THREE.MeshBasicMaterial({color:0xa030ff,transparent:true,opacity:0.9}));ring.rotation.x=Math.PI/2;scene.add(ring);ring.visible=false;world.ring=ring;
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI/2),new THREE.MeshBasicMaterial({color:0xb070ff,transparent:true,opacity:0.18,side:THREE.DoubleSide,depthWrite:false}));scene.add(dome);dome.visible=false;world.dome=dome;}
function buildProps(){const tr=new THREE.Group();box(2.2,0.14,1.5,SM({color:'#e86a4a',roughness:0.7}),0,0,0,tr);box(0.8,0.4,0.8,SM({color:'#f4f0e0',roughness:0.8}),-0.5,0.25,0,tr);box(0.5,0.6,0.5,SM({color:'#5ab0e0',roughness:0.6}),0.6,0.35,0.2,tr);scene.add(tr);tr.visible=false;world.tray=tr;}
function signTex(text,col){return canvasTex(512,128,(g,w,h)=>{g.fillStyle=col;g.fillRect(0,0,w,h);g.strokeStyle='#fff';g.lineWidth=8;g.strokeRect(6,6,w-12,h-12);g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';let fs=84;g.font=`${fs}px ${FONT}`;while(g.measureText(text).width>w-50){fs-=4;g.font=`${fs}px ${FONT}`;}g.lineWidth=8;g.strokeStyle='rgba(0,0,0,0.5)';g.strokeText(text,w/2,h/2+6);g.fillText(text,w/2,h/2+6);});}
function stripeTex(col){return canvasTex(256,64,(g,w,h)=>{for(let i=0;i<8;i++){g.fillStyle=i%2?'#ffffff':col;g.fillRect(i*32,0,32,h);}});}
const STALLS=[{x:-3.6,z:4,label:'LEMONADE',col:'#f2b820',id:'brick'},{x:3.6,z:-3,label:'SOCKS',col:'#e05a8a',id:'penny'},{x:-3.6,z:-10,label:'TAXES',col:'#4a7ae0',id:'benny'},{x:3.6,z:-17,label:'HOT DOGS',col:'#e0603a',id:'grimm'},{x:-3.6,z:-24,label:'HATS',col:'#4ab07a',id:'kip'},{x:3.6,z:-31,label:'ROCKS',col:'#8a6ae0',id:'nova'}];
function buildShops(){const G=new THREE.Group();scene.add(G);world.shops=G;G.visible=false;
  STALLS.forEach((S0,i)=>{const g=new THREE.Group();g.position.set(S0.x,0,S0.z);G.add(g);box(5,3,1.4,SM({color:'#c89a5a',roughness:0.85}),0,1.5,0,g);box(5.2,0.25,1.7,SM({color:'#e8d8b8',roughness:0.8}),0,3.1,0,g);
    [-2.4,2.4].forEach(x=>box(0.25,8.6,0.25,'#6a4a2a',x,4.3,-0.9,g));const aw=box(5.8,0.35,3,SM({map:stripeTex(S0.col),roughness:0.9}),0,8.7,0,g);aw.rotation.x=0.18;
    plane(4.6,1.15,SM({map:signTex(S0.label,S0.col),roughness:0.8}),0,7.5,1.45,0,g);
    const it=['#f6e04a','#ff8ab0','#ffffff','#b8502a','#3a6ae0','#8a8a92'][i];for(let k=0;k<4;k++)box(0.6,i===0?0.9:0.5,0.6,SM({color:it,roughness:0.6}),-1.6+k*1.05,3.2+(i===0?0.45:0.25),0.1,g);});
  // lemonade glass with two straws + the lemon bucket
  const gl=new THREE.Group();const cup=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.32,1.1,14),SM({color:'#f6e04a',roughness:0.3,transparent:true,opacity:0.92}));gl.add(cup);[-1,1].forEach(sd=>{const stw=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.5,6),SM({color:sd<0?'#ff4a6a':'#4a9aff'}));stw.position.set(sd*0.3,0.75,0);stw.rotation.z=-sd*0.5;gl.add(stw);});scene.add(gl);gl.visible=false;world.glass=gl;
  const bk=new THREE.Group();const b0=new THREE.Mesh(new THREE.CylinderGeometry(0.9,0.7,1.3,16,1,true),SM({color:'#9aa0a8',metalness:0.6,roughness:0.4,side:THREE.DoubleSide}));bk.add(b0);for(let k=0;k<5;k++){const l=new THREE.Mesh(new THREE.SphereGeometry(0.3,10,8),SM({color:'#f6e04a',roughness:0.6}));l.position.set(Math.cos(k*1.3)*0.4,0.45,Math.sin(k*1.3)*0.4);bk.add(l);}scene.add(bk);bk.visible=false;world.bucket=bk;}
function buildBath(){const g=new THREE.Group();g.position.set(BATH,0,0);scene.add(g);
  const ft=tileTex('#dfe8ea','#b8ccd2');ft.wrapS=ft.wrapT=THREE.RepeatWrapping;ft.repeat.set(4,4);plane(16,20,SM({map:ft,roughness:0.4}),0,0,2,-Math.PI/2,g);
  const wt=tileTex('#cfe6e2','#bcdcd6');wt.wrapS=wt.wrapT=THREE.RepeatWrapping;wt.repeat.set(5,4);const wm=SM({map:wt,roughness:0.5});box(16,14,0.4,wm,0,7,-6.2,g);[-1,1].forEach(sd=>box(0.4,14,20,wm,sd*8,7,2,g));box(16,0.4,20,SM({color:'#eef2f2',roughness:1}),0,14,2,g);
  [-1,1].forEach(sd=>box(0.25,9,6,SM({color:'#6a8aa8',roughness:0.6}),sd*3.2,5,-3.2,g));
  const wh=SM({color:'#f4f6f6',roughness:0.25});box(2.2,1.7,2.6,wh,0,0.85,-3.4,g);box(2.4,2.6,0.9,wh,0,3.0,-5.3,g);const rim=new THREE.Mesh(new THREE.TorusGeometry(0.95,0.25,10,24),wh);rim.rotation.x=Math.PI/2;rim.position.set(0,1.8,-3.2);rim.scale.set(1,1.25,1);g.add(rim);
  const wat=new THREE.Mesh(new THREE.CircleGeometry(0.9,20),SM({color:'#3a5a4a',roughness:0.1,emissive:0x8a40ff,emissiveIntensity:0.9}));wat.rotation.x=-Math.PI/2;wat.position.set(0,1.72,-3.2);wat.scale.set(1,1.25,1);g.add(wat);world.toiletWater=wat;
  box(0.5,0.2,0.2,'#c8ccd0',0.7,4.0,-4.8,g);
  world.toilet=V3(BATH,1.9,-3.2);world.bathKey=pl(0xf4fff8,0,40,BATH,12,3);world.toiletL=pl(0xa050ff,0,14,BATH,3,-3);world.toiletGlow=sprite(glowTex('rgba(170,80,255,0.8)'),5,scene,0.7);world.toiletGlow.position.set(BATH,2.6,-3.2);world.toiletGlow.visible=false;}
function buildBin(){const b=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.2,3.4,14,1,true),SM({color:'#2f6a4a',roughness:0.7,side:THREE.DoubleSide}));b.position.set(ST-6.5,2.2,7);scene.add(b);world.bin=V3(ST-6.5,0.5,7);}
function buildWorld(){
  scene=new THREE.Scene();scene.background=new THREE.Color('#0a0a10');scene.fog=new THREE.Fog(0x0a0a10,60,180);
  world.hemi=new THREE.HemisphereLight(0xfff4e6,0x40362c,0.8);scene.add(world.hemi);world.look=V3(0,0,0);
  world.key=new THREE.DirectionalLight(0xfff2e0,0.6);world.key.position.set(20,40,30);scene.add(world.key);
  buildHall();buildCaf();buildStreet();buildProps();buildShops();buildBath();buildBin();}
function hideAll(){world.stone.visible=false;world.stoneGlow.visible=false;world.stoneL.intensity=0;world.stoneLbl.visible=false;world.ring.visible=false;world.dome.visible=false;world.tray.visible=false;world.notes.visible=false;world.shops.visible=false;world.glass.visible=false;world.bucket.visible=false;world.toiletGlow.visible=false;world.toiletL.intensity=0;world.apron.visible=false;}

/* ---------------- characters */
const CAST_IDS={me:'leo',tobi:'tobi',mia:'mia',brick:'brick',rex:'rex',dex:'dex',nova:'nova',penny:'penny',wren:'wren',jet:'jet',benny:'benny',kip:'kip',theo:'theo',sora:'sora',grimm:'grimm'};
function buildChars(){Object.entries(CAST_IDS).forEach(([id,cid])=>{const g=buildChar(BH.castById(cid));scene.add(g);g.visible=false;chars[id]=g;});
  Object.values(chars).forEach(c=>c.traverse(o=>{if(o.isMesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m&&m.isMeshStandardMaterial&&m.metalness<0.3&&m.roughness<0.9)m.roughness=0.92;});}));
  world.apron=box(2.15,2.7,0.12,SM({color:'#f4f4ee',roughness:0.9}),0,2.7,0.58,chars.brick.userData.P.torso);world.apron.visible=false;}
function showOnly(ids){Object.keys(chars).forEach(k=>chars[k].visible=ids.includes(k));}
function reset(P){['armL','armR','legL','legR','head'].forEach(k=>P[k].rotation.set(0,0,0));P.torso.rotation.set(0,0,0);P.torso.position.y=0;P.torso.scale.set(1,1,1);P._anim=null;}
function st(id,x,y,z,ry,e,o){const c=chars[id];c.position.set(x,y,z);c.rotation.set(0,ry||0,0);c.visible=true;const P=c.userData.P;reset(P);P._e=e||'default';P._o=o||{};P._noIdle=false;P._talk=0;P.setFace(P._e);return P;}
function face(P,e,o){P._e=e;P._o=o||{};}
function walk(P,t,sp){BH.animate(P,t*(sp||1),{motion:'walk',blend:0.01,face:false});P._noIdle=true;}
function sit(P){P.legL.rotation.x=-1.5;P.legR.rotation.x=-1.5;}
function laugh(P,t,ph){P.torso.rotation.x=-0.12+0.08*Math.sin(t*14+(ph||0));P.head.rotation.x=-0.2+0.1*Math.sin(t*14+(ph||0));P._o={mouthOpen:0.6+0.35*Math.abs(Math.sin(t*12+(ph||0)))};P._noIdle=true;}
function point(P,arm){P[arm||'armR'].rotation.set(-1.55,0,arm==='armL'?0.15:-0.15);}
function lw0(o,v){let r=o;while(r.parent&&r.parent!==scene)r=r.parent;r.updateMatrixWorld(true);return o.localToWorld(v);}
const head=id=>lw0(chars[id].userData.P.head,V3(0,0.6,0));
const faceCam=(id,x,y,d)=>lw0(chars[id].userData.P.head,V3(x,0.6+y,d));
const handOf=(id,arm)=>lw0(chars[id].userData.P[arm||'armR'],V3(0,-2.1,0.2));
// a couple walking towards +z holding hands (a on the left, b on the right)
function couple(a,b,x,z,t,ea,eb,ph){const A=st(a,x-1.35,0,z,0,ea||'happy');const B=st(b,x+1.35,0,z,0,eb||'happy');walk(A,t+(ph||0));walk(B,t+(ph||0)+0.5);A.armL.rotation.z=0;A.armR.rotation.set(-0.15,0,0.55);B.armL.rotation.set(-0.15,0,-0.55);
  A.head.rotation.y=0.35;B.head.rotation.y=-0.35;}
function talkAmt(t,who){const s=TL.segs.find(s=>t>=s.start&&t<s.end);if(!s||s.who!==who)return 0;return 0.15+0.55*Math.abs(Math.sin(t*15))*Math.abs(Math.sin(t*4.3+1));}
function act(t){Object.entries(chars).forEach(([id,c],i)=>{if(!c.visible)return;const P=c.userData.P;if(!P._noIdle){const ph=i*1.7;P.torso.scale.y=1+0.012*Math.sin(t*2.4+ph);P.head.rotation.x+=0.025*Math.sin(t*0.9+ph);P.head.rotation.y+=0.04*Math.sin(t*0.6+ph);}
  const o=Object.assign({},P._o||{});if(P._talk)o.mouthOpen=talkAmt(t,P._talk);if(o.blink==null)o.blink=((t+i*0.9)%3.4)<0.1;P.setFace(P._e,o);});}

/* ---------------- camera kit */
function camAt(p,l,fov){cam.position.copy(p);cam.up.set(0,1,0);cam.lookAt(l);cam.fov=fov||40;cam.updateProjectionMatrix();world.look.copy(l);}
function dolly(p0,p1,l0,l1,u,f0,f1){const k=eio(u);camAt(p0.clone().lerp(p1,k),l0.clone().lerp(l1,k),lerp(f0||40,f1||f0||40,k));}
function cu(id,d,x,y,fov,u,push){const hp=head(id);const dd=d*(1-(push||0.12)*eio(u||0));camAt(faceCam(id,x,y,dd*1.75),hp.clone().add(V3(0,-0.1,0)),fov||34);S.focus=focusOf(id);}
function handheld(t,a){cam.position.x+=(Math.sin(t*1.3)+Math.sin(t*2.9)*0.5)*a;cam.position.y+=(Math.sin(t*1.7+1)+Math.sin(t*3.3)*0.4)*a*0.7;}
function shake(a,t){cam.position.x+=Math.sin(t*23.1)*a+Math.sin(t*41.7)*a*0.5;cam.position.y+=Math.cos(t*19.3)*a;}
function focusOf(id){cam.updateMatrixWorld(true);const p=head(id).clone().add(V3(0,-0.6,0)).project(cam);return {x:(p.x+1)/2,y:(1-p.y)/2,r:0.34};}
function proj(v){cam.updateMatrixWorld(true);const p=v.clone().project(cam);return {x:(p.x+1)/2*W,y:(1-p.y)/2*H};}
function mood(m){world.mood=m;const day=m==='day'||m==='caf'||m==='bath';
  world.hemi.color.setHex(day?0xfff4e6:0x5a6ab8);world.hemi.groundColor.setHex(day?0x40362c:0x101018);world.hemi.intensity=day?0.85:(m==='flip'?0.3:0.22);world.key.intensity=day?0.6:0.08;
  world.hallKey.intensity=world.hallKey2.intensity=m==='day'?1.0:0;world.cafKey.intensity=world.cafKey2.intensity=m==='caf'?1.1:0;world.stLamp.intensity=m==='rain'||m==='flip'?1.6:0;world.stFill.intensity=m==='rain'||m==='flip'?0.7:0;
  scene.background.setHex(day?0x0a0a10:0x0c0e1a);world.bathKey.intensity=m==='bath'?1.0:0;}
function stoneAt(p,scale,lbl){const s=world.stone;s.visible=true;s.position.copy(p);s.scale.set(scale,scale*0.75,scale);s.rotation.y+=0.0;world.stoneGlow.visible=true;world.stoneGlow.position.copy(p);world.stoneGlow.scale.setScalar(2.6*scale);world.stoneL.position.copy(p).add(V3(0,1,1));world.stoneL.intensity=2.2;
  if(lbl){world.stoneLbl.visible=true;world.stoneLbl.position.copy(p).add(V3(0,1.3*scale,0));}}
const ALL_EXTRAS=['benny','kip','nova','penny','theo','dex','wren','jet'];
const TOBI=V3(CAF+20,0,13.4), ZT=V3(CAF+21.6,0,18.9), TRAY=V3(CAF+20,3.5,16);
function seatCrowd(t){const seat=(id,x,z,ph)=>{const P=st(id,CAF+x,0,z,0,'happy');sit(P);laugh(P,t,ph);P._o.mouthOpen*=0.5;};
  seat('benny',-16,-12.7,0);seat('nova',-12,-12.7,1);seat('kip',2,-12.7,2);seat('penny',-2,-12.7,3);seat('theo',12,-12.7,4);seat('wren',16,-12.7,5);seat('dex',-2,1.3,6);seat('jet',2,1.3,7);}
function tobiSit(e){const T=st('tobi',TOBI.x,0,TOBI.z,0,e||'sad');sit(T);return T;}
function keepers(t,skip){world.shops.visible=true;STALLS.forEach((S0,i)=>{if(skip&&skip.includes(S0.id))return;const P=st(S0.id,S0.x,0,S0.z-1.7,0,'happy');P.armR.rotation.set(-0.9+Math.sin(t*5+i)*0.3,0,-0.2);P.armL.rotation.set(-0.5,0,0.2);});}
const KEEP=STALLS.map(s=>s.id);
function brickAt(e){const B=st('brick',-3.6,0,2.3,0,e);world.apron.visible=true;return B;}
function stink(p,k){const q=proj(p);(S.stink=S.stink||[]).push({x:q.x,y:q.y,k:k==null?1:k});}

const SH={
  caf_couples:(u,t)=>{mood('caf');seatCrowd(t);const T=tobiSit('sad');T.head.rotation.x=0.25;
    dolly(V3(CAF-6,10,27),V3(CAF+18,7.2,28),V3(CAF-4,3,-6),V3(CAF+19.6,4.2,13.4),u,50,40);showOnly([...ALL_EXTRAS,'tobi']);S.hearts={n:8,seed:'c1'};},
  tobi_heart:(u,t)=>{mood('caf');const T=tobiSit('shocked');const ky=st('sora',CAF+lerp(27,12,u),0,8.5,-Math.PI/2,'smug');walk(ky,t);T.head.rotation.y=lerp(-0.7,0.7,u);T.torso.rotation.y=lerp(-0.3,0.3,u);
    camAt(V3(CAF+16,6.4,27),V3(CAF+19.5,4.6,13.4),36);showOnly(['tobi','sora']);S.focus=focusOf('tobi');const hp=proj(head('tobi').clone().add(V3(0,1.6,0)));if(u>0.3)S.heartPop={k:clamp((u-0.3)/0.2,0,1),x:hp.x/W,y:hp.y/H,col:'#ff3a7a'};},
  bullies_point:(u,t)=>{mood('caf');const ids=['brick','rex','dex'];ids.forEach((id,i)=>{const P=st(id,CAF+(i-1)*2.7,0,14+Math.abs(i-1)*1.2,0,'happy');laugh(P,t,i);point(P,i===2?'armL':'armR');});
    camAt(V3(CAF+0.6,7.2,29),V3(CAF,5.0,14),44);S.zoomPunch=u<0.15?1-u/0.15:0;showOnly(ids);S.shakeA=0.03;},
  flashback_stone:(u,t)=>{mood('rain');const P=st('me',ST-4,0.5,4,0.2,'angry');P.armR.rotation.set(-2.4,0,-0.2);const hp=handOf('me');stoneAt(hp.clone().add(V3(0,0.6,0.6)),1.0);world.stoneL.intensity=3.5;
    cu('me',4.8,0.6,0.6,40,u,0.2);S.focus=null;showOnly(['me']);S.rain=0.8;S.grade='bw';S.topTag=1;S.vign=0.7;},
  flashback_wave:(u,t,lt)=>{mood('flip');const c=V3(ST-4,0.6,4);const r=easeOut(u)*42+1;world.ring.visible=true;world.ring.position.copy(c);world.ring.scale.set(r,r,r);world.ring.material.opacity=0.9*(1-u*0.6);
    world.dome.visible=true;world.dome.position.copy(c);world.dome.scale.set(r*0.98,r*0.55,r*0.98);world.dome.material.opacity=0.32*(1-u*0.7);
    dolly(V3(ST+18,70,58),V3(ST+16,66,52),V3(ST-4,0,-4),V3(ST-4,0,-4),u,56,54);showOnly([]);S.flash=lt<0.2?0.8*(1-lt/0.2):0;S.shakeA=0.2*(1-u);S.grade='bw';S.topTag=1;},
  search_puddle:(u,t)=>{mood('rain');const P=st('me',ST-6.6,0.5,4,Math.PI/2,'sad',{mouthOpen:0.3});P.legL.rotation.x=-0.2;P.legR.rotation.x=-1.4;P.torso.rotation.x=0.6;P.armR.rotation.set(-1.0+Math.sin(t*14)*0.35,0,0);P.armL.rotation.set(-1.0+Math.sin(t*14+2)*0.35,0,0);P._noIdle=true;
    dolly(V3(ST-2.4,4.6,15),V3(ST-2.8,4.2,13.5),V3(ST-5.2,2.6,4),V3(ST-5.2,2.6,4),u,40,38);showOnly(['me']);S.rain=1;S.vign=0.65;S.splash=1;},
  search_bin:(u,t)=>{mood('rain');const b=world.bin;const P=st('me',b.x,7.4,b.z,0,'default');chars.me.rotation.x=Math.PI;P.legL.rotation.x=Math.sin(t*13)*0.7;P.legR.rotation.x=-Math.sin(t*13)*0.7;P._noIdle=true;
    dolly(V3(b.x+6,5.6,b.z+14),V3(b.x+5,5.4,b.z+12.5),V3(b.x,5.2,b.z),V3(b.x,5.2,b.z),u,42,40);showOnly(['me']);S.rain=1;S.vign=0.65;},
  toilet_glow:(u,t)=>{mood('bath');const p=0.7+0.3*Math.sin(t*6);world.toiletL.intensity=2.5*p;world.toiletGlow.visible=true;world.toiletGlow.material.opacity=0.5+0.3*p;
    dolly(V3(BATH+0.6,6.5,10),V3(BATH+0.3,4.6,3.5),V3(BATH,2.2,-3.2),V3(BATH,2.0,-3.2),u,44,38);showOnly([]);stink(world.toilet.clone().add(V3(0,0.8,0)),1.4);S.vign=0.6;},
  zash_horror:(u,t)=>{mood('bath');world.toiletL.intensity=3;const P=st('me',BATH,0,1.2,Math.PI,'shocked',{blink:false,mouthOpen:0.5});P._noIdle=true;P.torso.rotation.x=0.18;P.armL.rotation.set(0,0,-0.5);P.armR.rotation.set(0,0,0.5);
    const hp=head('me');camAt(V3(BATH,2.4,-2.9),hp.clone().add(V3(0,-0.3,0)),lerp(52,46,u));world.bathKey.intensity=0.5;showOnly(['me']);S.vign=0.7;S.zoomPunch=u<0.2?1-u/0.2:0;},
  fish_out:(u,t,lt)=>{mood('bath');world.toiletL.intensity=1.5;const P=st('me',BATH-2.1,0,-3.0,Math.PI/2,'sad',{mouthOpen:0.3});P.legL.rotation.x=-0.2;P.legR.rotation.x=-1.4;const k=easeOut((lt-0.5)/0.8);P.torso.rotation.x=lerp(0.75,0.25,k);P.armR.rotation.set(lerp(-0.7,-1.6,k),0,0);P.armL.rotation.set(-2.5,0,-0.75);P.head.rotation.y=-0.9;P._noIdle=true;
    const hp=handOf('me');stoneAt(hp.clone().add(V3(0,-0.2,0)),0.8);stink(hp.clone().add(V3(0,0.6,0)),1.2);
    dolly(V3(BATH+1.2,5.2,6.5),V3(BATH+0.9,4.8,5.5),V3(BATH-0.8,3.0,-3),V3(BATH-0.8,3.4,-3),u,42,40);showOnly(['me']);},
  fly_dies:(u,t,lt)=>{mood('bath');const P=st('me',BATH,0,2,0,'sad',{mouthOpen:0.2});P.armR.rotation.set(-1.55,0,0.1);P.armL.rotation.set(-2.3,0,0.6);P.head.rotation.y=0.5;P.torso.rotation.x=-0.15;P._noIdle=true;
    const hp=handOf('me').add(V3(0,0.5,0.3));stoneAt(hp,0.8);stink(hp.clone().add(V3(0,0.7,0)),1.2);camAt(V3(BATH+4.2,5.8,11.5),V3(BATH-0.2,5.0,3),40);showOnly(['me']);const q=proj(hp.clone().add(V3(0,1.2,0)));S.fly={x:q.x,y:q.y,lt};},
  stone_tray:(u,t,lt)=>{mood('caf');const T=tobiSit('shocked');T.torso.rotation.x=-0.25;T._noIdle=true;const Z=st('me',ZT.x,0,ZT.z,Math.PI,'happy');Z._talk='zash';const k=easeOut(lt/0.35);Z.armR.rotation.set(lerp(-2.6,-1.1,k),0,0.2);Z.torso.rotation.x=0.2;
    world.tray.visible=true;world.tray.position.copy(TRAY);const sp=TRAY.clone().add(V3(0.2,lerp(3,0.55,k),0.2));stoneAt(sp,0.8);stink(sp.clone().add(V3(0,0.7,0)),1.2);
    dolly(V3(CAF+3,6.6,16.4),V3(CAF+4.5,6.3,16.3),V3(CAF+20.6,4.6,16.1),V3(CAF+20.6,4.6,16.1),u,44,42);showOnly(['tobi','me']);S.shakeA=lt>0.3&&lt<0.5?0.1:0;},
  guy_waves:(u,t)=>{mood('caf');const G=st('sora',CAF+14,0,24,Math.PI*0.85,'happy');G.armR.rotation.set(0,0,2.5+Math.sin(t*9)*0.35);G.head.rotation.z=0.12;cu('sora',4.6,-0.3,0.1,36,u,0.15);showOnly(['sora']);S.hearts={n:5,seed:'g1'};},
  tobi_shrug:(u,t,lt)=>{mood('caf');const T=tobiSit('happy');T._talk='tobi';T.armL.rotation.set(-0.5,0,-0.9);T.armR.rotation.set(-0.5,0,0.9);T.head.rotation.z=0.12;world.tray.visible=true;world.tray.position.copy(TRAY);
    cu('tobi',4.4,0.3,0.1,36,u,0.12);S.focus=null;showOnly(['tobi']);const hp=proj(head('tobi').clone().add(V3(0,1.7,0)));S.heartPop={k:clamp(lt/0.25,0,1),x:hp.x/W,y:hp.y/H,col:'#ff3a7a'};},
  zash_rage:(u,t)=>{mood('caf');const Z=st('me',ZT.x,0,ZT.z,Math.PI,'angry',{blink:false});Z._talk='zash';Z._noIdle=true;Z.armR.rotation.set(-2.2,0,0.5+Math.sin(t*20)*0.1);Z.armL.rotation.set(0,0,-0.6);
    cu('me',4.6,-0.3,0.1,38,u,0.1);S.focus=null;showOnly(['me']);S.shakeA=0.08;S.speed={k:0.5,col:'#ffe0a0'};stink(handOf('me').add(V3(0,0.5,0)),0.9);},
  tobi_grabs:(u,t,lt)=>{mood('caf');const T=tobiSit('angry');T._talk='tobi';const k=easeOut(lt/0.4);T.armR.rotation.set(lerp(-1.0,-2.7,k),0,-0.15);const hp=handOf('tobi').add(V3(0,0.5,0));stoneAt(hp,0.9);world.stoneL.intensity=3+lt*2;stink(hp.clone().add(V3(0,0.8,0)),0.8);
    const h0=head('tobi');dolly(V3(CAF+18.2,4.2,21.5),V3(CAF+18.6,4.0,20.2),h0.clone().add(V3(0,0.4,0)),h0.clone().add(V3(0,0.6,0)),u,40,38);showOnly(['tobi']);S.speed={k:0.3+0.4*u,col:'#e0b0ff'};},
  wish_flash:(u,t,lt)=>{mood('caf');const T=tobiSit('angry');T.armR.rotation.set(-2.7,0,-0.15);T._o={mouthOpen:0.8};const hp=handOf('tobi').add(V3(0,0.5,0));stoneAt(hp,0.9+u);world.stoneL.intensity=6;
    const r=easeOut(u)*14+0.5;world.ring.visible=true;world.ring.position.copy(hp);world.ring.scale.set(r,r,r);world.ring.rotation.x=Math.PI/2;
    const h0=head('tobi');camAt(V3(CAF+18.6,4.0,20.2),h0.clone().add(V3(0,0.6,0)),38);showOnly(['tobi']);S.flash=clamp(u*1.3,0,1);S.shakeA=0.15;},
  hall_shops:(u,t,lt)=>{mood('day');keepers(t);const A=st('theo',-0.8,0,lerp(-14,-8,u),0,'shocked');walk(A,t);const B=st('wren',1.2,0,lerp(-22,-16,u),0,'happy');walk(B,t+1);
    dolly(V3(0,9.5,24),V3(0,7.6,17),V3(0,4.6,-8),V3(0,4.6,-8),u,48,44);showOnly([...KEEP,'theo','wren']);S.flash=lt<0.3?1-lt/0.3:0;},
  brick_lemonade:(u,t)=>{mood('day');keepers(t,['brick']);const B=brickAt('shocked');B._talk='brick';B._noIdle=true;B.armL.rotation.set(-0.7+Math.sin(t*16)*0.4,0,0.9);B.armR.rotation.set(-0.7+Math.sin(t*16+2)*0.4,0,-0.9);B.head.rotation.y=Math.sin(t*7)*0.3;
    ['theo','wren','jet','dex'].forEach((id,i)=>{const P=st(id,-5.4+(i%2?0.3:-0.3),0,7.6+i*2.3,Math.PI,'happy');});
    const hb=head('brick');dolly(V3(0.2,6.6,9.6),V3(-0.2,6.4,8.8),hb.clone().add(V3(0,-0.9,0)),hb.clone().add(V3(0,-0.9,0)),u,40,38);showOnly([...KEEP,'theo','wren','jet','dex']);S.shakeA=0.03;},
  shop_cuts:(u,t)=>{mood('day');keepers(t,u<0.5?['benny']:['grimm']);
    if(u<0.5){const P=st('benny',-3.6,0,-11.7,0,'sad');P.armL.rotation.set(-1.2+Math.sin(t*22)*0.2,0,0.2);P.armR.rotation.set(-1.2+Math.sin(t*22+1.5)*0.2,0,-0.2);P.head.rotation.x=0.25;P._noIdle=true;camAt(V3(-1.0,5.6,-3.4),V3(-3.6,4.5,-11),38);}
    else{const P=st('grimm',3.6,0,-18.7,0,'happy');P.armR.rotation.set(-1.5,0,-0.3+Math.sin(t*8)*0.3);camAt(V3(0.4,6.2,-9.5),V3(3.6,4.8,-18),38);}
    showOnly(KEEP);S.zoomPunch=(u<0.08||(u>0.5&&u<0.58))?1:0;},
  two_straws:(u,t)=>{mood('day');keepers(t,['brick']);brickAt('happy');const T=st('tobi',-1.9,0,10,Math.PI/2,'happy');const G=st('sora',1.9,0,10,-Math.PI/2,'happy');T.torso.rotation.x=0.1;G.torso.rotation.x=0.1;T.armR.rotation.set(-1.2,0,0);G.armL.rotation.set(-1.2,0,0);T._noIdle=G._noIdle=true;
    world.glass.visible=true;world.glass.position.set(0,4.7,10);dolly(V3(0.4,6.2,22),V3(0.2,6,20.5),V3(0,5.0,10),V3(0,5.0,10),u,34,32);showOnly([...KEEP,'tobi','sora']);S.hearts={n:8,seed:'s1'};S.grade='warm';S.focus={x:0.5,y:0.42,r:0.45};},
  zash_sniff:(u,t,lt)=>{mood('day');keepers(t,['brick']);brickAt('default');const gag=lt>0.55;const Z=st('me',1.5,0,12,0,gag?'sad':'default',gag?{mouthOpen:0.7}:{});Z.armR.rotation.set(-2.35,0,0.55);Z.head.rotation.x=gag?-0.3:0.1;Z._noIdle=true;
    cu('me',4.8,0.4,0.1,36,u,0.1);showOnly([...KEEP,'me']);stink(handOf('me').add(V3(0,0.4,0)),0.9);S.shakeA=gag?0.05:0;},
  brick_stone:(u,t,lt)=>{mood('day');world.shops.visible=true;world.hallKey.intensity=world.hallKey2.intensity=0.1;world.hemi.intensity=0.4;world.key.intensity=0.06;const B=brickAt('smug');B._talk='brick';B._noIdle=true;B.head.rotation.y=0.45;B.armR.rotation.set(-1.2,0,0.3);
    world.bucket.visible=true;world.bucket.position.set(-1.9,3.9,4.1);const k=easeOut(lt/0.9);const sp=V3(-1.9,lerp(4.0,5.4,k),4.1);stoneAt(sp,0.8);world.stoneL.intensity=4;world.stone.rotation.y=t;
    camAt(V3(-2.2,4.6,11.5),V3(-2.9,5.4,2.8),lerp(38,34,u));showOnly(['brick']);S.vign=0.8;},
  end_card:(u,t,lt)=>{mood('day');world.shops.visible=true;world.hallKey.intensity=world.hallKey2.intensity=0.1;world.hemi.intensity=0.4;world.key.intensity=0.06;const B=brickAt('smug');B._noIdle=true;B.head.rotation.y=0.45;B.armR.rotation.set(-1.2,0,0.3);
    world.bucket.visible=true;world.bucket.position.set(-1.9,3.9,4.1);stoneAt(V3(-1.9,5.4+Math.sin(t*2)*0.1,4.1),0.8);world.stoneL.intensity=4+Math.sin(t*5);world.stone.rotation.y=t;
    camAt(V3(-2.2,4.6,11.5),V3(-2.9,5.4,2.8),34);showOnly(['brick']);S.vign=0.8;S.dim=0.4*clamp(lt/0.4,0,1);S.endText=clamp(lt/0.3,0,1);S.follow=clamp((lt-2.2)/0.4,0,1);S.black=clamp((u-0.95)/0.05,0,1)*0.85;},
};

/* ---------------- 2D overlays + post */
function T(text,x,y,size,fill,stroke,lw,align){og.font=`${size}px ${FONT}`;og.textAlign=align||'center';og.textBaseline='middle';og.lineJoin='round';if(stroke){og.lineWidth=lw||size*0.18;og.strokeStyle=stroke;og.strokeText(text,x,y);}og.fillStyle=fill;og.fillText(text,x,y);}
function RR(x,y,w,h,r){og.beginPath();og.moveTo(x+r,y);og.arcTo(x+w,y,x+w,y+h,r);og.arcTo(x+w,y+h,x,y+h,r);og.arcTo(x,y+h,x,y,r);og.arcTo(x,y,x+w,y,r);og.closePath();}
function heart(x,y,s,col,a){og.save();og.globalAlpha=a==null?1:a;og.translate(x,y);og.scale(s,s);og.beginPath();og.moveTo(0,0.35);og.bezierCurveTo(-0.9,-0.3,-0.45,-1.0,0,-0.45);og.bezierCurveTo(0.45,-1.0,0.9,-0.3,0,0.35);og.closePath();og.fillStyle=col;og.fill();og.lineWidth=0.08;og.strokeStyle='#2a0a14';og.stroke();
  og.fillStyle='rgba(255,255,255,0.5)';og.beginPath();og.ellipse(-0.3,-0.45,0.12,0.07,-0.6,0,7);og.fill();og.restore();}
function composite(src){const f=S.focus;
  if(f){og.filter=`blur(${Math.round(W*0.006)}px)`;og.drawImage(src,0,0,W,H);og.filter='none';tg.clearRect(0,0,W,H);tg.globalCompositeOperation='source-over';tg.drawImage(src,0,0,W,H);tg.globalCompositeOperation='destination-in';const cx=f.x*W,cy=f.y*H,r=f.r*W;
    const gr=tg.createRadialGradient(cx,cy,r*0.5,cx,cy,r*1.3);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(1,'rgba(0,0,0,0)');tg.fillStyle=gr;tg.fillRect(0,0,W,H);tg.globalCompositeOperation='source-over';og.drawImage(tmpC,0,0);}
  else og.drawImage(src,0,0,W,H);}
function drawOverlays(t){
  if(S.rain){const r=rng('rn'+Math.floor(t*30));og.save();og.strokeStyle='rgba(200,215,255,0.35)';og.lineWidth=W*0.0025;for(let i=0;i<160*S.rain;i++){const x=r()*W,y=r()*H,l=H*(0.03+r()*0.04);og.beginPath();og.moveTo(x,y);og.lineTo(x-l*0.18,y+l);og.stroke();}og.restore();}
  if(S.splash){const r=rng('spl'+Math.floor(t*15));og.save();og.fillStyle='rgba(210,225,255,0.6)';for(let i=0;i<26;i++){og.beginPath();og.arc(W*(0.35+r()*0.3),H*(0.55+r()*0.12),W*(0.003+r()*0.006),0,7);og.fill();}og.restore();}
  if(S.speed){const r=rng('sp'+Math.floor(t*30));og.save();og.translate(W/2,H/2);og.strokeStyle=S.speed.col;for(let i=0;i<70;i++){const a=r()*Math.PI*2,r0=H*(0.3+r()*0.12),r1=H*(0.75+r()*0.2);og.globalAlpha=S.speed.k*(0.25+r()*0.45);og.lineWidth=W*(0.002+r()*0.006);og.beginPath();og.moveTo(Math.cos(a)*r0,Math.sin(a)*r0);og.lineTo(Math.cos(a)*r1,Math.sin(a)*r1);og.stroke();}og.restore();}
  if(S.hearts){const r=rng(S.hearts.seed);for(let i=0;i<S.hearts.n;i++){const x=W*(0.08+r()*0.84),sp=0.06+r()*0.08,y=H*(1.05-((t*sp+r())%1)*1.1),s=W*(0.025+r()*0.03);heart(x+Math.sin(t*2+i)*W*0.01,y,s,i%3?'#ff6a9a':'#ff9ac0',0.55);}}
  if(S.heartPop){const k=S.heartPop.k;const sc=k<1?easeOut(k)*1.25:1.0+0.06*Math.sin(t*16);heart(S.heartPop.x*W,S.heartPop.y*H,W*0.1*sc,S.heartPop.col,1);}
  if(S.stink){S.stink.forEach((q,j)=>{og.save();og.lineCap='round';for(let i=0;i<3;i++){const x0=q.x+(i-1)*W*0.045*q.k,ph=t*3+i*2+j;og.strokeStyle=`rgba(140,200,60,${0.75-((t*0.8+i*0.33)%1)*0.5})`;og.lineWidth=W*0.009*q.k;og.beginPath();for(let k2=0;k2<=12;k2++){const yy=q.y-k2*H*0.008*q.k-((t*0.8+i*0.33)%1)*H*0.02,xx=x0+Math.sin(k2*0.8+ph)*W*0.014*q.k;k2?og.lineTo(xx,yy):og.moveTo(xx,yy);}og.stroke();}og.restore();});}
  if(S.fly){const f=S.fly,dead=f.lt>0.6;let x,y;if(!dead){x=f.x+Math.cos(f.lt*18)*W*0.07;y=f.y+Math.sin(f.lt*23)*H*0.025;}else{const d=f.lt-0.6;x=f.x+W*0.05;y=f.y+d*d*H*1.6;}
    og.save();og.fillStyle='#16161c';og.beginPath();og.arc(x,y,W*0.012,0,7);og.fill();og.fillStyle='rgba(220,235,255,0.7)';if(!dead){og.beginPath();og.ellipse(x-W*0.012,y-W*0.012,W*0.012,W*0.006,-0.6,0,7);og.fill();og.beginPath();og.ellipse(x+W*0.012,y-W*0.012,W*0.012,W*0.006,0.6,0,7);og.fill();}else{T('x',x,y-W*0.03,W*0.04,'#fff','#000',W*0.008);}og.restore();}
  if(S.dim){og.fillStyle=`rgba(0,0,0,${S.dim})`;og.fillRect(0,0,W,H);}
  if(S.topTag){og.save();og.translate(W/2,H*0.085);og.fillStyle='rgba(0,0,0,0.7)';RR(-W*0.3,-H*0.026,W*0.6,H*0.052,H*0.02);og.fill();T('LAST VIDEO  ↑',0,H*0.002,W*0.055,'#ffffff');og.restore();
    og.fillStyle='#000';og.fillRect(0,0,W,H*0.035);og.fillRect(0,H*0.965,W,H*0.035);}
  const vg=og.createRadialGradient(W/2,H*0.48,H*0.28,W/2,H/2,H*0.78);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,`rgba(0,0,0,${S.vign||0.35})`);og.fillStyle=vg;og.fillRect(0,0,W,H);
  const r=rng('gr'+Math.floor(t*24));og.fillStyle='rgba(255,255,255,0.035)';for(let i=0;i<300;i++)og.fillRect(r()*W,r()*H,1.5,1.5);
  if(S.flash>0){og.fillStyle=`rgba(245,235,255,${S.flash})`;og.fillRect(0,0,W,H);}
  if(S.endText){const k=easeOut(S.endText);og.save();og.globalAlpha=k;og.translate(W/2,H*0.14);og.scale(0.8+0.2*k,0.8+0.2*k);og.rotate(-0.03);og.fillStyle='rgba(0,0,0,0.72)';RR(-W*0.44,-H*0.06,W*0.88,H*0.12,H*0.02);og.fill();
    T('SEND THIS TO',0,-H*0.024,W*0.07,'#ffffff');T('THAT FRIEND',0,H*0.03,W*0.085,'#ff5a8a');og.restore();}
  if(S.follow){const k=easeOut(S.follow),p=1+0.05*Math.sin(t*7);og.save();og.translate(W/2,H*0.88);og.scale(k*p,k*p);og.fillStyle='#ff2a3a';RR(-W*0.24,-H*0.032,W*0.48,H*0.064,H*0.03);og.fill();T('FOLLOW',0,0,W*0.075,'#fff');og.restore();}
  if(S.black>0){og.fillStyle=`rgba(0,0,0,${S.black})`;og.fillRect(0,0,W,H);}
}
function captionAt(t){for(const s of TL.segs){for(let i=0;i<s.words.length;i++){const w=s.words[i];const nx=s.words[i+1];const end=nx?nx.s:Math.min(w.e+0.25,s.end+0.25);if(t>=w.s&&t<end)return {w,since:t-w.s};}}return null;}
function drawCaption(t){if(S.black>=0.8)return;const c=captionAt(t);if(!c)return;const text=c.w.w.toUpperCase();const base=W*0.1*(text.length>8?8/text.length*1.05:1);const k=c.since<0.07?lerp(1.3,1,easeOut(c.since/0.07)):1;
  og.save();og.translate(W/2,H*0.7);og.scale(k,k);og.font=`${base}px ${FONT}`;og.textAlign='center';og.textBaseline='middle';og.lineJoin='round';og.shadowColor='rgba(0,0,0,0.7)';og.shadowBlur=base*0.3;og.lineWidth=base*0.22;og.strokeStyle='#0a0a12';og.strokeText(text,0,0);og.shadowColor='transparent';
  og.fillStyle=c.w.red?'#ffd23f':'#ffffff';og.fillText(text,0,0);og.restore();}

/* ---------------- entry points */
S.init=async function(timeline,w,h,fontUrl){TL=timeline;W=w;H=h;SS=window.BH_SS||1.25;
  const ff=new FontFace('Luckiest Guy',`url(${fontUrl})`);await ff.load();document.fonts.add(ff);
  R=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});R.setPixelRatio(1);R.setSize(Math.round(W*SS),Math.round(H*SS));R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.1;R.shadowMap.enabled=false;
  cam=new THREE.PerspectiveCamera(40,W/H,0.1,1000);
  buildWorld();buildChars();
  const [oc,o2]=cv(W,H);out=oc;og=o2;og.imageSmoothingEnabled=true;og.imageSmoothingQuality='high';const [tc,t2]=cv(W,H);tmpC=tc;tg=t2;const [gc2,gg2]=cv(W,H);gC=gc2;gg=gg2;scene.updateMatrixWorld(true);return true;};
const KEYS=['stink','fly','dim','topTag','flash','black','shakeA','zoomPunch','speed','focus','vign','grade','rain','splash','hearts','heartPop','endText','follow'];
S.frame=function(f,q){const t=f/TL.fps;const shot=TL.shots.find(s=>t>=s.s&&t<s.e)||TL.shots[TL.shots.length-1];
  KEYS.forEach(k=>S[k]=null);hideAll();
  if(shot!==curShot){curShot=shot;showOnly([]);}
  Object.values(chars).forEach(c=>{c.rotation.set(0,0,0);});
  const u=(t-shot.s)/(shot.e-shot.s),lt=t-shot.s;scene.updateMatrixWorld(true);
  (SH[shot.name]||SH.end_card)(u,t,lt);
  act(t);scene.updateMatrixWorld(true);
  handheld(t,0.03);if(S.shakeA)shake(S.shakeA,t);
  scene.updateMatrixWorld(true);R.render(scene,cam);
  og.globalAlpha=1;og.globalCompositeOperation='source-over';og.filter='none';og.fillStyle='#000';og.fillRect(0,0,W,H);
  if(S.zoomPunch){const z=1+0.06*S.zoomPunch;og.drawImage(R.domElement,(W-W*z)/2,(H-H*z)/2,W*z,H*z);}else composite(R.domElement);
  const m=world.mood;const grade=S.grade==='bw'?'grayscale(1) contrast(1.25) brightness(1.05)':S.grade==='warm'?'contrast(1.05) saturate(1.15) sepia(0.15)':S.grade==='drama'?'contrast(1.25) saturate(0.6)':m==='rain'||m==='flip'?'contrast(1.12) saturate(0.85) hue-rotate(8deg)':'contrast(1.05) saturate(1.18)';
  gg.clearRect(0,0,W,H);gg.drawImage(out,0,0);og.filter=grade;og.drawImage(gC,0,0);og.filter='none';
  og.filter=`blur(${Math.round(W*0.016)}px) brightness(1.2)`;og.globalCompositeOperation='screen';og.globalAlpha=0.1;og.drawImage(R.domElement,0,0,W,H);og.filter='none';og.globalCompositeOperation='source-over';og.globalAlpha=1;
  drawOverlays(t);drawCaption(t);
  return out.toDataURL('image/jpeg',q||0.94);};
})();
