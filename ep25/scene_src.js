/* Episode 25 "Every Lie Makes You Old" (In my world..., narrator Zash). Every lie ages you instantly. Mom is 38 and
   looks 90; Zash is ashamed until he sees every lie was for him. Sets: decorated town, school hall, bedroom (BED),
   the family home (HM). Ageing = swapping to an older build of the same character with a poof + "+N YEARS" pop.
   ep23/scene.js = this + cast_ep23.js (build_scene.py). Entry points: SAMPLE.init(timeline, W, H, fontUrl), SAMPLE.frame(f) */
(function(){
/*@CAST@*/
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

function wantedTex(){return canvasTex(512,700,(g,w,h)=>{g.fillStyle='#e8d8b0';g.fillRect(0,0,w,h);g.strokeStyle='#6a4a2a';g.lineWidth=10;g.strokeRect(14,14,w-28,h-28);g.fillStyle='#2a1a0e';g.textAlign='center';g.font=`110px ${FONT}`;g.fillText('WANTED',w/2,140);
  g.fillStyle='#f4e8cc';g.fillRect(96,175,320,300);g.strokeStyle='#2a1a0e';g.lineWidth=6;g.strokeRect(96,175,320,300);
  g.fillStyle='#ecd4bc';g.fillRect(166,250,180,170);g.fillStyle='#4a3426';for(let i=0;i<9;i++){g.beginPath();g.moveTo(150+i*24,262);g.lineTo(162+i*24,200+((i*37)%30));g.lineTo(178+i*24,262);g.fill();}g.fillRect(156,236,200,30);
  g.fillStyle='#2a1a0e';g.fillRect(200,320,34,12);g.fillRect(278,320,34,12);g.fillStyle='#5a6a78';g.fillRect(208,334,18,16);g.fillRect(286,334,18,16);g.strokeStyle='#2a1a0e';g.lineWidth=5;g.beginPath();g.moveTo(232,392);g.quadraticCurveTo(262,402,290,384);g.stroke();
  g.fillStyle='rgba(74,52,38,0.35)';for(let i=0;i<60;i++)g.fillRect(180+((i*53)%150),370+((i*29)%45),3,3);
  g.fillStyle='#b8201a';g.font=`72px ${FONT}`;g.fillText('JOB THIEF',w/2,560);g.fillStyle='#2a1a0e';g.font=`40px ${FONT}`;g.fillText('REWARD: 1 JOB',w/2,630);});}
function houseCol(i){return ['#f0b84a','#4a9ae0','#e86a5a','#6ac06a','#b07ae0','#f2d24a'][i%6];}
function buildTown(){const g=new THREE.Group();scene.add(g);
  plane(160,200,SM({color:'#4f9a3a',roughness:1}),0,-0.02,-20,-Math.PI/2,g);plane(10,200,SM({color:'#2a2c34',roughness:0.85}),0,0,-20,-Math.PI/2,g);
  [-1,1].forEach(sd=>plane(3,200,SM({color:'#b8b2a8',roughness:0.9}),sd*6.5,0.03,-20,-Math.PI/2,g));
  for(let z=-8;z>=-60;z-=4)plane(0.3,1.8,SM({color:'#f2e8a0',roughness:0.8}),0,0.04,z,-Math.PI/2,g);
  world.doors=[];let i=0;for(let z=14;z>=-62;z-=15){[-1,1].forEach(sd=>{const hx=sd*15;const c=houseCol(i++);box(11,8,10,SM({color:c,roughness:0.9}),hx,4,z,g);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(8.4,4.4,4),SM({color:'#8a3a2a',roughness:0.9}));roof.position.set(hx,10.2,z);roof.rotation.y=Math.PI/4;roof.scale.set(1,1,0.9);g.add(roof);
    [-2.8,2.8].forEach(dz=>box(0.2,2.2,2.2,SM({color:'#bfe0ff',emissive:0x6a8aa8,emissiveIntensity:0.3}),hx-sd*5.52,5.4,z+dz*1.1,g));
    const piv=new THREE.Group();piv.position.set(hx-sd*5.55,0,z-1.6);g.add(piv);const d=box(0.25,5,3.2,SM({color:'#5a3a24',roughness:0.8}),0,2.5,1.6,piv);box(0.3,0.3,0.3,'#d4af37',-sd*0.15,2.5,2.8,piv);
    box(0.3,5.2,3.6,SM({color:'#1a140e',roughness:1}),hx-sd*5.45,2.6,z,g);piv.userData={sd,z};world.doors.push(piv);});}
  const tw=new THREE.Mesh(new THREE.IcosahedronGeometry(1.1,1),new THREE.MeshStandardMaterial({color:0x8a6a3a,wireframe:true}));scene.add(tw);world.tumble=tw;
  world.poster=plane(3.2,4.4,SM({map:wantedTex(),roughness:0.85,side:THREE.DoubleSide}),9.38,5.6,2.6,0,g);world.poster.rotation.y=-Math.PI/2;world.posterZ=V3(9.38,5.6,2.6);
  world.townL=[pl(0xfff0d0,0.6,120,0,30,0)];world.sun=new THREE.DirectionalLight(0xfff2d8,0.9);world.sun.position.set(30,50,40);scene.add(world.sun);scene.add(world.sun.target);world.sun.castShadow=true;const sc=world.sun.shadow;sc.mapSize.set(4096,4096);sc.camera.left=-46;sc.camera.right=46;sc.camera.top=46;sc.camera.bottom=-46;sc.camera.near=1;sc.camera.far=220;sc.bias=-0.0006;sc.normalBias=0.06;sc.radius=3;sc.camera.updateProjectionMatrix();
  // sky dome: deep blue up top, pale at the horizon, a few clouds
  const sky=new THREE.Mesh(new THREE.SphereGeometry(600,24,16),new THREE.MeshBasicMaterial({map:canvasTex(64,512,(g2,w,h)=>{const gr=g2.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#1f5fd0');gr.addColorStop(0.35,'#4f9af0');gr.addColorStop(0.5,'#cfeaff');gr.addColorStop(1,'#cfeaff');g2.fillStyle=gr;g2.fillRect(0,0,w,h);}),side:THREE.BackSide,fog:false,depthWrite:false}));scene.add(sky);world.sky=sky;
  world.clouds=[];const cr=rng('cl');for(let i=0;i<9;i++){const c=new THREE.Group();for(let k=0;k<4;k++){const b=new THREE.Mesh(new THREE.IcosahedronGeometry(7+cr()*5,1),new THREE.MeshBasicMaterial({color:0xffffff,fog:false}));b.position.set(k*8-12,cr()*3,cr()*4);b.scale.y=0.55;c.add(b);}c.position.set((cr()-0.5)*420,70+cr()*50,-120-cr()*180);scene.add(c);world.clouds.push(c);}
  world.rim=new THREE.DirectionalLight(0xbfd8ff,0.35);world.rim.position.set(-30,25,-40);scene.add(world.rim);}
function doorsClose(k,stag){world.doors.forEach((d,i)=>{const kk=clamp((k-(stag?i*0.05:0))*1.8,0,1);d.rotation.y=d.userData.sd*lerp(1.5,0,easeIn(kk));});}
function buildHall(){const g=new THREE.Group();g.position.x=HX;scene.add(g);
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
  world.hallKey=pl(0xfff4e8,1.0,80,HX,15,8);world.hallKey2=pl(0xfff4e8,0.8,80,HX,15,-20);}
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
/* ---------------- world (extras) */
const HX=-300, BED=1700, HM=900;
const TOBI_SEAT=V3(CAF+20,0,13.4), ZASH_SEAT=V3(CAF+22.6,0,13.4), TABLE=V3(CAF+20.6,3.38,16);
function nameTex(text,style){return canvasTex(512,200,(g,w,h)=>{g.clearRect(0,0,w,h);g.textAlign='center';g.textBaseline='middle';const r=rng('nm'+text+style);
  if(style==='glow'){let fs=120;g.font=`${fs}px ${FONT}`;while(g.measureText(text).width>w-60){fs-=6;g.font=`${fs}px ${FONT}`;}g.shadowColor='#30d8ff';g.shadowBlur=30;g.fillStyle='#30d8ff';g.fillText(text,w/2,h/2+6);g.fillText(text,w/2,h/2+6);g.shadowBlur=0;g.fillStyle='#0b3fae';g.fillText(text,w/2,h/2+6);g.lineWidth=2.5;g.strokeStyle='#bff4ff';g.strokeText(text,w/2,h/2+6);}
  else{const kid=style==='kid',run=style==='run';const fs=kid?112:104,n=text.length,sp=(w-90)/n;g.font=`${fs}px ${FONT}`;
    for(let i=0;i<n;i++){const x=45+sp*(i+0.5)+(r()-0.5)*(kid?16:8),y=h*0.46+(r()-0.5)*(kid?26:12),a=(r()-0.5)*(kid?0.5:0.22);g.save();g.translate(x,y);g.rotate(a);g.scale(1,kid?1.1:1);if(run){g.filter='blur(3px)';g.globalAlpha=0.75;}g.fillStyle='#16161e';g.fillText(text[i],0,0);g.restore();
      if(run){g.fillStyle='rgba(22,22,30,0.8)';for(let k=0;k<3;k++){const dx=x+(r()-0.5)*40,l=30+r()*60;g.beginPath();g.moveTo(dx-5,y+10);g.lineTo(dx+5,y+10);g.lineTo(dx+2,y+10+l);g.arc(dx,y+10+l,4,0,7);g.lineTo(dx-2,y+10+l);g.fill();}}}}});}
function makeArm(skin,sleeve){const g=new THREE.Group();const sk=SM({color:skin,roughness:0.9}),sl=SM({color:sleeve,roughness:0.95});
  box(3.4,1.3,1.5,sk,0.4,0,0,g);box(1.4,1.45,1.6,sk,2.7,0,0,g);box(3.2,1.55,1.75,sl,-2.6,0,0,g);box(0.3,1.6,1.8,SM({color:sleeve,roughness:0.9}),-1.05,0,0,g);
  g.userData.names={};scene.add(g);g.visible=false;return g;}
function armName(arm,key,text,style){const p=new THREE.Mesh(new THREE.PlaneGeometry(2.7,1.05),new THREE.MeshBasicMaterial({map:nameTex(text,style),transparent:true,depthWrite:false}));p.rotation.x=-Math.PI/2;p.position.set(0.35,0.665,0);arm.add(p);arm.userData.names[key]=p;p.visible=false;return p;}
function buildExtras(){
  const SK={me:'#e8b98f',tobi:'#8a5a3a',mia:'#f0c8a0',brick:'#e3b58c',kip:'#d8a878'};
  world.arms={mia:makeArm(SK.mia,'#f4a6c4'),brick:makeArm(SK.brick,'#1a1a1e'),kip:makeArm(SK.kip,'#4a7ae0'),me:makeArm(SK.me,'#d9a23a'),tobi:makeArm(SK.tobi,'#3a8a4a')};
  armName(world.arms.mia,'n','NOVA','glow');armName(world.arms.brick,'n','REX','glow');armName(world.arms.kip,'n','BENNY','glow');
  armName(world.arms.tobi,'marker','ZASH','marker');armName(world.arms.tobi,'run','ZASH','run');armName(world.arms.tobi,'kid','ZASH','kid');armName(world.arms.me,'tobi','TOBI','kid');
  // a skin-coloured cover that slides off to "write" a name stroke by stroke
  world.cover={};['tobi','me'].forEach(k=>{const c=new THREE.Mesh(new THREE.PlaneGeometry(2.8,1.15),new THREE.MeshBasicMaterial({color:SK[k]}));c.rotation.x=-Math.PI/2;c.position.set(0.35,0.67,0);world.arms[k].add(c);c.visible=false;world.cover[k]=c;});
  const mk=new THREE.Group();const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,2.2,12),SM({color:'#1a1a22',roughness:0.4}));mk.add(body);const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.21,0.21,0.5,12),SM({color:'#e02a2a',roughness:0.4}));cap.position.y=0.9;mk.add(cap);const tip=new THREE.Mesh(new THREE.ConeGeometry(0.14,0.4,10),SM({color:'#16161e'}));tip.rotation.x=Math.PI;tip.position.y=-1.3;mk.add(tip);scene.add(mk);mk.visible=false;world.marker=mk;
  world.spark=sprite(glowTex('rgba(80,220,255,0.8)'),5,scene,0.7);world.spark.visible=false;
  // bedroom (flashback)
  const bg=new THREE.Group();bg.position.set(BED,0,0);scene.add(bg);plane(30,30,SM({map:canvasTex(256,256,(g,w,h)=>{fabricFill(g,0,0,w,h,'#b8834a','canvas');g.strokeStyle='rgba(0,0,0,0.2)';g.lineWidth=3;for(let y=0;y<h;y+=42){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}}),roughness:0.8}),0,0,2,-Math.PI/2,bg);
  const wm=SM({map:wallTex('#f2d8a0','#e08a4a'),roughness:0.95});box(30,16,0.4,wm,0,8,-7,bg);const sw=box(0.4,16,30,wm,-9,8,2,bg);
  box(5.4,5,0.25,SM({color:'#fff2c0',emissive:0xffe090,emissiveIntensity:1.1}),3,8.5,-6.75,bg);box(5.8,0.3,0.4,'#f4f0e4',3,6,-6.7,bg);box(0.3,5.2,0.4,'#f4f0e4',3,8.5,-6.7,bg);
  box(7,1.6,11,SM({color:'#6a4a34',roughness:0.8}),-4.6,0.8,-0.5,bg);box(6.6,0.9,10.6,SM({color:'#4a8ae0',roughness:0.95}),-4.6,2.05,-0.5,bg);box(5,0.8,2,SM({color:'#f4f0e8',roughness:0.9}),-4.6,2.7,-4.6,bg);
  const rug=new THREE.Mesh(new THREE.CircleGeometry(4.2,28),SM({color:'#e86a5a',roughness:1}));rug.rotation.x=-Math.PI/2;rug.position.set(3,0.02,3);bg.add(rug);
  [['#e02a2a',5.5,1.5],['#f0c020',6.4,2.2],['#3a8ae0',5.2,2.8],['#3ab06a',6.1,3.4]].forEach(([c,x,z],i)=>box(0.9,0.9,0.9,SM({color:c,roughness:0.7}),x,0.45+(i===1?0.9:0),z,bg));
  box(0.2,3,2.4,SM({color:'#f4f0e4'}),-8.7,9,2,bg);world.bedL=[pl(0xffd898,1.2,40,BED+2,9,4),pl(0xfff0c0,0.8,30,BED+4,8,-4)];}

const PROPS=['p100','p0a','p0b','p0c','p0d','door','bk0','bk1','bk2','sign','ladder','stone','pencil','eraser','shoe','cane','plate','cookie','bike','slipL','slipR','shoebox','basket','blanket','phone3'];
function buildHome(){const g=new THREE.Group();g.position.set(HM,0,0);scene.add(g);
  plane(34,34,SM({map:canvasTex(256,256,(q,w,h)=>{fabricFill(q,0,0,w,h,'#a8743e','canvas');q.strokeStyle='rgba(0,0,0,0.22)';q.lineWidth=3;for(let y=0;y<h;y+=42){q.beginPath();q.moveTo(0,y);q.lineTo(w,y);q.stroke();}}),roughness:0.75}),0,0,4,-Math.PI/2,g);
  const wm=SM({map:wallTex('#f0dcae','#c8703a'),roughness:0.95});box(34,16,0.4,wm,0,8,-8,g);box(0.4,16,34,wm,-12,8,4,g);box(0.4,16,34,wm,12,8,4,g);
  // window (evening light) + curtains
  box(6,5,0.25,SM({color:'#ffd9a0',emissive:0xffb060,emissiveIntensity:1.0}),-5,9,-7.75,g);box(6.4,0.3,0.4,'#f4f0e4',-5,6.4,-7.7,g);box(0.3,5.2,0.4,'#f4f0e4',-5,9,-7.7,g);[-1,1].forEach(sd=>box(1.3,5.8,0.3,SM({color:'#c8503a',roughness:1}),-5+sd*3.6,9,-7.6,g));
  // kitchen counter, stove, fridge, shelf
  box(11,3.2,2.4,SM({color:'#7a5230',roughness:0.7}),4.5,1.6,-6.6,g);box(11.3,0.25,2.7,SM({color:'#e8e2d4',roughness:0.5}),4.5,3.3,-6.6,g);box(3.4,7.6,2.6,SM({color:'#dfe6ea',roughness:0.4,metalness:0.3}),10,3.8,-6.4,g);box(0.15,2.4,0.2,'#8a9098',8.6,4.6,-5.05,g);
  [['#d04a3a',2.2],['#3a8ad0',3.4],['#f0c040',4.6]].forEach(([c,x])=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.36,0.7,14),SM({color:c,roughness:0.5}));p.position.set(x,3.8,-6.6);g.add(cst(p));});
  box(7,0.25,1,SM({color:'#7a5230',roughness:0.7}),4,8.6,-7.4,g);[['#e86a5a',2],['#6ac06a',3.2],['#f4f0e0',4.4],['#b07ae0',5.6]].forEach(([c,x])=>box(0.7,0.9,0.7,SM({color:c,roughness:0.7}),x,9.2,-7.4,g));
  // family photos
  [[-10.5,8.5,'#f0b84a'],[-8.8,10.2,'#6ac0e0'],[-8.6,7.6,'#e88a9a']].forEach(([x,y,c])=>{box(1.5,1.8,0.12,'#5a3a24',x,y,-7.7,g);box(1.2,1.5,0.14,SM({color:c,roughness:0.8}),x,y,-7.68,g);});
  // dining table + chairs + hanging lamp
  const tm=SM({color:'#8a5a34',roughness:0.6});box(7.4,0.35,3.4,tm,0,2.5,3,g);[[-3.3,1.6],[3.3,1.6],[-3.3,4.4],[3.3,4.4]].forEach(([x,z])=>box(0.35,2.35,0.35,tm,x,1.17,z,g));
  [-1.7,1.7].forEach(x=>{box(2,0.3,1.6,SM({color:'#6a4426',roughness:0.7}),x,1.8,0.3,g);box(2,3.4,0.25,SM({color:'#6a4426',roughness:0.7}),x,3.5,-0.55,g);});
  box(0.08,5,0.08,'#22242c',0,13.5,3,g);const sh=new THREE.Mesh(new THREE.ConeGeometry(1.5,1.3,16,1,true),SM({color:'#e8a040',emissive:0xffa040,emissiveIntensity:0.6,side:THREE.DoubleSide}));sh.position.set(0,10.6,3);g.add(sh);
  const rug=new THREE.Mesh(new THREE.CircleGeometry(6.4,32),SM({color:'#b84a3a',roughness:1}));rug.rotation.x=-Math.PI/2;rug.position.set(0,0.02,3.2);rug.receiveShadow=true;g.add(rug);
  box(3.2,7,0.3,SM({color:'#5a3a24',roughness:0.8}),-11.7,3.5,8,g).rotation.y=Math.PI/2;
  world.homeL=[pl(0xffd8a0,1.25,55,HM,10,7),pl(0xfff0d0,0.7,40,HM-6,8,-3)];
  // props
  world.cane=box(0.16,3.5,0.16,SM({color:'#b07a40',roughness:0.6}),0,0,0);const ch=box(0.16,0.16,0.7,SM({color:'#b07a40',roughness:0.6}),0,1.75,0.25,world.cane);
  const pg=new THREE.Group();const pt=new THREE.Mesh(new THREE.CylinderGeometry(1.0,0.8,0.14,28),SM({color:'#f6f4ee',roughness:0.4}));pg.add(cst(pt));const ro=new THREE.Mesh(new THREE.CylinderGeometry(0.72,0.72,0.07,24),SM({map:canvasTex(128,128,(q,w,h)=>{q.fillStyle='#e0b070';q.fillRect(0,0,w,h);const r=rng('roti');for(let i=0;i<26;i++){q.fillStyle=`rgba(120,70,30,${0.25+r()*0.4})`;q.beginPath();q.arc(r()*w,r()*h,3+r()*7,0,7);q.fill();}}),roughness:0.9}));ro.position.y=0.11;pg.add(cst(ro));scene.add(pg);world.plate=pg;
  const ck=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.34,0.1,16),SM({color:'#b87a3a',roughness:0.9}));ck.rotation.x=Math.PI/2;scene.add(ck);world.cookie=ck;
  const bk=new THREE.Group();const red=SM({color:'#e02a2a',roughness:0.45}),blk=SM({color:'#18181c',roughness:0.8});[-1.15,1.15].forEach(z=>{const w=new THREE.Mesh(new THREE.TorusGeometry(0.85,0.13,10,28),blk);w.rotation.y=Math.PI/2;w.position.set(0,0.98,z);bk.add(cst(w));});
  box(0.16,0.16,2.3,red,0,1.5,0,bk).rotation.x=0.25;box(0.16,1.5,0.16,red,0,1.75,-0.55,bk);box(0.16,1.7,0.16,red,0,1.9,0.95,bk).rotation.x=-0.3;box(1.5,0.14,0.14,blk,0,2.7,0.75,bk);box(0.5,0.16,0.9,blk,0,2.55,-0.6,bk);
  const bow=box(0.9,0.5,0.2,SM({color:'#ffd23f',roughness:0.5}),0,3.0,0.8,bk);box(0.25,0.3,0.26,SM({color:'#f0a020'}),0,3.0,0.8,bk);scene.add(bk);world.bike=bk;
  const slip=()=>{const q=new THREE.Group();box(0.72,0.2,1.25,SM({color:'#e88aa8',roughness:1}),0,0.1,0,q);box(0.74,0.22,0.3,SM({color:'#3a2a26',roughness:1}),0.05,0.11,0.25,q).rotation.y=0.5;box(0.3,0.1,0.3,SM({color:'#f0c8a0'}),-0.1,0.2,0.5,q);scene.add(q);return q;};world.slipL=slip();world.slipR=slip();
  const sb=new THREE.Group();box(2.1,0.9,1.3,SM({color:'#3a7ae0',roughness:0.7}),0,0,0,sb);box(2.2,0.22,1.4,SM({color:'#f4f4f4',roughness:0.7}),0,0.5,0,sb);box(0.3,1.3,1.42,SM({color:'#ffd23f'}),0,0.05,0,sb);scene.add(sb);world.shoebox=sb;
  const ba=new THREE.Group();box(2.6,1.3,1.8,SM({color:'#c8a060',roughness:0.9}),0,0,0,ba);[['#f4f4f4',-0.6,0.9],['#5ab0e0',0.5,1.0],['#e86a5a',0,1.5],['#f0c040',-0.3,2.0],['#7ad86a',0.4,2.5]].forEach(([c,x,y])=>box(1.9,0.55,1.5,SM({color:c,roughness:1}),x*0.5,y,0,ba));scene.add(ba);world.basket=ba;
  world.blanket=box(3.6,0.5,4.6,SM({color:'#fff0b8',roughness:1}),0,0,0);
  const ph=new THREE.Group();box(0.62,1.15,0.09,SM({color:'#14141a',roughness:0.3}),0,0,0,ph);box(0.52,1.0,0.02,SM({color:'#9fd8ff',emissive:0x6ab8ff,emissiveIntensity:1.2}),0,0,0.055,ph);scene.add(ph);world.phone3=ph;}
function decorateTown(){const g=new THREE.Group();scene.add(g);const r=rng('deco');
  const leaf=[SM({color:'#3f9a3a',roughness:0.95}),SM({color:'#58b84a',roughness:0.95}),SM({color:'#2f7f34',roughness:0.95})];
  const tree=(x,z,s)=>{box(0.8*s,5*s,0.8*s,'#6a4a2e',x,2.5*s,z,g);[[0,7.2,0,3.4],[1.4,6.2,0.6,2.4],[-1.3,6.4,-0.5,2.6],[0.2,9.2,0.2,2.3]].forEach(([dx,dy,dz,rr],i)=>{const m=cst(new THREE.Mesh(new THREE.IcosahedronGeometry(rr*s,1),leaf[i%3]));m.position.set(x+dx*s,dy*s,z+dz*s);g.add(m);});};
  for(let z=21.5;z>=-70;z-=15){tree(-9.6,z,0.9+r()*0.25);tree(9.6,z,0.9+r()*0.25);}
  // hedges + flower boxes + chimneys on every house
  const fl=['#ff5a7a','#ffd23f','#ffffff','#b07aff'];for(let z=14;z>=-62;z-=15)[-1,1].forEach(sd=>{const fx=sd*9.25;box(0.9,1.3,3.2,SM({color:'#3a8a3a',roughness:1}),fx,0.65,z+3.4,g);box(0.9,1.3,3.2,SM({color:'#3a8a3a',roughness:1}),fx,0.65,z-4.6,g);
    [-3.1,3.1].forEach(dz=>{box(0.5,0.45,2.5,'#7a4a2a',sd*9.2,4.0,z+dz,g);for(let k=0;k<4;k++){const b=new THREE.Mesh(new THREE.SphereGeometry(0.28,8,6),SM({color:fl[(k+Math.floor(r()*4))%4],roughness:0.8}));b.position.set(sd*9.15,4.45,z+dz-0.9+k*0.6);g.add(b);}});
    box(1.4,3,1.4,'#a85a44',sd*17,11.6,z-2,g);box(0.9,0.6,0.5,SM({color:'#3a6ae0',roughness:0.6}),sd*8.4,2.6,z+1.2,g);box(0.2,2.4,0.2,'#5a5a62',sd*8.4,1.2,z+1.2,g);});
  // street lamps (warm) + glow
  world.lamps=[];world.lampL=[];for(let z=9;z>=-60;z-=15)[-1,1].forEach((sd,i)=>{const x=sd*5.5;box(0.3,9.5,0.3,'#22242c',x,4.75,z,g);box(1.6,0.25,0.3,'#22242c',x-sd*0.7,9.5,z,g);const lm=box(0.9,0.6,0.9,SM({color:'#fff0c0',emissive:0xffc870,emissiveIntensity:0.2}),x-sd*1.4,9.2,z,g);lm.castShadow=false;const gl=sprite(glowTex('rgba(255,200,110,0.8)'),5,g,0);gl.position.set(x-sd*1.4,9.1,z);world.lamps.push([lm,gl]);if(z>-25)world.lampL.push(pl(0xffc070,0,30,x-sd*1.4,8.6,z));});
  // string lights across the street
  world.bulbs=[];const bc=['#ff5a5a','#ffd23f','#5aff8a','#5ab0ff','#ff7ad0'];for(let z=3;z>=-45;z-=12){const pts=[];for(let i=0;i<=14;i++){const u=i/14,x=-9.3+u*18.6,y=10.4-Math.sin(u*Math.PI)*1.7;pts.push(V3(x,y,z));if(i>0&&i<14){const c=bc[i%5];const b=new THREE.Mesh(new THREE.SphereGeometry(0.26,8,6),SM({color:c,emissive:c,emissiveIntensity:0.5}));b.position.set(x,y-0.3,z);g.add(b);world.bulbs.push(b);}}g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x222222})));}
  // far hills + mountains
  [[-70,-150,60,'#4fa04a'],[30,-170,75,'#3f9040'],[110,-150,55,'#58aa50'],[-140,-130,50,'#4a9a46']].forEach(([x,z,s,c])=>{const m=new THREE.Mesh(new THREE.SphereGeometry(s,20,12),SM({color:c,roughness:1}));m.position.set(x,-s*0.45,z);m.scale.y=0.7;g.add(m);});
  [[-40,-260,70],[60,-280,90],[150,-250,60]].forEach(([x,z,s])=>{const m=new THREE.Mesh(new THREE.ConeGeometry(s,s*1.1,6),SM({color:'#6a86b8',roughness:1}));m.position.set(x,s*0.5-6,z);g.add(m);const c=new THREE.Mesh(new THREE.ConeGeometry(s*0.34,s*0.38,6),SM({color:'#f4f8ff',roughness:1}));c.position.set(x,s*0.86-6,z);g.add(c);});
  // puddles
  world.puddles=[];[[1.5,6],[-2,-2],[2.5,-11],[-1,12]].forEach(([x,z])=>{const p=new THREE.Mesh(new THREE.CircleGeometry(1.6,24),SM({color:'#1a2030',roughness:0.05,metalness:0.8}));p.rotation.x=-Math.PI/2;p.position.set(x,0.03,z);p.scale.set(1.4,1,1);g.add(p);p.visible=false;world.puddles.push(p);});}
function decorateSchool(){const g=new THREE.Group();g.position.x=HX;scene.add(g);const poster=(txt,c1,c2)=>canvasTex(256,320,(q,w,h)=>{q.fillStyle=c1;q.fillRect(0,0,w,h);q.fillStyle=c2;q.beginPath();q.arc(w/2,h*0.38,70,0,7);q.fill();q.fillStyle='#fff';q.font=`44px ${FONT}`;q.textAlign='center';txt.split('|').forEach((s,i)=>q.fillText(s,w/2,h*0.72+i*46));});
  [['SCHOOL|DANCE','#e04a7a','#ffd23f',-1,8],['GO|TEAM!','#3a7ae0','#ffffff',1,2],['SCIENCE|FAIR','#3ab06a','#fff2a0',-1,-6],['BE|KIND','#f0a030','#ffffff',1,-14],['ART|CLUB','#8a5ae0','#ff9ad0',-1,-22]].forEach(([t,a,b,sd,z])=>{const p=plane(3,3.75,SM({map:poster(t,a,b),roughness:0.8,side:THREE.DoubleSide}),sd*7.95,12.6,z,0,g);p.rotation.y=-sd*Math.PI/2;});
  for(let z=-44;z<=30;z+=14.8){const sh=new THREE.Mesh(new THREE.PlaneGeometry(5,1.2),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.10,depthWrite:false}));sh.rotation.x=-Math.PI/2;sh.position.set(0,0.03,z);g.add(sh);}
  const ck=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,0.2,24),SM({color:'#f4f4f4'}));ck.rotation.z=Math.PI/2;ck.position.set(-7.9,14.6,14);g.add(ck);
  box(4.5,6,1.2,SM({color:'#7a5230',roughness:0.6}),7.0,3,22,g);box(4.1,5.4,0.2,new THREE.MeshStandardMaterial({color:0xbfe4ff,transparent:true,opacity:0.3}),6.4,3.1,22,g);[['#ffd23f',2.2],['#c8ccd2',3.6],['#d88a4a',4.9]].forEach(([c,y])=>box(0.7,0.9,0.7,SM({color:c,metalness:0.7,roughness:0.3}),6.9,y,22,g));
  // cafeteria extras
  const c=new THREE.Group();c.position.x=CAF;scene.add(c);const menu=plane(9,4.5,SM({map:canvasTex(512,256,(q,w,h)=>{q.fillStyle='#1e2a24';q.fillRect(0,0,w,h);q.strokeStyle='#c8a060';q.lineWidth=8;q.strokeRect(6,6,w-12,h-12);q.fillStyle='#f4ead8';q.font=`50px ${FONT}`;q.textAlign='center';q.fillText("TODAY'S LUNCH",w/2,70);q.font=`34px ${FONT}`;['PIZZA','MYSTERY STEW','JUICE'].forEach((s,i)=>q.fillText(s,w/2,130+i*42));}),roughness:0.8}),20,11,29.6,0,c);menu.rotation.y=Math.PI;
  [[-24,'#e04a7a'],[-10,'#3a7ae0'],[4,'#f0a030']].forEach(([x,col])=>{const p=plane(4,5,SM({map:poster('EAT|WELL',col,'#ffffff'),roughness:0.8}),x,11,29.6,0,c);p.rotation.y=Math.PI;});}
function noCeilingShadows(){const b=new THREE.Box3();scene.traverse(o=>{if(o.isMesh&&o.geometry){b.setFromObject(o);const cx=(b.min.x+b.max.x)/2;const indoor=Math.abs(cx-HX)<30||Math.abs(cx-CAF)<45||Math.abs(cx-BED)<30||Math.abs(cx-HM)<30;if(indoor&&(b.max.y>11.5||(b.max.y-b.min.y)>10))o.castShadow=false;}});}
function buildEp24(){
  const sg=new THREE.Group();box(6.4,1.0,0.3,SM({color:'#2a6a4a',roughness:0.8}),0,0,0,sg);const lb=plane(6,0.9,new THREE.MeshBasicMaterial({map:labelTex('CLASS 9-B','#000'),transparent:true}),0,0,0.17,0,sg);[-2.6,2.6].forEach(x=>box(0.12,12,0.12,'#888a90',x,6.4,0,sg));scene.add(sg);world.sign=sg;
  const ld=new THREE.Group();const wood=SM({color:'#c89a5a',roughness:0.85});[-0.6,0.6].forEach(x=>box(0.16,2.7,0.16,wood,x,1.35,0.5,ld));[-0.6,0.6].forEach(x=>{const r=box(0.16,2.9,0.16,wood,x,1.35,-0.55,ld);r.rotation.x=-0.35;});for(let y=0.6;y<2.6;y+=0.6)box(1.2,0.12,0.3,wood,0,y,0.5,ld);box(1.6,0.16,1.2,SM({color:'#e0b070',roughness:0.8}),0,2.7,0.2,ld);scene.add(ld);world.ladder=ld;
  const stn=new THREE.Mesh(new THREE.IcosahedronGeometry(0.45,0),SM({map:stoneTex(),emissive:0x9a4aff,emissiveIntensity:0.9,roughness:0.5,flatShading:true}));scene.add(stn);world.stone=stn;
  const pc=new THREE.Group();const pb=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.13,2.6,6),SM({color:'#f2c21a',roughness:0.6}));pb.rotation.z=Math.PI/2;pc.add(pb);const pt=new THREE.Mesh(new THREE.ConeGeometry(0.13,0.4,6),SM({color:'#e8c9a0',roughness:0.8}));pt.rotation.z=-Math.PI/2;pt.position.x=1.5;pc.add(pt);const pe=new THREE.Mesh(new THREE.CylinderGeometry(0.135,0.135,0.3,10),SM({color:'#f08aa0',roughness:0.8}));pe.rotation.z=Math.PI/2;pe.position.x=-1.45;pc.add(pe);pc.traverse(o=>{if(o.isMesh)cst(o);});scene.add(pc);world.pencil=pc;
  const er=new THREE.Group();box(0.95,0.36,0.5,SM({color:'#f4a0b8',roughness:0.9}),0,0.18,0,er);box(0.5,0.37,0.51,SM({color:'#3a7ae0',roughness:0.8}),0.24,0.18,0,er);scene.add(er);world.eraser=er;
  const sh=new THREE.Group();const tr=canvasTex(128,256,(g,w,h)=>{g.fillStyle='#1c1c22';g.fillRect(0,0,w,h);g.fillStyle='#3a3a44';for(let y=10;y<h;y+=26)g.fillRect(12,y,w-24,12);});box(1.7,0.3,3.6,SM({map:tr,roughness:0.9}),0,0,0,sh);box(1.6,0.9,3.4,SM({color:'#e02a3a',roughness:0.8}),0,0.6,0,sh);box(1.2,5,1.3,SM({color:'#2a4a8a',roughness:0.9}),0,3.4,-0.8,sh);scene.add(sh);world.shoe=sh;}
function buildEp25(){
  const paper=(txt,col)=>{const g=new THREE.Group();const t=canvasTex(256,340,(q,w,h)=>{q.fillStyle='#fbfaf2';q.fillRect(0,0,w,h);q.strokeStyle='#c8c4b4';q.lineWidth=3;for(let y=150;y<h-20;y+=30){q.beginPath();q.moveTo(24,y);q.lineTo(w-24,y);q.stroke();}q.font=`120px ${FONT}`;q.textAlign='center';q.textBaseline='middle';q.fillStyle=col;q.fillText(txt,w/2,80);q.strokeStyle=col;q.lineWidth=8;q.beginPath();q.ellipse(w/2,80,112,62,-0.1,0,Math.PI*2);q.stroke();});
    const m=new THREE.Mesh(new THREE.PlaneGeometry(1.5,2.0),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));g.add(m);scene.add(g);return g;};
  world.p100=paper('100','#1f9a3a');['a','b','c','d'].forEach(k=>world['p0'+k]=paper('0','#e0242a'));
  const d=new THREE.Group();box(4.6,9.4,0.5,SM({color:'#8a5a34',roughness:0.8}),0,4.7,0,d);box(3.6,8.6,0.3,SM({color:'#c8894a',roughness:0.75}),0,4.3,0.2,d);box(0.3,0.9,0.3,SM({color:'#d8d8de',metalness:0.6,roughness:0.3}),1.3,4.2,0.5,d);
  const lb=new THREE.Mesh(new THREE.PlaneGeometry(2.4,0.9),new THREE.MeshBasicMaterial({map:canvasTex(256,96,(q,w,h)=>{q.fillStyle='#fff';q.fillRect(0,0,w,h);q.strokeStyle='#d01a1a';q.lineWidth=8;q.strokeRect(4,4,w-8,h-8);q.font=`70px ${FONT}`;q.textAlign='center';q.textBaseline='middle';q.fillStyle='#d01a1a';q.fillText('PULL',w/2,h/2+4);})}));lb.position.set(0,7.3,0.37);d.add(lb);scene.add(d);world.door=d;
  ['#e0242a','#2a6ae0','#2aa04a'].forEach((c,i)=>{const b=new THREE.Group();box(1.1,1.5,0.32,SM({color:c,roughness:0.7}),0,0,0,b);box(1.0,1.4,0.26,SM({color:'#f4f0e4',roughness:0.9}),0.07,0,0,b);scene.add(b);world['bk'+i]=b;});}
function buildWorld(){
  scene=new THREE.Scene();scene.background=new THREE.Color('#9ac8f0');scene.fog=new THREE.Fog(0x9ac8f0,150,460);
  world.hemi=new THREE.HemisphereLight(0xfff4e6,0x40362c,0.8);scene.add(world.hemi);world.look=V3(0,0,0);world.sunOff=V3(46,48,14);
  buildTray();buildTown();decorateTown();buildHall();buildCaf();decorateSchool();buildExtras();buildHome();buildEp24();buildEp25();world.poster.visible=false;world.tumble.visible=false;scene.updateMatrixWorld(true);noCeilingShadows();
  world.hallL=[world.hallKey,world.hallKey2];world.cafL=[world.cafKey,world.cafKey2];}
function hideAll(){Object.values(world.arms).forEach(a=>{a.visible=false;a.rotation.set(0,0,0);Object.values(a.userData.names).forEach(n=>{n.visible=false;n.material.opacity=1;n.rotation.z=0;});});Object.values(world.cover).forEach(c=>{c.visible=false;c.position.x=0.35;c.scale.x=1;});
  world.marker.visible=false;world.spark.visible=false;world.tray.visible=false;PROPS.forEach(k=>world[k].visible=false);world.notes.visible=false;world.doors.forEach(d=>d.rotation.y=0);}

function buildTray(){const tr=new THREE.Group();box(2.2,0.14,1.5,SM({color:'#e86a4a',roughness:0.7}),0,0,0,tr);box(0.8,0.4,0.8,SM({color:'#f4f0e0',roughness:0.8}),-0.5,0.25,0,tr);box(0.5,0.6,0.5,SM({color:'#5ab0e0',roughness:0.6}),0.6,0.35,0.2,tr);scene.add(tr);tr.visible=false;world.tray=tr;}

/* ---------------- characters */
const dm=(a,b)=>{const o=JSON.parse(JSON.stringify(a));for(const k in b){o[k]=(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])&&o[k]&&typeof o[k]==='object')?dm(o[k],b[k]):b[k];}return o;};
const CASTC={dad:'dad',me:'leo',mia:'mia',nova:'nova',brick:'brick',rex:'rex',dex:'dex',tobi:'tobi',kip:'kip',penny:'penny',somi:'somi',wren:'wren',val:'val'};
function buildChars(){const add=(id,c)=>{const g=buildChar(c);scene.add(g);g.visible=false;chars[id]=g;};
  Object.entries(CASTC).forEach(([id,cid])=>add(id,BH.castById(cid)));
  Object.values(chars).forEach(c=>c.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}}));
  Object.values(chars).forEach(c=>c.traverse(o=>{if(o.isMesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m&&m.isMeshStandardMaterial&&m.metalness<0.3&&m.roughness<0.9)m.roughness=0.92;});}));}
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



const MOOD={hall:['#dfe8f0',0xfff4e6,0.42,0.6,[10,50,30]],clear:['#bfe2ff',0xbcd8ff,0.42,1.3,[46,48,14]],bed:['#f6d8a8',0xffe8c8,0.6,0.9,[20,40,30]],home:['#f2d2a0',0xffe4c0,0.58,0.75,[18,40,30]],night:['#101838',0x6a84d0,0.42,0.3,[-14,40,24]]};
function mood(m){world.mood=m;const M=MOOD[m];const town=m==='clear';
  [['townL',town],['hallL',m==='hall'],['cafL',false],['bedL',m==='bed'||m==='night'],['lampL',false],['homeL',m==='home']].forEach(([k,on])=>world[k].forEach(L=>{if(L.userData.i0==null)L.userData.i0=L.intensity||1.3;L.intensity=on?L.userData.i0*(m==='night'?0.3:1):0;}));
  scene.background.set(M[0]);world.hemi.color.setHex(M[1]);world.hemi.intensity=M[2];world.hemi.groundColor.setHex(m==='night'?0x1a2040:0x8a7a5a);world.sun.intensity=M[3];world.sun.color.setHex(m==='night'?0x8aa4ff:(m==='bed'||m==='home')?0xffd8a0:0xfff0d0);world.sunOff.set(M[4][0],M[4][1],M[4][2]);
  world.rim.intensity=town?0.35:0.15;world.sky.visible=town;world.clouds.forEach(c=>c.visible=town);scene.fog.color.set(M[0]);scene.fog.near=150;scene.fog.far=460;
  world.lamps.forEach(([lm,gl])=>{lm.material.emissiveIntensity=0.2;gl.material.opacity=0;});world.bulbs.forEach(b=>b.material.emissiveIntensity=0.5);world.puddles.forEach(p=>p.visible=false);}
const hitsOf=id=>TL.segs.find(s=>s.id===id).words.map(w=>w.s);
function hitState(id,t){const hs=hitsOf(id).filter(h=>h<=t);return {n:hs.length,f:hs.length?clamp((t-hs[hs.length-1])/0.16,0,1):1,tot:hitsOf(id).length};}
function armAt(k,p,ry,names,tilt){const a=world.arms[k];a.visible=true;a.position.copy(p);a.rotation.set(tilt||0,ry||0,0);(names||[]).forEach(n=>{const q=a.userData.names[n];q.visible=true;q.rotation.z=Math.abs(ry||0)>1.5?Math.PI:0;});return a;}
function macro(p,u,d,h){const k=eio(u);const m=1.55;camAt(p.clone().add(V3(0.25,((h||6.2)-k*0.5)*m,((d||5.2)-k*0.6)*m)),p.clone().add(V3(0,0,0.1)),46);S.focus={x:0.5,y:0.5,r:0.62};}
const TILT=1.0;
function macroF(p,u,d){const k=eio(u);camAt(p.clone().add(V3(0.2,1.7-k*0.3,(d||9.5)-k*0.9)),p.clone().add(V3(0,0.1,0)),40);S.focus={x:0.5,y:0.5,r:0.5};}
// write a name stroke by stroke: the cover slides off as the hits land
function writing(k,hs,p){const c=world.cover[k];const frac=clamp((hs.n-1+easeOut(hs.f))/hs.tot,0,1);c.visible=frac<0.999;c.scale.x=1-frac;c.position.x=0.35+2.8*frac/2;
  const m=world.marker;m.visible=true;const a=world.arms[k];const lx=0.35-1.4+2.8*frac;const wob=hs.f<1?Math.sin(hs.f*Math.PI)*0.35:0;m.position.copy(a.localToWorld(V3(lx,1.75+wob*0.3,0.2-wob)));m.rotation.set(0.35+a.rotation.x,0,-0.4+wob);}
const SEG=id=>TL.segs.find(s=>s.id===id);
const ZS=V3(HM-1.3,0,0.3), MS=V3(HM+1.3,0,0.3);        // dining seats (both face the camera, table in front)
// instant ageing: show `a` before tS and `b` after, with a poof + "+N YEARS" pop at the head
function age(a,b,tS,t){return t<tS?a:b;}
function ageFx(id,tS,t,text){const d=t-tS;if(d<-0.02||d>1.1)return;const p=proj(head(id));if(d<0.55)S.poof={x:p.x,y:p.y,k:clamp(d/0.55,0,1)};if(d<0.09)S.flash=0.55*(1-d/0.09);S.zoomPunch=Math.max(S.zoomPunch||0,clamp(1-d/0.3,0,1));if(text)S.years={x:p.x,y:p.y-H*0.09,k:clamp(d/1.1,0,1),text};}
function hunch(P,k){P.torso.rotation.x=0.3*k;P.head.rotation.x=-0.2*k;P._noIdle=true;}
function caneIn(id){world.cane.visible=true;world.cane.position.copy(handOf(id,'armR')).add(V3(0,-1.35,0.25));world.cane.rotation.set(0,0,0);}
function momOld(v,x,z,ry,e,t){const P=st(v,x,0,z,ry,e);hunch(P,1);P.armR.rotation.set(-0.55,0,-0.1);P.torso.rotation.z=0.02*Math.sin(t*3);return P;}
function seated(id,p,e,ry){const P=st(id,p.x,0,p.z,ry||0,e);sit(P);return P;}
function plateAt(x,z){world.plate.visible=true;world.plate.position.set(x,2.76,z);}

const up=(P,arm)=>{P[arm||'armR'].rotation.set(0,0,(arm==='armL'?-1:1)*2.75);};
function holdUp(prop,id,arm){const P=chars[id].userData.P;up(P,arm);const p=world[prop];p.visible=true;p.position.copy(handOf(id,arm||'armR')).add(V3(0,0.95,0.1));p.rotation.set(0,chars[id].rotation.y,0.06*Math.sin(P._ph||0));}
function holdFront(prop,id){const P=chars[id].userData.P;P.armR.rotation.set(-1.5,0,-0.15);const p=world[prop];p.visible=true;p.position.copy(handOf(id,'armR')).add(V3(0.5,-0.35,0.35));p.rotation.set(0,chars[id].rotation.y,-0.1);}
const SH={
  hall_fail:(u,t,lt)=>{mood('hall');const zz=lerp(0,2.2,u);[['tobi',-2.4,'p0a'],['penny',0,'p0b'],['kip',2.4,'p0c']].forEach(([id,x,pp],i)=>{const P=st(id,HX+x,0.25*Math.abs(Math.sin(t*7+i)),1+zz+(i===1?1:0),0,'happy');P._noIdle=true;holdUp(pp,id,i===2?'armL':'armR');P[i===2?'armR':'armL'].rotation.set(0,0,(i===2?1:-1)*(2.4+0.3*Math.sin(t*9)));});
    dolly(V3(HX+0.3,5.6,18.5),V3(HX+0.2,5.6,17),V3(HX,5.0,1.5),V3(HX,5.1,1.5),u,44,42);showOnly(['tobi','penny','kip']);S.shakeA=lt<0.35?0.12*(1-lt/0.35):0;S.zoomPunch=clamp(1-lt/0.3,0,1);S.sparkle={x:W*0.5,y:H*0.25,n:14,r:0.35};},
  zash_100:(u,t,lt)=>{mood('hall');const Z=st('me',HX,0,2.5,0,'sad');Z._talk='zash';holdUp('p100','me');[['dex',-2.3],['somi',2.3]].forEach(([id,x],i)=>{const P=st(id,HX+x,0,0.6,i?-0.4:0.4,'shocked');P[i?'armL':'armR'].rotation.set(-1.5,0,i?0.5:-0.5);});
    dolly(V3(HX+0.9,6.2,18.5),V3(HX+0.8,6.2,17),V3(HX+0.5,5.6,2.2),V3(HX+0.5,5.7,2.2),u,42,40);showOnly(['me','dex','somi']);},
  bullies_point:(u,t,lt)=>{mood('hall');const ids=['brick','rex','dex'];ids.forEach((id,i)=>{const P=st(id,HX+(i-1)*2.3,0,3+Math.abs(i-1)*0.9,(1-i)*0.2,'happy');laugh(P,t,i);point(P,i===2?'armL':'armR');P._talk=0;});
    dolly(V3(HX+0.3,5.4,16),V3(HX+0.2,5.2,14.6),V3(HX,4.3,3.2),V3(HX,4.4,3.2),u,44,42);showOnly(ids);},
  dad_paper:(u,t,lt)=>{mood('home');const D=st('dad',HM+0.9,0,5.5,-0.25,'sad');D._talk='dad';holdFront('p100','dad');D.head.rotation.y=0.35*Math.sin(t*5);D.armL.rotation.set(0,0,-0.3);
    const Z=st('me',HM-1.5,0,5.5,0.3,'sad');Z.head.rotation.x=0.35;
    dolly(V3(HM+0.4,5.4,21),V3(HM+0.3,5.2,19.5),V3(HM+0.2,4.2,5.5),V3(HM+0.2,4.3,5.5),u,40,38);showOnly(['dad','me']);},
  stone_find:(u,t,lt)=>{mood('clear');world.stone.visible=true;world.stone.position.set(0.5,0.45,3.2);world.stone.rotation.y=t;world.spark.visible=true;world.spark.position.set(0.5,0.6,3.2);world.spark.scale.setScalar(4+Math.sin(t*6));
    const Z=st('me',-1.1,0,2.2,0.7,'shocked');Z._talk='zash';Z.torso.rotation.x=0.45;Z.armR.rotation.set(-1.0,0,0);
    dolly(V3(0.6,3.8,15),V3(0.3,3.4,13.2),V3(-0.3,2.5,2.8),V3(-0.2,2.3,2.8),u,42,40);showOnly(['me']);},
  stone_flash:(u,t,lt)=>{mood('clear');const Z=st('me',0,0,2,0,'angry');Z._talk='zash';Z.armR.rotation.set(0,0,2.7);Z.armL.rotation.set(0,0,-0.5);
    world.stone.visible=true;world.stone.position.copy(handOf('me','armR')).add(V3(0,0.4,0));world.stone.rotation.y=t*3;world.spark.visible=true;world.spark.position.copy(world.stone.position);world.spark.scale.setScalar(5+3*u+Math.sin(t*9));
    const fl=SEG('stone').end;dolly(V3(0.5,3.4,10.5),V3(0.3,3.6,8.8),V3(0.1,4.5,2),V3(0.1,4.9,2),u,42,40);showOnly(['me']);S.flash=clamp((t-(fl-0.1))/0.35,0,1);S.shakeA=t>fl-0.4?0.15:0;},
  zash_fish:(u,t,lt)=>{mood('hall');const Z=st('me',HX,0,3,0,'happy',{blink:false});Z._talk='zslow';Z.head.rotation.z=0.28+0.05*Math.sin(t*3);Z.armL.rotation.set(0,0,-0.15);Z.armR.rotation.set(-2.2,0,-0.3);Z._noIdle=true;
    cu('me',lerp(5.8,5.0,eio(u)),0.1,-0.1,38,0,0);showOnly(['me']);S.tagTop='2 + 2 = ?';S.flash=clamp(1-lt/0.3,0,1);const p=proj(head('me'));if(lt<0.55)S.poof={x:p.x,y:p.y,k:lt/0.55};},
  zero_cheer:(u,t,lt)=>{mood('hall');const Z=st('me',HX,0.3*Math.abs(Math.sin(t*8)),3,0,'happy');Z._talk='zash';Z._noIdle=true;holdUp('p0a','me');Z.armL.rotation.set(0,0,-0.6);
    [['tobi',-2.6,0.5],['penny',-1.3,-1],['kip',1.3,-1],['somi',2.6,0.5]].forEach(([id,x,z],i)=>{const P=st(id,HX+x,0.2*Math.abs(Math.sin(t*7+i)),z,0,'happy');P._noIdle=true;P.armL.rotation.set(0,0,-2.5-0.3*Math.sin(t*10+i));P.armR.rotation.set(0,0,2.5+0.3*Math.sin(t*10+i));});
    dolly(V3(HX+0.8,6.2,19),V3(HX+0.7,6.2,17.5),V3(HX+0.4,5.5,2.2),V3(HX+0.4,5.6,2.2),u,44,42);showOnly(['me','tobi','penny','kip','somi']);S.sparkle={x:W*0.5,y:H*0.2,n:16,r:0.35};S.hearts={n:6,seed:'zc'};},
  mia_marry:(u,t,lt)=>{mood('hall');const M=st('mia',HX,0,3,0,'happy');M._talk='mia';M.armL.rotation.set(-1.3,0,0.5);M.armR.rotation.set(-1.3,0,-0.5);M.head.rotation.z=0.12*Math.sin(t*6);
    cu('mia',lerp(5.2,4.5,eio(u)),0.1,-0.1,38,0,0);showOnly(['mia']);S.hearts={n:14,seed:'mm'};S.grade='warm';},
  door_pull:(u,t,lt)=>{mood('hall');world.door.visible=true;world.door.position.set(HX,0,4.2);const b0=SEG('door').end+0.1,b1=b0+0.35;const lunge=x=>x>0&&x<0.3?Math.sin(x/0.3*Math.PI):0;const k=lunge(t-b0)+lunge(t-b1);
    const Z=st('me',HX,0,lerp(8.2,6.3,eio(clamp(lt/1.3,0,1)))-0.85*k,Math.PI,'default');if(lt<1.3)walk(Z,t);Z.armL.rotation.set(-1.4,0,0);Z.armR.rotation.set(-1.4,0,0);Z.torso.rotation.x=0.12*k;Z._noIdle=lt>=1.3;
    world.door.rotation.z=0.012*Math.sin(t*40)*k;dolly(V3(HX+1.6,5.6,19),V3(HX+1.2,5.4,17.5),V3(HX,4.9,4.5),V3(HX,5.0,4.5),u,42,40);showOnly(['me']);
    [b0,b1].forEach(b=>{const d=t-b-0.12;if(d>0&&d<0.3){S.pow={k:d/0.3,x:0.5,y:0.52,text:'BONK!'};S.shakeA=0.15*(1-d/0.3);}});},
  tobi_bro:(u,t,lt)=>{mood('hall');const T2=st('tobi',HX+0.3,0,6,-0.3,'default',{blink:false});T2._talk='tobi';T2.armR.rotation.set(0,0,1.45);T2.armL.rotation.set(0,0,-0.15);
    cu('tobi',lerp(5.4,4.9,eio(u)),0.1,-0.1,38,0,0);showOnly(['tobi']);},
  zash_who:(u,t,lt)=>{mood('hall');const Z=st('me',HX,0,6,0.25,'happy',{blink:false});Z._talk='zslow';Z.head.rotation.z=-0.3;Z.head.rotation.y=0.25*Math.sin(t*2);Z._noIdle=true;
    cu('me',lerp(5.4,4.8,eio(u)),-0.1,-0.1,38,0,0);showOnly(['me']);},
  brick_study:(u,t,lt)=>{mood('night');const caught=lt>0.75;const B=st('brick',BED-4.6,2.5,3.4,0,caught?'shocked':'default');sit(B);B.armL.rotation.set(-1.25,0,0.35);B.armR.rotation.set(-1.25,0,-0.35);B.head.rotation.x=caught?0:0.45;B._noIdle=true;
    world.bk0.visible=true;world.bk0.position.set(BED-4.6,5.2,4.9);world.bk0.rotation.set(-0.5,0,0);world.spark.visible=true;world.spark.position.set(BED-4.6,4.9,5.3);world.spark.scale.setScalar(3);
    dolly(V3(BED-3.4,7.4,14.5),V3(BED-3.8,7.0,12.6),V3(BED-4.6,5.8,3.4),V3(BED-4.6,6.0,3.4),u,40,38);showOnly(['brick']);S.tagTop='EVERY NIGHT';S.vign=0.6;S.shakeA=lt<0.3?0.1*(1-lt/0.3):0;},
  all_books:(u,t,lt)=>{mood('hall');[['mia',-2.2,'bk1'],['rex',0,'bk2'],['dex',2.2,'bk0']].forEach(([id,x,bk],i)=>{const P=st(id,HX+x,0,3,0,'default',{blink:false});P.head.rotation.y=0.6*Math.sin(t*5+i*2);P.armL.rotation.set(0.5,0,0.25);P.armR.rotation.set(0.5,0,-0.25);const b=world[bk];b.visible=true;b.position.set(HX+x+0.95,2.6,2.3);b.rotation.set(0,0.3,0.2);});
    dolly(V3(HX+0.3,5.2,16),V3(HX+0.2,5.1,14.8),V3(HX,3.6,3),V3(HX,3.7,3),u,44,42);showOnly(['mia','rex','dex']);S.tagTop='SECRETLY';},
  zash_alone:(u,t,lt)=>{mood('hall');const Z=st('me',HX,0,3,0,'sad');Z._talk='zash';Z.head.rotation.x=0.2;Z.armR.rotation.set(-0.5,0,-0.2);world.p0a.visible=true;world.p0a.position.copy(handOf('me','armR')).add(V3(0,-0.6,0.3));world.p0a.rotation.set(0.3,0,0.1);
    cu('me',lerp(8.5,6.0,eio(u)),0.1,-0.25,38,0,0);showOnly(['me']);S.grade='drama';S.vign=0.65;},
  exam_pencil:(u,t,lt)=>{mood('hall');pencilShot(t);},
  end_card:(u,t,lt)=>{mood('hall');const cardT=SEG('pencil').end+0.35;if(t<cardT){pencilShot(t);S.black=clamp((t-(cardT-0.12))/0.12,0,1);}else{showOnly([]);S.black=1;S.card=clamp((t-cardT-0.1)/0.4,0,1);}},
};
function pencilShot(t){const Z=st('me',HX,0,3,0,'default',{blink:false});Z._talk='zslow';Z.armR.rotation.set(-1.9,0,-0.35);Z.head.rotation.z=0.25;Z._noIdle=true;const p=world.pencil;p.visible=true;p.scale.setScalar(0.55);p.position.copy(handOf('me','armR')).add(V3(0,0.25,0.15));p.rotation.set(0,0,1.2+0.15*Math.sin(t*6));
  const k=eio(clamp((t-SEG('pencil').start)/1.4,0,1));cu('me',lerp(6.0,5.0,k),-0.15,0.0,38,0,0);showOnly(['me']);}

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
  if(S.sparkle){const sp=S.sparkle,r=rng('spk'+Math.floor(t*12));og.save();for(let i=0;i<sp.n;i++){const a=r()*Math.PI*2,d=(sp.r||0.2)*W*Math.sqrt(r()),x=sp.x+Math.cos(a)*d,y=sp.y+Math.sin(a)*d*1.6,s=W*(0.006+r()*0.012);og.fillStyle=i%3?'rgba(255,255,255,0.95)':'rgba(255,230,140,0.95)';
    og.beginPath();og.moveTo(x,y-s*2);og.lineTo(x+s*0.4,y-s*0.4);og.lineTo(x+s*2,y);og.lineTo(x+s*0.4,y+s*0.4);og.lineTo(x,y+s*2);og.lineTo(x-s*0.4,y+s*0.4);og.lineTo(x-s*2,y);og.lineTo(x-s*0.4,y-s*0.4);og.fill();}og.restore();}
  if(S.pow){const k=clamp(S.pow.k,0,1),sc=k<0.3?easeOut(k/0.3)*1.2:1.2-0.2*easeOut((k-0.3)/0.7);og.save();og.translate(W*(S.pow.x||0.5),H*(S.pow.y||0.36));og.rotate(-0.12);og.scale(sc,sc);og.fillStyle='#ffd23f';og.beginPath();for(let i=0;i<24;i++){const a=i/24*Math.PI*2,rr=(i%2?0.17:0.26)*W;og.lineTo(Math.cos(a)*rr,Math.sin(a)*rr*0.75);}og.closePath();og.fill();og.lineWidth=W*0.008;og.strokeStyle='#1a0a0a';og.stroke();T(S.pow.text,0,W*0.01,W*0.1,'#e02a2a','#1a0a0a',W*0.016);og.restore();}
  if(S.scratch){const r=rng('scr'+Math.floor(t*12));og.save();og.strokeStyle='rgba(40,25,10,0.35)';og.lineWidth=1.5;for(let i=0;i<4;i++){const x=r()*W;og.beginPath();og.moveTo(x,0);og.lineTo(x+(r()-0.5)*20,H);og.stroke();}og.fillStyle='rgba(60,40,20,0.12)';og.fillRect(0,0,W,H);og.restore();}
  if(S.era){og.save();og.translate(W/2,H*0.09);og.fillStyle='rgba(30,18,8,0.8)';RR(-W*0.36,-H*0.028,W*0.72,H*0.056,H*0.012);og.fill();T(S.era,0,H*0.003,W*0.06,'#f4e2b8');og.restore();}
  if(S.phone){const P=S.phone,pw=W*0.62,phh=pw*2.05,px=W/2-pw/2,py=H*0.1;og.save();og.fillStyle='#0c0c10';RR(px-W*0.02,py-W*0.02,pw+W*0.04,phh+W*0.04,W*0.06);og.fill();
    og.beginPath();RR(px,py,pw,phh,W*0.04);og.clip();const CARDS=[['#ff5a7a','LOL'],['#5ab0ff','POV:'],['#ffd23f','OMG'],['#7ad86a','XD'],['#b07aff','WAIT'],['#ff9a3a','NO WAY'],['#3ad8c8','BRUH'],['#ff6ad0','LMAO']];
    const sl=easeOut(Math.min(1,P.f/0.22));for(let k=0;k<2;k++){const idx=(P.n+k)%CARDS.length,c=CARDS[idx],y=py+phh*(k-sl*(P.lt>0.5?1:0))+phh*(P.lt>0.5?1:0)*0;const yy=py+phh*k-phh*sl;og.fillStyle=c[0];og.fillRect(px,yy,pw,phh);
      og.fillStyle='rgba(255,255,255,0.18)';og.beginPath();og.arc(px+pw/2,yy+phh*0.4,pw*0.3,0,7);og.fill();T(c[1],px+pw/2,yy+phh*0.42,pw*0.2,'#ffffff','#1a1a22',pw*0.03);
      og.fillStyle='rgba(255,255,255,0.9)';[0.62,0.72,0.82].forEach((q,i)=>{og.beginPath();og.arc(px+pw*0.88,yy+phh*q,pw*0.045,0,7);og.fill();});og.fillStyle='rgba(255,255,255,0.75)';og.fillRect(px+pw*0.06,yy+phh*0.9,pw*0.5,phh*0.02);}
    og.restore();const ty=py+phh*lerp(0.78,0.45,P.f<0.3?easeOut(P.f/0.3):1)*(P.lt>0.5?1:0)+(P.lt>0.5?0:phh*0.78);og.fillStyle='#ecd4bc';og.strokeStyle='#5a4030';og.lineWidth=W*0.006;RR(W/2+pw*0.26,ty+phh*0.12,pw*0.18,pw*0.42,pw*0.09);og.fill();og.stroke();}
  if(S.huss){const k=S.huss.k,side=S.huss.n%2?1:-1;og.save();og.globalAlpha=1-k*0.6;og.translate(W/2+side*W*0.3,H*0.55-k*H*0.06);og.rotate(side*0.15);T('huss',0,0,W*(0.08+0.03*easeOut(Math.min(1,k*3))),'#ffffff','#1a1a22',W*0.014);og.restore();}
  if(S.tint){og.save();og.globalCompositeOperation='overlay';og.fillStyle=`rgba(60,255,150,${0.5*S.tint})`;og.fillRect(0,0,W,H);og.restore();}
  if(S.sirenWash){const ph=Math.floor(t*4)%2;og.save();og.globalCompositeOperation='overlay';og.fillStyle=ph?`rgba(255,30,30,${0.3*S.sirenWash})`:`rgba(40,80,255,${0.3*S.sirenWash})`;og.fillRect(0,0,W,H);og.restore();}
  if(S.glitch){const r=rng('gl'+Math.floor(t*24));const n=Math.floor(4+S.glitch*12);for(let i=0;i<n;i++){const y=r()*H,h=H*(0.008+r()*0.045),dx=(r()-0.5)*W*0.16*S.glitch;og.drawImage(out,0,y,W,h,dx,y,W,h);}
    og.save();og.globalAlpha=0.5*S.glitch;for(let i=0;i<40*S.glitch;i++){og.fillStyle=['#40ff90','#ff40c0','#40c0ff'][i%3];const s=W*(0.01+r()*0.03);og.fillRect(Math.floor(r()*W/s)*s,Math.floor(r()*H/s)*s,s,s);}og.restore();}
  if(S.game){og.save();og.fillStyle='rgba(0,0,0,0.10)';for(let y=0;y<H;y+=4)og.fillRect(0,y,W,1.5);
    og.globalAlpha=0.92;og.fillStyle='rgba(10,14,20,0.75)';og.beginPath();og.arc(W*0.17,H*0.87,W*0.115,0,7);og.fill();og.strokeStyle='#e8f0ff';og.lineWidth=W*0.008;og.stroke();og.save();og.beginPath();og.arc(W*0.17,H*0.87,W*0.108,0,7);og.clip();og.strokeStyle='rgba(120,200,255,0.7)';og.lineWidth=W*0.012;[[0.08,0.8,0.26,0.94],[0.17,0.76,0.17,0.98],[0.06,0.9,0.28,0.84]].forEach(([a,b,c,d])=>{og.beginPath();og.moveTo(W*a,H*b);og.lineTo(W*c,H*d);og.stroke();});og.fillStyle='#ffd23f';og.beginPath();og.arc(W*0.17,H*0.87,W*0.014,0,7);og.fill();og.restore();
    [['#4ade6a',0.8],['#4a9aff',0.55]].forEach(([c,v],i)=>{og.fillStyle='rgba(10,14,20,0.75)';RR(W*0.32,H*(0.905+i*0.022),W*0.3,H*0.012,H*0.006);og.fill();og.fillStyle=c;RR(W*0.32,H*(0.905+i*0.022),W*0.3*v,H*0.012,H*0.006);og.fill();});
    T('$ 0',W*0.82,H*0.06,W*0.07,'#7aff9a','#0a1a10',W*0.012);og.restore();}
  if(S.tags){S.tags.forEach(q=>{og.save();og.translate(q.x,q.y);og.fillStyle='rgba(10,14,20,0.8)';RR(-W*0.07,-H*0.016,W*0.14,H*0.032,H*0.008);og.fill();T(q.text,0,H*0.002,W*0.045,'#7aff9a');og.fillStyle='#7aff9a';og.beginPath();og.moveTo(-W*0.012,H*0.02);og.lineTo(W*0.012,H*0.02);og.lineTo(0,H*0.032);og.fill();og.restore();});}
  if(S.bubble){const b=S.bubble;og.save();og.font=`${W*0.045}px ${FONT}`;const tw=og.measureText(b.text).width+W*0.06;const bx=clamp(b.x,tw/2+W*0.02,W-tw/2-W*0.02);og.translate(bx,b.y);og.fillStyle='#ffffff';og.strokeStyle='#1a1a22';og.lineWidth=W*0.007;RR(-tw/2,-H*0.024,tw,H*0.048,H*0.016);og.fill();og.stroke();T(b.text,0,H*0.002,W*0.045,'#1a1a22');og.restore();}
  if(S.stars){const st2=S.stars,sz=st2.big?W*0.075:W*0.05,y0=st2.big?H*0.13:H*0.09;for(let i=0;i<5;i++){const on=i<st2.n,pop=on&&i===st2.n-1&&st2.k<1?1+0.6*(1-easeOut(st2.k)):1;const x=W/2+(i-2)*sz*2.3;og.save();og.translate(x,y0);og.scale(pop,pop);og.beginPath();for(let k2=0;k2<10;k2++){const a=-Math.PI/2+k2*Math.PI/5,rr=k2%2?sz*0.45:sz;og.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}og.closePath();og.fillStyle=on?'#ffffff':'rgba(0,0,0,0.35)';og.fill();og.lineWidth=W*0.008;og.strokeStyle='#14141c';og.stroke();og.restore();}}
  if(S.tv){og.save();og.fillStyle='rgba(0,0,0,0.12)';for(let y=0;y<H;y+=4)og.fillRect(0,y,W,1.5);og.fillStyle='#d01a1a';og.fillRect(0,H*0.76,W,H*0.05);T('BREAKING NEWS',W/2,H*0.787,W*0.075,'#ffffff');og.fillStyle='rgba(12,16,30,0.92)';og.fillRect(0,H*0.81,W,H*0.045);T('PLAYERS PULLED INTO THE GAME',W/2,H*0.834,W*0.046,'#ffd23f');
    og.fillStyle='#d01a1a';RR(W*0.06,H*0.06,W*0.2,H*0.036,H*0.008);og.fill();og.fillStyle='#fff';og.beginPath();og.arc(W*0.095,H*0.078,W*0.012*(0.7+0.3*Math.sin(t*6)),0,7);og.fill();T('LIVE',W*0.18,H*0.08,W*0.045,'#ffffff');og.restore();}
  if(S.banner){const k=easeOut(S.banner);og.save();og.translate(W/2,lerp(-H*0.08,H*0.11,k));og.fillStyle='rgba(245,245,250,0.97)';RR(-W*0.42,-H*0.04,W*0.84,H*0.08,H*0.02);og.fill();og.fillStyle='#d01a1a';RR(-W*0.39,-H*0.025,W*0.1,H*0.05,H*0.012);og.fill();T('!',-W*0.34,H*0.003,W*0.07,'#ffffff');T('BREAKING NEWS',W*0.05,-H*0.012,W*0.055,'#14141c');og.font=`${W*0.034}px ${FONT}`;og.fillStyle='#5a5a66';og.textAlign='center';og.fillText('Something is wrong with the game...',W*0.05,H*0.02);og.restore();}
  if(S.phone2){const P=S.phone2,pw=W*0.6,phh=pw*2.0,px=W/2-pw/2,py=H*0.1;og.save();og.fillStyle='#0c0c10';RR(px-W*0.02,py-W*0.02,pw+W*0.04,phh+W*0.04,W*0.06);og.fill();og.beginPath();RR(px,py,pw,phh,W*0.04);og.clip();
    const CARDS=[['#ff5a7a','LOL'],['#5ab0ff','POV:'],['#ffd23f','OMG'],['#7ad86a','XD'],['#b07aff','WAIT'],['#ff9a3a','NO WAY'],['#3ad8c8','BRUH'],['#ff6ad0','LMAO']];const sl=P.n?easeOut(P.f):1;
    for(let k=0;k<2;k++){const idx=(P.n+k+CARDS.length-1)%CARDS.length,c=CARDS[idx],yy=py+phh*(k-sl);og.fillStyle=c[0];og.fillRect(px,yy,pw,phh+2);og.fillStyle='rgba(255,255,255,0.18)';og.beginPath();og.arc(px+pw/2,yy+phh*0.4,pw*0.3,0,7);og.fill();T(c[1],px+pw/2,yy+phh*0.42,pw*0.2,'#ffffff','#1a1a22',pw*0.03);
      og.fillStyle='rgba(255,255,255,0.9)';[0.62,0.72,0.82].forEach(q=>{og.beginPath();og.arc(px+pw*0.88,yy+phh*q,pw*0.045,0,7);og.fill();});og.fillStyle='rgba(255,255,255,0.75)';og.fillRect(px+pw*0.06,yy+phh*0.9,pw*0.5,phh*0.02);}
    og.restore();const ty=py+phh*lerp(0.8,0.5,P.n&&P.f<1?easeOut(P.f):0);og.fillStyle='#e8b98f';og.strokeStyle='#5a4030';og.lineWidth=W*0.006;RR(W/2+pw*0.2,ty,pw*0.2,pw*0.5,pw*0.1);og.fill();og.stroke();}
  if(S.endLines){const k=easeOut(S.endLines);og.save();og.globalAlpha=k;og.translate(W/2,H*0.15);og.scale(0.8+0.2*k,0.8+0.2*k);og.fillStyle='rgba(0,0,0,0.72)';RR(-W*0.45,H*0.005,W*0.9,H*0.105,H*0.02);og.fill();T('SEND THIS TO THE FRIEND',0,H*0.033,W*0.058,'#ffffff');T("WHOSE NAME YOU'D WRITE",0,H*0.08,W*0.062,'#ffd23f');og.restore();}

  if(S.poof){const k=S.poof.k,r=rng('pf');og.save();for(let i=0;i<11;i++){const a=r()*Math.PI*2,d=W*(0.03+0.16*easeOut(k))*(0.5+r()*0.7),rad=W*(0.05+r()*0.05)*(0.6+0.7*easeOut(k));og.globalAlpha=(1-k)*0.95;og.fillStyle=i%3?'#ffffff':'#e8eef8';og.beginPath();og.arc(S.poof.x+Math.cos(a)*d,S.poof.y+Math.sin(a)*d*0.8,rad,0,7);og.fill();}
    og.globalAlpha=1-k;for(let i=0;i<7;i++){const a=i/7*Math.PI*2+0.3,d=W*(0.1+0.2*easeOut(k)),x=S.poof.x+Math.cos(a)*d,y=S.poof.y+Math.sin(a)*d,s2=W*0.014;og.fillStyle='#ffd23f';og.beginPath();og.moveTo(x,y-s2*2);og.lineTo(x+s2*0.5,y-s2*0.5);og.lineTo(x+s2*2,y);og.lineTo(x+s2*0.5,y+s2*0.5);og.lineTo(x,y+s2*2);og.lineTo(x-s2*0.5,y+s2*0.5);og.lineTo(x-s2*2,y);og.lineTo(x-s2*0.5,y-s2*0.5);og.fill();}og.restore();}
  if(S.years){const k=S.years.k,sc=k<0.15?easeOut(k/0.15)*1.25:1.25-0.25*easeOut(Math.min(1,(k-0.15)/0.2));og.save();og.globalAlpha=k>0.75?1-(k-0.75)/0.25:1;og.translate(clamp(S.years.x,W*0.28,W*0.72),Math.max(H*0.16,S.years.y-k*H*0.03));og.rotate(-0.06);og.scale(sc,sc);T(S.years.text,0,0,W*0.085,'#ffd23f','#1a0a0a',W*0.02);og.restore();}
  if(S.tagTop){og.save();og.translate(W/2,H*0.09);og.font=`${W*0.055}px ${FONT}`;const tw2=og.measureText(S.tagTop).width+W*0.08;og.fillStyle='rgba(30,18,8,0.8)';RR(-tw2/2,-H*0.028,tw2,H*0.056,H*0.012);og.fill();T(S.tagTop,0,H*0.003,W*0.055,'#f4e2b8');og.restore();}
  const vg=og.createRadialGradient(W/2,H*0.48,H*0.28,W/2,H/2,H*0.78);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,`rgba(0,0,0,${S.vign||0.35})`);og.fillStyle=vg;og.fillRect(0,0,W,H);
  const r=rng('gr'+Math.floor(t*24));og.fillStyle='rgba(255,255,255,0.035)';for(let i=0;i<300;i++)og.fillRect(r()*W,r()*H,1.5,1.5);
  if(S.flash>0){og.fillStyle=`rgba(245,235,255,${S.flash})`;og.fillRect(0,0,W,H);}
  if(S.endText){const k=easeOut(S.endText);og.save();og.globalAlpha=k;og.translate(W/2,H*0.14);og.scale(0.8+0.2*k,0.8+0.2*k);og.rotate(-0.03);og.fillStyle='rgba(0,0,0,0.72)';RR(-W*0.44,-H*0.06,W*0.88,H*0.12,H*0.02);og.fill();
    T('SEND THIS TO YOUR',0,-H*0.024,W*0.062,'#ffffff');T('UNEMPLOYED FRIEND',0,H*0.03,W*0.075,'#ffd23f');og.restore();}
  if(S.follow){const k=easeOut(S.follow),p=1+0.05*Math.sin(t*7);og.save();og.translate(W/2,H*0.88);og.scale(k*p,k*p);og.fillStyle='#ff2a3a';RR(-W*0.24,-H*0.032,W*0.48,H*0.064,H*0.03);og.fill();T('FOLLOW',0,0,W*0.075,'#fff');og.restore();}
  if(S.black>0){og.fillStyle=`rgba(0,0,0,${S.black})`;og.fillRect(0,0,W,H);}
  if(S.card){const k=easeOut(S.card),p=1+0.03*Math.sin(t*7);og.save();og.globalAlpha=k;og.translate(W/2,H*0.46);og.scale((0.8+0.2*k)*p,(0.8+0.2*k)*p);og.rotate(-0.03);T('SEND THIS TO',0,-H*0.05,W*0.1,'#ffffff','#000',W*0.014);T('UR DUMBEST FRIEND',0,H*0.03,W*0.105,'#ffd23f','#000',W*0.016);og.restore();}
}
function captionAt(t){for(const s of TL.segs){for(let i=0;i<s.words.length;i++){const w=s.words[i];const nx=s.words[i+1];const end=nx?nx.s:Math.min(w.e+0.25,s.end+0.25);if(t>=w.s&&t<end)return {w,since:t-w.s};}}return null;}
function drawCaption(t){if(S.black>=0.8)return;const c=captionAt(t);if(!c)return;const text=c.w.w.toUpperCase();const base=W*0.1*(text.length>8?8/text.length*1.05:1);const k=c.since<0.07?lerp(1.3,1,easeOut(c.since/0.07)):1;
  og.save();og.translate(W/2,H*0.7);og.scale(k,k);og.font=`${base}px ${FONT}`;og.textAlign='center';og.textBaseline='middle';og.lineJoin='round';og.shadowColor='rgba(0,0,0,0.7)';og.shadowBlur=base*0.3;og.lineWidth=base*0.22;og.strokeStyle='#0a0a12';og.strokeText(text,0,0);og.shadowColor='transparent';
  og.fillStyle=c.w.red?'#ffd23f':'#ffffff';og.fillText(text,0,0);og.restore();}

/* ---------------- entry points */
S.init=async function(timeline,w,h,fontUrl){TL=timeline;W=w;H=h;SS=window.BH_SS||1.5;
  const ff=new FontFace('Luckiest Guy',`url(${fontUrl})`);await ff.load();document.fonts.add(ff);
  R=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});R.setPixelRatio(1);R.setSize(Math.round(W*SS),Math.round(H*SS));R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.0;R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
  cam=new THREE.PerspectiveCamera(40,W/H,0.1,1000);
  buildWorld();buildChars();
  const [oc,o2]=cv(W,H);out=oc;og=o2;og.imageSmoothingEnabled=true;og.imageSmoothingQuality='high';const [tc,t2]=cv(W,H);tmpC=tc;tg=t2;const [gc2,gg2]=cv(W,H);gC=gc2;gg=gg2;scene.updateMatrixWorld(true);return true;};
const KEYS=['card','poof','years','tagTop','phone2','stars','tags','bubble','game','tv','banner','glitch','tint','sirenWash','endLines','phone','huss','era','sparkle','pow','scratch','stink','fly','dim','topTag','flash','black','shakeA','zoomPunch','speed','focus','vign','grade','rain','splash','hearts','heartPop','endText','follow'];
S.frame=function(f,q){const t=f/TL.fps;const shot=TL.shots.find(s=>t>=s.s&&t<s.e)||TL.shots[TL.shots.length-1];
  KEYS.forEach(k=>S[k]=null);hideAll();
  if(shot!==curShot){curShot=shot;showOnly([]);}
  Object.values(chars).forEach(c=>{c.rotation.set(0,0,0);});
  const u=(t-shot.s)/(shot.e-shot.s),lt=t-shot.s;scene.updateMatrixWorld(true);
  Object.values(chars).forEach(c=>c.scale.setScalar(1));Object.values(world.arms).forEach(a=>a.scale.setScalar(1));world.marker.scale.setScalar(1);world.pencil.scale.setScalar(1);(SH[shot.name]||SH.end_card)(u,t,lt);
  act(t);scene.updateMatrixWorld(true);
  handheld(t,0.03);if(S.shakeA)shake(S.shakeA,t);
  world.sun.target.position.copy(world.look);world.sun.position.copy(world.look).add(world.sunOff);scene.updateMatrixWorld(true);R.render(scene,cam);
  og.globalAlpha=1;og.globalCompositeOperation='source-over';og.filter='none';og.fillStyle='#000';og.fillRect(0,0,W,H);
  const ck=lt<0.24?1-lt/0.24:0,z=1+0.06*(S.zoomPunch||0)+0.055*ck*ck,sx=Math.sin(t*88)*W*0.014*ck,sy=Math.cos(t*71)*H*0.009*ck;if(z>1.0005){og.drawImage(R.domElement,(W-W*z)/2+sx,(H-H*z)/2+sy,W*z,H*z);}else composite(R.domElement);
  const m=world.mood;const grade=S.grade==='rainy'?'contrast(1.16) saturate(1.05) hue-rotate(6deg) brightness(0.97)':S.game?'saturate(1.7) contrast(1.15) hue-rotate(-12deg)':S.grade==='cold'?'contrast(1.2) saturate(0.85) hue-rotate(6deg)':S.grade==='sepia'?'sepia(0.6) contrast(1.12) saturate(0.95)':S.grade==='bw'?'grayscale(1) contrast(1.25) brightness(1.05)':S.grade==='warm'?'contrast(1.05) saturate(1.15) sepia(0.15)':S.grade==='drama'?'contrast(1.25) saturate(0.6)':m==='rain'||m==='flip'?'contrast(1.12) saturate(0.85) hue-rotate(8deg)':'contrast(1.2) saturate(1.5)';
  gg.clearRect(0,0,W,H);gg.drawImage(out,0,0);og.filter=grade;og.drawImage(gC,0,0);og.filter='none';
  og.filter=`blur(${Math.round(W*0.016)}px) brightness(1.2)`;og.globalCompositeOperation='screen';og.globalAlpha=0.17;og.drawImage(R.domElement,0,0,W,H);og.filter='none';og.globalCompositeOperation='source-over';og.globalAlpha=1;
  drawOverlays(t);drawCaption(t);
  return out.toDataURL('image/jpeg',q||0.94);};
})();
