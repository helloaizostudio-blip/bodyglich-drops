/* Episode 11 "My Mom Had One Day Left" (narrator Leo). Premium pass: moving cameras (dolly / orbit / crane / OTS),
   handheld drift, fake depth of field, whip-pan transitions, idle breathing + blinks + talk gestures, glowing
   death-counter numbers over every head, a gas explosion, and a window-reflection twist.
   ep11/scene.js = this + cast_ep11.js (build_scene.py). Entry points: SAMPLE.init(...), SAMPLE.frame(f) */
(function(){
/* Episode 11 "My Mom Had One Day Left": Leo (main narrator) + Grandpa (skydiver). Others come from the shared cast. */
(function(){
const leo={id:'leo11',name:'Leo',role:'Narrator',group:'Main',origin:'original',skin:'#e6b48c',hair:{style:'messy',color:'#17110e'},
  face:{eyeShape:'almond',eyes:'dot',eyeScale:0.85,eyeColor:'#3a2a1a',brows:'normal',mouth:'smile',nose:'button'},
  torso:{inner:'#cfd2d8',outer:{style:'hoodie',color:'#2c3240',fabric:'fleece',strings:'#e8e8e8'}},sleeves:{color:'#2c3240',len:'full',fabric:'fleece'},pants:{color:'#3a3f4a',fabric:'cotton',shoes:'#d8d8d8'}};
const gpa={id:'gpa11',name:'Grandpa',role:'Skydiver',group:'Ep11',origin:'original',skin:'#e2b896',hair:{style:'sides',color:'#ececec'},
  face:{eyeShape:'round',eyes:'dot',brows:'bushy',browColor:'#dcdcdc',mouth:'grin',beard:'short',beardColor:'#e4e4e4',age:'old'},
  torso:{inner:'#ff7a1a',outer:{style:'bomber',color:'#e8402a'}},sleeves:{color:'#e8402a',len:'full'},pants:{color:'#3a3a48',fabric:'nylon',shoes:'#222',shoeStyle:'boot'},extras:['goggles:#2a2a2a']};
[leo,gpa].forEach(s=>{const i=CAST.findIndex(c=>c.id===s.id);if(i>=0)CAST[i]=s;else CAST.push(s);});
})();

const S=window.SAMPLE={};
let TL,W,H,R,scene,cam,out,og,tmpC,tg,gC,gg,world={},chars={},curShot=null,SS=1.25;
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const lerp=(a,b,t)=>a+(b-a)*t,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);},easeOut=t=>1-Math.pow(1-clamp(t,0,1),3),easeIn=t=>Math.pow(clamp(t,0,1),2),eio=t=>{t=clamp(t,0,1);return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;};
const FONT='"Luckiest Guy", Impact, sans-serif';
const EXT=300, STREET=600, SKY=900;

/* ---------------- textures */
function canvasTex(w,h,draw){const [c,g]=cv(w,h);draw(g,w,h);const t=tex(c);t._c=c;return t;}
function glowTex(col){return canvasTex(128,128,(g)=>{const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.3,col);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);});}
function plankTex(col){return canvasTex(256,256,(g,w,h)=>{fabricFill(g,0,0,w,h,col,'canvas');g.strokeStyle='rgba(0,0,0,0.22)';g.lineWidth=3;for(let y=0;y<h;y+=42){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}});}
function wallTex(col,stripe){return canvasTex(256,256,(g,w,h)=>{fabricFill(g,0,0,w,h,col,'cotton');if(stripe){g.fillStyle=stripe;for(let x=0;x<w;x+=40)g.fillRect(x,0,14,h);}});}
function tileTex(a,b){return canvasTex(256,256,(g)=>{for(let y=0;y<4;y++)for(let x=0;x<4;x++){g.fillStyle=(x+y)%2?a:b;g.fillRect(x*64,y*64,64,64);}});}
function bubbleTex(){return canvasTex(256,256,(g,w,h)=>{g.fillStyle='rgba(220,240,255,0.55)';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=32)for(let x=(y/32%2)*16;x<w;x+=32){const gr=g.createRadialGradient(x+10,y+10,1,x+12,y+12,13);gr.addColorStop(0,'rgba(255,255,255,0.95)');gr.addColorStop(1,'rgba(180,210,240,0.2)');g.fillStyle=gr;g.beginPath();g.arc(x+12,y+12,12,0,7);g.fill();}});}
function signTex(text,bg,fg){return canvasTex(512,256,(g,w,h)=>{g.fillStyle=bg;g.fillRect(0,0,w,h);g.strokeStyle=fg;g.lineWidth=14;g.strokeRect(10,10,w-20,h-20);g.fillStyle=fg;g.font='bold 92px "Luckiest Guy", Impact, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,w/2,h/2+6);});}
// the death counter shown over a head
function numberCanvas(){const [c,g]=cv(512,256);return [c,g];}
function drawNumber(entry,text,col){const [c,g]=entry.cv;g.clearRect(0,0,512,256);g.font='bold 150px "Luckiest Guy", Impact, sans-serif';g.textAlign='center';g.textBaseline='middle';
  g.shadowColor=col;g.shadowBlur=40;g.lineWidth=14;g.strokeStyle='rgba(0,0,0,0.7)';g.strokeText(text,256,138);g.fillStyle=col;g.fillText(text,256,138);g.shadowBlur=0;g.fillStyle='#ffffff';g.globalAlpha=0.35;g.fillText(text,256,134);g.globalAlpha=1;entry.tex.needsUpdate=true;entry.text=text;}

const SM=(o)=>new THREE.MeshStandardMaterial(o);
function cst(m){m.castShadow=true;m.receiveShadow=true;return m;}
function box(w,h,d,mat,x,y,z,parent){const m=cst(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat.isMaterial?mat:SM({color:mat,roughness:0.8})));m.position.set(x,y,z);(parent||scene).add(m);return m;}
function sprite(t,s,parent,op){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,opacity:op==null?1:op}));m.scale.set(s,s,1);(parent||scene).add(m);return m;}
function pl(col,int,dist,x,y,z,parent){const L=new THREE.PointLight(col,int,dist,1.6);L.position.set(x,y,z);(parent||scene).add(L);return L;}
function plane(w,h,mat,x,y,z,rx,parent){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);m.position.set(x,y,z);m.rotation.x=rx||0;m.receiveShadow=true;(parent||scene).add(m);return m;}

/* ---------------- world */
function buildWorld(){
  scene=new THREE.Scene();scene.background=new THREE.Color('#0c1424');scene.fog=new THREE.Fog(0x0c1424,80,260);
  world.hemi=new THREE.HemisphereLight(0xfff4e6,0x40362c,0.6);scene.add(world.hemi);
  const key=world.key=new THREE.DirectionalLight(0xfff0dc,1.0);key.castShadow=true;key.shadow.mapSize.set(2048,2048);const sc=key.shadow.camera;sc.left=-30;sc.right=30;sc.top=30;sc.bottom=-30;sc.near=1;sc.far=200;key.shadow.bias=-0.0004;key.shadow.normalBias=0.05;scene.add(key);scene.add(key.target);
  world.rim=new THREE.DirectionalLight(0x9fd0ff,0.6);scene.add(world.rim);scene.add(world.rim.target);
  world.look=V3(0,0,0);world.keyDir=V3(0.45,0.8,0.55).normalize();
  world.T={warm:glowTex('rgba(255,170,90,0.9)'),fire:glowTex('rgba(255,120,30,0.95)'),smoke:glowTex('rgba(60,60,70,0.85)'),red:glowTex('rgba(255,40,60,0.8)'),cloud:glowTex('rgba(255,255,255,0.9)')};
  buildKitchen();buildExterior();buildStreet();buildSky();buildFX();
}
function buildKitchen(){const g=world.kitchen=new THREE.Group();scene.add(g);
  const ft=tileTex('#e8e0d0','#d0c4b0');ft.wrapS=ft.wrapT=THREE.RepeatWrapping;ft.repeat.set(5,5);plane(60,60,SM({map:ft,roughness:0.55}),0,0,0,-Math.PI/2,g);
  const wm=SM({map:wallTex('#f2e4cc','#ead8bc'),roughness:0.9});box(40,20,0.5,wm,0,10,-12,g);box(0.5,20,40,wm,-16,10,0,g);box(0.5,20,40,wm,16,10,0,g);
  const cab=SM({color:'#6aa08a',roughness:0.6});box(16,3.6,3,cab,-3,1.8,-10,g);box(16.2,0.3,3.2,SM({color:'#f4f0e8',roughness:0.3}),-3,3.7,-10,g);box(16,4,1.6,cab,-3,12,-10.8,g);
  world.stove=box(3,0.2,2.6,SM({color:'#2a2a2e',metalness:0.6,roughness:0.3}),-8,3.9,-10,g);[[-8.7,-10.5],[-7.3,-10.5],[-8.7,-9.4],[-7.3,-9.4]].forEach(([x,z])=>{const r=new THREE.Mesh(new THREE.TorusGeometry(0.35,0.06,6,20),SM({color:'#444'}));r.rotation.x=Math.PI/2;r.position.set(x,4.05,z);g.add(r);});
  world.toaster=box(1.4,1.0,0.9,SM({color:'#c8ccd4',metalness:0.7,roughness:0.25}),2,4.3,-10,g);
  world.fridge=box(4,9,3,SM({color:'#e8ecf0',roughness:0.35,metalness:0.2}),11,4.5,-9.8,g);
  world.pads=new THREE.Group();g.add(world.pads);[[0,2],[0,5],[0,8]].forEach(([x,y],i)=>{const p=box(4.4,2.6,0.9,SM({color:['#f4c0d0','#c0e0f4','#f4e4a0'][i],roughness:0.95}),11,y+0.4,-8.0,world.pads);});world.pads.visible=false;
  box(6,6,0.2,SM({color:'#0b1838',emissive:0x0a1838,emissiveIntensity:1}),6,9,-11.7,g);world.kWin=g.children[g.children.length-1];box(6.6,0.4,0.4,SM({color:'#fff'}),6,6,-11.6,g);box(0.3,6,0.4,SM({color:'#fff'}),6,9,-11.6,g);
  // stairs with a taped sign
  for(let i=0;i<8;i++)box(4,0.8,1.6,SM({map:plankTex('#8a5a32')}),-13,0.4+i*0.8,4-i*1.6,g);world.stairSign=plane(4,2,SM({map:signTex('NO STAIRS','#ffd23f','#c0302a'),side:THREE.DoubleSide}),-10.9,4,0,0,g);world.stairSign.rotation.y=Math.PI/2;world.stairSign.visible=false;
  // clock
  const ck=world.clockCv=cv(256,128);world.clockTex=tex(ck[0]);plane(3,1.5,new THREE.MeshBasicMaterial({map:world.clockTex}),-2,15.8,-11.7,0,g);
  world.kLight=pl(0xffe0b0,1.2,40,0,12,0,g);world.kNight=pl(0x6a8ad8,0,40,6,9,-8,g);
}
function drawClock(text){const [c,g]=world.clockCv;g.fillStyle='#0a0a0c';g.fillRect(0,0,256,128);g.font='bold 84px "DejaVu Sans Mono", monospace';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#ff3030';g.shadowColor='#ff3030';g.shadowBlur=18;g.fillText(text,128,68);g.shadowBlur=0;world.clockTex.needsUpdate=true;}
function buildExterior(){const g=world.ext=new THREE.Group();g.position.set(EXT,0,0);scene.add(g);
  plane(200,200,SM({color:'#2a4a2a',roughness:1}),0,0,0,-Math.PI/2,g);plane(200,10,SM({color:'#2a2a30',roughness:0.9}),0,0.03,22,-Math.PI/2,g);
  const hm=SM({map:wallTex('#d8c8b0','#cfbea4'),roughness:0.9});box(26,13,14,hm,0,6.5,-8,g);const rf=SM({color:'#4a2a22'});[-1,1].forEach(s=>{const r=box(15,0.8,16,rf,s*6.6,15.4,-8,g);r.rotation.z=-s*0.55;});
  world.door=box(3,6,0.4,SM({color:'#5a3a2a'}),0,3,-0.8,g);world.extWin=box(5,4,0.3,SM({color:'#ffb060',emissive:0xff9a40,emissiveIntensity:0.8}),-7,7,-0.8,g);world.extWin2=box(5,4,0.3,SM({color:'#ffb060',emissive:0xff9a40,emissiveIntensity:0.8}),7,7,-0.8,g);
  box(4,0.5,3,SM({color:'#6a6a6a'}),0,0.25,1,g);world.porch=pl(0xffb060,1.0,20,0,7,3,g);
  for(let i=0;i<4;i++){const x=-30+i*20;box(0.3,9,0.3,SM({color:'#333'}),x,4.5,18,g);const L=pl(0xffd8a0,0.9,25,x,9,18,g);sprite(world.T.warm,2.2,g,0.8).position.set(x,9,18);}
  [[-20,-14],[20,-14],[-26,4],[26,6]].forEach(([x,z])=>{const tr=cst(new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.7,8,8),SM({color:'#3a2a1e'})));tr.position.set(x,4,z);g.add(tr);const c=cst(new THREE.Mesh(new THREE.SphereGeometry(4,12,10),SM({color:'#1e3a22'})));c.position.set(x,10,z);g.add(c);});
  world.reflGlass=plane(9,7,new THREE.MeshStandardMaterial({color:0x9fc0e8,transparent:true,opacity:0.22,roughness:0.05,metalness:0.6,side:THREE.DoubleSide}),-7,7,-0.4,0,g);world.reflGlass.visible=false;
}
function buildStreet(){const g=world.street=new THREE.Group();g.position.set(STREET,0,0);scene.add(g);
  plane(200,200,SM({color:'#bfb8aa',roughness:0.9}),0,0,0,-Math.PI/2,g);plane(200,12,SM({color:'#3a3a40',roughness:0.9}),0,0.02,14,-Math.PI/2,g);
  const cols=['#e8a87c','#9ec5e8','#f2d38a','#b8a0d8','#a8d8b0','#f0b0b0'];for(let i=0;i<9;i++){const h=14+(i%3)*5;box(12,h,10,SM({color:cols[i%6],roughness:0.9}),-48+i*12,h/2,-14,g);for(let k=0;k<3;k++)box(2.4,2.4,0.2,SM({color:'#bfe4ff',emissive:0x5a8ab8,emissiveIntensity:0.3}),-52+i*12+k*4,h-4,-8.9,g);}
  for(let i=0;i<6;i++){const tr=cst(new THREE.Mesh(new THREE.SphereGeometry(2.6,10,8),SM({color:'#4a8a4a'})));tr.position.set(-40+i*16,7,4);g.add(tr);box(0.5,5,0.5,SM({color:'#5a3a22'}),-40+i*16,2.5,4,g);}
}
function buildSky(){const g=world.sky=new THREE.Group();g.position.set(SKY,0,0);scene.add(g);world.clouds=[];const r=rng('cl');
  for(let i=0;i<40;i++){const s=sprite(world.T.cloud,10+r()*14,g,0.8);s.position.set((r()-0.5)*80,-30+r()*80,-20-r()*40);world.clouds.push(s);}
  plane(400,400,SM({color:'#4a8a4a'}),0,-120,0,-Math.PI/2,g);
}
function buildFX(){
  world.nums={};
  world.fire=[];for(let i=0;i<22;i++){const s=sprite(i%3?world.T.fire:world.T.smoke,3,scene,0.9);s.visible=false;world.fire.push(s);}
  world.debris=[];for(let i=0;i<14;i++){const d=box(0.4+(i%3)*0.3,0.2,0.6+(i%4)*0.3,SM({color:i%2?'#6aa08a':'#f2e4cc'}),0,0,0,scene);d.visible=false;world.debris.push(d);}
  world.boomL=pl(0xff7a30,0,80,0,0,0);
  world.helmet=cst(new THREE.Mesh(new THREE.SphereGeometry(1.0,24,16,0,Math.PI*2,0,Math.PI/2),SM({color:'#ffd23f',roughness:0.3})));scene.add(world.helmet);world.helmet.visible=false;
  world.wrap=cst(new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.6,4.6,20,1,true),SM({map:bubbleTex(),transparent:true,side:THREE.DoubleSide,roughness:0.2})));scene.add(world.wrap);world.wrap.visible=false;
  world.toast=box(0.9,0.9,0.2,SM({color:'#c88a4a'}),0,0,0,scene);world.toast.visible=false;world.noToast=sprite(canvasTex(256,256,(g)=>{g.strokeStyle='#e0202a';g.lineWidth=26;g.beginPath();g.arc(128,128,100,0,7);g.stroke();g.beginPath();g.moveTo(58,58);g.lineTo(198,198);g.stroke();}),3,scene);world.noToast.visible=false;
  world.vac=new THREE.Group();scene.add(world.vac);box(1.4,1.2,2.2,SM({color:'#c0302a',roughness:0.4}),0,0.6,0,world.vac);const hose=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,4,8),SM({color:'#333'}));hose.position.set(0,2.4,0.6);hose.rotation.x=0.4;world.vac.add(hose);world.vac.visible=false;
}
function hideFX(){world.fire.forEach(s=>s.visible=false);world.debris.forEach(d=>d.visible=false);world.boomL.intensity=0;[world.helmet,world.wrap,world.toast,world.noToast,world.vac,world.pads,world.stairSign,world.reflGlass].forEach(o=>o.visible=false);
  Object.values(world.nums).forEach(n=>n.spr.visible=false);}
function numFor(id){if(!world.nums[id]){const cvv=numberCanvas();const t=tex(cvv[0]);const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false}));spr.scale.set(3.2,1.6,1);scene.add(spr);world.nums[id]={cv:cvv,tex:t,spr,text:''};}return world.nums[id];}
function showNum(id,text,col,scale){const n=numFor(id);if(n.text!==text||n.col!==col){drawNumber(n,text,col);n.col=col;}const c=chars[id];const hp=lw0(c.userData.P.head,V3(0,2.1,0));n.spr.position.copy(hp);n.spr.visible=true;const s=(scale||1)*c.scale.x;n.spr.scale.set(3.2*s,1.6*s,1);return n;}

/* ---------------- characters + acting */
function buildChars(){const add=(id,spec,sc)=>{const g=buildChar(spec);if(sc)g.scale.setScalar(sc);scene.add(g);g.visible=false;chars[id]=g;return g;};
  add('leo',BH.castById('leo11'));add('mom',BH.castById('mom'));add('max',BH.castById('max'),0.82);add('gpa',BH.castById('gpa11'));
  ['brick','mia','nana','dave','rex','kip','sora','theo'].forEach((id,i)=>{const c=BH.castById(id);if(c)add('p'+i,c,id==='kip'||id==='sora'?0.85:1);});}
function showOnly(ids){Object.keys(chars).forEach(k=>chars[k].visible=ids.includes(k));}
function reset(P){['armL','armR','legL','legR','head'].forEach(k=>P[k].rotation.set(0,0,0));P.torso.rotation.set(0,0,0);P.torso.position.y=0;P.torso.scale.set(1,1,1);P._anim=null;P.armL.position.set(-1.5,4,0);P.armR.position.set(1.5,4,0);}
function st(id,x,y,z,ry,e){const c=chars[id];c.position.set(x,y,z);c.rotation.set(0,ry||0,0);c.visible=true;const P=c.userData.P;reset(P);P._e=e||'default';P._talk=null;P._noIdle=false;if(e)P.setFace(e);return P;}
function sit(P){P.legL.rotation.x=-1.5;P.legR.rotation.x=-1.5;}
function walk(P,t,sp,e){BH.animate(P,t*(sp||1),{motion:'walk',blend:0.01,face:false});P.setFace(e||'default');P._noIdle=true;}
function talk(P,who){P._talk=who;}
// idle acting applied after each shot sets its pose: breathing, head drift, blinks, talk gestures
function act(t){Object.entries(chars).forEach(([id,c],i)=>{if(!c.visible)return;const P=c.userData.P;if(P._noIdle)return;const ph=i*1.7;
  P.torso.scale.y=1+0.012*Math.sin(t*2.4+ph);P.head.rotation.x+=0.03*Math.sin(t*0.9+ph);P.head.rotation.y+=0.05*Math.sin(t*0.6+ph*1.3);P.head.rotation.z+=0.02*Math.sin(t*0.8+ph);
  P.armL.rotation.z+=0.03*Math.sin(t*1.1+ph);P.armR.rotation.z-=0.03*Math.sin(t*1.2+ph);
  let open=0;if(P._talk){const env=TL.mouth[P._talk];const f=Math.round(t*TL.fps);open=env?env[f]||0:0;if(open>0.12){P.armR.rotation.x+=-0.25*open*(0.6+0.4*Math.sin(t*5));P.armR.rotation.z+=-0.12*open;P.head.rotation.x+=0.05*open;}}
  const blink=((t+ph)%3.3)<0.11;P.setFace(P._e,{mouthOpen:open>0.12?Math.min(1,open*1.1):0,blink:blink&&open<0.12});});}
function lw0(o,v){let r=o;while(r.parent&&r.parent!==scene)r=r.parent;r.updateMatrixWorld(true);return o.localToWorld(v);}
const head=id=>lw0(chars[id].userData.P.head,V3(0,0.6,0));
const faceCam=(id,x,y,d)=>lw0(chars[id].userData.P.head,V3(x,0.6+y,d));

/* ---------------- premium camera kit */
function camAt(p,l,fov){cam.position.copy(p);cam.lookAt(l);cam.fov=fov||40;cam.updateProjectionMatrix();world.look.copy(l);}
function dolly(p0,p1,l0,l1,u,f0,f1){const k=eio(u);camAt(p0.clone().lerp(p1,k),l0.clone().lerp(l1,k),lerp(f0||40,f1||f0||40,k));}
function orbit(c,r,a0,a1,y,u,fov,ly){const a=lerp(a0,a1,eio(u));camAt(V3(c.x+Math.sin(a)*r,c.y+y,c.z+Math.cos(a)*r),V3(c.x,c.y+(ly==null?0:ly),c.z),fov||40);}
// close-up on a face: x = side offset, d = distance, y = height offset, drift = slow push
function cu(id,d,x,y,fov,u,push){const hp=head(id);const sc=chars[id].scale.x;const dd=d*(1-(push||0.12)*eio(u||0));camAt(faceCam(id,x,y,dd*1.75/sc),hp.clone().add(V3(0,-0.1,0)),fov||34);}
// over-the-shoulder: camera behind `from`'s shoulder looking at `to`'s face
function ots(from,to,u,side,fov){const a=head(from),b=head(to);const dir=b.clone().sub(a).setY(0).normalize();const right=V3(dir.z,0,-dir.x).multiplyScalar(side||1);
  const p=a.clone().addScaledVector(dir,-2.6).add(right.multiplyScalar(1.5)).add(V3(0,0.6,0));p.addScaledVector(dir,0.8*eio(u));camAt(p,b.clone().add(V3(0,-0.2,0)),fov||36);S.focus=focusOf(to);}
function handheld(t,a){cam.position.x+=(Math.sin(t*1.3)+Math.sin(t*2.9)*0.5)*a;cam.position.y+=(Math.sin(t*1.7+1)+Math.sin(t*3.3)*0.4)*a*0.7;cam.rotation.z+=Math.sin(t*1.1)*a*0.02;}
function shake(a,t){cam.position.x+=Math.sin(t*23.1)*a+Math.sin(t*41.7)*a*0.5;cam.position.y+=Math.cos(t*19.3)*a;}
function focusOf(id){cam.updateMatrixWorld(true);const p=head(id).clone().add(V3(0,-0.6,0)).project(cam);return {x:(p.x+1)/2,y:(1-p.y)/2,r:0.34};}
function mood(m){world.mood=m;const M={day:[0xbfe0f5,0xfff4e6,0.8,1.05,0xfff0dc],warm:[0x2a2030,0xffe6c8,0.6,0.7,0xffd8b0],night:[0x0c1424,0x8aa0d8,0.35,0.45,0x9ab4ff],sky:[0x6fb8f5,0xffffff,0.9,1.2,0xffffff]}[m];
  scene.background.setHex(M[0]);scene.fog.color.setHex(M[0]);world.hemi.color.setHex(M[1]);world.hemi.intensity=M[2];world.key.intensity=M[3];world.key.color.setHex(M[4]);
  world.kWin.material.emissive.setHex(m==='day'?0xbfe4ff:0x0a1838);world.kNight.intensity=m==='night'||m==='warm'?0.8:0;}

/* ---------------- shots */
const KIT=V3(0,0,0);
const SH={
  cold_mom:(u,t)=>{mood('warm');const M=st('mom',-3,0,-7.6,0.3,'happy');M.armR.rotation.set(-1.0,0,-0.2);const L=st('leo',2,0,-1,-2.6,'sad');
    showOnly(['mom','leo']);const n=showNum('mom','1','#ff2a3a',1.2);ots('leo','mom',u,1,34);cam.lookAt(head('mom').add(V3(0,0.5,0)));S.focus.r=0.3;S.redGlow=0.5+0.2*Math.sin(t*4);},
  street_numbers:(u,t)=>{mood('day');const ids=[];['p0','p1','p2','p3','p4','p5'].forEach((id,i)=>{if(!chars[id])return;const x=STREET-20+i*7+((t*1.2+i*5)%3),z=6+(i%2)*3;const P=st(id,x,0,z,Math.PI/2*(i%2?1:-1)*0+Math.PI/2,'default');walk(P,t+i,1,'default');ids.push(id);
      showNum(id,[12045,880,31200,4,22781,9150][i].toLocaleString('en-US'),i===3?'#ff2a3a':'#ffffff',0.9);});
    dolly(V3(STREET-30,4,26),V3(STREET-10,5,24),V3(STREET-22,5,7),V3(STREET-2,5,7),u,44,40);showOnly(ids);},
  number_close:(u,t)=>{mood('day');const P=st('p3',STREET-4,0,7,0.3,'default');showNum('p3','4','#ff2a3a',1.2);const hp=head('p3');dolly(hp.clone().add(V3(-2,3,7)),hp.clone().add(V3(-0.6,2.4,4.2)),hp.clone().add(V3(0,1.6,0)),hp.clone().add(V3(0,1.9,0)),u,40,34);showOnly(['p3']);S.focus=focusOf('p3');S.focus.y-=0.1;},
  gpa_sky:(u,t)=>{mood('sky');const y=lerp(40,10,u);const G=st('gpa',SKY,y,0,0,'happy');chars.gpa.rotation.x=-1.25;G.armL.rotation.set(0,0,1.9+Math.sin(t*6)*0.1);G.armR.rotation.set(0,0,-1.9-Math.sin(t*6)*0.1);G.legL.rotation.x=0.4;G.legR.rotation.x=0.2;G._noIdle=true;
    world.clouds.forEach((c,i)=>{c.position.y=((-30+i*2.1+t*25)%80)-30;});showNum('gpa','3,000','#ffffff',1.1);orbit(V3(SKY,y+2,0),12,-0.6,0.5,3,u,48);showOnly(['gpa']);S.speed=0.6;},
  max_vacuum:(u,t,lt)=>{mood('day');const P=st('max',-6,0.9,-8.4,0.2,'shocked');sit(P);P.armL.rotation.set(-2.4,0,0.5);P.armR.rotation.set(-2.4,0,-0.5);P.torso.rotation.x=0.2+0.05*Math.sin(t*20);P._noIdle=true;
    const v=world.vac;v.visible=true;v.position.set(lerp(2,-2,ease(u)),0,-5);v.rotation.y=-0.6;showNum('max','70,000','#ffffff',1.0);dolly(V3(4,4.2,4),V3(1,4.6,0.5),V3(-5,3.2,-7),V3(-6,4.6,-8.4),u,46,36);showOnly(['max']);S.shakeA=0.008;},
  rule_card:(u,t)=>{mood('warm');const L=st('leo',0,0,-2,0,'smug');talk(L,'leo');showNum('leo','?','#ffffff',1);cu('leo',4.4,0.6,0.2,40,u,0.15);showOnly(['leo']);S.rules=u;S.blurBg=1;},
  mom_kitchen:(u,t)=>{mood('day');const M=st('mom',-3,0,-7.6,0.2,'happy');M.armR.rotation.set(-1.1,0,-0.3+Math.sin(t*5)*0.15);showNum('mom','1','#ff2a3a',1.2);orbit(V3(-3,4,-7.6),9,0.7,0.4,1.5,u,40,0.5);showOnly(['mom']);S.whip=1;},
  mom_number:(u,t)=>{mood('day');st('mom',-3,0,-7.6,0.2,'happy');showNum('mom','1','#ff2a3a',1.5);const hp=head('mom');dolly(hp.clone().add(V3(0.5,1.5,6)),hp.clone().add(V3(0.2,2.0,3.6)),hp.clone().add(V3(0,1.6,0)),hp.clone().add(V3(0,1.9,0)),u,36,30);showOnly(['mom']);S.redGlow=0.7;S.zoomPunch=u<0.25?1-u*4:0;},
  leo_plan:(u,t)=>{mood('day');const L=st('leo',2,0,-2,-0.4,'angry');L.armL.rotation.set(-1.2,0,0.6);L.armR.rotation.set(-1.2,0,-0.6);talk(L,'leo');cu('leo',4.2,-0.5,0.1,36,u,0.18);showOnly(['leo']);S.focus=focusOf('leo');},
  mom_helmet:(u,t)=>{mood('day');const M=st('mom',-3,0,-6,0.2,'shocked');const h=world.helmet;h.visible=true;h.position.copy(lw0(M.head,V3(0,1.1,0)));h.scale.setScalar(1.15);showNum('mom','1','#ff2a3a',1.0);cu('mom',4.2,0.3,0.4,38,u,0.2);showOnly(['mom']);S.whip=1;},
  bubble_wrap:(u,t)=>{mood('day');const M=st('mom',-3,0,-6,0.2,'shocked');const w=world.wrap;w.visible=true;w.position.set(-3,2.6,-6);w.scale.set(1.4,1,1.3);world.helmet.visible=true;world.helmet.position.copy(lw0(M.head,V3(0,1.1,0)));world.helmet.scale.setScalar(1.15);showNum('mom','1','#ff2a3a',1.0);
    camAt(V3(1,5,6),V3(-3,4,-6),42);showOnly(['mom']);S.whip=1;},
  no_stairs:(u,t)=>{mood('day');world.stairSign.visible=true;camAt(V3(-6,5,4),V3(-10.8,4,0),40);showOnly([]);S.whip=1;},
  no_toast:(u,t)=>{mood('day');const tt=world.toast;tt.visible=true;tt.position.set(2,5.2+Math.abs(Math.sin(u*Math.PI))*1.2,-10);world.noToast.visible=true;world.noToast.position.set(2,5.2,-8.8);camAt(V3(3,6,-5),V3(2,4.8,-10),38);showOnly([]);S.whip=1;},
  fridge_padded:(u,t)=>{mood('day');world.pads.visible=true;const M=st('mom',7,0,-5.5,-0.7,'shocked');talk(M,'mom');M.armR.rotation.set(-1.6,0,-0.4);world.helmet.visible=true;world.helmet.position.copy(lw0(M.head,V3(0,1.1,0)));world.helmet.scale.setScalar(1.15);showNum('mom','1','#ff2a3a',1.0);
    dolly(V3(2,5.5,4),V3(3,5.2,2),V3(9,5,-7.5),V3(8.4,5.2,-6.5),u,44,40);showOnly(['mom']);},
  clock_1159:(u,t,lt)=>{mood('night');drawClock((t*2|0)%2?'11:59':'11 59');dolly(V3(-2,15.4,-4),V3(-2,15.6,-7),V3(-2,15.8,-11.7),V3(-2,15.8,-11.7),u,40,34);showOnly([]);S.vign=0.7;},
  leo_smell:(u,t,lt)=>{mood('night');const L=st('leo',-4,0,-5,-0.5,'shocked');L.head.rotation.x=-0.2;L.head.rotation.y=-0.4*Math.sin(t*3);cu('leo',3.6,0.5,0.05,34,u,0.25);showOnly(['leo']);S.gas=1;S.vign=0.6;},
  drag_out:(u,t,lt)=>{mood('night');const x=EXT+lerp(-1,1,u),z=lerp(-3,6,eio(u));const L=st('leo',x-0.9,0,z+1.2,0.1,'angry');walk(L,t,2.2,'angry');const M=st('mom',x+0.9,0,z,-0.1,'shocked');walk(M,t+0.3,2.2,'shocked');L.armL.rotation.set(-1.0,0,-0.9);
    world.door.rotation.y=-1.4;camAt(V3(x+lerp(6,4,u),3.5,z+11),V3(x,4,z),46);handheld(t,0.25);showOnly(['leo','mom']);showNum('mom','1','#ff2a3a',0.9);},
  explosion:(u,t,lt)=>{mood('night');const c=V3(EXT,6,-6);const k=easeOut(lt/0.9);world.fire.forEach((s,i)=>{s.visible=true;const a=i*2.39996;const r=k*(3+(i%5)*1.6);s.position.set(c.x+Math.cos(a)*r,c.y+Math.sin(a*1.3)*r*0.7+k*2,c.z+4+Math.sin(a)*2);s.scale.setScalar(3+k*5);s.material.opacity=0.95*(1-k*0.4);});
    world.debris.forEach((d,i)=>{d.visible=true;const a=i*2.1;d.position.set(c.x+Math.cos(a)*k*9,c.y+Math.sin(k*Math.PI)*(5+i%4)-k*3,c.z+6+Math.sin(a)*k*6);d.rotation.set(k*i,k*i*0.7,0);});
    world.boomL.position.copy(c).add(V3(0,0,6));world.boomL.intensity=6*(1-k*0.6);world.extWin.material.emissive.setHex(0xff6a20);world.extWin.material.emissiveIntensity=3;
    const L=st('leo',EXT-1,0,8,Math.PI*0.9,'shocked');L._noIdle=true;L.torso.rotation.x=0.9;chars.leo.position.y=lerp(0,1.5,Math.sin(Math.min(1,lt/0.8)*Math.PI));const M=st('mom',EXT+1,0,9,Math.PI*0.9,'shocked');M._noIdle=true;M.torso.rotation.x=0.9;chars.mom.position.y=chars.leo.position.y;
    camAt(V3(EXT+9,2.5,22),V3(EXT,5,0),48);showOnly(['leo','mom']);S.flash=lt<0.12?0.85:0;S.shakeA=0.35*(1-u);S.zoomPunch=lt<0.2?1:0;},
  lawn_lie:(u,t)=>{mood('night');const L=st('leo',EXT-1.5,0.5,12.4,0,'shocked');chars.leo.rotation.x=-Math.PI/2;L.armL.rotation.set(0,0,0.5);L.armR.rotation.set(0,0,-0.5);const M=st('mom',EXT+1.5,0.5,12.4,0,'shocked');chars.mom.rotation.x=-Math.PI/2;M.armL.rotation.set(0,0,0.5);M.armR.rotation.set(0,0,-0.5);
    world.fire.slice(0,8).forEach((s,i)=>{s.visible=true;s.position.set(EXT-4+i*1.2,8+Math.sin(t*3+i)*0.5,-5);s.scale.setScalar(4);s.material.opacity=0.6;});world.boomL.position.set(EXT,8,-3);world.boomL.intensity=2+Math.sin(t*9);
    cam.up.set(0,0,-1);camAt(V3(EXT,lerp(17,13.5,eio(u)),9.6),V3(EXT,0,9.6),42);cam.up.set(0,1,0);showOnly(['leo','mom']);},
  number_flip:(u,t,lt)=>{mood('night');const M=st('mom',EXT+1.2,0,12,Math.PI*0.9,'shocked');world.boomL.position.set(EXT,8,-3);world.boomL.intensity=1.5;const k=clamp((lt-0.3)/1.0,0,1);const val=k<=0?1:Math.round(1+easeOut(k)*13999);
    showNum('mom',val.toLocaleString('en-US'),k>=1?'#5aff8a':k>0?'#ffd23f':'#ff2a3a',1.3);const hp=head('mom');camAt(hp.clone().add(V3(1.6,1.0,-10)),hp.clone().add(V3(0,1.0,0)),36);showOnly(['mom']);if(k>=1&&lt<1.45)S.flash=0.3;S.sparkle=k>=1?1:0;},
  leo_proud:(u,t)=>{mood('night');const L=st('leo',EXT-1.2,0,12,Math.PI*0.9,'happy');L.armL.rotation.set(0,0,2.5);L.armR.rotation.set(0,0,-2.5);talk(L,'leo');world.boomL.position.set(EXT,8,-3);world.boomL.intensity=1.5;
    orbit(head('leo').add(V3(0,-1.5,0)),7,Math.PI+0.5,Math.PI-0.3,0.6,u,40,0.8);showOnly(['leo']);S.focus=focusOf('leo');},
  mom_stare:(u,t)=>{mood('night');const M=st('mom',EXT+1.2,0,12,Math.PI*0.9,'shocked');talk(M,'mom');M.armR.rotation.set(-1.8,0,-0.2);const L=st('leo',EXT-1.2,0,12.3,Math.PI*0.9+Math.PI,'happy');world.boomL.position.set(EXT,8,-3);world.boomL.intensity=1.2;
    showNum('mom','14,000','#5aff8a',0.8);ots('leo','mom',u,-1,32);showOnly(['mom','leo']);S.vign=0.55;},
  window_turn:(u,t,lt)=>{mood('night');const L=st('leo',EXT-7,0,5,lerp(0.1,Math.PI,eio(clamp(lt/1.2,0,1))),'shocked');world.extWin.material.emissive.setHex(0x402010);world.extWin.material.emissiveIntensity=0.3;
    dolly(V3(EXT-3,5,16),V3(EXT-5,5.2,12),head('leo').add(V3(0,-0.6,0)),head('leo').add(V3(0,-0.4,0)),u,40,36);showOnly(['leo']);S.focus=focusOf('leo');},
  reflection_one:(u,t,lt)=>{mood('night');const L=st('leo',EXT-7,0,5,Math.PI,'shocked');world.reflGlass.visible=true;world.extWin.visible=false;showNum('leo','1','#ff2a3a',1.5);
    const hp=head('leo');dolly(V3(EXT-6.4,hp.y+0.9,-3.0),V3(EXT-6.6,hp.y+1.2,-1.6),hp.clone().add(V3(0,0.7,0)),hp.clone().add(V3(0,1.1,0)),u,42,34);showOnly(['leo']);S.glassFx=1;S.redGlow=0.8;S.zoomPunch=lt<0.2?1-lt/0.2:0;
    if(lt>1.4)S.part2=clamp((lt-1.4)/0.35,0,1);S.black=clamp((lt-2.35)/0.35,0,1)*0.85;},
};

/* ---------------- 2D overlays + post */
function T(text,x,y,size,fill,stroke,lw,align){og.font=`${size}px ${FONT}`;og.textAlign=align||'center';og.textBaseline='middle';og.lineJoin='round';if(stroke){og.lineWidth=lw||size*0.18;og.strokeStyle=stroke;og.strokeText(text,x,y);}og.fillStyle=fill;og.fillText(text,x,y);}
function RR(x,y,w,h,r){og.beginPath();og.moveTo(x+r,y);og.arcTo(x+w,y,x+w,y+h,r);og.arcTo(x+w,y+h,x,y+h,r);og.arcTo(x,y+h,x,y,r);og.arcTo(x,y,x+w,y,r);og.closePath();}
function composite(src){
  // fake depth of field: blurred plate, then the sharp frame through a soft ellipse around the subject
  const f=S.focus;
  if(f||S.blurBg){og.filter=`blur(${Math.round(W*0.008)}px)`;og.drawImage(src,0,0,W,H);og.filter='none';
    if(f){tg.clearRect(0,0,W,H);tg.globalCompositeOperation='source-over';tg.drawImage(src,0,0,W,H);tg.globalCompositeOperation='destination-in';const cx=f.x*W,cy=f.y*H,r=f.r*W;
      const gr=tg.createRadialGradient(cx,cy,r*0.45,cx,cy,r*1.25);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(1,'rgba(0,0,0,0)');tg.fillStyle=gr;tg.fillRect(0,0,W,H);tg.globalCompositeOperation='source-over';og.drawImage(tmpC,0,0);}}
  else og.drawImage(src,0,0,W,H);}
function drawOverlays(t){
  if(S.whip>0){/* handled in post as a smear */}
  if(S.redGlow){const gr=og.createRadialGradient(W/2,H*0.25,0,W/2,H*0.25,W*0.7);gr.addColorStop(0,`rgba(255,30,50,${0.25*S.redGlow})`);gr.addColorStop(1,'rgba(255,30,50,0)');og.fillStyle=gr;og.fillRect(0,0,W,H);}
  if(S.gas){og.save();og.globalAlpha=0.22;const r=rng('gas');for(let i=0;i<8;i++){const x=((r()*W+t*40*(i%2?1:-1))%W+W)%W,y=H*(0.2+r()*0.5);const gr=og.createRadialGradient(x,y,0,x,y,W*0.3);gr.addColorStop(0,'rgba(170,220,120,0.9)');gr.addColorStop(1,'rgba(170,220,120,0)');og.fillStyle=gr;og.fillRect(0,0,W,H);}og.restore();}
  if(S.speed){const r=rng('sp'+Math.floor(t*30));og.save();og.strokeStyle='rgba(255,255,255,0.6)';for(let i=0;i<40;i++){const x=r()*W,y=r()*H,l=H*(0.05+r()*0.12);og.globalAlpha=S.speed*(0.3+r()*0.5);og.lineWidth=W*0.003;og.beginPath();og.moveTo(x,y);og.lineTo(x,y+l);og.stroke();}og.restore();}
  if(S.sparkle){const r=rng('spk');og.save();og.fillStyle='rgba(180,255,200,0.9)';for(let i=0;i<14;i++){const x=r()*W,y=r()*H*0.5,s=W*0.012*(0.5+0.5*Math.sin(t*7+i));og.beginPath();og.arc(x,y,s,0,7);og.fill();}og.restore();}
  if(S.glassFx){og.save();og.globalCompositeOperation='screen';const gr=og.createLinearGradient(0,0,W,H);gr.addColorStop(0.3,'rgba(160,190,230,0)');gr.addColorStop(0.45,'rgba(160,190,230,0.18)');gr.addColorStop(0.55,'rgba(160,190,230,0)');og.fillStyle=gr;og.fillRect(0,0,W,H);og.restore();
    og.fillStyle='#120c08';const b=W*0.045;og.fillRect(0,0,b,H);og.fillRect(W-b,0,b,H);og.fillRect(0,0,W,b);og.fillRect(W*0.86,H*0.55,b,H);}
  if(S.rules!=null){const k=easeOut(S.rules*2.5);og.save();og.globalAlpha=k;og.translate(W/2,H*0.3);og.scale(lerp(0.8,1,k),lerp(0.8,1,k));const w=W*0.84,h=H*0.25;og.fillStyle='rgba(12,10,20,0.88)';RR(-w/2,-h/2,w,h,W*0.03);og.fill();og.strokeStyle='#ff2a3a';og.lineWidth=W*0.006;og.stroke();
    T('THE RULES',0,-h*0.32,W*0.075,'#ff2a3a');[['1','YOU CAN\'T CHANGE YOUR NUMBER'],['2','YOU CAN\'T SEE YOUR OWN']].forEach(([n,l],i)=>{const a=clamp(S.rules*3-0.5-i*0.7,0,1);og.globalAlpha=k*a;T(n+'.',-w*0.4,h*(0.02+i*0.26),W*0.06,'#ffd23f');T(l,w*0.04,h*(0.02+i*0.26),W*0.043,'#ffffff');});og.restore();}
  const vg=og.createRadialGradient(W/2,H*0.48,H*0.3,W/2,H/2,H*0.78);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,`rgba(0,0,0,${S.vign||(world.mood==='night'?0.5:0.3)})`);og.fillStyle=vg;og.fillRect(0,0,W,H);
  // film grain (subtle)
  const r=rng('gr'+Math.floor(t*24));og.fillStyle='rgba(255,255,255,0.035)';for(let i=0;i<300;i++)og.fillRect(r()*W,r()*H,1.5,1.5);
  if(S.flash>0){og.fillStyle=`rgba(255,240,220,${S.flash})`;og.fillRect(0,0,W,H);}
  if(S.black>0){og.fillStyle=`rgba(0,0,0,${S.black})`;og.fillRect(0,0,W,H);}
  if(S.part2){const k=easeOut(S.part2);og.save();og.translate(W/2,H*0.42);og.rotate(-0.05);og.scale(lerp(1.6,1,k),lerp(1.6,1,k));og.globalAlpha=k;T('PART 2?',0,0,W*0.16,'#ff2a3a','#0a0a12',W*0.03);og.restore();}
}
function captionAt(t){for(const s of TL.segs){for(let i=0;i<s.words.length;i++){const w=s.words[i];const nx=s.words[i+1];const end=nx?nx.s:Math.min(w.e+0.25,s.end+0.25);if(t>=w.s&&t<end)return {w,since:t-w.s,who:s.who};}}return null;}
function drawCaption(t){if(S.black>=0.85)return;const c=captionAt(t);if(!c)return;const text=c.w.w.toUpperCase();const base=W*0.105*(text.length>8?8/text.length*1.05:1);const k=c.since<0.07?lerp(1.3,1,easeOut(c.since/0.07)):1;
  og.save();og.translate(W/2,H*0.72);og.scale(k,k);og.rotate(c.since<0.07?(1-c.since/0.07)*-0.06:0);og.font=`${base}px ${FONT}`;og.textAlign='center';og.textBaseline='middle';og.lineJoin='round';og.shadowColor='rgba(0,0,0,0.65)';og.shadowBlur=base*0.3;og.lineWidth=base*0.22;og.strokeStyle='#0a0a12';og.strokeText(text,0,0);og.shadowColor='transparent';
  og.fillStyle=c.w.red?'#ff3a4a':(c.who==='mom'?'#ffc8d8':'#ffffff');og.fillText(text,0,0);og.restore();}

/* ---------------- entry points */
S.init=async function(timeline,w,h,fontUrl){TL=timeline;W=w;H=h;SS=window.BH_SS||1.25;
  const ff=new FontFace('Luckiest Guy',`url(${fontUrl})`);await ff.load();document.fonts.add(ff);
  R=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});R.setPixelRatio(1);R.setSize(Math.round(W*SS),Math.round(H*SS));R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.12;R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
  cam=new THREE.PerspectiveCamera(40,W/H,0.1,1000);
  buildWorld();buildChars();drawClock('11:59');
  const [oc,o2]=cv(W,H);out=oc;og=o2;og.imageSmoothingEnabled=true;og.imageSmoothingQuality='high';const [tc,t2]=cv(W,H);tmpC=tc;tg=t2;const [gc2,gg2]=cv(W,H);gC=gc2;gg=gg2;scene.updateMatrixWorld(true);return true;};
const KEYS=['flash','black','shakeA','zoomPunch','speed','focus','blurBg','whip','redGlow','gas','sparkle','glassFx','rules','vign','part2'];
S.frame=function(f,q){const t=f/TL.fps;const shot=TL.shots.find(s=>t>=s.s&&t<s.e)||TL.shots[TL.shots.length-1];
  KEYS.forEach(k=>S[k]=null);hideFX();world.door.rotation.y=0;world.extWin.visible=true;world.extWin.material.emissive.setHex(0xff9a40);world.extWin.material.emissiveIntensity=0.8;
  if(shot!==curShot){curShot=shot;showOnly([]);}
  Object.values(chars).forEach(c=>{c.rotation.set(0,0,0);});
  const u=(t-shot.s)/(shot.e-shot.s),lt=t-shot.s;scene.updateMatrixWorld(true);
  (SH[shot.name]||SH.reflection_one)(u,t,lt);
  act(t);scene.updateMatrixWorld(true);
  if(!S.focus&&['cold_mom','mom_stare'].includes(shot.name)===false){}
  handheld(t,0.04);if(S.shakeA)shake(S.shakeA,t);
  world.key.target.position.copy(world.look);world.key.position.copy(world.look).addScaledVector(world.keyDir,70);world.rim.target.position.copy(world.look);world.rim.position.copy(world.look).add(V3(-40,25,-50));
  scene.updateMatrixWorld(true);R.render(scene,cam);
  og.globalAlpha=1;og.globalCompositeOperation='source-over';
  const grade={day:'contrast(1.06) saturate(1.15)',warm:'contrast(1.1) saturate(1.05) sepia(0.12)',night:'contrast(1.12) saturate(0.95)',sky:'contrast(1.05) saturate(1.2)'}[world.mood]||'none';
  og.filter='none';og.fillStyle='#000';og.fillRect(0,0,W,H);
  if(S.zoomPunch){const z=1+0.07*S.zoomPunch;og.drawImage(R.domElement,(W-W*z)/2,(H-H*z)/2,W*z,H*z);}else composite(R.domElement);
  gg.clearRect(0,0,W,H);gg.drawImage(out,0,0);og.filter=grade;og.drawImage(gC,0,0);og.filter='none';
  // whip-pan smear on the first frames of a shot
  if(S.whip&&lt<0.12){const k=1-lt/0.12;og.save();og.globalAlpha=0.35*k;for(let i=1;i<6;i++)og.drawImage(R.domElement,-i*W*0.05*k,0,W,H);og.restore();}
  // bloom
  og.filter=`blur(${Math.round(W*0.014)}px) brightness(1.15)`;og.globalCompositeOperation='screen';og.globalAlpha=0.18;og.drawImage(R.domElement,0,0,W,H);og.filter='none';og.globalCompositeOperation='source-over';og.globalAlpha=1;
  drawOverlays(t);drawCaption(t);
  return out.toDataURL('image/jpeg',q||0.94);};
})();
