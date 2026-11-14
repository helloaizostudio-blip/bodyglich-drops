/* Sample episode "Midnight Lights": world, characters, shot list, captions.
   Needs three r128 + blockheads builder v2 (dist/builder.js). Entry points:
     SAMPLE.init(timeline, W, H, fontDataUrl)  ->  Promise
     SAMPLE.frame(f)                           ->  JPEG data URL of frame f            */
(function(){
const S = window.SAMPLE = {};
let TL, W, H, R, scene, cam, out, og, world = {}, chars = {}, crowd, curShot = null;
const V3 = (x,y,z)=>new THREE.Vector3(x,y,z);
const lerp=(a,b,t)=>a+(b-a)*t, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);}, easeOut=t=>1-Math.pow(1-clamp(t,0,1),3);
const rnd = rng('midnight');

/* ------------------------------------------------------------ textures */
function canvasTex(w,h,draw,lin){const [c,g]=cv(w,h);draw(g,w,h);const t=lin?new THREE.CanvasTexture(c):tex(c);return t;}
function glowTex(col){return canvasTex(128,128,(g)=>{const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.25,col);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);});}
function signTex(text,fg,bg,w=512,h=160,font=96){return canvasTex(w,h,(g)=>{g.fillStyle=bg;g.fillRect(0,0,w,h);g.font=`${font}px "Luckiest Guy", Impact, sans-serif`;g.textAlign='center';g.textBaseline='middle';g.shadowColor=fg;g.shadowBlur=24;g.fillStyle=fg;g.fillText(text,w/2,h/2+6);g.shadowBlur=0;g.fillText(text,w/2,h/2+6);});}
function windowsTex(seed,cols,rows,litFrac){return canvasTex(256,512,(g,w,h)=>{const r=rng(seed);g.fillStyle='#0b0d16';g.fillRect(0,0,w,h);const cw=w/cols,ch=h/rows;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const lit=r()<litFrac;g.fillStyle=lit?(r()<.7?'#ffcf7a':'#bfe3ff'):'#151a28';g.fillRect(x*cw+cw*0.2,y*ch+ch*0.22,cw*0.6,ch*0.56);}});}

/* ------------------------------------------------------------ world */
const STREET_Z = []; for(let z=10;z>=-120;z-=14)STREET_Z.push(z);
function buildWorld(){
  scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x101a36,0.009);
  scene.background=canvasTex(16,512,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#04060f');gr.addColorStop(0.55,'#0e1836');gr.addColorStop(0.8,'#1d2a55');gr.addColorStop(1,'#2a2448');g.fillStyle=gr;g.fillRect(0,0,w,h);});
  world.hemi=new THREE.HemisphereLight(0x5a6fa8,0x0a0a14,0.55);scene.add(world.hemi);
  world.moon=new THREE.DirectionalLight(0x9fb4ff,0.55);world.moon.position.set(-20,40,-90);scene.add(world.moon);
  world.fill=new THREE.DirectionalLight(0xffc89a,0.0);world.fill.position.set(10,10,20);scene.add(world.fill);
  // stars + moon
  const sp=[];for(let i=0;i<900;i++){const a=rnd()*Math.PI*2,e=0.15+rnd()*1.2;sp.push(Math.cos(a)*Math.cos(e)*400,Math.sin(e)*400,Math.sin(a)*Math.cos(e)*400);}
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:1.4,sizeAttenuation:false,fog:false})));
  const moon=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex('rgba(220,230,255,0.9)'),fog:false,depthWrite:false,transparent:true}));moon.scale.set(60,60,1);moon.position.set(-120,170,-300);scene.add(moon);
  const mdisc=new THREE.Mesh(new THREE.CircleGeometry(9,32),new THREE.MeshBasicMaterial({color:0xf2f4ff,fog:false}));mdisc.position.set(-120,170,-299);scene.add(mdisc);
  // ground + road
  const road=canvasTex(256,1024,(g,w,h)=>{fabricFill(g,0,0,w,h,'#22252e','canvas');g.fillStyle='#e8d36a';for(let y=0;y<h;y+=128)g.fillRect(w/2-4,y,8,64);g.fillStyle='#9aa0aa';g.fillRect(0,0,10,h);g.fillRect(w-10,0,10,h);});
  road.wrapS=road.wrapT=THREE.RepeatWrapping;road.repeat.set(1,14);
  const rm=new THREE.Mesh(new THREE.PlaneGeometry(10,300),new THREE.MeshStandardMaterial({map:road,roughness:0.9,metalness:0}));rm.rotation.x=-Math.PI/2;rm.position.set(0,0.01,-80);scene.add(rm);
  const gm=new THREE.Mesh(new THREE.PlaneGeometry(800,800),new THREE.MeshStandardMaterial({color:new THREE.Color('#141a14').convertSRGBToLinear(),roughness:1}));gm.rotation.x=-Math.PI/2;scene.add(gm);
  [-1,1].forEach(s=>{const sw=new THREE.Mesh(new THREE.BoxGeometry(3,0.25,300),new THREE.MeshStandardMaterial({color:new THREE.Color('#4a4d55').convertSRGBToLinear(),roughness:0.9}));sw.position.set(s*6.5,0.12,-80);scene.add(sw);});
  // houses
  world.houses=[];const wallCols=['#c9b79c','#9fb3c8','#c7a0a0','#a9c2a2','#d8c9a8','#b8a6c9'];const roofCols=['#4a2e2a','#2e3a4a','#3a2e3e','#2e3e2e'];
  const homeTex=signTex('HOME','#ffe9a8','#1a1206');
  STREET_Z.forEach((z,i)=>[-1,1].forEach(s=>{
    if(s>0&&i===3){buildShop(s*13,z);return;}
    const g=new THREE.Group();g.position.set(s*14,0,z);g.rotation.y=s>0?-Math.PI/2:Math.PI/2;scene.add(g);
    const col=wallCols[(i*2+(s>0?1:0))%wallCols.length];
    const wall=new THREE.Mesh(new THREE.BoxGeometry(11,7,9),new THREE.MeshStandardMaterial({map:hatTex(col,'canvas'),roughness:0.9}));wall.position.y=3.5;g.add(wall);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(8.2,4,4),new THREE.MeshStandardMaterial({color:new THREE.Color(roofCols[i%4]).convertSRGBToLinear(),roughness:0.8}));roof.position.y=9;roof.rotation.y=Math.PI/4;roof.scale.set(1,1,0.8);g.add(roof);
    const door=new THREE.Mesh(new THREE.BoxGeometry(1.8,3.2,0.2),new THREE.MeshStandardMaterial({color:new THREE.Color('#3a2418').convertSRGBToLinear(),roughness:0.6}));door.position.set(0,1.6,4.55);g.add(door);
    const knob=new THREE.Mesh(new THREE.SphereGeometry(0.09,8,6),METAL('#d4af37'));knob.position.set(0.6,1.6,4.7);g.add(knob);
    const lit=rnd()<0.8||i===0||i===1;const wm=new THREE.MeshBasicMaterial({color:lit?0xffc070:0x1a2030});wm.userData.c=lit?0xffc070:0x1a2030;
    [[-3.3,4.6],[3.3,4.6],[-3.3,1.9],[3.3,1.9]].forEach(([x,y])=>{const w2=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.5),wm);w2.position.set(x,y,4.555);g.add(w2);
      const fr=new THREE.Mesh(new THREE.BoxGeometry(2.0,1.7,0.08),new THREE.MeshStandardMaterial({color:0xf2efe6,roughness:0.6}));fr.position.set(x,y,4.49);g.add(fr);});
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.6,0.82),new THREE.MeshBasicMaterial({map:homeTex,color:0xcfc4a8}));sign.position.set(0,3.75,4.62);g.add(sign);
    const sglow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex('rgba(255,200,110,0.5)'),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));sglow.scale.set(4,1.8,1);sglow.material.opacity=0.35;sglow.position.set(0,3.75,4.9);g.add(sglow);
    const porch=new THREE.Mesh(new THREE.BoxGeometry(4,0.3,2),new THREE.MeshStandardMaterial({color:0x6a5a4a,roughness:0.9}));porch.position.set(0,0.15,5.4);g.add(porch);
    world.houses.push({g,s,z,sign,wm});
  }));
  // streetlights
  world.lamps=[];const poleM=new THREE.MeshStandardMaterial({color:0x2a2d33,roughness:0.5,metalness:0.6});
  world.bulbM=new THREE.MeshBasicMaterial({color:0xfff1c8,toneMapped:false});world.bulbOffM=new THREE.MeshStandardMaterial({color:0x3a3a3a,roughness:0.4});
  const coneG=new THREE.ConeGeometry(3.4,7.2,24,1,true);coneG.translate(0,-3.6,0);
  const poolT=glowTex('rgba(255,210,140,0.55)');const bulbGlowT=glowTex('rgba(255,220,160,0.8)');
  STREET_Z.forEach((z,i)=>[-1,1].forEach(s=>{const zz=z-7;const g=new THREE.Group();g.position.set(s*6.2,0,zz);scene.add(g);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.16,7.5,8),poleM);pole.position.y=3.75;g.add(pole);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.12,0.12),poleM);arm.position.set(-s*0.7,7.4,0);g.add(arm);
    const head=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.25,0.5),poleM);head.position.set(-s*1.4,7.3,0);g.add(head);
    const bulb=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.1,0.38),world.bulbM);bulb.position.set(-s*1.4,7.15,0);g.add(bulb);
    const cone=new THREE.Mesh(coneG,new THREE.MeshBasicMaterial({color:0xffd9a0,transparent:true,opacity:0.05,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));cone.position.set(-s*1.4,7.1,0);g.add(cone);
    const pool=new THREE.Mesh(new THREE.PlaneGeometry(9,9),new THREE.MeshBasicMaterial({map:poolT,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0.55}));pool.rotation.x=-Math.PI/2;pool.position.set(-s*1.4,0.04,0);g.add(pool);
    const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:bulbGlowT,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));gl.scale.set(4,4,1);gl.position.set(-s*1.4,7.05,0);g.add(gl);
    world.lamps.push({g,bulb,cone,pool,gl,z:zz,s,level:1});
  }));
  world.lampLights=[];for(let i=0;i<5;i++){const p=new THREE.PointLight(0xffc98a,1.4,16,1.6);scene.add(p);world.lampLights.push(p);}
  // clock tower
  const tw=new THREE.Group();tw.position.set(0,0,-140);scene.add(tw);world.tower=tw;
  const tb=new THREE.Mesh(new THREE.BoxGeometry(8,34,8),new THREE.MeshStandardMaterial({map:hatTex('#6a5e52','canvas'),roughness:0.9}));tb.position.y=17;tw.add(tb);
  const tr=new THREE.Mesh(new THREE.ConeGeometry(6.4,9,4),new THREE.MeshStandardMaterial({color:0x2a3040,roughness:0.7}));tr.position.y=38.5;tr.rotation.y=Math.PI/4;tw.add(tr);
  const [cc,cg]=cv(512,512);world.clockCanvas=[cc,cg];world.clockTex=tex(cc);
  const face=new THREE.Mesh(new THREE.CircleGeometry(3.3,48),new THREE.MeshBasicMaterial({map:world.clockTex,color:0xd8d0bc}));face.position.set(0,28,4.02);tw.add(face);world.clockFace=face;
  const fglow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex('rgba(255,240,200,0.35)'),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));fglow.scale.set(12,12,1);fglow.material.opacity=0.5;fglow.position.set(0,28,4.4);tw.add(fglow);
  setClock(11,58);
  // skyline (instanced)
  const N=320;const bg=new THREE.BoxGeometry(1,1,1);bg.translate(0,0.5,0);
  const wt=windowsTex('sky',6,18,0.4);wt.wrapS=wt.wrapT=THREE.RepeatWrapping;
  const bm=new THREE.MeshStandardMaterial({color:0x1a1f2e,emissive:0xffffff,emissiveMap:wt,emissiveIntensity:0.9,roughness:0.9});
  const sky=new THREE.InstancedMesh(bg,bm,N);const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new THREE.Vector3(),ps=new THREE.Vector3();
  for(let i=0;i<N;i++){let x,z;do{x=(rnd()-0.5)*420;z=-150-rnd()*260;}while(false);if(i<120){x=(rnd()<.5?-1:1)*(40+rnd()*120);z=-rnd()*200+40;}
    const h=8+Math.pow(rnd(),1.8)*70;ps.set(x,0,z);sc.set(8+rnd()*14,h,8+rnd()*14);q.setFromEuler(new THREE.Euler(0,rnd()*0.3,0));m4.compose(ps,q,sc);sky.setMatrixAt(i,m4);}
  scene.add(sky);world.sky=sky;world.skyMat=bm;
  buildRoom(); buildCrowd();
}
function buildShop(x,z){const g=new THREE.Group();g.position.set(x+1,0,z);g.rotation.y=-Math.PI/2;scene.add(g);world.shop=g;
  const wall=new THREE.Mesh(new THREE.BoxGeometry(13,8,9),new THREE.MeshStandardMaterial({map:hatTex('#3a4a5a','canvas'),roughness:0.85}));wall.position.y=4;g.add(wall);
  const flash=canvasTex(1024,512,(c,w,h)=>{c.fillStyle='#fff3d6';c.fillRect(0,0,w,h);for(let r=0;r<4;r++)for(let k=0;k<12;k++){const x0=40+k*80,y0=40+r*118;c.fillStyle=['#c0392b','#2b5cb8','#e8a33a','#2f8f8a','#1d1d24'][(r+k)%5];c.fillRect(x0,y0+20,26,70);c.fillStyle='#d0d3d8';c.fillRect(x0-6,y0,38,24);c.fillStyle='#fffbe6';c.beginPath();c.arc(x0+13,y0+8,11,0,7);c.fill();}});
  const win=new THREE.Mesh(new THREE.PlaneGeometry(9,4.2),new THREE.MeshBasicMaterial({map:flash,toneMapped:false,color:0xd8d0b8}));win.position.set(0,2.6,4.52);g.add(win);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(9,1.6),new THREE.MeshBasicMaterial({map:signTex('FLASHLIGHTS','#7ae8ff','#06121a',1024,180,120),toneMapped:false}));sign.position.set(0,6.1,4.55);g.add(sign);
  const deal=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.3),new THREE.MeshBasicMaterial({map:signTex('12 FOR $5','#1a1a1a','#ffd84a',512,256,92),toneMapped:false}));deal.position.set(3.2,3.6,4.6);deal.rotation.z=-0.12;g.add(deal);
  const awn=new THREE.Mesh(new THREE.BoxGeometry(10,0.2,2),new THREE.MeshStandardMaterial({map:canvasTex(256,64,(c,w,h)=>{for(let x=0;x<w;x+=32){c.fillStyle=(x/32)%2?'#c0392b':'#f2efe6';c.fillRect(x,0,32,h);}}),roughness:0.8}));awn.position.set(0,5.1,5.4);awn.rotation.x=0.25;g.add(awn);
}
function setClock(h,m,red){const k=h+':'+m+(red?'r':'');if(world.clockKey===k)return;world.clockKey=k;const [c,g]=world.clockCanvas;
  g.fillStyle='#f6f0dc';g.beginPath();g.arc(256,256,256,0,7);g.fill();g.strokeStyle='#2a2420';g.lineWidth=18;g.beginPath();g.arc(256,256,240,0,7);g.stroke();
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;g.lineWidth=i%3?8:16;g.beginPath();g.moveTo(256+Math.sin(a)*200,256-Math.cos(a)*200);g.lineTo(256+Math.sin(a)*228,256-Math.cos(a)*228);g.stroke();}
  const ha=((h%12)+m/60)/12*Math.PI*2, ma=m/60*Math.PI*2;g.lineCap='round';
  g.strokeStyle='#1a1614';g.lineWidth=22;g.beginPath();g.moveTo(256,256);g.lineTo(256+Math.sin(ha)*120,256-Math.cos(ha)*120);g.stroke();
  g.strokeStyle=red?'#d62a2a':'#1a1614';g.lineWidth=12;g.beginPath();g.moveTo(256,256);g.lineTo(256+Math.sin(ma)*190,256-Math.cos(ma)*190);g.stroke();
  g.fillStyle='#1a1614';g.beginPath();g.arc(256,256,16,0,7);g.fill();
  g.font='64px "Luckiest Guy", Impact';g.textAlign='center';g.fillStyle=red?'#d62a2a':'#3a3430';g.fillText(`${h}:${String(m).padStart(2,'0')}`,256,370);
  world.clockTex.needsUpdate=true;}
function buildRoom(){const g=new THREE.Group();g.position.set(300,0,0);scene.add(g);world.room=g;
  const wallM=new THREE.MeshStandardMaterial({map:hatTex('#5a6a8a','cotton'),roughness:0.95,side:THREE.BackSide});
  const room=new THREE.Mesh(new THREE.BoxGeometry(14,8,14),wallM);room.position.y=4;g.add(room);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(14,14),new THREE.MeshStandardMaterial({map:canvasTex(256,256,(c,w,h)=>{fabricFill(c,0,0,w,h,'#7a5a3e','twill');c.strokeStyle='rgba(0,0,0,0.3)';for(let y=0;y<h;y+=32){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}}),roughness:0.8}));floor.rotation.x=-Math.PI/2;floor.position.y=0.02;g.add(floor);
  const bed=new THREE.Group();bed.position.set(-3,0,-3);g.add(bed);
  const frame=rbox(4.2,1.0,7,0.1,MAT('#e8e2d4',0.6));frame.position.y=0.5;bed.add(frame);
  const mat=rbox(4,0.6,6.6,0.2,MAT('#f4f2ee',0.9));mat.position.y=1.25;bed.add(mat);
  const blanket=rbox(4.1,0.35,4.4,0.18,new THREE.MeshStandardMaterial({map:canvasTex(256,256,(c,w,h)=>{fabricFill(c,0,0,w,h,'#b06cff','knit');pattern(c,'stripes','#f2efe6',w,h);}),roughness:0.95}));blanket.position.set(0,1.62,1.0);blanket.rotation.x=0.04;bed.add(blanket);
  const pillow=rbox(2.6,0.5,1.2,0.25,MAT('#ffffff',0.9));pillow.position.set(0,1.75,-2.6);bed.add(pillow);
  const hb=rbox(4.4,2.6,0.3,0.1,MAT('#e8e2d4',0.6));hb.position.set(0,1.9,-3.4);bed.add(hb);
  const name=new THREE.Mesh(new THREE.PlaneGeometry(3,1),new THREE.MeshBasicMaterial({map:signTex('LIZA','#ff9de0','#2a0f2a'),toneMapped:false}));name.position.set(-3,5.6,-6.9);g.add(name);
  const posters=[['GAME ON','#39ff9a','#0a1a12'],['NO SLEEP','#ffd84a','#1a1206']];posters.forEach(([t,f,b],i)=>{const p=new THREE.Mesh(new THREE.PlaneGeometry(2,2.6),new THREE.MeshBasicMaterial({map:signTex(t,f,b,256,330,54),toneMapped:false,color:0x9a9a9a}));p.position.set(-6.9,4,-1+i*3.2);p.rotation.y=Math.PI/2;g.add(p);});
  const winT=canvasTex(256,256,(c,w,h)=>{const gr=c.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#050812');gr.addColorStop(1,'#16203e');c.fillStyle=gr;c.fillRect(0,0,w,h);c.fillStyle='#0a0c14';for(let i=0;i<6;i++){const x=i*44,hh=60+((i*37)%70);c.fillRect(x,h-hh,40,hh);}c.fillStyle='#ffcf7a';for(let i=0;i<14;i++)c.fillRect((i*53)%240+6,h-20-((i*29)%60),5,6);c.fillStyle='#e8ecff';c.beginPath();c.arc(190,50,16,0,7);c.fill();});
  const win=new THREE.Mesh(new THREE.PlaneGeometry(3.6,3),new THREE.MeshBasicMaterial({map:winT,toneMapped:false}));win.position.set(3,4.5,-6.95);g.add(win);world.roomWin=win;
  const wf=rbox(3.9,3.3,0.2,0.05,MAT('#f2efe6',0.6));wf.position.set(3,4.5,-6.98);g.add(wf);
  [-1,1].forEach(s=>{const cur=rbox(1.1,4,0.15,0.05,new THREE.MeshStandardMaterial({map:hatTex('#8a2a4a','wool'),roughness:1}));cur.position.set(3+s*2.3,4.6,-6.8);g.add(cur);});
  const lamp=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.6,0.8,16),MAT('#ffd9a0',0.7));lamp.position.set(0.2,1.9,-5.5);g.add(lamp);
  const desk=rbox(3,0.2,1.6,0.05,MAT('#6a4a32',0.7));desk.position.set(4,2.2,-1);g.add(desk);
  const fl=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.16,0.9,12),MAT('#c0392b',0.4));fl.rotation.z=Math.PI/2;fl.position.set(3.6,2.45,-1);g.add(fl);world.deskFlash=fl;
  world.roomLight=new THREE.PointLight(0x7a9aff,0.9,30,1.5);world.roomLight.position.set(3,5,-4);g.add(world.roomLight);
  world.hallLight=new THREE.PointLight(0xffc070,1.4,22,1.6);world.hallLight.position.set(0,5,7);g.add(world.hallLight);
  // front door with locks (for the door_lock shot)
  const dg=new THREE.Group();dg.position.set(300,0,40);scene.add(dg);world.doorSet=dg;
  const dwall=new THREE.Mesh(new THREE.PlaneGeometry(12,9),new THREE.MeshStandardMaterial({map:hatTex('#8a7a6a','canvas'),roughness:0.9}));dwall.position.set(0,4.5,-0.2);dg.add(dwall);
  const dr=rbox(3.2,6,0.3,0.05,new THREE.MeshStandardMaterial({map:hatTex('#5a3420','wool'),roughness:0.6}));dr.position.set(0,3,0);dg.add(dr);
  world.bolts=[];[4.4,3.2,2.0].forEach((y,i)=>{const plate=rbox(0.5,0.3,0.1,0.03,METAL('#b8bcc4'));plate.position.set(1.3,y,0.2);dg.add(plate);
    const bolt=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.9,10),METAL('#d0d4da',0.25));bolt.rotation.z=Math.PI/2;bolt.position.set(1.0,y,0.3);dg.add(bolt);world.bolts.push(bolt);
    const recv=rbox(0.4,0.35,0.15,0.03,METAL('#9aa0a8'));recv.position.set(2.0,y,0.15);dg.add(recv);});
  world.doorLight=new THREE.PointLight(0xffc070,1.5,14,1.5);world.doorLight.position.set(-2,6,4);dg.add(world.doorLight);
}
/* ------------------------------------------------------------ crowd (instanced) */
function buildCrowd(){const N=350;const parts={};
  const tg=rboxGeo(2,2,1,0.12,1).clone();tg.translate(0,3,0);
  const hg=new THREE.CylinderGeometry(0.6,0.6,1.2,14);hg.translate(0,4.6,0);
  const lg=rboxGeo(1,2,1,0.08,1).clone();lg.translate(0,-1,0);
  const mk=(geo)=>{const m=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({roughness:0.85}),N);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;scene.add(m);return m;};
  parts.torso=mk(tg);parts.head=mk(hg);parts.legL=mk(lg);parts.legR=mk(lg);parts.armL=mk(lg);parts.armR=mk(lg);
  const shirts=['#d9a23a','#2f8f8a','#c0392b','#3a5a8a','#6a2fb0','#e8742a','#5aa05a','#f2efe6','#1d1d24','#b5545c','#8c8c8c'];const pants=['#3b5a80','#22222a','#5b6340','#c9a77a','#2a2a30'];const skins=['#e8b98f','#c68a5e','#8d5a3b','#f0cfaa','#6a3e24','#d9a27a'];
  const col=new THREE.Color();const people=[];
  for(let i=0;i<N;i++){const p={x:(rnd()-0.5)*9.5,z:-10-rnd()*110,sp:4.5+rnd()*2.5,ph:rnd()*6.28,sc:0.85+rnd()*0.25};people.push(p);
    const sh=shirts[i%shirts.length];col.set(sh).convertSRGBToLinear();parts.torso.setColorAt(i,col);parts.armL.setColorAt(i,col);parts.armR.setColorAt(i,col);
    col.set(pants[i%pants.length]).convertSRGBToLinear();parts.legL.setColorAt(i,col);parts.legR.setColorAt(i,col);col.set(skins[i%skins.length]).convertSRGBToLinear();parts.head.setColorAt(i,col);}
  crowd={parts,people,N,visible:false};setCrowd(false);}
function setCrowd(on){Object.values(crowd.parts).forEach(m=>m.visible=on);crowd.visible=on;}
const _m=new THREE.Matrix4(),_b=new THREE.Matrix4(),_t=new THREE.Matrix4(),_r=new THREE.Matrix4(),_s=new THREE.Matrix4();
function updateCrowd(t){if(!crowd.visible)return;const P=crowd.parts;
  crowd.people.forEach((p,i)=>{let z=p.z+t*p.sp;z=((z+120)%130+130)%130-120;const sw=Math.sin(t*9*p.sp/5.5+p.ph);const bob=Math.abs(Math.cos(t*9*p.sp/5.5+p.ph))*0.2;
    _b.makeTranslation(p.x,bob,z);_s.makeScale(p.sc,p.sc,p.sc);_b.multiply(_s);
    P.torso.setMatrixAt(i,_b);P.head.setMatrixAt(i,_b);
    const limb=(mesh,x,y,rx)=>{_m.copy(_b);_t.makeTranslation(x,y,0);_m.multiply(_t);_r.makeRotationX(rx);_m.multiply(_r);mesh.setMatrixAt(i,_m);};
    limb(P.legL,-0.5,2,-sw*0.8);limb(P.legR,0.5,2,sw*0.8);limb(P.armL,-1.5,4,sw*0.9);limb(P.armR,1.5,4,-sw*0.9);});
  Object.values(P).forEach(m=>m.instanceMatrix.needsUpdate=true);}

/* ------------------------------------------------------------ characters */
function buildChars(){
  const add=(id,spec)=>{const c=spec||BH.castById(id);const g=buildChar(c);scene.add(g);g.visible=false;chars[id]=g;return g;};
  add('leo');add('liza');add('dad');
  // the twist figure: tall, dark, two glowing eyes
  const sh=add('shadow',{id:'shadow',name:'?',skin:'#08080c',hair:{style:'none',color:'#000'},face:{eyes:'closed',brows:'none',mouth:'flat',nose:'none'},ears:false,
    torso:{inner:'#060608',outer:{style:'trench',color:'#08080a'}},sleeves:{color:'#08080a',len:'full'},pants:{color:'#060608',shoes:'#050505',shoeStyle:'boot'},hat:{style:'fedora',color:'#050507',band:'#0a0a0c'}});
  sh.scale.setScalar(1.55);const eyeM=new THREE.MeshBasicMaterial({color:0xfff2b0,toneMapped:false});[-1,1].forEach(s=>{const e=new THREE.Mesh(new THREE.SphereGeometry(0.07,10,8),eyeM);e.scale.setScalar(1.6);e.position.set(s*0.2,0.72,0.62);sh.userData.P.head.add(e);const eg=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex('rgba(255,240,160,0.9)'),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));eg.scale.set(0.5,0.5,1);eg.position.set(s*0.2,0.72,0.66);sh.userData.P.head.add(eg);});
  // flashlight in Zash's right hand
  const P=chars.leo.userData.P;const fl=new THREE.Group();fl.position.set(0,-2.0,0.35);P.armR.add(fl);
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.8,14),MAT('#c0392b',0.4));body.rotation.x=Math.PI/2;fl.add(body);
  const lens=new THREE.Mesh(new THREE.CircleGeometry(0.15,16),new THREE.MeshBasicMaterial({color:0xfff6d8,toneMapped:false}));lens.position.z=0.41;fl.add(lens);
  const spot=new THREE.SpotLight(0xfff0d0,0,40,0.32,0.5,1.2);spot.position.set(0,0,0.4);fl.add(spot);const tgt=new THREE.Object3D();tgt.position.set(0,-1.5,6);fl.add(tgt);spot.target=tgt;
  const beam=new THREE.Mesh(new THREE.ConeGeometry(1.6,9,20,1,true).translate(0,-4.5,0).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xfff2d0,transparent:true,opacity:0.0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  beam.position.z=0.4;beam.rotation.x=-0.16;fl.add(beam);const lg=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex('rgba(255,245,215,0.9)'),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:0}));lg.scale.set(1.4,1.4,1);lg.position.z=0.5;fl.add(lg);world.flash={g:fl,spot,beam,lens,lg};fl.visible=false;
  // Liza's firefly jar
  const LP=chars.liza.userData.P;const jar=new THREE.Group();jar.position.set(0,2.75,1.15);chars.liza.add(jar);
  const glass=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,0.9,20),new THREE.MeshStandardMaterial({color:0xcfe8ff,transparent:true,opacity:0.25,roughness:0.05,metalness:0.1,depthWrite:false}));jar.add(glass);
  const lid=new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.45,0.12,20),METAL('#b8963c',0.4));lid.position.y=0.5;jar.add(lid);
  const core=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex('rgba(255,230,120,0.9)'),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));core.scale.set(2.6,2.6,1);jar.add(core);
  const ff=[];for(let i=0;i<14;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex('rgba(255,255,160,1)'),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));s.scale.set(0.16,0.16,1);s.userData.ph=rnd()*6.28;jar.add(s);ff.push(s);}
  const jl=new THREE.PointLight(0xffd866,0,12,1.5);jar.add(jl);world.jar={g:jar,core,ff,light:jl,level:1};
}
function showOnly(ids){Object.keys(chars).forEach(k=>chars[k].visible=ids.includes(k));}
function place(id,x,z,ry,y){const c=chars[id];c.position.set(x,y||0,z);c.rotation.y=ry||0;c.visible=true;return c.userData.P;}
function resetPose(P){P.armL.rotation.set(0,0,0);P.armR.rotation.set(0,0,0);P.legL.rotation.set(0,0,0);P.legR.rotation.set(0,0,0);P.head.rotation.set(0,0,0);P.torso.rotation.set(0,0,0);P.torso.position.y=0;P._anim=null;}

/* ------------------------------------------------------------ lighting helpers */
function setLamps(level,t,cam){world.lamps.forEach(l=>{const lv=typeof level==='function'?level(l):level;l.level=lv;l.bulb.material=lv>0.5?world.bulbM:world.bulbOffM;l.cone.material.opacity=0.05*lv;l.pool.material.opacity=0.32*lv;l.gl.material.opacity=lv;});
  // real point lights follow the 5 lamps nearest the camera
  const near=world.lamps.slice().sort((a,b)=>Math.abs(a.z-cam.position.z)-Math.abs(b.z-cam.position.z)).slice(0,5);
  world.lampLights.forEach((p,i)=>{const l=near[i];p.position.set(l.g.position.x-l.s*1.4,6.6,l.z);p.intensity=1.6*l.level;});}
function mood(m){ // per-shot colour grade knobs
  const M={night:[0x7086c8,0.95,0.85],dark:[0x4a5c94,0.55,1.1],interior:[0x7a8ab8,0.8,0.4],warm:[0x9a8aaa,0.85,0.7]}[m]||[0x7086c8,0.95,0.85];
  world.hemi.color.setHex(M[0]);world.hemi.intensity=M[1];world.moon.intensity=M[2];world.fill.intensity=0;}

/* ------------------------------------------------------------ shots */
// Each shot: setup(u, t, lt) where u = 0..1 progress, t = global time, lt = local seconds.
const wordTime=(seg,word)=>{const s=TL.segs.find(x=>x.id===seg);const w=s&&s.words.find(x=>x.w.toLowerCase()===word);return w?w.s:(s?s.start:0);};
function camAt(p,l,fov){cam.position.copy(p);cam.lookAt(l);cam.fov=fov||40;cam.updateProjectionMatrix();}
function shake(amt,t){cam.position.x+=Math.sin(t*23.1)*amt+Math.sin(t*41.7)*amt*0.5;cam.position.y+=Math.cos(t*19.3)*amt;cam.rotation.z+=Math.sin(t*13.7)*amt*0.08;}
const SHOTS={
  drone_on:(u,t)=>{mood('night');setLamps(1,t,cam);camAt(V3(lerp(-30,-22,u),lerp(60,54,u),lerp(40,30,u)),V3(0,0,-50),45);setClock(11,58);},
  street_low:(u,t)=>{mood('night');setLamps(1,t,cam);camAt(V3(2.5,0.6,lerp(16,12,u)),V3(-3,6,-20),50);},
  lights_off:(u,t)=>{mood('night');const off=wordTime('rule','off');setLamps(l=>t<off?1:(t<off+0.05+(-l.z)*0.004?1:0),t,cam);camAt(V3(lerp(-12,-10,u),26,30),V3(0,2,-40),50);},
  door_lock:(u,t,lt)=>{mood('interior');setLamps(0,t,cam);const d=world.doorSet.position;world.bolts.forEach((b,i)=>{b.position.x=lerp(1.0,1.75,easeOut((lt-0.12-i*0.22)/0.12));});camAt(V3(d.x+2.6,3.4,d.z+lerp(5.5,4.6,u)),V3(d.x+0.9,3.1,d.z),40);},
  window_dark:(u,t)=>{mood('interior');setLamps(0,t,cam);const r=world.room.position;const P=place('leo',r.x+3,r.z-3.6,Math.PI,0);resetPose(P);BH.animate(P,t,{motion:'idle',expr:'sad'});camAt(V3(r.x+lerp(5.6,5.2,u),5.0,r.z-6.3),V3(r.x+3,4.7,r.z-3.6),40);world.fill.intensity=0.6;world.fill.color.setHex(0x8fa8ff);world.fill.position.set(r.x+3,5,r.z-20);showOnly(['leo']);},
  home_sign:(u,t)=>{mood('night');setLamps(1,t,cam);const h=world.houses[2];const p=h.sign.getWorldPosition(V3());const n=V3(-h.s,0,0);camAt(p.clone().add(n.clone().multiplyScalar(lerp(5.5,3.4,ease(u)))).add(V3(0,-0.4,0.6)),p,40);},
  home_row:(u,t)=>{mood('night');setLamps(1,t,cam);camAt(V3(0,lerp(3,4,u),lerp(18,14,u)),V3(0,3,-40),55);},
  shop:(u,t)=>{mood('night');setLamps(1,t,cam);const s=world.shop.position;camAt(V3(s.x-lerp(16,12,ease(u)),3.2,s.z+lerp(6,2,u)),V3(s.x,3.5,s.z),42);},
  clock_1159:(u,t)=>{mood('night');setLamps(1,t,cam);setClock(11,59);const f=world.clockFace.getWorldPosition(V3());camAt(f.clone().add(V3(0,-1,lerp(14,11,u))),f,40);},
  crowd_run:(u,t)=>{mood('night');setLamps(1,t,cam);setCrowd(true);camAt(V3(0,lerp(11,9.5,u),30),V3(0,2,-30),45);shake(0.04,t);},
  crowd_low:(u,t)=>{mood('night');setLamps(1,t,cam);setCrowd(true);camAt(V3(8.5,0.8,lerp(10,12,u)),V3(-1,3.2,-14),50);shake(0.07,t);},
  zash_intro:(u,t)=>{mood('warm');setLamps(1,t,cam);const h=world.houses[0];const P=place('leo',-8.6,h.z,Math.PI/2,0.3);P.setFace('default');BH.animate(P,t,{motion:'talk',expr:'happy',talkMouth:false});mouth(P,'zash',t);
    camAt(V3(lerp(-1.2,-1.8,u),4.4,h.z+lerp(2.8,2.2,u)),V3(-8.6,4.1,h.z),36);showOnly(['leo']);},
  zash_smug:(u,t)=>{mood('warm');setLamps(1,t,cam);const h=world.houses[0];const P=place('leo',-8.6,h.z,Math.PI/2+0.2,0.3);BH.animate(P,t,{motion:'idle',expr:'smug'});P.armL.rotation.z=-0.7;P.armR.rotation.z=0.7;P.armL.rotation.x=-0.25;P.armR.rotation.x=-0.25;mouth(P,'zash',t);
    camAt(V3(-3.6,lerp(4.9,4.8,u),h.z+lerp(1.6,1.3,u)),V3(-8.6,4.7,h.z),32);showOnly(['leo']);},
  clock_1200:(u,t,lt)=>{mood('night');setLamps(1,t,cam);setClock(12,0,true);const f=world.clockFace.getWorldPosition(V3());camAt(f.clone().add(V3(0,-0.4,lerp(9,6.5,easeOut(u)))),f,40);if(lt<0.25)shake(0.12*(1-lt/0.25),t);},
  lights_off2:(u,t,lt)=>{mood('night');setLamps(l=>lt<0.15+(-l.z+20)*0.006?1:0,t,cam);camAt(V3(0,lerp(9,8,u),24),V3(0,2,-50),50);},
  empty_room:(u,t)=>{mood('interior');setLamps(0,t,cam);const r=world.room.position;world.roomLight.intensity=0.9;camAt(V3(r.x+lerp(2.5,1.5,ease(u)),5.6,r.z+lerp(6.6,4.8,ease(u))),V3(r.x-2.6,2.4,r.z-3.4),46);},
  grab:(u,t,lt)=>{mood('interior');setLamps(0,t,cam);const r=world.room.position;const P=place('leo',r.x+3.6,r.z+1.5,-Math.PI/2+0.4,0);resetPose(P);P.setFace('shocked');
    const k=easeOut(lt/0.35);P.armR.rotation.x=lerp(0,-1.45,k);world.flash.g.visible=k>0.5;world.deskFlash.visible=k<0.5;flashOn(k>0.85?1:0);
    camAt(V3(r.x+0.4,4.6,r.z+4.6),V3(r.x+3.4,3.8,r.z+1),40);showOnly(['leo']);},
  run_street:(u,t)=>{mood('dark');setLamps(0,t,cam);const z=lerp(-14,-6,u);const P=place('leo',0.6,z,0,0);BH.animate(P,t*1.35,{motion:'walk',expr:'shocked',blend:0.01});P.armR.rotation.x=-1.25;P.torso.rotation.x=0.12;world.flash.g.visible=true;flashOn(1);world.fill.intensity=0.35;world.fill.position.set(0,6,30);
    camAt(V3(2.2,4.8,z+8.5),V3(0.3,3.4,z),44);shake(0.12,t);showOnly(['leo']);},
  figure_wide:(u,t)=>{mood('dark');setLamps(0,t,cam);const P=place('liza',-1.5,-62,Math.PI,0);resetPose(P);P.setFace('default');jarLevel(0);P.armL.rotation.x=-0.8;P.armR.rotation.x=-0.8;
    camAt(V3(0.5,4.2,-14),V3(-1.5,3.5,-62),11);showOnly(['liza']);S.overlay='scope';world.fill.intensity=0.25;world.fill.position.set(0,5,-20);},
  figure_close:(u,t)=>{mood('dark');setLamps(0,t,cam);const P=place('liza',-1.5,-30,Math.PI,0);jarLevel(0);P.armL.rotation.x=-0.8;P.armR.rotation.x=-0.8;const Z=place('leo',0.8,lerp(-21,-22,u),Math.PI+0.15,0);resetPose(Z);Z.armR.rotation.x=-1.3;world.flash.g.visible=true;flashOn(1);Z.setFace('shocked');
    camAt(V3(4.4,6.6,-12.5),V3(-1.4,3.2,-30),36);shake(0.04,t);showOnly(['liza','leo']);},
  zash_eyes:(u,t)=>{mood('dark');setLamps(0,t,cam);const Z=place('leo',0,-22,Math.PI,0);resetPose(Z);Z.armR.rotation.x=-1.3;Z.setFace(BH.animate&&((t*10|0)%37===0)?'shocked':'shocked');world.flash.g.visible=true;flashOn(0.6);
    const hp=Z.head.getWorldPosition(V3());camAt(V3(hp.x+lerp(0.2,0.1,u),hp.y+0.72,hp.z-lerp(3.0,2.2,ease(u))),V3(hp.x,hp.y+0.7,hp.z),36);world.fill.intensity=0.5;world.fill.position.set(0,0,-40);showOnly(['leo']);},
  reveal:(u,t,lt)=>{mood('dark');setLamps(0,t,cam);const P=place('liza',-1.5,-30,lerp(Math.PI,Math.PI*0.08,easeOut(lt/0.5)),0);P.armL.rotation.x=-0.8;P.armR.rotation.x=-0.8;P.setFace('happy');jarLevel(easeOut((lt-0.3)/0.4));
    const Z=place('leo',2.6,-24.5,Math.PI+0.35,0);resetPose(Z);Z.armR.rotation.x=-0.6;flashOn(0.5);camAt(V3(-4.8,4.9,-21.5),V3(-1.2,3.7,-30),40);showOnly(['liza','leo']);},
  jar_close:(u,t)=>{mood('dark');setLamps(0,t,cam);const P=place('liza',-1.5,-30,0,0);P.armL.rotation.x=-0.8;P.armR.rotation.x=-0.8;jarLevel(0.55);world.jar.core.scale.set(1.3,1.3,1);const j=world.jar.g.getWorldPosition(V3());
    camAt(V3(j.x+lerp(0.5,0.3,u),j.y+0.2,j.z+lerp(2.6,2.0,ease(u))),j,40);showOnly(['liza']);},
  liza_talk:(u,t)=>{mood('dark');setLamps(0,t,cam);const P=place('liza',-1.5,-30,0.15,0);BH.animate(P,t,{motion:'talk',expr:'happy',talkMouth:false});P.armL.rotation.x=-0.8;P.armR.rotation.x=-0.8;P.armL.rotation.z=0;P.armR.rotation.z=0;jarLevel(1);mouth(P,'liza',t);
    const hp=P.head.getWorldPosition(V3());camAt(V3(hp.x+0.9,hp.y+0.8,hp.z+lerp(4.6,3.9,ease(u))),V3(hp.x,hp.y+0.55,hp.z),36);showOnly(['liza']);},
  hug:(u,t)=>{mood('dark');setLamps(0,t,cam);const L=place('liza',-0.7,-29.5,Math.PI+0.35,0);const Z=place('leo',0.5,-30.7,0.35,0);[L,Z].forEach(P=>{resetPose(P);P.armL.rotation.x=-1.4;P.armR.rotation.x=-1.4;P.armL.rotation.z=0.55;P.armR.rotation.z=-0.55;});
    Z.setFace(u<0.55?'sad':'happy');L.setFace('happy');Z.head.rotation.z=0.14;L.head.rotation.z=-0.1;jarLevel(0.8);world.jar.g.position.set(0.0,1.6,1.4);world.flash.g.visible=false;flashOn(0);
    camAt(V3(lerp(3.6,3.0,ease(u)),5.0,lerp(-23.6,-25.4,ease(u))),V3(0.5,4.5,-30.5),36);showOnly(['liza','leo']);},
  lights_on:(u,t)=>{mood('night');const on=wordTime('twist','on');setLamps(t<on?0:1,t,cam);camAt(V3(lerp(26,20,u),48,lerp(30,24,u)),V3(0,0,-40),48);if(t>=on&&t<on+0.12)S.flash=1-(t-on)/0.12;},
  clock_1201:(u,t)=>{mood('night');setLamps(1,t,cam);setClock(12,1,true);const f=world.clockFace.getWorldPosition(V3());camAt(f.clone().add(V3(lerp(1,-1,u),-0.5,7)),f,40);},
  shadow_end:(u,t,lt)=>{mood('night');const fl=lt>1.6&&Math.sin(lt*31)>0.2;setLamps(l=>(l.z<-55&&l.z>-70&&l.s<0)?(fl?0.12:1):1,t,cam);const P=place('shadow',-4.6,-66.4,0.25,0);P.setFace('default');
    camAt(V3(0.8,1.0,lerp(4,-14,ease(u))),V3(-3.6,5.5,-66),lerp(40,28,ease(u)));showOnly(['shadow']);S.fade=clamp((lt-(TL.shots[TL.shots.length-1].e-TL.shots[TL.shots.length-1].s-0.7))/0.7,0,1);},
};
/* ------------------------------------------------------------ v2 story: the Dark, Dad, fireflies, end card */
function buildDark(){const g=new THREE.Group();g.visible=false;scene.add(g);
  const m=new THREE.MeshStandardMaterial({color:0x020205,roughness:1,metalness:0,fog:false});const geo=new THREE.IcosahedronGeometry(1,1);
  const blobs=[];for(let i=0;i<90;i++){const b=new THREE.Mesh(geo,m);const y=Math.pow(rnd(),1.3)*9;b.userData={x:(rnd()-0.5)*22,y,z:-rnd()*8+(y<2?1.5:0),s:1.0+rnd()*2.4,ph:rnd()*6.28};g.add(b);blobs.push(b);}
  const st=canvasTex(128,128,(c)=>{const gr=c.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(0.6,'rgba(0,0,0,0.8)');gr.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=gr;c.fillRect(0,0,128,128);});
  const smoke=[];for(let i=0;i<60;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:st,transparent:true,depthWrite:false,fog:false,opacity:0.9}));s.userData={x:(rnd()-0.5)*26,y:rnd()*12,z:-rnd()*8+1,s:4+rnd()*7,ph:rnd()*6.28};g.add(s);smoke.push(s);}
  const tg=new THREE.ConeGeometry(0.35,1,6);tg.translate(0,0.5,0);tg.rotateX(Math.PI/2);
  const tend=[];for(let i=0;i<26;i++){const tt=new THREE.Mesh(tg,m);tt.userData={x:(rnd()-0.5)*20,len:2+rnd()*5,ph:rnd()*6.28,y:0.2+rnd()*0.4};g.add(tt);tend.push(tt);}
  const em=new THREE.MeshBasicMaterial({color:0xf4f6ff,toneMapped:false,fog:false});const eg=new THREE.SphereGeometry(0.11,8,6);
  const eyes=[];for(let i=0;i<16;i++){const p=new THREE.Group();const x=(rnd()-0.5)*16,y=1.5+rnd()*6.5;p.position.set(x,y,2.6+rnd()*0.8);[-1,1].forEach(s=>{const e=new THREE.Mesh(eg,em);e.position.x=s*0.24;e.scale.set(1,0.7,1);p.add(e);});p.userData={ph:rnd()*20,sz:0.7+rnd()*0.8};p.scale.setScalar(p.userData.sz);g.add(p);eyes.push(p);}
  world.dark={g,blobs,smoke,tend,eyes,z:-200,recoil:0};}
// front = z of the leading edge, recoil 0..1 (eyes squint, mass pulls back), x/rotY/scale for the alley tease
function setDark(front,t,o){o=o||{};const D=world.dark;D.g.visible=true;D.g.position.set(o.x||0,0,front-3);D.g.rotation.y=o.ry||0;D.g.scale.setScalar(o.scale||1);const rc=o.recoil||0;
  D.blobs.forEach(b=>{const u=b.userData;const pul=1+0.12*Math.sin(t*2.3+u.ph)+0.06*Math.sin(t*5.1+u.ph*2);b.position.set(u.x+Math.sin(t*0.9+u.ph)*0.4,u.y+Math.sin(t*1.3+u.ph)*0.3,u.z-rc*2.5);b.scale.setScalar(u.s*pul*(1-rc*0.25));});
  D.smoke.forEach(s=>{const u=s.userData;s.position.set(u.x+Math.sin(t*0.5+u.ph)*0.8,u.y+((t*0.6+u.ph)%3),u.z-rc*2);s.scale.set(u.s,u.s,1);});
  D.tend.forEach(tt=>{const u=tt.userData;const L=u.len*(0.75+0.25*Math.sin(t*2+u.ph))*(1-rc*0.8);tt.position.set(u.x+Math.sin(t*1.7+u.ph)*0.5,u.y,3.2-rc*2);tt.scale.set(1,1,L);tt.rotation.y=Math.sin(t*1.1+u.ph)*0.35;});
  D.eyes.forEach(p=>{const u=p.userData;const bl=((t+u.ph)%4.3)<0.14?0.08:1;p.scale.set(u.sz,u.sz*bl*(1-rc*0.85),u.sz);p.position.z=2.6+Math.sin(t+u.ph)*0.3-rc*2;});}
function hideDark(){world.dark.g.visible=false;}
// lamps inside (behind) the Dark are swallowed
function lampsVsDark(front){return l=>0;}
function buildBurst(){const N=260;const pos=new Float32Array(N*3);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const m=new THREE.PointsMaterial({map:glowTex('rgba(255,250,150,1)'),size:0.55,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,color:0xfff0a0});
  const p=new THREE.Points(g,m);p.visible=false;p.frustumCulled=false;scene.add(p);const seeds=[];for(let i=0;i<N;i++)seeds.push([rnd()*6.28,Math.acos(rnd()*2-1),0.5+rnd(),rnd()*6.28]);
  const L=new THREE.PointLight(0xffd866,0,30,1.3);scene.add(L);world.burst={p,seeds,L};}
// k = 0 (inside jar) .. 1 (full cloud), centred on c
function setBurst(c,k,t){const B=world.burst;B.p.visible=k>0;B.L.intensity=4.5*Math.min(1,k*1.5);B.L.position.set(c.x,c.y+1.5,c.z);const a=B.p.geometry.attributes.position;
  B.seeds.forEach((s,i)=>{const R=k*(3.2+2.4*s[2])+0.2;const th=s[0]+t*0.3*s[2],ph=s[1];a.setXYZ(i,c.x+Math.cos(th)*Math.sin(ph)*R,Math.max(0.3,c.y+Math.cos(ph)*R*0.7+Math.sin(t*2+s[3])*0.3),c.z+Math.sin(th)*Math.sin(ph)*R);});a.needsUpdate=true;}
function buildDadProps(){const P=chars.dad.userData.P;const g=new THREE.Group();g.position.set(0,2.9,1.1);chars.dad.add(g);const cols=['#c0392b','#2b5cb8','#e8a33a','#2f8f8a','#1d1d24','#8a8f98'];
  cols.forEach((c,i)=>{const f=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.75,10),MAT(c,0.4));f.rotation.z=Math.PI/2+(i%2?0.2:-0.15);f.position.set((i%3-1)*0.25,(i/3|0)*0.22,(i%2)*0.12);g.add(f);
    const l=new THREE.Mesh(new THREE.CircleGeometry(0.11,10),new THREE.MeshBasicMaterial({color:0xfff6d8,toneMapped:false}));l.position.set((i%3-1)*0.25+0.38,(i/3|0)*0.22,(i%2)*0.12);l.rotation.y=Math.PI/2;g.add(l);});
  const dl=new THREE.PointLight(0xffc070,0,18,1.4);chars.dad.add(dl);dl.position.set(0,5,3);world.dadProps={g,dl};}
function shadowJar(on){if(!world.sjar){const P=chars.shadow.userData.P;const j=new THREE.Group();j.position.set(0,-2.15,0.35);P.armR.add(j);
    j.add(new THREE.Mesh(new THREE.CylinderGeometry(0.36,0.36,0.75,16),new THREE.MeshStandardMaterial({color:0xcfe8ff,transparent:true,opacity:0.3,roughness:0.05})));
    const c=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex('rgba(255,230,120,0.9)'),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));c.scale.set(1.8,1.8,1);j.add(c);
    const l=new THREE.PointLight(0xffd866,1.6,9,1.5);j.add(l);world.sjar={j,c,l};}
  world.sjar.j.visible=on;}
const KX=(z)=>V3(0,0,z);
Object.assign(SHOTS,{
  alley_tease:(u,t)=>{mood('dark');setLamps(0,t,cam);setDark(-39+u*0.6,t,{x:-9.5,ry:Math.PI/2,scale:0.35});camAt(V3(3,1.0,-30),V3(-8,1.6,-39),42);},
  dark_eyes_tease:(u,t)=>{mood('dark');setLamps(0,t,cam);setDark(-60,t);const e=world.dark.eyes[3].getWorldPosition(V3());camAt(V3(e.x+0.6,e.y+0.3,e.z+lerp(8,6,ease(u))),e,36);},
  smack:(u,t,lt)=>{mood('dark');setLamps(0,t,cam);const L=place('liza',-0.7,-30,Math.PI/2,0);const Z=place('leo',1.6,-30,-Math.PI/2,0);resetPose(L);resetPose(Z);
    const up=easeOut(lt/0.35), down=easeOut((lt-0.45)/0.08);Z.armR.rotation.x=lerp(lerp(0,-2.9,up),-1.55,down);Z.setFace(lt<0.5?'angry':'smug');
    const hit=lt>0.53;L.setFace(hit?'angry':'happy');L.head.rotation.z=hit?-0.18:0;L.head.scale.y=hit&&lt<0.62?0.9:1;L.armL.rotation.x=-0.8;L.armR.rotation.x=-0.8;jarLevel(0.8);world.flash.g.visible=true;flashOn(0.4);
    S.stars=hit&&lt<1.4?{c:L.head.getWorldPosition(V3()).add(V3(0,1.55,0)),t:lt}:null;camAt(V3(0.4,5.6,-20.5),V3(0.4,4.0,-30),40);showOnly(['liza','leo']);},
  zash_yell:(u,t)=>{mood('dark');setLamps(0,t,cam);const Z=place('leo',1.6,-30,-Math.PI/2+0.5,0);resetPose(Z);Z.setFace('angry');BH.animate(Z,t,{motion:'talk',expr:'angry',talkMouth:false});Z.armR.rotation.x=-0.9;Z.armR.rotation.z=0.4;mouth(Z,'zash',t);
    const hp=Z.head.getWorldPosition(V3());camAt(V3(hp.x-1.8,hp.y+0.7,hp.z+lerp(3.2,2.6,u)),V3(hp.x,hp.y+0.6,hp.z),38);shake(0.02,t);showOnly(['leo']);},
  liza_shrug:(u,t)=>{mood('dark');setLamps(0,t,cam);const L=place('liza',-0.7,-30,0.5,0);BH.animate(L,t,{motion:'talk',expr:'happy',talkMouth:false});L.armL.rotation.set(-0.5,0,-0.6);L.armR.rotation.set(-0.8,0,0.2);jarLevel(1);mouth(L,'liza',t);
    const hp=L.head.getWorldPosition(V3());camAt(V3(hp.x+1.6,hp.y+0.4,hp.z+4.2),V3(hp.x,hp.y+0.1,hp.z),40);showOnly(['liza']);},
  liza_shrug2:(u,t)=>{mood('dark');setLamps(0,t,cam);const Z=place('leo',1.6,-30,-Math.PI/2-0.3,0);resetPose(Z);BH.animate(Z,t,{motion:'idle',expr:'angry'});Z.armL.rotation.z=-0.7;Z.armR.rotation.z=0.7;Z.armL.rotation.x=-0.25;Z.armR.rotation.x=-0.25;
    const hp=Z.head.getWorldPosition(V3());camAt(V3(hp.x-3.4,hp.y+0.3,hp.z+lerp(1.6,1.2,u)),V3(hp.x,hp.y,hp.z),40);showOnly(['leo']);},
  jar_flicker:(u,t,lt)=>{mood('dark');setLamps(0,t,cam);const L=place('liza',-1.5,-30,0,0);resetPose(L);L.armL.rotation.x=-0.8;L.armR.rotation.x=-0.8;L.setFace('shocked');const fl=(Math.sin(lt*47)>0.1&&Math.sin(lt*13)>-0.4)?1:0.15;jarLevel(fl);
    const j=world.jar.g.getWorldPosition(V3());camAt(V3(j.x+0.6,j.y+1.1,j.z+3.6),V3(j.x,j.y+0.9,j.z),40);showOnly(['liza']);},
  dark_far:(u,t)=>{mood('dark');setLamps(0,t,cam);setDark(lerp(-105,-98,u),t,{scale:1.5});const L=place('liza',-1.6,-30,Math.PI,0);const Z=place('leo',1.6,-30,Math.PI,0);resetPose(L);resetPose(Z);jarLevel(1);Z.armR.rotation.x=-1.2;world.flash.g.visible=true;flashOn(1);
    camAt(V3(0.4,5.2,-23),V3(0,4,-90),38);showOnly(['liza','leo']);},
  dark_swallow:(u,t)=>{mood('dark');setLamps(l=>(l.z<-60&&l.z>-70)?(Math.sin(t*40)>0?0.6:0):0,t,cam);const f=lerp(-74,-64,u);setDark(f,t);camAt(V3(7.5,1.5,-48),V3(-2,4,-68),42);shake(0.03,t);},
  dark_close:(u,t)=>{mood('dark');setLamps(0,t,cam);setDark(lerp(-52,-44,u),t);camAt(V3(1,1.0,-36),V3(0,5,-50),50);shake(0.07,t);},
  kids_turn:(u,t,lt)=>{mood('dark');setLamps(0,t,cam);setDark(-42,t);const L=place('liza',-1.6,-30,Math.PI,0);const Z=place('leo',1.6,-30,Math.PI,0);resetPose(L);resetPose(Z);L.setFace('shocked');Z.setFace('shocked');jarLevel(1);L.armL.rotation.x=-0.8;L.armR.rotation.x=-0.8;Z.armR.rotation.x=-0.3;world.flash.g.visible=true;flashOn(0);
    camAt(V3(0,5.2,lerp(-41,-39.5,ease(u))),V3(0,4.7,-30),40);showOnly(['liza','leo']);},
  grab_hand:(u,t,lt)=>{mood('dark');setLamps(0,t,cam);const L=place('liza',-1.6,-30,0,0);const Z=place('leo',1.6,-30,0,0);resetPose(L);resetPose(Z);const k=easeOut(lt/0.3);Z.armL.rotation.z=lerp(0,-0.32,k);L.armR.rotation.z=0.3;L.armL.rotation.x=-0.8;jarLevel(1);world.flash.g.visible=true;flashOn(1);Z.armR.rotation.x=-0.6;
    camAt(V3(0.2,2.6,-25.5),V3(0,2.2,-30),42);showOnly(['liza','leo']);},
  run_two:(u,t)=>{mood('dark');setLamps(0,t,cam);const z=lerp(-28,-22,u);runPair(z,t);setDark(z-14,t);camAt(V3(0.6,4.4,z+9),V3(0,3.8,z-2),46);shake(0.12,t);showOnly(['liza','leo']);},
  flash_flicker:(u,t,lt)=>{mood('dark');setLamps(0,t,cam);const z=lerp(-22,-20,u);runPair(z,t);setDark(z-13,t);flashOn(Math.sin(lt*55)>0.3?1:0);const f=world.flash.g.getWorldPosition(V3());camAt(V3(f.x+1.4,f.y+0.5,f.z+2.4),f,40);shake(0.08,t);showOnly(['liza','leo']);},
  flash_dead:(u,t)=>{mood('dark');setLamps(0,t,cam);const z=lerp(-20,-18,u);runPair(z,t);setDark(z-11,t);flashOn(0);chars.leo.userData.P.setFace('shocked');const hp=chars.leo.userData.P.head.getWorldPosition(V3());camAt(V3(hp.x+0.6,hp.y+0.7,hp.z+3.2),V3(hp.x,hp.y+0.6,hp.z),38);shake(0.08,t);showOnly(['liza','leo']);},
  run_back:(u,t)=>{mood('dark');setLamps(0,t,cam);const z=lerp(-18,-12,u);runPair(z,t,true);flashOn(0);setDark(z-lerp(9,6,u),t);mouth(chars.liza.userData.P,'liza',t);camAt(V3(-1.2,4.8,z+6.5),V3(-0.6,4.0,z-4),48);shake(0.12,t);showOnly(['liza','leo']);},
  door_bang:(u,t,lt)=>{mood('dark');setLamps(0,t,cam);setDark(-16,t);const Z=place('leo',-8.3,-4,-Math.PI/2,0.3);const L=place('liza',-7.4,-1.6,-Math.PI/2+0.9,0.3);resetPose(Z);resetPose(L);Z.armR.rotation.x=-1.4+0.35*Math.abs(Math.sin(lt*10));Z.armL.rotation.x=-1.4+0.35*Math.abs(Math.cos(lt*10));Z.setFace('shocked');L.setFace('shocked');L.armL.rotation.x=-0.8;L.armR.rotation.x=-0.8;jarLevel(1);flashOn(0);
    camAt(V3(-2.5,4.8,0.5),V3(-8.8,3.8,-3.4),44);shake(0.05,t);showOnly(['liza','leo']);},
  curtain_close:(u,t,lt)=>{mood('dark');setLamps(0,t,cam);const h=world.houses[2];h.wm.color.setHex(lt<0.4?0xffc070:0x1a2030);camAt(V3(lerp(1.5,0.5,u),3.8,-4),V3(-9.4,3.8,-4),64);},
  zash_think:(u,t)=>{mood('dark');setLamps(0,t,cam);setDark(-13,t);const Z=place('leo',-6.4,-3.0,Math.PI*0.75,0.3);resetPose(Z);Z.setFace('default');Z.head.rotation.z=0.12;Z.head.rotation.y=Math.sin(t*2)*0.15;
    const hp=Z.head.getWorldPosition(V3());camAt(V3(hp.x+2.1,hp.y+0.7,hp.z-2.2),V3(hp.x,hp.y+0.6,hp.z),36);world.fill.intensity=0.5;world.fill.position.set(hp.x+6,hp.y,hp.z-6);showOnly(['leo']);},
  dark_near:(u,t)=>{mood('dark');setLamps(0,t,cam);setDark(lerp(-12,-10,u),t);camAt(V3(-4,0.8,-2),V3(-2,4.5,-14),52);shake(0.05,t);},
  jar_hold:(u,t)=>{mood('dark');setLamps(0,t,cam);setDark(-9.5,t);const L=place('liza',-6.2,-2.2,Math.PI,0.3);resetPose(L);L.armL.rotation.x=-1.25;L.armR.rotation.x=-1.25;jarLevel(0.45);world.jar.core.scale.set(1.2,1.2,1);world.jar.g.position.set(0,3.6,1.3);L.setFace('sad');
    const j=world.jar.g.getWorldPosition(V3());camAt(V3(j.x+0.8,j.y+0.3,j.z-lerp(3.0,2.4,ease(u))),j,40);showOnly(['liza']);},
  jar_open:(u,t,lt)=>{mood('dark');setLamps(0,t,cam);setDark(-9.5,t);const L=place('liza',-6.2,-2.2,Math.PI,0.3);resetPose(L);L.armL.rotation.x=-1.25;L.armR.rotation.x=-1.25;jarLevel(0.5);world.jar.core.scale.set(1.3,1.3,1);world.jar.g.position.set(0,3.6,1.3);
    const lid=world.jar.g.children[1];lid.position.y=0.5+easeOut((lt-0.25)/0.2)*1.2;lid.rotation.z=easeOut((lt-0.25)/0.2)*1.2;const j=world.jar.g.getWorldPosition(V3());setBurst(j,clamp((lt-0.35)/0.6,0,0.25),t);
    camAt(V3(j.x+1.4,j.y+0.8,j.z-3.4),V3(j.x,j.y+0.4,j.z),42);showOnly(['liza']);},
  firefly_burst:(u,t,lt)=>{mood('dark');setLamps(0,t,cam);setDark(-9.5,t,{recoil:easeOut(lt/0.9)*0.6});const L=place('liza',-6.2,-2.2,Math.PI,0.3);const Z=place('leo',-4.0,-2.0,Math.PI,0.3);resetPose(L);resetPose(Z);L.setFace('shocked');Z.setFace('shocked');L.armL.rotation.x=-1.25;L.armR.rotation.x=-1.25;world.jar.g.position.set(0,3.6,1.3);jarLevel(0.4);
    setBurst(V3(-5.1,4,-3),easeOut(lt/0.8),t);camAt(V3(-5,4.6,lerp(4.5,6,u)),V3(-5,4.2,-3),50);showOnly(['liza','leo']);},
  firefly_wide:(u,t)=>{mood('dark');setLamps(0,t,cam);setDark(-10.5,t,{recoil:0.8});const L=place('liza',-6.2,-2.2,Math.PI,0.3);const Z=place('leo',-4.0,-2.0,Math.PI,0.3);L.armL.rotation.x=-1.25;L.armR.rotation.x=-1.25;world.jar.g.position.set(0,3.6,1.3);jarLevel(0.4);Z.setFace('happy');L.setFace('happy');
    setBurst(V3(-5.1,4,-3),1,t);camAt(V3(lerp(10,8,u),16,10),V3(-5,2,-6),48);showOnly(['liza','leo']);},
  dark_stop:(u,t,lt)=>{mood('dark');setLamps(0,t,cam);setDark(-11-easeOut(lt/0.8)*4,t,{recoil:1});setBurst(V3(-5.1,4,-3),1,t);camAt(V3(-3,3.6,-4.5),V3(-3,4.5,-16),46);},
  run_home:(u,t)=>{mood('dark');setLamps(0,t,cam);setDark(-26,t,{recoil:0.6});const z=lerp(-2,6,u);runPair(z,t,false,-3.2);setBurst(V3(-3.2,4,z-1),0.7,t);world.houses[0].wm&&world.houses[0].wm.color.setHex(0xffc070);
    camAt(V3(1.5,4.2,z-7),V3(-4,3.8,z+6),46);shake(0.06,t);showOnly(['liza','leo']);},
  dad_door:(u,t,lt)=>{mood('warm');setLamps(0,t,cam);const h=world.houses[0];const D=place('dad',-9.0,h.z,Math.PI/2,0.3);resetPose(D);D.armL.rotation.x=-1.0;D.armR.rotation.x=-1.0;D.armL.rotation.z=0.35;D.armR.rotation.z=-0.35;D.setFace(lt<0.5?'shocked':'sad');world.dadProps.dl.intensity=2.4;
    camAt(V3(lerp(-1.5,-2.5,ease(u)),4.0,h.z+1.4),V3(-9.0,4.2,h.z),40);showOnly(['dad']);},
  dad_close:(u,t)=>{mood('warm');setLamps(0,t,cam);const h=world.houses[0];const D=place('dad',-9.0,h.z,Math.PI/2,0.3);resetPose(D);D.armL.rotation.x=-1.0;D.armR.rotation.x=-1.0;D.armL.rotation.z=0.35;D.armR.rotation.z=-0.35;D.setFace('sad');world.dadProps.dl.intensity=2.4;
    const hp=D.head.getWorldPosition(V3());camAt(V3(hp.x+3.4,hp.y+0.7,hp.z+lerp(0.8,0.5,u)),V3(hp.x,hp.y+0.6,hp.z),34);showOnly(['dad']);},
  family_hug:(u,t)=>{mood('warm');setLamps(0,t,cam);const h=world.houses[0];const D=place('dad',-9.6,h.z,Math.PI/2,0.3);const Z=place('leo',-8.6,h.z-1.6,Math.PI/2+0.35,0.3);const L=place('liza',-8.6,h.z+1.6,Math.PI/2-0.35,0.3);
    [D,Z,L].forEach(P=>resetPose(P));D.armL.rotation.set(-0.35,0,-1.25);D.armR.rotation.set(-0.35,0,1.25);Z.armR.rotation.z=0.35;L.armL.rotation.z=-0.35;Z.head.rotation.z=-0.12;L.head.rotation.z=0.12;
    D.setFace(u<0.4?'sad':'happy');Z.setFace('sad');L.setFace(u<0.5?'sad':'happy');world.dadProps.g.visible=false;world.dadProps.dl.intensity=2.4;
    camAt(V3(lerp(-0.2,-1.8,ease(u)),5.6,h.z+0.3),V3(-9.0,5.4,h.z),50);showOnly(['dad','leo','liza']);},
  shadow_far:(u,t,lt)=>{mood('night');setLamps(1,t,cam);const P=place('shadow',-4.6,-66.4,0.25,0);shadowJar(true);P.armR.rotation.x=-0.3;
    camAt(V3(0.8,1.0,lerp(4,-6,ease(u))),V3(-3.6,5,-66),lerp(40,32,ease(u)));showOnly(['shadow']);},
  shadow_jar:(u,t)=>{mood('night');setLamps(1,t,cam);const P=place('shadow',-4.6,-66.4,0.25,0);shadowJar(true);P.armR.rotation.x=-0.3;const j=world.sjar.j.getWorldPosition(V3());
    camAt(V3(j.x+2.6,j.y+2.6,j.z+lerp(7,5,ease(u))),V3(j.x,j.y+1.6,j.z),38);showOnly(['shadow']);},
  window_tag:(u,t)=>{mood('interior');setLamps(0,t,cam);const r=world.room.position;const L=place('liza',r.x+2.0,r.z-3.6,Math.PI-0.5,0);const Z=place('leo',r.x+4.2,r.z-3.4,Math.PI+0.4,0);resetPose(L);resetPose(Z);L.setFace('happy');Z.setFace('default');mouth(L,'liza',t);
    world.fill.intensity=0.6;world.fill.color.setHex(0x8fa8ff);world.fill.position.set(r.x+3,5,r.z-20);camAt(V3(r.x+3.1,5.3,r.z-6.6),V3(r.x+3.1,4.5,r.z-3.4),58);showOnly(['liza','leo']);},
  zash_no:(u,t,lt)=>{mood('interior');setLamps(0,t,cam);const r=world.room.position;const Z=place('leo',r.x+4.2,r.z-3.4,Math.PI+0.4,0);resetPose(Z);Z.setFace('default');mouth(Z,'zash',t);
    world.fill.intensity=0.6;world.fill.color.setHex(0x8fa8ff);world.fill.position.set(r.x+3,5,r.z-20);const hp=Z.head.getWorldPosition(V3());camAt(V3(hp.x-0.8,hp.y+0.65,hp.z-3.0),V3(hp.x,hp.y+0.6,hp.z),36);showOnly(['leo']);
    const len=TL.shots[TL.shots.length-1].e-TL.shots[TL.shots.length-1].s;S.fade=clamp((lt-0.9)/0.5,0,1);S.endcard=clamp((lt-1.3)/0.4,0,1);},
});
function runPair(z,t,lookBack,xc){xc=xc||0;const L=place('liza',xc-1.7,z,0,0);const Z=place('leo',xc+1.7,z,0,0);
  BH.animate(Z,t*1.4,{motion:'walk',expr:'shocked',blend:0.01,face:false});BH.animate(L,t*1.4+0.3,{motion:'walk',expr:'shocked',blend:0.01,face:false});
  Z.setFace('shocked');L.setFace(lookBack?'shocked':'shocked');Z.armL.rotation.z=-0.28;Z.armL.rotation.x=0;L.armR.rotation.z=0.28;L.armR.rotation.x=0;Z.armR.rotation.x=-1.0;L.armL.rotation.x=-0.8;
  if(lookBack){L.head.rotation.y=Math.PI*0.55;}
  world.flash.g.visible=true;jarLevel(1);}

function flashOn(k){const f=world.flash;f.spot.intensity=3.6*k;f.beam.material.opacity=0.16*k;f.lg.material.opacity=0.8*k;f.lens.material.color.setScalar(k>0?1:0.25);}
function jarLevel(k){const j=world.jar;j.g.position.set(0,2.75,1.15);j.core.scale.set(2.2,2.2,1);j.core.material.opacity=0.95*k;j.light.intensity=2.4*k;j.ff.forEach(s=>s.material.opacity=k);}
function mouth(P,who,t){const env=TL.mouth[who];if(!env)return;const f=Math.round(t*TL.fps);const a=env[f]||0;P.setFace(P.expr||'default',{mouthOpen:a>0.12?Math.min(1,a*1.1):0,blink:false});}

/* ------------------------------------------------------------ captions + overlays */
let capWord=null;
function captionAt(t){for(const s of TL.segs){for(let i=0;i<s.words.length;i++){const w=s.words[i];const nx=s.words[i+1];const end=nx?nx.s:Math.min(w.e+0.25,s.end+0.25);if(t>=w.s&&t<end)return {w,since:t-w.s};}}return null;}
function drawCaption(t){const c=captionAt(t);if(!c)return;const text=c.w.w.toUpperCase();const base=W*0.118*(text.length>8?8/text.length*1.05:1);
  const k=c.since<0.04?lerp(1,1.08,c.since/0.04):c.since<0.08?lerp(1.08,1,(c.since-0.04)/0.04):1;
  og.save();og.translate(W/2,H*0.42);og.scale(k,k);og.font=`${base}px "Luckiest Guy", Impact, sans-serif`;og.textAlign='center';og.textBaseline='middle';og.lineJoin='round';
  og.shadowColor='rgba(0,0,0,0.55)';og.shadowBlur=base*0.25;og.shadowOffsetY=base*0.06;og.lineWidth=base*0.2;og.strokeStyle='#0d0d12';og.strokeText(text,0,0);og.shadowColor='transparent';
  og.fillStyle=c.w.red?'#ff3b3b':'#ffffff';og.fillText(text,0,0);og.restore();}
function drawOverlays(){
  const vg=og.createRadialGradient(W/2,H/2,H*0.32,W/2,H/2,H*0.72);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,10,0.55)');og.fillStyle=vg;og.fillRect(0,0,W,H);
  if(S.overlay==='scope'){og.save();og.fillStyle='#000';og.beginPath();og.rect(0,0,W,H);const r=W*0.36;og.arc(W*0.32,H*0.47,r,0,7,true);og.arc(W*0.68,H*0.47,r,0,7,true);og.fill('evenodd');
    og.strokeStyle='rgba(255,255,255,0.15)';og.lineWidth=2;og.beginPath();og.moveTo(W*0.5-30,H*0.47);og.lineTo(W*0.5+30,H*0.47);og.moveTo(W*0.5,H*0.47-30);og.lineTo(W*0.5,H*0.47+30);og.stroke();og.restore();}
  if(S.flash>0){og.fillStyle=`rgba(255,250,235,${S.flash*0.85})`;og.fillRect(0,0,W,H);}
  if(S.stars){const p=S.stars.c.clone().project(cam);const cx=(p.x*0.5+0.5)*W,cy=(-p.y*0.5+0.5)*H;og.save();og.fillStyle='#ffe066';og.strokeStyle='#1a1616';og.lineWidth=W*0.006;
    for(let i=0;i<3;i++){const a=S.stars.t*7+i*2.09;const x=cx+Math.cos(a)*W*0.09,y=cy+Math.sin(a)*W*0.03;og.beginPath();for(let k=0;k<10;k++){const r=(k%2?0.4:1)*W*0.03,aa=-Math.PI/2+k*Math.PI/5;og.lineTo(x+Math.cos(aa)*r,y+Math.sin(aa)*r);}og.closePath();og.fill();og.stroke();}og.restore();}
  if(S.fade>0){og.fillStyle=`rgba(0,0,0,${S.fade})`;og.fillRect(0,0,W,H);}
  if(S.endcard>0){og.save();og.globalAlpha=S.endcard;og.textAlign='center';og.textBaseline='middle';og.font=`${W*0.13}px "Luckiest Guy", Impact`;og.lineWidth=W*0.02;og.strokeStyle='#0d0d12';og.strokeText('BLOCKHEADS',W/2,H*0.46);og.fillStyle='#ffd23f';og.fillText('BLOCKHEADS',W/2,H*0.46);
    og.font=`${W*0.05}px "Luckiest Guy", Impact`;og.fillStyle='#ffffff';og.fillText('PART 2? COMMENT "YES"',W/2,H*0.55);og.restore();}
  // film grain
  og.globalAlpha=0.05;og.drawImage(S.grain,(Math.random()*64)|0,(Math.random()*64)|0);og.globalAlpha=1;}

/* ------------------------------------------------------------ entry points */
S.init=async function(timeline,w,h,fontUrl){TL=timeline;W=w;H=h;
  const ff=new FontFace('Luckiest Guy',`url(${fontUrl})`);await ff.load();document.fonts.add(ff);
  R=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});R.setSize(W,H);R.setPixelRatio(1);R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.15;
  cam=new THREE.PerspectiveCamera(40,W/H,0.1,1200);
  buildWorld();buildChars();buildDark();buildBurst();buildDadProps();
  const [oc,o2]=cv(W,H);out=oc;og=o2;
  const [gc,gg]=cv(W+64,H+64);const id=gg.createImageData(W+64,H+64);for(let i=0;i<id.data.length;i+=4){const v=Math.random()*255;id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=255;}gg.putImageData(id,0,0);S.grain=gc;
  return true;};
S.frame=function(f,q){const t=f/TL.fps;const shot=TL.shots.find(s=>t>=s.s&&t<s.e)||TL.shots[TL.shots.length-1];
  S.overlay=null;S.flash=0;S.fade=0;S.endcard=0;S.stars=null;setCrowd(false);hideDark();world.burst.p.visible=false;world.burst.L.intensity=0;world.dadProps.dl.intensity=0;world.dadProps.g.visible=true;if(world.sjar)world.sjar.j.visible=false;world.fill.intensity=0;world.fill.color.setHex(0xffc89a);
  if(shot!==curShot){curShot=shot;showOnly([]);world.flash.g.visible=false;flashOn(0);world.deskFlash.visible=true;world.jar.g.position.set(0,2.75,1.15);world.jar.g.children[1].position.y=0.5;world.jar.g.children[1].rotation.z=0;world.houses.forEach(h=>h.wm.color.setHex(h.wm.userData.c));}
  const u=(t-shot.s)/(shot.e-shot.s), lt=t-shot.s;
  (SHOTS[shot.name]||SHOTS.home_row)(u,t,lt);
  if(crowd.visible)updateCrowd(t);
  world.jar.ff.forEach((s,i)=>{const p=s.userData.ph;s.position.set(Math.sin(t*2.1+p)*0.28,Math.sin(t*1.7+p*2)*0.32,Math.cos(t*2.4+p)*0.28);s.material.opacity=world.jar.core.material.opacity*(0.6+0.4*Math.sin(t*9+p));});
  R.render(scene,cam);
  og.drawImage(R.domElement,0,0);drawOverlays();drawCaption(t);
  return out.toDataURL('image/jpeg',q||0.9);};
S.shotAt=t=>(TL.shots.find(s=>t>=s.s&&t<s.e)||{}).name;
})();
