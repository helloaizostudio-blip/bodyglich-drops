/* Episode 8 "I Ate The Worst Cursed Fruit" (pirate adventure, narrator Mako). Bright tropical anime-adventure look:
   saturated sea and sky, rim light, bloom, speed lines and impact frames. Original crew and designs.
   Entry points: SAMPLE.init(timeline, W, H, fontUrl), SAMPLE.frame(f)
   ep08/scene.js is generated from this file + cast_ep08.js by ep08/build_scene.py */
(function(){
/* Episode 8 "The Worst Cursed Fruit": original pirate crew (anime-adventure inspired, not copied).
   Loaded after builder.js + cast.js; adds specs to CAST so scenes can use BH.castById('mako') etc. */
(function(){
const SPECS=[
 {id:'mako',name:'Mako',role:'Rowboat Captain',group:'Ep8',origin:'original',
  skin:'#e3ad80',hair:{style:'anime',color:'#17323a'},
  face:{eyeShape:'round',eyes:'big',eyeColor:'#2b6f8a',brows:'thick',mouth:'grin',nose:'button'},
  torso:{inner:'#f4f1e8',outer:{style:'open',color:'#e07a2e',fabric:'canvas'},belt:'#2f6b3a'},
  sleeves:{len:'none'},pants:{color:'#2a8f8a',style:'shorts',fabric:'canvas',rolled:true,shoes:'#8a5a32',shoeStyle:'flat'},
  extras:['wristband:#2f6b3a']},
 {id:'pip',name:'Pip',role:'Navigator',group:'Ep8',origin:'original',
  skin:'#f1cfae',hair:{style:'bob',color:'#9a7fd1'},
  face:{eyeShape:'sleepy',eyes:'dot',eyeColor:'#4a3a78',brows:'arched',mouth:'smile',nose:'button',freckles:true,lashes:true},
  torso:{inner:'#f6efe2',pattern:'stripes',patternColor:'#e0664f'},
  sleeves:{color:'#f6efe2',len:'short',cuff:'#e0664f'},pants:{color:'#6f7a3a',style:'shorts',fabric:'canvas',shoes:'#6a3a24',shoeStyle:'boot'},
  extras:['map']},
 {id:'basil',name:'Basil',role:'The Cook (can\'t cook)',group:'Ep8',origin:'original',
  skin:'#e6bb94',hair:{style:'emo',color:'#c9ced6'},
  face:{eyeShape:'droopy',eyes:'dot',eyeColor:'#2f6b4f',brows:'normal',mouth:'smirk',nose:'button'},
  torso:{inner:'#f4f2ec',collar:true,outer:{style:'waistcoat',color:'#2f5a46'}},
  sleeves:{color:'#f4f2ec',len:'rolled'},pants:{color:'#23262b',fabric:'twill',shoes:'#3a2a1e',shoeStyle:'dress'},
  extras:['apron:#f2f0ea','spoon']},
 {id:'crate',name:'Crate',role:'The Strongman (wears a box)',group:'Ep8',origin:'original',body:'buff',
  skin:'#d8a77a',hair:{style:'anime',color:'#d9682c'},
  face:{eyeShape:'wide',eyes:'dot',eyeColor:'#5a3a22',brows:'thick',mouth:'grin',nose:'button'},
  torso:{inner:'#c49460',fabric:'canvas',graphic:{shape:'text',text:'FRAGILE',color:'#7a4a22',size:17}},
  sleeves:{len:'none'},pants:{color:'#c49460',fabric:'canvas',shoes:'#5a3a22',shoeStyle:'boot'},
  extras:['wristband:#7a4a22']},
 {id:'gorr',name:'Captain Gorr',role:'The Billion-Coin Pirate',group:'Ep8',origin:'original',body:'buff',
  skin:'#c98b62',hair:{style:'buzz',color:'#141212'},hat:{style:'captain',color:'#18181c'},
  face:{eyeShape:'sharp',eyes:'sharp',eyeColor:'#8a1f1f',brows:'angry',mouth:'smirk',nose:'wide',beard:'full',beardColor:'#141212',scar:'l'},
  torso:{inner:'#16161a',outer:{style:'coat2',color:'#6a1a20',length:'long'}},
  sleeves:{color:'#6a1a20',len:'full',cuff:'#c9a227'},pants:{color:'#2a2622',fabric:'leather',shoes:'#141212',shoeStyle:'boot'},
  extras:['gloves:#8d939c']},
];
SPECS.forEach(s=>{const i=CAST.findIndex(c=>c.id===s.id);if(i>=0)CAST[i]=s;else CAST.push(s);});
})();

const S=window.SAMPLE={};
let TL,W,H,R,scene,cam,out,og,world={},chars={},curShot=null,SS=1.25;
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const lerp=(a,b,t)=>a+(b-a)*t,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);},easeOut=t=>1-Math.pow(1-clamp(t,0,1),3),easeIn=t=>Math.pow(clamp(t,0,1),2);
const FONT='"Luckiest Guy", Impact, sans-serif';
const ISL=-300, LAUGH=300, DEEP=1000, POST=1500, SKYY=160;

/* ---------------- textures */
function canvasTex(w,h,draw){const [c,g]=cv(w,h);draw(g,w,h);const t=tex(c);t._c=c;return t;}
function puffTex(){return canvasTex(256,256,(g)=>{for(let i=0;i<9;i++){const x=60+((i*53)%140),y=110+((i*37)%60)-20,r=50+((i*29)%30);const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(255,255,255,0.95)');gr.addColorStop(0.6,'rgba(250,252,255,0.75)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,256,256);}
  const sh=g.createLinearGradient(0,120,0,220);sh.addColorStop(0,'rgba(0,0,0,0)');sh.addColorStop(1,'rgba(120,150,190,0.25)');g.globalCompositeOperation='source-atop';g.fillStyle=sh;g.fillRect(0,0,256,256);});}
function bubbleTex(){return canvasTex(256,256,(g)=>{const c=128;
  const gr=g.createRadialGradient(c,c,60,c,c,124);gr.addColorStop(0,'rgba(200,240,255,0.04)');gr.addColorStop(0.78,'rgba(190,230,255,0.10)');gr.addColorStop(0.9,'rgba(255,170,230,0.45)');gr.addColorStop(0.95,'rgba(140,255,230,0.65)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.beginPath();g.arc(c,c,124,0,7);g.fill();
  g.strokeStyle='rgba(255,255,255,0.85)';g.lineWidth=9;g.lineCap='round';g.beginPath();g.arc(c,c,96,Math.PI*1.08,Math.PI*1.42);g.stroke();
  g.fillStyle='rgba(255,255,255,0.9)';g.beginPath();g.arc(c-38,c-62,7,0,7);g.fill();
  g.strokeStyle='rgba(255,255,255,0.35)';g.lineWidth=5;g.beginPath();g.arc(c,c,104,Math.PI*0.1,Math.PI*0.35);g.stroke();});}
function glowTex(col){return canvasTex(128,128,(g)=>{const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.3,col);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);});}
function dropTex(){return canvasTex(64,64,(g)=>{const gr=g.createRadialGradient(32,32,0,32,32,30);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.5,'rgba(220,250,255,0.9)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);});}
function plankTex(col){return canvasTex(256,256,(g,w,h)=>{fabricFill(g,0,0,w,h,col,'canvas');g.strokeStyle='rgba(0,0,0,0.28)';g.lineWidth=3;for(let y=0;y<h;y+=42){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
  g.fillStyle='rgba(0,0,0,0.18)';for(let i=0;i<14;i++){g.fillRect((i*71)%w,(i*43)%h,4,4);}const r=rng(col);g.strokeStyle='rgba(255,255,255,0.08)';g.lineWidth=1;for(let i=0;i<40;i++){const y=r()*h;g.beginPath();g.moveTo(0,y);g.bezierCurveTo(w*0.3,y+4,w*0.6,y-4,w,y+2);g.stroke();}});}
function sandTex(){return canvasTex(256,256,(g,w,h)=>{g.fillStyle='#f2d9a0';g.fillRect(0,0,w,h);const r=rng('sand');for(let i=0;i<2600;i++){g.fillStyle=r()<0.5?'rgba(180,140,80,0.18)':'rgba(255,255,255,0.25)';g.fillRect(r()*w,r()*h,1.5,1.5);}});}
function sailTex(col,emblem){return canvasTex(512,512,(g,w,h)=>{fabricFill(g,0,0,w,h,col,'canvas');g.strokeStyle='rgba(0,0,0,0.15)';g.lineWidth=3;for(let x=0;x<w;x+=64){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}
  const sg=g.createRadialGradient(w/2,h/2,40,w/2,h/2,w*0.7);sg.addColorStop(0,'rgba(255,255,255,0.08)');sg.addColorStop(1,'rgba(0,0,0,0.25)');g.fillStyle=sg;g.fillRect(0,0,w,h);
  if(emblem==='fist'){g.fillStyle='#d8dce2';g.beginPath();g.arc(w/2,h/2,150,0,7);g.fill();g.fillStyle='#2a0c0e';g.beginPath();g.arc(w/2,h/2,128,0,7);g.fill();
    // original emblem: an iron gauntlet fist with a crown of rivets
    g.fillStyle='#c9ced6';rr(g,w/2-70,h/2-40,140,110,26);g.fill();for(let i=0;i<4;i++){rr(g,w/2-70+i*36,h/2-80,32,56,12);g.fill();}rr(g,w/2-100,h/2-10,44,70,16);g.fill();
    g.fillStyle='#5a5f68';for(let i=0;i<4;i++){g.beginPath();g.arc(w/2-54+i*36,h/2-60,6,0,7);g.fill();}g.fillRect(w/2-60,h/2+30,120,8);
    g.fillStyle='#c9a227';for(let i=0;i<5;i++){const a=-Math.PI/2+(i-2)*0.42;g.beginPath();g.arc(w/2+Math.cos(a)*150,h/2+Math.sin(a)*150,12,0,7);g.fill();}}
  if(emblem==='oars'){g.strokeStyle='#5a3a1e';g.lineWidth=22;g.lineCap='round';g.beginPath();g.moveTo(w*0.25,h*0.25);g.lineTo(w*0.75,h*0.75);g.moveTo(w*0.75,h*0.25);g.lineTo(w*0.25,h*0.75);g.stroke();
    g.fillStyle='#5a3a1e';[[0.22,0.22],[0.78,0.22]].forEach(([x,y])=>{g.save();g.translate(w*x,h*y);g.rotate(x<0.5?-0.78:0.78);rr(g,-26,-50,52,90,20);g.fill();g.restore();});
    g.fillStyle='#e8d6a8';g.beginPath();g.arc(w/2,h/2,46,0,7);g.fill();g.fillStyle='#5a3a1e';g.font='bold 54px serif';g.textAlign='center';g.textBaseline='middle';g.fillText('☺',w/2,h/2+2);}});}
function fruitTex(){return canvasTex(512,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#7fe3ff');gr.addColorStop(0.45,'#9a8cff');gr.addColorStop(1,'#ff8fd0');g.fillStyle=gr;g.fillRect(0,0,w,h);
  const r=rng('fruit');for(let i=0;i<70;i++){const x=r()*w,y=r()*h,s=4+r()*14;const b=g.createRadialGradient(x-s*0.3,y-s*0.3,0,x,y,s);b.addColorStop(0,'rgba(255,255,255,0.95)');b.addColorStop(0.6,'rgba(255,255,255,0.35)');b.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=b;g.beginPath();g.arc(x,y,s,0,7);g.fill();}});}
function posterCanvas(name,amount,sub){const [c,g]=cv(512,720);
  g.fillStyle='#e9d3a1';g.fillRect(0,0,512,720);const r=rng(name);for(let i=0;i<1800;i++){g.fillStyle=`rgba(120,80,30,${r()*0.08})`;g.fillRect(r()*512,r()*720,2,2);}
  const vg=g.createRadialGradient(256,360,120,256,360,460);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(90,50,15,0.45)');g.fillStyle=vg;g.fillRect(0,0,512,720);
  g.strokeStyle='#5a3416';g.lineWidth=6;g.strokeRect(22,22,468,676);g.lineWidth=2;g.strokeRect(34,34,444,652);
  g.fillStyle='#3a1f0c';g.textAlign='center';g.textBaseline='middle';g.font='88px "Luckiest Guy", Impact, sans-serif';g.fillText('BOUNTY',256,98);
  // photo window (transparent) where the 3D character shows through
  g.clearRect(76,160,360,330);g.strokeStyle='#3a1f0c';g.lineWidth=8;g.strokeRect(76,160,360,330);
  g.font='60px "Luckiest Guy", Impact, sans-serif';g.fillText(name,256,546);
  g.font='64px "Luckiest Guy", Impact, sans-serif';g.fillStyle='#7a1c12';g.fillText(amount,256,618);
  g.font='30px "Luckiest Guy", Impact, sans-serif';g.fillStyle='#3a1f0c';g.fillText(sub,256,670);
  return c;}

const SM=(o)=>new THREE.MeshStandardMaterial(o);
function cst(m){m.castShadow=true;m.receiveShadow=true;return m;}
function box(w,h,d,mat,x,y,z,parent){const m=cst(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat.isMaterial?mat:SM({color:mat,roughness:0.8})));m.position.set(x,y,z);(parent||scene).add(m);return m;}
function sprite(t,s,parent,op){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,opacity:op==null?1:op}));m.scale.set(s,s,1);(parent||scene).add(m);return m;}

/* ---------------- world */
function buildWorld(){
  scene=new THREE.Scene();scene.fog=new THREE.Fog(0xbfe6f5,120,520);
  world.skyCanvas=cv(16,512);world.skyTex=tex(world.skyCanvas[0]);scene.background=world.skyTex;
  world.hemi=new THREE.HemisphereLight(0xcfeeff,0xe8c890,0.7);scene.add(world.hemi);
  const sun=world.sun=new THREE.DirectionalLight(0xfff1d6,1.5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);const sc=sun.shadow.camera;sc.left=-40;sc.right=40;sc.top=40;sc.bottom=-40;sc.near=1;sc.far=300;sun.shadow.bias=-0.0004;sun.shadow.normalBias=0.05;scene.add(sun);scene.add(sun.target);
  world.rim=new THREE.DirectionalLight(0x9fe8ff,0.7);scene.add(world.rim);scene.add(world.rim.target);
  world.sunDir=V3(0.5,0.75,0.45).normalize();world.look=V3(0,0,0);
  world.T={puff:puffTex(),bubble:bubbleTex(),drop:dropTex(),glow:glowTex('rgba(150,220,255,0.8)'),gold:glowTex('rgba(255,200,90,0.8)')};
  buildSea();buildRowboat();buildGorrShip();buildLaughShip();buildIsland();buildDeep();buildPosters();buildSky();buildFX();
}
function buildSea(){
  const geo=new THREE.PlaneGeometry(1500,520,240,80);geo.rotateX(-Math.PI/2);
  const t=canvasTex(512,512,(g,w,h)=>{g.fillStyle='#16a4b8';g.fillRect(0,0,w,h);const r=rng('sea');for(let i=0;i<500;i++){g.strokeStyle=`rgba(255,255,255,${0.05+r()*0.18})`;g.lineWidth=1+r()*2;const x=r()*w,y=r()*h,l=8+r()*30;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+l/2,y-3,x+l,y);g.stroke();}
    for(let i=0;i<120;i++){g.fillStyle=`rgba(10,90,120,${r()*0.25})`;g.beginPath();g.ellipse(r()*w,r()*h,20+r()*40,6+r()*10,0,0,7);g.fill();}});
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(60,20);
  const m=new THREE.Mesh(geo,SM({map:t,color:0xffffff,roughness:0.18,metalness:0.15}));m.receiveShadow=true;scene.add(m);world.sea=m;world.seaTex=t;
  world.seaBase=Float32Array.from(geo.attributes.position.array);
}
function waveY(x,z,t){return Math.sin(x*0.18+t*1.6)*0.28+Math.sin(z*0.23-t*1.2)*0.22+Math.sin((x+z)*0.07+t*0.8)*0.4;}
function updateSea(t){const p=world.sea.geometry.attributes.position,b=world.seaBase;for(let i=0;i<p.count;i++){const x=b[i*3],z=b[i*3+2];p.array[i*3+1]=waveY(x,z,t);}p.needsUpdate=true;world.sea.geometry.computeVertexNormals();world.seaTex.offset.set(t*0.01,t*0.006);}
function buildRowboat(){const g=world.boat=new THREE.Group();scene.add(g);const wood=SM({map:plankTex('#a8743e'),roughness:0.75}),dk=SM({map:plankTex('#7a4f28'),roughness:0.8});
  box(5,0.5,13,dk,0,0.4,0,g);[-1,1].forEach(s=>{const sd=box(0.45,2.0,13,wood,s*2.7,1.3,0,g);sd.rotation.z=s*0.22;});
  const bow=box(5.2,2,0.45,wood,0,1.3,6.5,g);const stern=box(5.2,2,0.45,wood,0,1.3,-6.5,g);
  [-3,0.5,4].forEach(z=>box(5,0.3,1.0,SM({map:plankTex('#c08a50'),roughness:0.7}),0,1.6,z,g));
  box(5.6,0.25,0.25,SM({color:'#e8dcc0',roughness:0.6}),0,2.35,6.5,g);
  // the leak: a little fountain
  world.leak=new THREE.Group();g.add(world.leak);world.leak.position.set(1.2,0.7,2);
  world.leakDrops=[];for(let i=0;i<14;i++){const s=sprite(world.T.drop,0.35,world.leak);world.leakDrops.push(s);}
  // Basil's tiny stove and pot
  const stove=world.stove=new THREE.Group();g.add(stove);stove.position.set(-1.2,1.75,-4.6);
  box(1.3,0.6,1.3,SM({color:'#3a3a40',roughness:0.4,metalness:0.6}),0,0.3,0,stove);
  const pot=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.5,0.6,20),SM({color:'#2a2a2e',roughness:0.35,metalness:0.7}));pot.position.y=0.9;stove.add(pot);
  world.flame=sprite(glowTex('rgba(255,140,40,0.9)'),1.4,stove);world.flame.position.set(0,0.65,0.4);
  world.smoke=[];for(let i=0;i<10;i++){const s=sprite(world.T.puff,1,stove,0.8);s.material=s.material.clone();s.material.color.setHex(0x222222);world.smoke.push(s);}
  // planks for the explosion
  world.debris=[];for(let i=0;i<16;i++){const d=box(0.5+((i*7)%5)*0.25,0.2,1.4+((i*3)%4)*0.6,i%2?wood:dk,0,0,0,scene);d.visible=false;world.debris.push(d);}
}
function buildShip(col,sailCol,emblem,len,hgt){const g=new THREE.Group();scene.add(g);const hull=SM({map:plankTex(col),roughness:0.7});const trim=SM({color:'#c9a227',roughness:0.35,metalness:0.6});
  box(14,hgt,len,hull,0,hgt/2-2,0,g);const bow=box(10,hgt*0.9,10,hull,0,hgt/2-2,len/2+3,g);bow.rotation.y=Math.PI/4;bow.scale.set(0.72,1,0.72);
  box(14.4,0.6,len,trim,0,hgt-2,0,g);box(13,0.5,len-2,SM({map:plankTex('#b88a55'),roughness:0.8}),0,hgt-2.2,0,g);
  [-1,1].forEach(s=>box(0.5,1.4,len,hull,s*7,hgt-1.2,0,g));
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.65,34,12),SM({color:'#5a3a1e',roughness:0.8}));mast.position.set(0,hgt-2+17,-2);cst(mast);g.add(mast);
  const sail=new THREE.Mesh(new THREE.PlaneGeometry(18,15,10,6),SM({map:sailTex(sailCol,emblem),side:THREE.DoubleSide,roughness:0.9}));sail.position.set(0,hgt-2+18,-1.2);
  const sp=sail.geometry.attributes.position;for(let i=0;i<sp.count;i++){const x=sp.getX(i),y=sp.getY(i);sp.setZ(i,(1-Math.pow(x/9,2))*1.6*(0.6+0.4*(y/7.5+1)/2));}sail.geometry.computeVertexNormals();cst(sail);g.add(sail);
  for(let i=0;i<5;i++){const c=new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.45,1.6,12),SM({color:'#1a1a1e',roughness:0.4,metalness:0.7}));c.rotation.z=Math.PI/2;c.position.set(7.1,hgt*0.55-2,-len/2+6+i*(len-12)/4);g.add(c);}
  g.userData.deck=hgt-1.95;return g;}
function buildGorrShip(){world.gship=buildShip('#3a1416','#2b2b30','fist',44,11);world.gship.position.set(0,0,-60);}
function buildLaughShip(){world.lship=buildShip('#8a5a30','#efe2c0','oars',30,8);world.lship.position.set(LAUGH,0,0);}
function buildIsland(){const g=world.isl=new THREE.Group();g.position.set(ISL,0,0);scene.add(g);
  const sand=new THREE.Mesh(new THREE.CylinderGeometry(26,34,3,48),SM({map:sandTex(),roughness:0.95}));sand.position.y=0.2;sand.receiveShadow=true;g.add(sand);
  const top=new THREE.Mesh(new THREE.SphereGeometry(26,48,16,0,Math.PI*2,0,0.35),SM({map:sandTex(),roughness:0.95}));top.scale.y=0.25;top.position.y=-4.5;top.receiveShadow=true;g.add(top);
  const palm=(x,z,h,lean)=>{const p=new THREE.Group();p.position.set(x,1.5,z);p.rotation.z=lean;g.add(p);for(let i=0;i<8;i++){const s=new THREE.Mesh(new THREE.CylinderGeometry(0.5-i*0.03,0.55-i*0.03,h/8,10),SM({color:i%2?'#8a6a42':'#7a5a36',roughness:0.9}));s.position.y=i*h/8+h/16;s.position.x=Math.pow(i/8,2)*1.5;cst(s);p.add(s);}
    for(let k=0;k<7;k++){const leaf=new THREE.Mesh(new THREE.PlaneGeometry(1.6,7,1,6),SM({color:k%2?'#2f9a4a':'#3fb85a',side:THREE.DoubleSide,roughness:0.7}));const lp=leaf.geometry.attributes.position;for(let i=0;i<lp.count;i++){const y=lp.getY(i);lp.setZ(i,-Math.pow((y+3.5)/7,2)*2.6);}leaf.geometry.computeVertexNormals();
      leaf.geometry.translate(0,3.5,0);leaf.position.set(1.5,h,0);leaf.rotation.set(1.15,k/7*Math.PI*2,0,'YXZ');cst(leaf);p.add(leaf);}};
  palm(-8,-6,14,0.12);palm(-13,2,12,-0.1);palm(9,-9,13,-0.15);palm(4,-14,11,0.05);
  for(let i=0;i<6;i++){const r=new THREE.Mesh(new THREE.DodecahedronGeometry(1+i%3*0.6),SM({color:'#9a9488',roughness:0.9}));r.position.set(-18+i*7,1.6,-16+((i*13)%9));cst(r);g.add(r);}
  // the cursed fruit
  const f=world.fruit=new THREE.Group();g.add(f);f.position.set(2,2.2,4);
  const ball=new THREE.Mesh(new THREE.SphereGeometry(0.55,32,24),SM({map:fruitTex(),roughness:0.25,metalness:0.1,emissive:0x2a2a66,emissiveIntensity:0.5}));ball.scale.y=0.92;cst(ball);f.add(ball);
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.06,0.35,6),SM({color:'#5a3a1e'}));stem.position.y=0.6;f.add(stem);
  const leaf=new THREE.Mesh(new THREE.SphereGeometry(0.25,12,8),SM({color:'#3fbf7a',roughness:0.5}));leaf.scale.set(1.3,0.25,0.6);leaf.position.set(0.22,0.68,0);leaf.rotation.z=-0.4;f.add(leaf);
  world.fruitGlow=sprite(world.T.glow,4,f,0.8);world.fruitL=new THREE.PointLight(0x9fd8ff,0,10,1.6);f.add(world.fruitL);
  world.fruitBall=ball;
}
function buildDeep(){const g=world.deep=new THREE.Group();g.position.set(DEEP,0,0);scene.add(g);
  const surf=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshBasicMaterial({map:canvasTex(256,256,(gg,w,h)=>{gg.fillStyle='#2a8fb0';gg.fillRect(0,0,w,h);const r=rng('surf');for(let i=0;i<60;i++){gg.strokeStyle=`rgba(200,250,255,${0.2+r()*0.4})`;gg.lineWidth=2;gg.beginPath();gg.moveTo(r()*w,r()*h);gg.quadraticCurveTo(r()*w,r()*h,r()*w,r()*h);gg.stroke();}}),side:THREE.DoubleSide}));
  surf.rotation.x=Math.PI/2;surf.position.y=30;g.add(surf);
  world.rays=[];for(let i=0;i<6;i++){const ray=new THREE.Mesh(new THREE.PlaneGeometry(2.5,60),new THREE.MeshBasicMaterial({color:0xbff0ff,transparent:true,opacity:0.08,depthWrite:false,side:THREE.DoubleSide}));ray.position.set(-10+i*4,0,-6);ray.rotation.z=0.25;g.add(ray);world.rays.push(ray);}
  world.deepBubbles=[];for(let i=0;i<18;i++){const s=sprite(world.T.bubble,0.4+((i*7)%5)*0.15,g);world.deepBubbles.push(s);}
}
function buildPosters(){world.posters={};[['gorr','CAPTAIN GORR','1,000,000,000 C','DANGEROUS. DO NOT POKE.'],['mako','MAKO','3 C','(BOAT HAS A LEAK)'],['mako2','MAKO','30,000,000 C','BUBBLE BOY. VERY DANGEROUS.']].forEach(([k,name,amt,sub],i)=>{
  const g=new THREE.Group();g.position.set(POST+i*60,0,0);scene.add(g);
  const wall=box(30,30,1,SM({map:plankTex('#6a4428'),roughness:0.85}),0,12,-5,g);
  const c=posterCanvas(name,amt,sub);const t=tex(c);const p=new THREE.Mesh(new THREE.PlaneGeometry(7.2,10.1),SM({map:t,transparent:true,alphaTest:0.5,roughness:0.9,side:THREE.DoubleSide}));p.position.set(0,12,0);g.add(p);
  const bg=new THREE.Mesh(new THREE.PlaneGeometry(9,8),SM({color:'#c9a874',roughness:0.95}));bg.position.set(0,12.4,-4.2);g.add(bg);
  [[-3.3,16.8],[3.3,16.8],[-3.3,7.2],[3.3,7.2]].forEach(([x,y])=>{const n=new THREE.Mesh(new THREE.SphereGeometry(0.16,8,6),SM({color:'#888',metalness:0.8,roughness:0.3}));n.position.set(x,y,0.1);g.add(n);});
  const L=new THREE.PointLight(0xffd8a0,1.1,30,1.6);L.position.set(2,14,8);g.add(L);world.posters[k]=g;});}
function buildSky(){const g=world.skyset=new THREE.Group();g.position.set(0,SKYY,0);scene.add(g);world.clouds=[];
  const r=rng('clouds');for(let i=0;i<60;i++){const s=sprite(world.T.puff,18+r()*22,g,0.95);s.position.set((r()-0.5)*200,(r()-0.5)*6-20,-r()*160+30);world.clouds.push(s);}
  // low clouds over the sea as well
  world.seaClouds=[];for(let i=0;i<24;i++){const s=sprite(world.T.puff,40+r()*40,scene,0.9);s.position.set((r()-0.5)*700,40+r()*30,-150-r()*150);world.seaClouds.push(s);}}
function buildFX(){
  world.bubbles=[];for(let i=0;i<24;i++){const s=sprite(world.T.bubble,1,scene);s.visible=false;world.bubbles.push(s);}
  world.splash=[];for(let i=0;i<40;i++){const s=sprite(world.T.drop,0.6,scene);s.visible=false;world.splash.push(s);}
  world.fistGlow=sprite(glowTex('rgba(255,120,60,0.9)'),3,scene);world.fistGlow.visible=false;
}
function hideFX(){world.bubbles.forEach(b=>b.visible=false);world.splash.forEach(b=>b.visible=false);world.debris.forEach(b=>b.visible=false);world.fistGlow.visible=false;}
function bubbleAt(i,p,s,op){const b=world.bubbles[i];b.visible=true;b.position.copy(p);b.scale.set(s,s,1);b.material.opacity=op==null?1:op;return b;}
function splashAt(c,k,n,spread,h){for(let i=0;i<(n||40);i++){const s=world.splash[i];const a=i*2.39996,r=spread*(0.3+((i*37)%10)/14);const kk=clamp(k,0,1);s.visible=kk<1;
  s.position.set(c.x+Math.cos(a)*r*kk,c.y+Math.sin(kk*Math.PI)*h*(0.5+((i*13)%7)/7),c.z+Math.sin(a)*r*kk);const sc=0.4+((i*11)%6)*0.15;s.scale.set(sc,sc,1);s.material.opacity=1-kk*0.6;}}

/* ---------------- characters */
function buildChars(){
  const add=(id,spec,sc)=>{const g=buildChar(spec);if(sc)g.scale.setScalar(sc);scene.add(g);g.visible=false;chars[id]=g;return g;};
  ['mako','pip','basil','crate'].forEach(id=>add(id,BH.castById(id)));
  add('gorr',BH.castById('gorr'),1.3);
  const pir=(id,base,col,hair)=>add(id,(()=>{const c=JSON.parse(JSON.stringify(BH.castById(base)));c.id=id;c.hat={style:'bandana',color:col};c.extras=[];if(hair)c.hair=hair;return c;})());
  pir('p1','brick','#c0392b');pir('p2','rex','#2e6fb8');pir('p3','dave','#2f8f4a');pir('sinker','dave','#7a3ab8');
}
function showOnly(ids){Object.keys(chars).forEach(k=>chars[k].visible=ids.includes(k));}
function reset(P){['armL','armR','legL','legR','head'].forEach(k=>P[k].rotation.set(0,0,0));P.torso.rotation.set(0,0,0);P.torso.position.y=0;P._anim=null;P.armL.position.set(-1.5,4,0);P.armR.position.set(1.5,4,0);}
function st(id,x,y,z,ry,e){const c=chars[id];c.position.set(x,y,z);c.rotation.set(0,ry||0,0);c.visible=true;const P=c.userData.P;reset(P);if(e)P.setFace(e);return P;}
function sit(P){P.legL.rotation.x=-1.5;P.legR.rotation.x=-1.5;}
function mouth(P,who,t,e){const env=TL.mouth[who];const f=Math.round(t*TL.fps);const a=env?env[f]||0:0;P.setFace(e||P.expr||'default',{mouthOpen:a>0.12?Math.min(1,a*1.1):0});}
function walk(P,t,sp,e){BH.animate(P,t*(sp||1),{motion:'walk',blend:0.01,face:false});P.setFace(e||'default');}
function lw0(o,v){let r=o;while(r.parent&&r.parent!==scene)r=r.parent;r.updateMatrixWorld(true);return o.localToWorld(v);}
const head=id=>lw0(chars[id].userData.P.head,V3(0,0.6,0));
const faceCam=(id,x,y,d)=>lw0(chars[id].userData.P.head,V3(x,0.6+y,d));
function close(id,d,x,y,fov){const hp=head(id);camAt(faceCam(id,x==null?0.5:x,y==null?0.05:y,(d||3.4)*1.75),hp.clone().add(V3(0,-0.05,0)),fov||36);}
function bob(t,k){return waveY(0,0,t)*(k==null?1:k);}
function boatAt(x,z,t,ry){const b=world.boat;b.visible=true;b.position.set(x,bob(t)-0.2,z);b.rotation.set(Math.sin(t*1.3)*0.03,ry||0,Math.sin(t*1.1)*0.04);b.updateMatrixWorld(true);return b;}
function inBoat(id,lx,lz,ry,e){const b=world.boat;const p=b.localToWorld(V3(lx,1.75,lz));const P=st(id,p.x,p.y,p.z,(ry||0)+b.rotation.y,e);sit(P);chars[id].rotation.z=b.rotation.z;return P;}
function onDeck(ship,id,lx,lz,ry,e){const p=ship.localToWorld(V3(lx,ship.userData.deck,lz));return st(id,p.x,p.y,p.z,(ry||0)+ship.rotation.y,e);}

/* ---------------- look */
function sky(a,b,c){const [cc,g]=world.skyCanvas;const gr=g.createLinearGradient(0,0,0,512);gr.addColorStop(0,a);gr.addColorStop(0.55,b);gr.addColorStop(1,c);g.fillStyle=gr;g.fillRect(0,0,16,512);world.skyTex.needsUpdate=true;}
function mood(m){if(world.mood===m)return;world.mood=m;
  const M={day:['#2f8fe0','#8fd0f5','#e6f6ff',0xcfeeff,0.75,0xfff1d6,1.6,0xbfe6f5,140,560],
    storm:['#2a2f44','#4a5470','#7a8094',0x9aa4c0,0.55,0xc8d0e8,0.9,0x5a6178,80,360],
    sunset:['#3a3a8a','#f08a6a','#ffd29a',0xffd8c0,0.7,0xffb070,1.5,0xf0b090,140,560],
    deep:['#021a2e','#05304a','#0a4a66',0x4aa8c8,0.5,0x9fe8ff,0.5,0x06324a,4,70],
    poster:['#3a2416','#5a3a22','#7a5030',0xffe0b0,0.55,0xffd8a0,0.9,0x3a2416,200,600],
    high:['#1f6fd8','#6fb8f5','#dff2ff',0xffffff,0.9,0xffffff,1.6,0xdff2ff,200,700]}[m];
  sky(M[0],M[1],M[2]);world.hemi.color.setHex(M[3]);world.hemi.intensity=M[4];world.sun.color.setHex(M[5]);world.sun.intensity=M[6];scene.fog.color.setHex(M[7]);scene.fog.near=M[8];scene.fog.far=M[9];}
function camAt(p,l,fov){cam.position.copy(p);cam.lookAt(l);cam.fov=fov||40;cam.updateProjectionMatrix();world.look.copy(l);}
function shake(a,t){cam.position.x+=Math.sin(t*23.1)*a+Math.sin(t*41.7)*a*0.5;cam.position.y+=Math.cos(t*19.3)*a;}
function talk(id,who,t,e){mouth(chars[id].userData.P,who,t,e);}

/* ---------------- shots */
const SH={
  fruit_glow:(u,t)=>{mood('day');const f=world.fruit;f.rotation.y=t*0.8;f.position.y=2.2+Math.sin(t*2)*0.1;world.fruitL.intensity=1.5;world.fruitGlow.material.opacity=0.6+0.3*Math.sin(t*6);const p=lw0(f,V3(0,0,0));
    camAt(p.clone().add(V3(lerp(2.6,1.6,ease(u)),lerp(0.6,0.3,u),lerp(3.4,2.2,ease(u)))),p,34);showOnly([]);S.rays={x:0.5,y:0.42,k:1,col:'rgba(170,220,255,'};},
  hero_power:(u,t,lt)=>{mood('storm');const g=world.gship;g.position.set(0,bob(t,0.4),-60);const G=onDeck(g,'gorr',0,8,Math.PI,'angry');G.armR.rotation.set(-2.9+easeIn(clamp(lt/1.2,0,1))*2.4,0,-0.2);
    const fp=lw0(G.armR,V3(0,-2.1,0));world.fistGlow.visible=true;world.fistGlow.position.copy(fp);world.fistGlow.scale.setScalar(3+Math.sin(t*20)*0.4);
    camAt(lw0(chars.gorr.userData.P.head,V3(2.5,-3,9)),fp.clone().add(V3(0,-1,0)),44);showOnly(['gorr']);if(lt>1.2){S.flash=clamp(1-(lt-1.2)/0.3,0,1)*0.7;S.shakeA=0.12;S.speed={k:1,col:'#ffe0c0'};}},
  sink_dark:(u,t)=>{mood('deep');const P=st('sinker',DEEP,lerp(2,-3,u),0,0.3,'shocked');P.armL.rotation.set(-2.6,0,0.4+Math.sin(t*5)*0.3);P.armR.rotation.set(-2.4,0,-0.4-Math.sin(t*5)*0.3);P.legL.rotation.x=Math.sin(t*4)*0.3;
    world.deepBubbles.forEach((b,i)=>{b.position.set(DEEP+Math.sin(i*1.7)*2.5,((t*2.2+i*0.9)%14)-2,Math.cos(i*2.3)*1.5+1);});
    world.rays.forEach((r,i)=>r.material.opacity=0.06+0.04*Math.sin(t*2+i));camAt(V3(DEEP+lerp(1,0,u),lerp(6,3,u),lerp(16,12,u)),V3(DEEP,lerp(4,0,u),0),44);showOnly(['sinker']);},
  poster_gorr:(u,t)=>{mood('poster');const pg=world.posters.gorr;const G=st('gorr',pg.position.x,13.3-5.2*1.3,-2.2,0,'smug');G.head.rotation.x=0.05;chars.gorr.scale.setScalar(1.3);
    camAt(V3(pg.position.x+lerp(0.6,0,u),12.2,lerp(15,11,ease(u))),V3(pg.position.x,12,0),40);showOnly(['gorr']);},
  poster_mako:(u,t,lt)=>{mood('poster');const pg=world.posters.mako;st('mako',pg.position.x,12.3-5.0,-1.8,0,'happy');
    const z=lerp(9,7.6,easeOut(lt/0.25));camAt(V3(pg.position.x,11.5,z),V3(pg.position.x,11.5,0),40);showOnly(['mako']);S.zoomPunch=lt<0.2?1-lt/0.2:0;},
  pip_deadpan:(u,t)=>{mood('day');boatAt(0,0,t);const P=inBoat('pip',0,-3,0,'default');P.armL.rotation.set(-1.2,0,0.2);mouth(P,'pip',t,'smug');inBoat('mako',0,4,Math.PI,'default');
    close('pip',lerp(4.2,3.8,u),-0.5,0.05,38);showOnly(['pip','mako']);},
  rowboat_leak:(u,t)=>{mood('day');boatAt(0,0,t);const M=inBoat('mako',0.6,1.5,0.4,'shocked');M.armR.rotation.set(-1.4+Math.sin(t*9)*0.5,0,-0.2);M.armL.rotation.set(-1.2-Math.sin(t*9)*0.5,0,0.2);inBoat('pip',-0.6,-3,0,'smug');
    world.leak.visible=true;world.leakDrops.forEach((d,i)=>{const k=((t*1.4+i/14)%1);d.position.set(Math.sin(i*2.1)*k*0.8,k*3.2-k*k*3.2+k*0.6,Math.cos(i*1.3)*k*0.8);d.scale.setScalar(0.25+0.2*(1-k));});
    camAt(V3(lerp(14,11,u),lerp(9,7,u),lerp(14,11,u)),V3(0,1.5,0),40);showOnly(['mako','pip']);},
  basil_burn:(u,t)=>{mood('day');boatAt(0,0,t);const B=inBoat('basil',-1.2,-3.0,0,'smug');B.legL.rotation.x=0;B.legR.rotation.x=0;chars.basil.position.y-=0;B.armR.rotation.set(-1.1+Math.sin(t*6)*0.3,0,0.1);
    world.flame.scale.setScalar(1.2+Math.sin(t*17)*0.25);world.smoke.forEach((s,i)=>{const k=((t*0.8+i/10)%1);s.position.set(Math.sin(i)*0.3*k,1+k*4,0);s.scale.setScalar(0.6+k*2);s.material.opacity=0.75*(1-k);});
    close('basil',lerp(4.6,4.0,u),0.6,0.0,40);showOnly(['basil']);S.tagBox={text:'ON FIRE (AGAIN)',col:'#ff9a3a'};},
  crate_box:(u,t,lt)=>{mood('day');boatAt(0,0,t);world.boat.rotation.z=0.12*Math.sin(lt*3);const C=st('crate',0,1.6,1,Math.PI*0.95,'happy');const fl=Math.sin(clamp(lt*2,0,1)*Math.PI/2);C.armL.rotation.set(0,0,lerp(0,2.4,fl));C.armR.rotation.set(0,0,-lerp(0,2.4,fl));C.armL.rotation.x=-0.2;C.armR.rotation.x=-0.2;
    camAt(V3(lerp(-3,-2,u),7,lerp(-12,-10.5,u)),V3(0,6.6,1),42);showOnly(['crate']);if(lt>0.5&&lt<0.7)S.flash=0.15;},
  fruit_find:(u,t,lt)=>{mood('day');world.boat.visible=false;const M=st('mako',ISL+2,2.0,7.2,Math.PI,'shocked');M.armR.rotation.set(-0.7,0,-0.5);const f=world.fruit;f.position.set(2,lerp(3.4,5.4,ease(u)),4.9);world.fruitL.intensity=1.2;
    camAt(V3(ISL+6.5,6.2,-1.5),V3(ISL+2,5.6,6),40);showOnly(['mako']);S.rays={x:0.6,y:0.4,k:0.6,col:'rgba(170,220,255,'};},
  fruit_eat:(u,t,lt)=>{mood('day');const M=st('mako',ISL+2,2.0,7.2,Math.PI,'happy');M.armR.rotation.set(-1.5,0,-0.3);const f=world.fruit;f.visible=lt<0.5;f.position.set(2,5.6,5.4);
    const chew=Math.abs(Math.sin(lt*14));M.setFace(lt<0.5?'shocked':'happy',{mouthOpen:lt<0.5?0.9:chew});close('mako',lerp(3.6,3.0,u),-0.6,0.05,36);showOnly(['mako']);if(lt>0.5&&lt<0.62)S.zoomPunch=1;},
  bubble_pop:(u,t,lt)=>{mood('day');boatAt(0,0,t);const M=inBoat('mako',0,3,Math.PI,'default');M.setFace('default',{mouthOpen:0.35});const hp=lw0(M.head,V3(0,0.45,0.9));const k=easeOut(lt/1.3);
    const pop=lt>1.45;if(!pop)bubbleAt(0,hp.clone().add(V3(0,0,k*0.8)),0.2+k*1.6);else{M.setFace('shocked');}
    close('mako',lerp(3.8,3.4,u),0.6,0.05,38);showOnly(['mako']);if(pop&&lt<1.55)S.flash=0.2;},
  pirates_laugh:(u,t)=>{mood('day');const g=world.lship;g.position.set(LAUGH,bob(t,0.4),0);['p1','p2','p3'].forEach((id,i)=>{const P=onDeck(g,id,-3+i*3,6,-0.3+i*0.3,'happy');P.torso.rotation.x=-0.25+Math.sin(t*12+i)*0.12;P.armL.rotation.set(-0.5,0,0.6+Math.sin(t*14+i)*0.3);P.armR.rotation.set(-0.5,0,-0.6-Math.sin(t*14+i)*0.3);});
    camAt(V3(LAUGH+lerp(9,7,u),12,lerp(30,26,u)),V3(LAUGH,10.5,6),40);showOnly(['p1','p2','p3']);S.shakeA=0.02;},
  pirate_falls:(u,t,lt)=>{mood('day');const g=world.lship;g.position.set(LAUGH,bob(t,0.4),0);onDeck(g,'p1',-3,6,0,'happy');onDeck(g,'p3',3,6,0,'happy');
    const k=clamp(lt/0.8,0,1);const P=st('p2',LAUGH+7.5+k*2.5,g.userData.deck-k*k*(g.userData.deck+3),6,Math.PI/2,'shocked');chars.p2.rotation.z=-k*1.6;P.armL.rotation.set(-2.8,0,0.6);P.armR.rotation.set(-2.8,0,-0.6);
    if(lt>0.75)splashAt(V3(LAUGH+10,0,6),(lt-0.75)/0.6,40,4,4);camAt(V3(LAUGH+27,4,9),V3(LAUGH+10,3.5,6),44);showOnly(['p1','p2','p3']);},
  bubble_float:(u,t)=>{mood('day');boatAt(0,0,t);const M=inBoat('mako',0,3,Math.PI*0.9,'happy');M.head.rotation.x=-0.5;M.armR.rotation.set(-2.4,0,-0.3);inBoat('pip',0,-3,0,'smug');
    for(let i=0;i<12;i++){const k=((u*0.9+i/12)%1);bubbleAt(i,V3(Math.sin(i*2.1)*3+Math.sin(t+i)*0.4,4+k*20,3+Math.cos(i*1.7)*3),0.8+(i%4)*0.4);}
    camAt(V3(6,lerp(3,6,ease(u)),lerp(14,12,u)),V3(0,lerp(6,14,ease(u)),2),46);showOnly(['mako','pip']);S.sparkle=1;},
  pip_useless:(u,t)=>{mood('day');boatAt(0,0,t);const P=inBoat('pip',0,-3,0,'smug');mouth(P,'pip',t,'smug');close('pip',lerp(3.6,3.3,u),0.4,0.05,36);showOnly(['pip']);},
  gorr_ship:(u,t)=>{mood('storm');boatAt(0,0,t);inBoat('mako',0,3,0.2,'shocked');inBoat('pip',0,-3,0.2,'shocked');const g=world.gship;g.position.set(0,bob(t,0.3),lerp(-90,-48,ease(u)));
    camAt(V3(-6,2.2,14),V3(0,10,-40),48);showOnly(['mako','pip']);S.shakeA=0.03;},
  gorr_reveal:(u,t)=>{mood('storm');const g=world.gship;g.position.set(0,bob(t,0.3),-40);const G=onDeck(g,'gorr',0,22,Math.PI*0+Math.PI*0,'smug');chars.gorr.rotation.y=0;G.armL.rotation.set(0,0,0.5);G.armR.rotation.set(0,0,-0.5);
    const hp=head('gorr');camAt(V3(hp.x+lerp(-3,-2,u),hp.y-9,hp.z+16),hp.clone().add(V3(0,-2,0)),40);showOnly(['gorr']);S.speed={k:0.7,col:'#ffffff'};},
  gorr_close:(u,t)=>{mood('storm');const g=world.gship;g.position.set(0,bob(t,0.3),-40);const G=onDeck(g,'gorr',0,22,0,'smug');talk('gorr','gorr',t,'smug');close('gorr',lerp(3.8,3.2,u)*1.3,0.4,0.0,38);showOnly(['gorr']);},
  iron_punch:(u,t,lt)=>{mood('storm');const g=world.gship;g.position.set(0,bob(t,0.3),-40);const G=onDeck(g,'gorr',0,22,0,'angry');G.armR.rotation.set(lerp(-2.8,-1.2,easeIn(u)),0,-0.1);
    const fp=lw0(G.armR,V3(0,-2.1,0));world.fistGlow.visible=true;world.fistGlow.position.copy(fp);world.fistGlow.scale.setScalar(5);camAt(fp.clone().add(V3(1.5,-1,7)),fp,lerp(50,38,u));showOnly(['gorr']);S.speed={k:1,col:'#ffd0a0'};S.shakeA=0.05;S.impact=u>0.75?1:0;},
  boat_explode:(u,t,lt)=>{mood('storm');world.boat.visible=false;const k=easeOut(lt/0.8);world.debris.forEach((d,i)=>{d.visible=true;const a=i*2.39996;d.position.set(Math.cos(a)*k*(4+i%4*2),1+Math.sin(k*Math.PI)*(4+i%5*1.5)-k*2,Math.sin(a)*k*(4+i%3*2));d.rotation.set(k*(i+1)*1.3,k*i,k*(i%3)*2);});
    splashAt(V3(0,0,0),k,40,8,7);camAt(V3(10,6,18),V3(0,2,0),46);showOnly([]);S.flash=lt<0.12?0.9:0;S.shakeA=0.25*(1-u);},
  pip_sinking:(u,t,lt)=>{mood('storm');const P=st('pip',-2,lerp(-2.4,-3.6,u)+Math.sin(t*6)*0.2,2,0.3,'shocked');P.armL.rotation.set(-2.9,0,0.5+Math.sin(t*9)*0.4);P.armR.rotation.set(-2.9,0,-0.5-Math.sin(t*9)*0.4);
    splashAt(V3(-2,0,2),(lt*1.4)%1,24,2,1.5);close('pip',4.4,0.3,0.4,40);showOnly(['pip']);},
  mako_edge:(u,t)=>{mood('storm');const d=world.debris[0];d.visible=true;d.position.set(4,bob(t)+0.1,2);d.rotation.set(0,0.4,0);d.scale.set(5,1,2.4);const M=st('mako',4,bob(t)+0.3,2,-0.6,'shocked');M.armL.rotation.set(-1.3,0,0.4);M.armR.rotation.set(-1.3,0,-0.4);M.torso.rotation.x=0.25;
    close('mako',lerp(4.2,3.6,u),-0.3,0.1,38);showOnly(['mako']);},
  mako_idea:(u,t,lt)=>{mood('storm');const d=world.debris[0];d.visible=true;d.position.set(4,bob(t)+0.1,2);d.scale.set(5,1,2.4);const M=st('mako',4,bob(t)+0.3,2,-0.6,'default');M.setFace(lt<0.4?'default':'smug');
    close('mako',lerp(3.4,2.6,ease(u)),0.1,0.05,34);showOnly(['mako']);S.dark=0.55;S.rays={x:0.5,y:0.38,k:0.8,col:'rgba(140,240,255,'};S.sparkle=lt>0.4?1:0;},
  giant_bubble:(u,t,lt)=>{mood('storm');const d=world.debris[0];d.visible=true;d.position.set(4,bob(t)+0.1,2);d.scale.set(5,1,2.4);const M=st('mako',4,bob(t)+0.3,2,-0.9,'default');M.setFace('default',{mouthOpen:0.4});M.torso.rotation.x=-0.15;
    const hp=lw0(M.head,V3(0,0.5,1));const k=easeOut(u);bubbleAt(0,V3(lerp(hp.x,-2,k),lerp(hp.y,2,k),lerp(hp.z,2,k)),0.3+k*9,0.95);camAt(V3(6,5,22),V3(1,3.5,2),46);showOnly(['mako']);S.speed={k:0.5,col:'#bff8ff'};},
  pip_rises:(u,t,lt)=>{mood('day');const y=lerp(-2,6,ease(u));const P=st('pip',-2,y,2,0.2,'shocked');P.setFace(u>0.6?'happy':'shocked');P.armL.rotation.set(0,0,0.3);P.armR.rotation.set(0,0,-0.3);bubbleAt(0,V3(-2,y+3,2.6),9);
    splashAt(V3(-2,0,2),clamp(lt/0.7,0,1),30,3,2);camAt(V3(5,3,17),V3(-2,lerp(3,8,ease(u)),2),44);showOnly(['pip']);S.sparkle=1;},
  mako_bubble:(u,t)=>{mood('day');const y=lerp(0.3,7,ease(u));const M=st('mako',4,y,2,-0.3,'happy');M.armR.rotation.set(-2.6,0,-0.2);bubbleAt(0,V3(4,y+3,2.6),8.5);const P=st('pip',-2,8,2,0.4,'happy');bubbleAt(1,V3(-2,11,2.6),9);
    camAt(V3(1,lerp(4,9,u),20),V3(1,lerp(6,10,u),2),44);showOnly(['mako','pip']);},
  gorr_laughs:(u,t)=>{mood('storm');const g=world.gship;g.position.set(0,bob(t,0.3),-40);const G=onDeck(g,'gorr',0,22,0,'happy');talk('gorr','gorr',t,'happy');G.torso.rotation.x=-0.2+Math.sin(t*10)*0.06;G.armL.rotation.set(0,0,0.9);G.armR.rotation.set(0,0,-0.9);
    const hp=head('gorr');camAt(V3(hp.x+3,hp.y-1.5,hp.z+13),hp.clone().add(V3(0,-1,0)),40);showOnly(['gorr']);S.shakeA=0.015;},
  gorr_bubbled:(u,t,lt)=>{mood('storm');const g=world.gship;g.position.set(0,bob(t,0.3),-40);const G=onDeck(g,'gorr',0,22,0,'shocked');G.armL.rotation.set(-2.6,0,0.5);G.armR.rotation.set(-2.6,0,-0.5);const hp=head('gorr');
    const k=easeOut(lt/0.25);bubbleAt(0,hp.clone().add(V3(0,-2.5,0.6)),lerp(26,11,k),k);camAt(V3(hp.x,hp.y-2,hp.z+18),hp.clone().add(V3(0,-2.5,0)),44);showOnly(['gorr']);S.impact=lt<0.1?1:0;S.speed={k:0.6,col:'#bff8ff'};},
  gorr_lifts:(u,t,lt)=>{mood('storm');const g=world.gship;g.position.set(0,bob(t,0.3),-40);const G=onDeck(g,'gorr',0,22,0,'shocked');chars.gorr.position.y+=easeIn(u)*6;G.legL.rotation.x=Math.sin(t*14)*0.6;G.legR.rotation.x=-Math.sin(t*14)*0.6;G.armL.rotation.set(-2.6,0,0.5+Math.sin(t*12)*0.3);G.armR.rotation.set(-2.6,0,-0.5);
    const hp=head('gorr');bubbleAt(0,hp.clone().add(V3(0,-2.5,0.6)),11);camAt(hp.clone().add(V3(4,-5-u*3,18)),hp.clone().add(V3(0,-1.5,0)),46);showOnly(['gorr']);},
  gorr_clouds:(u,t)=>{mood('high');const y=SKYY+lerp(-10,8,u);const G=st('gorr',0,y,-30,0.3+t*0.3,'sad');chars.gorr.scale.setScalar(1.3);G.armL.rotation.set(-2.4,0,0.6);G.armR.rotation.set(-2.4,0,-0.6);G.legL.rotation.x=0.3;
    bubbleAt(0,V3(0,y+3.5,-29.4),11);world.clouds.forEach((c,i)=>c.position.x+=0);camAt(V3(lerp(-5,5,u),SKYY+lerp(0,12,u),lerp(-2,6,u)),V3(0,y+2,-30),40);showOnly(['gorr']);},
  poster_new:(u,t,lt)=>{mood('poster');const pg=world.posters.mako2;st('mako',pg.position.x,12.3-5.0,-1.8,0,'smug');const z=lerp(12,8.6,easeOut(lt/0.3));camAt(V3(pg.position.x+Math.sin(lt*1.5)*0.3,11.8,z),V3(pg.position.x,11.8,0),40);showOnly(['mako']);
    S.zoomPunch=lt<0.25?1-lt/0.25:0;S.sparkle=1;S.coins=lt;},
  pip_smile:(u,t)=>{mood('sunset');const P=st('pip',-2,8,2,0.4,'happy');mouth(P,'pip',t,'smug');bubbleAt(1,V3(-2,11,2.6),9);close('pip',3.8,0.4,0.05,36);showOnly(['pip']);},
  crew_cheer:(u,t)=>{mood('sunset');const d=world.debris[1];d.visible=true;d.position.set(0,bob(t)+0.1,0);d.scale.set(8,1.5,3);d.rotation.set(0,0.2,0);const B=st('basil',-1.6,bob(t)+0.4,0,0.2,'happy');const C=st('crate',1.8,bob(t)+0.4,0,-0.2,'happy');
    [B,C].forEach((P,i)=>{P.armL.rotation.set(-2.9,0,0.3+Math.sin(t*12+i)*0.2);P.armR.rotation.set(-2.9,0,-0.3-Math.sin(t*12+i)*0.2);});camAt(V3(0,5.5,15),V3(0,5,0),40);showOnly(['basil','crate']);},
  mako_grin_end:(u,t,lt)=>{mood('sunset');const M=st('mako',4,7,2,-0.2,'happy');M.setFace('happy',{mouthOpen:lt<0.5?0.6:0});M.armR.rotation.set(-2.7,0,-0.3);bubbleAt(0,V3(4,10,2.6),8.5);
    for(let i=1;i<10;i++){const k=((t*0.3+i/9)%1);bubbleAt(i,V3(4+Math.sin(i*2)*6,4+k*12,-2+Math.cos(i)*3),0.8+(i%3)*0.5);}
    close('mako',lerp(4.4,3.8,u)*1.6,0.3,0.4,40);showOnly(['mako']);S.sparkle=1;S.black=clamp((lt-1.55)/0.45,0,1);},
};

/* ---------------- 2D overlays */
function T(text,x,y,size,fill,stroke,lw,align){og.font=`${size}px ${FONT}`;og.textAlign=align||'center';og.textBaseline='middle';og.lineJoin='round';if(stroke){og.lineWidth=lw||size*0.18;og.strokeStyle=stroke;og.strokeText(text,x,y);}og.fillStyle=fill;og.fillText(text,x,y);}
function RR(x,y,w,h,r){og.beginPath();og.moveTo(x+r,y);og.arcTo(x+w,y,x+w,y+h,r);og.arcTo(x+w,y+h,x,y+h,r);og.arcTo(x,y+h,x,y,r);og.arcTo(x,y,x+w,y,r);og.closePath();}
function drawSpeed(sp,t){const r=rng('sp'+Math.floor(t*30));og.save();og.translate(W/2,H/2);og.strokeStyle=sp.col;for(let i=0;i<70;i++){const a=r()*Math.PI*2,r0=H*(0.28+r()*0.12),r1=H*(0.75+r()*0.2);og.globalAlpha=sp.k*(0.25+r()*0.45);og.lineWidth=W*(0.002+r()*0.006);og.beginPath();og.moveTo(Math.cos(a)*r0,Math.sin(a)*r0);og.lineTo(Math.cos(a)*r1,Math.sin(a)*r1);og.stroke();}og.restore();}
function drawRays(rz,t){og.save();og.globalCompositeOperation='screen';const cx=W*rz.x,cy=H*rz.y;for(let i=0;i<14;i++){const a=i/14*Math.PI*2+t*0.25;og.fillStyle=rz.col+(0.07*rz.k)+')';og.beginPath();og.moveTo(cx,cy);og.arc(cx,cy,H,a,a+0.12);og.closePath();og.fill();}
  const gr=og.createRadialGradient(cx,cy,0,cx,cy,W*0.4);gr.addColorStop(0,rz.col+(0.35*rz.k)+')');gr.addColorStop(1,rz.col+'0)');og.fillStyle=gr;og.fillRect(0,0,W,H);og.restore();}
function drawSparkle(t){const r=rng('spk');og.save();for(let i=0;i<18;i++){const x=r()*W,y=r()*H*0.7,ph=r()*6,s=W*(0.01+r()*0.018)*(0.5+0.5*Math.sin(t*6+ph));og.fillStyle='rgba(255,255,255,0.9)';og.beginPath();og.moveTo(x,y-s*2);og.lineTo(x+s*0.4,y-s*0.4);og.lineTo(x+s*2,y);og.lineTo(x+s*0.4,y+s*0.4);og.lineTo(x,y+s*2);og.lineTo(x-s*0.4,y+s*0.4);og.lineTo(x-s*2,y);og.lineTo(x-s*0.4,y-s*0.4);og.closePath();og.fill();}og.restore();}
function drawCoins(lt){const r=rng('coins');og.save();for(let i=0;i<26;i++){const x=r()*W,y=-H*0.1+((lt*0.9+r())%1.2)*H,s=W*(0.025+r()*0.02),sp=Math.abs(Math.cos(lt*6+i));og.fillStyle='#f5c542';og.strokeStyle='#a87a10';og.lineWidth=W*0.004;og.beginPath();og.ellipse(x,y,s*sp+1,s,0,0,7);og.fill();og.stroke();}og.restore();}
function drawOverlays(t){
  if(S.dark){og.fillStyle=`rgba(5,10,25,${S.dark})`;og.fillRect(0,0,W,H);}
  if(S.rays)drawRays(S.rays,t);
  if(S.speed)drawSpeed(S.speed,t);
  if(S.sparkle)drawSparkle(t);
  if(S.coins!=null)drawCoins(S.coins);
  if(S.tagBox){og.font=`${W*0.05}px ${FONT}`;const tw=og.measureText(S.tagBox.text).width+W*0.08;og.save();og.translate(W/2,H*0.14);og.rotate(-0.04);og.fillStyle='rgba(0,0,0,0.75)';RR(-tw/2,-H*0.028,tw,H*0.056,H*0.02);og.fill();T(S.tagBox.text,0,0,W*0.05,S.tagBox.col);og.restore();}
  const vg=og.createRadialGradient(W/2,H*0.48,H*0.32,W/2,H/2,H*0.78);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,`rgba(0,0,0,${world.mood==='deep'||world.mood==='storm'?0.5:0.28})`);og.fillStyle=vg;og.fillRect(0,0,W,H);
  if(S.flash>0){og.fillStyle=`rgba(255,250,240,${S.flash})`;og.fillRect(0,0,W,H);}
  if(S.black>0){og.fillStyle=`rgba(0,0,0,${S.black})`;og.fillRect(0,0,W,H);}
}
function captionAt(t){for(const s of TL.segs){for(let i=0;i<s.words.length;i++){const w=s.words[i];const nx=s.words[i+1];const end=nx?nx.s:Math.min(w.e+0.25,s.end+0.25);if(t>=w.s&&t<end)return {w,since:t-w.s,who:s.who};}}return null;}
function drawCaption(t){const c=captionAt(t);if(!c)return;const text=c.w.w.toUpperCase();const base=W*0.11*(text.length>8?8/text.length*1.05:1);const k=c.since<0.06?lerp(1.25,1,c.since/0.06):1;
  og.save();og.translate(W/2,H*0.7);og.rotate(c.w.red?-0.03:0);og.scale(k,k);og.font=`${base}px ${FONT}`;og.textAlign='center';og.textBaseline='middle';og.lineJoin='round';og.shadowColor='rgba(0,0,0,0.6)';og.shadowBlur=base*0.25;og.lineWidth=base*0.22;og.strokeStyle='#0a0a12';og.strokeText(text,0,0);og.shadowColor='transparent';
  og.fillStyle=c.w.red?'#ffd23f':(c.who==='pip'?'#d9c8ff':c.who==='gorr'?'#ff6b5a':'#ffffff');og.fillText(text,0,0);og.restore();}

/* ---------------- entry points */
S.init=async function(timeline,w,h,fontUrl){TL=timeline;W=w;H=h;SS=window.BH_SS||1.25;
  const ff=new FontFace('Luckiest Guy',`url(${fontUrl})`);await ff.load();document.fonts.add(ff);
  R=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});R.setPixelRatio(1);R.setSize(Math.round(W*SS),Math.round(H*SS));R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.1;R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
  cam=new THREE.PerspectiveCamera(40,W/H,0.1,2000);
  buildWorld();buildChars();
  const [oc,o2]=cv(W,H);out=oc;og=o2;og.imageSmoothingEnabled=true;og.imageSmoothingQuality='high';scene.updateMatrixWorld(true);return true;};
const KEYS=['flash','tagBox','black','shakeA','zoomPunch','speed','rays','sparkle','dark','impact','coins'];
S.frame=function(f,q){const t=f/TL.fps;const shot=TL.shots.find(s=>t>=s.s&&t<s.e)||TL.shots[TL.shots.length-1];
  KEYS.forEach(k=>S[k]=null);world.mood=null;
  hideFX();world.boat.visible=false;world.leak.visible=false;world.fruit.visible=true;world.fruitL.intensity=0;world.fruit.position.set(2,2.2,4);world.debris.forEach(d=>d.scale.set(1,1,1));
  world.gship.position.set(0,0,-200);world.lship.position.set(LAUGH,0,0);world.flame.scale.setScalar(0.001);world.smoke.forEach(s=>s.material.opacity=0);chars.gorr.scale.setScalar(1.3);
  if(shot!==curShot){curShot=shot;showOnly([]);}
  Object.values(chars).forEach(c=>{c.rotation.set(0,0,0);});
  updateSea(t);
  const u=(t-shot.s)/(shot.e-shot.s),lt=t-shot.s;scene.updateMatrixWorld(true);
  (SH[shot.name]||SH.mako_grin_end)(u,t,lt);
  if(S.shakeA)shake(S.shakeA,t);
  world.sun.target.position.copy(world.look);world.sun.position.copy(world.look).addScaledVector(world.sunDir,120);
  world.rim.target.position.copy(world.look);world.rim.position.copy(world.look).add(V3(-60,30,-80));
  scene.updateMatrixWorld(true);R.render(scene,cam);
  const grade={day:'contrast(1.06) saturate(1.22)',high:'contrast(1.04) saturate(1.15) brightness(1.03)',sunset:'contrast(1.08) saturate(1.25)',storm:'contrast(1.12) saturate(0.9)',deep:'contrast(1.1) saturate(1.1)',poster:'contrast(1.08) saturate(1.05) sepia(0.12)'}[world.mood]||'none';
  og.globalAlpha=1;og.globalCompositeOperation='source-over';og.filter=S.impact?'invert(1) contrast(1.6) grayscale(1)':grade;
  if(S.zoomPunch){const z=1+0.07*S.zoomPunch;og.drawImage(R.domElement,(W-W*z)/2,(H-H*z)/2,W*z,H*z);}else og.drawImage(R.domElement,0,0,W,H);
  og.filter=`blur(${Math.round(W*0.014)}px) brightness(1.15)`;og.globalCompositeOperation='screen';og.globalAlpha=0.2;og.drawImage(R.domElement,0,0,W,H);og.filter='none';og.globalCompositeOperation='source-over';og.globalAlpha=1;
  drawOverlays(t);drawCaption(t);
  return out.toDataURL('image/jpeg',q||0.94);};
})();
