/* Episode 10 "Don't Answer The Skinwalker" (horror, narrator Leo). Cabin in the woods: blue moonlit forest with fog,
   a fire-lit cabin interior, and an original creature (very tall, thin, long jointed fingers, stretched pale face).
   Horror grade like Ep 7 (grain, flicker, letterbox, vignette). ep10/scene.js = this + cast_ep10.js (build_scene.py).
   Entry points: SAMPLE.init(timeline, W, H, fontUrl), SAMPLE.frame(f) */
(function(){
/* Episode 10 "Don't Answer The Skinwalker": original characters (Leo, the "sister", Grandpa). The creature is built in scene_src.js. */
(function(){
const SPECS=[
 {id:'leo10',name:'Leo',role:'Narrator (horror)',group:'Ep10',origin:'original',skin:'#e6b48c',hair:{style:'messy',color:'#17110e'},
  face:{eyeShape:'almond',eyes:'dot',eyeScale:0.85,eyeColor:'#3a2a1a',brows:'normal',mouth:'flat',nose:'button'},
  torso:{inner:'#cfd2d8',outer:{style:'hoodie',color:'#2c3240',fabric:'fleece',strings:'#e8e8e8'}},sleeves:{color:'#2c3240',len:'full',fabric:'fleece'},pants:{color:'#3a3f4a',fabric:'cotton',shoes:'#d8d8d8'}},
 {id:'sis10',name:'"Sister"',role:'Not his sister',group:'Ep10',origin:'original',skin:'#ecc6a2',hair:{style:'ponytail',color:'#1b1414',tie:'#e86a8a'},
  face:{eyeShape:'round',eyes:'dot',eyeScale:0.9,eyeColor:'#1a1010',brows:'arched',mouth:'smile',nose:'button',lashes:true},
  torso:{inner:'#f2b8c8',pattern:'stripes',patternColor:'#f8d8e2'},sleeves:{color:'#f2b8c8',len:'full'},pants:{color:'#f2b8c8',pattern:'stripes',patternColor:'#f8d8e2',shoes:'#ecc6a2'}},
 {id:'gpa10',name:'Grandpa',role:'Cabin owner',group:'Ep10',origin:'original',skin:'#e2b896',hair:{style:'sides',color:'#ececec'},
  face:{eyeShape:'sleepy',eyes:'tired',brows:'bushy',browColor:'#dcdcdc',mouth:'flat',glasses:'round',beard:'short',beardColor:'#e4e4e4',age:'old'},
  torso:{inner:'#6a2a2a',pattern:'check',patternColor:'#3a1414',collar:true},sleeves:{color:'#6a2a2a',len:'rolled',pattern:'check',patternColor:'#3a1414'},pants:{color:'#3a3a40',fabric:'denim',shoes:'#3a2a1e',shoeStyle:'boot'}},
];
SPECS.forEach(s=>{const i=CAST.findIndex(c=>c.id===s.id);if(i>=0)CAST[i]=s;else CAST.push(s);});
})();

const S=window.SAMPLE={};
let TL,W,H,R,scene,cam,out,og,world={},chars={},curShot=null,SS=1.25;
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const lerp=(a,b,t)=>a+(b-a)*t,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);},easeOut=t=>1-Math.pow(1-clamp(t,0,1),3),easeIn=t=>Math.pow(clamp(t,0,1),2);
const FONT='"Luckiest Guy", Impact, sans-serif', SERIF='"DejaVu Serif", Georgia, serif';
const IX=300;

/* ---------------- textures */
function canvasTex(w,h,draw){const [c,g]=cv(w,h);draw(g,w,h);const t=tex(c);t._c=c;return t;}
function glowTex(col){return canvasTex(128,128,(g)=>{const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.3,col);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);});}
function logTex(){return canvasTex(256,256,(g,w,h)=>{for(let y=0;y<h;y+=32){const gr=g.createLinearGradient(0,y,0,y+32);gr.addColorStop(0,'#3a2616');gr.addColorStop(0.5,'#5a3c22');gr.addColorStop(1,'#2a1a0e');g.fillStyle=gr;g.fillRect(0,y,w,32);}
  const r=rng('log');g.strokeStyle='rgba(0,0,0,0.3)';for(let i=0;i<60;i++){const y=r()*h;g.beginPath();g.moveTo(0,y);g.lineTo(w,y+(r()-0.5)*4);g.stroke();}});}
function plankTex(col){return canvasTex(256,256,(g,w,h)=>{fabricFill(g,0,0,w,h,col,'canvas');g.strokeStyle='rgba(0,0,0,0.3)';g.lineWidth=3;for(let y=0;y<h;y+=40){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}});}
function grassTex(){return canvasTex(256,256,(g,w,h)=>{g.fillStyle='#16251a';g.fillRect(0,0,w,h);const r=rng('gr');for(let i=0;i<2500;i++){g.fillStyle=r()<0.5?'rgba(40,70,45,0.6)':'rgba(8,15,10,0.6)';g.fillRect(r()*w,r()*h,2,3);}});}
function skinTex(){return canvasTex(256,256,(g,w,h)=>{g.fillStyle='#b8b2a8';g.fillRect(0,0,w,h);const r=rng('wsk');for(let i=0;i<220;i++){g.fillStyle=`rgba(${60+r()*40},${50+r()*30},${50+r()*30},${0.05+r()*0.12})`;g.beginPath();g.ellipse(r()*w,r()*h,4+r()*20,2+r()*10,r()*3,0,7);g.fill();}
  g.strokeStyle='rgba(70,50,60,0.25)';g.lineWidth=1.2;for(let i=0;i<40;i++){let x=r()*w,y=r()*h;g.beginPath();g.moveTo(x,y);for(let k=0;k<5;k++){x+=(r()-0.5)*30;y+=r()*24;g.lineTo(x,y);}g.stroke();}});}
function walkerFaceTex(){return canvasTex(256,512,(g,w,h)=>{g.fillStyle='#c4beb4';g.fillRect(0,0,w,h);const sg=g.createLinearGradient(0,0,0,h);sg.addColorStop(0,'rgba(0,0,0,0.25)');sg.addColorStop(0.5,'rgba(0,0,0,0)');sg.addColorStop(1,'rgba(0,0,0,0.3)');g.fillStyle=sg;g.fillRect(0,0,w,h);
  const cx=w/2;
  // long hollow eye sockets
  [-1,1].forEach(s=>{const gr=g.createRadialGradient(cx+s*52,170,4,cx+s*52,175,58);gr.addColorStop(0,'#000');gr.addColorStop(0.7,'#0a0606');gr.addColorStop(1,'rgba(40,20,20,0)');g.fillStyle=gr;g.beginPath();g.ellipse(cx+s*52,175,34,62,s*0.12,0,7);g.fill();
    g.fillStyle='#f4f0e0';g.beginPath();g.arc(cx+s*50,180,4.5,0,7);g.fill();});
  // stretched grin with too many teeth
  g.fillStyle='#120808';g.beginPath();g.moveTo(cx-104,330);g.quadraticCurveTo(cx,420,cx+104,330);g.quadraticCurveTo(cx,366,cx-104,330);g.fill();
  g.fillStyle='#e8e0c8';for(let i=0;i<22;i++){const t=i/21,x=cx-96+t*192,yy=332+Math.sin(t*Math.PI)*22;g.beginPath();g.moveTo(x-4,yy);g.lineTo(x+4,yy);g.lineTo(x,yy+12+Math.sin(t*Math.PI)*8);g.closePath();g.fill();}
  g.strokeStyle='rgba(60,30,30,0.45)';g.lineWidth=2;[[-104,330,-120,300],[104,330,120,300]].forEach(([a,b,c2,d])=>{g.beginPath();g.moveTo(cx+a,b);g.lineTo(cx+c2,d);g.stroke();});
  g.strokeStyle='rgba(50,30,30,0.35)';g.lineWidth=1.5;const r=rng('fc');for(let i=0;i<14;i++){let x=cx+(r()-0.5)*200,y=40+r()*120;g.beginPath();g.moveTo(x,y);for(let k=0;k<4;k++){x+=(r()-0.5)*20;y+=r()*18;g.lineTo(x,y);}g.stroke();}});}

const SM=(o)=>new THREE.MeshStandardMaterial(o);
function cst(m){m.castShadow=true;m.receiveShadow=true;return m;}
function box(w,h,d,mat,x,y,z,parent){const m=cst(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat.isMaterial?mat:SM({color:mat,roughness:0.85})));m.position.set(x,y,z);(parent||scene).add(m);return m;}
function sprite(t,s,parent,op){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,opacity:op==null?1:op}));m.scale.set(s,s,1);(parent||scene).add(m);return m;}
function pl(col,int,dist,x,y,z,parent){const L=new THREE.PointLight(col,int,dist,1.6);L.position.set(x,y,z);(parent||scene).add(L);return L;}
function seg(len,th,mat){const g=new THREE.Group();const m=cst(new THREE.Mesh(new THREE.CylinderGeometry(th*0.85,th,len,10),mat));m.position.y=-len/2;g.add(m);const j=cst(new THREE.Mesh(new THREE.SphereGeometry(th*1.08,10,8),mat));g.add(j);g.userData.len=len;return g;}

/* ---------------- the creature */
function makeHand(mat,scale){const h=new THREE.Group();const palm=cst(new THREE.Mesh(new THREE.BoxGeometry(0.75,1.0,0.28),mat));palm.position.y=-0.5;h.add(palm);h.userData.fingers=[];
  for(let i=0;i<4;i++){let par=h;const base=new THREE.Group();base.position.set(-0.3+i*0.2,-1.0,0);h.add(base);par=base;const f=[];for(let k=0;k<4;k++){const s=seg(0.95-k*0.12,0.07,mat);s.position.y=k?-par.userData.len:0;par.add(s);f.push(s);par=s;}h.userData.fingers.push(f);}
  const th=seg(0.8,0.08,mat);th.position.set(0.42,-0.4,0.1);th.rotation.z=-0.8;h.add(th);h.scale.setScalar(scale||1);return h;}
function curl(hand,k,spread){hand.userData.fingers.forEach((f,i)=>{f.forEach((s,j)=>{s.rotation.x=k*(0.35+j*0.12);s.rotation.z=j===0?(i-1.5)*(spread||0.12):0;});});}
function makeWalker(){const mat=SM({map:skinTex(),roughness:0.88,color:0xffffff});const g=new THREE.Group();const P={};
  const hips=new THREE.Group();hips.position.y=9.6;g.add(hips);P.hips=hips;cst(new THREE.Mesh(new THREE.BoxGeometry(1.6,0.9,0.9),mat)).position.set(0,0,0);hips.add(hips.children[0]||new THREE.Object3D());
  const pel=cst(new THREE.Mesh(new THREE.BoxGeometry(1.6,0.9,0.9),mat));hips.add(pel);
  [-1,1].forEach(s=>{const th=seg(4.9,0.33,mat);th.position.set(s*0.6,0,0);hips.add(th);const sh=seg(4.9,0.26,mat);sh.position.y=-4.9;th.add(sh);const ft=cst(new THREE.Mesh(new THREE.BoxGeometry(0.5,0.3,1.7),mat));ft.position.set(0,-4.9,0.5);sh.add(ft);P[s<0?'thL':'thR']=th;P[s<0?'shL':'shR']=sh;});
  const torso=new THREE.Group();hips.add(torso);P.torso=torso;const chest=cst(new THREE.Mesh(new THREE.BoxGeometry(1.7,5.8,1.0),mat));chest.position.y=2.9;torso.add(chest);
  for(let i=0;i<6;i++){const rib=new THREE.Mesh(new THREE.BoxGeometry(1.74,0.08,1.04),SM({color:'#8a8378',roughness:0.9}));rib.position.y=3.0+i*0.42;torso.add(rib);}
  const neck=new THREE.Group();neck.position.y=5.8;torso.add(neck);P.neck=neck;const nk=cst(new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.34,1.8,10),mat));nk.position.y=0.9;neck.add(nk);
  const headG=new THREE.Group();headG.position.y=1.8;neck.add(headG);P.head=headG;
  const fmat=[mat,mat,mat,mat,SM({map:walkerFaceTex(),roughness:0.85}),mat];const hd=cst(new THREE.Mesh(new THREE.BoxGeometry(1.35,2.6,1.25),fmat));hd.position.y=1.15;headG.add(hd);
  [-1,1].forEach(s=>{const sh=new THREE.Group();sh.position.set(s*1.0,5.4,0);torso.add(sh);const up=seg(4.8,0.24,mat);sh.add(up);const fo=seg(5.4,0.2,mat);fo.position.y=-4.8;up.add(fo);const hn=makeHand(mat,1.0);hn.position.y=-5.4;fo.add(hn);
    P[s<0?'shoL':'shoR']=sh;P[s<0?'upL':'upR']=up;P[s<0?'foL':'foR']=fo;P[s<0?'handL':'handR']=hn;});
  g.userData.P=P;scene.add(g);g.visible=false;return g;}
function wReset(){const P=world.walker.userData.P;[P.hips,P.torso,P.neck,P.head,P.thL,P.thR,P.shL,P.shR,P.shoL,P.shoR,P.upL,P.upR,P.foL,P.foR,P.handL,P.handR].forEach(o=>o.rotation.set(0,0,0));P.hips.position.set(0,9.6,0);world.walker.rotation.set(0,0,0);curl(P.handL,0.3);curl(P.handR,0.3);return P;}
function wStand(x,y,z,ry,t,opt){opt=opt||{};const g=world.walker;g.visible=true;g.position.set(x,y,z);const P=wReset();g.rotation.y=ry||0;
  P.torso.rotation.x=0.22;P.neck.rotation.x=0.25;P.head.rotation.z=(opt.tilt==null?0.35:opt.tilt)+Math.sin(t*0.7)*0.05;P.head.rotation.x=opt.headX||-0.15;
  P.thL.rotation.x=-0.18;P.thR.rotation.x=0.05;P.shL.rotation.x=0.3;P.shR.rotation.x=0.15;
  P.upL.rotation.set(0.05+Math.sin(t*0.9)*0.04,0,-0.08);P.upR.rotation.set(-0.05,0,0.08);P.foL.rotation.x=-0.1;P.foR.rotation.x=-0.25;return P;}
function wCrawl(x,y,z,ry,t){const g=world.walker;g.visible=true;g.position.set(x,y,z);const P=wReset();g.rotation.y=ry||0;P.hips.position.y=5.2;
  P.torso.rotation.x=1.45;P.neck.rotation.x=-1.2;P.head.rotation.x=-0.2;P.head.rotation.z=0.4;
  const k=Math.sin(t*3);P.upL.rotation.set(-1.45+k*0.25,0,-0.3);P.upR.rotation.set(-1.45-k*0.25,0,0.3);P.foL.rotation.x=-0.9;P.foR.rotation.x=-0.9;
  P.thL.rotation.x=-1.6-k*0.2;P.thR.rotation.x=-1.6+k*0.2;P.shL.rotation.x=2.2;P.shR.rotation.x=2.2;return P;}

/* ---------------- world */
function buildWorld(){
  scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x0a1220,0.02);
  world.skyCanvas=cv(16,512);world.skyTex=tex(world.skyCanvas[0]);scene.background=world.skyTex;
  world.hemi=new THREE.HemisphereLight(0x8aa0d8,0x101418,0.3);scene.add(world.hemi);
  const moon=world.moon=new THREE.DirectionalLight(0x9ab4ff,0.6);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);const sc=moon.shadow.camera;sc.left=-40;sc.right=40;sc.top=40;sc.bottom=-40;sc.near=1;sc.far=300;moon.shadow.bias=-0.0004;moon.shadow.normalBias=0.06;scene.add(moon);scene.add(moon.target);
  world.sunDir=V3(-0.5,0.7,0.5).normalize();world.look=V3(0,0,0);
  world.T={warm:glowTex('rgba(255,170,90,0.9)'),eye:glowTex('rgba(255,250,230,0.9)'),fog:glowTex('rgba(150,170,200,0.5)')};
  buildExterior();buildInterior();world.walker=makeWalker();
  world.hands=[makeHand(SM({map:skinTex(),roughness:0.88}),1.5),makeHand(SM({map:skinTex(),roughness:0.88}),1.5)];world.hands.forEach(h=>{scene.add(h);h.visible=false;});
  world.creepL=pl(0xb8c8ff,0,30,0,0,0);world.eyes=[sprite(world.T.eye,0.5),sprite(world.T.eye,0.5)];world.eyes.forEach(e=>e.visible=false);
}
function buildExterior(){const g=world.ext=new THREE.Group();scene.add(g);
  const gt=grassTex();gt.wrapS=gt.wrapT=THREE.RepeatWrapping;gt.repeat.set(40,40);const ground=new THREE.Mesh(new THREE.PlaneGeometry(500,500),SM({map:gt,roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;g.add(ground);
  const lm=SM({map:logTex(),roughness:0.9});box(16,9,12,lm,0,4.5,0,g);
  const rm=SM({color:'#2a1e18',roughness:0.95});[-1,1].forEach(s=>{const r=box(10,0.6,13.5,rm,s*4.2,10.6,0,g);r.rotation.z=-s*0.62;});box(0.6,3.8,12,lm,0,10.5,0,g);
  box(2.8,5.6,0.3,SM({color:'#3a2414',roughness:0.8}),0,2.8,6.05,g);world.extDoor=g.children[g.children.length-1];
  world.porch=pl(0xffb060,1.0,18,0,7,8,g);const pg=world.porchGlow=sprite(world.T.warm,2.5,g,0.8);pg.position.set(0,7,6.4);
  world.extWins=[[-5,4.5],[5,4.5]].map(([x,y])=>box(2.8,2.4,0.2,SM({color:'#ffb060',emissive:0xff9a40,emissiveIntensity:0.9}),x,y,6.1,g));
  box(16,0.4,4,SM({map:plankTex('#4a3220'),roughness:0.9}),0,0.2,8,g);
  const r=rng('trees');world.trees=[];for(let i=0;i<170;i++){let x,z;do{x=(r()-0.5)*260;z=(r()-0.5)*260;}while(Math.hypot(x,z)<22);const h=16+r()*16;
    const tr=cst(new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.7,h,8),SM({color:'#1e1712',roughness:1})));tr.position.set(x,h/2,z);g.add(tr);
    for(let k=0;k<3;k++){const c=cst(new THREE.Mesh(new THREE.ConeGeometry(4.2-k*1.1,6,8),SM({color:k%2?'#10201a':'#0c1914',roughness:1})));c.position.set(x,h*0.55+k*4,z);g.add(c);}world.trees.push(tr);}
  world.fogs=[];for(let i=0;i<30;i++){const s=sprite(world.T.fog,30+r()*25,g,0.35);s.position.set((r()-0.5)*160,2+r()*3,(r()-0.5)*160);world.fogs.push(s);}
}
function buildInterior(){const g=world.int=new THREE.Group();g.position.set(IX,0,0);scene.add(g);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(40,40),SM({map:plankTex('#5a3c24'),roughness:0.8}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;g.add(floor);
  const wm=SM({map:logTex(),roughness:0.9});box(32,16,0.5,wm,0,8,-10,g);box(0.5,16,24,wm,-16,8,0,g);box(0.5,16,24,wm,15,8,0,g);box(32,16,0.5,wm,0,8,12,g);
  world.ceiling=box(32,0.5,24,SM({map:plankTex('#3a2616'),roughness:0.9}),0,15.2,1,g);
  // bedroom: two beds + window between them
  const bm=SM({color:'#e8e2d6',roughness:0.95});[[-5,'#5a6a8a'],[1.5,'#a86a7a']].forEach(([x,c],i)=>{box(3.4,1.2,7,SM({color:'#4a3220'}),x,0.6,-5.8,g);box(3.2,0.5,6.8,bm,x,1.45,-5.8,g);const bl=box(3.3,0.35,4.6,SM({color:c,roughness:0.95}),x,1.8,-4.8,g);box(2.4,0.5,1.2,bm,x,1.95,-8.5,g);if(i===1)world.sisBlanket=bl;});
  [[0,2.1,4.4,0.3],[0,-2.1,4.4,0.3],[2.1,0,0.3,4.4],[-2.1,0,0.3,4.4]].forEach(([x,y,w,h])=>box(w,h,0.3,SM({color:'#3a2414'}),-1.8+x,7.4+y,-9.45,g));world.winGlass=new THREE.Mesh(new THREE.PlaneGeometry(3.8,3.8),new THREE.MeshStandardMaterial({color:0x0a1430,emissive:0x061028,emissiveIntensity:1,transparent:true,opacity:0.55}));world.winGlass.position.set(-1.8,7.4,-9.5);g.add(world.winGlass);
  const outside=new THREE.Mesh(new THREE.PlaneGeometry(14,10),new THREE.MeshBasicMaterial({color:0x06101e}));outside.position.set(-1.8,7.4,-14);g.add(outside);
  box(0.25,4,0.3,SM({color:'#3a2414'}),-1.8,7.4,-9.5,g);box(4,0.25,0.3,SM({color:'#3a2414'}),-1.8,7.4,-9.5,g);
  // living room: fireplace, chair, front door
  box(5,6,1.6,SM({color:'#5a5a60',roughness:0.95}),8,3,-9.2,g);box(3,2.4,1,SM({color:'#120a08'}),8,1.6,-8.6,g);world.fire=sprite(world.T.warm,3.2,g);world.fire.position.set(8,1.8,-8.2);world.fireL=pl(0xff8a3a,1.6,30,8,3,-6,g);
  const ch=SM({color:'#6a3a2a',roughness:0.95});box(3,1.4,3,ch,8,1.2,3,g);box(3,3.4,0.8,ch,6.6,3,3,g);
  world.intDoor=box(0.3,6.4,3.2,SM({color:'#3a2414',roughness:0.8}),14.7,3.2,5,g);world.knob=box(0.3,0.3,0.3,SM({color:'#c9a24a',metalness:0.8,roughness:0.3}),14.4,3.2,6.1,g);
  world.peep=box(0.32,0.25,0.25,SM({color:'#c9a24a',metalness:0.8,roughness:0.3}),14.4,5.2,5,g);
  // kitchen corner (dawn)
  box(5,0.3,3,SM({map:plankTex('#7a5232')}),-9,3.2,6,g);[[-11,4.7],[-7,7.3]].forEach(([x,z])=>box(0.3,3.2,0.3,SM({color:'#4a3220'}),x,1.6,z,g));
  box(5,5,0.3,SM({color:'#ffe8c0',emissive:0xffd8a0,emissiveIntensity:0}),-9,8,11.7,g);world.dawnWin=g.children[g.children.length-1];
  world.lampL=pl(0xffb070,0.4,20,-4,10,-4,g);world.dawnL=pl(0xfff0d8,0,50,-9,9,9,g);
}

/* ---------------- characters */
function buildChars(){const add=(id,spec,sc)=>{const g=buildChar(spec);if(sc)g.scale.setScalar(sc);scene.add(g);g.visible=false;chars[id]=g;return g;};
  add('leo',BH.castById('leo10'));add('sis',BH.castById('sis10'),0.8);add('gpa',BH.castById('gpa10'));}
function showOnly(ids){Object.keys(chars).forEach(k=>chars[k].visible=ids.includes(k));}
function reset(P){['armL','armR','legL','legR','head'].forEach(k=>P[k].rotation.set(0,0,0));P.torso.rotation.set(0,0,0);P.torso.position.y=0;P._anim=null;P.armL.position.set(-1.5,4,0);P.armR.position.set(1.5,4,0);}
function st(id,x,y,z,ry,e){const c=chars[id];c.position.set(x,y,z);c.rotation.set(0,ry||0,0);c.visible=true;const P=c.userData.P;reset(P);if(e)P.setFace(e);return P;}
function sit(P){P.legL.rotation.x=-1.5;P.legR.rotation.x=-1.5;}
function mouth(P,who,t,e){const env=TL.mouth[who];const f=Math.round(t*TL.fps);const a=env?env[f]||0:0;P.setFace(e||P.expr||'default',{mouthOpen:a>0.12?Math.min(1,a*1.1):0});}
function walk(P,t,sp,e){BH.animate(P,t*(sp||1),{motion:'walk',blend:0.01,face:false});P.setFace(e||'default');}
function lw0(o,v){let r=o;while(r.parent&&r.parent!==scene)r=r.parent;r.updateMatrixWorld(true);return o.localToWorld(v);}
const head=id=>lw0(chars[id].userData.P.head,V3(0,0.6,0));
const faceCam=(id,x,y,d)=>lw0(chars[id].userData.P.head,V3(x,0.6+y,d));
function close(id,d,x,y,fov){const hp=head(id);const sc=chars[id].scale.x;camAt(faceCam(id,x==null?0.5:x,y==null?0.05:y,(d||3.4)*1.75/sc),hp.clone().add(V3(0,-0.05,0)),fov||36);}
function camAt(p,l,fov){cam.position.copy(p);cam.lookAt(l);cam.fov=fov||40;cam.updateProjectionMatrix();world.look.copy(l);}
function shake(a,t){cam.position.x+=Math.sin(t*23.1)*a+Math.sin(t*41.7)*a*0.5;cam.position.y+=Math.cos(t*19.3)*a;}
function wHead(){return lw0(world.walker.userData.P.head,V3(0,1.2,0.6));}
// layouts
function leoBed(e){const P=st('leo',IX-5,1.7,-5.6,0,e);sit(P);return P;}
function sisBed(e){const P=st('sis',IX+1.5,1.7,-5.6,-0.15,e);sit(P);return P;}
function gpaChair(e,t){const P=st('gpa',IX+8,1.0,3,-Math.PI/2+0.3,e);sit(P);P.head.rotation.z=0.25;P.setFace(e||'default',{blink:true});return P;}

/* ---------------- look */
function sky(a,b,c){const [cc,g]=world.skyCanvas;const gr=g.createLinearGradient(0,0,0,512);gr.addColorStop(0,a);gr.addColorStop(0.6,b);gr.addColorStop(1,c);g.fillStyle=gr;g.fillRect(0,0,16,512);world.skyTex.needsUpdate=true;}
function mood(m){if(world.mood===m)return;world.mood=m;
  const M={night:['#02030a','#070b1a','#0e1428',0x8aa0d8,0.3,0x9ab4ff,0.55,0x0a1220,0.02],inside:['#02030a','#070b1a','#0e1428',0x7a88b8,0.22,0x9ab4ff,0.15,0x0a0808,0.004],dawn:['#7a8ab8','#d8c8c0','#f4dcc0',0xfff0e0,0.55,0xffe8d0,0.6,0xd8c8c0,0.004]}[m];
  sky(M[0],M[1],M[2]);world.hemi.color.setHex(M[3]);world.hemi.intensity=M[4];world.moon.color.setHex(M[5]);world.moon.intensity=M[6];scene.fog.color.setHex(M[7]);scene.fog.density=M[8];
  world.dawnL.intensity=m==='dawn'?1.6:0;world.dawnWin.material.emissiveIntensity=m==='dawn'?1:0;world.lampL.intensity=m==='dawn'?0.2:0.45;}
function eyesAt(p,sp){world.eyes.forEach((e,i)=>{e.visible=true;e.position.copy(p).add(V3((i?1:-1)*(sp||0.6),0,0));const k=0.35+0.05*Math.sin(Date.now());e.scale.setScalar(0.5);});}

/* ---------------- shots */
const SH={
  cabin_night:(u,t)=>{mood('night');camAt(V3(lerp(10,6,u),lerp(6,5,u),lerp(42,34,ease(u))),V3(0,5,0),42);showOnly([]);},
  treeline_eyes:(u,t,lt)=>{mood('night');const P=wStand(4,0,58,Math.PI,t,{tilt:0.5});eyesAt(wHead().add(V3(0,0,0.3)),0.35);camAt(V3(1,5.5,lerp(16,20,u)),V3(3,lerp(8,13,u),56),40);showOnly([]);S.dark=0.15;},
  walker_legs:(u,t,lt)=>{mood('night');const z=lerp(50,44,u);const P=wStand(lerp(-14,-8,u),0,z,Math.PI*0.9,t);const k=Math.sin(lt*2.5);P.thL.rotation.x=-0.4*k;P.thR.rotation.x=0.4*k;P.shL.rotation.x=0.4+0.3*Math.max(0,k);P.shR.rotation.x=0.4+0.3*Math.max(0,-k);
    camAt(V3(lerp(-6,-4,u),1.2,z-16),V3(lerp(-11,-8,u),4,z),44);showOnly([]);},
  walker_hand:(u,t)=>{mood('night');const tr=world.trees[3];const tp=tr.position;const P=wStand(tp.x-1.2,0,tp.z+1.6,Math.PI*0.75,t);P.upR.rotation.set(-2.0,0,-0.4);P.foR.rotation.x=-0.6;curl(P.handR,lerp(0.2,0.75,ease(u)));
    const hp=lw0(P.handR,V3(0,-1.5,0));world.creepL.position.copy(hp).add(V3(-2,2,-4));world.creepL.intensity=1.2;camAt(hp.clone().add(V3(lerp(-6,-5,u),-1,-9)),hp,40);showOnly([]);},
  door_lock:(u,t,lt)=>{mood('inside');const P=st('leo',IX+13.5,0,5,Math.PI/2,'default');P.armR.rotation.set(-1.5,0,0.2);world.knob.rotation.x=lt>1.2?Math.PI/2:0;camAt(V3(IX+lerp(9,10,u),5.6,lerp(10,9,u)),V3(IX+14,4.5,5),42);showOnly(['leo']);},
  night1_card:(u,t)=>{mood('night');camAt(V3(0,6,lerp(40,37,u)),V3(0,5,0),42);showOnly([]);S.card={text:'NIGHT 1',k:u};},
  window_walker:(u,t)=>{mood('night');const P=wStand(-3,0,62,Math.PI,t,{tilt:0.7});P.upR.rotation.set(-0.4,0,0.3);camAt(V3(-5,4.6,7.2),V3(-3,lerp(9,11,u),62),lerp(34,26,ease(u)));showOnly([]);S.windowFrame=1;},
  sis_bed:(u,t)=>{mood('inside');const L=leoBed('shocked');L.head.rotation.y=-0.6;const s=sisBed('smug');s.setFace('happy');camAt(V3(IX-1.6,6.5,lerp(9,7,u)),V3(IX-1.6,3.4,-5.6),50);showOnly(['leo','sis']);},
  night2_card:(u,t)=>{mood('night');camAt(V3(6,5,lerp(30,28,u)),V3(0,4,6),42);showOnly([]);S.card={text:'NIGHT 2',k:u};},
  door_leo:(u,t)=>{mood('inside');const P=st('leo',IX+13.2,0,5,Math.PI/2,'shocked');P.torso.rotation.z=-0.1;close('leo',lerp(4,3.4,u),-0.6,0.05,38);showOnly(['leo']);},
  peephole_body:(u,t)=>{mood('night');world.porchGlow.visible=false;const P=wStand(0,0,9.5,Math.PI,t,{tilt:0.2});camAt(V3(0,5.2,6.4),V3(0,lerp(9,11,u),12),60);showOnly([]);S.peep=1;},
  peephole_face:(u,t,lt)=>{mood('night');world.porchGlow.visible=false;const P=wStand(0,0,lerp(14.5,12.8,ease(lt/1.2)),Math.PI,t,{tilt:lerp(0.1,0.5,ease(lt/1.5)),headX:0});world.walker.position.y=-13.0;
    const hp=wHead();world.creepL.position.copy(hp).add(V3(0,2.5,-2.5));world.creepL.intensity=1.6;camAt(V3(0,5.2,6.4),hp.clone().add(V3(0,-0.2,0)),lerp(58,48,ease(u)));showOnly([]);S.peep=1;S.breath=1;},
  grandpa_chair:(u,t)=>{mood('inside');const P=st('leo',IX+13.2,0,5,-Math.PI/2+0.5,'shocked');gpaChair('default',t);camAt(V3(IX+lerp(12,11,u),6,lerp(12,11,u)),V3(IX+9.5,3.8,3.5),46);showOnly(['leo','gpa']);},
  night3_card:(u,t)=>{mood('night');camAt(V3(-8,12,lerp(28,25,u)),V3(0,8,0),42);showOnly([]);S.card={text:'NIGHT 3',k:u};},
  roof_crawl:(u,t)=>{mood('night');const P=wCrawl(lerp(6,-4,u),9.6,lerp(1.5,0,u),-Math.PI/2,t);world.creepL.position.set(0,22,10);world.creepL.intensity=1.5;camAt(V3(lerp(8,4,u),16,20),V3(lerp(4,-2,u),11,0),44);showOnly([]);S.shakeA=0.006;},
  window_fingers:(u,t,lt)=>{mood('inside');world.hands.forEach((h,i)=>{h.visible=true;h.rotation.set(0,0,Math.PI+(i?-0.15:0.15));h.position.set(IX-1.8+(i?1:-1)*0.9,lerp(10.2,8.4,ease(u))+(i?0.3:0),-9.3);curl(h,0.05+0.05*Math.sin(t*3+i),0.18);});
    world.creepL.position.set(IX-1.8,7,-7);world.creepL.intensity=1.2;camAt(V3(IX-1.8,6.4,lerp(-3,-4.5,u)),V3(IX-1.8,lerp(8.8,8.0,u),-9.6),46);showOnly([]);S.shakeA=0.004;},
  sis_giggle:(u,t)=>{mood('inside');const s=sisBed('happy');s.setFace('happy',{mouthOpen:Math.abs(Math.sin(t*9))*0.5});s.torso.rotation.z=Math.sin(t*9)*0.04;close('sis',lerp(4.0,3.0,ease(u)),-0.3,0.05,36);showOnly(['sis']);S.dark=0.25;},
  dawn_kitchen:(u,t)=>{mood('dawn');const L=st('leo',IX-10.5,0.8,7.2,Math.PI*0.7,'sad');sit(L);mouth(L,'leo',t,'sad');const G=st('gpa',IX-7.4,0.8,5,-Math.PI*0.3,'default');sit(G);camAt(V3(IX-2,6.5,1),V3(IX-9,4,6),42);showOnly(['leo','gpa']);},
  grandpa_only:(u,t)=>{mood('dawn');const G=st('gpa',IX-7.4,0.8,5,-Math.PI*0.3,'sad');sit(G);mouth(G,'grandpa',t,'sad');close('gpa',lerp(4.2,3.6,u),0.4,0.05,38);showOnly(['gpa']);},
  bed_empty:(u,t,lt)=>{mood('dawn');world.sisBlanket.scale.y=0.4;const P=st('leo',IX-1.6,0,-1,Math.PI,'shocked');camAt(V3(IX-1.6,6.4,lerp(5,2,ease(u))),V3(IX+1.5,2.2,-5.8),40);showOnly(['leo']);},
  ceiling_walker:(u,t,lt)=>{mood('inside');const P=st('leo',IX-1.6,0,-1,Math.PI,'shocked');P.head.rotation.x=-0.9;const W2=wCrawl(IX-1.6,15.0,-6,0,t*0.3);world.walker.rotation.z=Math.PI;world.walker.position.y=15.0;
    const hp=wHead();world.creepL.position.copy(hp).add(V3(0,-3,2));world.creepL.intensity=2;camAt(V3(IX-1.2,3.2,1.5),hp.clone().lerp(V3(IX-1.6,11,-6),0.5),lerp(90,68,easeOut(lt/0.3)));showOnly(['leo']);S.zoomPunch=lt<0.15?1:0;S.flash=lt<0.06?0.5:0;S.shakeA=0.03;},
  grandpa_run:(u,t)=>{mood('dawn');const G=st('gpa',IX+lerp(6,1,u),0,lerp(4,0,u),-Math.PI*0.7,'shocked');walk(G,t,1.6,'shocked');const L=st('leo',IX-1.6,0,-1,Math.PI*0.7,'shocked');L.armL.rotation.set(-2.6,0,0.3);L.armR.rotation.set(-2.6,0,-0.3);camAt(V3(IX-6,6,6),V3(IX,4,0),44);showOnly(['gpa','leo']);},
  ceiling_empty:(u,t)=>{mood('dawn');camAt(V3(IX-1.2,4.6,-0.4),V3(IX-1.6,15,-6),48);showOnly([]);},
  walker_tall:(u,t)=>{mood('dawn');const P=wStand(2,0,40,Math.PI,t,{tilt:0.55});P.upR.rotation.set(-0.3,0,0.2);camAt(V3(lerp(-2,0,u),lerp(2,3,u),lerp(18,22,u)),V3(2,lerp(9,13,u),40),46);showOnly([]);S.fogBoost=1;},
  walker_face:(u,t,lt)=>{mood('dawn');const P=wStand(2,0,40,Math.PI,t,{tilt:lerp(0.55,0.85,ease(u))});const hp=wHead();const cp=lw0(P.head,V3(0,1.0,lerp(9,5,ease(u))));camAt(cp,hp.clone().add(V3(0,-0.3,0)),36);showOnly([]);S.zoomPunch=u>0.85?1:0;},
  door_end:(u,t,lt)=>{mood('inside');const G=st('gpa',IX+lerp(10,13.2,ease(lt/1.5)),0,5,Math.PI/2,'default');if(lt<1.5)walk(G,t,1,'default');G.armR.rotation.set(-1.4,0,0.2);
    const open=clamp((lt-2.2)/1.0,0,1);world.intDoor.position.z=5+open*0.9;world.intDoor.rotation.y=-open*0.5;
    if(open>0){const P=wStand(IX+21,0,5,-Math.PI/2,t,{tilt:0.7});P.torso.rotation.x=0.9;P.neck.rotation.x=-0.3;P.head.rotation.x=-0.5;P.hips.position.y=8.2;}
    camAt(V3(IX+lerp(6,8,u),5.5,lerp(1,2,u)),V3(IX+14.5,5,5),40);showOnly(['gpa']);S.black=lt>3.6?1:clamp((lt-3.3)/0.3,0,1);},
};

/* ---------------- 2D overlays */
function T(text,x,y,size,fill,stroke,lw,align,font){og.font=`${size}px ${font||FONT}`;og.textAlign=align||'center';og.textBaseline='middle';og.lineJoin='round';if(stroke){og.lineWidth=lw||size*0.18;og.strokeStyle=stroke;og.strokeText(text,x,y);}og.fillStyle=fill;og.fillText(text,x,y);}
function drawCard(c,t){og.save();og.fillStyle='rgba(0,0,0,0.72)';og.fillRect(0,0,W,H);const k=easeOut(c.k*3);const jit=Math.sin(t*50)>0.6?W*0.004:0;og.globalAlpha=k;
  og.shadowColor='rgba(200,0,0,0.8)';og.shadowBlur=W*0.04;og.font=`bold ${W*0.17}px "DejaVu Serif", serif`;og.textAlign='center';og.textBaseline='middle';og.fillStyle='#e8e2d6';og.fillText(c.text,W/2+jit,H*0.42);og.restore();}
function drawPeep(){og.save();const r=W*0.42;og.fillStyle='#000';og.beginPath();og.rect(0,0,W,H);og.arc(W/2,H*0.42,r,0,Math.PI*2,true);og.fill('evenodd');
  const gr=og.createRadialGradient(W/2,H*0.42,r*0.6,W/2,H*0.42,r);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,0.95)');og.fillStyle=gr;og.beginPath();og.arc(W/2,H*0.42,r,0,7);og.fill();og.restore();}
function drawWindowFrame(){og.save();og.fillStyle='#120c08';const b=W*0.05;og.fillRect(0,0,W,H*0.12);og.fillRect(0,H*0.82,W,H*0.18);og.fillRect(0,0,b*1.4,H);og.fillRect(W-b*1.4,0,b*1.4,H);og.fillRect(W/2-b/2,0,b,H);og.fillRect(0,H*0.45,W,b);
  og.fillStyle='rgba(150,180,220,0.06)';og.fillRect(0,0,W,H);og.restore();}
function drawOverlays(t){
  if(S.dark){og.fillStyle=`rgba(0,0,0,${S.dark})`;og.fillRect(0,0,W,H);}
  if(S.windowFrame)drawWindowFrame();
  if(S.peep)drawPeep();
  if(S.breath){const k=0.15+0.12*Math.sin(t*2.2);og.fillStyle=`rgba(200,210,230,${k})`;og.beginPath();og.ellipse(W/2,H*0.55,W*0.25,H*0.06,0,0,7);og.fill();}
  if(S.card)drawCard(S.card,t);
  const vg=og.createRadialGradient(W/2,H*0.48,H*0.25,W/2,H/2,H*0.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,`rgba(0,0,0,${world.mood==='dawn'?0.35:0.65})`);og.fillStyle=vg;og.fillRect(0,0,W,H);
  const r=rng('gr'+Math.floor(t*24));og.fillStyle='rgba(255,255,255,0.05)';for(let i=0;i<420;i++){og.fillRect(r()*W,r()*H,1.6,1.6);}og.fillStyle='rgba(0,0,0,0.08)';for(let i=0;i<420;i++){og.fillRect(r()*W,r()*H,1.6,1.6);}
  if(world.mood!=='dawn'){const fl=0.04*Math.max(0,Math.sin(t*37)*Math.sin(t*13));og.fillStyle=`rgba(0,0,0,${fl})`;og.fillRect(0,0,W,H);}
  og.fillStyle='#000';og.fillRect(0,0,W,H*0.012);og.fillRect(0,H*0.988,W,H*0.012);
  if(S.flash>0){og.fillStyle=`rgba(255,240,230,${S.flash})`;og.fillRect(0,0,W,H);}
  if(S.black>0){og.fillStyle=`rgba(0,0,0,${S.black})`;og.fillRect(0,0,W,H);}
}
function captionAt(t){for(const s of TL.segs){for(let i=0;i<s.words.length;i++){const w=s.words[i];const nx=s.words[i+1];const end=nx?nx.s:Math.min(w.e+0.25,s.end+0.25);if(t>=w.s&&t<end)return {w,since:t-w.s,who:s.who};}}return null;}
function drawCaption(t){if(S.black>=1)return;const c=captionAt(t);if(!c)return;const text=c.w.w.toUpperCase();const base=W*0.105*(text.length>8?8/text.length*1.05:1);const k=c.since<0.05?lerp(1.12,1,c.since/0.05):1;
  og.save();og.translate(W/2,H*0.7);og.scale(k,k);og.font=`${base}px ${FONT}`;og.textAlign='center';og.textBaseline='middle';og.lineJoin='round';og.shadowColor='rgba(0,0,0,0.8)';og.shadowBlur=base*0.3;og.lineWidth=base*0.2;og.strokeStyle='#050507';og.strokeText(text,0,0);og.shadowColor='transparent';
  og.fillStyle=c.w.red?'#ff2e2e':(c.who==='mimicg'||c.who==='mimicl'?'#b8c4d0':c.who==='grandpa'?'#ffd0a0':'#ffffff');og.fillText(text,0,0);og.restore();}

/* ---------------- entry points */
S.init=async function(timeline,w,h,fontUrl){TL=timeline;W=w;H=h;SS=window.BH_SS||1.25;
  const ff=new FontFace('Luckiest Guy',`url(${fontUrl})`);await ff.load();document.fonts.add(ff);
  R=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});R.setPixelRatio(1);R.setSize(Math.round(W*SS),Math.round(H*SS));R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.15;R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
  cam=new THREE.PerspectiveCamera(40,W/H,0.1,1000);
  buildWorld();buildChars();
  const [oc,o2]=cv(W,H);out=oc;og=o2;og.imageSmoothingEnabled=true;og.imageSmoothingQuality='high';scene.updateMatrixWorld(true);return true;};
const KEYS=['flash','black','shakeA','zoomPunch','dark','card','peep','breath','windowFrame','fogBoost'];
S.frame=function(f,q){const t=f/TL.fps;const shot=TL.shots.find(s=>t>=s.s&&t<s.e)||TL.shots[TL.shots.length-1];
  KEYS.forEach(k=>S[k]=null);world.mood=null;world.creepL.intensity=0;world.porchGlow.visible=true;world.walker.visible=false;world.hands.forEach(h=>h.visible=false);world.eyes.forEach(e=>e.visible=false);
  world.knob.rotation.x=0;world.intDoor.position.z=5;world.intDoor.rotation.y=0;world.sisBlanket.scale.y=1;
  if(shot!==curShot){curShot=shot;showOnly([]);}
  Object.values(chars).forEach(c=>{c.rotation.set(0,0,0);});
  world.fire.scale.setScalar(3.0+0.4*Math.sin(t*13)+0.2*Math.sin(t*29));world.fireL.intensity=1.4+0.3*Math.sin(t*11)*Math.sin(t*7);
  world.fogs.forEach((s,i)=>{s.position.x+=Math.sin(t*0.1+i)*0.01;});
  const u=(t-shot.s)/(shot.e-shot.s),lt=t-shot.s;scene.updateMatrixWorld(true);
  (SH[shot.name]||SH.door_end)(u,t,lt);
  if(S.shakeA)shake(S.shakeA,t);
  world.moon.target.position.copy(world.look);world.moon.position.copy(world.look).addScaledVector(world.sunDir,110);
  scene.updateMatrixWorld(true);R.render(scene,cam);
  const grade=world.mood==='dawn'?'contrast(1.06) saturate(0.85)':'contrast(1.14) saturate(0.75) brightness(1.0)';
  og.globalAlpha=1;og.globalCompositeOperation='source-over';og.filter=grade;
  if(S.zoomPunch){const z=1+0.06*S.zoomPunch;og.drawImage(R.domElement,(W-W*z)/2,(H-H*z)/2,W*z,H*z);}else og.drawImage(R.domElement,0,0,W,H);
  og.filter=`blur(${Math.round(W*0.016)}px) brightness(1.2)`;og.globalCompositeOperation='screen';og.globalAlpha=0.18;og.drawImage(R.domElement,0,0,W,H);og.filter='none';og.globalCompositeOperation='source-over';og.globalAlpha=1;
  if(world.mood!=='dawn'){og.globalCompositeOperation='multiply';og.fillStyle='rgba(150,170,255,0.18)';og.fillRect(0,0,W,H);og.globalCompositeOperation='source-over';}
  drawOverlays(t);drawCaption(t);
  return out.toDataURL('image/jpeg',q||0.94);};
})();
