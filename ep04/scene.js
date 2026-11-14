/* Episode 4 "The Glow Up": looks-rank world. HQ renderer: supersampling, soft shadows, bloom, colour grade.
   Entry points: SAMPLE.init(timeline, W, H, fontUrl), SAMPLE.frame(f) */
(function(){
const S=window.SAMPLE={};
let TL,W,H,R,scene,cam,out,og,world={},chars={},curShot=null,SS=1.5;
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const lerp=(a,b,t)=>a+(b-a)*t,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);},easeOut=t=>1-Math.pow(1-clamp(t,0,1),3),easeIn=t=>Math.pow(clamp(t,0,1),2);
const rnd=rng('glowup');
const FONT='"Luckiest Guy", Impact, sans-serif';
const HX=300,EX=600,BX=900,BX2=930,RX=1200,FP=V3(8,0,-6);

/* ---------------- textures */
function canvasTex(w,h,draw){const [c,g]=cv(w,h);draw(g,w,h);return tex(c);}
function glowTex(col){return canvasTex(128,128,(g)=>{const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.25,col);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);});}
function signTex(text,fg,bg,w=512,h=160,font=96,sub){return canvasTex(w,h,(g)=>{g.fillStyle=bg;g.fillRect(0,0,w,h);g.font=`${font}px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillStyle=fg;g.fillText(text,w/2,sub?h*0.38:h/2+6);if(sub){g.font=`${font*0.45}px ${FONT}`;g.fillText(sub,w/2,h*0.76);}});}
function plankTex(col){return canvasTex(256,256,(g,w,h)=>{fabricFill(g,0,0,w,h,col,'canvas');g.strokeStyle='rgba(0,0,0,0.22)';g.lineWidth=2;for(let y=0;y<h;y+=32){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}});}
function brickTex(col){return canvasTex(512,512,(g,w,h)=>{const r=rng('br'+col);g.fillStyle='#d8d0c4';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=32)for(let x=-(y/32%2)*32;x<w;x+=64){g.fillStyle=shade(col,(r()-0.5)*0.22);g.fillRect(x+2,y+2,60,28);}});}
function tileTex(a,b){return canvasTex(256,256,(g)=>{for(let y=0;y<4;y++)for(let x=0;x<4;x++){g.fillStyle=(x+y)%2?a:b;g.fillRect(x*64,y*64,64,64);}g.strokeStyle='rgba(0,0,0,0.12)';for(let i=0;i<=256;i+=64){g.strokeRect(i,0,0.5,256);g.strokeRect(0,i,256,0.5);}});}
const SM=(o)=>new THREE.MeshStandardMaterial(o);
function rcv(m){m.receiveShadow=true;return m;} function cst(m){m.castShadow=true;m.receiveShadow=true;return m;}

/* ---------------- world */
function buildWorld(){
  scene=new THREE.Scene();scene.fog=new THREE.Fog(0xcfe0f0,120,600);
  world.skyCanvas=cv(16,512);world.skyTex=tex(world.skyCanvas[0]);scene.background=world.skyTex;
  world.hemi=new THREE.HemisphereLight(0xdfeeff,0x6a5a40,0.85);scene.add(world.hemi);
  const sun=world.sun=new THREE.DirectionalLight(0xfff2d8,1.2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);const sc=sun.shadow.camera;sc.left=-30;sc.right=30;sc.top=30;sc.bottom=-30;sc.near=1;sc.far=260;sun.shadow.bias=-0.0004;sun.shadow.normalBias=0.06;sun.shadow.radius=3;scene.add(sun);scene.add(sun.target);
  world.sunDir=V3(0.45,0.8,0.4).normalize();world.look=V3(0,0,0);
  world.fill=new THREE.DirectionalLight(0xffffff,0);scene.add(world.fill);
  const ct=canvasTex(256,128,(g)=>{for(let i=0;i<9;i++){const gr=g.createRadialGradient(40+i*22,70-(i%3)*10,0,40+i*22,70-(i%3)*10,44);gr.addColorStop(0,'rgba(255,255,255,0.95)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,256,128);}});
  for(let i=0;i<18;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:ct,transparent:true,depthWrite:false,fog:false,opacity:0.85}));const a=rnd()*6.28,d=260+rnd()*260;s.position.set(Math.cos(a)*d,90+rnd()*100,Math.sin(a)*d);s.scale.set(140+rnd()*100,56+rnd()*30,1);scene.add(s);}
  // ---- yard
  const gt=canvasTex(256,256,(g,w,h)=>{fabricFill(g,0,0,w,h,'#74a850','fleece');});gt.wrapS=gt.wrapT=THREE.RepeatWrapping;gt.repeat.set(50,50);
  const grass=rcv(new THREE.Mesh(new THREE.PlaneGeometry(700,500),SM({map:gt,roughness:1})));grass.rotation.x=-Math.PI/2;scene.add(grass);
  const pt=tileTex('#c8beae','#bcb2a2');pt.wrapS=pt.wrapT=THREE.RepeatWrapping;pt.repeat.set(4,12);
  const path=rcv(new THREE.Mesh(new THREE.PlaneGeometry(14,70),SM({map:pt,roughness:0.9})));path.rotation.x=-Math.PI/2;path.position.set(0,0.03,8);scene.add(path);
  const bt=brickTex('#b8553a');bt.wrapS=bt.wrapT=THREE.RepeatWrapping;bt.repeat.set(6,2);
  const school=cst(new THREE.Mesh(new THREE.BoxGeometry(70,18,14),SM({map:bt,roughness:0.9})));school.position.set(0,9,-34);scene.add(school);
  const roof=cst(new THREE.Mesh(new THREE.BoxGeometry(72,1,15),SM({color:0x4a3a34,roughness:0.8})));roof.position.set(0,18.5,-34);scene.add(roof);
  const winM=SM({color:0x8ab8e0,roughness:0.15,metalness:0.4});for(let fl=0;fl<2;fl++)for(let i=-4;i<=4;i++){if(i===0&&fl===0)continue;const w=new THREE.Mesh(new THREE.PlaneGeometry(4.4,4),winM);w.position.set(i*7.4,5+fl*7.5,-26.98);scene.add(w);const fr=new THREE.Mesh(new THREE.BoxGeometry(4.9,0.4,0.5),SM({color:0xf2efe6}));fr.position.set(i*7.4,2.8+fl*7.5,-26.9);scene.add(fr);}
  const door=new THREE.Mesh(new THREE.BoxGeometry(5,6.4,0.3),SM({color:0x3a4a6a,roughness:0.5}));door.position.set(0,3.2,-26.9);scene.add(door);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(22,3.2),new THREE.MeshBasicMaterial({map:signTex('BLOCKHEAD HIGH','#f6f0dc','#2a3a5a',1024,150,104)}));sign.position.set(0,9.2,-26.95);scene.add(sign);
  for(let i=0;i<3;i++){const st=cst(new THREE.Mesh(new THREE.BoxGeometry(12,0.5,1.4),SM({color:0xbcb2a2,roughness:0.9})));st.position.set(0,0.25+i*0.5,-25.6+i*-0.0-i*0.0+ (2-i)*1.2-1.2);scene.add(st);}
  const pole=cst(new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.2,18,10),SM({color:0xd8dce4,metalness:0.8,roughness:0.3})));pole.position.set(FP.x,9,FP.z);scene.add(pole);
  const ball=cst(new THREE.Mesh(new THREE.SphereGeometry(0.4,14,10),METAL('#d4af37')));ball.position.set(FP.x,18.2,FP.z);scene.add(ball);
  world.flag=new THREE.Mesh(new THREE.PlaneGeometry(4.4,2.6,8,1),SM({map:signTex('B','#f6f0dc','#c0392b',256,150,120),side:THREE.DoubleSide,roughness:0.8}));world.flag.position.set(FP.x+2.4,16.4,FP.z);scene.add(world.flag);
  const base=cst(new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.5,0.6,16),SM({color:0x9a9488})));base.position.set(FP.x,0.3,FP.z);scene.add(base);
  // trees + bushes
  const tg=new THREE.SphereGeometry(3.2,10,8);tg.translate(0,7.5,0);const tk=new THREE.CylinderGeometry(0.5,0.7,5,6);tk.translate(0,2.5,0);
  const tm=new THREE.InstancedMesh(tg,SM({color:0x4f8a3e,roughness:1}),30),km=new THREE.InstancedMesh(tk,SM({color:0x6a4a30,roughness:1}),30);tm.castShadow=km.castShadow=true;const m4=new THREE.Matrix4(),q=new THREE.Quaternion();
  world.trees=[];for(let i=0;i<30;i++){let x,z;if(i<12){x=(i%2?-1:1)*(16+rnd()*26);z=-14+rnd()*50;}else{x=(rnd()-0.5)*240;z=46+rnd()*14;}const s=0.8+rnd()*0.6;m4.compose(V3(x,0,z),q,V3(s,s,s));tm.setMatrixAt(i,m4);km.setMatrixAt(i,m4);world.trees.push(V3(x,0,z));}scene.add(tm);scene.add(km);
  // street (z=70) with houses, Blaze's house at x=40
  const rd=rcv(new THREE.Mesh(new THREE.PlaneGeometry(300,10),SM({color:0x3a3d46,roughness:0.9})));rd.rotation.x=-Math.PI/2;rd.position.set(0,0.04,70);scene.add(rd);
  const hc=['#d9c7a8','#b8c4b0','#c4b8c8','#e0d0b0','#c9a98a'];for(let i=-5;i<=5;i++){const g=new THREE.Group();g.position.set(i*20,0,84);scene.add(g);const blz=i===2;
    const b=cst(new THREE.Mesh(new THREE.BoxGeometry(13,blz?11:8,10),SM({map:hatTex(blz?'#2a2d38':hc[(i+5)%5],'canvas'),roughness:0.9})));b.position.y=blz?5.5:4;g.add(b);
    const rf=cst(new THREE.Mesh(new THREE.ConeGeometry(10,4.5,4),SM({color:blz?0xb8242c:0x6a3a2a,roughness:0.8})));rf.position.y=(blz?11:8)+2.2;rf.rotation.y=Math.PI/4;g.add(rf);
    const d=new THREE.Mesh(new THREE.BoxGeometry(2,3.4,0.2),SM({color:blz?0xd4af37:0x5a3420,roughness:0.5,metalness:blz?0.7:0}));d.position.set(0,1.7,-5.05);g.add(d);
    [-3.6,3.6].forEach(x=>{const w=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2),new THREE.MeshBasicMaterial({color:0xffd890}));w.position.set(x,4.4,-5.02);w.rotation.y=Math.PI;g.add(w);});
    if(blz){const s2=new THREE.Mesh(new THREE.PlaneGeometry(5,1.2),new THREE.MeshBasicMaterial({map:signTex('BLAZE','#ffd23f','#15161c',320,80,60)}));s2.position.set(0,4.6+2.4,-5.03);s2.rotation.y=Math.PI;g.add(s2);}}
  // gravity glow + pillar + sparks
  world.grav=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex('rgba(170,90,255,0.85)'),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));world.grav.visible=false;scene.add(world.grav);
  world.grav2=world.grav.clone();world.grav2.material=world.grav.material.clone();scene.add(world.grav2);
  world.pillar=new THREE.Mesh(new THREE.CylinderGeometry(2.5,4,60,32,1,true),new THREE.MeshBasicMaterial({color:0xffcc44,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,opacity:0}));world.pillar.visible=false;scene.add(world.pillar);
  world.core=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex('rgba(255,210,90,0.9)'),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));world.core.visible=false;scene.add(world.core);
  world.roomLights=[];
  buildHall();buildEval();buildBlaze();buildRoom();
}
function roomBox(x,w,h,d,wallMap,floorMap,lightCol){const g=new THREE.Group();g.position.set(x,0,0);scene.add(g);
  const r=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),SM({map:wallMap,roughness:0.95,side:THREE.BackSide}));r.position.y=h/2;r.receiveShadow=true;g.add(r);
  const f=rcv(new THREE.Mesh(new THREE.PlaneGeometry(w,d),SM({map:floorMap,roughness:0.7})));f.rotation.x=-Math.PI/2;f.position.y=0.03;g.add(f);
  const L=new THREE.PointLight(lightCol||0xfff0d8,0.9,Math.max(w,d)*1.6,1.3);L.position.set(0,h-1.5,0);g.add(L);world.roomLights.push(L);g.userData.L=L;return g;}
function buildHall(){const ft=tileTex('#e8e2d4','#c8d0dc');ft.wrapS=ft.wrapT=THREE.RepeatWrapping;ft.repeat.set(3,15);
  const g=world.hall=roomBox(HX,12,9,64,hatTex('#e6dcc8','cotton'),ft);const lg=new THREE.BoxGeometry(0.8,5.4,1.4);const lm=new THREE.InstancedMesh(lg,SM({roughness:0.5,metalness:0.3}),84);const m4=new THREE.Matrix4(),col=new THREE.Color();let k=0;
  for(const s of [-1,1])for(let i=0;i<42;i++){m4.makeTranslation(s*5.55,2.7,-30+i*1.45);lm.setMatrixAt(k,m4);col.set(['#3a6ea8','#3464a0','#4278b4'][i%3]).convertSRGBToLinear();lm.setColorAt(k,col);k++;}g.add(lm);
  const note=new THREE.Mesh(new THREE.PlaneGeometry(1.2,0.8),new THREE.MeshBasicMaterial({map:signTex('MR. CHOPPED','#c0392b','#fff8dc',400,260,62,'lol')}));note.position.set(5.12,3.9,2.2);note.rotation.y=-Math.PI/2;note.rotation.z=-0.08;g.add(note);world.note=note;
  for(let i=0;i<5;i++){const L=new THREE.Mesh(new THREE.BoxGeometry(2,0.15,5),new THREE.MeshBasicMaterial({color:0xfffbe8}));L.position.set(0,8.9,-26+i*13);g.add(L);}}
function buildEval(){const ft=tileTex('#3a3f52','#2e3344');ft.wrapS=ft.wrapT=THREE.RepeatWrapping;ft.repeat.set(10,10);
  const g=world.eval=roomBox(EX,56,22,56,hatTex('#232838','wool'),ft,0xdfe8ff);g.userData.L.intensity=0.7;
  const stage=cst(new THREE.Mesh(new THREE.BoxGeometry(30,1.5,12),SM({map:plankTex('#5a4636'),roughness:0.6})));stage.position.set(0,0.75,-18);g.add(stage);
  const mm=SM({color:0xd8dce8,metalness:0.85,roughness:0.25});[-3,3].forEach(x=>{const p=cst(new THREE.Mesh(new THREE.BoxGeometry(1,9,1.6),mm));p.position.set(x,6,-18);g.add(p);});
  const top=cst(new THREE.Mesh(new THREE.BoxGeometry(7.6,1,1.8),mm));top.position.set(0,10.8,-18);g.add(top);world.machine=[top];
  world.ring=new THREE.Mesh(new THREE.TorusGeometry(2.6,0.12,8,40),new THREE.MeshBasicMaterial({color:0x5af0ff}));world.ring.rotation.x=Math.PI/2;g.add(world.ring);
  world.ringGlow=new THREE.PointLight(0x5af0ff,1.2,14,1.5);g.add(world.ringGlow);
  world.screenCanvas=cv(640,400);world.screenTex=tex(world.screenCanvas[0]);
  const scr=new THREE.Mesh(new THREE.PlaneGeometry(17,10.6),new THREE.MeshBasicMaterial({map:world.screenTex,toneMapped:false}));scr.position.set(0,15.2,-27.6);g.add(scr);world.screen=scr;
  const fr=new THREE.Mesh(new THREE.BoxGeometry(18,11.6,0.4),SM({color:0x101218,roughness:0.4}));fr.position.set(0,15.2,-27.8);g.add(fr);
  const ban=new THREE.Mesh(new THREE.PlaneGeometry(24,2.6),new THREE.MeshBasicMaterial({map:signTex('EVALUATION DAY','#15161c','#ffd23f',1024,112,84)}));ban.position.set(0,2.9+0.0,-11.95);ban.position.y=0.75;g.add(ban);
  [-1,1].forEach(s=>{const sp=new THREE.SpotLight(0xffffff,1.6,60,0.35,0.5,1);sp.position.set(s*14,20,-2);const tg=new THREE.Object3D();tg.position.set(0,3,-18);g.add(tg);sp.target=tg;g.add(sp);});
  // instanced background crowd
  const N=90;const tg2=rboxGeo(2,2,1,0.12,1).clone();tg2.translate(0,3,0);const hg=new THREE.CylinderGeometry(0.6,0.6,1.2,12);hg.translate(0,4.6,0);const lg=rboxGeo(2,2,1,0.1,1).clone();lg.translate(0,1,0);
  const T=new THREE.InstancedMesh(tg2,SM({roughness:0.85}),N),Hd=new THREE.InstancedMesh(hg,SM({roughness:0.7}),N),Lg=new THREE.InstancedMesh(lg,SM({roughness:0.85}),N);const m4=new THREE.Matrix4(),col=new THREE.Color();
  const sh=['#d9a23a','#2f8f8a','#c0392b','#3a5a8a','#6a2fb0','#e8742a','#5aa05a','#f2efe6','#b5545c'],sk=['#e8b98f','#c68a5e','#8d5a3b','#f0cfaa','#6a3e24'],pn=['#3b5a80','#22222a','#5b6340','#2a2a30'];
  for(let i=0;i<N;i++){const x=(i%15-7)*3.2+(rnd()-0.5),z=6+Math.floor(i/15)*3.4+(rnd()-0.5);m4.makeTranslation(x,0,z);T.setMatrixAt(i,m4);Hd.setMatrixAt(i,m4);Lg.setMatrixAt(i,m4);col.set(sh[i%9]).convertSRGBToLinear();T.setColorAt(i,col);col.set(sk[i%5]).convertSRGBToLinear();Hd.setColorAt(i,col);col.set(pn[i%4]).convertSRGBToLinear();Lg.setColorAt(i,col);}
  g.add(T);g.add(Hd);g.add(Lg);
  world.sparks=[];for(let i=0;i<16;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex('rgba(120,240,255,1)'),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));s.visible=false;g.add(s);world.sparks.push(s);}
  setScreen('?','#5af0ff','SCANNING');}
function setScreen(letter,col,sub){const k=letter+col+sub;if(world.screenKey===k)return;world.screenKey=k;const [c,g]=world.screenCanvas;g.fillStyle='#0b0d16';g.fillRect(0,0,640,400);
  const gr=g.createRadialGradient(320,190,10,320,190,300);gr.addColorStop(0,rgba(col,0.35));gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,640,400);
  g.textAlign='center';g.textBaseline='middle';g.font=`250px ${FONT}`;g.shadowColor=col;g.shadowBlur=40;g.fillStyle=col;g.fillText(letter,320,180);g.shadowBlur=0;g.font=`52px ${FONT}`;g.fillStyle='#ffffff';g.fillText(sub||'',320,345);
  g.strokeStyle=rgba(col,0.6);g.lineWidth=8;g.strokeRect(10,10,620,380);world.screenTex.needsUpdate=true;}
function buildBlaze(){const g=world.blz=roomBox(BX,16,9,12,hatTex('#3a3f56','wool'),plankTex('#7a5a40'),0xffe0b0);
  world.photoCanvas=cv(512,640);world.photoTex=tex(world.photoCanvas[0]);
  const fr=cst(new THREE.Mesh(new THREE.BoxGeometry(3.3,4.1,0.2),METAL('#d4af37',0.35)));fr.position.set(-3,5,-5.85);g.add(fr);
  const ph=new THREE.Mesh(new THREE.PlaneGeometry(2.9,3.6),new THREE.MeshBasicMaterial({map:world.photoTex}));ph.position.set(-3,5,-5.73);g.add(ph);world.photoMesh=ph;
  const pl=new THREE.Mesh(new THREE.PlaneGeometry(2.6,0.5),new THREE.MeshBasicMaterial({map:signTex('BLAZE, AGE 12','#15161c','#d4af37',400,76,44)}));pl.position.set(-3,2.55,-5.9);g.add(pl);
  const tro=(x,h)=>{const b=cst(new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.4,h,10),METAL('#d4af37')));b.position.set(x,2.2+h/2,-5);g.add(b);};const sh=cst(new THREE.Mesh(new THREE.BoxGeometry(5,0.2,1.4),SM({map:plankTex('#5a4030')})));sh.position.set(3.6,2.1,-5.2);g.add(sh);tro(2.2,1.2);tro(3.6,1.8);tro(5,1.0);
  const dr=new THREE.Mesh(new THREE.BoxGeometry(0.2,7,3.2),SM({color:0x15161c}));dr.position.set(7.9,3.5,1);g.add(dr);
  const g2=world.bath=roomBox(BX2,10,9,10,tileTex('#dfeef0','#c8e0e4'),tileTex('#f2f6f6','#d8e4e6'),0xeaf6ff);
  const mir=new THREE.Mesh(new THREE.PlaneGeometry(4,4.4),SM({color:0xbfe0f0,metalness:0.9,roughness:0.08}));mir.position.set(0,5,-4.95);g2.add(mir);const mf=new THREE.Mesh(new THREE.BoxGeometry(4.4,4.8,0.1),SM({color:0xf2f2f2}));mf.position.set(0,5,-4.99);g2.add(mf);
  const sink=cst(new THREE.Mesh(new THREE.BoxGeometry(4,0.5,1.6),SM({color:0xffffff,roughness:0.2})));sink.position.set(0,2.4,-4.2);g2.add(sink);}
function buildRoom(){const g=world.room=roomBox(RX,14,8,14,hatTex('#5a6a8a','cotton'),plankTex('#8a6a4a'),0xfff0d8);
  const bed=new THREE.Group();bed.position.set(-4,0,-3.5);g.add(bed);const fr=cst(rbox(4.2,1,7,0.1,MAT('#e8e2d4',0.6)));fr.position.y=0.5;bed.add(fr);const mt=cst(rbox(4,0.6,6.6,0.2,MAT('#f4f2ee',0.9)));mt.position.y=1.25;bed.add(mt);
  const pil=cst(rbox(2.6,0.5,1.2,0.25,MAT('#ffffff',0.9)));pil.position.set(0,1.75,-2.6);bed.add(pil);world.blanket=cst(rbox(4.1,0.4,4.2,0.18,SM({map:hatTex('#d9a23a','knit'),roughness:0.95})));world.blanket.position.set(0,2.35,1.0);bed.add(world.blanket);
  const desk=cst(rbox(5,0.25,2,0.05,SM({map:plankTex('#6a4a32')})));desk.position.set(4,2.4,-5.8);g.add(desk);
  world.monCanvas=cv(512,320);world.monTex=tex(world.monCanvas[0]);const mon=new THREE.Mesh(new THREE.PlaneGeometry(4.2,2.6),new THREE.MeshBasicMaterial({map:world.monTex,toneMapped:false}));mon.position.set(4,4.1,-6.3);g.add(mon);
  const mb=new THREE.Mesh(new THREE.BoxGeometry(4.5,2.9,0.15),SM({color:0x101218}));mb.position.set(4,4.1,-6.4);g.add(mb);
  world.monLight=new THREE.PointLight(0x6aa8ff,0,14,1.4);world.monLight.position.set(4,4.2,-5);g.add(world.monLight);
  const mir=new THREE.Mesh(new THREE.PlaneGeometry(2.6,5),SM({color:0xbfe0f0,metalness:0.9,roughness:0.08}));mir.position.set(-6.95,3.6,3);mir.rotation.y=Math.PI/2;g.add(mir);
  const post=new THREE.Mesh(new THREE.PlaneGeometry(2.4,3.2),new THREE.MeshBasicMaterial({map:signTex('LOCK IN','#ffd23f','#15161c',300,400,64,'no excuses')}));post.position.set(0,5,-6.95);g.add(post);
  const mat=rcv(new THREE.Mesh(new THREE.BoxGeometry(5,0.1,3),SM({color:0x3a6ea8,roughness:0.9})));mat.position.set(2.5,0.08,3.5);g.add(mat);}
function drawMonitor(t){const [c,g]=world.monCanvas;g.fillStyle='#1a1030';g.fillRect(0,0,512,320);g.fillStyle='#2a1a50';g.fillRect(0,0,512,40);g.font=`22px ${FONT}`;g.fillStyle='#ff4a6a';g.textAlign='left';g.fillText('● LIVE  3:07 AM',14,28);
  const j=Math.sin(t*40)*4;g.fillStyle='#e8b98f';g.fillRect(190+j,70,130,120);g.fillStyle='#15161c';g.fillRect(180+j,54,150,30);g.fillRect(170+j,110,170,18);g.fillStyle='#fff';g.fillRect(225+j,150,60,26);
  g.textAlign='center';g.font=`64px ${FONT}`;g.fillStyle='#ffd23f';g.save();g.translate(256,256);g.rotate(Math.sin(t*30)*0.04);g.fillText('LOCK IN!!!',0,0);g.restore();world.monTex.needsUpdate=true;}

/* ---------------- characters */
function clone(id,nid,mod){const c=JSON.parse(JSON.stringify(BH.castById(id)));c.id=nid;if(mod)mod(c);return c;}
function goldEyes(P){const g=new THREE.Group();[-1,1].forEach(s=>{const e=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex('rgba(255,200,40,0.95)'),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));e.scale.set(0.2,0.2,1);e.material.opacity=0.55;e.position.set(s*0.21,0.72,0.66);g.add(e);});P.head.add(g);return g;}
function buildChars(){
  const add=(id,spec,sc)=>{const g=buildChar(spec||BH.castById(id));if(sc)g.scale.setScalar(sc);scene.add(g);g.visible=false;chars[id]=g;return g;};
  add('zold',clone('leo','zold',c=>{Object.assign(c.face,{eyes:'tired',brows:'sad',unibrow:true,freckles:true,mouth:'flat',braces:true,glasses:'round'});}),0.94);
  add('zmid',clone('leo','zmid',c=>{Object.assign(c.face,{eyes:'dot',brows:'normal',mouth:'flat'});c.torso={inner:'#f2efe6',fabric:'cotton'};c.sleeves={color:'#f2efe6',len:'short'};c.pants={color:'#2a2a30',style:'shorts',shoes:'#efefef',socks:'#ffffff'};c.hat={style:'headband',color:'#c0392b'};}));
  add('zmask',clone('leo','zmask',c=>{c.skin='#a8d8a0';Object.assign(c.face,{eyes:'closed',brows:'none',mouth:'smile',nose:'none'});c.hat={style:'headband',color:'#f2a6c0'};c.torso={inner:'#f2efe6'};c.sleeves={color:'#f2efe6',len:'short'};}));
  const glow=c=>{Object.assign(c.face,{eyes:'sharp',brows:'arched',mouth:'smirk',eyeColor:'#6a4a2a'});c.hair.shine=0.2;c.extras=['necklace:#d4af37'];};
  add('znew',clone('leo','znew',glow),1.06);
  add('zalm',clone('leo','zalm',c=>{glow(c);c.face.eyeColor='#ffc21a';}),1.06);goldEyes(chars.zalm.userData.P);
  const bz={id:'blaze',name:'Blaze',skin:'#eac8a4',hair:{style:'swept',color:'#e8c878',shine:0.25},face:{eyes:'sharp',eyeColor:'#3a8ac8',brows:'arched',browColor:'#b89a5a',mouth:'smirk',nose:'pointy'},
    torso:{inner:'#f6f6f6',outer:{style:'varsity',color:'#b8242c',trim:'#f6f0dc',letter:'A',letterColor:'#b8242c'}},sleeves:{color:'#f6f0dc',len:'full',fabric:'leather',cuff:'#b8242c'},pants:{color:'#22262e',fabric:'denim',jeans:true,shoes:'#f6f6f6',accent:'#b8242c'},extras:['necklace:#d4af37']};
  add('blaze',bz,1.24);
  world.bold={id:'bold',name:'old blaze',skin:'#eac8a4',hair:{style:'buzz',color:'#b89a5a'},face:{eyes:'tired',eyeColor:'#3a8ac8',brows:'sad',browColor:'#8a7040',unibrow:true,freckles:true,mouth:'teeth',braces:true,glasses:'round',bandage:true},torso:{inner:'#8a9a6a',pattern:'stripes',patternColor:'#6a7a4a'},sleeves:{color:'#8a9a6a',len:'short'},pants:{color:'#5a5040',shoes:'#444'}};
  world.bzSpec=bz;
  add('somi');add('sgold',clone('somi','sgold',c=>{c.face.eyeColor='#ffc21a';c.face.eyes='sharp';}));goldEyes(chars.sgold.userData.P);
  add('tobi');add('grimm');['mia','nova','benny','theo','brick','pixel','dex','liza'].forEach(id=>add(id));
  // props
  const PB=chars.blaze.userData.P;const hm=new THREE.Group();hm.position.set(0,-2.0,0.3);const hd=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,1.3,8),SM({color:0x7a4a26}));hd.rotation.x=Math.PI/2;hd.position.z=0.6;hm.add(hd);const hh=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.34,0.6),METAL('#9aa0a8',0.35));hh.position.z=1.25;hh.rotation.y=Math.PI/2;hm.add(hh);PB.armR.add(hm);world.hammer=hm;hm.visible=false;
  const PM=chars.zmid.userData.P;const db=new THREE.Group();db.position.set(0,-2.05,0.1);const bar=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,1.6,8),METAL('#c9ccd2'));bar.rotation.z=Math.PI/2;db.add(bar);[-1,1].forEach(s=>{const w=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,0.3,14),SM({color:0x22252b,roughness:0.5}));w.rotation.z=Math.PI/2;w.position.x=s*0.75;db.add(w);});PM.armR.add(db);world.dumb=db;db.visible=false;
  const bk=new THREE.Group();[['#6b3a22',0],['#2f4a3a',0.22],['#4a2a2a',0.44]].forEach(([c,y])=>{const b=rbox(1.2,0.2,0.9,0.03,MAT(c,0.8));b.position.y=1.45+y;bk.add(b);});PM.head.add(bk);world.books=bk;bk.visible=false;
  const PN=chars.znew.userData.P;const fl=new THREE.Group();fl.position.set(0,-1.9,0.4);const stm=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.3,6),SM({color:0x3a8a3a}));stm.position.y=0.5;fl.add(stm);for(let i=0;i<6;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(0.17,8,6),SM({color:0xff5a7a,roughness:0.6}));const a=i/6*6.28;p.position.set(Math.cos(a)*0.2,1.2,Math.sin(a)*0.2);fl.add(p);}const ctr=new THREE.Mesh(new THREE.SphereGeometry(0.14,8,6),SM({color:0xffd23f}));ctr.position.y=1.2;fl.add(ctr);PN.armR.add(fl);world.flower=fl;fl.visible=false;
}
function portrait(spec,expr,bg){const sc2=new THREE.Scene();sc2.background=new THREE.Color(bg);lights(sc2);const m=buildChar(spec,expr);sc2.add(m);m.rotation.y=-0.15;const c2=new THREE.PerspectiveCamera(30,W/H,0.1,100);c2.position.set(0,4.5,6.4);c2.lookAt(0,4.5,0);
  R.render(sc2,c2);const src=R.domElement;const [pc,pg]=cv(512,640);const sw=src.width,sh=sw*1.25;pg.drawImage(src,0,(src.height-sh)/2,sw,sh,0,0,512,640);return pc;}
function showOnly(ids){Object.keys(chars).forEach(k=>chars[k].visible=ids.includes(k));}
function place(id,x,y,z,ry){const c=chars[id];c.position.set(x,y,z);c.rotation.set(0,ry||0,0);c.visible=true;return c.userData.P;}
function reset(P){['armL','armR','legL','legR','head'].forEach(k=>P[k].rotation.set(0,0,0));P.torso.rotation.set(0,0,0);P.torso.position.y=0;P._anim=null;P.armL.position.set(-1.5,4,0);P.armR.position.set(1.5,4,0);}
function st(id,x,y,z,ry,e){const P=place(id,x,y,z,ry);reset(P);if(e)P.setFace(e);return P;}
function mouth(P,who,t,e){const env=TL.mouth[who];const f=Math.round(t*TL.fps);const a=env?env[f]||0:0;P.setFace(e||P.expr||'default',{mouthOpen:a>0.12?Math.min(1,a*1.1):0});}
function talk(P,who,t,e){BH.animate(P,t,{motion:'talk',expr:e,talkMouth:false,face:false});mouth(P,who,t,e);}
function walk(P,t,sp,e){BH.animate(P,t*(sp||1),{motion:'walk',blend:0.01,face:false});P.setFace(e||'default');}
function slouch(P){P.torso.rotation.x=0.16;P.head.rotation.x=0.22;}
function lw0(o,v){let r=o;while(r.parent&&r.parent!==scene)r=r.parent;r.updateMatrixWorld(true);return o.localToWorld(v);}
const head=id=>lw0(chars[id].userData.P.head,V3(0,0.6,0));
const faceCam=(id,x,y,d)=>lw0(chars[id].userData.P.head,V3(x,0.6+y,d));
function close(id,d,x,y,fov){const hp=head(id);camAt(faceCam(id,x==null?0.5:x,y==null?0.05:y,(d||3.4)*1.3),hp.clone().add(V3(0,-0.05,0)),fov||36);}
function lie(id,x,y,z,ry){const c=chars[id];const P=place(id,x,y,z,0);reset(P);c.rotation.set(-Math.PI/2,0,0);c.rotateOnWorldAxis(V3(0,1,0),ry||0);return P;}

/* ---------------- look */
function sky(a,b,c){const [cc,g]=world.skyCanvas;const gr=g.createLinearGradient(0,0,0,512);gr.addColorStop(0,a);gr.addColorStop(0.6,b);gr.addColorStop(1,c);g.fillStyle=gr;g.fillRect(0,0,16,512);world.skyTex.needsUpdate=true;}
function mood(m){if(world.mood===m)return;world.mood=m;const M={day:['#3f86dc','#9ccaf4','#e8f2f8',0xdfeeff,0.85,0xfff2d8,1.25,[0.45,0.8,0.4],0.9],indoor:['#3f86dc','#9ccaf4','#e8f2f8',0xfff0e0,0.75,0xfff2d8,0.55,[0.3,0.9,0.5],0.9],
  hall:['#101320','#101320','#101320',0xd4dcff,0.8,0xffffff,0.45,[0.2,0.9,0.5],1.1],night:['#05060c','#0a0c18','#101428',0x3a4a8a,0.16,0xffffff,0.0,[0.3,0.9,0.5],0],gold:['#3a5a9a','#f0a868','#ffd8a0',0xffd8b0,0.8,0xffb070,1.4,[-0.6,0.45,0.5],0.9]}[m];
  sky(M[0],M[1],M[2]);world.hemi.color.setHex(M[3]);world.hemi.intensity=M[4];world.sun.color.setHex(M[5]);world.sun.intensity=M[6];world.sunDir.set(...M[7]).normalize();world.roomLights.forEach(L=>L.intensity=M[8]);world.eval.userData.L.intensity=M[8]*0.75;}
function camAt(p,l,fov){cam.position.copy(p);cam.lookAt(l);cam.fov=fov||40;cam.updateProjectionMatrix();world.look.copy(l);}
function shake(a,t){cam.position.x+=Math.sin(t*23.1)*a+Math.sin(t*41.7)*a*0.5;cam.position.y+=Math.cos(t*19.3)*a;}
const wordT=(seg,w)=>{const s=TL.segs.find(x=>x.id===seg);const x=s&&s.words.find(q=>q.w.toLowerCase()===w);return x?x.s:(s?s.start:0);};
function gravOn(p,k,sp){const g=sp||world.grav;g.visible=true;g.position.copy(p);g.scale.set(9*k,9*k,1);g.material.opacity=0.75;}
function pillarOn(p,k){world.pillar.visible=true;world.pillar.position.set(p.x,p.y+30,p.z);world.pillar.material.opacity=0.16*k;world.core.visible=true;world.core.position.set(p.x,p.y+1,p.z-2.5);world.core.scale.set(16*k,16*k,1);world.core.material.opacity=0.3*k;}
const CROWD=['mia','nova','benny','theo','brick','pixel','dex','liza'];
function crowd(e,armsUp,lean,skip){CROWD.forEach((id,i)=>{if(skip&&skip.includes(id))return;const P=st(id,EX+(i%4-1.5)*4.2+(i>3?2:0),0,-6+Math.floor(i/4)*4.2,Math.PI,e);if(armsUp){P.armL.rotation.x=-2.7;P.armR.rotation.x=-2.7;}if(lean){P.torso.rotation.x=-0.2;}});return CROWD.filter(i=>!(skip||[]).includes(i));}
function ringAt(y,fast,t){world.ring.position.set(0,y,-18);world.ringGlow.position.set(0,y,-18);}
const STG=V3(EX,1.5,-18);

/* ---------------- shots */
const SH={
  eval_hall:(u,t)=>{mood('hall');setScreen(['E','D','C','B','A','S'][Math.floor(t*9)%6],'#5af0ff','SCANNING');ringAt(3+Math.abs(Math.sin(t*3))*6);const P=st('mia',STG.x,1.5,STG.z,0,'shocked');const ids=crowd('default',false,false,['mia']);camAt(V3(EX,lerp(5,6.5,u),lerp(16,8,ease(u))),V3(EX,8.5,-20),56);showOnly(ids.concat(['mia']));},
  rank_screen:(u,t)=>{mood('hall');const L=['E','D','C','B','A','S'][Math.floor(t*12)%6];setScreen(L,L==='S'?'#ffd23f':'#5af0ff','YOUR FACE = YOUR POWER');ringAt(3+Math.abs(Math.sin(t*3))*6);const sp=world.screen.getWorldPosition(V3());camAt(sp.clone().add(V3(lerp(4,2,u),-3,lerp(18,14,u))),sp,44);showOnly([]);},
  s_rank_flex:(u,t)=>{mood('hall');setScreen('S','#ffd23f','GOD POWERS');ringAt(10);const P=st('nova',STG.x,1.5+ease(u)*2.2+Math.sin(t*3)*0.15,STG.z+1,0,'smug');P.armL.rotation.z=-1.1;P.armR.rotation.z=1.1;pillarOn(V3(STG.x,1.5,STG.z+1),0.9);const ids=crowd('happy',true,false,['nova']);camAt(V3(EX-5,3.4,-6),V3(EX,6.5,-19),52);showOnly(ids.concat(['nova']));},
  e_rank_nothing:(u,t)=>{mood('hall');setScreen('E','#8a8f98','NO POWER');ringAt(3);const P=st('benny',STG.x,1.5,STG.z+1,0,'sad');P.armL.rotation.z=-0.5;P.armR.rotation.z=0.5;P.armL.rotation.x=-0.4;P.armR.rotation.x=-0.4;P.head.rotation.x=0.2;camAt(V3(EX+3.5,5.6,-9.5),V3(EX,7.4,-20),50);showOnly(['benny']);},
  chart_reveal:(u,t)=>{mood('hall');setScreen('?','#5af0ff','');crowd('default');camAt(V3(EX,14,10),V3(EX,6,-20),50);showOnly(CROWD);S.dim=0.72;S.chart='rank';S.capY=0.83;},
  chart_climb:(u,t)=>{mood('hall');crowd('default');camAt(V3(EX,14,10),V3(EX,6,-20),50);showOnly(CROWD);S.dim=0.72;S.chart='rank';S.capY=0.83;},
  zash_eval_old:(u,t)=>{mood('hall');setScreen('?','#5af0ff','SCANNING');ringAt(3+((t*4)%1)*7);const P=st('zold',STG.x,1.5,STG.z+1,0,'happy');P.armL.rotation.x=-0.5;P.armR.rotation.x=-0.5;P.armL.rotation.z=-0.2;P.armR.rotation.z=0.2;close('zold',lerp(5.2,4.4,u),0.3,0.3,40);showOnly(['zold']);},
  e_rank_stamp:(u,t,lt)=>{mood('hall');setScreen('E','#8a8f98','NO POWER');ringAt(3);const P=st('zold',STG.x,1.5,STG.z+1,0,lt<0.35?'shocked':'sad');slouch(P);close('zold',lerp(4.0,3.4,ease(u)),0.4,0.1,38);showOnly(['zold']);S.stamp={text:'E-RANK',t:lt};},
  hallway_laugh:(u,t)=>{mood('indoor');const z=lerp(-4,4,u);const P=place('zold',HX,0,z,0);reset(P);walk(P,t,0.8,'sad');slouch(P);
    [['brick',-3.6,2,'happy'],['mia',3.6,0,'happy'],['dex',-3.6,-5,'smug'],['nova',3.6,-6,'happy'],['pixel',-3.4,9,'happy']].forEach(([id,x,dz,e],i)=>{const Q=st(id,HX+x,0,z-5+dz*0.8,x<0?Math.PI/2-0.6:-Math.PI/2+0.6,e);if(i%2===0){Q.armR.rotation.x=-1.4;}else Q.armL.rotation.x=-1.4;Q.head.rotation.z=Math.sin(t*9+i)*0.08;});
    camAt(V3(HX+0.8,4.0,z+8.5),V3(HX,4.0,z-2),52);showOnly(['zold','brick','mia','dex','nova','pixel']);},
  locker_note:(u,t)=>{mood('indoor');const p=world.note.getWorldPosition(V3());const P=st('zold',HX+2.6,0,3.4,Math.PI/2-0.2,'sad');slouch(P);camAt(p.clone().add(V3(-lerp(3.6,2.6,ease(u)),0.3,-1.2)),p,40);showOnly(['zold']);},
  blaze_walk:(u,t)=>{mood('day');const z=lerp(20,8,u);const P=place('blaze',0,0,z,Math.PI);reset(P);walk(P,t,0.75,'smug');[['mia',-5,3],['nova',5,1],['liza',-6,-3],['pixel',6,-4]].forEach(([id,x,dz])=>{const Q=st(id,x,0,z-4+dz,x<0?Math.PI/2:-Math.PI/2,'happy');Q.armL.rotation.x=-2.6;Q.armR.rotation.x=-2.6;});
    camAt(V3(1.5,1.4,z-11),V3(0,5.6,z),48);showOnly(['blaze','mia','nova','liza','pixel']);S.sparkle=0.6;},
  blaze_glow:(u,t)=>{mood('day');const P=st('blaze',0,0,6,Math.PI,'smug');P.armR.rotation.x=-1.9;P.armR.rotation.z=0.3;const hp=lw0(P.armR,V3(0,-2,0.2));gravOn(hp,0.45+Math.sin(t*8)*0.05);close('blaze',4.6,0.9,-0.1,40);showOnly(['blaze']);S.tag={text:'A-RANK  •  GRAVITY',col:'#b06cff'};},
  float_up:(u,t,lt)=>{mood('day');const B=st('blaze',2,0,4,Math.PI-0.5,'smug');B.armR.rotation.x=-2.5;const y=lerp(0.2,11,ease(u));const P=st('zold',FP.x-1.2,y,FP.z+1.4,-0.4,'shocked');chars.zold.rotation.z=Math.sin(t*3)*0.25;P.armL.rotation.x=-1.6+Math.sin(t*7)*0.4;P.armR.rotation.x=-1.6-Math.sin(t*7)*0.4;P.legL.rotation.x=Math.sin(t*6)*0.5;P.legR.rotation.x=-Math.sin(t*6)*0.5;
    gravOn(V3(FP.x-1.2,y+3,FP.z+1.4),1);gravOn(lw0(B.armR,V3(0,-2,0.2)),0.4,world.grav2);camAt(V3(-4,2.2,14),V3(FP.x-2,lerp(4,9,ease(u)),FP.z),54);showOnly(['blaze','zold']);},
  flagpole_hang:(u,t)=>{mood('day');hang('zold',t,'default');const hp=head('zold');camAt(hp.clone().add(V3(-3.4,lerp(0.6,0.2,u),6.4)),hp.clone().add(V3(0.6,-1,0)),44);showOnly(['zold']);S.tag={text:'DAY '+(180+Math.floor(u*3)),col:'#ffffff'};},
  blaze_smirk:(u,t)=>{mood('day');const P=st('blaze',2,0,4,Math.PI-0.6);talk(P,'blaze',t,'smug');P.head.rotation.x=-0.3;close('blaze',4.2,-0.6,-0.4,40);showOnly(['blaze']);},
  tobi_chart:(u,t)=>{mood('day');const P=st('tobi',-3,0,2,0.2);talk(P,'tobi',t,'happy');P.armL.rotation.x=-1.5;P.armR.rotation.x=-1.5;camAt(V3(-2,4.4,11),V3(-3,6.4,2),48);showOnly(['tobi']);S.chart='hyper';S.chartY=0.03;S.capY=0.86;S.dimTop=1;},
  zash_deadpan:(u,t)=>{mood('day');hang('zold',t,'default');mouth(chars.zold.userData.P,'zash',t,'default');close('zold',lerp(4.2,3.6,u),0.5,0.1,38);showOnly(['zold']);},
  follow_street:(u,t)=>{mood('gold');const x=lerp(0,22,u);const B=place('blaze',x,0,70,Math.PI/2);reset(B);walk(B,t,0.7,'smug');const tx=x-15;const Z=st('zold',tx,0,66.4,Math.PI/2,'smug');Z.torso.rotation.x=0.3;Z.legL.rotation.x=-0.5;Z.legR.rotation.x=0.3;chars.zold.position.y=-0.5;
    const bsh=world.bush||(world.bush=(()=>{const m=cst(new THREE.Mesh(new THREE.SphereGeometry(2.4,10,8),SM({color:0x3f7a34,roughness:1})));m.scale.y=0.75;scene.add(m);return m;})());bsh.visible=true;bsh.position.set(tx+2.2,1.4,66.2);
    camAt(V3(tx-7,3.6,60.5),V3(x-4,3.6,70),50);showOnly(['blaze','zold']);},
  blaze_house:(u,t)=>{mood('gold');const B=st('blaze',40,0,lerp(74,78.4,u),0,'smug');walk(B,t,0.7,'smug');camAt(V3(lerp(31,33,u),2.2,62),V3(40,6,84),50);showOnly(['blaze']);},
  photo_wall:(u,t)=>{mood('indoor');const P=st('zold',BX+2.4,0,-1.2,Math.PI+0.85,'shocked');camAt(V3(BX+lerp(7,6.2,u),5.2,5.4),V3(BX-1.6,4.6,-6),50);showOnly(['zold']);},
  photo_close:(u,t)=>{mood('indoor');const p=world.photoMesh.getWorldPosition(V3());camAt(p.clone().add(V3(0.5,0,lerp(5.4,4.2,ease(u)))),p,40);showOnly([]);},
  door_crack:(u,t)=>{mood('indoor');const P=st('zold',BX+4,0,1,0.4,'shocked');P.head.rotation.y=0.3;P.torso.rotation.x=0.15;close('zold',3.6,-0.8,0.1,40);showOnly(['zold']);},
  tink_shadow:(u,t,lt)=>{mood('indoor');hammerPose(t,lt);camAt(V3(BX2+0.4,5.4,4.6),V3(BX2,5.2,-3),40);showOnly(['blaze']);S.slit=lerp(0.3,0.42,u);S.tink=lt;world.bath.userData.L.intensity=0.35;},
  hammer_reveal:(u,t,lt)=>{mood('indoor');hammerPose(t,lt);camAt(V3(BX2+lerp(3.6,3.0,ease(u)),5.8,-4.6),head('blaze').add(V3(0,-0.2,0)),50);showOnly(['blaze']);S.tink=lt;},
  zash_horror:(u,t)=>{mood('indoor');const P=st('zold',BX+4,0,1,0.4,'shocked');P.armL.rotation.x=-2.6;P.armR.rotation.x=-2.6;chars.zold.position.x+=Math.sin(t*50)*0.04;close('zold',lerp(3.6,3.0,u),0.2,0.05,36);showOnly(['zold']);},
  photo_vs_blaze:(u,t)=>{mood('indoor');const p=world.photoMesh.getWorldPosition(V3());camAt(p.clone().add(V3(0.5,0,6)),p,44);showOnly([]);S.dim=0.8;S.split=u;S.capY=0.85;},
  zash_nope:(u,t)=>{mood('indoor');const P=st('zold',BX+2,0,2,0.3);P.head.rotation.y=Math.sin(t*12)*0.45;mouth(P,'zash',t,'shocked');P.armL.rotation.x=-1.6;P.armR.rotation.x=-1.6;P.armL.rotation.z=0.5;P.armR.rotation.z=-0.5;camAt(V3(BX+3.2,4.9,8.6),V3(BX+2,5.6,2),44);showOnly(['zold']);S.ban=1;},
  zash_idea:(u,t)=>{mood('indoor');const P=st('zold',BX+2,0,2,0.3);mouth(P,'zash',t,'smug');P.armR.rotation.x=-2.6;close('zold',4.2,0.4,0.25,40);showOnly(['zold']);S.bulb=easeOut(u*3);},
  calendar_flip:(u,t)=>{mood('indoor');const P=st('zold',RX-1,0,1,0.2,'angry');P.armL.rotation.z=-0.6;P.armR.rotation.z=0.6;camAt(V3(RX+1.5,4.6,8),V3(RX-1,4.4,1),46);showOnly(['zold']);S.dim=0.45;S.cal=u;S.capY=0.84;},
  mewing:(u,t)=>{mood('indoor');const P=st('zold',RX-1,0,1,0.2,'smug');P.armR.rotation.set(-2.5,0,-0.45);P.head.rotation.x=-0.18;close('zold',lerp(3.6,3.1,u),0.6,0,36);showOnly(['zold']);S.tag={text:'DAY 1  •  MEWING',col:'#ffd23f'};S.sparkle=0.3;},
  skincare:(u,t)=>{mood('indoor');const P=st('zmask',RX-1,0,1,0.2,'happy');P.armL.rotation.set(-2.4,0,0.45);P.armR.rotation.set(-2.4,0,-0.45);close('zmask',lerp(3.8,3.3,u),-0.4,0,36);showOnly(['zmask']);S.tag={text:'DAY 47  •  SKINCARE',col:'#f2a6c0'};},
  sleep:(u,t)=>{mood('night');world.room.userData.L.intensity=0.6;world.room.userData.L.color.setHex(0x8aa8ff);const P=lie('zold',RX-4,2.1,-1.4,0);P.setFace('happy',{blink:true});world.blanket.visible=true;camAt(V3(RX-lerp(0.6,1.2,u),5.4,-2.6),V3(RX-4,2.5,-5.4),40);showOnly(['zold']);S.tag={text:'DAY 120  •  8 HOURS',col:'#8ab8ff'};S.zzz=t;},
  gym:(u,t)=>{mood('indoor');const P=st('zmid',RX+2.5,0,3.5,-0.3,'angry');world.dumb.visible=true;P.armR.rotation.x=-0.5-1.6*Math.abs(Math.sin(t*5));P.armL.rotation.z=-0.4;camAt(V3(RX-2.4,4.8,9.6),V3(RX+2.4,4.0,3.5),44);showOnly(['zmid']);S.tag={text:'DAY 200  •  GYM',col:'#ff6a4a'};S.sweat=1;},
  posture:(u,t)=>{mood('indoor');const P=st('zmid',RX-5.4,0,3,Math.PI/2,'smug');world.books.visible=true;P.armL.rotation.z=-0.05;camAt(V3(RX+0.4,4.6,lerp(5.4,4.6,u)),V3(RX-5.4,4.8,3),42);showOnly(['zmid']);S.tag={text:'DAY 301  •  POSTURE',col:'#5ac88a'};},
  streamer_3am:(u,t)=>{mood('night');world.room.userData.L.intensity=0;world.monLight.intensity=1.9+Math.sin(t*20)*0.3;drawMonitor(t);const P=st('zmid',RX+4,0,-2.6,Math.PI,'shocked');P.torso.rotation.x=-0.1;camAt(V3(RX+lerp(6.6,6.0,u),5.6,1.4),V3(RX+4,4.2,-6.3),46);shake(0.03,t);showOnly(['zmid']);S.tag={text:'3:07 AM',col:'#ff4a6a'};},
  tobi_quit:(u,t)=>{mood('indoor');const P=st('tobi',RX+1,0,2,0.2);mouth(P,'tobi',t,'sad');P.armR.rotation.set(-2.5,0,-0.45);P.torso.rotation.x=0.15;close('tobi',3.8,0.5,0,38);showOnly(['tobi']);S.tag={text:'DAY 1',col:'#ffffff'};},
  tobi_couch:(u,t)=>{mood('indoor');world.blanket.visible=false;const P=lie('tobi',RX-4,2.1,-1.4,0);P.setFace('happy',{blink:true});P.armL.rotation.z=-0.8;P.armR.rotation.z=0.8;camAt(V3(RX+0.4,6.2,-0.6),V3(RX-4,2.4,-4.2),46);showOnly(['tobi']);S.tag={text:'DAY 2',col:'#ffffff'};S.zzz=t;},
  eval_hall2:(u,t)=>{mood('hall');setScreen('?','#5af0ff','YEAR 2');ringAt(10);const z=lerp(-6,-13,u);const P=place('znew',EX,0,z,Math.PI);reset(P);walk(P,t,0.7,'smug');const ids=crowd('default',false,false,[]);ids.forEach((id,i)=>{chars[id].position.x+=(i%4<2?-3.4:3.4);});camAt(V3(EX,4.6,lerp(8,4,u)),V3(EX,7,-20),54);showOnly(ids.concat(['znew']));},
  machine_shake:(u,t)=>{mood('hall');setScreen(['#','S','?','E','A','!'][Math.floor(t*20)%6],'#ff4a6a','ERROR');ringAt(3+((t*9)%1)*7);const P=st('znew',STG.x,1.5,STG.z+1,0,'default');world.machine[0].position.x=Math.sin(t*70)*0.2;world.sparks.forEach((s,i)=>{s.visible=true;const a=i*2.4+t*9;const k=(t*3+i*0.37)%1;s.position.set(Math.cos(a)*(3+k*3),6+Math.sin(a*1.3)*4+k*2,-18+Math.sin(a)*1.2);s.scale.setScalar(0.5*(1-k)+0.1);});
    camAt(V3(EX+lerp(6,5,u),4.6,-9),V3(EX,7.5,-18),50);shake(0.16,t);showOnly(['znew']);},
  crowd_lean:(u,t)=>{mood('hall');const ids=crowd('shocked',false,true);const B=st('blaze',EX+9.5,0,-6,Math.PI,'default');camAt(V3(EX-2,4.6,-13.5),V3(EX+2,4.4,-5),52);shake(0.05,t);showOnly(ids.concat(['blaze']));},
  s_rank_reveal:(u,t,lt)=>{mood('hall');setScreen('S','#ffd23f','S-RANK');ringAt(10);const P=st('znew',STG.x,1.5,STG.z+1,0,'smug');P.armL.rotation.z=-0.5;P.armR.rotation.z=0.5;pillarOn(V3(STG.x,1.5,STG.z+1),easeOut(lt/0.4));camAt(V3(EX+lerp(1,-1,u),lerp(2.4,2.0,u),lerp(-8.5,-10,ease(u))),V3(EX,lerp(9,8,u),-21),58);if(lt<0.18)S.flash=0.9*(1-lt/0.18);showOnly(['znew']);S.sparkle=1;},
  crowd_gasp:(u,t)=>{mood('hall');const ids=crowd('shocked',true,false);ids.forEach((id,i)=>{chars[id].position.y=Math.abs(Math.sin(t*9+i))*0.5;});camAt(V3(EX,6.4,-16.5),V3(EX,4.2,-3),54);showOnly(ids);S.tag={text:'3RD S-RANK IN HISTORY',col:'#ffd23f'};},
  blaze_shock:(u,t)=>{mood('hall');const P=st('blaze',EX+9.5,0,-6,Math.PI,'shocked');P.setFace('shocked',{mouthOpen:1});close('blaze',lerp(3.8,3.2,u),-0.3,0,36);shake(0.03,t);showOnly(['blaze']);},
  eyes_glow:(u,t)=>{mood('hall');const P=st('zalm',STG.x,1.5,STG.z+1,0,'smug');pillarOn(V3(STG.x,1.5,STG.z+1),0.5);close('zalm',lerp(3.0,2.4,ease(u)),0.15,0.05,34);showOnly(['zalm']);},
  future_vision:(u,t)=>{mood('day');const B=st('blaze',2,0,4,Math.PI-0.5,'angry');B.armR.rotation.x=-2.5*ease(u*1.5);gravOn(lw0(B.armR,V3(0,-2,0.2)),0.4*u,world.grav2);const Z=st('zalm',FP.x-1.2,0,FP.z+3,-0.4,'smug');camAt(V3(-10,4.4,9),V3(5,4.4,-1),50);showOnly(['blaze','zalm']);S.future=1;S.tag={text:'3 SECONDS FROM NOW',col:'#ffd23f'};},
  almighty_title:(u,t)=>{mood('day');const P=st('zalm',0,0,4,0,'smug');P.armL.rotation.z=-0.7;P.armR.rotation.z=0.7;P.armL.rotation.x=-0.25;P.armR.rotation.x=-0.25;pillarOn(V3(0,0,4),0.9);camAt(V3(lerp(-1,1,u),1.0,11),V3(0,6.2,4),52);showOnly(['zalm']);S.title={text:'ALMIGHTY',k:easeOut(u*4)};S.capY=0.86;S.sparkle=1;},
  blaze_try:(u,t,lt)=>{mood('day');const B=st('blaze',2,0,4,Math.PI-0.5,'smug');B.armR.rotation.x=-2.5;gravOn(lw0(B.armR,V3(0,-2,0.2)),0.4,world.grav2);const k=easeOut((lt-0.5)/0.3);const Z=st('zalm',FP.x-1.2+k*3.4,0,FP.z+3,-0.4,'smug');if(lt>0.5){B.setFace('shocked');}Z.armL.rotation.x=-0.3;camAt(V3(-10,4.4,9),V3(5,4.4,-1),50);showOnly(['blaze','zalm']);},
  blaze_on_pole:(u,t)=>{mood('day');hang('blaze',t,'shocked');const P=chars.blaze.userData.P;P.legL.rotation.x=Math.sin(t*9)*0.7;P.legR.rotation.x=-Math.sin(t*9)*0.7;P.armL.rotation.x=-2.4+Math.sin(t*11)*0.4;P.armR.rotation.x=-2.4-Math.sin(t*11)*0.4;const Z=st('zalm',FP.x-3,0,FP.z+5,0.3,'smug');Z.armL.rotation.z=-0.7;Z.armR.rotation.z=0.7;Z.armL.rotation.x=-0.25;Z.armR.rotation.x=-0.25;Z.head.rotation.x=-0.3;
    camAt(V3(FP.x-6.5,2.0,FP.z+14),V3(FP.x,8,FP.z),56);showOnly(['blaze','zalm']);},
  zash_serious:(u,t)=>{mood('gold');const P=st('znew',-10,0,10,0.2);mouth(P,'zash',t,'angry');close('znew',lerp(5.0,4.4,ease(u)),0.4,0.1,36);showOnly(['znew']);},
  ask_somi:(u,t,lt)=>{mood('gold');ask(t,lt,0);camAt(V3(-10,3.8,22),V3(-10,4.2,10),44);showOnly(['znew','somi']);S.sparkle=0.4;},
  somi_no:(u,t,lt)=>{mood('gold');ask(t,2,0);noShot(t,lt,'NO.',0);},
  rewind:(u,t,lt)=>{mood('gold');ask(t,1.2*(1-u),0);camAt(V3(-10,3.8,22),V3(-10,4.2,10),44);showOnly(['znew','somi']);S.rewind={n:2,t:lt};},
  somi_no2:(u,t,lt)=>{mood('gold');ask(t,2,1);noShot(t,lt,'NOPE.',1);},
  rewind2:(u,t,lt)=>{mood('gold');ask(t,1.2*(1-u),1);camAt(V3(-6,3.4,20),V3(-10,4.2,10),44);showOnly(['znew','somi']);S.rewind={n:3,t:lt};},
  no_montage:(u,t,lt)=>{mood('gold');const k=Math.floor(lt/0.22);ask(t,2,k);noShot(t,lt%0.22+0.1,['NO','NAH','NOPE','LOL NO','N. O.','STILL NO','NO THANKS','NEVER'][k%8],k);S.count=Math.floor(lerp(3,150,u));},
  counter:(u,t,lt)=>{mood('gold');const P=st('znew',-10,0,10,0.2,'sad');P.torso.rotation.x=0.2;P.head.rotation.x=0.3;P.armL.rotation.x=-0.2;close('znew',4.4,0.2,0.2,40);showOnly(['znew']);S.count=Math.floor(lerp(150,312,easeOut(u*1.4)));S.countBig=1;S.sweat=1;S.capY=0.86;},
  somi_reveal:(u,t)=>{mood('gold');const P=st('sgold',-8.6,0,10,-0.5);talk(P,'somi',t,'smug');close('sgold',lerp(4.0,3.4,ease(u)),-0.4,0.05,36);showOnly(['sgold']);},
  zash_dead:(u,t,lt)=>{mood('gold');const P=st('znew',-11.4,0,10,0.5);mouth(P,'zash',t,lt<0.5?'shocked':'default');close('znew',3.6,0.3,0.05,36);showOnly(['znew']);},
  somi_eyes:(u,t)=>{mood('gold');const P=st('sgold',-8.6,0,10,-0.5,'smug');close('sgold',lerp(2.6,2.2,u),0,0.1,32);showOnly(['sgold']);S.tag={text:'S-RANK #2',col:'#ffd23f'};},
  chart_crossout:(u,t,lt)=>{mood('day');const P=st('tobi',-3,0,2,0.2);mouth(P,'tobi',t,'shocked');P.armL.rotation.x=-1.5;P.armR.rotation.x=-1.5;camAt(V3(-2,4.4,11),V3(-3,6.4,2),48);showOnly(['tobi']);S.chart='hyper';S.chartY=0.03;S.cross=easeOut(lt/0.25);S.capY=0.86;S.dimTop=1;},
  end_mew:(u,t)=>{mood('day');const Z=st('znew',-1.6,1.0,-23.4,0);mouth(Z,'zash',t,'smug');const T=st('tobi',1.8,1.0,-23.4,0,'smug');[Z,T].forEach(P=>{P.legL.rotation.x=-1.5;P.legR.rotation.x=-1.5;P.armR.rotation.set(-2.5,0,-0.45);P.head.rotation.x=-0.15;});chars.znew.position.y=-0.6;chars.tobi.position.y=-0.6;
    camAt(V3(lerp(1,0,u),3.6,lerp(-14,-15.5,u)),V3(0,3.8,-23.4),46);showOnly(['znew','tobi']);S.sparkle=0.4;},
  endcard:(u,t,lt)=>{mood('day');camAt(V3(lerp(-30,-24,u),16,36),V3(0,6,-20),46);showOnly([]);S.endcard=clamp((lt-0.25)/0.35,0,1);S.dim=clamp(lt/0.4,0,0.6);S.capY=0.9;},
};
function hang(id,t,e){const c=chars[id];const s=c.scale.x;const P=st(id,FP.x,17.4-5.4*s,FP.z+0.75*s,0,e);c.rotation.z=Math.sin(t*1.6)*0.08;P.armL.rotation.z=-0.12;P.armR.rotation.z=0.12;P.legL.rotation.x=Math.sin(t*1.6)*0.12;P.legR.rotation.x=-Math.sin(t*1.6)*0.12;P.head.rotation.x=0.12;return P;}
function hammerPose(t,lt){const P=st('blaze',BX2,0,-2.2,Math.PI,'angry');world.hammer.visible=true;const k=(lt%0.42)/0.42;const hit=k<0.25?k/0.25:1-(k-0.25)/0.75;P.armR.rotation.set(-2.2-0.35*hit,0,-0.25);P.head.rotation.z=-0.1*hit;P.setFace(hit>0.7?'shocked':'angry');}
function ask(t,lt,k){const Z=st('znew',-11.6,0,10,Math.PI/2-0.15,'happy');world.flower.visible=true;Z.armR.rotation.x=-1.5*easeOut(lt/0.5);Z.torso.rotation.x=0.08;const Sm=st('somi',-8.4,0,10,-Math.PI/2+0.15,'default');Sm.armL.rotation.x=-0.3;}
function noShot(t,lt,text,k){const Sm=chars.somi.userData.P;Sm.setFace(k%3===1?'smug':k%3===2?'happy':'default');Sm.head.rotation.y=Math.sin(lt*16)*0.4*Math.exp(-lt*1.5);const side=k%2?-1:1;close('somi',[3.8,4.6,3.2][k%3],side*[0.6,1.2,0.3][k%3],0.05,38);showOnly(['somi']);S.bubble={text,k:easeOut(lt/0.12),side};}

/* ---------------- 2D overlays */
function T(text,x,y,size,fill,stroke,lw,align){og.font=`${size}px ${FONT}`;og.textAlign=align||'center';og.textBaseline='middle';og.lineJoin='round';if(stroke){og.lineWidth=lw||size*0.18;og.strokeStyle=stroke;og.strokeText(text,x,y);}og.fillStyle=fill;og.fillText(text,x,y);}
function RR(x,y,w,h,r){og.beginPath();og.moveTo(x+r,y);og.arcTo(x+w,y,x+w,y+h,r);og.arcTo(x+w,y+h,x,y+h,r);og.arcTo(x,y+h,x,y,r);og.arcTo(x,y,x+w,y,r);og.closePath();}
const RANKS=[['S','TRUE CHAD','#ffd23f'],['A','CHAD','#ff8a3a'],['B','CHADLITE','#f0608a'],['C','HIGH TIER (HTN)','#a86cf0'],['D','MID TIER (MTN)','#4aa8f0'],['E','LOW TIER (LTN)','#5ac88a'],['E','CHOPPED','#8a8f98']];
function drawRankChart(t){const hiT=[['true',0],['chad',1],['high',3],['mid',4],['low',5],['chopped',6]];let hi=-1;for(const [w,i] of hiT){if(t>=wordT('chart',w)){hi=i;break;}}
  T('OFFICIAL RANK CHART',W/2,H*0.085,W*0.078,'#ffffff','#0d0d12');const y0=H*0.135,rh=H*0.083;
  RANKS.forEach(([L,name,col],i)=>{const y=y0+i*rh;const on=i===hi;const wd=W*(0.5+i*0.06);const x=(W-wd)/2;og.save();if(on){og.translate(W/2,y+rh/2);og.scale(1.06,1.06);og.translate(-W/2,-(y+rh/2));}
    og.globalAlpha=hi<0||on?1:0.55;og.fillStyle=col;RR(x,y+rh*0.08,wd,rh*0.84,rh*0.2);og.fill();og.lineWidth=W*0.008;og.strokeStyle=on?'#ffffff':'#0d0d12';og.stroke();
    T(L,x+rh*0.55,y+rh*0.54,rh*0.56,'#0d0d12');T(name,x+wd/2+rh*0.2,y+rh*0.54,rh*(name.length>12?0.3:0.42),'#ffffff','#0d0d12',rh*0.09);og.restore();
    if(on){og.fillStyle='#ffffff';og.beginPath();og.moveTo(x-W*0.02,y+rh/2);og.lineTo(x-W*0.07,y+rh*0.25);og.lineTo(x-W*0.07,y+rh*0.75);og.fill();}});}
function drawHyper(y0,cross){const x0=W*0.1,w=W*0.8,h=H*0.33,y=H*y0+H*0.035;og.fillStyle='#fff8e6';RR(x0,y,w,h,W*0.03);og.fill();og.lineWidth=W*0.01;og.strokeStyle='#0d0d12';og.stroke();
  T('THE HYPERGAMY CHART',W/2,y+h*0.1,W*0.058,'#c0392b');T('(source: Tobi)',W/2,y+h*0.19,W*0.03,'#6a6a6a');
  const bx=x0+w*0.12,bw=w*0.8,by=y+h*0.86,bh=h*0.56;og.strokeStyle='#0d0d12';og.lineWidth=W*0.006;og.beginPath();og.moveTo(bx,by-bh);og.lineTo(bx,by);og.lineTo(bx+bw,by);og.stroke();
  const hs=[0.02,0.1,0.22,0.42,0.7,1],cs=['#8a8f98','#4aa8f0','#a86cf0','#f0608a','#ff8a3a','#ffd23f'],ls=['E','D','C','B','A','S'];
  hs.forEach((v,i)=>{const cw=bw/6;og.fillStyle=cs[i];og.fillRect(bx+i*cw+cw*0.15,by-bh*v,cw*0.7,bh*v);og.strokeRect(bx+i*cw+cw*0.15,by-bh*v,cw*0.7,bh*v);T(ls[i],bx+i*cw+cw/2,by+h*0.06,W*0.034,'#0d0d12');});
  og.save();og.translate(x0+w*0.055,by-bh/2);og.rotate(-Math.PI/2);T('ATTENTION',0,0,W*0.028,'#0d0d12');og.restore();
  T('YOU',bx+bw/12,by-bh*0.2,W*0.036,'#c0392b');og.strokeStyle='#c0392b';og.lineWidth=W*0.006;og.beginPath();og.moveTo(bx+bw/12,by-bh*0.14);og.lineTo(bx+bw/12,by-bh*0.05);og.stroke();
  if(cross>0){og.save();og.strokeStyle='#d62a2a';og.lineWidth=W*0.03;og.lineCap='round';og.globalAlpha=cross;og.beginPath();og.moveTo(x0+w*0.08,y+h*0.1);og.lineTo(x0+w*0.08+w*0.84*cross,y+h*0.1+h*0.8*cross);og.moveTo(x0+w*0.92,y+h*0.1);og.lineTo(x0+w*0.92-w*0.84*cross,y+h*0.1+h*0.8*cross);og.stroke();
    og.translate(W/2,y+h*0.52);og.rotate(-0.16);og.scale(2-cross,2-cross);T('DEBUNKED',0,0,W*0.11,'#d62a2a','#ffffff',W*0.02);og.restore();}}
function drawSplit(u){const pw=W*0.4,phh=pw*1.25,y=H*0.2;const L=W*0.07,Rr=W*0.53;T('SAME GUY.',W/2,H*0.12,W*0.09,'#ffffff','#0d0d12');
  [[L,world.photoCanvas[0],'AGE 12','#8a8f98'],[Rr,world.nowCanvas,'NOW','#ffd23f']].forEach(([x,c,lab,col],i)=>{const k=i?easeOut((u-0.3)*3):1;if(k<=0)return;og.save();og.globalAlpha=k;og.fillStyle=col;RR(x-W*0.012,y-W*0.012,pw+W*0.024,phh+W*0.024,W*0.02);og.fill();og.drawImage(c,x,y,pw,phh);T(lab,x+pw/2,y+phh+H*0.035,W*0.06,col,'#0d0d12');og.restore();});
  if(u>0.3){og.fillStyle='#ffffff';og.beginPath();og.moveTo(W*0.475,y+phh*0.42);og.lineTo(W*0.525,y+phh*0.5);og.lineTo(W*0.475,y+phh*0.58);og.fill();}
  if(u>0.55)T('LOOKSMAXXED',W/2,H*0.645,W*0.1,'#ffd23f','#0d0d12');}
function drawCal(u){const n=Math.floor(1+364*easeIn(u));const cw=W*0.56,ch=W*0.62,x=(W-cw)/2,y=H*0.14;og.save();og.translate(W/2,y+ch/2);og.rotate(Math.sin(n*1.7)*0.03);og.translate(-W/2,-(y+ch/2));
  og.fillStyle='#ffffff';RR(x,y,cw,ch,W*0.03);og.fill();og.fillStyle='#d62a2a';RR(x,y,cw,ch*0.26,W*0.03);og.fill();og.fillRect(x,y+ch*0.13,cw,ch*0.13);og.lineWidth=W*0.012;og.strokeStyle='#0d0d12';RR(x,y,cw,ch,W*0.03);og.stroke();
  T('DAY',W/2,y+ch*0.14,W*0.085,'#ffffff');T(String(n),W/2,y+ch*0.63,W*(n>99?0.24:0.28),'#0d0d12');og.restore();T('LOCKED IN',W/2,y+ch+H*0.05,W*0.08,'#ffd23f','#0d0d12');}
function drawBubble(b){const x=W*(b.side>0?0.3:0.7),y=H*0.2;og.save();og.translate(x,y);og.scale(b.k,b.k);og.rotate(b.side*-0.06);const w=W*0.07*Math.max(4,b.text.length)+W*0.1,h=H*0.085;og.fillStyle='#ffffff';RR(-w/2,-h/2,w,h,h*0.4);og.fill();og.lineWidth=W*0.012;og.strokeStyle='#0d0d12';og.stroke();
  og.beginPath();og.moveTo(-b.side*w*0.1,h/2-2);og.lineTo(-b.side*w*0.28,h/2+H*0.04);og.lineTo(-b.side*w*0.25,h/2-2);og.fillStyle='#ffffff';og.fill();og.stroke();og.fillRect(-b.side*w*0.24-W*0.02,h/2-W*0.012,W*0.07,W*0.012);
  T(b.text,0,4,W*0.085,'#d62a2a');og.restore();}
function drawRewind(r){og.save();og.fillStyle='rgba(40,80,200,0.22)';og.fillRect(0,0,W,H);for(let i=0;i<7;i++){const y=((r.t*900+i*H/7)%H);og.fillStyle='rgba(255,255,255,0.18)';og.fillRect(0,y,W,H*0.008);}
  const x=W*0.5,y=H*0.14;og.fillStyle='#ffffff';for(let k=0;k<2;k++){og.beginPath();og.moveTo(x-W*0.2+k*W*0.09,y);og.lineTo(x-W*0.11+k*W*0.09,y-H*0.022);og.lineTo(x-W*0.11+k*W*0.09,y+H*0.022);og.fill();}T('REWIND',x+W*0.12,y,W*0.075,'#ffffff','#0d0d12');
  T('FUTURE #'+r.n,W/2,H*0.21,W*0.055,'#ffd23f','#0d0d12');og.restore();}
function drawOverlays(t){
  if(S.future){og.save();og.globalCompositeOperation='color';og.fillStyle='rgba(255,190,40,0.55)';og.fillRect(0,0,W,H);og.restore();og.strokeStyle='rgba(255,210,63,0.9)';og.lineWidth=W*0.02;og.strokeRect(W*0.03,W*0.03,W*0.94,H-W*0.06);}
  const vg=og.createRadialGradient(W/2,H/2,H*0.36,W/2,H/2,H*0.78);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.34)');og.fillStyle=vg;og.fillRect(0,0,W,H);
  if(S.slit){og.fillStyle='#000';og.fillRect(0,0,W*S.slit,H);og.fillRect(W*(1-S.slit),0,W*S.slit,H);}
  if(S.dim){og.fillStyle=`rgba(8,10,20,${S.dim})`;og.fillRect(0,0,W,H);}
  if(S.dimTop){const g2=og.createLinearGradient(0,0,0,H*0.5);g2.addColorStop(0,'rgba(8,10,20,0.7)');g2.addColorStop(1,'rgba(8,10,20,0)');og.fillStyle=g2;og.fillRect(0,0,W,H*0.5);}
  if(S.sparkle){const r=rng('sp'+Math.floor(t*6));og.fillStyle='rgba(255,246,200,0.95)';for(let i=0;i<Math.round(10*S.sparkle);i++){const x=r()*W,y=r()*H*0.75,s=W*(0.012+r()*0.02);og.beginPath();og.moveTo(x,y-s);og.quadraticCurveTo(x,y,x+s,y);og.quadraticCurveTo(x,y,x,y+s);og.quadraticCurveTo(x,y,x-s,y);og.quadraticCurveTo(x,y,x,y-s);og.fill();}}
  if(S.sweat){og.fillStyle='rgba(140,205,255,0.95)';[[0.7,0.3],[0.76,0.36],[0.26,0.33]].forEach(([fx,fy],i)=>{const x=W*fx,y=H*fy+((t*120+i*40)%60);og.beginPath();og.moveTo(x,y);og.quadraticCurveTo(x+W*0.02,y+H*0.02,x,y+H*0.026);og.quadraticCurveTo(x-W*0.02,y+H*0.02,x,y);og.fill();});}
  if(S.zzz!=null){[0,1,2].forEach(i=>{const k=((S.zzz*0.6+i*0.33)%1);og.globalAlpha=1-k;T('Z',W*(0.62+k*0.14+i*0.02),H*(0.34-k*0.14),W*(0.06+k*0.07),'#ffffff','#0d0d12');og.globalAlpha=1;});}
  if(S.chart==='rank')drawRankChart(t);
  if(S.chart==='hyper')drawHyper(S.chartY||0.03,S.cross||0);
  if(S.split!=null)drawSplit(S.split);
  if(S.cal!=null)drawCal(S.cal);
  if(S.tag){og.font=`${W*0.05}px ${FONT}`;const tw=og.measureText(S.tag.text).width+W*0.08;og.fillStyle='rgba(13,13,18,0.82)';RR((W-tw)/2,H*0.115,tw,H*0.05,H*0.025);og.fill();T(S.tag.text,W/2,H*0.142,W*0.05,S.tag.col);}
  if(S.stamp){const k=easeOut((S.stamp.t-0.25)/0.14);if(k>0){og.save();og.translate(W*0.5,H*0.22);og.rotate(-0.18);og.scale(2.4-1.4*k,2.4-1.4*k);og.globalAlpha=k;og.lineWidth=W*0.016;og.strokeStyle='#d62a2a';RR(-W*0.3,-H*0.05,W*0.6,H*0.1,W*0.02);og.stroke();T(S.stamp.text,0,4,W*0.14,'#d62a2a');og.restore();}}
  if(S.tink!=null){const k=(S.tink%0.42);if(k<0.2){const n=Math.floor(S.tink/0.42);og.save();og.translate(W*(0.3+0.4*((n*37)%10)/10),H*(0.2+0.06*(n%3)));og.rotate(((n%2)-0.5)*0.4);const s=1+k*2;og.scale(s,s);T('TINK!',0,0,W*0.085,'#ffd23f','#0d0d12');og.restore();}}
  if(S.ban){const x=W*0.5,y=H*0.2,r=W*0.15;og.save();og.translate(x,y);og.fillStyle='rgba(255,255,255,0.95)';og.beginPath();og.arc(0,0,r,0,7);og.fill();og.save();og.rotate(-0.7);og.fillStyle='#7a4a26';og.fillRect(-r*0.08,-r*0.2,r*0.16,r*0.85);og.fillStyle='#8a9098';og.fillRect(-r*0.42,-r*0.55,r*0.84,r*0.38);og.restore();og.strokeStyle='#d62a2a';og.lineWidth=r*0.2;og.beginPath();og.arc(0,0,r,0,7);og.stroke();og.beginPath();og.moveTo(-r*0.7,-r*0.7);og.lineTo(r*0.7,r*0.7);og.stroke();og.restore();T("DON'T.",W/2,y+r+H*0.04,W*0.08,'#d62a2a','#ffffff',W*0.016);}
  if(S.bulb){const x=W*0.5,y=H*0.17,r=W*0.085*S.bulb;og.save();const g2=og.createRadialGradient(x,y,0,x,y,r*3.2);g2.addColorStop(0,'rgba(255,230,120,0.7)');g2.addColorStop(1,'rgba(255,230,120,0)');og.fillStyle=g2;og.fillRect(x-r*4,y-r*4,r*8,r*8);og.fillStyle='#ffe066';og.beginPath();og.arc(x,y,r,0,7);og.fill();og.lineWidth=W*0.01;og.strokeStyle='#0d0d12';og.stroke();og.fillStyle='#b8bcc4';og.fillRect(x-r*0.45,y+r*0.85,r*0.9,r*0.55);og.strokeRect(x-r*0.45,y+r*0.85,r*0.9,r*0.55);og.restore();}
  if(S.bubble)drawBubble(S.bubble);
  if(S.rewind)drawRewind(S.rewind);
  if(S.count!=null){if(S.countBig){T(String(S.count),W/2,H*0.2,W*0.3,'#ffd23f','#0d0d12',W*0.035);T("NO'S",W/2,H*0.3,W*0.1,'#d62a2a','#ffffff',W*0.02);}else{og.fillStyle='rgba(13,13,18,0.82)';RR(W*0.6,H*0.1,W*0.34,H*0.05,H*0.025);og.fill();T('FUTURE #'+S.count,W*0.77,H*0.127,W*0.042,'#ffd23f');}}
  if(S.title){og.save();og.translate(W/2,H*0.22);const k=S.title.k;og.scale(2-k,2-k);og.globalAlpha=k;T(S.title.text,0,0,W*0.17,'#ffd23f','#0d0d12',W*0.03);T('SEE THE FUTURE. CHANGE IT.',0,H*0.06,W*0.044,'#ffffff','#0d0d12');og.restore();}
  if(S.flash>0){og.fillStyle=`rgba(255,250,235,${S.flash})`;og.fillRect(0,0,W,H);}
  if(S.endcard>0){og.save();og.globalAlpha=S.endcard;T('BLOCKHEADS',W/2,H*0.36,W*0.14,'#ffd23f','#0d0d12',W*0.024);T('COMMENT YOUR RANK',W/2,H*0.455,W*0.075,'#ffffff','#0d0d12');
    const rs=[['S','#ffd23f'],['A','#ff8a3a'],['B','#f0608a'],['C','#a86cf0'],['D','#4aa8f0'],['E','#8a8f98']];rs.forEach(([l,c],i)=>{const x=W*(0.14+i*0.144);og.fillStyle=c;RR(x-W*0.055,H*0.5,W*0.11,W*0.11,W*0.02);og.fill();og.lineWidth=W*0.008;og.strokeStyle='#0d0d12';og.stroke();T(l,x,H*0.5+W*0.06,W*0.075,'#0d0d12');});
    T('FOLLOW FOR MORE',W/2,H*0.64,W*0.095,'#ffffff','#0d0d12',W*0.02);og.restore();}
}
function captionAt(t){for(const s of TL.segs){for(let i=0;i<s.words.length;i++){const w=s.words[i];const nx=s.words[i+1];const end=nx?nx.s:Math.min(w.e+0.25,s.end+0.25);if(t>=w.s&&t<end)return {w,since:t-w.s};}}return null;}
function drawCaption(t){const c=captionAt(t);if(!c)return;const text=c.w.w.toUpperCase();const base=W*0.118*(text.length>8?8/text.length*1.05:1);const k=c.since<0.04?lerp(1,1.08,c.since/0.04):c.since<0.08?lerp(1.08,1,(c.since-0.04)/0.04):1;
  og.save();og.translate(W/2,H*(S.capY||0.42));og.scale(k,k);og.font=`${base}px ${FONT}`;og.textAlign='center';og.textBaseline='middle';og.lineJoin='round';og.shadowColor='rgba(0,0,0,0.55)';og.shadowBlur=base*0.25;og.shadowOffsetY=base*0.06;og.lineWidth=base*0.2;og.strokeStyle='#0d0d12';og.strokeText(text,0,0);og.shadowColor='transparent';og.fillStyle=c.w.red?'#ff3b3b':'#ffffff';og.fillText(text,0,0);og.restore();}

/* ---------------- entry points */
S.init=async function(timeline,w,h,fontUrl){TL=timeline;W=w;H=h;SS=window.BH_SS||1.5;
  const ff=new FontFace('Luckiest Guy',`url(${fontUrl})`);await ff.load();document.fonts.add(ff);
  R=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});R.setPixelRatio(1);R.setSize(Math.round(W*SS),Math.round(H*SS));R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.08;R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
  cam=new THREE.PerspectiveCamera(40,W/H,0.1,2000);
  buildWorld();buildChars();
  R.shadowMap.enabled=false;const pc=portrait(world.bold,'happy','#b8c8a8');world.photoCanvas[1].drawImage(pc,0,0);world.photoCanvas[1].fillStyle='rgba(120,90,40,0.18)';world.photoCanvas[1].fillRect(0,0,512,640);world.photoTex.needsUpdate=true;world.nowCanvas=portrait(world.bzSpec,'smug','#2a2d38');R.shadowMap.enabled=true;
  const [oc,o2]=cv(W,H);out=oc;og=o2;og.imageSmoothingEnabled=true;og.imageSmoothingQuality='high';scene.updateMatrixWorld(true);return true;};
S.frame=function(f,q){const t=f/TL.fps;const shot=TL.shots.find(s=>t>=s.s&&t<s.e)||TL.shots[TL.shots.length-1];
  ['overlay','flash','dim','dimTop','chart','chartY','cross','capY','tag','stamp','tink','ban','bulb','bubble','rewind','count','countBig','title','split','cal','slit','sparkle','sweat','zzz','future','endcard'].forEach(k=>S[k]=null);
  world.fill.intensity=0;world.grav.visible=false;world.grav2.visible=false;world.pillar.visible=false;world.core.visible=false;world.hammer.visible=false;world.dumb.visible=false;world.books.visible=false;world.flower.visible=false;world.sparks.forEach(s=>s.visible=false);world.machine[0].position.x=0;world.monLight.intensity=0;world.blanket.visible=true;if(world.bush)world.bush.visible=false;
  world.mood=null;cam.up.set(0,1,0);world.room.userData.L.color.setHex(0xfff0d8);
  if(shot!==curShot){curShot=shot;showOnly([]);}
  Object.values(chars).forEach(c=>{c.rotation.set(0,0,0);});
  const u=(t-shot.s)/(shot.e-shot.s),lt=t-shot.s;scene.updateMatrixWorld(true);
  (SH[shot.name]||SH.endcard)(u,t,lt);
  const fpz=world.flag.geometry.attributes.position;for(let i=0;i<fpz.count;i++){fpz.setZ(i,Math.sin(fpz.getX(i)*1.6+t*5)*0.18*(fpz.getX(i)+2.2)/4.4);}fpz.needsUpdate=true;
  world.sun.target.position.copy(world.look);world.sun.position.copy(world.look).addScaledVector(world.sunDir,110);
  R.render(scene,cam);
  og.globalAlpha=1;og.globalCompositeOperation='source-over';og.filter='contrast(1.05) saturate(1.14)';og.drawImage(R.domElement,0,0,W,H);
  og.filter=`blur(${Math.round(W*0.014)}px) brightness(1.15)`;og.globalCompositeOperation='screen';og.globalAlpha=0.2;og.drawImage(R.domElement,0,0,W,H);og.filter='none';og.globalCompositeOperation='source-over';og.globalAlpha=1;
  drawOverlays(t);drawCaption(t);
  return out.toDataURL('image/jpeg',q||0.95);};
})();
