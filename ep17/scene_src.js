/* Episode 17 "The Job Thief" (comedy parody, narrator Zash). Robert is an original block caricature who steals
   every job in town; a sepia backstory montage (magic school, sparkly vampire, rich kid, bat suit, detective); Zash
   has no job to steal; yin and yang; Robert steals his unemployment. No trademarked names or logos.
   ep17/scene.js = this + cast_ep17.js (build_scene.py). Entry points: SAMPLE.init(timeline, W, H, fontUrl), SAMPLE.frame(f) */
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

/* ---------------- world */
const COURT=200, CAFE=300, KIT=400, CASTLE=500, FOREST=600, MAN=700, ROOF=800, FOG=900, LIV=1000, YIN=1100;
function brickTex(){return canvasTex(256,256,(g,w,h)=>{g.fillStyle='#5a3028';g.fillRect(0,0,w,h);for(let y=0;y<8;y++)for(let x=-1;x<5;x++){g.fillStyle=`rgb(${120+((x*7+y*13)%30)},${56+((x*5+y*3)%14)},${44})`;g.fillRect(x*64+(y%2)*32+3,y*32+3,58,26);}});}
function stoneWallTex(){return canvasTex(256,256,(g,w,h)=>{g.fillStyle='#3a3836';g.fillRect(0,0,w,h);const r=rng('sw');for(let y=0;y<6;y++)for(let x=-1;x<4;x++){const v=70+r()*30|0;g.fillStyle=`rgb(${v},${v-4},${v-10})`;g.fillRect(x*80+(y%2)*40+3,y*44+3,74,38);}});}
function courtTex(){return canvasTex(512,512,(g,w,h)=>{g.fillStyle='#c8743a';g.fillRect(0,0,w,h);g.strokeStyle='#fff';g.lineWidth=8;g.strokeRect(20,20,w-40,h-40);g.beginPath();g.arc(w/2,60,150,0,Math.PI);g.stroke();g.strokeRect(w/2-70,20,140,200);g.beginPath();g.moveTo(20,h-20);g.lineTo(w-20,h-20);g.stroke();});}
function menuTex(){return canvasTex(512,320,(g,w,h)=>{g.fillStyle='#1e2420';g.fillRect(0,0,w,h);g.strokeStyle='#c8a060';g.lineWidth=8;g.strokeRect(8,8,w-16,h-16);g.fillStyle='#f4ead8';g.textAlign='left';g.font=`54px ${FONT}`;g.fillText('MENU',30,72);g.font=`34px ${FONT}`;[['LATTE','$4'],['ESPRESSO','$3'],['MOCHA','$5'],['CROISSANT','$3']].forEach(([a,b],i)=>{g.fillText(a,30,130+i*44);g.fillText(b,w-90,130+i*44);});});}
function latteTex(){return canvasTex(128,128,(g,w,h)=>{g.fillStyle='#8a5a34';g.beginPath();g.arc(64,64,62,0,7);g.fill();g.fillStyle='#f4e8d4';g.beginPath();g.arc(64,70,30,0,7);g.fill();g.fillStyle='#f4e8d4';g.beginPath();g.moveTo(30,52);g.quadraticCurveTo(50,10,100,40);g.quadraticCurveTo(70,30,40,58);g.fill();g.fillStyle='#8a5a34';g.fillRect(52,64,6,6);g.fillRect(70,64,6,6);g.fillRect(56,82,18,4);});}
function moneyTex(){return canvasTex(128,64,(g,w,h)=>{g.fillStyle='#5aa060';g.fillRect(0,0,w,h);g.strokeStyle='#2a6a34';g.lineWidth=4;g.strokeRect(4,4,w-8,h-8);g.fillStyle='#2a6a34';g.font=`36px ${FONT}`;g.textAlign='center';g.fillText('$',w/2,h/2+13);});}
function portraitTex(){return canvasTex(256,320,(g,w,h)=>{g.fillStyle='#3a2a1a';g.fillRect(0,0,w,h);g.fillStyle='#c8a050';g.fillRect(10,10,w-20,h-20);g.fillStyle='#2a3a4a';g.fillRect(24,24,w-48,h-48);[[90,'#e8c8a0','#1a1a1a'],[170,'#e8c8a0','#6a2a3a']].forEach(([x,sk,cl])=>{g.fillStyle=sk;g.fillRect(x-24,90,48,48);g.fillStyle=cl;g.fillRect(x-34,140,68,110);g.fillStyle='#3a2a1a';g.fillRect(x-26,82,52,14);});g.fillStyle='#f4e0a0';g.font=`22px ${FONT}`;g.textAlign='center';g.fillText('MOM & DAD',w/2,h-40);});}
function yinTex(){return canvasTex(512,512,(g,w,h)=>{const c=w/2,r=w/2-8;g.fillStyle='#fff';g.beginPath();g.arc(c,c,r,0,7);g.fill();g.fillStyle='#111';g.beginPath();g.arc(c,c,r,-Math.PI/2,Math.PI/2);g.arc(c,c+r/2,r/2,Math.PI/2,-Math.PI/2,true);g.arc(c,c-r/2,r/2,Math.PI/2,-Math.PI/2);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(c,c+r/2,r/7,0,7);g.fill();g.fillStyle='#111';g.beginPath();g.arc(c,c-r/2,r/7,0,7);g.fill();g.strokeStyle='#d4af37';g.lineWidth=10;g.beginPath();g.arc(c,c,r,0,7);g.stroke();});}
function wantedTex(){return canvasTex(512,700,(g,w,h)=>{g.fillStyle='#e8d8b0';g.fillRect(0,0,w,h);g.strokeStyle='#6a4a2a';g.lineWidth=10;g.strokeRect(14,14,w-28,h-28);g.fillStyle='#2a1a0e';g.textAlign='center';g.font=`110px ${FONT}`;g.fillText('WANTED',w/2,140);
  g.fillStyle='#f4e8cc';g.fillRect(96,175,320,300);g.strokeStyle='#2a1a0e';g.lineWidth=6;g.strokeRect(96,175,320,300);
  g.fillStyle='#ecd4bc';g.fillRect(166,250,180,170);g.fillStyle='#4a3426';for(let i=0;i<9;i++){g.beginPath();g.moveTo(150+i*24,262);g.lineTo(162+i*24,200+((i*37)%30));g.lineTo(178+i*24,262);g.fill();}g.fillRect(156,236,200,30);
  g.fillStyle='#2a1a0e';g.fillRect(200,320,34,12);g.fillRect(278,320,34,12);g.fillStyle='#5a6a78';g.fillRect(208,334,18,16);g.fillRect(286,334,18,16);g.strokeStyle='#2a1a0e';g.lineWidth=5;g.beginPath();g.moveTo(232,392);g.quadraticCurveTo(262,402,290,384);g.stroke();
  g.fillStyle='rgba(74,52,38,0.35)';for(let i=0;i<60;i++)g.fillRect(180+((i*53)%150),370+((i*29)%45),3,3);
  g.fillStyle='#b8201a';g.font=`72px ${FONT}`;g.fillText('JOB THIEF',w/2,560);g.fillStyle='#2a1a0e';g.font=`40px ${FONT}`;g.fillText('REWARD: 1 JOB',w/2,630);});}
function houseCol(i){return ['#e8d0a0','#a8c8e0','#e0a8a0','#c8e0a8','#e0c8e8','#f0e0b0'][i%6];}
function buildTown(){const g=new THREE.Group();scene.add(g);
  plane(160,200,SM({color:'#6a9a4a',roughness:1}),0,-0.02,-20,-Math.PI/2,g);plane(10,200,SM({color:'#4a4a50',roughness:0.9}),0,0,-20,-Math.PI/2,g);
  [-1,1].forEach(sd=>plane(3,200,SM({color:'#b8b2a8',roughness:0.9}),sd*6.5,0.03,-20,-Math.PI/2,g));
  for(let z=-8;z>=-60;z-=4)plane(0.3,1.8,SM({color:'#f2e8a0',roughness:0.8}),0,0.04,z,-Math.PI/2,g);
  world.doors=[];let i=0;for(let z=14;z>=-62;z-=15){[-1,1].forEach(sd=>{const hx=sd*15;const c=houseCol(i++);box(11,8,10,SM({color:c,roughness:0.9}),hx,4,z,g);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(8.4,4.4,4),SM({color:'#8a3a2a',roughness:0.9}));roof.position.set(hx,10.2,z);roof.rotation.y=Math.PI/4;roof.scale.set(1,1,0.9);g.add(roof);
    [-2.8,2.8].forEach(dz=>box(0.2,2.2,2.2,SM({color:'#bfe0ff',emissive:0x6a8aa8,emissiveIntensity:0.3}),hx-sd*5.52,5.4,z+dz*1.1,g));
    const piv=new THREE.Group();piv.position.set(hx-sd*5.55,0,z-1.6);g.add(piv);const d=box(0.25,5,3.2,SM({color:'#5a3a24',roughness:0.8}),0,2.5,1.6,piv);box(0.3,0.3,0.3,'#d4af37',-sd*0.15,2.5,2.8,piv);
    box(0.3,5.2,3.6,SM({color:'#1a140e',roughness:1}),hx-sd*5.45,2.6,z,g);piv.userData={sd,z};world.doors.push(piv);});}
  const tw=new THREE.Mesh(new THREE.IcosahedronGeometry(1.1,1),new THREE.MeshStandardMaterial({color:0x8a6a3a,wireframe:true}));scene.add(tw);world.tumble=tw;
  world.poster=plane(3.2,4.4,SM({map:wantedTex(),roughness:0.85,side:THREE.DoubleSide}),9.38,5.6,2.6,0,g);world.poster.rotation.y=-Math.PI/2;world.posterZ=V3(9.38,5.6,2.6);
  world.townL=[pl(0xfff0d0,0.6,120,0,30,0)];world.sun=new THREE.DirectionalLight(0xfff2d8,0.9);world.sun.position.set(30,50,40);scene.add(world.sun);}
function doorsClose(k,stag){world.doors.forEach((d,i)=>{const kk=clamp((k-(stag?i*0.05:0))*1.8,0,1);d.rotation.y=d.userData.sd*lerp(1.5,0,easeIn(kk));});}
function buildCourt(){const g=new THREE.Group();g.position.set(COURT,0,0);scene.add(g);plane(80,80,SM({color:'#5a7a4a',roughness:1}),0,-0.02,0,-Math.PI/2,g);plane(28,36,SM({map:courtTex(),roughness:0.7}),0,0.01,-4,-Math.PI/2,g);
  box(0.6,9,0.6,'#3a3a40',0,4.5,-13.5,g);box(6,3.6,0.3,SM({color:'#f4f4f4',roughness:0.5}),0,10.6,-12.8,g);box(2,1.4,0.32,SM({color:'#e04a2a'}),0,10.0,-12.75,g);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(0.95,0.09,8,24),SM({color:'#ff5a1a',roughness:0.4}));ring.rotation.x=Math.PI/2;ring.position.set(0,9.2,-11.6);g.add(ring);world.ring=V3(COURT,9.2,-11.6);
  const net=new THREE.Mesh(new THREE.CylinderGeometry(0.95,0.6,1.2,12,1,true),new THREE.MeshStandardMaterial({color:0xffffff,wireframe:true}));net.position.set(0,8.6,-11.6);g.add(net);
  const ball=new THREE.Mesh(new THREE.SphereGeometry(0.55,16,12),SM({color:'#e0702a',roughness:0.6}));scene.add(ball);world.ball=ball;ball.visible=false;
  for(let i=0;i<6;i++)box(10,0.5,1.5,'#9aa0a8',-12+((i%2)*24),0.25+Math.floor(i/2)*0.9,8+Math.floor(i/2)*1.4,g);
  world.courtL=[pl(0xfff4e0,1.0,80,COURT,20,4)];}
function buildCafe(){const g=new THREE.Group();g.position.set(CAFE,0,0);scene.add(g);const ft=tileTex('#6a4a34','#5a3c28');ft.wrapS=ft.wrapT=THREE.RepeatWrapping;ft.repeat.set(6,6);plane(40,40,SM({map:ft,roughness:0.7}),0,0,0,-Math.PI/2,g);
  box(40,16,0.4,SM({map:wallTex('#e8d8c0','#7a5a3a'),roughness:0.9}),0,8,-9,g);[-1,1].forEach(sd=>box(0.4,16,40,SM({color:'#e2d2b8',roughness:0.9}),sd*20,8,0,g));
  plane(7,4.4,SM({map:menuTex(),roughness:0.8}),-4,10.5,-8.7,0,g);box(14,3.4,2.6,SM({color:'#4a3022',roughness:0.7}),0,1.7,-2,g);box(14.4,0.3,3,SM({color:'#d8c8b0',roughness:0.4}),0,3.5,-2,g);
  box(2.6,2.4,1.6,SM({color:'#b8bcc4',metalness:0.7,roughness:0.3}),3.5,4.85,-2.4,g);box(2.2,0.6,1.4,'#2a2a2e',3.5,6.3,-2.4,g);
  for(let i=0;i<4;i++){const c=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.24,0.6,10),SM({color:'#f4f2ec'}));c.position.set(-4+i*0.9,3.95,-1.6);g.add(c);}
  box(3,1.2,1.6,SM({color:'#f2e6c8',roughness:0.3,transparent:true,opacity:0.6}),-4.4,4.25,-2.2,g);for(let i=0;i<3;i++)box(0.7,0.4,0.5,'#d89a4a',-5.2+i*0.8,4.0,-2.2,g);
  const cup=new THREE.Group();const cm=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.4,0.7,14),SM({color:'#f4f2ec',roughness:0.4}));cup.add(cm);const top=new THREE.Mesh(new THREE.CircleGeometry(0.46,20),SM({map:latteTex(),roughness:0.6}));top.rotation.x=-Math.PI/2;top.position.y=0.36;cup.add(top);scene.add(cup);cup.visible=false;world.cup=cup;
  world.cafeL=[pl(0xffe0b0,1.1,60,CAFE,12,6),pl(0xffd8a0,0.5,30,CAFE-8,8,-4)];}
function buildKitchen(){const g=new THREE.Group();g.position.set(KIT,0,0);scene.add(g);const ft=tileTex('#e8e4d8','#c8c0b0');ft.wrapS=ft.wrapT=THREE.RepeatWrapping;ft.repeat.set(5,5);plane(30,30,SM({map:ft,roughness:0.5}),0,0,4,-Math.PI/2,g);
  const wm=SM({map:wallTex('#f2e2b8','#d8a860'),roughness:0.9});const bw=(w,h,x,y)=>box(w,h,0.4,wm,x,y,-8,g);bw(12,14,-9,7);bw(12,14,9,7);bw(6,4,0,2);bw(6,5,0,11.5);
  box(6.2,0.3,0.6,'#f4f4f4',0,4.0,-7.8,g);box(0.3,5.2,0.6,'#f4f4f4',-3,6.5,-7.8,g);box(0.3,5.2,0.6,'#f4f4f4',3,6.5,-7.8,g);
  [-1,1].forEach(sd=>box(0.4,14,26,wm,sd*15,7,5,g));
  box(10,3.4,2.6,SM({color:'#c8d8e0',roughness:0.6}),-8,1.7,-6.5,g);box(10.2,0.3,2.8,'#f0ece4',-8,3.5,-6.5,g);box(3,0.15,2,'#1a1a1e',-6,3.7,-6.5,g);
  const pot=new THREE.Group();const pm=new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.7,1.0,16),SM({color:'#9aa0aa',metalness:0.7,roughness:0.3}));pot.add(pm);const soup=new THREE.Mesh(new THREE.CircleGeometry(0.75,16),SM({color:'#d86a3a',roughness:0.5}));soup.rotation.x=-Math.PI/2;soup.position.y=0.45;pot.add(soup);scene.add(pot);world.pot=pot;pot.visible=false;
  plane(40,30,SM({color:'#7aa85a',roughness:1}),0,-0.03,-20,-Math.PI/2,g);box(40,6,0.6,'#d8c8a8',0,3,-26,g);
  world.kitL=[pl(0xfff4e0,1.0,60,KIT,12,4),pl(0xfff8e8,0.9,30,KIT,8,-14)];}
function buildCastle(){const g=new THREE.Group();g.position.set(CASTLE,0,0);scene.add(g);const st2=stoneWallTex();st2.wrapS=st2.wrapT=THREE.RepeatWrapping;st2.repeat.set(4,3);const wm=SM({map:st2,roughness:0.95});
  const ft=tileTex('#4a4440','#3e3834');ft.wrapS=ft.wrapT=THREE.RepeatWrapping;ft.repeat.set(6,10);plane(40,80,SM({map:ft,roughness:0.8}),0,0,-10,-Math.PI/2,g);
  [-1,1].forEach(sd=>box(1,40,80,wm,sd*20,20,-10,g));box(40,40,1,wm,0,20,-50,g);
  for(let z=-40;z<=10;z+=12)[-1,1].forEach(sd=>{const w=box(0.3,12,4,SM({color:'#3a5a9a',emissive:0x4a6ab8,emissiveIntensity:0.7}),sd*19.4,16,z,g);});
  [[-7,'#7a1a1a'],[7,'#1a5a2a']].forEach(([x,c])=>{box(4,0.4,50,SM({color:'#5a3a24',roughness:0.8}),x,3.2,-14,g);[-1,1].forEach(sd=>box(1.2,1.8,50,SM({color:'#4a2e1c'}),x+sd*3,0.9,-14,g));box(3,12,0.2,SM({color:c,roughness:0.9}),x,26,-49,g);});
  [[-14,'#c8a020'],[14,'#1a2a6a']].forEach(([x,c])=>box(3,12,0.2,SM({color:c,roughness:0.9}),x,26,-49,g));
  world.candles=[];const r=rng('cd');for(let i=0;i<40;i++){const c=new THREE.Group();const cm=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,0.9,8),SM({color:'#f4ecd4',emissive:0xffe0a0,emissiveIntensity:0.3}));c.add(cm);const f=sprite(glowTex('rgba(255,200,90,0.9)'),0.9,c);f.position.y=0.65;c.position.set(CASTLE+(r()-0.5)*32,14+r()*12,-40+r()*48);c.userData.ph=r()*6;scene.add(c);world.candles.push(c);}
  const sky=plane(40,80,new THREE.MeshBasicMaterial({map:canvasTex(256,256,(g2,w,h)=>{g2.fillStyle='#0c1030';g2.fillRect(0,0,w,h);const rr=rng('st');for(let i=0;i<120;i++){g2.fillStyle=`rgba(255,255,255,${0.4+rr()*0.6})`;g2.fillRect(rr()*w,rr()*h,1.5,1.5);}})}),0,39.5,-10,Math.PI/2,g);
  world.castleL=[pl(0xffc070,1.4,60,CASTLE,18,-8),pl(0x8aa0ff,0.5,60,CASTLE,20,-35)];}
function buildForest(){const g=new THREE.Group();g.position.set(FOREST,0,0);scene.add(g);plane(120,120,SM({color:'#5a8a3a',roughness:1}),0,-0.02,-20,-Math.PI/2,g);
  const r=rng('tr');for(let i=0;i<34;i++){const a=r()*Math.PI*2,d=12+r()*30;const x=Math.cos(a)*d,z=-10+Math.sin(a)*d;box(1.2,10,1.2,'#5a3e28',x,5,z,g);const cn=new THREE.Mesh(new THREE.ConeGeometry(4+r()*2,12+r()*4,7),SM({color:'#2a5a30',roughness:0.95}));cn.position.set(x,14,z);g.add(cn);}
  world.forestL=[pl(0xfff0c0,1.6,80,FOREST+4,24,10)];}
function buildMansion(){const g=new THREE.Group();g.position.set(MAN,0,0);scene.add(g);const ft=tileTex('#5a2a20','#4a2218');ft.wrapS=ft.wrapT=THREE.RepeatWrapping;ft.repeat.set(5,5);plane(40,40,SM({map:ft,roughness:0.6}),0,0,0,-Math.PI/2,g);
  const wm=SM({map:wallTex('#3a2a20','#6a4a2a'),roughness:0.9});box(40,18,0.4,wm,0,9,-10,g);[-1,1].forEach(sd=>box(0.4,18,40,wm,sd*20,9,0,g));
  plane(4,5,SM({map:portraitTex(),roughness:0.7}),0,10,-9.7,0,g);box(10,3.2,3.4,SM({color:'#3a2014',roughness:0.5}),0,1.6,-3,g);box(10.4,0.3,3.8,'#2a160e',0,3.35,-3,g);
  const mt=moneyTex();for(let i=0;i<5;i++)for(let k=0;k<3;k++)box(1.2,0.5,0.6,SM({map:mt}),-4+i*0.6,3.75+k*0.5,-3.8+(i%2)*0.3,g);
  world.bills=[];const r=rng('bl');for(let i=0;i<30;i++){const b=plane(0.9,0.45,SM({map:mt,side:THREE.DoubleSide}),MAN+(r()-0.5)*14,0,(r()-0.5)*10,0);b.userData={x:b.position.x,z:b.position.z,ph:r()*10,sp:0.8+r()*0.6};world.bills.push(b);}
  world.manL=[pl(0xffd090,1.2,50,MAN,12,4),pl(0xffe0b0,0.5,30,MAN-10,8,-6)];}
function buildRoof(){const g=new THREE.Group();g.position.set(ROOF,0,0);scene.add(g);box(24,1,24,SM({color:'#3a3a40',roughness:0.9}),0,-0.5,0,g);box(24,1.4,1,'#4a4a52',0,0.7,11.5,g);
  const r=rng('rf');for(let i=0;i<30;i++){const a=r()*Math.PI*2,d=24+r()*50;const hgt=30+r()*60;const bt=bldgTex('r'+i);box(10,hgt,10,SM({map:bt,emissive:0xffffff,emissiveMap:bt,emissiveIntensity:0.45,roughness:0.9}),Math.cos(a)*d,hgt/2-50+r()*20,Math.sin(a)*d-20,g);}
  world.moon=sprite(glowTex('rgba(240,240,255,0.95)'),26,scene);world.moon.position.set(ROOF-6,28,-70);
  world.roofL=[pl(0xa8b8f0,2.8,60,ROOF+4,10,18),pl(0xb0c0ff,0,120,ROOF,40,-10)];}
function buildFogSt(){const g=new THREE.Group();g.position.set(FOG,0,0);scene.add(g);const ct=tileTex('#4a4a50','#3c3c42');ct.wrapS=ct.wrapT=THREE.RepeatWrapping;ct.repeat.set(4,16);plane(16,80,SM({map:ct,roughness:0.7}),0,0,-20,-Math.PI/2,g);
  const bt=brickTex();bt.wrapS=bt.wrapT=THREE.RepeatWrapping;bt.repeat.set(10,3);[-1,1].forEach(sd=>box(1,16,80,SM({map:bt,roughness:0.9}),sd*8,8,-20,g));
  box(0.3,10,0.3,'#1a1a1e',5,5,-2,g);box(1.2,1.4,1.2,SM({color:'#ffe0a0',emissive:0xffc860,emissiveIntensity:1.2}),5,10.6,-2,g);
  world.fogL=[pl(0xffc070,1.6,30,FOG+5,10,-2),pl(0x8090b0,0.6,60,FOG,12,10)];}
function buildLiving(){const g=new THREE.Group();g.position.set(LIV,0,0);scene.add(g);plane(30,30,SM({color:'#6a5a7a',roughness:1}),0,0,0,-Math.PI/2,g);
  box(30,16,0.4,SM({map:wallTex('#4a5a6a','#3a4a5a'),roughness:0.9}),0,8,-8,g);box(10,2,3,SM({color:'#8a3a3a',roughness:0.95}),0,1.6,-5.5,g);box(10,3.2,1,SM({color:'#7a3030',roughness:0.95}),0,3.6,-7.2,g);[-1,1].forEach(sd=>box(1,2.6,3,SM({color:'#7a3030'}),sd*5.3,2.0,-5.5,g));
  box(5,3,0.4,'#111',0,5,9.6,g);world.tv=plane(4.6,2.6,SM({color:'#4a7aff',emissive:0x4a7aff,emissiveIntensity:1.0}),0,5,9.35,0,g);world.tv.rotation.y=Math.PI;
  const chips=box(0.9,1.2,0.4,SM({color:'#f2c020',roughness:0.5}),0,0,0);chips.visible=false;world.chips=chips;
  world.livL=[pl(0x6a8aff,1.2,30,LIV,6,6),pl(0xffd8a0,0.4,30,LIV-8,10,0)];}
function buildYin(){const g=new THREE.Group();g.position.set(YIN,0,0);scene.add(g);const disc=new THREE.Mesh(new THREE.CircleGeometry(9,64),new THREE.MeshBasicMaterial({map:yinTex()}));disc.position.set(0,7,-8);g.add(disc);world.yin=disc;
  plane(80,80,new THREE.MeshBasicMaterial({map:canvasTex(256,256,(g2,w,h)=>{const gr=g2.createRadialGradient(w/2,h/2,10,w/2,h/2,w/1.2);gr.addColorStop(0,'#5a3a8a');gr.addColorStop(1,'#120a20');g2.fillStyle=gr;g2.fillRect(0,0,w,h);})}),0,7,-12,0,g);
  plane(40,40,SM({color:'#1a1028',roughness:0.4,metalness:0.4}),0,0,0,-Math.PI/2,g);world.yinL=[pl(0xffe0ff,1.4,40,YIN,10,8),pl(0xd4af37,0.8,40,YIN,4,-4)];}
function buildProps(){const mg=new THREE.Group();const lens=new THREE.Mesh(new THREE.CircleGeometry(0.75,24),new THREE.MeshStandardMaterial({color:0xcfe8ff,transparent:true,opacity:0.25,roughness:0.05,metalness:0.5,side:THREE.DoubleSide}));mg.add(lens);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(0.78,0.09,8,24),SM({color:'#c8a040',metalness:0.8,roughness:0.3}));mg.add(rim);const hd=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.12,1.4,8),SM({color:'#3a2214'}));hd.position.y=-1.5;mg.add(hd);scene.add(mg);mg.visible=false;world.mag=mg;
  const wand=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.08,1.6,6),SM({color:'#4a2a18'}));scene.add(wand);wand.visible=false;world.wand=wand;
  const goon=null;}
function buildWorld(){
  scene=new THREE.Scene();scene.background=new THREE.Color('#9ac8f0');scene.fog=new THREE.Fog(0x9ac8f0,80,220);
  world.hemi=new THREE.HemisphereLight(0xfff4e6,0x40362c,0.8);scene.add(world.hemi);world.look=V3(0,0,0);
  buildTown();buildCourt();buildCafe();buildKitchen();buildCastle();buildForest();buildMansion();buildRoof();buildFogSt();buildLiving();buildYin();buildProps();}
function hideAll(){if(world.poster){world.poster.position.copy(world.posterZ);world.poster.scale.setScalar(1);world.poster.rotation.set(0,-Math.PI/2,0);}world.ball.visible=false;world.cup.visible=false;world.pot.visible=false;world.mag.visible=false;world.wand.visible=false;world.chips.visible=false;world.tumble.visible=false;
world.bills.forEach(b=>b.visible=false);world.doors.forEach(d=>d.rotation.y=0);}

/* ---------------- characters */
function dm(a,b){const o=JSON.parse(JSON.stringify(a));for(const k in b){if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])&&o[k]&&typeof o[k]==='object'&&k!=='torso')o[k]=dm(o[k],b[k]);else o[k]=JSON.parse(JSON.stringify(b[k]));}return o;}
// Robert: an original block caricature (tousled brown hair, stubble, sharp eyes, long dark coat)
const R0={id:'robert',name:'Robert',skin:'#ecd4bc',hair:{style:'messy',color:'#4a3426'},face:{eyes:'sharp',eyeColor:'#5a6a78',brows:'thick',browColor:'#3a2a1e',mouth:'smirk',beard:'stubble',beardColor:'#4a3426',nose:'pointy'},
  torso:{inner:'#1a1a1e',outer:{style:'coat2',color:'#2c2c32',length:'long',btn:'#5a5a60'}},sleeves:{color:'#2c2c32',len:'full'},pants:{color:'#16161a',fabric:'wool',shoes:'#0b0b0b',shoeStyle:'dress'}};
const RV={
  rb:{},
  rball:{torso:{inner:'#e0482c'},sleeves:{color:'#e0482c',len:'none'},pants:{color:'#e0482c',style:'shorts',shoes:'#f4f4f4'},extras:['wristband:#f4f4f4']},
  rbar:{torso:{inner:'#f2efe6',collar:true},sleeves:{color:'#f2efe6',len:'rolled'},extras:['apron:#3a2a20']},
  rwife:{torso:{inner:'#f4a6c4'},sleeves:{color:'#f4a6c4',len:'short'},pants:{color:'#d86a9a',shoes:'#f4f4f4'},extras:['apron:#ffffff','pearls']},
  rwiz:{torso:{inner:'#202024',tie:{color:'#c8a020'},collar:true,outer:{style:'cloak',color:'#121216'}},sleeves:{color:'#121216',len:'full'},extras:['scarf:#d8b020']},
  rvamp:{skin:'#f6eee8',face:{eyeColor:'#c8962a'},torso:{inner:'#e8e4dc',outer:{style:'bomber',color:'#6a6a70'}},sleeves:{color:'#6a6a70',len:'full'},pants:{color:'#3a3a44',fabric:'denim'}},
  rrich:{torso:{inner:'#f2f0ea',collar:true,tie:{color:'#7a1a2a'},outer:{style:'suit',color:'#1c1c22',btn:'#d4af37'}},sleeves:{color:'#1c1c22',len:'full',cuff:'#f2f0ea'},extras:['watch','pocketsquare:#7a1a2a']},
  rbat:{hair:{style:'buzz',color:'#0c0c10'},torso:{inner:'#0e0e12',outer:{style:'cloak',color:'#08080c'}},sleeves:{color:'#0e0e12',len:'full'},pants:{color:'#0e0e12',shoes:'#08080a'},extras:['gloves:#08080c']},
  rdet:{torso:{inner:'#e8e4dc',collar:true,tie:{color:'#3a2a1e'},outer:{style:'trench',color:'#8a6a48',btn:'#3a2a1e'}},sleeves:{color:'#8a6a48',len:'full'},pants:{color:'#3a3026'},extras:['scarf:#6a2a2a']},
  rhood:{torso:{inner:'#f2efe6',outer:{style:'hoodie',color:'#d9a23a',fabric:'fleece',strings:'#f4efe2'}},sleeves:{color:'#d9a23a',len:'full',cuff:'#c08d2c',fabric:'fleece'},pants:{color:'#3b5a80',fabric:'denim',jeans:true,shoes:'#efefef'}},
};
const CASTC={me:'leo',goldbank:'goldbank',val:'val',mia:'mia',jet:'jet',nova:'nova',wren:'wren',mom:'mom',dave:'dave',benny:'benny',penny:'penny'};
function buildChars(){const add=(id,c)=>{const g=buildChar(c);scene.add(g);g.visible=false;chars[id]=g;};
  Object.entries(CASTC).forEach(([id,cid])=>add(id,BH.castById(cid)));add('za',dm(BH.castById('leo'),{extras:['apron:#3a2a20']}));
  Object.entries(RV).forEach(([id,v])=>{const c=dm(R0,v);if(v.torso)c.torso=JSON.parse(JSON.stringify(v.torso));add(id,c);});
  Object.values(chars).forEach(c=>c.traverse(o=>{if(o.isMesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m&&m.isMeshStandardMaterial&&m.metalness<0.3&&m.roughness<0.9)m.roughness=0.92;});}));
  // costume pieces the builder doesn't have
  const hd=id=>chars[id].userData.P.head;
  const cm=SM({color:'#ff8ac0',roughness:0.6});for(let i=0;i<5;i++){const c=new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.17,0.62,10),cm);c.rotation.z=Math.PI/2;c.position.set(0,1.42,-0.45+i*0.24);c.rotation.y=(i%2?0.3:-0.3);hd('rwife').add(c);}
  const bk=SM({color:'#0a0a0e',roughness:0.7});const cowl=new THREE.Mesh(new THREE.BoxGeometry(1.42,0.95,1.42),bk);cowl.position.y=1.3;hd('rbat').add(cowl);
  [-1,1].forEach(sd=>{const e=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.8,4),bk);e.position.set(sd*0.45,2.1,0);hd('rbat').add(e);});
  const band=new THREE.Mesh(new THREE.BoxGeometry(1.44,0.3,1.44),bk);band.position.y=0.86;hd('rbat').add(band);
  const tw=SM({map:canvasTex(64,64,(g)=>{g.fillStyle='#7a6248';g.fillRect(0,0,64,64);g.strokeStyle='#4a3a2a';g.lineWidth=3;for(let i=0;i<64;i+=10){g.beginPath();g.moveTo(i,0);g.lineTo(i,64);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(64,i);g.stroke();}}),roughness:0.9});
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.78,0.82,0.62,16),tw);cap.position.y=1.42;hd('rdet').add(cap);const top=new THREE.Mesh(new THREE.SphereGeometry(0.78,16,8,0,Math.PI*2,0,Math.PI/2),tw);top.position.y=1.72;top.scale.y=0.5;hd('rdet').add(top);
  [-1,1].forEach(sd=>{const br=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.08,0.55),tw);br.position.set(0,1.16,sd*0.95);br.rotation.x=sd*0.25;hd('rdet').add(br);const fl=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.5,0.6),tw);fl.position.set(sd*0.82,1.5,0);hd('rdet').add(fl);});
  const bow=new THREE.Mesh(new THREE.SphereGeometry(0.12,8,6),SM({color:'#3a2a1e'}));bow.position.set(0,2.0,0);hd('rdet').add(bow);}

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

const SETL={town:'townL',court:'courtL',cafe:'cafeL',kit:'kitL',castle:'castleL',forest:'forestL',man:'manL',roof:'roofL',fog:'fogL',liv:'livL',yin:'yinL'};
const MOOD={town:['#9ac8f0',0xfff4e6,0.85,0.9],dusk:['#f0a070',0xffb070,0.6,0.7],court:['#9ac8f0',0xfff4e6,0.85,0.9],cafe:['#2a1e16',0xfff0dc,0.55,0],kit:['#9ac8f0',0xfff4e6,0.6,0],castle:['#0c1030',0x8a9ad8,0.35,0],
  forest:['#cfe8ff',0xfff4e0,0.9,0.9],man:['#1a120c',0xffe0b0,0.45,0],roof:['#0a0c1a',0x6a7ab8,0.18,0],fog:['#4a5060',0x9aa4b8,0.35,0],liv:['#101420',0x8a9ad8,0.3,0],yin:['#120a20',0xffe0ff,0.5,0]};
function mood(m){world.mood=m;Object.entries(SETL).forEach(([k,v])=>world[v].forEach(L=>{if(L.userData.i0==null)L.userData.i0=L.intensity;L.intensity=(k===m||(k==='town'&&m==='dusk'))?L.userData.i0:0;}));
  const M=MOOD[m];scene.background.set(M[0]);world.hemi.color.setHex(M[1]);world.hemi.intensity=M[2];world.sun.intensity=M[3];world.sun.color.setHex(m==='dusk'?0xffa060:0xfff2d8);
  if(m==='fog'){scene.fog.color.set('#5a6070');scene.fog.near=4;scene.fog.far=42;}else{scene.fog.color.set(M[0]);scene.fog.near=80;scene.fog.far=260;}}
function sparkleAt(id,n){const hp=proj(head(id).clone().add(V3(0,-2,0)));S.sparkle={x:hp.x,y:hp.y,n:n||18};}
function era(t){S.era=t;S.grade='sepia';S.scratch=1;}
const CROWD=[['mom',1,-1],['dave',-1,-1],['benny',1,-16],['penny',-1,-16]];

const SH={
  doors_slam:(u,t,lt)=>{mood('town');
    if(lt<1.6){doorsClose(lt*0.9,true);const D=st('dave',lerp(-1.2,0.6,lt/1.6),0,lerp(-6,1.5,lt/1.6),0.15,'shocked',{mouthOpen:0.95,blink:false});walk(D,t*1.9);D.armL.rotation.set(0,0,-2.5+Math.sin(t*16)*0.35);D.armR.rotation.set(0,0,2.5+Math.sin(t*16+1.5)*0.35);D.head.rotation.x=-0.15;
      const R=st('rb',0,0,-42,0,'smug');walk(R,t*0.55);const tw=world.tumble;tw.visible=true;tw.position.set(lerp(-7,6,lt/1.6),1.1+Math.abs(Math.sin(lt*6))*0.5,-3);tw.rotation.z=-lt*5;
      camAt(V3(0.4,4.6,10.5-lt*0.6),V3(0,4.4,-12),46);showOnly(['dave','rb']);S.shakeA=lt<0.5?0.35*(1-lt/0.5)+0.04:0.04;S.zoomPunch=lt<0.18?1:0;S.speed={k:0.35,col:'#fff4d8'};S.focus={x:0.5,y:0.45,r:0.45};}
    else{doorsClose(1);const k=easeOut((lt-1.6)/0.18);const P=world.poster;P.position.copy(world.posterZ).add(V3(-lerp(2.2,0,k),0,0));P.scale.setScalar(lerp(1.6,1,k));P.rotation.z=lerp(0.4,-0.05,k);
      camAt(V3(2.8,5.0,2.7),V3(9.4,4.4,2.6),50);showOnly([]);S.shakeA=(lt-1.6)<0.35?0.22*(1-(lt-1.6)/0.35):0;S.zoomPunch=(lt-1.6)<0.15?1:0;S.vign=0.6;}},
  robert_walks:(u,t)=>{mood('town');doorsClose(1);const P=st('rb',0,0,lerp(-32,-26,u),0,'smug');walk(P,t*0.55);P.head.rotation.x=0.05;
    const h=head('rb');dolly(V3(0.8,1.6,-14),V3(0.6,1.8,-16.5),h.clone().add(V3(0,-1.5,0)),h.clone().add(V3(0,-0.8,0)),u,40,34);showOnly(['rb']);S.vign=0.55;S.speed={k:0.15,col:'#e8d8b8'};},
  dunk_steal:(u,t,lt)=>{mood('court');const ring=world.ring;const J=st('jet',COURT,0,lerp(-1,-6,clamp(lt/0.6,0,1)),Math.PI,lt<0.7?'happy':'shocked');
    const jk=clamp((lt-0.3)/0.6,0,1);chars.jet.position.y=Math.sin(jk*Math.PI)*2.6;if(lt<0.6)walk(J,t*1.6);else{J.armR.rotation.set(-2.6,0,0);J.armL.rotation.set(-2.6,0,0);J.head.rotation.x=-0.4;}
    const R=st('rball',COURT,0,ring.z+1.0,Math.PI,'smug');R.armR.rotation.set(-2.95,0,0.1);R.armL.rotation.set(-2.7,0,-0.4);R.legL.rotation.x=0.3;R.legR.rotation.x=-0.25;R._noIdle=true;
    const hy=handOf('rball').y;const k=easeOut(clamp(lt/0.35,0,1));chars.rball.position.y=(ring.y+0.6-hy)*k+(1-k)*-2;
    world.ball.visible=true;const bp=handOf('rball').add(V3(0,0.3,-0.4));if(lt>0.9)bp.y-=easeIn((lt-0.9)/0.4)*3;world.ball.position.copy(bp);
    camAt(V3(COURT+15,6.0,-2),V3(COURT,6.6,-9),54);showOnly(['jet','rball']);S.zoomPunch=lt>0.3&&lt<0.45?1:0;if(lt>0.85&&lt<1.25)S.pow={text:'STOLEN!',k:(lt-0.85)/0.4};},
  cafe_steal:(u,t,lt)=>{mood('cafe');const R=st('rbar',CAFE,0,-4.6,0,'smug');R.armR.rotation.set(-1.75,0,0.15);R._noIdle=true;const M=st('mia',CAFE+2.5,0,-3.6,-Math.PI/2.4,'shocked');
    world.cup.visible=true;world.cup.position.copy(handOf('rbar').add(V3(0,0.45,0.25)));world.cup.rotation.x=0.9;
    dolly(V3(CAFE+0.6,6.4,8.5),V3(CAFE+0.4,6.2,6.8),V3(CAFE+1.2,5.3,-4),V3(CAFE+1.2,5.4,-4),u,44,40);showOnly(['rbar']);},
  goldbank_home:(u,t)=>{mood('kit');const G=st('goldbank',KIT+lerp(8,3,u),0,1.5,-Math.PI/2,'happy');walk(G,t);G.armL.rotation.set(0,0,-1.4);G.armR.rotation.set(0,0,1.4);
    const R=st('rwife',KIT-6,0,-4.7,Math.PI,'happy');R._talk='robert';R.armR.rotation.set(-1.0+Math.sin(t*6)*0.25,0,0);world.pot.visible=true;world.pot.position.set(KIT-6,4.3,-6.4);
    camAt(V3(KIT+11,6.6,10),V3(KIT-2.5,4.6,-2.5),50);showOnly(['goldbank','rwife']);},
  robert_apron:(u,t,lt)=>{mood('kit');const k=easeOut(lt/0.35);const R=st('rwife',KIT-6,0,-4.7,lerp(Math.PI,0.35,k),'happy');R._talk='robert';R.armR.rotation.set(-0.85,0,0.1);R.armL.rotation.set(-0.85,0,-0.1);R.head.rotation.z=0.12;
    world.pot.visible=true;world.pot.position.copy(handOf('rwife').add(handOf('rwife','armL')).multiplyScalar(0.5).add(V3(0,0.1,0.3)));
    cu('rwife',5.6,0.3,-0.4,40,u,0.1);S.focus=null;showOnly(['rwife']);S.hearts={n:5,seed:'w1'};},
  wife_window:(u,t)=>{mood('kit');const V=st('val',KIT,0,-11,0,'shocked',{blink:false});V.armL.rotation.set(-2.5,0,1.3);V.armR.rotation.set(-2.5,0,-1.3);V._noIdle=true;
    const G=st('goldbank',KIT+3.0,0,0.5,-Math.PI*0.8,'shocked');const R=st('rwife',KIT-3.0,0,0.2,Math.PI*0.8,'smug');R.armR.rotation.set(-1.3,0,0.1);R.armL.rotation.set(-1.3,0,-0.1);world.pot.visible=true;world.pot.position.copy(handOf('rwife').add(V3(0.6,0.2,0.3)));
    dolly(V3(KIT+0.4,6.4,15),V3(KIT+0.3,6.5,13.5),V3(KIT,5.2,-8),V3(KIT,5.4,-9),u,54,50);showOnly(['val','goldbank','rwife']);},
  back_wizard:(u,t)=>{mood('castle');world.candles.forEach(c=>{c.position.y+=0;c.children[0].position.y=Math.sin(t*1.5+c.userData.ph)*0.3;});const R=st('rwiz',CASTLE,0,-10,0,'smug');R.armR.rotation.set(-2.6,0,0.2);
    world.wand.visible=true;const hp=handOf('rwiz');world.wand.position.copy(hp.clone().add(V3(0,0.7,0.1)));world.wand.rotation.set(0.3,0,-0.2);const tip=proj(hp.clone().add(V3(0,1.5,0.2)));S.sparkle={x:tip.x,y:tip.y,n:14,r:0.08};
    dolly(V3(CASTLE+1.4,5.0,-2),V3(CASTLE+1.0,5.4,-3.6),V3(CASTLE,6.8,-12),V3(CASTLE,6.4,-11),u,48,44);showOnly(['rwiz']);era('MAGIC SCHOOL ERA');},
  back_vampire:(u,t)=>{mood('forest');const R=st('rvamp',FOREST,0,-8,0,'smug');R.head.rotation.x=-0.15;R.armL.rotation.set(0,0,-0.5);R.armR.rotation.set(0,0,0.5);
    [['nova',-4.2],['wren',4.2]].forEach(([id,x],i)=>{const P=st(id,FOREST+x,0,-5.5,-Math.sign(x)*0.6,'happy',{mouthOpen:0.9});P.armL.rotation.set(-2.7,0,0.4);P.armR.rotation.set(-2.7,0,-0.4);P.torso.position.y=Math.abs(Math.sin(t*9+i))*0.4;P._noIdle=true;});
    dolly(V3(FOREST,6.4,7),V3(FOREST,6.2,5),V3(FOREST,5.2,-8),V3(FOREST,5.6,-8),u,46,42);showOnly(['rvamp','nova','wren']);sparkleAt('rvamp',26);S.hearts={n:8,seed:'v1'};era('VAMPIRE ERA');},
  back_rich:(u,t,lt)=>{mood('man');const R=st('rrich',MAN,0,-5.6,0,'smug');R.armL.rotation.set(0,0,-1.2);R.armR.rotation.set(0,0,1.2);
    world.bills.forEach(b=>{b.visible=true;const d=b.userData;b.position.set(d.x+Math.sin(t*2+d.ph)*0.6,12-((lt*d.sp*3+d.ph)%12),d.z);b.rotation.set(t*2+d.ph,t*1.3,d.ph);});
    dolly(V3(MAN+0.5,6.4,5),V3(MAN+0.3,6.2,3.6),V3(MAN,5.4,-5.6),V3(MAN,5.6,-5.6),u,46,42);showOnly(['rrich']);era('RICH KID ERA');},
  back_bat:(u,t,lt)=>{mood('roof');world.roofL[1].intensity=(lt>0.25&&lt<0.4)?3:0;const stand=lt>1.2;const R=st('rbat',ROOF,1.4,lt<1.2?11.3:10.6,0,stand?'angry':'smug');R._noIdle=true;
    if(!stand){R.legL.rotation.x=-1.6;R.legR.rotation.x=-1.6;R.torso.rotation.x=0.5;chars.rbat.position.y=0.1;R.armL.rotation.set(-0.6,0,0.3);R.armR.rotation.set(-0.6,0,-0.3);}
    else{const k=easeOut((lt-1.2)/0.25);R.armR.rotation.set(lerp(-0.5,-1.6,k),0,0);R.torso.rotation.y=-0.3*k;chars.rbat.position.y=0.0;}
    camAt(V3(ROOF+2.2,5.2,17.5),V3(ROOF,5.0,10.8),stand?38:44);showOnly(['rbat']);S.rain=1;S.flash=(lt>0.25&&lt<0.33)?0.6:0;if(stand)S.pow={text:'POW!',k:(lt-1.25)/0.4,x:0.72,y:0.3};S.shakeA=stand&&lt<1.6?0.12:0;era('BAT ERA');},
  back_detective:(u,t)=>{mood('fog');const R=st('rdet',FOG,0,-4,0,'default',{blink:false});R.armR.rotation.set(-2.0,0.2,0.55);R._noIdle=true;R.head.rotation.y=-0.1;
    world.mag.visible=true;world.mag.position.copy(faceCam('rdet',0.32,0.1,1.05));world.mag.lookAt(cam.position);world.mag.rotation.z+=0;
    const hp=head('rdet');dolly(hp.clone().add(V3(0.4,0.2,8)),hp.clone().add(V3(0.3,0.15,5.6)),hp.clone().add(V3(0.2,-0.2,0)),hp.clone().add(V3(0.2,-0.1,0)),u,36,34);world.mag.lookAt(cam.position);showOnly(['rdet']);era('DETECTIVE ERA');S.vign=0.7;},
  robert_arrives:(u,t,lt)=>{mood('town');world.doors.forEach(d=>d.rotation.y=d.userData.sd*1.5);doorsClose(lt*1.6,true);const P=st('rb',0,0,lerp(-18,-16,u),0,'smug');walk(P,t*0.6);
    dolly(V3(-4,4.4,2),V3(-3.6,4.6,0),V3(0,4.2,-16),V3(0,4.4,-16),u,46,44);showOnly(['rb']);},
  zash_steps_out:(u,t)=>{mood('town');doorsClose(1);const Z=st('me',lerp(-5.5,-0.8,u),0,-2,Math.PI*0.85,'smug');walk(Z,t*0.8);const P=st('rb',0,0,-14,0,'shocked');
    camAt(V3(2.8,5.8,10),V3(-0.6,4.6,-8),44);showOnly(['me','rb']);S.focus={x:0.5,y:0.4,r:0.4};},
  crowd_windows:(u,t)=>{mood('town');const ids=CROWD.map(c=>c[0]);world.doors.forEach(d=>d.rotation.y=d.userData.sd*1.5);
    CROWD.forEach(([id,sd,z],i)=>{const P=st(id,sd*(i<2?3.6:4.4),0,i<2?-3:-9,-sd*0.5,'shocked',{mouthOpen:0.85});P.armR.rotation.set(-2.6+Math.sin(t*10+i)*0.3,0,-0.3);P.armL.rotation.set(-0.9+Math.sin(t*9+i)*0.3,0,0.2);P._noIdle=true;});
    dolly(V3(0.8,6.4,11),V3(-0.4,6.2,9.5),V3(0,4.8,-6),V3(0,4.8,-6),u,52,50);showOnly(ids);S.shakeA=0.02;},
  magnify_search:(u,t,lt)=>{mood('town');const Z=st('me',0,0,-7.0,Math.PI,'default',{blink:false});Z._noIdle=true;const R=st('rb',0,0,-10.4,0,'default');R.torso.rotation.x=0.42;R.armR.rotation.set(-1.9,0,0.25);R._noIdle=true;
    world.mag.visible=true;const zp=head('me').clone().add(V3(Math.sin(lt*5)*0.5,-0.1+Math.cos(lt*4)*0.25,-1.0));world.mag.position.copy(zp);world.mag.rotation.set(0,0,0);
    camAt(V3(10.8,5.8,-8.6),V3(0,5.6,-8.6),40);showOnly(['me','rb']);},
  zash_shrug:(u,t)=>{mood('town');const Z=st('me',0,0,-1.2,0,'smug');Z.armL.rotation.set(-0.3,0,-0.9);Z.armR.rotation.set(-0.3,0,0.9);Z.head.rotation.z=0.12;cu('me',5.6,0,-0.1,40,u,0.12);S.focus=null;showOnly(['me']);},
  high_five:(u,t,lt)=>{mood('dusk');const Z=st('me',-1.9,0,0,Math.PI/2,'happy');const R=st('rb',1.9,0,0,-Math.PI/2,'happy');const k=easeOut(clamp(lt/1.3,0,1));
    Z.armR.rotation.set(lerp(0,-2.7,k),0,0);R.armL.rotation.set(lerp(0,-2.7,k),0,0);Z._noIdle=R._noIdle=true;
    dolly(V3(0,5.0,14),V3(0,5.2,12),V3(0,4.6,0),V3(0,5.0,0),u,50,46);showOnly(['me','rb']);S.flash=lt>1.3&&lt<1.45?0.7:0;S.zoomPunch=lt>1.3&&lt<1.5?1:0;S.grade='warm';},
  yin_yang:(u,t)=>{mood('yin');world.yin.rotation.z=-t*1.2;const Z=st('me',YIN-1.6,0,0,0.35,'smug');const R=st('rb',YIN+1.6,0,0,-0.35,'smug');Z.armL.rotation.set(-1.2,0,-0.9);Z.armR.rotation.set(-1.2,0,0.9);R.armL.rotation.set(-1.2,0,-0.9);R.armR.rotation.set(-1.2,0,0.9);
    dolly(V3(YIN,5.0,17),V3(YIN,5.2,15),V3(YIN,5.0,-2),V3(YIN,5.2,-2),u,52,48);showOnly(['me','rb']);S.speed={k:0.25,col:'#ffe0ff'};},
  couch_robert:(u,t,lt)=>{mood('liv');world.tv.material.emissiveIntensity=0.8+0.4*Math.sin(t*13);const R=st('rhood',LIV,0.65,-5.6,0,'smug');sit(R);R.armR.rotation.set(-1.3-Math.max(0,Math.sin(lt*7))*0.6,0,0.3);R.armL.rotation.set(-0.9,0,-0.2);R._noIdle=true;
    world.chips.visible=true;world.chips.position.copy(handOf('rhood','armL').add(V3(0,0.4,0.2)));camAt(V3(LIV+1,5.6,8),V3(LIV,4.2,-5.6),44);showOnly(['rhood']);},
  zash_barista:(u,t)=>{mood('cafe');const Z=st('za',CAFE,0,-4.6,0,'sad');Z.armR.rotation.set(-1.4,0,0.15);world.cup.visible=true;world.cup.position.copy(handOf('za').add(V3(0,0.45,0.25)));world.cup.rotation.x=0;
    dolly(V3(CAFE+0.4,6.2,8),V3(CAFE+0.3,6.1,6.6),V3(CAFE,5.2,-4.6),V3(CAFE,5.4,-4.6),u,42,38);showOnly(['za']);},
  end_card:(u,t,lt)=>{mood('cafe');const Z=st('za',CAFE,0,-4.6,0,'smug');Z._talk='zash';Z.armR.rotation.set(-1.4,0,0.15);world.cup.visible=true;world.cup.position.copy(handOf('za').add(V3(0,0.45,0.25)));
    cu('za',5.2,0,-0.4,40,u,0.1);S.focus=null;showOnly(['za']);S.endText=clamp(lt/0.3,0,1);S.follow=clamp((lt-0.6)/0.4,0,1);S.black=clamp((u-0.95)/0.05,0,1)*0.85;},
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
S.init=async function(timeline,w,h,fontUrl){TL=timeline;W=w;H=h;SS=window.BH_SS||1.25;
  const ff=new FontFace('Luckiest Guy',`url(${fontUrl})`);await ff.load();document.fonts.add(ff);
  R=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});R.setPixelRatio(1);R.setSize(Math.round(W*SS),Math.round(H*SS));R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.1;R.shadowMap.enabled=false;
  cam=new THREE.PerspectiveCamera(40,W/H,0.1,1000);
  buildWorld();buildChars();
  const [oc,o2]=cv(W,H);out=oc;og=o2;og.imageSmoothingEnabled=true;og.imageSmoothingQuality='high';const [tc,t2]=cv(W,H);tmpC=tc;tg=t2;const [gc2,gg2]=cv(W,H);gC=gc2;gg=gg2;scene.updateMatrixWorld(true);return true;};
const KEYS=['era','sparkle','pow','scratch','stink','fly','dim','topTag','flash','black','shakeA','zoomPunch','speed','focus','vign','grade','rain','splash','hearts','heartPop','endText','follow'];
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
  const m=world.mood;const grade=S.grade==='sepia'?'sepia(0.6) contrast(1.12) saturate(0.95)':S.grade==='bw'?'grayscale(1) contrast(1.25) brightness(1.05)':S.grade==='warm'?'contrast(1.05) saturate(1.15) sepia(0.15)':S.grade==='drama'?'contrast(1.25) saturate(0.6)':m==='rain'||m==='flip'?'contrast(1.12) saturate(0.85) hue-rotate(8deg)':'contrast(1.05) saturate(1.18)';
  gg.clearRect(0,0,W,H);gg.drawImage(out,0,0);og.filter=grade;og.drawImage(gC,0,0);og.filter='none';
  og.filter=`blur(${Math.round(W*0.016)}px) brightness(1.2)`;og.globalCompositeOperation='screen';og.globalAlpha=0.1;og.drawImage(R.domElement,0,0,W,H);og.filter='none';og.globalCompositeOperation='source-over';og.globalAlpha=1;
  drawOverlays(t);drawCaption(t);
  return out.toDataURL('image/jpeg',q||0.94);};
})();
