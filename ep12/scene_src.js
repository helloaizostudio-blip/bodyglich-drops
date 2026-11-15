/* Episode 12 "The Cursed Grimoire" (narrator Zash). Fantasy village, grimoire ceremony, a fire knight from the
   monster realm, and a heavy black katana that rises from the cursed book. Premium camera kit from Ep 11 (dolly /
   orbit / OTS / handheld / fake DOF / whip smears / impact frames) + idle acting. All designs are original
   (black-sun grimoire, slim black katana, horned fire knight). ep12/scene.js = this + cast_ep12.js.
   Entry points: SAMPLE.init(...), SAMPLE.frame(f) */
(function(){
/*@CAST@*/
const S=window.SAMPLE={};
let TL,W,H,R,scene,cam,out,og,tmpC,tg,gC,gg,world={},chars={},curShot=null,SS=1.25;
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const lerp=(a,b,t)=>a+(b-a)*t,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);},easeOut=t=>1-Math.pow(1-clamp(t,0,1),3),easeIn=t=>Math.pow(clamp(t,0,1),2),eio=t=>{t=clamp(t,0,1);return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;};
const FONT='"Luckiest Guy", Impact, sans-serif';
const TRAIN=300;

/* ---------------- textures */
function canvasTex(w,h,draw){const [c,g]=cv(w,h);draw(g,w,h);const t=tex(c);t._c=c;return t;}
function glowTex(col){return canvasTex(128,128,(g)=>{const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.3,col);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);});}
function plankTex(col){return canvasTex(256,256,(g,w,h)=>{fabricFill(g,0,0,w,h,col,'canvas');g.strokeStyle='rgba(0,0,0,0.22)';g.lineWidth=3;for(let y=0;y<h;y+=42){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}});}
function cobbleTex(){return canvasTex(256,256,(g,w,h)=>{g.fillStyle='#6a665e';g.fillRect(0,0,w,h);const r=rng('cob');for(let y=0;y<8;y++)for(let x=0;x<8;x++){const ox=(y%2)*16;g.fillStyle=['#8a857a','#7a756a','#959084','#6f6a60'][Math.floor(r()*4)];g.beginPath();g.ellipse(x*32+16+ox,y*32+16,14,13,0,0,7);g.fill();}});}
function grassTex(){return canvasTex(256,256,(g,w,h)=>{g.fillStyle='#5a9a4a';g.fillRect(0,0,w,h);const r=rng('gr');for(let i=0;i<2000;i++){g.fillStyle=r()<0.5?'rgba(110,170,80,0.5)':'rgba(40,90,40,0.4)';g.fillRect(r()*w,r()*h,2,4);}});}
function wallTex(col){return canvasTex(256,256,(g,w,h)=>{fabricFill(g,0,0,w,h,col,'cotton');g.fillStyle='rgba(60,40,20,0.55)';g.fillRect(0,0,w,14);g.fillRect(0,h-14,w,14);g.fillRect(0,0,14,h);g.fillRect(w-14,0,14,h);g.save();g.translate(w/2,h/2);g.rotate(0.6);g.fillRect(-8,-w,16,w*2);g.restore();});}
function sunEmblem(glow){return canvasTex(256,256,(g,w,h)=>{g.clearRect(0,0,w,h);const c=128;if(glow){const gr=g.createRadialGradient(c,c,20,c,c,124);gr.addColorStop(0,'rgba(190,90,255,0.9)');gr.addColorStop(1,'rgba(190,90,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);}
  g.fillStyle=glow?'#1a0826':'#0c0c0e';for(let i=0;i<12;i++){const a=i/12*Math.PI*2;g.beginPath();g.moveTo(c+Math.cos(a-0.12)*52,c+Math.sin(a-0.12)*52);g.lineTo(c+Math.cos(a)*(i%2?84:104),c+Math.sin(a)*(i%2?84:104));g.lineTo(c+Math.cos(a+0.12)*52,c+Math.sin(a+0.12)*52);g.fill();}
  g.beginPath();g.arc(c,c,56,0,7);g.fill();g.strokeStyle=glow?'#d8a0ff':'#3a3a40';g.lineWidth=5;g.beginPath();g.arc(c,c,40,0,7);g.stroke();g.beginPath();g.arc(c,c,56,0,7);g.stroke();});}
function coverTex(col,trim,emblem){return canvasTex(256,320,(g,w,h)=>{fabricFill(g,0,0,w,h,col,'leather');g.strokeStyle=trim;g.lineWidth=10;g.strokeRect(14,14,w-28,h-28);g.lineWidth=3;g.strokeRect(30,30,w-60,h-60);
  g.fillStyle=trim;[[30,30],[w-30,30],[30,h-30],[w-30,h-30]].forEach(([x,y])=>{g.beginPath();g.arc(x,y,12,0,7);g.fill();});
  if(emblem==='gem'){const gr=g.createRadialGradient(w/2-10,h/2-10,4,w/2,h/2,44);gr.addColorStop(0,'#fff');gr.addColorStop(0.4,trim);gr.addColorStop(1,shade(col,-0.4));g.fillStyle=gr;g.beginPath();for(let i=0;i<6;i++){const a=i/6*Math.PI*2-Math.PI/2;g.lineTo(w/2+Math.cos(a)*44,h/2+Math.sin(a)*52);}g.closePath();g.fill();}});}

const SM=(o)=>new THREE.MeshStandardMaterial(o);
function cst(m){m.castShadow=true;m.receiveShadow=true;return m;}
function box(w,h,d,mat,x,y,z,parent){const m=cst(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat.isMaterial?mat:SM({color:mat,roughness:0.8})));m.position.set(x,y,z);(parent||scene).add(m);return m;}
function sprite(t,s,parent,op){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,opacity:op==null?1:op}));m.scale.set(s,s,1);(parent||scene).add(m);return m;}
function pl(col,int,dist,x,y,z,parent){const L=new THREE.PointLight(col,int,dist,1.6);L.position.set(x,y,z);(parent||scene).add(L);return L;}
function plane(w,h,mat,x,y,z,rx,parent){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);m.position.set(x,y,z);m.rotation.x=rx||0;m.receiveShadow=true;(parent||scene).add(m);return m;}

/* ---------------- props */
function makeBook(col,trim,emblemTex,glowCol){const g=new THREE.Group();const cm=SM({map:coverTex(col,trim,emblemTex?null:'gem'),roughness:0.6});
  const pages=cst(new THREE.Mesh(new THREE.BoxGeometry(1.5,2.0,0.34),SM({color:'#efe6d0',roughness:0.9})));g.add(pages);
  const front=cst(new THREE.Mesh(new THREE.BoxGeometry(1.62,2.12,0.08),[SM({color:col}),SM({color:col}),SM({color:col}),SM({color:col}),cm,SM({color:col})]));front.position.z=0.2;g.add(front);g.userData.front=front;
  const back=cst(new THREE.Mesh(new THREE.BoxGeometry(1.62,2.12,0.08),SM({color:col})));back.position.z=-0.2;g.add(back);box(0.1,2.12,0.48,SM({color:shade(col,-0.25)}),-0.8,0,0,g);
  if(emblemTex){const e=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2),new THREE.MeshBasicMaterial({map:emblemTex,transparent:true}));e.position.z=0.245;g.add(e);g.userData.emblem=e;}
  const pgs=new THREE.Group();for(let i=0;i<4;i++){const pv=new THREE.Group();pv.position.set(-0.75,0,0.19);const pm=new THREE.Mesh(new THREE.PlaneGeometry(1.5,2.0),new THREE.MeshStandardMaterial({color:0xf3ead6,side:THREE.DoubleSide,emissive:0x6a3ab8,emissiveIntensity:0.35}));pm.position.x=0.75;pv.add(pm);pgs.add(pv);}pgs.visible=false;g.add(pgs);g.userData.pages=pgs;
  if(glowCol){const s=sprite(glowTex(glowCol),5,g,0.7);s.position.z=-0.1;g.userData.glow=s;}scene.add(g);g.visible=false;return g;}
function makeKatana(){const g=new THREE.Group();const bm=SM({color:'#0c0c10',roughness:0.25,metalness:0.85});
  for(let i=0;i<6;i++){const s=cst(new THREE.Mesh(new THREE.BoxGeometry(0.2-i*0.012,1.0,0.07),bm));s.position.set(i*i*0.012,0.9+i*0.98,0);s.rotation.z=-i*0.025;g.add(s);
    const e=new THREE.Mesh(new THREE.BoxGeometry(0.03,1.0,0.075),SM({color:'#b070ff',emissive:0x7a30d8,emissiveIntensity:1.2}));e.position.set(i*i*0.012+0.1-i*0.006,0.9+i*0.98,0);e.rotation.z=-i*0.025;g.add(e);}
  const guard=cst(new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.34,0.08,8),SM({color:'#2a2a30',metalness:0.8,roughness:0.3})));guard.position.y=0.36;g.add(guard);
  const grip=cst(new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,1.2,8),SM({color:'#1a1a22',roughness:0.9})));grip.position.y=-0.26;g.add(grip);
  for(let i=0;i<5;i++){const w=new THREE.Mesh(new THREE.TorusGeometry(0.105,0.02,4,10),SM({color:'#6a3ab8'}));w.rotation.x=Math.PI/2;w.position.y=-0.75+i*0.24;g.add(w);}
  g.userData.aura=sprite(glowTex('rgba(150,70,255,0.8)'),7,g,0.5);g.userData.aura.position.y=3.4;scene.add(g);g.visible=false;return g;}

/* ---------------- world */
function buildWorld(){
  scene=new THREE.Scene();scene.background=new THREE.Color('#bfe0f5');scene.fog=new THREE.Fog(0xbfe0f5,90,280);
  world.hemi=new THREE.HemisphereLight(0xfff4e6,0x40362c,0.7);scene.add(world.hemi);
  const key=world.key=new THREE.DirectionalLight(0xfff0dc,1.0);key.castShadow=true;key.shadow.mapSize.set(2048,2048);const sc=key.shadow.camera;sc.left=-40;sc.right=40;sc.top=40;sc.bottom=-40;sc.near=1;sc.far=220;key.shadow.bias=-0.0004;key.shadow.normalBias=0.05;scene.add(key);scene.add(key.target);
  world.rim=new THREE.DirectionalLight(0x9fd0ff,0.5);scene.add(world.rim);scene.add(world.rim.target);
  world.look=V3(0,0,0);world.keyDir=V3(0.45,0.8,0.55).normalize();
  world.T={fire:glowTex('rgba(255,120,30,0.95)'),ember:glowTex('rgba(255,180,60,0.9)'),bolt:glowTex('rgba(150,170,255,0.95)'),dark:glowTex('rgba(120,50,220,0.85)'),gold:glowTex('rgba(255,210,110,0.9)'),smoke:glowTex('rgba(40,36,44,0.8)'),orb:glowTex('rgba(120,220,255,0.9)')};
  buildVillage();buildTrain();buildFX();
}
function buildVillage(){const g=world.village=new THREE.Group();scene.add(g);
  const ct=cobbleTex();ct.wrapS=ct.wrapT=THREE.RepeatWrapping;ct.repeat.set(14,14);plane(160,160,SM({map:ct,roughness:0.9}),0,0,0,-Math.PI/2,g);
  const cols=['#e8d8b8','#d8c0a0','#e0cfc0','#cfc4a8','#e6d2a8'];world.houses=[];world.houseFires=[];
  [[-22,-20,10,11],[-8,-26,12,13],[8,-26,11,12],[23,-20,10,11],[-30,-2,9,10],[30,-2,9,11],[-30,16,10,10],[30,16,10,12]].forEach(([x,z,w,h],i)=>{
    const hm=SM({map:wallTex(cols[i%5]),roughness:0.9});const b=box(w,h,9,hm,x,h/2,z,g);const rm=SM({color:i%2?'#7a3a2a':'#5a4a6a',roughness:0.9});
    [-1,1].forEach(s=>{const r=box(w*0.62,0.7,10,rm,x+s*w*0.26,h+1.7,z,g);r.rotation.z=-s*0.7;});
    const win=box(2,2,0.2,SM({color:'#ffd890',emissive:0xffb050,emissiveIntensity:0.5}),x,h*0.55,z+(z<0?4.6:0),g);if(Math.abs(x)>25){win.position.set(x+(x<0?4.6:-4.6)*w/9*0+ (x<0?w/2+0.05:-w/2-0.05),h*0.55,z);win.rotation.y=Math.PI/2;}world.houses.push(win);
    const f=sprite(world.T.fire,7,g,0);f.position.set(x,h+3,z+1);world.houseFires.push(f);});
  // ceremony stage + stone book tower
  const st=SM({color:'#a8a49a',roughness:0.9});const stage=new THREE.Mesh(new THREE.CylinderGeometry(7,7.6,1.2,32),st);stage.position.set(0,0.6,-10);cst(stage);g.add(stage);
  const tw=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.8,16,12),SM({color:'#8a867c',roughness:0.95}));tw.position.set(0,9,-17);cst(tw);g.add(tw);
  const cap=new THREE.Mesh(new THREE.ConeGeometry(3.2,5,12),SM({color:'#4a5a8a',roughness:0.8}));cap.position.set(0,19.5,-17);cst(cap);g.add(cap);
  world.torchL=[pl(0xffb060,0.0,26,-9,5,-6,g),pl(0xffb060,0.0,26,9,5,-6,g)];[-9,9].forEach(x=>{box(0.3,5,0.3,SM({color:'#3a2a1e'}),x,2.5,-6,g);sprite(world.T.fire,1.6,g,0.9).position.set(x,5.4,-6);});
  // portal
  const p=world.portal=new THREE.Group();g.add(p);p.position.set(0,6.5,-4);const ring=new THREE.Mesh(new THREE.TorusGeometry(5,0.5,10,40),SM({color:'#ff4a1a',emissive:0xff3a10,emissiveIntensity:2}));p.add(ring);
  const disc=new THREE.Mesh(new THREE.CircleGeometry(4.8,40),new THREE.MeshBasicMaterial({color:0x2a0408,side:THREE.DoubleSide}));p.add(disc);world.portalGlow=sprite(world.T.fire,16,p,0.6);world.portalL=pl(0xff4a1a,0,60,0,0,3,p);p.visible=false;
}
function buildTrain(){const g=world.train=new THREE.Group();g.position.set(TRAIN,0,0);scene.add(g);
  const gt=grassTex();gt.wrapS=gt.wrapT=THREE.RepeatWrapping;gt.repeat.set(12,12);plane(200,200,SM({map:gt,roughness:1}),0,0,0,-Math.PI/2,g);
  for(let i=0;i<10;i++){const tr=cst(new THREE.Mesh(new THREE.ConeGeometry(4,12,8),SM({color:i%2?'#2a6a3a':'#336f40'})));tr.position.set(-45+i*10,6,-26-(i%3)*6);g.add(tr);}
  const cliff=box(30,26,8,SM({color:'#7a7a80',roughness:1}),14,13,-22,g);world.fall=plane(6,26,new THREE.MeshStandardMaterial({color:0xbfe8ff,transparent:true,opacity:0.75,emissive:0x8ac8f0,emissiveIntensity:0.3}),14,13,-17.9,0,g);
  world.boulder=cst(new THREE.Mesh(new THREE.DodecahedronGeometry(2.4,1),SM({color:'#8a8478',roughness:1})));scene.add(world.boulder);world.boulder.visible=false;
}
function buildFX(){
  world.fx=[];for(let i=0;i<60;i++){const s=sprite(world.T.fire,2,scene);s.visible=false;world.fx.push(s);}
  world.embers=[];for(let i=0;i<40;i++){const s=sprite(world.T.ember,0.25,scene);s.visible=false;world.embers.push(s);}
  world.fxL=pl(0xff7a30,0,60,0,0,0);world.darkL=pl(0x9a50ff,0,40,0,0,0);
  world.books={fire:makeBook('#a8281a','#ffb040',null,'rgba(255,120,40,0.8)'),storm:makeBook('#3a2a8a','#b8c8ff',null,'rgba(150,170,255,0.8)'),gold:makeBook('#c89a2a','#fff0b0',null,'rgba(255,220,120,0.7)'),green:makeBook('#2a7a4a','#b8ffd0',null,'rgba(120,255,170,0.7)'),
    grey:makeBook('#5a5a5e','#3a3a40',sunEmblem(false),null)};
  world.sunGlowTex=sunEmblem(true);world.sunDullTex=world.books.grey.userData.emblem.material.map;
  world.katana=makeKatana();
  world.cracks=plane(9,9,new THREE.MeshBasicMaterial({map:canvasTex(256,256,(g)=>{g.strokeStyle='#120a18';g.lineWidth=5;const r=rng('crk');for(let i=0;i<9;i++){let a=i/9*Math.PI*2,x=128,y=128;g.beginPath();g.moveTo(x,y);for(let k=0;k<5;k++){a+=(r()-0.5)*0.7;x+=Math.cos(a)*22;y+=Math.sin(a)*22;g.lineTo(x,y);}g.stroke();}}),transparent:true}),0,0.06,0,-Math.PI/2);world.cracks.visible=false;
}
function hideFX(){world.fx.forEach(s=>s.visible=false);world.embers.forEach(s=>s.visible=false);world.fxL.intensity=0;world.darkL.intensity=0;Object.values(world.books).forEach(b=>{b.visible=false;b.rotation.set(0,0,0);b.scale.setScalar(1);b.userData.front.rotation.set(0,0,0);b.userData.front.position.set(0,0,0.2);b.userData.pages.visible=false;});world.fxL.color.setHex(0xff7a30);
  world.katana.visible=false;world.boulder.visible=false;world.cracks.visible=false;world.portal.visible=false;world.portalL.intensity=0;world.houseFires.forEach(f=>f.material.opacity=0);world.torchL.forEach(l=>l.intensity=0);world._fx=0;}
function fx(tx,p,s,op){const sp=world.fx[world._fx++%world.fx.length];sp.material.map=tx;sp.visible=true;sp.position.copy(p);sp.scale.set(s,s,1);sp.material.opacity=op==null?1:op;return sp;}
function fireBall(p,s,t){for(let i=0;i<5;i++){const a=i*1.3+t*6;fx(world.T.fire,p.clone().add(V3(Math.cos(a)*s*0.18,Math.sin(a*1.3)*s*0.18,Math.sin(a)*s*0.12)),s*(0.7+0.3*Math.sin(t*20+i)),0.9);}world.fxL.position.copy(p);world.fxL.intensity=2.5;}
function stream(tx,A,B,k,t,size,n){for(let i=0;i<(n||14);i++){const q=i/(n||14);if(q>k)break;const p=A.clone().lerp(B,q).add(V3(Math.sin(t*30+i)*0.3,Math.cos(t*26+i*2)*0.3,0));fx(tx,p,size*(0.7+0.5*q),0.9);}}
function bolt(A,B,t,seed){const r=rng('b'+seed+Math.floor(t*20));let p=A.clone();for(let i=1;i<=8;i++){const q=A.clone().lerp(B,i/8).add(V3((r()-0.5)*1.6,(r()-0.5)*1.6,(r()-0.5)*1.2));for(let k=0;k<2;k++)fx(world.T.bolt,p.clone().lerp(q,k/2),0.9,1);p=q;}}
function embers(c,t,spread){world.embers.forEach((s,i)=>{s.visible=true;const k=((t*0.25+i*0.071)%1);s.position.set(c.x+Math.sin(i*2.4)*spread+Math.sin(t+i)*1.5,c.y+k*22,c.z+Math.cos(i*1.7)*spread);const sc=0.18+0.2*(1-k);s.scale.set(sc,sc,1);s.material.opacity=1-k;});}
function burning(t,amt){world.houseFires.forEach((f,i)=>{f.material.opacity=amt*(0.7+0.3*Math.sin(t*9+i));f.scale.setScalar(6+Math.sin(t*7+i)*1.2);});}
function bookAt(k,p,ry,sc){const b=world.books[k];b.visible=true;b.position.copy(p);b.rotation.set(0,ry||0,0);b.scale.setScalar(sc||1);if(b.userData.glow)b.userData.glow.material.opacity=0.55;return b;}

/* ---------------- characters + acting */
function buildChars(){const add=(id,cid,sc)=>{const c=BH.castById(cid);const g=buildChar(c);if(sc)g.scale.setScalar(sc);scene.add(g);g.visible=false;chars[id]=g;return g;};
  add('zash','zash12');add('zashb','zashbuff12');add('kai','kai12');add('brick','brick12');add('firekid','firekid12');add('mom','mom12');add('knight','knight12',1.7);
  ['v0','v1','v2','v3','v4','v5'].forEach((id,i)=>add(id,id,i>3?0.85:1));
  // knight extras: horns, shoulder plates, ember eyes
  const KP=chars.knight.userData.P;const hm=SM({color:'#1a0e0c',roughness:0.5,metalness:0.6});[-1,1].forEach(s=>{const h=cst(new THREE.Mesh(new THREE.ConeGeometry(0.22,1.3,8),hm));h.position.set(s*0.55,1.5,0);h.rotation.z=-s*0.5;KP.head.add(h);
    const sp=cst(new THREE.Mesh(new THREE.BoxGeometry(1.5,0.7,1.5),SM({color:'#3a1a12',roughness:0.4,metalness:0.7})));sp.position.set(0,0.3,0);KP[s<0?'armL':'armR'].add(sp);});
  Object.values(chars).forEach(c=>c.traverse(o=>{if(o.isMesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m&&m.isMeshStandardMaterial&&m.metalness<0.3&&m.roughness<0.9){m.roughness=0.92;}});}));
  world.knightAura=sprite(world.T.fire,9,scene,0.35);world.knightAura.visible=false;
}
function showOnly(ids){Object.keys(chars).forEach(k=>chars[k].visible=ids.includes(k));}
function reset(P){['armL','armR','legL','legR','head'].forEach(k=>P[k].rotation.set(0,0,0));P.torso.rotation.set(0,0,0);P.torso.position.y=0;P.torso.scale.set(1,1,1);P._anim=null;P.armL.position.set(-1.5,4,0);P.armR.position.set(1.5,4,0);}
function st(id,x,y,z,ry,e){const c=chars[id];c.position.set(x,y,z);c.rotation.set(0,ry||0,0);c.visible=true;const P=c.userData.P;reset(P);P._e=e||'default';P._talk=null;P._noIdle=false;if(e)P.setFace(e);
  if(id==='knight'){world.knightAura.visible=true;world.knightAura.position.set(x,y+7,z-0.5);}return P;}
function sit(P){P.legL.rotation.x=-1.5;P.legR.rotation.x=-1.5;}
function kneel(P){P.legL.rotation.x=-0.2;P.legR.rotation.x=-1.4;P.torso.rotation.x=0.25;}
function walk(P,t,sp,e){BH.animate(P,t*(sp||1),{motion:'walk',blend:0.01,face:false});P.setFace(e||'default');P._noIdle=true;}
function talk(P,who){P._talk=who;}
function act(t){Object.entries(chars).forEach(([id,c],i)=>{if(!c.visible)return;const P=c.userData.P;if(P._noIdle)return;const ph=i*1.7;
  P.torso.scale.y=1+0.012*Math.sin(t*2.4+ph);P.head.rotation.x+=0.03*Math.sin(t*0.9+ph);P.head.rotation.y+=0.05*Math.sin(t*0.6+ph*1.3);P.head.rotation.z+=0.02*Math.sin(t*0.8+ph);
  P.armL.rotation.z+=0.03*Math.sin(t*1.1+ph);P.armR.rotation.z-=0.03*Math.sin(t*1.2+ph);
  let open=0;if(P._talk){const env=TL.mouth[P._talk];const f=Math.round(t*TL.fps);open=env?env[f]||0:0;if(open>0.12){P.armR.rotation.x+=-0.2*open*(0.6+0.4*Math.sin(t*5));P.head.rotation.x+=0.05*open;}}
  const blink=((t+ph)%3.3)<0.11;P.setFace(P._e,{mouthOpen:open>0.12?Math.min(1,open*1.1):0,blink:blink&&open<0.12});});}
function lw0(o,v){let r=o;while(r.parent&&r.parent!==scene)r=r.parent;r.updateMatrixWorld(true);return o.localToWorld(v);}
const head=id=>lw0(chars[id].userData.P.head,V3(0,0.6,0));
const faceCam=(id,x,y,d)=>lw0(chars[id].userData.P.head,V3(x,0.6+y,d));
const hand=(id,arm)=>lw0(chars[id].userData.P[arm||'armR'],V3(0,-2.1,0.2));
function cheer(P,t,i){P.armL.rotation.set(-2.8,0,0.4+Math.sin(t*9+i)*0.2);P.armR.rotation.set(-2.8,0,-0.4-Math.sin(t*9+i)*0.2);P._noIdle=false;}
function crowd(t,e,doCheer,sp){sp=sp||0.36;const ids=['v0','v1','v2','v3','v4','v5'];ids.forEach((id,i)=>{const a=(i-2.5)*sp;const P=st(id,Math.sin(a)*15,0,-10+Math.cos(a)*15,Math.PI+a,e||'happy');if(doCheer)cheer(P,t,i);});return ids;}
function heldKatana(id,mode,t){const K=world.katana;K.visible=true;const hp=hand(id,'armR');K.position.copy(hp);const ry=chars[id].rotation.y;
  if(mode==='up')K.rotation.set(0,ry,0.15);else if(mode==='guard')K.rotation.set(0.5,ry,-0.9);else if(mode==='swing')K.rotation.set(1.3,ry,-1.2);else if(mode==='low')K.rotation.set(0.25,ry,-2.0);
  K.userData.aura.material.opacity=0.45+0.15*Math.sin(t*8);world.darkL.position.copy(hp).add(V3(0,3,1));world.darkL.intensity=1.6;return K;}

/* ---------------- camera kit */
function camAt(p,l,fov){cam.position.copy(p);cam.lookAt(l);cam.fov=fov||40;cam.updateProjectionMatrix();world.look.copy(l);}
function dolly(p0,p1,l0,l1,u,f0,f1){const k=eio(u);camAt(p0.clone().lerp(p1,k),l0.clone().lerp(l1,k),lerp(f0||40,f1||f0||40,k));}
function orbit(c,r,a0,a1,y,u,fov,ly){const a=lerp(a0,a1,eio(u));camAt(V3(c.x+Math.sin(a)*r,c.y+y,c.z+Math.cos(a)*r),V3(c.x,c.y+(ly==null?0:ly),c.z),fov||40);}
function cu(id,d,x,y,fov,u,push){const hp=head(id);const sc=chars[id].scale.x;const dd=d*(1-(push||0.12)*eio(u||0));camAt(faceCam(id,x,y,dd*1.75/sc*Math.max(1,sc)),hp.clone().add(V3(0,-0.1,0)),fov||34);S.focus=focusOf(id);}
function handheld(t,a){cam.position.x+=(Math.sin(t*1.3)+Math.sin(t*2.9)*0.5)*a;cam.position.y+=(Math.sin(t*1.7+1)+Math.sin(t*3.3)*0.4)*a*0.7;cam.rotation.z+=Math.sin(t*1.1)*a*0.02;}
function shake(a,t){cam.position.x+=Math.sin(t*23.1)*a+Math.sin(t*41.7)*a*0.5;cam.position.y+=Math.cos(t*19.3)*a;}
function focusOf(id){cam.updateMatrixWorld(true);const p=head(id).clone().add(V3(0,-0.6,0)).project(cam);return {x:(p.x+1)/2,y:(1-p.y)/2,r:0.36};}
function mood(m){world.mood=m;const M={day:[0xbfe0f5,0xfff4e6,0.8,1.05,0xfff0dc,90,280],dawn:[0xf5c8a0,0xffe0c0,0.7,1.0,0xffc890,90,260],night:[0x140a12,0xc09a9a,0.42,0.4,0xff9a70,50,180],dark:[0x08060c,0x8a80a8,0.25,0.25,0xb090ff,40,140]}[m];
  scene.background.setHex(M[0]);scene.fog.color.setHex(M[0]);scene.fog.near=M[5];scene.fog.far=M[6];world.hemi.color.setHex(M[1]);world.hemi.intensity=M[2];world.key.intensity=M[3];world.key.color.setHex(M[4]);
  const n=m==='night'||m==='dark';world.houses.forEach(w=>w.material.emissiveIntensity=n?1.2:0.3);world.torchL.forEach(l=>l.intensity=n?0.9:0);}

/* ---------------- shots */
const KN=V3(0,0,2);            // where the knight stands in the square
const MOMP=V3(6,0,9);
const ZS=V3(-7,0,12);          // where Zash falls / the katana rises
const RY_KM=0.71,RY_KZ=-0.61,RY_ZK=2.53,RY_KK=-0.9,RY_KAI=2.25;
function nightFight(t,amt){mood('night');world.portal.visible=true;world.portal.rotation.z=t*0.6;world.portalL.intensity=2.5;world.portalGlow.material.opacity=0.5+0.2*Math.sin(t*5);burning(t,amt==null?1:amt);embers(V3(0,0,0),t,22);
  world.fxL.position.set(KN.x-2,8,KN.z+9);world.fxL.intensity=1.5;}
function knight(t,e,ry){const K=st('knight',KN.x,0,KN.z,ry==null?0:ry,e||'angry');K._noIdle=false;return K;}
function momKneel(e){const M=st('mom',MOMP.x,0,MOMP.z,Math.PI+RY_KM,e||'shocked');kneel(M);M.armL.rotation.set(-2.2,0,0.4);M.armR.rotation.set(-2.2,0,-0.4);M._noIdle=true;M.setFace(e||'shocked',{mouthOpen:0.7});return M;}
function zashDown(e,reach){const Z=st('zashb',ZS.x,0,ZS.z,0.5,e);kneel(Z);chars.zashb.rotation.x=0.3;Z.head.rotation.x=-0.35;Z.armL.rotation.set(-0.7,0,0.3);Z.armR.rotation.set(reach?-1.9:-0.7,0,-0.3);Z._noIdle=true;Z.setFace(e,{mouthOpen:reach?0.8:0});return Z;}
function stageTrio(){st('zashb',-3,1.2,-9,0,'happy');st('kai',0.5,1.2,-9.5,0,'default');st('firekid',3.5,1.2,-9,0,'happy');}
function greyOpen(t,k){const b=bookAt('grey',V3(ZS.x,0.4,ZS.z),0.4,1.2);b.rotation.x=-Math.PI/2;b.userData.emblem.material.map=world.sunGlowTex;b.userData.front.position.set(-1.6*k,0,0.2);b.userData.front.rotation.y=-2.6*k;b.userData.pages.visible=k>0.5;return b;}
const SH={
  cold_fire:(u,t,lt)=>{nightFight(t);const K=knight(t,'angry',RY_KM);K.armR.rotation.set(-2.9,0,-0.2);fireBall(hand('knight').add(V3(0,1.8,0)),4.2+Math.sin(t*9)*0.4,t);momKneel('shocked');
    dolly(V3(13,4.5,17),V3(11.5,5,15.5),V3(2.2,6,4.5),V3(2,6.6,4.5),u,54,50);showOnly(['knight','mom']);S.shakeA=0.02;S.vign=0.6;},
  cold_mom:(u,t)=>{nightFight(t);knight(t,'angry',RY_KM);momKneel('shocked');world.fxL.position.copy(head('mom')).add(V3(-2,3,-2));world.fxL.intensity=2.2+Math.sin(t*17)*0.6;cu('mom',4.4,0.4,0.2,36,u,0.25);showOnly(['mom']);S.vign=0.65;},
  cold_zash:(u,t)=>{nightFight(t);zashDown('sad');cu('zashb',5.0,0.5,0.3,36,u,0.25);showOnly(['zashb']);S.tag={text:'ZERO MAGIC',col:'#ff5a3a'};S.vign=0.6;},
  zash_intro:(u,t)=>{mood('day');const Z=st('zash',0,0,6,0,'happy');Z.armR.rotation.set(0,0,2.5+Math.sin(t*8)*0.25);talk(Z,'zash');cu('zash',4.6,0.3,0.1,38,u,0.2);showOnly(['zash']);S.whip=1;},
  grimoire_wall:(u,t)=>{mood('day');const ks=['fire','storm','gold','green'];ks.forEach((k,i)=>{const a=t*0.9+i*Math.PI/2;bookAt(k,V3(Math.sin(a)*4,9+Math.sin(t*2+i)*0.5,-10+Math.cos(a)*4),a+Math.PI/2,1.3);});
    dolly(V3(4,5,8),V3(1.5,7.5,4),V3(0,8,-10),V3(0,9,-10),u,44,38);showOnly([]);S.sparkle=1;},
  villager_magic:(u,t)=>{mood('day');const a=st('v0',-1.7,0,4,0.15,'happy'),b=st('v1',1.8,0,3,-0.15,'happy');[['v0',world.T.orb,a],['v1',world.T.fire,b]].forEach(([id,tx,P],i)=>{P.armR.rotation.set(-1.4,0,-0.1);P.armL.rotation.set(-0.5,0,0.2);const h=hand(id);
      for(let k=0;k<4;k++){const q=t*3+k*1.57+i;fx(tx,h.clone().add(V3(Math.cos(q)*0.7,1.3+Math.sin(q*1.3)*0.4,Math.sin(q)*0.7)),1.1,0.95);}});
    dolly(V3(1,4.2,21),V3(0,4.6,18),V3(0,4.2,3.5),V3(0,4.4,3.5),u,42,40);showOnly(['v0','v1']);S.sparkle=1;S.whip=1;},
  bully_blast:(u,t,lt)=>{mood('day');const Z=st('zash',-0.6,0,10,0.3,'shocked');Z.armL.rotation.set(-2.4,0,0.5);Z.armR.rotation.set(-2.4,0,-0.5);chars.zash.rotation.x=0.2;Z._noIdle=true;Z.setFace('shocked',{mouthOpen:0.7});
    const B=st('brick',2.8,0,2,-0.15,'happy');B.armR.rotation.set(-1.5,0,0);const F=st('firekid',5.2,0,0.5,-0.3,'happy');F.armR.rotation.set(-1.5,0,0);
    for(let i=0;i<3;i++){const k=((lt*1.4+i*0.33)%1);const A=hand(i%2?'firekid':'brick'),Bp=head('zash').add(V3(0,-1.5,-1));fx(i%2?world.T.fire:world.T.orb,A.clone().lerp(Bp,k),1.5,1);if(k>0.9)S.flash=0.25;}
    dolly(V3(1.2,4.2,25),V3(1.6,4.6,23),V3(1.8,4,5),V3(1.8,4.2,5),u,46,44);showOnly(['zash','brick','firekid']);S.shakeA=0.02;},
  zash_empty:(u,t)=>{mood('day');const Z=st('zash',-1,0,10,0,'sad');Z.armL.rotation.set(-1.0,0,0.15);Z.armR.rotation.set(-1.0,0,-0.15);Z.head.rotation.x=0.35;Z._noIdle=true;Z.setFace('sad');cu('zash',5.4,0.3,0.9,38,u,0.2);showOnly(['zash']);S.tag={text:'MANA: 0',col:'#ff5a3a'};S.desat=1;},
  zash_down:(u,t)=>{mood('day');const Z=st('zash',-3,0.9,8,0.3,'sad');sit(Z);Z.torso.rotation.x=0.35;Z.head.rotation.x=0.3;const B=st('brick',5,0,2,-0.6,'happy');cheer(B,t,0);const F=st('firekid',7.5,0,3,-0.7,'happy');cheer(F,t,1);
    cu('zash',4.6,0.5,0.2,36,u,0.2);showOnly(['zash','brick','firekid']);S.dim=0.2;},
  zash_fist:(u,t)=>{mood('dawn');const Z=st('zash',TRAIN,0,0,0,'angry');Z._noIdle=true;Z.armR.rotation.set(0,0,2.2);Z.setFace('angry');cu('zash',5.2,-0.3,-0.2,38,u,0.35);showOnly(['zash']);S.speed={k:0.5,col:'#ffffff'};S.whip=1;},
  train_pushups:(u,t,lt)=>{mood('dawn');const k=Math.abs(Math.sin(lt*5));const Z=st('zash',TRAIN,1.7+k*0.6,0,0,'angry');chars.zash.rotation.x=Math.PI/2;Z._noIdle=true;Z.armL.rotation.x=-Math.PI/2;Z.armR.rotation.x=-Math.PI/2;Z.head.rotation.x=-0.6;Z.setFace('angry');
    dolly(V3(TRAIN+8,2.4,13),V3(TRAIN+7,2.0,12),V3(TRAIN,1.8,3.2),V3(TRAIN,1.8,3.2),u,46,44);showOnly(['zash']);S.whip=1;S.tag={text:'YEAR 1',col:'#ffd23f'};},
  train_boulder:(u,t,lt)=>{mood('dawn');const Z=st('zash',TRAIN,0,0,0.2,'angry');Z.armL.rotation.set(-2.9,0,0.35);Z.armR.rotation.set(-2.9,0,-0.35);Z._noIdle=true;Z.setFace('angry',{mouthOpen:0.5});const b=world.boulder;b.visible=true;b.position.set(TRAIN,8.8+Math.sin(lt*14)*0.08,0.4);
    dolly(V3(TRAIN+3,1.6,13),V3(TRAIN+2,2.2,11),V3(TRAIN,5.5,0),V3(TRAIN,6,0),u,48,44);showOnly(['zash']);S.whip=1;S.tag={text:'YEAR 3',col:'#ffd23f'};},
  train_buff:(u,t,lt)=>{mood('dawn');const Z=st('zashb',TRAIN,0,0,0,'happy');const f=easeOut(lt/0.35);Z.armL.rotation.set(0,0,-lerp(0.3,2.1,f));Z.armR.rotation.set(0,0,lerp(0.3,2.1,f));
    dolly(V3(TRAIN+1,3.5,14),V3(TRAIN,4.6,10.5),V3(TRAIN,4.6,0),V3(TRAIN,5,0),u,44,40);showOnly(['zashb']);S.zoomPunch=lt<0.2?1-lt/0.2:0;S.sparkle=1;S.tag={text:'YEAR 6',col:'#ffd23f'};S.whip=1;},
  ceremony_wide:(u,t)=>{mood('day');const ids=crowd(t,'happy',false);stageTrio();['fire','storm','gold','green','grey'].forEach((k,i)=>{const a=t*0.5+i*1.256;bookAt(k,V3(Math.sin(a)*4.5,13+Math.sin(t*2+i)*0.4,-10+Math.cos(a)*4.5),a,1.2);});
    dolly(V3(0,16,26),V3(0,9,19),V3(0,9,-8),V3(0,6.5,-9),u,50,44);showOnly(ids.concat(['zashb','kai','firekid']));},
  crowd_cheer:(u,t)=>{mood('day');const ids=crowd(t,'happy',true,0.2);dolly(V3(-2,6.5,-11),V3(1.5,6,-10),V3(0,3.6,5),V3(0,3.6,5),u,52,50);showOnly(ids);S.whip=1;},
  books_float:(u,t)=>{mood('day');['fire','storm','gold','green'].forEach((k,i)=>{bookAt(k,V3(-4.5+i*3,lerp(13,8.5,eio(u))+Math.sin(t*3+i)*0.3,-9),Math.sin(t+i)*0.4,1.25);});camAt(V3(lerp(-1,1,u),7.5,-0.5),V3(0,lerp(11,9,u),-9),44);showOnly([]);S.sparkle=1;},
  book_fire:(u,t,lt)=>{mood('day');const F=st('firekid',3.5,1.2,-9,0,'happy');F.armL.rotation.set(-1.2,0,0.4);F.armR.rotation.set(-1.2,0,-0.4);const hp=head('firekid');const p=hp.clone().add(V3(0,lerp(4.5,-2.4,easeOut(lt/0.6)),1.6));bookAt('fire',p,0,0.95);for(let i=0;i<6;i++){const a=i+t*5;fx(world.T.fire,p.clone().add(V3(Math.cos(a)*1.3,Math.sin(a)*1.3+0.2,-0.3)),1.2,0.85);}
    cu('firekid',5.6,0.3,0.0,40,u,0.15);showOnly(['firekid']);if(lt>0.6&&lt<0.72)S.flash=0.35;},
  book_storm:(u,t,lt)=>{mood('day');const K=st('kai',0.5,1.2,-9.5,0,'smug');K.armR.rotation.set(-1.2,0,-0.3);const hp=head('kai');const p=hp.clone().add(V3(1.5,lerp(4.5,-1.9,easeOut(lt/0.6)),1.4));bookAt('storm',p,-0.3,0.9);
    if(lt>0.6)for(let i=0;i<3;i++)bolt(p.clone().add(V3(0,0.8,0)),p.clone().add(V3((i-1)*4,7+i,(i%2)*2-2)),t,i);dolly(hp.clone().add(V3(-2.2,-1.6,8.5)),hp.clone().add(V3(-1.2,-0.2,6.5)),hp.clone().add(V3(0.3,-0.3,0)),hp.clone().add(V3(0.3,-0.2,0)),u,42,38);showOnly(['kai']);if(lt>0.6&&lt<0.72)S.flash=0.5;S.shakeA=lt>0.6?0.02:0;},
  crowd_wild:(u,t)=>{mood('day');const ids=crowd(t,'happy',true,0.2);dolly(V3(3,3,-9),V3(-1,3.4,-8),V3(0,4.2,5),V3(0,4.2,5),u,54,52);showOnly(ids);S.rays={col:'rgba(255,220,130,',k:0.8};S.shakeA=0.02;S.whip=1;},
  kai_blessed:(u,t)=>{mood('day');const K=st('kai',0.5,1.2,-9.5,0,'smug');K.armR.rotation.set(-1.2,0,-0.3);bookAt('storm',head('kai').add(V3(1.5,-1.9,1.4)),-0.3,0.9);cu('kai',4.4,-0.4,0.1,36,u,0.2);showOnly(['kai']);S.rays={col:'rgba(255,220,130,',k:1};S.tag={text:'BLESSED',col:'#ffd23f'};},
  zash_steps:(u,t)=>{mood('day');const Z=st('zashb',-3,1.2,-9,0.1,'happy');Z.head.rotation.x=-0.3;Z.armL.rotation.set(-0.6,0,0.3);Z.armR.rotation.set(-0.6,0,-0.3);cu('zashb',5.0,0.3,-0.5,38,u,0.2);showOnly(['zashb']);S.sparkle=1;},
  book_grey:(u,t,lt)=>{mood('day');const Z=st('zashb',-3,1.2,-9,0.1,'sad');Z.armL.rotation.set(-0.9,0,0.3);Z.armR.rotation.set(-0.9,0,-0.3);Z.head.rotation.x=0.3;const hp=head('zashb');bookAt('grey',hp.clone().add(V3(0,lerp(4,-2.5,easeOut(lt/0.9)),1.7)),0,0.95).rotation.x=-0.25;
    cu('zashb',5.6,0.3,0.2,40,u,0.12);S.focus.y+=0.05;showOnly(['zashb']);S.dim=0.2;S.desat=1;},
  black_sun:(u,t)=>{mood('dark');const b=bookAt('grey',V3(-3,5,-7),0,1.6);b.rotation.set(-0.15,Math.sin(t*0.6)*0.1,0);world.darkL.position.set(-3,6,-4);world.darkL.intensity=0.8;dolly(V3(-3,5.2,-1),V3(-3,5.05,-4.2),V3(-3,5,-7),V3(-3,5,-7),u,36,30);showOnly([]);S.tag={text:'THE MARK OF THE CURSED',col:'#b080ff'};S.vign=0.75;},
  crowd_silent:(u,t)=>{mood('day');const ids=crowd(t,'shocked',false,0.2);dolly(V3(0,5.5,-10),V3(0,5,-7),V3(0,3.8,5),V3(0,3.8,5),u,50,46);showOnly(ids);S.desat=1;S.dim=0.3;},
  brick_laugh:(u,t)=>{mood('day');const B=st('brick',2,0,3,0.2,'happy');B.armR.rotation.set(0,0,2.2);talk(B,'brick');const F=st('firekid',5.5,0,0,-0.2,'happy');cheer(F,t,1);cu('brick',4.6,0.5,0.05,38,u,0.2);showOnly(['brick','firekid']);S.shakeA=0.012;},
  night_village:(u,t)=>{mood('night');dolly(V3(-6,9,30),V3(-3,7,24),V3(0,6,-6),V3(0,6,-5),u,50,46);showOnly([]);S.shakeA=0.05*easeIn(u);S.vign=0.6;},
  portal_open:(u,t,lt)=>{mood('night');world.portal.visible=true;const k=easeOut(lt/0.7);world.portal.scale.setScalar(Math.max(0.01,k));world.portal.rotation.z=t*2;world.portalL.intensity=3*k;burning(t,k*0.7);embers(V3(0,0,0),t,22);
    dolly(V3(4,3,26),V3(2,4,20),V3(0,6,-4),V3(0,6.5,-4),u,48,44);showOnly([]);S.shakeA=0.08*k;S.flash=lt<0.1?0.6:0;},
  knight_reveal:(u,t,lt)=>{nightFight(t);const z=lerp(-3,2,ease(u));const K=st('knight',0,0,z,0,'angry');walk(K,t,0.7,'angry');world.knightAura.position.set(0,7,z-0.5);world.fxL.position.set(-2,8,z+8);const hp=head('knight');camAt(V3(lerp(-3,-2,u),1.2,z+13),hp.clone().add(V3(0,-2.5,0)),46);showOnly(['knight']);S.speed={k:0.7,col:'#ffb070'};S.shakeA=0.03;},
  kai_steps:(u,t)=>{nightFight(t);const Ki=st('kai',-10,0,10,RY_KAI,'angry');Ki.armR.rotation.set(0,0,2.3);const h=hand('kai');for(let i=0;i<2;i++)bolt(h,h.clone().add(V3((i-0.5)*3,4,0)),t,i);fx(world.T.bolt,h,2.2,0.9);world.fxL.position.copy(h);world.fxL.color.setHex(0x9ab0ff);world.fxL.intensity=2.5;
    cu('kai',4.8,0.4,0.0,38,u,0.25);showOnly(['kai']);S.whip=1;},
  kai_attacks:(u,t,lt)=>{nightFight(t);knight(t,'smug',RY_KK);const Ki=st('kai',-10,0,10,RY_KAI,'angry');Ki.armR.rotation.set(-1.6,0,-0.1);Ki.armL.rotation.set(-1.6,0,0.1);
    const A=hand('kai').add(V3(0,0.4,0)),B=head('knight').add(V3(0,-3,0));for(let i=0;i<3;i++)bolt(A,B.clone().add(V3(0,i-1,0)),t,i);fx(world.T.bolt,B,4,0.8);dolly(V3(-16.5,5,15.5),V3(-15,5.6,14),V3(-3,5.5,4.5),V3(-2,6,4),u,48,44);showOnly(['knight','kai']);S.flash=(Math.sin(t*40)>0.6)?0.18:0;S.shakeA=0.03;},
  kai_falls:(u,t,lt)=>{nightFight(t);const K=knight(t,'angry',RY_KK);K.armR.rotation.set(-1.5,0,-0.2);const k=easeOut(lt/0.6);const p=V3(lerp(-8,-14,k),Math.sin(Math.min(1,lt/0.6)*Math.PI)*3,lerp(9,14,k));const Ki=st('kai',p.x,p.y,p.z,0.6,'shocked');Ki._noIdle=true;chars.kai.rotation.x=-k*1.3;Ki.setFace('shocked',{mouthOpen:0.8});
    if(lt<0.5)stream(world.T.fire,hand('knight'),p.clone().add(V3(0,3,0)),1,t,2.4);
    camAt(p.clone().add(V3(2.5,3.2,9.5)).lerp(V3(-11.5,3.6,23.5),0.5),V3(p.x,1.8+p.y*0.5,p.z),46);showOnly(['knight','kai']);S.impact=lt<0.08?1:0;S.shakeA=0.15*(1-u);S.tag=lt>0.8?{text:'10 SECONDS',col:'#ff5a3a'}:null;},
  zash_charge:(u,t)=>{nightFight(t);const z=lerp(22,10,u);const Z=st('zashb',-2,0,z,Math.PI,'angry');walk(Z,t,2.4,'angry');Z.armR.rotation.set(-2.4,0,-0.2);Z.setFace('angry',{mouthOpen:0.9});world.fxL.position.set(-2,6,z-7);camAt(V3(-2.6,3.6,z-8),head('zashb').add(V3(0,-0.4,0)),44);handheld(t,0.25);showOnly(['zashb']);S.speed={k:0.9,col:'#ffffff'};},
  zash_thrown:(u,t,lt)=>{nightFight(t);const K=knight(t,'angry',0.3);K.armL.rotation.set(-1.4,0,0.9);const k=easeOut(lt/0.7);const Z=st('zashb',lerp(-1,-7,k),Math.sin(Math.min(1,lt/0.7)*Math.PI)*4,lerp(5,13,k),2.2,'shocked');Z._noIdle=true;chars.zashb.rotation.x=-k*1.3;chars.zashb.rotation.z=k*2;
    camAt(V3(-12,2.5,24),V3(-3,3.8,8),50);showOnly(['knight','zashb']);S.impact=lt<0.08?1:0;S.flash=lt<0.14?0.5:0;S.shakeA=0.2*(1-u);},
  zash_ground:(u,t)=>{nightFight(t);zashDown('sad');const hp=head('zashb');dolly(hp.clone().add(V3(4,5,9)),hp.clone().add(V3(2.5,2.5,6.5)),hp.clone().add(V3(0,-1,0)),hp.clone().add(V3(0,-0.5,0)),u,42,38);S.focus=focusOf('zashb');showOnly(['zashb']);S.vign=0.65;S.dim=0.15;},
  knight_mom:(u,t)=>{nightFight(t);const K=knight(t,'angry',lerp(RY_KZ,RY_KM,ease(u*1.6)));K.armR.rotation.set(lerp(-0.6,-2.9,ease(u)),0,-0.2);fireBall(hand('knight').add(V3(0,1.6,0)),lerp(1.2,4.2,ease(u)),t);
    dolly(V3(5.5,0.8,11),V3(4.6,1.0,9.5),V3(0.3,7.5,2),V3(0.3,8.2,2),u,54,50);showOnly(['knight']);S.vign=0.65;S.shakeA=0.02;},
  zash_reach:(u,t)=>{nightFight(t);zashDown('angry',true);cu('zashb',4.6,-0.9,0.2,38,u,0.3);showOnly(['zashb']);S.speed={k:0.5,col:'#ffb070'};S.shakeA=0.02;},
  book_shakes:(u,t,lt)=>{nightFight(t,0.6);const amp=lerp(0.02,0.3,easeIn(u));const b=bookAt('grey',V3(ZS.x+Math.sin(t*61)*amp,0.5+Math.abs(Math.sin(t*47))*amp,ZS.z+Math.sin(t*53)*amp),0.4,1.2);b.rotation.x=-Math.PI/2+Math.sin(t*40)*amp*0.6;
    b.userData.emblem.material.map=u>0.5?world.sunGlowTex:world.sunDullTex;world.darkL.position.set(-7,2,12);world.darkL.intensity=3*u;for(let i=0;i<Math.floor(u*8);i++)fx(world.T.dark,V3(-7+Math.sin(i*2.1+t*3)*1.2,0.8+((t*2+i*0.3)%1)*3*u,12+Math.cos(i*1.7)*1.2),1.2,0.8);
    dolly(V3(-5,3.2,17),V3(-6.2,1.9,14.6),V3(-7,0.5,12),V3(-7,0.6,12),u,40,32);showOnly([]);S.dim=0.3;S.shakeA=0.03*u;S.vign=0.7;},
  pages_flip:(u,t,lt)=>{nightFight(t,0.6);const b=greyOpen(t,ease(lt/0.35));b.userData.pages.children.forEach((pg,i)=>{pg.rotation.y=-(((t*3.2+i*0.25)%1))*2.9;});world.darkL.position.set(-7,3,12.5);world.darkL.intensity=3.5;
    for(let i=0;i<8;i++)fx(world.T.dark,V3(-7+Math.sin(i*2.1+t*3)*1.6,0.8+((t*2+i*0.3)%1)*4,12+Math.cos(i*1.7)*1.6),1.2,0.8);dolly(V3(-3.5,7,19),V3(-4.5,8,17.5),V3(-7.6,0.6,12),V3(-7.8,0.6,12),u,40,36);showOnly([]);S.dim=0.25;S.shakeA=0.03;S.vign=0.7;},
  katana_rises:(u,t,lt)=>{nightFight(t,0.6);greyOpen(t,1);
    const K=world.katana;K.visible=true;const y=lerp(-6.5,2.2,easeOut((lt-0.15)/1.3));K.position.set(-7,y,12);K.rotation.set(0,t*1.2,0);for(let i=0;i<12;i++)fx(world.T.dark,V3(-7+Math.sin(i*1.9+t*2)*0.8,0.5+((t*1.5+i*0.09)%1)*12,12+Math.cos(i*2.3)*0.8),1.6,0.7);
    world.darkL.position.set(-7,5,13);world.darkL.intensity=4;dolly(V3(-3,1.5,20),V3(-4,6,19),V3(-7,2,12),V3(-7,6.5,12),u,46,42);showOnly([]);S.dim=0.25;S.rays={col:'rgba(160,90,255,',k:0.8};S.shakeA=0.04;if(lt>0.15&&lt<0.27)S.flash=0.4;},
  zash_grabs:(u,t,lt)=>{nightFight(t,0.6);const Z=st('zashb',ZS.x,0,ZS.z,0.5,'angry');Z._noIdle=true;chars.zashb.rotation.x=0.25+Math.sin(t*34)*0.012;Z.armR.rotation.set(-0.5,0,-0.2);Z.armL.rotation.set(-0.5,0,0.4);Z.legL.rotation.x=-0.4;Z.setFace('angry',{mouthOpen:0.5});heldKatana('zashb','low',t);
    world.cracks.visible=true;world.cracks.position.set(-7,0.06,12);cu('zashb',5.4,0.6,0.1,40,u,0.2);showOnly(['zashb']);S.shakeA=0.03;},
  zash_lifts:(u,t,lt)=>{nightFight(t,0.6);const lift=easeOut((lt-0.25)/0.6);const Z=st('zashb',ZS.x,0,ZS.z,0.4,'angry');Z._noIdle=true;Z.armR.rotation.set(lerp(-0.5,-2.9,lift),0,-0.15);Z.armL.rotation.set(lerp(-0.5,-2.6,lift),0,0.5);chars.zashb.rotation.x=lerp(0.25,-0.05,lift);Z.setFace('angry',{mouthOpen:lift>0?0.8:0.2});
    heldKatana('zashb','up',t);world.cracks.visible=true;world.cracks.position.set(-7,0.06,12);dolly(V3(-3.5,1.0,24.5),V3(-4,1.8,23),V3(-7,5.5,12),V3(-7,7,12),u,52,50);showOnly(['zashb']);S.shakeA=lift>0?0.05:0.02;S.speed=lift>0?{k:0.8,col:'#c8a0ff'}:null;S.zoomPunch=lt>0.25&&lt<0.45?1:0;S.rays=lift>0.5?{col:'rgba(160,90,255,',k:0.6}:null;},
  fire_blast:(u,t,lt)=>{nightFight(t);const K=knight(t,'angry',RY_KZ);K.armL.rotation.set(-1.5,0,0.2);K.armR.rotation.set(-1.5,0,-0.2);st('zashb',ZS.x,0,ZS.z,RY_ZK,'angry');heldKatana('zashb','guard',t);const A=hand('knight').add(V3(-0.6,0.5,1)),B=head('zashb').add(V3(0.5,-1.2,-1.5));
    stream(world.T.fire,A,B,easeOut(lt/0.5),t,3.0,18);world.fxL.position.copy(A.clone().lerp(B,0.5));world.fxL.intensity=4;dolly(V3(9.5,12.5,-2),V3(8.5,12,-1),V3(-5.5,3,11),V3(-5.5,3,11),u,52,50);showOnly(['knight','zashb']);S.shakeA=0.06;S.speed={k:0.7,col:'#ffb070'};},
  zash_guard:(u,t,lt)=>{nightFight(t);const Z=st('zashb',ZS.x,0,ZS.z,RY_ZK,'angry');Z._noIdle=true;Z.armR.rotation.set(-1.5,0,-0.5);Z.armL.rotation.set(-1.3,0,0.6);Z.setFace('angry',{mouthOpen:0.9});heldKatana('zashb','guard',t);const hp=head('zashb');
    for(let i=0;i<6;i++){const s=i%2?1:-1;fx(world.T.fire,hp.clone().add(V3(s*(3.6+Math.sin(t*20+i)*0.5),-1+((t*3+i*0.17)%1)*4-2,-3-i*0.7)),1.5,0.6);}world.fxL.position.copy(hp).add(V3(1,0,-4));world.fxL.intensity=4+Math.sin(t*25);
    cu('zashb',5.2,0.5,0.0,40,u,0.25);showOnly(['zashb']);S.shakeA=0.07;S.speed={k:0.8,col:'#ffb070'};},
  deflect:(u,t,lt)=>{nightFight(t);knight(t,'shocked',RY_KZ);const Z=st('zashb',ZS.x,0,ZS.z,RY_ZK,'angry');heldKatana('zashb','guard',t);const A=hand('zashb').add(V3(0,1.5,0)),B=head('knight').add(V3(0,-3,0));
    stream(world.T.fire,A,B,easeOut(lt/0.45),t,3.4,18);stream(world.T.dark,A,B,easeOut(lt/0.45),t+1,1.6,10);if(lt>0.45){fireBall(B,7,t);}else{world.fxL.position.copy(A);world.fxL.intensity=5;}
    dolly(V3(-10.5,6.5,25),V3(-10,6.8,23),V3(-3,5,7),V3(-2.6,5.4,6.6),u,50,46);showOnly(['knight','zashb']);S.impact=lt<0.1?1:0;S.flash=lt>0.45&&lt<0.6?0.7:0;S.shakeA=0.14;S.speed={k:1,col:'#d8b0ff'};},
  one_swing:(u,t,lt)=>{nightFight(t,0.8);const dash=easeOut(lt/0.25);const Z=st('zashb',lerp(ZS.x,5,dash),0,lerp(ZS.z,6,dash),lerp(RY_ZK,2.0,dash),'angry');Z._noIdle=true;chars.zashb.rotation.x=0.25;heldKatana('zashb','swing',t);
    const gone=clamp((lt-0.6)/0.9,0,1);const K=knight(t,'shocked',RY_KZ);K._noIdle=true;chars.knight.visible=gone<0.4||(gone<0.9&&Math.sin(t*50)>0);for(let i=0;i<16&&gone>0;i++){const a=i*2.39996;fx(world.T.ember,V3(KN.x+Math.cos(a)*gone*6,5+Math.sin(a*1.7)*4+gone*5,KN.z+Math.sin(a)*gone*5),1.6*(1-gone*0.6),1-gone);}world.knightAura.material.opacity=0.35*(1-gone);
    camAt(V3(lerp(9.5,8.5,u),3.2,19),V3(1.5,4.6,4),48);showOnly(['zashb','knight']);S.slash=clamp(lt/0.3,0,1);S.impact=lt>0.22&&lt<0.3?1:0;S.shakeA=lt<0.5?0.08:0;},
  knight_gone:(u,t,lt)=>{mood('night');burning(t,0.5);embers(V3(0,0,0),t,22);world.portal.visible=true;world.portal.scale.setScalar(Math.max(0.01,1-easeIn(u*1.3)));world.portal.rotation.z=-t*2;world.portalL.intensity=2*(1-u);world.fxL.position.set(3,7,14);world.fxL.intensity=1.4;
    const Z=st('zashb',5,0,6,0.35,'default');Z.armR.rotation.set(-0.3,0,-0.3);heldKatana('zashb','low',t);for(let i=0;i<10;i++){const a=i*2.39996+t*0.3;fx(world.T.ember,V3(KN.x+Math.cos(a)*3,2+((t*0.3+i*0.1)%1)*9,KN.z+Math.sin(a)*3),0.9,0.6*(1-u));}
    dolly(V3(8,4,17.5),V3(7,4.4,15),V3(4.2,4.4,6),V3(4.6,4.6,6),u,44,40);showOnly(['zashb']);S.dim=0.1;},
  aftermath:(u,t)=>{mood('night');burning(t,0.3);embers(V3(0,0,0),t,22);world.fxL.position.set(0,7,15);world.fxL.intensity=1.6;const Z=st('zashb',0,0,6,0.2,'happy');const M=st('mom',2.0,0,6.3,-0.8,'happy');M.armL.rotation.set(-1.4,0,1.1);M.armR.rotation.set(-1.4,0,-1.0);st('kai',-2.6,0,7.5,0.7,'happy');
    heldKatana('zashb','low',t);dolly(V3(1,4.6,22),V3(0.3,4.8,19.5),V3(-0.2,4.2,6.5),V3(-0.2,4.4,6.5),u,46,44);showOnly(['zashb','mom','kai']);},
  sun_glow:(u,t,lt)=>{mood('dark');const b=bookAt('grey',V3(0,5,6),0,1.6);b.rotation.set(-0.15,Math.sin(t*0.6)*0.1,0);const k=clamp((lt-0.4)/1.0,0,1);b.userData.emblem.material.map=k>0.2?world.sunGlowTex:world.sunDullTex;world.darkL.position.set(0,6,9);world.darkL.intensity=0.6+3*k;
    for(let i=0;i<Math.floor(k*10);i++)fx(world.T.dark,V3(Math.sin(i*2.1+t*2)*1.6,5+Math.cos(i*1.3+t*2.4)*1.8,6.6),1.0,0.7);dolly(V3(0,5.2,13.5),V3(0,5.05,10.5),V3(0,5,6),V3(0,5,6),u,36,32);showOnly([]);S.vign=0.75;S.shakeA=0.02*k;},
  awake:(u,t,lt)=>{mood('dark');const b=bookAt('grey',V3(0,5,6),0,1.6);b.rotation.set(-0.15,0,0);b.userData.emblem.material.map=world.sunGlowTex;world.darkL.position.set(0,6,9);world.darkL.intensity=4;
    for(let i=0;i<12;i++)fx(world.T.dark,V3(Math.sin(i*2.1+t*2)*1.8,5+Math.cos(i*1.3+t*2.4)*2,6.6),1.0,0.7);dolly(V3(0,5.05,10.5),V3(0,5.0,8.6),V3(0,5,6),V3(0,5,6),Math.min(1,lt/2.2),32,26);showOnly([]);S.vign=0.8;S.shakeA=0.03;
    S.eye=clamp((lt-0.5)/0.7,0,1);if(lt>1.6)S.part2=clamp((lt-1.6)/0.35,0,1);S.black=clamp((u-0.9)/0.1,0,1)*0.85;},
};

/* ---------------- 2D overlays + post */
function T(text,x,y,size,fill,stroke,lw,align){og.font=`${size}px ${FONT}`;og.textAlign=align||'center';og.textBaseline='middle';og.lineJoin='round';if(stroke){og.lineWidth=lw||size*0.18;og.strokeStyle=stroke;og.strokeText(text,x,y);}og.fillStyle=fill;og.fillText(text,x,y);}
function RR(x,y,w,h,r){og.beginPath();og.moveTo(x+r,y);og.arcTo(x+w,y,x+w,y+h,r);og.arcTo(x+w,y+h,x,y+h,r);og.arcTo(x,y+h,x,y,r);og.arcTo(x,y,x+w,y,r);og.closePath();}
function composite(src){const f=S.focus;
  if(f){og.filter=`blur(${Math.round(W*0.007)}px)`;og.drawImage(src,0,0,W,H);og.filter='none';tg.clearRect(0,0,W,H);tg.globalCompositeOperation='source-over';tg.drawImage(src,0,0,W,H);tg.globalCompositeOperation='destination-in';const cx=f.x*W,cy=f.y*H,r=f.r*W;
    const gr=tg.createRadialGradient(cx,cy,r*0.5,cx,cy,r*1.3);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(1,'rgba(0,0,0,0)');tg.fillStyle=gr;tg.fillRect(0,0,W,H);tg.globalCompositeOperation='source-over';og.drawImage(tmpC,0,0);}
  else og.drawImage(src,0,0,W,H);}
function drawOverlays(t){
  if(S.dim){og.fillStyle=`rgba(8,6,18,${S.dim})`;og.fillRect(0,0,W,H);}
  if(S.rays){og.save();og.globalCompositeOperation='screen';const cx=W*0.5,cy=H*0.3;for(let i=0;i<14;i++){const a=i/14*Math.PI*2+t*0.25;og.fillStyle=S.rays.col+(0.08*S.rays.k)+')';og.beginPath();og.moveTo(cx,cy);og.arc(cx,cy,H,a,a+0.12);og.closePath();og.fill();}og.restore();}
  if(S.speed){const r=rng('sp'+Math.floor(t*30));og.save();og.translate(W/2,H/2);og.strokeStyle=S.speed.col;for(let i=0;i<70;i++){const a=r()*Math.PI*2,r0=H*(0.3+r()*0.12),r1=H*(0.75+r()*0.2);og.globalAlpha=S.speed.k*(0.25+r()*0.45);og.lineWidth=W*(0.002+r()*0.006);og.beginPath();og.moveTo(Math.cos(a)*r0,Math.sin(a)*r0);og.lineTo(Math.cos(a)*r1,Math.sin(a)*r1);og.stroke();}og.restore();}
  if(S.sparkle){const r=rng('spk');og.save();og.fillStyle='rgba(255,245,210,0.9)';for(let i=0;i<14;i++){const x=r()*W,y=r()*H*0.6,s=W*0.012*(0.5+0.5*Math.sin(t*7+i));og.beginPath();og.moveTo(x,y-s*2);og.lineTo(x+s*0.5,y-s*0.5);og.lineTo(x+s*2,y);og.lineTo(x+s*0.5,y+s*0.5);og.lineTo(x,y+s*2);og.lineTo(x-s*0.5,y+s*0.5);og.lineTo(x-s*2,y);og.lineTo(x-s*0.5,y-s*0.5);og.fill();}og.restore();}
  if(S.slash){const k=S.slash;og.save();og.globalAlpha=1-Math.max(0,(k-0.6)/0.4)*0.6;og.strokeStyle='#ffffff';og.shadowColor='#c080ff';og.shadowBlur=W*0.05;og.lineCap='round';og.lineWidth=W*0.03*(1-k*0.5);og.beginPath();og.moveTo(W*0.02,H*0.62);og.lineTo(W*(0.02+0.96*easeOut(k)),H*(0.62-0.34*easeOut(k)));og.stroke();og.restore();}
  if(S.tag){og.font=`${W*0.05}px ${FONT}`;const tw=og.measureText(S.tag.text).width+W*0.08;og.save();og.translate(W/2,H*0.11);og.rotate(-0.03);og.fillStyle='rgba(0,0,0,0.75)';RR(-tw/2,-H*0.027,tw,H*0.054,H*0.02);og.fill();T(S.tag.text,0,0,W*0.05,S.tag.col);og.restore();}
  const vg=og.createRadialGradient(W/2,H*0.48,H*0.3,W/2,H/2,H*0.78);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,`rgba(0,0,0,${S.vign||(world.mood==='night'||world.mood==='dark'?0.5:0.28)})`);og.fillStyle=vg;og.fillRect(0,0,W,H);
  const r=rng('gr'+Math.floor(t*24));og.fillStyle='rgba(255,255,255,0.035)';for(let i=0;i<300;i++)og.fillRect(r()*W,r()*H,1.5,1.5);
  if(S.flash>0){og.fillStyle=`rgba(255,240,220,${S.flash})`;og.fillRect(0,0,W,H);}
  if(S.black>0){og.fillStyle=`rgba(0,0,0,${S.black})`;og.fillRect(0,0,W,H);}
  if(S.eye){const k=easeOut(S.eye);og.save();og.translate(W/2,H*0.5);og.globalCompositeOperation='screen';og.shadowColor='#c060ff';og.shadowBlur=W*0.06;og.fillStyle='#f0d8ff';og.beginPath();og.moveTo(-W*0.17,0);og.quadraticCurveTo(0,-H*0.07*k,W*0.17,0);og.quadraticCurveTo(0,H*0.07*k,-W*0.17,0);og.fill();og.globalCompositeOperation='source-over';og.shadowBlur=0;og.fillStyle='#12041c';og.beginPath();og.ellipse(0,0,W*0.018,H*0.058*k,0,0,7);og.fill();og.restore();}
  if(S.part2){const k=easeOut(S.part2);og.save();og.translate(W/2,H*0.26);og.rotate(-0.05);og.scale(lerp(1.6,1,k),lerp(1.6,1,k));og.globalAlpha=k;T('PART 2?',0,0,W*0.16,'#c080ff','#0a0a12',W*0.03);og.restore();}
}
function captionAt(t){for(const s of TL.segs){for(let i=0;i<s.words.length;i++){const w=s.words[i];const nx=s.words[i+1];const end=nx?nx.s:Math.min(w.e+0.25,s.end+0.25);if(t>=w.s&&t<end)return {w,since:t-w.s,who:s.who};}}return null;}
function drawCaption(t){if(S.black>=0.85)return;const c=captionAt(t);if(!c)return;const text=c.w.w.toUpperCase();const base=W*0.105*(text.length>8?8/text.length*1.05:1);const k=c.since<0.07?lerp(1.3,1,easeOut(c.since/0.07)):1;
  og.save();og.translate(W/2,H*0.72);og.scale(k,k);og.rotate(c.since<0.07?(1-c.since/0.07)*-0.06:0);og.font=`${base}px ${FONT}`;og.textAlign='center';og.textBaseline='middle';og.lineJoin='round';og.shadowColor='rgba(0,0,0,0.65)';og.shadowBlur=base*0.3;og.lineWidth=base*0.22;og.strokeStyle='#0a0a12';og.strokeText(text,0,0);og.shadowColor='transparent';
  og.fillStyle=c.w.red?'#ffd23f':(c.who==='brick'?'#ff9a8a':'#ffffff');og.fillText(text,0,0);og.restore();}

/* ---------------- entry points */
S.init=async function(timeline,w,h,fontUrl){TL=timeline;W=w;H=h;SS=window.BH_SS||1.25;
  const ff=new FontFace('Luckiest Guy',`url(${fontUrl})`);await ff.load();document.fonts.add(ff);
  R=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});R.setPixelRatio(1);R.setSize(Math.round(W*SS),Math.round(H*SS));R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.12;R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
  cam=new THREE.PerspectiveCamera(40,W/H,0.1,1000);
  buildWorld();buildChars();
  const [oc,o2]=cv(W,H);out=oc;og=o2;og.imageSmoothingEnabled=true;og.imageSmoothingQuality='high';const [tc,t2]=cv(W,H);tmpC=tc;tg=t2;const [gc2,gg2]=cv(W,H);gC=gc2;gg=gg2;scene.updateMatrixWorld(true);return true;};
const KEYS=['flash','black','shakeA','zoomPunch','speed','focus','whip','sparkle','rays','vign','part2','tag','dim','impact','slash','desat','eye'];
S.frame=function(f,q){const t=f/TL.fps;const shot=TL.shots.find(s=>t>=s.s&&t<s.e)||TL.shots[TL.shots.length-1];
  KEYS.forEach(k=>S[k]=null);hideFX();world.knightAura.visible=false;world.knightAura.material.opacity=0.35;world.portal.scale.setScalar(1);world.books.grey.userData.emblem.material.map=world.sunDullTex;
  if(shot!==curShot){curShot=shot;showOnly([]);}
  Object.values(chars).forEach(c=>{c.rotation.set(0,0,0);c.rotation.order='XYZ';});
  const u=(t-shot.s)/(shot.e-shot.s),lt=t-shot.s;scene.updateMatrixWorld(true);
  (SH[shot.name]||SH.sun_glow)(u,t,lt);
  act(t);scene.updateMatrixWorld(true);
  handheld(t,0.04);if(S.shakeA)shake(S.shakeA,t);
  world.key.target.position.copy(world.look);world.key.position.copy(world.look).addScaledVector(world.keyDir,70);world.rim.target.position.copy(world.look);world.rim.position.copy(world.look).add(V3(-40,25,-50));
  scene.updateMatrixWorld(true);R.render(scene,cam);
  og.globalAlpha=1;og.globalCompositeOperation='source-over';og.filter='none';og.fillStyle='#000';og.fillRect(0,0,W,H);
  if(S.zoomPunch){const z=1+0.07*S.zoomPunch;og.drawImage(R.domElement,(W-W*z)/2,(H-H*z)/2,W*z,H*z);}else composite(R.domElement);
  const grade=S.impact?'invert(1) contrast(1.6) grayscale(1)':S.desat?'contrast(1.05) saturate(0.55)':({day:'contrast(1.06) saturate(1.18)',dawn:'contrast(1.08) saturate(1.2)',night:'contrast(1.14) saturate(1.1)',dark:'contrast(1.15) saturate(0.9)'}[world.mood]||'none');
  gg.clearRect(0,0,W,H);gg.drawImage(out,0,0);og.filter=grade;og.drawImage(gC,0,0);og.filter='none';
  if(S.whip&&lt<0.12){const k=1-lt/0.12;og.save();og.globalAlpha=0.35*k;for(let i=1;i<6;i++)og.drawImage(R.domElement,-i*W*0.05*k,0,W,H);og.restore();}
  og.filter=`blur(${Math.round(W*0.016)}px) brightness(1.2)`;og.globalCompositeOperation='screen';og.globalAlpha=world.mood==='night'||world.mood==='dark'?0.26:0.1;og.drawImage(R.domElement,0,0,W,H);og.filter='none';og.globalCompositeOperation='source-over';og.globalAlpha=1;
  drawOverlays(t);drawCaption(t);
  return out.toDataURL('image/jpeg',q||0.94);};
})();
