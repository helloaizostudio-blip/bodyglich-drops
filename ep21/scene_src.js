/* Episode 21 "Everyone's Playing" (In this town..., narrator Zash). The game comes out and the whole town lives like it:
   flying cars, a stolen helicopter, the principal in a cop car. Zash just scrolls (hus hus hus). Then everyone who
   played is pulled into the game and becomes an NPC, including his little brother Max; Zash picks up the controller.
   The game is shown only as our own blocky open-world chaos (no real logos, characters or art).
   ep21/scene.js = this + cast_ep21.js (build_scene.py). Entry points: SAMPLE.init(timeline, W, H, fontUrl), SAMPLE.frame(f) */
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
function buildLiving(){const g=new THREE.Group();g.position.set(LIV,0,0);scene.add(g);plane(30,30,SM({color:'#6a5a7a',roughness:1}),0,0,0,-Math.PI/2,g);
  box(30,16,0.4,SM({map:wallTex('#4a5a6a','#3a4a5a'),roughness:0.9}),0,8,-8,g);box(10,2,3,SM({color:'#8a3a3a',roughness:0.95}),0,1.6,-5.5,g);box(10,3.2,1,SM({color:'#7a3030',roughness:0.95}),0,3.6,-7.2,g);[-1,1].forEach(sd=>box(1,2.6,3,SM({color:'#7a3030'}),sd*5.3,2.0,-5.5,g));
  box(5,3,0.4,'#111',0,5,9.6,g);world.tv=plane(4.6,2.6,SM({color:'#4a7aff',emissive:0x4a7aff,emissiveIntensity:1.0}),0,5,9.35,0,g);world.tv.rotation.y=Math.PI;
  const chips=box(0.9,1.2,0.4,SM({color:'#f2c020',roughness:0.5}),0,0,0);chips.visible=false;world.chips=chips;
  const ph=new THREE.Group();box(1.0,1.9,0.14,'#111116',0,0,0,ph);const scr=plane(0.86,1.7,SM({color:'#ffffff',emissive:0x8ab0ff,emissiveIntensity:1.1}),0,0,-0.075,0,ph);scr.rotation.y=Math.PI;scene.add(ph);ph.visible=false;world.phone=ph;world.phoneL=pl(0x8ab0ff,0,6,0,0,0);world.phoneScr=scr;
  world.livL=[pl(0x6a8aff,1.2,30,LIV,6,6),pl(0xffd8a0,0.4,30,LIV-8,10,0)];}
/* ---------------- world */
const LIV=1000, NEWS=1300;
const BENCH=V3(-6.6,0,7), PORTAL=V3(0,25,-20);
function makeCar(col,cop){const g=new THREE.Group();const bm=SM({color:col,roughness:0.45,metalness:0.3}),dk=SM({color:'#16161a',roughness:0.8});
  box(6,1.7,12,bm,0,1.95,0,g);box(6.1,0.5,12.2,dk,0,0.95,0,g);box(5.2,0.12,5.2,dk,0,2.82,-1.6,g);
  const ws=box(5.4,1.7,0.14,new THREE.MeshStandardMaterial({color:0xbfe4ff,transparent:true,opacity:0.35,roughness:0.1}),0,3.6,1.5,g);ws.rotation.x=-0.3;
  [-1.4,1.4].forEach(x=>box(2.1,1.9,0.5,SM({color:'#2a2226',roughness:0.9}),x,3.2,-3.4,g));
  g.userData.wheels=[];[[-3.1,3.9],[3.1,3.9],[-3.1,-3.9],[3.1,-3.9]].forEach(([x,z])=>{const w=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.15,0.9,16),dk);w.rotation.z=Math.PI/2;w.position.set(x,1.15,z);g.add(w);const hub=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,0.95,10),SM({color:'#c8ccd2',metalness:0.7,roughness:0.3}));hub.rotation.z=Math.PI/2;hub.position.set(x,1.15,z);g.add(hub);});
  [-2,2].forEach(x=>{box(1.3,0.55,0.12,SM({color:'#fff8d0',emissive:0xfff0a0,emissiveIntensity:1}),x,2.1,6.02,g);box(1.3,0.5,0.12,SM({color:'#e02020',emissive:0xa00000,emissiveIntensity:0.8}),x,2.1,-6.02,g);});
  box(3,0.5,0.14,SM({color:'#d8dce2',metalness:0.6,roughness:0.3}),0,1.5,6.03,g);
  if(cop){box(6.06,1.3,4.6,dk,0,1.95,-0.6,g);[-2.5,2.5].forEach(x=>box(0.25,2.2,0.25,dk,x,3.7,-2.2,g));box(5.3,0.3,0.6,dk,0,4.8,-2.2,g);
    const r=box(2.2,0.6,0.9,SM({color:'#ff2020',emissive:0xff0000,emissiveIntensity:1}),-1.3,5.2,-2.2,g),b=box(2.2,0.6,0.9,SM({color:'#2050ff',emissive:0x0030ff,emissiveIntensity:1}),1.3,5.2,-2.2,g);g.userData.lights=[r,b];}
  scene.add(g);g.visible=false;return g;}
function makeHeli(col){const g=new THREE.Group();const bm=SM({color:col,roughness:0.5,metalness:0.2}),dk=SM({color:'#1a1a20',roughness:0.7});
  box(4.6,1.2,6.4,bm,0,1.6,0,g);box(4.6,2.6,1.6,bm,0,3.4,-2.4,g);box(4.6,0.4,5,bm,0,4.9,-0.6,g);[-2.2,2.2].forEach(x=>{box(0.25,2.6,0.25,bm,x,3.5,2.3,g);});
  const gl=box(4.2,2.2,0.12,new THREE.MeshStandardMaterial({color:0xbfe4ff,transparent:true,opacity:0.3}),0,3.5,3.0,g);gl.rotation.x=-0.25;
  box(0.9,0.9,8.5,bm,0,3.6,-7.2,g);box(0.2,2.6,1.6,bm,0,4.6,-11,g);const tr=box(0.12,2.4,0.4,dk,0.3,4.6,-11,g);g.userData.tail=tr;
  box(0.4,1,0.4,dk,0,5.5,-0.6,g);const rot=new THREE.Group();rot.position.set(0,6.1,-0.6);box(17,0.12,0.9,dk,0,0,0,rot);box(0.9,0.12,17,dk,0,0,0,rot);g.add(rot);g.userData.rotor=rot;
  [-2,2].forEach(x=>{box(0.3,0.3,7.4,dk,x,0.15,0,g);[-2,2].forEach(z=>box(0.2,1,0.2,dk,x,0.6,z,g));});scene.add(g);g.visible=false;return g;}
function newsTex(){return canvasTex(512,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,'#12306a');gr.addColorStop(1,'#0a1430');g.fillStyle=gr;g.fillRect(0,0,w,h);const r=rng('nw');g.fillStyle='rgba(120,180,255,0.35)';for(let i=0;i<500;i++){const x=r()*w,y=h*0.2+r()*h*0.6;if(Math.sin(x*0.03)+Math.cos(y*0.07)>0.2)g.fillRect(x,y,3,3);}
  g.fillStyle='#e02a2a';g.fillRect(20,20,150,54);g.fillStyle='#fff';g.font=`40px ${FONT}`;g.textAlign='center';g.fillText('NEWS 24',95,60);});}
function portalTex(){return canvasTex(512,288,(g,w,h)=>{const gr=g.createRadialGradient(w/2,h/2,10,w/2,h/2,w*0.6);gr.addColorStop(0,'#ffffff');gr.addColorStop(0.25,'#8affc0');gr.addColorStop(0.7,'#10b060');gr.addColorStop(1,'#04301c');g.fillStyle=gr;g.fillRect(0,0,w,h);g.strokeStyle='rgba(0,40,20,0.35)';g.lineWidth=1;for(let x=0;x<w;x+=12){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}for(let y=0;y<h;y+=12){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}});}
function buildExtras(){
  // bench
  const bg=new THREE.Group();bg.position.copy(BENCH);scene.add(bg);const wd=SM({color:'#8a5a34',roughness:0.8});box(6.4,0.3,1.9,wd,0,1.8,0,bg);box(6.4,1.7,0.25,wd,0,3.1,-0.85,bg);[-2.8,2.8].forEach(x=>{box(0.3,1.7,1.7,'#2a2a30',x,0.85,0,bg);box(0.3,1.6,0.3,'#2a2a30',x,2.6,-0.85,bg);});
  const tree=new THREE.Group();tree.position.set(-10.2,0,5);scene.add(tree);box(0.9,6,0.9,'#5a3e28',0,3,0,tree);const lf=new THREE.Mesh(new THREE.IcosahedronGeometry(3.6,1),SM({color:'#3a8a3a',roughness:0.95}));lf.position.y=8;tree.add(lf);
  world.cars={red:makeCar('#e02a2a'),blue:makeCar('#2a6ae0'),yellow:makeCar('#f0c020'),cop1:makeCar('#f2f2f4',true),cop2:makeCar('#f2f2f4',true)};
  world.heli=makeHeli('#f0a020');world.heli2=makeHeli('#2a3a6a');
  // parachute
  const pc=new THREE.Group();const dome=new THREE.Mesh(new THREE.SphereGeometry(4.6,16,8,0,Math.PI*2,0,Math.PI/2),SM({map:canvasTex(256,64,(g,w,h)=>{for(let i=0;i<8;i++){g.fillStyle=i%2?'#ffffff':'#e03a3a';g.fillRect(i*32,0,32,h);}}),roughness:0.9,side:THREE.DoubleSide}));dome.position.y=9;dome.scale.y=0.7;pc.add(dome);
  const pts=[];for(let i=0;i<8;i++){const a=i/8*Math.PI*2;pts.push(V3(Math.cos(a)*4.5,9,Math.sin(a)*4.5),V3(0,4.6,0));}pc.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x333333})));scene.add(pc);pc.visible=false;world.chute=pc;
  // rocket tube with a suction dart
  const rk=new THREE.Group();const tb=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,4.4,14),SM({color:'#5a6a3a',roughness:0.7}));tb.rotation.x=Math.PI/2;rk.add(tb);const dart=new THREE.Mesh(new THREE.ConeGeometry(0.55,0.9,14),SM({color:'#e02a2a',roughness:0.5}));dart.rotation.x=-Math.PI/2;dart.position.z=2.7;rk.add(dart);box(0.3,0.9,0.4,'#2a2a30',0,-0.7,0.4,rk);scene.add(rk);rk.visible=false;world.rocket=rk;
  // controller
  const ct=new THREE.Group();const cm=SM({color:'#2a2a32',roughness:0.5});box(1.9,0.45,1.0,cm,0,0,0,ct);[-0.8,0.8].forEach(x=>{const gp=box(0.55,0.5,1.1,cm,x,-0.12,-0.45,ct);gp.rotation.x=0.4;});
  [['#ff4a4a',0.55,0.12],['#4aff7a',0.75,-0.05],['#4a9aff',0.35,-0.05],['#ffd23f',0.55,-0.22]].forEach(([c,x,z])=>{const b=new THREE.Mesh(new THREE.SphereGeometry(0.1,8,6),SM({color:c,emissive:c,emissiveIntensity:0.6}));b.position.set(x,0.26,z);ct.add(b);});
  const stk=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.2,10),SM({color:'#111'}));stk.position.set(-0.55,0.3,-0.05);ct.add(stk);box(0.9,0.05,0.2,SM({color:'#40ff90',emissive:0x40ff90,emissiveIntensity:1.2}),0,0.24,0.25,ct);scene.add(ct);ct.visible=false;world.pad=ct;
  // explosion sprites + smoke
  world.boom=[glowTex('rgba(255,120,20,0.95)'),glowTex('rgba(255,210,60,0.95)'),glowTex('rgba(255,255,255,1)')].map(t=>{const s=sprite(t,1,scene,0);s.visible=false;return s;});world.boomL=pl(0xff8a20,0,60,0,0,0);
  // the portal: a giant glowing game screen in the sky
  const po=new THREE.Group();po.position.copy(PORTAL);po.rotation.x=0.45;box(21.4,12.6,0.6,'#0a0a0e',0,0,-0.4,po);const scr=new THREE.Mesh(new THREE.PlaneGeometry(20,11.25),new THREE.MeshBasicMaterial({map:portalTex()}));po.add(scr);const gl=sprite(glowTex('rgba(80,255,150,0.7)'),44,po,0.7);gl.position.z=-1;scene.add(po);po.visible=false;world.portal=po;world.portalL=pl(0x50ff90,0,120,PORTAL.x,PORTAL.y-6,PORTAL.z+8);
  // news studio
  const ng=new THREE.Group();ng.position.set(NEWS,0,0);scene.add(ng);plane(40,40,SM({color:'#1a1e2a',roughness:0.4}),0,0,0,-Math.PI/2,ng);const bt=newsTex();box(34,18,0.4,SM({map:bt,emissive:0xffffff,emissiveMap:bt,emissiveIntensity:0.5}),0,9,-6,ng);
  box(13,3.3,3,SM({color:'#22263a',roughness:0.4}),0,1.65,0,ng);box(13.2,0.25,3.3,SM({color:'#e8ecf2',roughness:0.3}),0,3.4,0,ng);box(13.02,0.5,0.1,SM({color:'#e02a2a',emissive:0xe02a2a,emissiveIntensity:0.9}),0,2.2,1.52,ng);
  world.newsL=[pl(0xffffff,1.3,50,NEWS+4,10,8),pl(0x9ab8ff,0.6,40,NEWS-8,8,4)];}
function carAt(n,x,y,z,ry,rx,rz,t){const c=world.cars[n];c.visible=true;c.position.set(x,y,z);c.rotation.set(rx||0,ry||0,rz||0);if(c.userData.lights){const ph=Math.floor((t||0)*6)%2;c.userData.lights[0].material.emissiveIntensity=ph?1.6:0.1;c.userData.lights[1].material.emissiveIntensity=ph?0.1:1.6;}return c;}
function driver(id,c,e){c.updateMatrixWorld(true);const p=c.localToWorld(V3(-1.4,-0.15,-1.4));const P=st(id,p.x,p.y,p.z,c.rotation.y,e);sit(P);P.armL.rotation.set(-1.3,0,0.1);P.armR.rotation.set(-1.3,0,-0.1);P._noIdle=true;return P;}
function heliAt(h,x,y,z,ry,rx,rz,t){h.visible=true;h.position.set(x,y,z);h.rotation.set(rx||0,ry||0,rz||0);h.userData.rotor.rotation.y=t*31;h.userData.tail.rotation.x=t*40;return h;}
function boomAt(p,k){const a=clamp(1-k,0,1);world.boom.forEach((s,i)=>{s.visible=k>0&&k<1;s.position.copy(p).add(V3(0,k*3*(i+1)*0.5,0));s.scale.setScalar((6+i*3)*(0.4+easeOut(k)*1.6)*(3-i)/2);s.material.opacity=a*(i===2?0.9:0.8);});world.boomL.position.copy(p);world.boomL.intensity=k>0&&k<1?4*a:0;}
function buildWorld(){
  scene=new THREE.Scene();scene.background=new THREE.Color('#9ac8f0');scene.fog=new THREE.Fog(0x9ac8f0,80,260);
  world.hemi=new THREE.HemisphereLight(0xfff4e6,0x40362c,0.8);scene.add(world.hemi);world.look=V3(0,0,0);
  buildTown();buildLiving();buildExtras();world.poster.visible=false;}
function hideAll(){Object.values(world.cars).forEach(c=>c.visible=false);world.heli.visible=false;world.heli2.visible=false;world.chute.visible=false;world.rocket.visible=false;world.pad.visible=false;world.phone.visible=false;world.phoneL.intensity=0;world.chips.visible=false;world.tumble.visible=false;
  world.boom.forEach(s=>s.visible=false);world.boomL.intensity=0;world.portal.visible=false;world.portalL.intensity=0;world.doors.forEach(d=>d.rotation.y=0);}

/* ---------------- characters */
const CASTC={me:'leo',mom:'mom',brick:'brick',goldbank:'goldbank',tobi:'tobi',max:'max',grimm:'grimm',dave:'dave',benny:'benny',kip:'kip',dex:'dex'};
function buildChars(){Object.entries(CASTC).forEach(([id,cid])=>{const g=buildChar(BH.castById(cid));scene.add(g);g.visible=false;chars[id]=g;});
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


const MOOD={day:['#bfe2ff',0xbcd8ff,0.4,1.35],dusk:['#d88a62',0xffa878,0.34,0.8],game:['#6ad8ff',0xdff0ff,0.6,1.3],liv:['#070b10',0x7a9ad8,0.22,0],news:['#0c1428',0xffffff,0.7,0]};
function mood(m){world.mood=m;const M=MOOD[m];const town=m==='day'||m==='dusk'||m==='game';
  [['townL',town],['livL',m==='liv'],['newsL',m==='news']].forEach(([k,on])=>world[k].forEach(L=>{if(L.userData.i0==null)L.userData.i0=L.intensity;L.intensity=on?L.userData.i0:0;}));
  scene.background.set(M[0]);world.hemi.color.setHex(M[1]);world.hemi.intensity=M[2];world.sun.intensity=M[3];world.sun.color.setHex(m==='dusk'?0xff8a50:0xfff0d0);world.hemi.groundColor.setHex(town?(m==='dusk'?0x5a3028:0x8a7a5a):0x202028);world.rim.intensity=town?0.35:0;world.sky.visible=m==='day';world.clouds.forEach(c=>c.visible=m==='day');scene.fog.color.set(M[0]);scene.fog.near=150;scene.fog.far=460;}
const hitsOf=id=>TL.segs.find(s=>s.id===id).words.map(w=>w.s);
function hitState(id,t){const hs=hitsOf(id).filter(h=>h<=t);return {n:hs.length,f:hs.length?clamp((t-hs[hs.length-1])/0.16,0,1):1};}
// Zash on the bench, scrolling
function zs(t,e,hs){const P=st('me',BENCH.x,0,BENCH.z+0.25,0,e||'default');sit(P);const fl=hs&&hs.n&&hs.f<1?Math.sin(hs.f*Math.PI):0;P.armR.rotation.set(-1.15-fl*0.14,0,0.38);P.armL.rotation.set(-1.15,0,-0.38);P.head.rotation.x=0.3;P._noIdle=true;
  const hp=head('me');world.phone.visible=true;world.phone.scale.setScalar(0.55);world.phone.position.copy(hp.clone().add(V3(0,-1.6,1.35)));world.phone.lookAt(hp);world.phone.rotateY(Math.PI);world.phoneScr.material.emissive.setHSL(((hs?hs.n:Math.floor(t*4))*0.23)%1,0.7,0.5);return P;}
const PLAYERS=[['mom',-3.6],['brick',-1.2],['goldbank',1.2],['tobi',3.6]];
function tag(id,text,dy){const q=proj(head(id).clone().add(V3(0,dy||1.9,0)));(S.tags=S.tags||[]).push({x:q.x,y:q.y,text:text||'NPC'});}

const SH={
  car_flies:(u,t,lt)=>{mood('day');const k=lt/2.2;carAt('red',lerp(4,-3,k),lerp(7,12.5,Math.sin(k*Math.PI*0.9)),lerp(-18,14,k),0.3,lt*1.5,lt*0.9,t);carAt('blue',lerp(-14,10,k),3+Math.sin(k*Math.PI)*7,-30,1.2,0,lt*2,t);
    boomAt(V3(0,4,-22),clamp(lt/1.6,0.01,0.99));heliAt(world.heli,lerp(10,-6,k),20,-34,-1.2,0.1,0.2,t);
    camAt(V3(0.6,1.3,11-lt*0.5),V3(0,7.5,1),56);showOnly([]);S.shakeA=lt<0.5?0.4*(1-lt/0.5)+0.06:0.06;S.zoomPunch=lt<0.18?1:0;S.speed={k:0.3,col:'#fff4d8'};},
  parachute:(u,t,lt)=>{mood('day');const y=lerp(15,6.5,u);const D=st('dex',1.5+Math.sin(t*1.4)*0.8,y,-3,0.2,'happy',{mouthOpen:0.85});D.armL.rotation.set(0,0,-2.7);D.armR.rotation.set(0,0,2.7);D.legL.rotation.x=Math.sin(t*5)*0.4;D.legR.rotation.x=-Math.sin(t*5)*0.4;D._noIdle=true;
    world.chute.visible=true;world.chute.position.set(chars.dex.position.x,y+1.2,-3);world.chute.rotation.z=Math.sin(t*1.4)*0.12;
    carAt('yellow',lerp(-13,13,u),2+Math.sin(u*Math.PI)*8,-24,Math.PI/2,0,-u*5,t);boomAt(V3(-10,3,-40),clamp(u*1.3,0.01,0.99));
    const hp=head('dex');dolly(V3(-3.4,5.5,11),V3(-3,5,10),hp.clone().add(V3(0,2.4,0)),hp.clone().add(V3(0,2.6,0)),u,50,48);showOnly(['dex']);S.speed={k:0.2,col:'#ffffff'};},
  mom_car:(u,t)=>{mood('day');const z=lerp(-44,0,u);const c=carAt('red',-1+Math.sin(t*5)*0.5,0,z,Math.sin(t*5)*0.06,0,0,t);const M=driver('mom',c,'happy');M._o={mouthOpen:0.9};M.armR.rotation.set(0,0,2.6);
    const G=st('goldbank',1.6,0,z-15,0,'angry',{mouthOpen:0.9});walk(G,t*2);G.armL.rotation.set(-2.6,0,0.3);G.armR.rotation.set(-2.6,0,-0.3);
    dolly(V3(4.2,3.4,13),V3(4.6,3.2,12),V3(-0.5,3.6,z*0.5-4),V3(-0.5,3.8,-1),u,50,46);showOnly(['mom','goldbank']);S.speed={k:0.45,col:'#ffffff'};S.shakeA=0.04;},
  brick_heli:(u,t)=>{mood('day');const p=V3(lerp(5,-1.5,u),lerp(11,7,u),lerp(-26,-3,u));heliAt(world.heli,p.x,p.y,p.z,-0.25,0.38,Math.sin(t*3)*0.12,t);world.heli.updateMatrixWorld(true);const s=world.heli.localToWorld(V3(0,0.3,0.4));
    const B=st('brick',s.x,s.y,s.z,-0.25,'happy');sit(B);laugh(B,t,0);B.armL.rotation.set(0,0,-2.5);B.armR.rotation.set(-1.2,0,0);
    camAt(V3(-4.2,5.2,13.5),p.clone().add(V3(0,2.6,0)),48);showOnly(['brick']);S.speed={k:0.25,col:'#ffffff'};S.shakeA=0.05;},
  principal_cop:(u,t)=>{mood('day');const z=lerp(-40,-6,u);const c=carAt('cop1',0.5+Math.sin(t*4)*0.4,0,z,0,0,0,t);const G=driver('grimm',c,'angry');G._o={mouthOpen:0.8};G.armL.rotation.set(-1.5,0,-1.1);
    [['benny',-3.6],['kip',3.8]].forEach(([id,x],i)=>{const P=st(id,x,0,z+12+i*1.5,0,'shocked',{mouthOpen:0.95});walk(P,t*2.1+i);P.armL.rotation.set(0,0,-2.6+Math.sin(t*15+i)*0.3);P.armR.rotation.set(0,0,2.6+Math.sin(t*15+i+1)*0.3);});
    dolly(V3(-2.4,6.4,15),V3(-2.6,6,14),V3(0,3.6,z*0.5),V3(0,3.8,-2),u,52,48);showOnly(['grimm','benny','kip']);S.sirenWash=0.5;S.speed={k:0.3,col:'#ffffff'};},
  zash_bench:(u,t)=>{mood('day');zs(t,'default',null);const z=lerp(-46,26,u);const c=carAt('red',1.6,0,z,0,0,0,t);driver('mom',c,'happy');carAt('cop1',-0.8,0,z-16,0,0,0,t);heliAt(world.heli,lerp(12,-14,u),17,-12,-1.4,0.15,0.2,t);
    boomAt(V3(6,3,-34),clamp((u-0.2)*1.6,0.01,0.99));dolly(V3(-2.6,5.2,23),V3(-3.2,5.0,20.5),V3(-4.6,4.6,7),V3(-5.0,4.6,7),u,48,46);showOnly(['me','mom']);S.sirenWash=0.2;},
  thumb_blur:(u,t)=>{mood('day');const hs=hitState('w1',t);const Z=zs(t,'default',hs);Z._talk='zfast';cu('me',5.4,0,-0.5,40,0,0);S.focus=null;showOnly(['me']);S.dim=0.45;S.phone2=hs;},
  car_flip:(u,t,lt)=>{mood('day');const hs=hitState('w2',t);const Z=zs(t,'default',hs);Z._talk='zfast';const k=clamp(lt/0.85,0,1);carAt('blue',lerp(9,-19,k),2.5+Math.sin(k*Math.PI)*9.5,lerp(4,7.5,k),Math.PI/2,0,-k*7.5,t);
    if(lt>0.85)boomAt(V3(-17,2.5,7),clamp((lt-0.85)/0.9,0.01,0.99));camAt(V3(-3.4,3.4,18.5),V3(-7.2,6.2,7),52);showOnly(['me']);S.shakeA=lt>0.85?0.3*(1-(lt-0.85)/0.4):0.03;S.flash=lt>0.85&&lt<1.0?0.6:0;},
  tobi_rocket:(u,t,lt)=>{mood('day');zs(t,'default',null);const k=easeOut(lt/0.4);const T0=st('tobi',lerp(3.5,-1.4,k),0,7.6,-Math.PI/2+0.45,'shocked');T0._talk='tobi';if(k<1)walk(T0,t*2);T0.armL.rotation.set(-1.4,0,0.2+Math.sin(t*9)*0.25);T0.armR.rotation.set(-2.0,0,-0.2);
    const sh=lw0(T0.torso,V3(1.25,4.15,0.2));world.rocket.visible=true;world.rocket.position.copy(sh);world.rocket.rotation.set(-0.1,-Math.PI/2+0.5,0);boomAt(V3(8,3,-30),clamp(u*1.2,0.01,0.99));
    dolly(V3(-3.8,5.4,25),V3(-4.0,5.3,24),V3(-4.0,4.7,7.6),V3(-4.0,4.7,7.6),u,54,52);showOnly(['me','tobi']);},
  zash_shh:(u,t)=>{mood('day');const Z=zs(t,'default',null);Z._talk='zash';Z.armL.rotation.set(-2.45,0,-0.6);Z.head.rotation.x=0.22;cu('me',5.0,0.3,-0.3,38,u,0.1);S.focus=null;showOnly(['me']);},
  thumb_blur2:(u,t)=>{mood('day');const hs=hitState('w3',t);const Z=zs(t,'default',hs);Z._talk='zfast';cu('me',5.4,0,-0.5,40,0,0);S.focus=null;showOnly(['me']);S.dim=0.45;S.phone2=hs;},
  five_stars:(u,t,lt)=>{mood('day');heliAt(world.heli2,Math.sin(t*0.9)*9,19,-22+Math.cos(t*0.9)*6,t*0.9,0.1,0.2,t);carAt('cop1',-2,0,lerp(-40,-16,u),0,0,0,t);carAt('cop2',2.4,0,lerp(-52,-26,u),0,0,0,t);
    dolly(V3(0,3,15),V3(0,3.4,13),V3(0,13,-24),V3(0,14,-24),u,54,52);showOnly([]);S.stars={n:Math.min(5,1+Math.floor(lt/0.2)),k:(lt%0.2)/0.2,big:true};S.sirenWash=0.7;},
  arrests:(u,t)=>{mood('day');PLAYERS.forEach(([id,x],i)=>{const P=st(id,x,0,2,0,'shocked');P.armL.rotation.set(0,0,-2.7);P.armR.rotation.set(0,0,2.7);P.torso.rotation.z=Math.sin(t*20+i)*0.02;});
    carAt('cop1',-7,0,-5,0.6,0,0,t);carAt('cop2',7,0,-5,-0.6,0,0,t);heliAt(world.heli2,0,17,-8,t*0.9,0.1,0,t);dolly(V3(0.4,5.4,17),V3(0.2,5.2,15),V3(0,4.6,1),V3(0,4.6,1),u,50,48);showOnly(PLAYERS.map(p=>p[0]));S.stars={n:5,k:1};S.sirenWash=0.8;},
  zash_zero:(u,t)=>{mood('day');const Z=zs(t,'smug',null);Z._talk='zash';Z.armL.rotation.set(-0.4,0,-1.0);Z.head.rotation.x=0.0;Z.head.rotation.z=0.1;cu('me',6.4,0.5,-0.2,40,u,0.1);S.focus=null;showOnly(['me']);S.stars={n:0,k:1};S.sirenWash=0.15;},
  news_alert:(u,t,lt)=>{mood('day');const sh=lt>0.75;const Z=zs(t,sh?'shocked':'default',null);Z.head.rotation.x=0.3;world.phone.position.x+=lt<0.5?Math.sin(t*90)*0.03:0;cu('me',5.0,0,-0.4,38,u,0.14);S.focus=null;showOnly(['me']);S.banner=clamp(lt/0.25,0,1);S.vign=0.6;},
  tv_anchor:(u,t)=>{mood('news');const A=st('dave',NEWS,0,-2.3,0,'default');A._talk='tv';A.armL.rotation.set(-1.1,0,-0.3);A.armR.rotation.set(-1.1,0,0.3);dolly(V3(NEWS,5.6,9.5),V3(NEWS,5.5,8),V3(NEWS,5.0,-1),V3(NEWS,5.0,-1),u,42,40);showOnly(['dave']);S.tv=1;},
  players_glitch:(u,t,lt)=>{mood('day');const r=rng('pg'+Math.floor(t*14));PLAYERS.forEach(([id,x],i)=>{const P=st(id,x+(r()-0.5)*0.5*u,0,2,0,'shocked',{blink:false});P.armL.rotation.set(-1.3,0,-0.2);P.armR.rotation.set(-1.3,0,0.2);P.head.rotation.x=0.35;chars[id].scale.set(1+(r()-0.5)*0.25*u,1+(r()-0.5)*0.2*u,1);chars[id].visible=r()>0.12*u;});
    world.portal.visible=true;world.portal.scale.setScalar(easeOut(u)*1.0+0.01);world.portalL.intensity=2.5*u;dolly(V3(0.4,5.2,17),V3(0.2,5.0,14),V3(0,4.8,1),V3(0,5.2,1),u,50,48);showOnly(PLAYERS.map(p=>p[0]));S.glitch=0.25+u*0.75;S.tint=u*0.5;},
  sucked_in:(u,t,lt)=>{mood('day');world.portal.visible=true;world.portal.scale.setScalar(1+0.05*Math.sin(t*9));world.portalL.intensity=4;
    PLAYERS.forEach(([id,x],i)=>{const k=easeIn(clamp((u*1.25-i*0.08),0,1));const P=st(id,0,0,0,0,'shocked',{mouthOpen:0.95,blink:false});const p=V3(x,0,2).lerp(PORTAL.clone().add(V3(0,-2,1)),k);chars[id].position.copy(p);chars[id].rotation.set(-0.6*k,k*5+i,0);chars[id].scale.set(1-0.75*k,1+1.4*k*(1-k)*2-0.75*k*k,1-0.75*k);P.armL.rotation.set(0,0,-2.8);P.armR.rotation.set(0,0,2.8);P._noIdle=true;});
    camAt(V3(0.5,2.4,17),V3(0,13.5,-8),58);showOnly(PLAYERS.map(p=>p[0]));S.speed={k:0.7,col:'#80ffb0'};S.shakeA=0.1;S.tint=0.6;S.flash=u>0.85?(u-0.85)/0.15:0;S.glitch=0.3;},
  npc_town:(u,t,lt)=>{mood('game');const a=t*0.9;const M=st('mom',2.5+Math.cos(a)*3,0,-3+Math.sin(a)*3,-a,'default',{blink:false});walk(M,t*0.8);const B=st('brick',-3.4,0,-6,t*0.6,'default',{blink:false});B.armL.rotation.set(0,0,-1.57);B.armR.rotation.set(0,0,1.57);B._noIdle=true;
    const G=st('goldbank',8.1,0,1.5,Math.PI/2,'default',{blink:false});walk(G,t);const T0=st('tobi',-2.2,0,3+Math.sin(t*2)*0.0,0,'default',{blink:false});T0._noIdle=true;T0.torso.position.y=Math.abs(Math.sin(t*5))*0.9;
    dolly(V3(0.5,7.5,16),V3(0.3,7,14),V3(0.4,4,-2),V3(0.4,4,-2),u,52,50);showOnly(['mom','brick','goldbank','tobi']);['mom','brick','goldbank','tobi'].forEach(id=>tag(id));S.game=1;S.flash=lt<0.25?1-lt/0.25:0;},
  max_npc:(u,t,lt)=>{mood('game');const X=st('max',0,0,2,0,'default',{blink:false});X._talk='maxnpc';X._noIdle=true;X.armR.rotation.set(0,0,2.35+(Math.floor(t*3)%2)*0.45);const M=st('mom',-7+((t*1.2)%14),0,-9,Math.PI/2,'default',{blink:false});walk(M,t*0.8);
    const hp=head('max');dolly(V3(0.8,4.4,11.5),V3(0.6,4.3,10),hp.clone().add(V3(0,-0.9,0)),hp.clone().add(V3(0,-0.7,0)),u,40,38);showOnly(['max','mom']);tag('max');tag('mom');const q=proj(hp.clone().add(V3(2.4,1.3,0)));if(talkAmt(t,'maxnpc')>0)S.bubble={x:q.x,y:q.y,text:'Nice weather today.'};S.game=1;S.glitch=(lt%1.5)<0.1?0.6:0;},
  max_close:(u,t,lt)=>{mood('game');const cry=lt>1.7&&lt<1.92;const X=st('max',0,0,2,0,cry?'sad':'default',{blink:false});X._noIdle=true;cu('max',lerp(5.4,3.6,eio(u)),0,0,36,0,0);S.focus=null;showOnly(['max']);tag('max','NPC',1.5);S.game=1;S.glitch=cry?0.9:(lt%1.3)<0.08?0.5:0;S.vign=0.6;},
  zash_alone_street:(u,t)=>{mood('dusk');const Z=st('me',0,0,4,0,'sad');Z.head.rotation.x=0.15;world.phone.visible=true;world.phone.scale.setScalar(0.55);world.phone.position.copy(handOf('me').add(V3(0,-0.3,0.2)));world.phone.rotation.set(0.2,0,0);
    carAt('red',-3.5,0,-10,0.7,0,0,0);carAt('cop1',3.8,0,-22,-0.4,0,0,0);world.cars.cop1.userData.lights.forEach(l=>l.material.emissiveIntensity=0.05);carAt('yellow',5,0.2,-6,2.2,0,Math.PI,0);heliAt(world.heli,-5,1.2,-34,0.6,0,0.5,0);
    const tw=world.tumble;tw.visible=true;tw.position.set(lerp(-8,7,u),1.1+Math.abs(Math.sin(t*5))*0.5,10);tw.rotation.z=-t*4;dolly(V3(0.5,9.5,27),V3(0.3,7.5,22),V3(0,4,0),V3(0,4.4,2),u,48,44);showOnly(['me']);S.vign=0.6;S.grade='cold';},
  drop_phone:(u,t,lt)=>{mood('dusk');const Z=st('me',0,0,4,0,'angry');Z.armR.rotation.set(-0.2,0,0.25);const k=easeIn(clamp(lt/0.75,0,1));const b=lt>0.75?Math.max(0,Math.sin((lt-0.75)*9))*0.35*Math.exp(-(lt-0.75)*4):0;
    world.phone.visible=true;world.phone.scale.setScalar(0.6);world.phone.position.set(1.0,lerp(3.6,0.12,k)+b,5.6);world.phone.rotation.set(lerp(0.3,Math.PI/2,k),lt*3*(1-k),lerp(0.4,0.1,k));world.phoneScr.material.emissive.setHSL(0.6,0.5,lt>0.75?0.08:0.5);
    camAt(V3(2.6,0.7,9.2),V3(0.8,1.3,5.2),44);showOnly(['me']);S.focus={x:0.5,y:0.6,r:0.45};S.shakeA=lt>0.75&&lt<1.0?0.12:0;S.grade='cold';S.vign=0.65;},
  grab_controller:(u,t,lt)=>{mood('liv');world.livL[0].color.setHex(0x40ff90);world.livL[0].intensity=0.9+0.25*Math.sin(t*11);world.hemi.intensity=0.5;world.hemi.color.setHex(0xfff0e0);world.tv.material.emissive.setHex(0x40ff90);const k=easeOut(lt/0.6);const Z=st('me',LIV,0,2,0,'angry',{blink:false});Z.armL.rotation.set(lerp(-0.2,-1.25,k),0,-0.36);Z.armR.rotation.set(lerp(-0.2,-1.25,k),0,0.36);Z._noIdle=true;
    world.pad.visible=true;world.pad.position.copy(handOf('me').add(handOf('me','armL')).multiplyScalar(0.5).add(V3(0,0.15,0.25)));world.pad.rotation.set(0.5,Math.PI,0);
    const hp=head('me');dolly(V3(LIV+1.6,4.4,8.4),V3(LIV+1.0,4.6,7.2),hp.clone().add(V3(0,-0.9,0)),hp.clone().add(V3(0,-0.7,0)),u,42,38);showOnly(['me']);S.speed={k:0.25*k,col:'#80ffb0'};S.vign=0.7;},
  end_card:(u,t,lt)=>{mood('liv');world.livL[0].color.setHex(0x40ff90);world.livL[0].intensity=0.9+0.25*Math.sin(t*11);world.hemi.intensity=0.5;world.hemi.color.setHex(0xfff0e0);const Z=st('me',LIV,0,2,0,'angry',{blink:false});Z._talk='zash';Z.armL.rotation.set(-1.25,0,-0.36);Z.armR.rotation.set(-1.25,0,0.36);Z._noIdle=true;
    world.pad.visible=true;world.pad.position.copy(handOf('me').add(handOf('me','armL')).multiplyScalar(0.5).add(V3(0,0.15,0.25)));world.pad.rotation.set(0.5,Math.PI,0);
    const hp=head('me');camAt(V3(LIV+0.6,5.2,9.4),hp.clone().add(V3(0,-0.1,0)),40);showOnly(['me']);S.endLines=clamp(lt/0.3,0,1);S.follow=clamp((lt-1.6)/0.4,0,1);S.vign=0.7;S.black=clamp((u-0.95)/0.05,0,1)*0.85;},
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
  if(S.endLines){const k=easeOut(S.endLines);og.save();og.globalAlpha=k;og.translate(W/2,H*0.15);og.scale(0.8+0.2*k,0.8+0.2*k);T('PART 2?',0,-H*0.055,W*0.15,'#7aff9a','#0a1a10',W*0.02);og.fillStyle='rgba(0,0,0,0.72)';RR(-W*0.45,H*0.005,W*0.9,H*0.105,H*0.02);og.fill();T('SEND THIS TO THE FRIEND',0,H*0.033,W*0.058,'#ffffff');T("WHO'D GET SUCKED IN FIRST",0,H*0.08,W*0.06,'#ffd23f');og.restore();}

  const vg=og.createRadialGradient(W/2,H*0.48,H*0.28,W/2,H/2,H*0.78);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,`rgba(0,0,0,${S.vign||0.35})`);og.fillStyle=vg;og.fillRect(0,0,W,H);
  const r=rng('gr'+Math.floor(t*24));og.fillStyle='rgba(255,255,255,0.035)';for(let i=0;i<300;i++)og.fillRect(r()*W,r()*H,1.5,1.5);
  if(S.flash>0){og.fillStyle=`rgba(245,235,255,${S.flash})`;og.fillRect(0,0,W,H);}
  if(S.endText){const k=easeOut(S.endText);og.save();og.globalAlpha=k;og.translate(W/2,H*0.14);og.scale(0.8+0.2*k,0.8+0.2*k);og.rotate(-0.03);og.fillStyle='rgba(0,0,0,0.72)';RR(-W*0.44,-H*0.06,W*0.88,H*0.12,H*0.02);og.fill();
    T('SEND THIS TO YOUR',0,-H*0.024,W*0.062,'#ffffff');T('UNEMPLOYED FRIEND',0,H*0.03,W*0.075,'#ffd23f');og.restore();}
  if(S.follow){const k=easeOut(S.follow),p=1+0.05*Math.sin(t*7);og.save();og.translate(W/2,H*0.88);og.scale(k*p,k*p);og.fillStyle='#ff2a3a';RR(-W*0.24,-H*0.032,W*0.48,H*0.064,H*0.03);og.fill();T('FOLLOW',0,0,W*0.075,'#fff');og.restore();}
  if(S.black>0){og.fillStyle=`rgba(0,0,0,${S.black})`;og.fillRect(0,0,W,H);}
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
const KEYS=['phone2','stars','tags','bubble','game','tv','banner','glitch','tint','sirenWash','endLines','phone','huss','era','sparkle','pow','scratch','stink','fly','dim','topTag','flash','black','shakeA','zoomPunch','speed','focus','vign','grade','rain','splash','hearts','heartPop','endText','follow'];
S.frame=function(f,q){const t=f/TL.fps;const shot=TL.shots.find(s=>t>=s.s&&t<s.e)||TL.shots[TL.shots.length-1];
  KEYS.forEach(k=>S[k]=null);hideAll();
  if(shot!==curShot){curShot=shot;showOnly([]);}
  Object.values(chars).forEach(c=>{c.rotation.set(0,0,0);});
  const u=(t-shot.s)/(shot.e-shot.s),lt=t-shot.s;scene.updateMatrixWorld(true);
  Object.values(chars).forEach(c=>c.scale.setScalar(1));chars.max.scale.setScalar(0.82);(SH[shot.name]||SH.end_card)(u,t,lt);
  act(t);scene.updateMatrixWorld(true);
  handheld(t,0.03);if(S.shakeA)shake(S.shakeA,t);
  world.sun.target.position.copy(world.look);world.sun.position.copy(world.look).add(V3(46,48,14));scene.updateMatrixWorld(true);R.render(scene,cam);
  og.globalAlpha=1;og.globalCompositeOperation='source-over';og.filter='none';og.fillStyle='#000';og.fillRect(0,0,W,H);
  if(S.zoomPunch){const z=1+0.06*S.zoomPunch;og.drawImage(R.domElement,(W-W*z)/2,(H-H*z)/2,W*z,H*z);}else composite(R.domElement);
  const m=world.mood;const grade=S.game?'saturate(1.7) contrast(1.15) hue-rotate(-12deg)':S.grade==='cold'?'contrast(1.2) saturate(0.85) hue-rotate(6deg)':S.grade==='sepia'?'sepia(0.6) contrast(1.12) saturate(0.95)':S.grade==='bw'?'grayscale(1) contrast(1.25) brightness(1.05)':S.grade==='warm'?'contrast(1.05) saturate(1.15) sepia(0.15)':S.grade==='drama'?'contrast(1.25) saturate(0.6)':m==='rain'||m==='flip'?'contrast(1.12) saturate(0.85) hue-rotate(8deg)':'contrast(1.2) saturate(1.5)';
  gg.clearRect(0,0,W,H);gg.drawImage(out,0,0);og.filter=grade;og.drawImage(gC,0,0);og.filter='none';
  og.filter=`blur(${Math.round(W*0.016)}px) brightness(1.2)`;og.globalCompositeOperation='screen';og.globalAlpha=0.17;og.drawImage(R.domElement,0,0,W,H);og.filter='none';og.globalCompositeOperation='source-over';og.globalAlpha=1;
  drawOverlays(t);drawCaption(t);
  return out.toDataURL('image/jpeg',q||0.94);};
})();
