/* Episode 6 "The Clone Goes To School" (v2, narrator Leo). Bright comedy look with a dramatic street climax and a
   digital glitch effect for the clone. Original characters and sets. ep06/scene.js = this + cast_ep06.js.
   Entry points: SAMPLE.init(timeline, W, H, fontUrl), SAMPLE.frame(f) */
(function(){
/* Episode 6 "The Clone Goes To School": Leo (main narrator), his clone (cyan eyes = the only tell), recycling workers. */
(function(){
const J=o=>JSON.parse(JSON.stringify(o));
const leo={id:'leo6',name:'Leo',role:'Narrator',group:'Main',origin:'original',skin:'#e6b48c',hair:{style:'messy',color:'#17110e'},
  face:{eyeShape:'almond',eyes:'dot',eyeScale:0.85,eyeColor:'#3a2a1a',brows:'normal',mouth:'smile',nose:'button'},
  torso:{inner:'#cfd2d8',outer:{style:'hoodie',color:'#2c3240',fabric:'fleece',strings:'#e8e8e8'}},sleeves:{color:'#2c3240',len:'full',fabric:'fleece'},pants:{color:'#3a3f4a',fabric:'cotton',shoes:'#d8d8d8'}};
const clone=Object.assign(J(leo),{id:'clone6',name:'Leo (clone)'});clone.face.eyeColor='#2ec8ff';clone.face.mouth='smile';
const worker=(base,id)=>{const c=J(BH.castById(base));c.id=id;c.torso={inner:'#ff7a1a',fabric:'nylon',pattern:'stripes',patternColor:'#f4f0a0'};c.sleeves={color:'#ff7a1a',len:'short'};c.hat={style:'snapback',color:'#ff7a1a'};c.extras=[];c.face=Object.assign(c.face||{},{mouth:'flat'});return c;};
[leo,clone,worker('rex','work1'),worker('dave','work2')].forEach(s=>{const i=CAST.findIndex(c=>c.id===s.id);if(i>=0)CAST[i]=s;else CAST.push(s);});
})();

const S=window.SAMPLE={};
let TL,W,H,R,scene,cam,out,og,world={},chars={},curShot=null,SS=1.25;
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const lerp=(a,b,t)=>a+(b-a)*t,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);},easeOut=t=>1-Math.pow(1-clamp(t,0,1),3),easeIn=t=>Math.pow(clamp(t,0,1),2);
const FONT='"Luckiest Guy", Impact, sans-serif';
const SCH=300, ST=600, LAKE=900, OFF=1200;

/* ---------------- textures */
function canvasTex(w,h,draw){const [c,g]=cv(w,h);draw(g,w,h);const t=tex(c);t._c=c;return t;}
function glowTex(col){return canvasTex(128,128,(g)=>{const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.3,col);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);});}
function puffTex(){return canvasTex(128,128,(g)=>{for(let i=0;i<7;i++){const x=40+(i*23)%50,y=40+(i*31)%50,r=30+(i*7)%14;const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(220,250,255,0.95)');gr.addColorStop(1,'rgba(120,220,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);}});}
function plankTex(col){return canvasTex(256,256,(g,w,h)=>{fabricFill(g,0,0,w,h,col,'canvas');g.strokeStyle='rgba(0,0,0,0.22)';g.lineWidth=3;for(let y=0;y<h;y+=42){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}});}
function wallTex(col,stripe){return canvasTex(256,256,(g,w,h)=>{fabricFill(g,0,0,w,h,col,'cotton');if(stripe){g.fillStyle=stripe;for(let x=0;x<w;x+=40)g.fillRect(x,0,14,h);}});}
function tileTex(a,b){return canvasTex(256,256,(g)=>{for(let y=0;y<4;y++)for(let x=0;x<4;x++){g.fillStyle=(x+y)%2?a:b;g.fillRect(x*64,y*64,64,64);}});}
function lockerTex(){return canvasTex(256,512,(g,w,h)=>{g.fillStyle='#3a6ab8';g.fillRect(0,0,w,h);for(let x=0;x<w;x+=64){g.fillStyle='rgba(0,0,0,0.25)';g.fillRect(x,0,3,h);g.fillStyle='rgba(0,0,0,0.3)';for(let y=40;y<120;y+=12)g.fillRect(x+16,y,32,4);g.fillStyle='#c9ccd2';g.fillRect(x+48,230,6,40);}});}
function drawingsTex(){return canvasTex(512,512,(g,w,h)=>{g.fillStyle='#e8e8ec';g.fillRect(0,0,w,h);
  const paper=(x,y,r,fn)=>{g.save();g.translate(x,y);g.rotate(r);g.fillStyle='#fffdf4';g.fillRect(-90,-110,180,220);g.fillStyle='#e04a4a';g.beginPath();g.arc(0,-104,9,0,7);g.fill();fn();g.restore();};
  paper(140,150,-0.08,()=>{g.lineWidth=6;g.strokeStyle='#2a7a3a';g.beginPath();g.moveTo(-60,70);g.lineTo(60,70);g.stroke();g.fillStyle='#ffd23f';g.beginPath();g.arc(40,-50,26,0,7);g.fill();g.fillStyle='#e05a3a';g.fillRect(-50,0,60,70);g.beginPath();g.moveTo(-60,0);g.lineTo(-20,-40);g.lineTo(20,0);g.fill();});
  paper(370,160,0.06,()=>{g.fillStyle='#2a4ab8';g.font='bold 80px sans-serif';g.textAlign='center';g.fillText('A+',0,10);g.font='bold 26px sans-serif';g.fillText('MATH',0,60);});
  paper(250,390,-0.03,()=>{g.strokeStyle='#e04a7a';g.lineWidth=7;g.beginPath();g.moveTo(0,40);g.bezierCurveTo(-70,-10,-40,-70,0,-30);g.bezierCurveTo(40,-70,70,-10,0,40);g.stroke();g.fillStyle='#333';g.font='bold 28px sans-serif';g.textAlign='center';g.fillText('MOM',0,90);});});}
function sliceTex(){return canvasTex(256,256,(g,w,h)=>{g.fillStyle='#f2b84a';g.fillRect(0,0,w,h);g.fillStyle='#e8a030';g.fillRect(0,0,w,26);const r=rng('pep');for(let i=0;i<9;i++){g.fillStyle='#b8302a';g.beginPath();g.arc(30+r()*190,50+r()*190,14+r()*6,0,7);g.fill();}});}
function truckTex(){return canvasTex(512,256,(g,w,h)=>{g.fillStyle='#2f9a5a';g.fillRect(0,0,w,h);g.fillStyle='#ffffff';g.font='bold 64px "Luckiest Guy", Impact, sans-serif';g.textAlign='center';g.fillText('RECYCLING',w/2,110);g.font='bold 28px "Luckiest Guy", Impact, sans-serif';g.fillText('EXTRA KIDS REMOVED FAST',w/2,170);
  g.strokeStyle='#fff';g.lineWidth=8;g.beginPath();for(let i=0;i<3;i++){const a=-Math.PI/2+i*Math.PI*2/3;g.moveTo(w/2+Math.cos(a)*30,215+Math.sin(a)*30);g.lineTo(w/2+Math.cos(a+2.1)*30,215+Math.sin(a+2.1)*30);}g.stroke();});}
function officeTex(){return canvasTex(256,128,(g,w,h)=>{g.fillStyle='#3a2a1a';g.fillRect(0,0,w,h);g.fillStyle='#d8b860';g.font='bold 36px sans-serif';g.textAlign='center';g.fillText('PRINCIPAL',w/2,74);});}

const SM=(o)=>new THREE.MeshStandardMaterial(o);
function cst(m){m.castShadow=true;m.receiveShadow=true;return m;}
function box(w,h,d,mat,x,y,z,parent){const m=cst(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat.isMaterial?mat:SM({color:mat,roughness:0.8})));m.position.set(x,y,z);(parent||scene).add(m);return m;}
function sprite(t,s,parent,op){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,opacity:op==null?1:op}));m.scale.set(s,s,1);(parent||scene).add(m);return m;}
function pl(col,int,dist,x,y,z,parent){const L=new THREE.PointLight(col,int,dist,1.6);L.position.set(x,y,z);(parent||scene).add(L);return L;}
function plane(w,h,mat,x,y,z,rx,parent){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);m.position.set(x,y,z);m.rotation.x=rx||0;m.receiveShadow=true;(parent||scene).add(m);return m;}

/* ---------------- world */
function buildWorld(){
  scene=new THREE.Scene();scene.background=new THREE.Color('#9fd0f0');scene.fog=new THREE.Fog(0xcfe6f5,90,260);
  world.hemi=new THREE.HemisphereLight(0xfff4e6,0x6a5a4a,0.75);scene.add(world.hemi);
  const key=world.key=new THREE.DirectionalLight(0xfff0dc,1.0);key.castShadow=true;key.shadow.mapSize.set(2048,2048);const sc=key.shadow.camera;sc.left=-30;sc.right=30;sc.top=30;sc.bottom=-30;sc.near=1;sc.far=200;key.shadow.bias=-0.0004;key.shadow.normalBias=0.05;scene.add(key);scene.add(key.target);
  world.look=V3(0,0,0);world.keyDir=V3(0.45,0.8,0.55).normalize();
  world.T={glow:glowTex('rgba(80,220,255,0.8)'),puff:puffTex(),warm:glowTex('rgba(255,200,120,0.8)')};
  buildHouse();buildSchool();buildStreet();buildLake();buildOffice();buildProps();
}
function buildHouse(){const g=new THREE.Group();scene.add(g);
  plane(60,60,SM({map:plankTex('#b0804e'),roughness:0.7}),0,0,0,-Math.PI/2,g);
  const wm=SM({map:wallTex('#e8d8c0','#e0ceb2'),roughness:0.9});box(40,20,0.5,wm,0,10,-12,g);box(0.5,20,40,wm,-16,10,0,g);box(0.5,20,40,wm,16,10,0,g);
  const cm=SM({color:'#4a6aa8',roughness:0.95});box(9,1.6,3.2,cm,-6,1.4,-8.4,g);box(9,3,1,cm,-6,3,-10,g);box(1,2.4,3.2,cm,-10.5,2,-8.4,g);box(1,2.4,3.2,cm,-1.5,2,-8.4,g);
  box(4,1.2,2.2,SM({map:plankTex('#6a4428')}),-6,0.6,-4.4,g);
  world.tv=box(5,3,0.3,SM({color:'#111',emissive:0x4a7ab8,emissiveIntensity:0.6}),-6,6,11.7,g);
  box(6,6,0.2,SM({color:'#bfe4ff',emissive:0x9fd8ff,emissiveIntensity:0.6}),6,8,-11.7,g);box(6.6,0.4,0.4,SM({color:'#fff'}),6,5,-11.6,g);box(0.3,6,0.4,SM({color:'#fff'}),6,8,-11.6,g);
  // kitchen fridge with drawings
  box(4,9,3,SM({color:'#e8ecf0',roughness:0.35,metalness:0.2}),12,4.5,-9.8,g);const d=plane(3.4,3.4,SM({map:drawingsTex(),roughness:0.9}),12,5.6,-8.28,0,g);
  box(0.2,2.4,0.3,SM({color:'#aab'}),10.6,6,-8.2,g);
  pl(0xffe0b0,1.0,40,0,12,0,g);
}
function buildSchool(){const g=new THREE.Group();g.position.set(SCH,0,0);scene.add(g);
  const ft=tileTex('#d8d4c8','#c8c2b4');ft.wrapS=ft.wrapT=THREE.RepeatWrapping;ft.repeat.set(4,10);plane(16,80,SM({map:ft,roughness:0.5}),0,0,0,-Math.PI/2,g);
  const lt=lockerTex();lt.wrapS=THREE.RepeatWrapping;lt.repeat.set(10,1);[-1,1].forEach(s=>{const m=SM({map:lt,roughness:0.5,metalness:0.3});const L=box(0.8,9,80,m,s*7.6,4.5,0,g);});
  const wm=SM({color:'#f0ece0'});[-1,1].forEach(s=>box(0.4,8,80,wm,s*8.2,13,0,g));box(16,0.4,80,SM({color:'#f4f2ea'}),0,17,0,g);
  for(let z=-30;z<=30;z+=10)box(3,0.2,1.2,SM({color:'#fff',emissive:0xffffff,emissiveIntensity:0.8}),0,16.7,z,g);
  pl(0xffffff,1.2,60,0,14,0,g);
}
function buildStreet(){const g=new THREE.Group();g.position.set(ST,0,0);scene.add(g);
  plane(120,120,SM({color:'#6ab04a',roughness:1}),0,0,0,-Math.PI/2,g);plane(120,10,SM({color:'#4a4a50',roughness:0.9}),0,0.03,14,-Math.PI/2,g);plane(120,3,SM({color:'#c8c4bc'}),0,0.05,8,-Math.PI/2,g);
  // house facade
  box(24,12,1,SM({color:'#f0e0c8',roughness:0.9}),0,6,-14,g);const roof=box(26,1,10,SM({color:'#8a3a2a'}),0,13.5,-12,g);roof.rotation.x=0.35;
  box(3,6,0.4,SM({color:'#5a3a2a'}),0,3,-13.4,g);[[-7,6],[7,6]].forEach(([x,y])=>box(4,3.4,0.3,SM({color:'#bfe4ff',emissive:0x9fd8ff,emissiveIntensity:0.4}),x,y,-13.4,g));
  // recycling truck
  const tr=world.truck=new THREE.Group();g.add(tr);tr.position.set(10,0,13);const tm=SM({map:truckTex(),roughness:0.6});
  const body=cst(new THREE.Mesh(new THREE.BoxGeometry(12,7,5.5),[SM({color:'#2f9a5a'}),SM({color:'#2f9a5a'}),SM({color:'#2a8a50'}),SM({color:'#2a8a50'}),tm,tm]));body.position.set(0,4.6,0);tr.add(body);
  box(4,5,5.4,SM({color:'#e8e8ec',roughness:0.4}),-8,3.6,0,tr);box(0.2,2,4.6,SM({color:'#7ab8e8',roughness:0.1}),-10.05,4.8,0,tr);
  [[-8,-2.8],[-8,2.8],[3,-2.8],[3,2.8]].forEach(([x,z])=>{const w=cst(new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,0.8,20),SM({color:'#1a1a1e'})));w.rotation.x=Math.PI/2;w.position.set(x,1.1,z);tr.add(w);});
  world.beacon=pl(0xffa020,0,20,-8,7,0,tr);box(0.8,0.4,0.8,SM({color:'#ffa020',emissive:0xff8000,emissiveIntensity:1}),-8,6.3,0,tr);
}
function buildLake(){const g=new THREE.Group();g.position.set(LAKE,0,0);scene.add(g);
  plane(200,200,SM({color:'#3a8ab8',roughness:0.15,metalness:0.2}),0,-0.4,0,-Math.PI/2,g);
  const dm=SM({map:plankTex('#8a6a42'),roughness:0.8});box(5,0.4,16,dm,0,0.6,0,g);[[-2.2,-7],[2.2,-7],[-2.2,0],[2.2,0],[-2.2,7],[2.2,7]].forEach(([x,z])=>box(0.4,2,0.4,dm,x,-0.2,z,g));
  for(let i=0;i<14;i++){const t=cst(new THREE.Mesh(new THREE.ConeGeometry(4,12,8),SM({color:i%2?'#2a6a3a':'#336f40'})));t.position.set(-60+i*9,6,-70-(i%3)*6);g.add(t);}
  world.sunset=pl(0xffb070,0,90,10,20,40,g);
  world.rods=[];[-1,1].forEach(s=>{const r=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.08,7,6),SM({color:'#3a2a1a'}));scene.add(r);r.visible=false;world.rods.push(r);});
}
function buildOffice(){const g=new THREE.Group();g.position.set(OFF,0,0);scene.add(g);
  plane(40,40,SM({map:plankTex('#5a4030'),roughness:0.8}),0,0,0,-Math.PI/2,g);box(30,18,0.5,SM({map:wallTex('#c8c0a8','#bdb49a'),roughness:0.9}),0,9,-10,g);
  box(10,0.5,4.5,SM({map:plankTex('#5a3a22')}),0,3.6,-3,g);box(9.4,3.4,0.3,SM({color:'#4a3020'}),0,1.8,-0.9,g);
  plane(3,1.5,SM({map:officeTex()}),0,4.6,-0.85,0,g);
  const ch=SM({color:'#2a2a30',roughness:0.6});box(3.2,0.6,3,ch,0,2.4,-6.6,g);box(3.2,4,0.6,ch,0,4.6,-8,g);
  // cobwebs + dust
  const web=SM({color:'#ffffff',transparent:true,opacity:0.35,side:THREE.DoubleSide});for(let i=0;i<6;i++){const l=plane(0.05,4,web,-1.4+i*0.55,4.6,-7.6,0,g);l.rotation.z=0.6-i*0.24;}
  box(10,0.05,4.4,SM({color:'#cfc8b8',transparent:true,opacity:0.5}),0,3.88,-3,g);
  plane(4,4,SM({map:canvasTex(256,256,(gg,w,h)=>{gg.fillStyle='#fff';gg.fillRect(0,0,w,h);gg.fillStyle='#c0302a';gg.fillRect(0,0,w,60);gg.fillStyle='#fff';gg.font='bold 40px sans-serif';gg.textAlign='center';gg.fillText('1994',w/2,44);gg.fillStyle='#333';gg.font='bold 100px sans-serif';gg.fillText('12',w/2,180);})}),6,9,-9.7,0,g);
  pl(0xfff0d0,1.0,40,0,12,4,g);
}
function buildProps(){
  world.slices=[];for(let i=0;i<3;i++){const sh=new THREE.Shape();sh.moveTo(0,0);sh.lineTo(-0.7,1.6);sh.lineTo(0.7,1.6);sh.lineTo(0,0);const geo=new THREE.ExtrudeGeometry(sh,{depth:0.14,bevelEnabled:false});
    const m=cst(new THREE.Mesh(geo,[SM({map:sliceTex(),roughness:0.7}),SM({color:'#e8a030'})]));scene.add(m);m.visible=false;world.slices.push(m);}
  world.pbox=new THREE.Group();scene.add(world.pbox);box(2.6,0.3,2.6,SM({color:'#d8b880'}),0,0,0,world.pbox);world.pboxTop=box(2.6,0.1,2.6,SM({map:canvasTex(128,128,(g)=>{g.fillStyle='#e8d0a0';g.fillRect(0,0,128,128);g.fillStyle='#c0302a';g.font='bold 30px sans-serif';g.textAlign='center';g.fillText('PIZZA',64,74);})}),0,0.2,0,world.pbox);world.pbox.visible=false;
  world.puffs=[];for(let i=0;i<14;i++){const s=sprite(world.T.puff,2,scene,0.9);s.visible=false;world.puffs.push(s);}
  world.cloneGlow=sprite(world.T.glow,6,scene,0.45);world.cloneGlow.visible=false;world.cloneL=pl(0x5ad8ff,0,10,0,0,0);
}
function hideProps(){world.slices.forEach(s=>s.visible=false);world.pbox.visible=false;world.puffs.forEach(p=>p.visible=false);world.cloneGlow.visible=false;world.cloneL.intensity=0;world.rods.forEach(r=>r.visible=false);world.beacon.intensity=0;world.sunset.intensity=0;}
function poofAt(c,k){world.puffs.forEach((s,i)=>{const a=i/world.puffs.length*Math.PI*2;s.visible=k<1;const r=0.4+k*3;s.position.set(c.x+Math.cos(a)*r,c.y+Math.sin(a)*r*0.7,c.z+0.3);const sc=1.6+k*1.8;s.scale.set(sc,sc,1);s.material.opacity=0.9*(1-k);});}
function sliceIn(i,P,arm){const s=world.slices[i];s.visible=true;const p=lw0(P[arm||'armR'],V3(0,-2.3,0.6));s.position.copy(p);s.rotation.set(-0.3,0,Math.PI);return s;}

/* ---------------- characters */
function buildChars(){const add=(id,spec,sc)=>{const g=buildChar(spec);if(sc)g.scale.setScalar(sc);scene.add(g);g.visible=false;chars[id]=g;return g;};
  add('leo',BH.castById('leo6'));add('clone',BH.castById('clone6'));add('mom',BH.castById('mom'));add('dad',BH.castById('dad'));add('max',BH.castById('max'),0.82);add('w1',BH.castById('work1'));add('w2',BH.castById('work2'));add('oldclone',BH.castById('kip')||BH.castById('max'),0.9);}
function showOnly(ids){Object.keys(chars).forEach(k=>chars[k].visible=ids.includes(k));}
function reset(P){['armL','armR','legL','legR','head'].forEach(k=>P[k].rotation.set(0,0,0));P.torso.rotation.set(0,0,0);P.torso.position.y=0;P._anim=null;P.armL.position.set(-1.5,4,0);P.armR.position.set(1.5,4,0);}
function st(id,x,y,z,ry,e){const c=chars[id];c.position.set(x,y,z);c.rotation.set(0,ry||0,0);c.visible=true;const P=c.userData.P;reset(P);if(e)P.setFace(e);if(id==='clone'){world.cloneGlow.visible=true;world.cloneGlow.position.set(x,y+4.5,z-0.6);world.cloneL.position.set(x,y+6,z+2);world.cloneL.intensity=0.6;}return P;}
function sit(P){P.legL.rotation.x=-1.5;P.legR.rotation.x=-1.5;}
function mouth(P,who,t,e){const env=TL.mouth[who];const f=Math.round(t*TL.fps);const a=env?env[f]||0:0;P.setFace(e||P.expr||'default',{mouthOpen:a>0.12?Math.min(1,a*1.1):0});}
function walk(P,t,sp,e){BH.animate(P,t*(sp||1),{motion:'walk',blend:0.01,face:false});P.setFace(e||'default');}
function lw0(o,v){let r=o;while(r.parent&&r.parent!==scene)r=r.parent;r.updateMatrixWorld(true);return o.localToWorld(v);}
const head=id=>lw0(chars[id].userData.P.head,V3(0,0.6,0));
const faceCam=(id,x,y,d)=>lw0(chars[id].userData.P.head,V3(x,0.6+y,d));
function close(id,d,x,y,fov){const hp=head(id);const sc=chars[id].scale.x;camAt(faceCam(id,x==null?0.5:x,y==null?0.05:y,(d||3.4)*1.75/sc),hp.clone().add(V3(0,-0.05,0)),fov||36);}
function camAt(p,l,fov){cam.position.copy(p);cam.lookAt(l);cam.fov=fov||40;cam.updateProjectionMatrix();world.look.copy(l);}
function shake(a,t){cam.position.x+=Math.sin(t*23.1)*a+Math.sin(t*41.7)*a*0.5;cam.position.y+=Math.cos(t*19.3)*a;}
function mood(m){world.mood=m;const M={day:[0x9fd0f0,0xfff4e6,0.75,1.0],dusk:[0xf0a878,0xffd8b0,0.6,0.8],drama:[0x7a8aa8,0xd8e0f0,0.55,0.7]}[m];scene.background.setHex(M[0]);scene.fog.color.setHex(M[0]);world.hemi.color.setHex(M[1]);world.hemi.intensity=M[2];world.key.intensity=M[3];}
// street layout for the climax
function streetScene(t){const L=st('leo',ST-2.3,0,2,0.15,'shocked');const C=st('clone',ST+2.3,0,2,-0.15,'happy');const M=st('mom',ST,0,-2.5,0,'default');world.beacon.intensity=1.5+Math.sin(t*10)*1.5;return {L,C,M};}

/* ---------------- shots */
const SH={
  cold_choice:(u,t,lt)=>{mood('drama');const {L,C,M}=streetScene(t);L.setFace('shocked');C.setFace('smug');M.setFace('sad');camAt(V3(ST+lerp(0.6,0,u),lerp(4.6,4.8,u),lerp(22,18,ease(u))),V3(ST,4.2,0.5),44);showOnly(['leo','clone','mom']);
    S.tags=[{x:0.3,y:0.33,text:'ME',col:'#ffffff'},{x:0.7,y:0.33,text:'CLONE',col:'#5ad8ff'}];S.vign=0.5;},
  clone_poof:(u,t,lt)=>{mood('day');const L=st('leo',-6,1.0,-8.4,0.1,'happy');sit(L);L.setFace('happy',{blink:true});L.torso.rotation.x=-0.5;const C=st('clone',-1,0,-5.5,-0.4,'happy');chars.clone.scale.setScalar(Math.max(0.01,easeOut(lt/0.35)));poofAt(head('clone').add(V3(0,-2,0.5)),clamp(lt/0.7,0,1));
    camAt(V3(1.5,5.5,6),V3(-3.5,3.5,-7),44);showOnly(['leo','clone']);if(lt<0.1)S.flash=0.4;},
  clone_walks:(u,t)=>{mood('day');const z=lerp(16,6,u);const C=st('clone',SCH,0,z,Math.PI,'happy');walk(C,t,1.0,'happy');C.armL.rotation.x=-0.2;camAt(V3(SCH+2.5,5,z-11),V3(SCH,4.2,z),42);showOnly(['clone']);S.tag={text:'CLONE GOES TO SCHOOL',col:'#5ad8ff'};},
  side_by_side:(u,t,lt)=>{mood('day');const swap=lt>1.3;const L=st('leo',swap?2.2:-2.2,0,2,0,'smug');const C=st('clone',swap?-2.2:2.2,0,2,0,'smug');mouth(L,'leo',t,'smug');camAt(V3(0,4.8,lerp(19,17,u)),V3(0,4.2,2),42);showOnly(['leo','clone']);
    S.tags=lt<1.3?[{x:0.31,y:0.34,text:'ME',col:'#ffffff'},{x:0.69,y:0.34,text:'CLONE',col:'#5ad8ff'}]:[{x:0.31,y:0.34,text:'??',col:'#ffffff'},{x:0.69,y:0.34,text:'??',col:'#ffffff'}];},
  principal:(u,t)=>{mood('day');camAt(V3(OFF+lerp(2,1,u),5.2,lerp(8,5,ease(u))),V3(OFF,4.2,-6.8),40);showOnly([]);S.tag={text:'SINCE 1994',col:'#ffd23f'};S.dust=1;},
  pizza_rule:(u,t,lt)=>{mood('day');const P=st('oldclone',-3,0,2,0.2,'happy');const s=sliceIn(0,P);P.armR.rotation.set(-2.0,0,-0.4);const s2=sliceIn(0,P);P.setFace(lt>1.2?'shocked':'happy',{mouthOpen:lt>0.8&&lt<1.2?0.8:0});
    camAt(V3(-1.6,5.4,9),V3(-3,4.6,2),40);showOnly(['oldclone']);S.oldfilm=1;S.glitch=lt>1.2?clamp((lt-1.2)/0.8,0,1):0;S.tag={text:'RULE #1: CLONES CAN\'T EAT PIZZA',col:'#ffd23f'};},
  skip_counter:(u,t,lt)=>{mood('day');const L=st('leo',-6,1.0,-8.4,0.1,'happy');sit(L);L.torso.rotation.x=-0.4;L.armR.rotation.set(-1.9,0,-0.3);sliceIn(1,L);mouth(L,'leo',t,'happy');camAt(V3(-6,6.4,3),V3(-6,4.2,-8.4),40);showOnly(['leo']);S.counter=Math.round(easeOut(u*1.1)*112);},
  leo_couch:(u,t)=>{mood('day');const L=st('leo',-6,1.0,-8.4,0.1,'happy');sit(L);L.torso.rotation.x=-0.6;L.armR.rotation.set(-1.9,0,-0.3);sliceIn(1,L);L.setFace('happy',{mouthOpen:Math.abs(Math.sin(t*10))*0.7});close('leo',lerp(4.2,3.8,u),0.5,0.1,38);showOnly(['leo']);S.tv=1;},
  report_card:(u,t)=>{mood('day');const C=st('clone',SCH,0,0,0,'smug');camAt(V3(SCH,5,9),V3(SCH,4.6,0),40);showOnly(['clone']);S.card=easeOut(u*2.5);},
  fridge:(u,t,lt)=>{mood('day');const M=st('mom',10.5,0,-6.4,-0.6,'happy');M.armR.rotation.set(-2.2,0,-0.2);const L=st('leo',4,0,-3,-0.9,'sad');camAt(V3(lerp(6,7,u),6.2,lerp(4,3,u)),V3(11.4,5.4,-8.2),40);showOnly(['mom','leo']);},
  dad_fishing:(u,t)=>{mood('dusk');world.sunset.intensity=1.6;const D=st('dad',LAKE-1.2,0.8,5,Math.PI,'happy');sit(D);const C=st('clone',LAKE+1.2,0.8,5,Math.PI,'happy');sit(C);D.armR.rotation.set(-1.4,0,0);C.armR.rotation.set(-1.4,0,0);
    world.rods.forEach((r,i)=>{const P=i?C:D;r.visible=true;const p=lw0(P.armR,V3(0,-2.1,0));r.position.copy(p).add(V3(0,1.5,-2.6));r.rotation.x=-1.0;});camAt(V3(LAKE+lerp(6,4,u),4.6,lerp(-4,-3,u)),V3(LAKE,3.4,5),42);showOnly(['dad','clone']);},
  leo_window:(u,t)=>{mood('day');const L=st('leo',6,0,-8.4,Math.PI,'sad');L.head.rotation.y=-0.35;camAt(V3(lerp(11,10.5,u),6.4,-11),V3(5.8,5.0,-8.6),40);showOnly(['leo']);S.dim=0.25;},
  two_leo:(u,t,lt)=>{mood('day');const L=st('leo',SCH-1.8,0,0,Math.PI/2,'shocked');const C=st('clone',SCH+1.8,0,0,-Math.PI/2,'shocked');camAt(V3(SCH+lerp(0.5,0,u),5,lerp(11,8,ease(u))),V3(SCH,4.6,0),42);showOnly(['leo','clone']);S.zoomPunch=lt<0.2?1-lt/0.2:0;S.bigtext='?!';},
  recycle_truck:(u,t,lt)=>{mood('drama');world.truck.position.x=lerp(45,19,easeOut(lt/1.8));world.beacon.intensity=1.5+Math.sin(t*10)*1.5;const W1=st('w1',ST+lerp(14,6,ease((lt-1.8)/1.6)),0,9,-Math.PI/2,'default');const W2=st('w2',ST+lerp(16,8.5,ease((lt-2.0)/1.6)),0,10.5,-Math.PI/2,'default');
    if(lt>1.8){walk(W1,t,1,'default');walk(W2,t+0.3,1,'default');}camAt(V3(ST-8,6,32),V3(ST+7,4.5,11),44);showOnly(lt>1.8?['w1','w2']:[]);},
  mom_stern:(u,t)=>{mood('drama');const M=st('mom',ST,0,-2.5,0,'angry');mouth(M,'mom',t,'angry');close('mom',lerp(4,3.6,u),0.3,0.05,38);showOnly(['mom']);world.beacon.intensity=1.5+Math.sin(t*10)*1.5;},
  mom_bday:(u,t)=>{mood('drama');const M=st('mom',ST,0,-2.5,0,'default');mouth(M,'mom',t,'smug');close('mom',lerp(3.6,3.0,ease(u)),-0.2,0.05,36);showOnly(['mom']);S.dim=0.2;},
  leo_sweat:(u,t)=>{mood('drama');streetScene(t);chars.leo.userData.P.setFace('shocked');close('leo',3.0,0.2,0.05,36);showOnly(['leo']);S.shakeA=0.01;},
  clone_smile:(u,t)=>{mood('drama');streetScene(t);const C=chars.clone.userData.P;C.setFace('smug');close('clone',3.0,-0.2,0.05,36);showOnly(['clone']);S.bigtext='MARCH 3RD';},
  van_grab:(u,t,lt)=>{mood('drama');const x=lerp(-3,3,ease(u));const L=st('leo',ST+x,0,lerp(2,7,ease(u)),Math.PI*0.25,'sad');L.armL.rotation.set(-0.3,0,1.2);L.armR.rotation.set(-0.3,0,-1.2);L.legL.rotation.x=0.4;L.legR.rotation.x=-0.3;
    const W1=st('w1',ST+x-2.4,0,lerp(2,7,ease(u))+0.4,Math.PI*0.6,'default');const W2=st('w2',ST+x+2.4,0,lerp(2,7,ease(u))+0.4,-Math.PI*0.6,'default');W1.armR.rotation.set(-1.4,0,-0.6);W2.armL.rotation.set(-1.4,0,0.6);world.beacon.intensity=1.5+Math.sin(t*10)*1.5;
    camAt(V3(ST+x,5,lerp(15,19,u)),V3(ST+x,4,lerp(2,7,u)),44);showOnly(['leo','w1','w2']);},
  mom_turns:(u,t)=>{mood('drama');const M=st('mom',ST,0,-2.5,lerp(0,Math.PI*0.85,ease(u*1.5)),'sad');camAt(V3(ST+1,5.6,6),V3(ST,4.8,-2.5),40);showOnly(['mom']);S.dim=0.2;},
  max_pizza:(u,t,lt)=>{mood('day');const x=lerp(-14,-6,ease(u*1.2));const P=st('max',ST+x,0,4,Math.PI/2,'happy');if(u<0.8)walk(P,t,1.2,'happy');P.armL.rotation.set(-1.5,0,0.3);P.armR.rotation.set(-1.5,0,-0.3);const b=world.pbox;b.visible=true;b.position.copy(lw0(P.torso,V3(0,3.2,1.7)));b.rotation.set(0,Math.PI/2,0);
    camAt(V3(ST+x+3,4.4,12),V3(ST+x,3.4,4),42);showOnly(['max']);S.tag={text:'PIZZA TIME',col:'#ffd23f'};},
  leo_eats:(u,t,lt)=>{mood('day');const L=st('leo',ST-3,0,2,0.15,'happy');L.armR.rotation.set(-2.0,0,-0.3);const k=Math.floor(lt*3)%2;sliceIn(1,L).scale.setScalar(Math.max(0.05,1-(lt%0.66)/0.66));L.setFace('happy',{mouthOpen:Math.abs(Math.sin(t*16))});close('leo',lerp(3.8,3.2,u),0.4,0.05,36);showOnly(['leo']);S.speed=1;S.shakeA=0.01;},
  clone_glitch:(u,t,lt)=>{mood('drama');const C=st('clone',ST+3,0,2,-0.15,'shocked');C.armR.rotation.set(-2.0,0,-0.3);sliceIn(2,C);C.setFace(lt<0.6?'happy':'shocked',{mouthOpen:lt<0.6?0.8:0});close('clone',lerp(3.6,3.0,u),-0.3,0.05,36);showOnly(['clone']);
    S.glitch=lt>0.6?clamp((lt-0.6)/0.6,0,1):0;if(lt>1.4)chars.clone.visible=Math.sin(t*40)>0;},
  mom_hug:(u,t)=>{mood('day');const L=st('leo',ST-0.6,0,0.6,0.5,'sad');L.setFace('sad',{blink:true});const M=st('mom',ST+0.6,0,0,-0.5,'happy');M.setFace('happy',{blink:true});M.armL.rotation.set(-1.4,0,1.1);M.armR.rotation.set(-1.4,0,-1.1);L.armL.rotation.set(-1.3,0,1.0);L.armR.rotation.set(-1.3,0,-1.0);
    camAt(V3(ST+lerp(2.5,1.5,u),5.6,lerp(9,7.5,u)),V3(ST,5,0.3),40);showOnly(['leo','mom']);S.hearts=1;},
  calendar_heart:(u,t)=>{mood('day');const L=st('leo',ST-3,0,2,0.15,'happy');close('leo',4.4,0.4,0.05,40);showOnly(['leo']);S.calendar=easeOut(u*2);},
  max_end:(u,t)=>{mood('day');const P=st('max',ST-6,0,4,0.3,'happy');mouth(P,'max',t,'happy');P.armR.rotation.set(-2.0,0,-0.3);const s=sliceIn(0,P);close('max',lerp(3.8,3.4,u),0.3,0.05,38);showOnly(['max']);},
};

/* ---------------- 2D overlays */
function T(text,x,y,size,fill,stroke,lw,align){og.font=`${size}px ${FONT}`;og.textAlign=align||'center';og.textBaseline='middle';og.lineJoin='round';if(stroke){og.lineWidth=lw||size*0.18;og.strokeStyle=stroke;og.strokeText(text,x,y);}og.fillStyle=fill;og.fillText(text,x,y);}
function RR(x,y,w,h,r){og.beginPath();og.moveTo(x+r,y);og.arcTo(x+w,y,x+w,y+h,r);og.arcTo(x+w,y+h,x,y+h,r);og.arcTo(x,y+h,x,y,r);og.arcTo(x,y,x+w,y,r);og.closePath();}
function drawGlitch(k,t){const r=rng('gl'+Math.floor(t*30));const src=R.domElement;og.save();for(let i=0;i<8*k+2;i++){const y=r()*H,h=H*(0.01+r()*0.05),dx=(r()-0.5)*W*0.12*k;og.drawImage(src,0,y/H*src.height,src.width,h/H*src.height,dx,y,W,h);}
  og.globalCompositeOperation='screen';og.globalAlpha=0.35*k;og.fillStyle='#00e0ff';og.fillRect((r()-0.5)*W*0.02,0,W,H);og.fillStyle='#ff2060';og.fillRect(0,(r()-0.5)*H*0.01,W,H*0.02);og.restore();
  og.save();og.fillStyle=`rgba(90,216,255,${0.6*k})`;for(let i=0;i<30*k;i++){og.fillRect(r()*W,r()*H,W*(0.01+r()*0.04),W*0.008);}og.restore();}
function drawOverlays(t){
  if(S.dim){og.fillStyle=`rgba(10,10,25,${S.dim})`;og.fillRect(0,0,W,H);}
  if(S.oldfilm){og.save();og.fillStyle='rgba(120,90,40,0.18)';og.fillRect(0,0,W,H);const r=rng('of'+Math.floor(t*12));og.strokeStyle='rgba(30,20,10,0.35)';og.lineWidth=2;for(let i=0;i<4;i++){const x=r()*W;og.beginPath();og.moveTo(x,0);og.lineTo(x+(r()-0.5)*20,H);og.stroke();}og.restore();}
  if(S.glitch)drawGlitch(S.glitch,t);
  if(S.speed){const r=rng('sp'+Math.floor(t*30));og.save();og.translate(W/2,H/2);og.strokeStyle='#fff';for(let i=0;i<50;i++){const a=r()*Math.PI*2,r0=H*(0.32+r()*0.1),r1=H*(0.75+r()*0.2);og.globalAlpha=0.3+r()*0.4;og.lineWidth=W*0.004;og.beginPath();og.moveTo(Math.cos(a)*r0,Math.sin(a)*r0);og.lineTo(Math.cos(a)*r1,Math.sin(a)*r1);og.stroke();}og.restore();}
  if(S.tv){og.fillStyle='rgba(90,140,255,0.08)';og.fillRect(0,0,W,H);}
  if(S.dust){const r=rng('du');og.fillStyle='rgba(255,250,230,0.6)';for(let i=0;i<60;i++){const x=(r()*W+t*20*(r()-0.5))%W,y=(r()*H+t*15)%H;og.fillRect(x,y,2,2);}}
  if(S.tags)S.tags.forEach(tg=>{T(tg.text,W*tg.x,H*tg.y,W*0.07,tg.col,'#0a0a12',W*0.014);T('▼',W*tg.x,H*tg.y+W*0.06,W*0.04,tg.col,'#0a0a12',W*0.01);});
  if(S.counter!=null){og.save();og.fillStyle='rgba(0,0,0,0.75)';RR(W*0.12,H*0.1,W*0.76,H*0.14,W*0.03);og.fill();T('DAYS SKIPPED',W/2,H*0.135,W*0.055,'#ffd23f');T(String(S.counter),W/2,H*0.2,W*0.12,'#ffffff','#000',W*0.012);og.restore();}
  if(S.card){const k=S.card;og.save();og.globalAlpha=k;og.translate(W/2,H*0.32);og.rotate(-0.04);og.scale(lerp(0.7,1,k),lerp(0.7,1,k));og.fillStyle='#fbf8ee';og.shadowColor='rgba(0,0,0,0.5)';og.shadowBlur=W*0.04;RR(-W*0.38,-H*0.15,W*0.76,H*0.3,W*0.02);og.fill();og.shadowBlur=0;
    T('REPORT CARD',0,-H*0.11,W*0.06,'#2a3a6a');T('LEO (CLONE)',0,-H*0.07,W*0.035,'#5a6a8a');[['MATH','A+'],['SCIENCE','A'],['ENGLISH','A'],['ART','A+']].forEach(([s2,g2],i)=>{T(s2,-W*0.16,-H*0.02+i*H*0.04,W*0.042,'#333');T(g2,W*0.2,-H*0.02+i*H*0.04,W*0.06,'#1a9a3a');});og.restore();}
  if(S.bigtext){T(S.bigtext,W/2,H*0.18,W*0.14,'#ffffff','#0a0a12',W*0.025);}
  if(S.tag){og.font=`${W*0.045}px ${FONT}`;const tw=og.measureText(S.tag.text).width+W*0.08;og.save();og.translate(W/2,H*0.1);og.rotate(-0.03);og.fillStyle='rgba(0,0,0,0.75)';RR(-tw/2,-H*0.026,tw,H*0.052,H*0.02);og.fill();T(S.tag.text,0,0,W*0.045,S.tag.col);og.restore();}
  if(S.hearts){const r=rng('ht');og.save();for(let i=0;i<12;i++){const x=r()*W,y=H*0.6-((t*0.2+r())%1)*H*0.55,s=W*(0.02+r()*0.02);og.fillStyle='rgba(255,90,130,0.85)';og.beginPath();og.moveTo(x,y+s);og.bezierCurveTo(x-s*2,y-s*0.4,x-s*0.6,y-s*1.7,x,y-s*0.5);og.bezierCurveTo(x+s*0.6,y-s*1.7,x+s*2,y-s*0.4,x,y+s);og.fill();}og.restore();}
  if(S.calendar){const k=S.calendar;og.save();og.globalAlpha=k;og.translate(W/2,H*0.3);og.rotate(0.04);og.scale(lerp(0.6,1,k),lerp(0.6,1,k));og.fillStyle='#fff';og.shadowColor='rgba(0,0,0,0.5)';og.shadowBlur=W*0.04;RR(-W*0.3,-H*0.13,W*0.6,H*0.26,W*0.02);og.fill();og.shadowBlur=0;
    og.fillStyle='#d8304a';RR(-W*0.3,-H*0.13,W*0.6,H*0.07,W*0.02);og.fill();T('MARCH',0,-H*0.095,W*0.07,'#fff');T('3',0,H*0.03,W*0.22,'#222');og.strokeStyle='#ff3a6a';og.lineWidth=W*0.012;og.beginPath();og.moveTo(0,H*0.11);og.bezierCurveTo(-W*0.2,H*0.0,-W*0.13,-H*0.07,0,-H*0.02);og.bezierCurveTo(W*0.13,-H*0.07,W*0.2,H*0.0,0,H*0.11);og.stroke();og.restore();}
  const vg=og.createRadialGradient(W/2,H*0.48,H*0.32,W/2,H/2,H*0.78);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,`rgba(0,0,0,${S.vign||0.3})`);og.fillStyle=vg;og.fillRect(0,0,W,H);
  if(S.flash>0){og.fillStyle=`rgba(255,255,255,${S.flash})`;og.fillRect(0,0,W,H);}
}
function captionAt(t){for(const s of TL.segs){for(let i=0;i<s.words.length;i++){const w=s.words[i];const nx=s.words[i+1];const end=nx?nx.s:Math.min(w.e+0.25,s.end+0.25);if(t>=w.s&&t<end)return {w,since:t-w.s,who:s.who};}}return null;}
function drawCaption(t){const c=captionAt(t);if(!c)return;const text=c.w.w.toUpperCase();const base=W*0.11*(text.length>8?8/text.length*1.05:1);const k=c.since<0.06?lerp(1.25,1,c.since/0.06):1;
  og.save();og.translate(W/2,H*0.7);og.scale(k,k);og.font=`${base}px ${FONT}`;og.textAlign='center';og.textBaseline='middle';og.lineJoin='round';og.shadowColor='rgba(0,0,0,0.6)';og.shadowBlur=base*0.25;og.lineWidth=base*0.22;og.strokeStyle='#0a0a12';og.strokeText(text,0,0);og.shadowColor='transparent';
  og.fillStyle=c.w.red?'#ffd23f':(c.who==='mom'?'#ffb3c8':c.who==='max'?'#8fd8ff':'#ffffff');og.fillText(text,0,0);og.restore();}

/* ---------------- entry points */
S.init=async function(timeline,w,h,fontUrl){TL=timeline;W=w;H=h;SS=window.BH_SS||1.25;
  const ff=new FontFace('Luckiest Guy',`url(${fontUrl})`);await ff.load();document.fonts.add(ff);
  R=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});R.setPixelRatio(1);R.setSize(Math.round(W*SS),Math.round(H*SS));R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.12;R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
  cam=new THREE.PerspectiveCamera(40,W/H,0.1,1000);
  buildWorld();buildChars();
  const [oc,o2]=cv(W,H);out=oc;og=o2;og.imageSmoothingEnabled=true;og.imageSmoothingQuality='high';scene.updateMatrixWorld(true);return true;};
const KEYS=['flash','tag','tags','shakeA','zoomPunch','speed','dim','oldfilm','glitch','tv','dust','counter','card','bigtext','hearts','calendar','vign'];
S.frame=function(f,q){const t=f/TL.fps;const shot=TL.shots.find(s=>t>=s.s&&t<s.e)||TL.shots[TL.shots.length-1];
  KEYS.forEach(k=>S[k]=null);hideProps();world.truck.position.x=19;
  if(shot!==curShot){curShot=shot;showOnly([]);}
  Object.values(chars).forEach(c=>{c.rotation.set(0,0,0);});chars.clone.scale.setScalar(1);
  const u=(t-shot.s)/(shot.e-shot.s),lt=t-shot.s;scene.updateMatrixWorld(true);
  (SH[shot.name]||SH.max_end)(u,t,lt);
  if(S.shakeA)shake(S.shakeA,t);
  world.key.target.position.copy(world.look);world.key.position.copy(world.look).addScaledVector(world.keyDir,70);
  scene.updateMatrixWorld(true);R.render(scene,cam);
  og.globalAlpha=1;og.globalCompositeOperation='source-over';og.filter=S.oldfilm?'sepia(0.6) contrast(1.1)':world.mood==='drama'?'contrast(1.1) saturate(0.95)':'contrast(1.05) saturate(1.18)';
  if(S.zoomPunch){const z=1+0.07*S.zoomPunch;og.drawImage(R.domElement,(W-W*z)/2,(H-H*z)/2,W*z,H*z);}else og.drawImage(R.domElement,0,0,W,H);
  og.filter=`blur(${Math.round(W*0.014)}px) brightness(1.15)`;og.globalCompositeOperation='screen';og.globalAlpha=0.18;og.drawImage(R.domElement,0,0,W,H);og.filter='none';og.globalCompositeOperation='source-over';og.globalAlpha=1;
  drawOverlays(t);drawCaption(t);
  return out.toDataURL('image/jpeg',q||0.94);};
})();
