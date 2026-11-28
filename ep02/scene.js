/* Episode 2 "The Wall": walled town, Giants, hook lines, bell tower.
   Entry points (same contract as the sample): SAMPLE.init(timeline, W, H, fontUrl), SAMPLE.frame(f) */
(function(){
const S = window.SAMPLE = {};
let TL, W, H, R, scene, cam, out, og, world = {}, chars = {}, curShot = null;
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const lerp=(a,b,t)=>a+(b-a)*t, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);}, easeOut=t=>1-Math.pow(1-clamp(t,0,1),3), easeIn=t=>Math.pow(clamp(t,0,1),2);
const rnd=rng('thewall');

/* ------------------------------------------------------------ textures */
function canvasTex(w,h,draw){const [c,g]=cv(w,h);draw(g,w,h);return tex(c);}
function glowTex(col){return canvasTex(128,128,(g)=>{const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.25,col);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);});}
function signTex(text,fg,bg,w=512,h=160,font=96,sub){return canvasTex(w,h,(g)=>{g.fillStyle=bg;g.fillRect(0,0,w,h);g.strokeStyle=fg;g.lineWidth=8;g.strokeRect(8,8,w-16,h-16);g.font=`${font}px "Luckiest Guy", Impact, sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillStyle=fg;g.fillText(text,w/2,sub?h*0.38:h/2+6);if(sub){g.font=`${font*0.5}px "Luckiest Guy", Impact`;g.fillText(sub,w/2,h*0.75);}});}
function stoneTex(col,seed,bw=64,bh=32){return canvasTex(512,512,(g,w,h)=>{const r=rng(seed);g.fillStyle=col;g.fillRect(0,0,w,h);
  for(let y=0;y<h;y+=bh)for(let x=-(y/bh%2)*bw/2;x<w;x+=bw){g.fillStyle=shade(col,(r()-0.5)*0.25);g.fillRect(x+2,y+2,bw-4,bh-4);g.fillStyle='rgba(0,0,0,0.08)';g.fillRect(x+2,y+bh-6,bw-4,4);}
  g.fillStyle='rgba(0,0,0,0.12)';for(let i=0;i<60;i++){g.beginPath();g.arc(r()*w,r()*h,2+r()*8,0,7);g.fill();}});}
function plankTex(col){return canvasTex(256,256,(g,w,h)=>{fabricFill(g,0,0,w,h,col,'canvas');g.strokeStyle='rgba(0,0,0,0.25)';g.lineWidth=2;for(let y=0;y<h;y+=32){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}});}

/* ------------------------------------------------------------ world */
const HOUSES=[];const ROOF_Y=14;
function buildWorld(){
  scene=new THREE.Scene();scene.fog=new THREE.Fog(0xcfe0f0,80,520);
  world.skyCanvas=cv(16,512);world.skyTex=tex(world.skyCanvas[0]);scene.background=world.skyTex;
  world.hemi=new THREE.HemisphereLight(0xdfeeff,0x6a5a40,0.9);scene.add(world.hemi);
  world.sun=new THREE.DirectionalLight(0xfff2d8,1.25);world.sun.position.set(60,120,80);scene.add(world.sun);
  world.fill=new THREE.DirectionalLight(0xffffff,0);scene.add(world.fill);
  // clouds
  const ct=canvasTex(256,128,(g)=>{for(let i=0;i<9;i++){const gr=g.createRadialGradient(40+i*22,70-(i%3)*10,0,40+i*22,70-(i%3)*10,44);gr.addColorStop(0,'rgba(255,255,255,0.95)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,256,128);}});
  world.clouds=[];for(let i=0;i<22;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:ct,transparent:true,depthWrite:false,fog:false,opacity:0.85}));const a=rnd()*6.28,d=250+rnd()*300;s.position.set(Math.cos(a)*d,90+rnd()*120,Math.sin(a)*d);s.scale.set(140+rnd()*120,60+rnd()*40,1);scene.add(s);world.clouds.push(s);}
  // ground: grass outside, cobbles inside
  const grass=new THREE.Mesh(new THREE.CircleGeometry(900,64),new THREE.MeshStandardMaterial({map:canvasTex(256,256,(g,w,h)=>{fabricFill(g,0,0,w,h,'#6f8f4a','fleece');}),roughness:1}));grass.material.map.wrapS=grass.material.map.wrapT=THREE.RepeatWrapping;grass.material.map.repeat.set(60,60);grass.rotation.x=-Math.PI/2;scene.add(grass);
  const cob=stoneTex('#a89a86','cob',48,24);cob.wrapS=cob.wrapT=THREE.RepeatWrapping;cob.repeat.set(18,18);
  const town=new THREE.Mesh(new THREE.CircleGeometry(139,64),new THREE.MeshStandardMaterial({map:cob,roughness:0.95}));town.rotation.x=-Math.PI/2;town.position.y=0.02;scene.add(town);
  // the wall (with a breakable section toward +x)
  const wt=stoneTex('#9c9282','wall',96,48);wt.wrapS=wt.wrapT=THREE.RepeatWrapping;wt.repeat.set(40,4);
  const wm=new THREE.MeshStandardMaterial({map:wt,roughness:0.95,side:THREE.DoubleSide});
  const gap=0.09;const wall=new THREE.Mesh(new THREE.CylinderGeometry(140,140,70,96,1,true,Math.PI/2+gap,Math.PI*2-gap*2),wm);wall.position.y=35;scene.add(wall);
  const top=new THREE.Mesh(new THREE.RingGeometry(136,144,96),new THREE.MeshStandardMaterial({color:0x8a8070,roughness:1,side:THREE.DoubleSide}));top.rotation.x=-Math.PI/2;top.position.y=70;scene.add(top);
  // crack section: blocks that can be knocked out
  world.crack=[];const bm=new THREE.MeshStandardMaterial({map:stoneTex('#958b7c','blk',64,32),roughness:0.95});
  for(let y=0;y<10;y++)for(let k=-3;k<=3;k++){const a=k*0.025;const b=new THREE.Mesh(new THREE.BoxGeometry(5,7,8),bm);const R0=140;b.position.set(Math.cos(a)*R0,3.5+y*7,Math.sin(a)*R0);b.rotation.y=-a;scene.add(b);world.crack.push({m:b,home:b.position.clone(),y,k,v:V3((rnd()-0.6)*20,rnd()*10,(rnd()-0.5)*16),rot:V3(rnd()*3,rnd()*3,rnd()*3)});}
  // houses: two rings of tall 3-storey houses around the square
  const wallCols=['#d9c7a8','#c9a98a','#b8c4b0','#d4b8a0','#c4b8c8','#e0d0b0'];const roofCols=['#8a3a2a','#6a4a3a','#3a4a5a','#5a3a2a'];
  const ringR=[44,64];ringR.forEach((Rr,ri)=>{const n=ri?24:16;for(let i=0;i<n;i++){const a=(i+0.5*ri)/n*Math.PI*2;
    if(ri===0&&Math.abs(Math.atan2(Math.sin(a+Math.PI/2),Math.cos(a+Math.PI/2)))<0.35)continue; // leave room for the tower side (-z)
    if(Math.abs(Math.atan2(Math.sin(a),Math.cos(a)))<0.22)continue; // leave the street to the crack (+x)
    const g=new THREE.Group();g.position.set(Math.cos(a)*Rr,0,Math.sin(a)*Rr);g.rotation.y=-a-Math.PI/2;scene.add(g);g.updateMatrixWorld(true);
    const col=wallCols[(i+ri)%wallCols.length];const hm=new THREE.MeshStandardMaterial({map:hatTex(col,'canvas'),roughness:0.9});
    const body=new THREE.Mesh(new THREE.BoxGeometry(11,ROOF_Y,10),hm);body.position.y=ROOF_Y/2;g.add(body);
    const roof=new THREE.Mesh(new THREE.BoxGeometry(11.6,0.6,10.6),new THREE.MeshStandardMaterial({color:new THREE.Color(roofCols[i%4]).convertSRGBToLinear(),roughness:0.8}));roof.position.y=ROOF_Y+0.3;g.add(roof);
    const winM=new THREE.MeshStandardMaterial({color:0x2a3a4a,roughness:0.2,metalness:0.3});
    for(let fl=0;fl<3;fl++)for(const x of [-3.2,3.2]){const w=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),winM);w.position.set(x,2.6+fl*4.3,5.01);g.add(w);const sh=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.25,0.3),MAT('#f2efe6',0.7));sh.position.set(x,1.6+fl*4.3,5.1);g.add(sh);}
    const door=new THREE.Mesh(new THREE.BoxGeometry(2,3,0.2),MAT('#5a3420',0.6));door.position.set(0,10.1,5.05);g.add(door);
    const bal=new THREE.Mesh(new THREE.BoxGeometry(3.6,0.3,1.8),new THREE.MeshStandardMaterial({map:plankTex('#8a6a4a'),roughness:0.9}));bal.position.set(0,8.45,5.9);g.add(bal);
    const lad=ladder(8.3);lad.position.set(1.0,0,6.6);g.add(lad);
    HOUSES.push({g,a,R:Rr,ri,roofTop:g.localToWorld(V3(0,ROOF_Y+0.6,0))});
  }});
  // rope lines between rooftops + across the square to the tower
  world.ropeM=new THREE.MeshStandardMaterial({color:0x4a3a2a,roughness:0.9});
  const inner=HOUSES.filter(h=>h.ri===0);inner.forEach((h,i)=>{const n=inner[(i+1)%inner.length];if(h.g.position.distanceTo(n.g.position)<40)scene.add(ropeMesh(h.g.localToWorld(V3(0,ROOF_Y+3,3)),n.g.localToWorld(V3(0,ROOF_Y+3,3)),0.06));});
  // bell tower (-z)
  const tw=new THREE.Group();tw.position.set(0,0,-24);scene.add(tw);world.tower=tw;
  const tm=new THREE.MeshStandardMaterial({map:stoneTex('#b8ab96','tw',48,24),roughness:0.95});
  const shaft=new THREE.Mesh(new THREE.BoxGeometry(8,33,8),tm);shaft.position.y=16.5;tw.add(shaft);
  const plat=new THREE.Mesh(new THREE.BoxGeometry(10,1,10),tm);plat.position.y=33.5;tw.add(plat);
  [[-4.5,-4.5],[4.5,-4.5],[-4.5,4.5],[4.5,4.5]].forEach(([x,z])=>{const p=new THREE.Mesh(new THREE.BoxGeometry(1,8,1),tm);p.position.set(x,38,z);tw.add(p);});
  const troof=new THREE.Mesh(new THREE.ConeGeometry(8,6,4),new THREE.MeshStandardMaterial({color:0x6a2a20,roughness:0.8}));troof.position.y=45;troof.rotation.y=Math.PI/4;tw.add(troof);
  const bellG=new THREE.Group();bellG.position.set(0,41.5,0);tw.add(bellG);world.bell=bellG;
  const pts=[];for(let i=0;i<=16;i++){const t=i/16;pts.push(new THREE.Vector2(0.6+Math.pow(t,1.8)*2.0+(t>0.92?0.25:0),-t*3.4));}
  const bell=new THREE.Mesh(new THREE.LatheGeometry(pts,32),new THREE.MeshStandardMaterial({color:0xc9a24a,metalness:0.9,roughness:0.28,side:THREE.DoubleSide}));bellG.add(bell);
  const clap=new THREE.Mesh(new THREE.SphereGeometry(0.45,12,10),METAL('#6a5a3a'));clap.position.y=-3.1;bellG.add(clap);
  const beam=new THREE.Mesh(new THREE.BoxGeometry(9,0.6,0.6),new THREE.MeshStandardMaterial({map:plankTex('#5a4030')}));beam.position.y=42;tw.add(beam);
  world.towerTop=V3(0,34,-24);
  // square props: banner, cookie stand, rope shop, zipline
  const ban=new THREE.Mesh(new THREE.PlaneGeometry(16,5),new THREE.MeshStandardMaterial({map:signTex('SCOUT TRYOUTS','#f2e6c8','#3e5a3a',1024,320,150,'FRIDAY  -  BRING YOUR OWN ROPE'),side:THREE.DoubleSide,roughness:0.9}));ban.position.set(0,12,-17);scene.add(ban);world.banner=ban;
  [-8,8].forEach(x=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,15,8),MAT('#5a4030',0.8));p.position.set(x,7.5,-17);scene.add(p);});
  world.stand=standSet(-14,0,6);world.shop=shopSet(16,0,10);
  world.zipA=V3(-30,ROOF_Y+4,20);world.zipB=V3(28,ROOF_Y+1,24);scene.add(ropeMesh(world.zipA,world.zipB,0.07));
  const crate=new THREE.Group();const cr=new THREE.Mesh(new THREE.BoxGeometry(2.2,1.4,1.6),new THREE.MeshStandardMaterial({map:plankTex('#b8864a')}));crate.add(cr);
  for(let i=0;i<3;i++){const l=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,1.6,8),MAT('#d89a50',0.8));l.rotation.z=Math.PI/2;l.position.set(0,0.9,-0.4+i*0.4);crate.add(l);}
  const hk=new THREE.Mesh(new THREE.TorusGeometry(0.3,0.06,6,12),METAL('#888'));hk.position.y=1.6;crate.add(hk);scene.add(crate);world.crate=crate;
  // outside giants (background)
  world.dust=[];const dt=glowTex('rgba(200,180,150,0.7)');for(let i=0;i<14;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dt,transparent:true,depthWrite:false,opacity:0}));s.scale.set(10,6,1);scene.add(s);world.dust.push(s);}
  // shockwave rings
  world.waves=[0,1,2].map(()=>{const m=new THREE.Mesh(new THREE.TorusGeometry(1,0.08,6,48),new THREE.MeshBasicMaterial({color:0xfff2c0,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));m.visible=false;scene.add(m);return m;});
  buildStairs();buildHome();scene.updateMatrixWorld(true);
}
function ladder(h){const g=new THREE.Group();const m=new THREE.MeshStandardMaterial({color:0x7a5a3a,roughness:0.9});[-0.5,0.5].forEach(x=>{const r=new THREE.Mesh(new THREE.BoxGeometry(0.15,h,0.15),m);r.position.set(x,h/2,0);g.add(r);});for(let y=0.5;y<h;y+=0.7){const r=new THREE.Mesh(new THREE.BoxGeometry(1,0.1,0.1),m);r.position.set(0,y,0);g.add(r);}return g;}
function ropeMesh(a,b,r){const d=b.clone().sub(a);const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1,6),world.ropeM||MAT('#4a3a2a'));m.position.copy(a).add(b).multiplyScalar(0.5);m.scale.y=d.length();m.quaternion.setFromUnitVectors(V3(0,1,0),d.normalize());return m;}
function setRope(m,a,b){const d=b.clone().sub(a);m.position.copy(a).add(b).multiplyScalar(0.5);m.scale.set(1,d.length(),1);m.quaternion.setFromUnitVectors(V3(0,1,0),d.normalize());m.visible=true;}
function standSet(x,y,z){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=0.5;scene.add(g);
  const t=new THREE.Mesh(new THREE.BoxGeometry(5,2.2,2),new THREE.MeshStandardMaterial({map:plankTex('#a8743a')}));t.position.y=1.1;g.add(t);
  const s=new THREE.Mesh(new THREE.PlaneGeometry(5,1.8),new THREE.MeshBasicMaterial({map:signTex('GIANT-PROOF COOKIES','#3a1a0a','#ffe08a',768,256,74,'2 FOR $1'),side:THREE.DoubleSide}));s.position.set(0,7.6,0);g.add(s);
  [-2.3,2.3].forEach(px=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,7,6),MAT('#5a4030'));p.position.set(px,3.5,0);g.add(p);});
  const plate=new THREE.Group();plate.position.set(0.6,2.3,0.4);g.add(plate);const pl=new THREE.Mesh(new THREE.CylinderGeometry(0.9,0.8,0.08,24),MAT('#f2f2f2',0.4));plate.add(pl);
  for(let i=0;i<7;i++){const c=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.28,0.09,16),new THREE.MeshStandardMaterial({map:canvasTex(64,64,(g2)=>{g2.fillStyle='#c98a4a';g2.fillRect(0,0,64,64);g2.fillStyle='#4a2a1a';for(let k=0;k<6;k++){g2.beginPath();g2.arc(10+k*9,(k*23)%50+8,4,0,7);g2.fill();}}),roughness:0.9}));const a=i/7*6.28;c.position.set(Math.cos(a)*0.45*(i?1:0),0.09+(i>3?0.09:0),Math.sin(a)*0.45*(i?1:0));plate.add(c);}
  world.plate=plate;return g;}
function shopSet(x,y,z){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=-0.6;scene.add(g);
  const s=new THREE.Mesh(new THREE.PlaneGeometry(6,1.8),new THREE.MeshBasicMaterial({map:signTex('ROPES','#f2e6c8','#5a3420',640,192,120),side:THREE.DoubleSide}));s.position.set(0,6,0);g.add(s);
  const t=new THREE.Mesh(new THREE.BoxGeometry(6,2,2),new THREE.MeshStandardMaterial({map:plankTex('#8a5a3a')}));t.position.y=1;g.add(t);
  for(let i=0;i<6;i++){const c=new THREE.Mesh(new THREE.TorusGeometry(0.55,0.2,8,20),new THREE.MeshStandardMaterial({map:hatTex(['#c8a878','#8a6a4a','#d8c8a0'][i%3],'canvas'),roughness:1}));c.rotation.x=Math.PI/2;c.position.set(-2.2+i*0.88,2.2+(i%2)*0.3,0);g.add(c);}
  [-2.9,2.9].forEach(px=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,6,6),MAT('#5a4030'));p.position.set(px,3,0);g.add(p);});return g;}
function buildStairs(){const g=new THREE.Group();g.position.set(500,0,0);scene.add(g);world.stairs=g;
  const tm=new THREE.MeshStandardMaterial({map:stoneTex('#8a7e6c','st',48,24),roughness:0.95,side:THREE.BackSide});const sh=new THREE.Mesh(new THREE.CylinderGeometry(6,6,80,24,1,true),tm);sh.position.y=40;g.add(sh);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.8,80,12),new THREE.MeshStandardMaterial({map:stoneTex('#a89a84','pl')}));pole.position.y=40;g.add(pole);
  const sm=new THREE.MeshStandardMaterial({map:stoneTex('#b8ab96','stp',32,16),roughness:0.9});for(let i=0;i<200;i++){const a=i*0.32;const s=new THREE.Mesh(new THREE.BoxGeometry(4.6,0.35,1.8),sm);s.position.set(Math.cos(a)*3.3,i*0.36,Math.sin(a)*3.3);s.rotation.y=-a;g.add(s);}
  for(let i=0;i<10;i++){const a=i*1.1;const sl=new THREE.Mesh(new THREE.PlaneGeometry(0.8,3),new THREE.MeshBasicMaterial({color:0xfff2c8}));sl.position.set(Math.cos(a)*5.95,6+i*7,Math.sin(a)*5.95);sl.lookAt(0,sl.position.y,0);g.add(sl);}
  const L=new THREE.PointLight(0xfff0d0,1.2,40,1.4);L.position.set(0,30,0);g.add(L);world.stairLight=L;}
function buildHome(){const g=new THREE.Group();g.position.set(-500,0,0);scene.add(g);world.home=g;
  const wm=new THREE.MeshStandardMaterial({map:plankTex('#a88a6a'),roughness:0.9,side:THREE.BackSide});const room=new THREE.Mesh(new THREE.BoxGeometry(14,8,14),wm);room.position.y=4;g.add(room);
  const tbl=new THREE.Mesh(new THREE.BoxGeometry(4,0.25,2.4),new THREE.MeshStandardMaterial({map:plankTex('#6a4a32')}));tbl.position.set(0,2.4,-3);g.add(tbl);
  const ph=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.2),new THREE.MeshBasicMaterial({map:canvasTex(320,240,(c,w,h)=>{c.fillStyle='#d8c39a';c.fillRect(0,0,w,h);c.fillStyle='#8a7350';c.fillRect(0,h*0.55,w,h*0.45);c.fillStyle='#6a5640';c.fillRect(w*0.1,h*0.1,w*0.5,h*0.55);c.fillStyle='#d8c39a';c.beginPath();c.moveTo(w*0.32,h*0.1);c.lineTo(w*0.27,h*0.35);c.lineTo(w*0.36,h*0.4);c.lineTo(w*0.3,h*0.65);c.lineTo(w*0.42,h*0.65);c.lineTo(w*0.38,h*0.4);c.lineTo(w*0.45,h*0.35);c.lineTo(w*0.4,h*0.1);c.fill();
    c.fillStyle='#4a3a28';c.fillRect(w*0.68,h*0.4,w*0.1,h*0.32);c.beginPath();c.arc(w*0.73,h*0.36,w*0.05,0,7);c.fill();c.fillStyle='rgba(60,40,20,0.35)';c.fillRect(0,0,w,h);c.strokeStyle='#f4ecd8';c.lineWidth=14;c.strokeRect(0,0,w,h);c.font='22px "Luckiest Guy"';c.fillStyle='#3a2a18';c.fillText('THE THIRD BELL',w*0.08,h*0.92);})}));
  ph.position.set(0,3.2,-3.4);ph.rotation.x=-0.3;g.add(ph);world.photo=ph;
  const win=new THREE.Mesh(new THREE.PlaneGeometry(3.6,3),new THREE.MeshBasicMaterial({map:canvasTex(256,256,(c,w,h)=>{const gr=c.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#7ab0e0');gr.addColorStop(1,'#d8e8f0');c.fillStyle=gr;c.fillRect(0,0,w,h);c.fillStyle='#9c9282';c.fillRect(0,h*0.45,w,h*0.55);c.fillStyle='#8a8070';for(let x=0;x<w;x+=24)c.fillRect(x,h*0.45,20,6);})}));win.position.set(3,4.6,-6.95);g.add(win);
  const L=new THREE.PointLight(0xffd8a0,1.2,30,1.4);L.position.set(0,6,2);g.add(L);world.homeLight=L;}

/* ------------------------------------------------------------ characters */
function scoutify(base,id,cloak){const c=JSON.parse(JSON.stringify(base));c.id=id;c.torso.outer={style:'cloak',color:cloak||'#3e5a3a'};c.torso.belt='#4a3420';c.sleeves={color:cloak?shade(cloak,-0.1):'#4a5a40',len:'full'};c.pants={color:'#c8b48a',fabric:'twill',shoes:'#3a2a1a',shoeStyle:'boot'};c.extras=(c.extras||[]).filter(e=>!/handbag|ball|camera|notepad|lanyard|mug|clipboard|wrench|cane|laptop|phone|apron|spoon|map|lantern/.test(e));return c;}
function giantSpec(id,skin){return {id,name:'Giant',skin,hair:{style:'buzz',color:shade(skin,-0.35)},face:{eyes:'big',eyeColor:'#2a2018',pupil:0.42,brows:'none',mouth:'grin',nose:'wide'},ears:true,
  torso:{inner:skin},sleeves:{len:'none'},pants:{color:shade(skin,-0.05),shoes:skin,shoeStyle:'bare'}};}
function hookGear(P){const m=METAL('#8a9098',0.35);[-1,1].forEach(s=>{const c=rbox(0.35,0.7,0.5,0.08,m);c.position.set(s*1.08,2.25,0.1);P.torso.add(c);});}
function buildChars(){
  const add=(id,spec,sc)=>{const c=spec||BH.castById(id);const g=buildChar(c);if(sc)g.scale.setScalar(sc);scene.add(g);g.visible=false;chars[id]=g;return g;};
  add('leo');add('liza');add('tobi');add('dad');add('max');
  add('somi',scoutify(BH.castById('somi'),'somi'));hookGear(chars.somi.userData.P);hookGear(chars.leo.userData.P);
  ['jet','brooks','dex','penny'].forEach((id,i)=>{add('sc'+i,scoutify(BH.castById(id),'sc'+i,['#3e5a3a','#4a5a3a','#3a4a3e','#40563a'][i]));hookGear(chars['sc'+i].userData.P);});
  ['benny','theo','mom','gus'].forEach(id=>add(id));
  add('giant',giantSpec('giant','#d8b49a'),6);add('giant2',giantSpec('giant2','#c8a088'),6);add('giant3',giantSpec('giant3','#e0c0a8'),6);
  // each giant gets its own wide grin (teeth) + tiny eyes via face; no hair shine
  world.ropes={};['leo','somi','sc0','sc1','sc2','sc3','max','benny','theo'].forEach(id=>{const r=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1,5),MAT('#3a2a1a',0.9));r.visible=false;scene.add(r);world.ropes[id]=r;});
  // bird
  const b=new THREE.Group();const bm=MAT('#3a5a8a',0.7);const body=rbox(0.5,0.35,0.7,0.12,bm);b.add(body);const head=rbox(0.3,0.3,0.3,0.1,bm);head.position.set(0,0.2,0.4);b.add(head);const beak=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.2,4),MAT('#e8a33a'));beak.rotation.x=Math.PI/2;beak.position.set(0,0.2,0.6);b.add(beak);
  world.wings=[-1,1].map(s=>{const w=rbox(0.6,0.05,0.4,0.02,bm);w.geometry=w.geometry.clone();w.geometry.translate(s*0.3,0,0);b.add(w);return w;});b.visible=false;scene.add(b);world.bird=b;
  // hook launcher prop for the gift shot
  const hl=new THREE.Group();const hb=rbox(0.6,0.5,1.2,0.1,METAL('#8a9098',0.35));hl.add(hb);const hk=new THREE.Mesh(new THREE.TorusGeometry(0.22,0.05,6,12,Math.PI*1.4),METAL('#c9ccd2',0.3));hk.position.z=0.75;hl.add(hk);const coil=new THREE.Mesh(new THREE.TorusGeometry(0.35,0.1,6,16),MAT('#6a5038',0.9));coil.position.set(0,0.4,-0.2);coil.rotation.x=Math.PI/2;hl.add(coil);hl.visible=false;scene.add(hl);world.launcher=hl;
}
function showOnly(ids){Object.keys(chars).forEach(k=>chars[k].visible=ids.includes(k));}
function place(id,x,y,z,ry){const c=chars[id];c.position.set(x,y,z);c.rotation.set(0,ry||0,0);c.visible=true;return c.userData.P;}
function reset(P){['armL','armR','legL','legR','head'].forEach(k=>P[k].rotation.set(0,0,0));P.torso.rotation.set(0,0,0);P.torso.position.y=0;P.head.scale.set(1,1,1);P._anim=null;P.armL.position.set(-1.5,4,0);P.armR.position.set(1.5,4,0);}
function face(P,e){P.setFace(e);}
function mouth(P,who,t,e){const env=TL.mouth[who];const f=Math.round(t*TL.fps);const a=env?env[f]||0:0;P.setFace(e||P.expr||'default',{mouthOpen:a>0.12?Math.min(1,a*1.1):0});}
// hook-line swing: hang a character under an anchor point; theta = swing angle, dir = horizontal swing direction
function swing(id,anchor,L,theta,dir,t,expr){const P=place(id,0,0,0,0);reset(P);const d=dir.clone().normalize();
  const hand=anchor.clone().add(d.clone().multiplyScalar(Math.sin(theta)*L)).add(V3(0,-Math.cos(theta)*L,0));
  const c=chars[id];const s=c.scale.x;c.position.copy(hand).add(V3(0,-6.0*s,0));c.rotation.y=Math.atan2(d.x,d.z);c.rotateOnAxis(V3(1,0,0),-theta*0.6);
  P.armR.rotation.x=-Math.PI+0.05;P.armL.rotation.x=-0.3-Math.sin(t*3)*0.2;P.legL.rotation.x=-0.5+theta*0.4;P.legR.rotation.x=0.1+theta*0.4;if(expr)face(P,expr);
  const hp=c.localToWorld(V3(1.5,6.0,0));if(world.ropes[id])setRope(world.ropes[id],hp,anchor);return P;}
function hideRopes(){Object.values(world.ropes).forEach(r=>r.visible=false);}

/* ------------------------------------------------------------ light moods */
function sky(top,mid,bot){const [c,g]=world.skyCanvas;const gr=g.createLinearGradient(0,0,0,512);gr.addColorStop(0,top);gr.addColorStop(0.6,mid);gr.addColorStop(1,bot);g.fillStyle=gr;g.fillRect(0,0,16,512);world.skyTex.needsUpdate=true;}
function mood(m){if(world.mood===m)return;world.mood=m;
  const M={day:['#4a8ad8','#9cc8f0','#e8f0f4',0xdfeeff,0.95,0xfff2d8,1.3,[60,120,80],0xcfe0f0],
    golden:['#3a5a9a','#f0a868','#ffd8a0',0xffd8b0,0.8,0xffb070,1.5,[-120,50,40],0xf0c8a0],
    dusk:['#1a2048','#6a4a7a','#e88a6a',0x8a7aa8,0.65,0xff9a6a,0.9,[-140,25,-20],0x6a5a7a],
    indoor:['#4a8ad8','#9cc8f0','#e8f0f4',0xffe8d0,0.8,0xfff2d8,0.4,[60,120,80],0xcfe0f0]}[m];
  sky(M[0],M[1],M[2]);world.hemi.color.setHex(M[3]);world.hemi.intensity=M[4];world.sun.color.setHex(M[5]);world.sun.intensity=M[6];world.sun.position.set(...M[7]);scene.fog.color.setHex(M[8]);}

/* ------------------------------------------------------------ helpers */
function camAt(p,l,fov){cam.position.copy(p);cam.lookAt(l);cam.fov=fov||40;cam.updateProjectionMatrix();}
function shake(a,t){cam.position.x+=Math.sin(t*23.1)*a+Math.sin(t*41.7)*a*0.5;cam.position.y+=Math.cos(t*19.3)*a;}
const head=id=>chars[id].userData.P.head.getWorldPosition(V3()).add(V3(0,0.6*chars[id].scale.x,0));
function giantWalk(id,x,z,ry,t,speed){const P=place(id,x,0,z,ry);BH.animate(P,t*(speed||0.45),{motion:'walk',expr:'default',blend:0.01,face:false});face(P,'default');return P;}
function dust(p,k){world.dust.forEach((s,i)=>{const a=i/world.dust.length*6.28;s.position.set(p.x+Math.cos(a)*k*14,1+Math.sin(i)*2+k*3,p.z+Math.sin(a)*k*14);s.material.opacity=0.6*(1-k);s.scale.set(8+k*14,5+k*8,1);});}
function crackState(k,t){world.crack.forEach(c=>{const out=c.y<7&&Math.abs(c.k)<=2;if(out&&k>0){const tt=k;c.m.position.copy(c.home).add(c.v.clone().multiplyScalar(tt)).add(V3(0,-9.8*tt*tt*3,0));c.m.position.y=Math.max(2,c.m.position.y);c.m.rotation.set(c.rot.x*tt,c.rot.y*tt-0,c.rot.z*tt);}else{c.m.position.copy(c.home);c.m.rotation.set(0,-c.k*0.025,0);}c.m.visible=!(out&&k>=1.2);});}
function bellSwing(a){world.bell.rotation.z=a;}
const segT=(id)=>{const s=TL.segs.find(x=>x.id===id);return s?s.start:0;};
const SQ=V3(8,0,4); // where the giant stands in the square

/* ------------------------------------------------------------ shots */
const SH={
  drone_wall:(u,t)=>{mood('day');camAt(V3(lerp(-150,-110,u),lerp(150,135,u),lerp(170,140,u)),V3(0,10,-10),46);},
  wall_low:(u,t)=>{mood('day');camAt(V3(118,2,lerp(30,20,u)),V3(140,60,0),58);},
  giant_silhouette:(u,t)=>{mood('day');scene.fog.near=60;giantWalk('giant',190,120,Math.PI*1.2,t);giantWalk('giant2',240,40,Math.PI*1.4,t+2);giantWalk('giant3',150,220,Math.PI*1.05,t+4);camAt(V3(142,74,-10),V3(200,22,120),lerp(48,40,u));showOnly(['giant','giant2','giant3']);},
  giant_eye:(u,t)=>{mood('day');const P=giantWalk('giant',230,320,Math.PI*1.1,t);const hp=head('giant');camAt(hp.clone().add(V3(-6,0.4,-lerp(16,12,u))),hp.clone().add(V3(0,0.3,0)),34);showOnly(['giant']);},
  giant_smile:(u,t)=>{mood('day');const P=giantWalk('giant',200,250,Math.PI*1.15,t);const hp=head('giant');camAt(hp.clone().add(V3(-10,-2,-lerp(24,20,u))),hp,36);showOnly(['giant']);},
  giant_hand:(u,t)=>{mood('day');const P=place('giant',200,0,250,Math.PI*1.15);reset(P);face(P,'default');P.armR.rotation.x=lerp(-0.6,-1.5,ease(u));P.armR.rotation.z=0.3;const hp=P.armR.localToWorld(V3(0,-1.9,0.4));camAt(hp.clone().add(V3(-14,-6,-14)),hp,46);showOnly(['giant']);},
  giant_step:(u,t,lt)=>{mood('day');const P=giantWalk('giant',200,250,Math.PI*1.15,t);const f=chars.giant.position;dust(V3(f.x,0,f.z),clamp(lt/1.2,0,1));camAt(V3(f.x-20,1.5,f.z-26),V3(f.x,6,f.z),56);shake(0.4*(1-clamp(lt/0.5,0,1)),t);showOnly(['giant']);},
  giant_neck:(u,t)=>{mood('day');const P=place('giant',200,0,250,Math.PI*1.15);reset(P);face(P,'default');P.head.rotation.x=-0.12+Math.sin(t*6)*0.03;const hp=head('giant');camAt(hp.clone().add(V3(-26,-4,-12)),hp.clone().add(V3(0,4,0)),40);showOnly(['giant']);},
  kid_on_roof:(u,t)=>{mood('day');const h=HOUSES[3];const p=h.roofTop;const P=place('benny',p.x,p.y,p.z,h.g.rotation.y);reset(P);P.legL.rotation.x=-1.5;P.legR.rotation.x=-1.3;P.armR.rotation.z=2.4+Math.sin(t*9)*0.3;face(P,'happy');P.torso.position.y=-1.8;
    camAt(V3(p.x*0.62,p.y+7,p.z*0.62),V3(p.x,p.y+2.5,p.z),44);showOnly(['benny']);},
  tall_houses:(u,t)=>{mood('day');camAt(V3(lerp(-6,6,u),3,30),V3(-20,12,-30),52);},
  door_ladder:(u,t)=>{mood('day');const h=HOUSES[1];const lp=h.g.localToWorld(V3(1.0,0,7.3));const P=place('tobi',lp.x,lerp(2,5.5,u),lp.z,h.g.rotation.y+Math.PI);reset(P);P.armL.rotation.x=-2.6+Math.sin(t*8)*0.3;P.armR.rotation.x=-2.6-Math.sin(t*8)*0.3;P.legL.rotation.x=-0.6*Math.max(0,Math.sin(t*8));P.legR.rotation.x=-0.6*Math.max(0,-Math.sin(t*8));face(P,'shocked');
    const door=h.g.localToWorld(V3(0,10,5.2));camAt(door.clone().add(h.g.localToWorld(V3(0,0,20)).sub(h.g.position)).add(V3(0,-2,0)),door.clone().add(V3(0,-3,0)),46);showOnly(['tobi']);},
  baby_hook:(u,t)=>{mood('day');const A=V3(-6,13,14);swing('max',A,7,Math.sin(t*2.2)*0.9,V3(1,0,0),t,'happy');const mp=chars.max.position;camAt(V3(mp.x+1,mp.y+5,mp.z+11),mp.clone().add(V3(0,4,0)),42);showOnly(['max']);},
  kids_swing:(u,t)=>{mood('day');swing('benny',V3(-12,18,0),9,Math.sin(t*1.8)*1.0,V3(1,0,0.3),t,'happy');swing('theo',V3(6,19,-4),10,Math.sin(t*1.8+1.6)*1.0,V3(1,0,-0.2),t,'happy');swing('max',V3(-2,17,8),7,Math.sin(t*2.2+0.8)*0.9,V3(1,0,0),t,'happy');
    camAt(V3(lerp(-3,3,u),7,26),V3(-2,10,2),50);showOnly(['benny','theo','max']);},
  bread_zip:(u,t)=>{mood('day');const k=ease(u);const p=world.zipA.clone().lerp(world.zipB,k);world.crate.position.copy(p).add(V3(0,-1.7,0));world.crate.visible=true;camAt(V3(p.x+4,p.y-3,p.z+14),p.clone().add(V3(0,-1.5,0)),44);showOnly([]);},
  rope_shop:(u,t)=>{mood('day');const g=world.shop;camAt(g.localToWorld(V3(lerp(-2,0,u),3.2,lerp(10,8,u))),g.localToWorld(V3(0,3.4,0)),46);showOnly([]);},
  liza_stand:(u,t)=>{mood('day');const g=world.stand;const p=g.localToWorld(V3(0,0,-2.2));const P=place('liza',p.x,0,p.z,g.rotation.y);reset(P);BH.animate(P,t,{motion:'talk',expr:'happy',talkMouth:false});P.armR.rotation.z=2.2+Math.sin(t*7)*0.3;P.armR.rotation.x=0;mouth(P,'liza',t,'happy');
    camAt(g.localToWorld(V3(1.2,5.4,9)),g.localToWorld(V3(0,5.2,-1)),44);showOnly(['liza']);},
  cookie_close:(u,t)=>{mood('day');const p=world.plate.getWorldPosition(V3());camAt(p.clone().add(V3(lerp(1.2,0.9,u),1.3,lerp(2.4,1.9,u))),p,40);showOnly([]);},
  bell_tower:(u,t)=>{mood('day');camAt(V3(lerp(-20,-16,u),6,lerp(10,4,u)),V3(0,32,-24),48);bellSwing(0);},
  bell_ecu:(u,t)=>{mood('day');const b=world.bell.getWorldPosition(V3());camAt(b.clone().add(V3(4,-3,lerp(9,7,u))),b.clone().add(V3(0,-1.6,0)),40);bellSwing(Math.sin(t*1.2)*0.02);},
  old_photo:(u,t)=>{mood('indoor');const p=world.photo.getWorldPosition(V3());camAt(p.clone().add(V3(0,0.5,lerp(2.6,2.0,ease(u)))),p,40);showOnly([]);},
  dad_window:(u,t)=>{mood('indoor');const h=world.home.position;const P=place('dad',h.x+3,0,h.z-4.2,Math.PI);reset(P);face(P,'sad');P.head.rotation.x=0.12;camAt(V3(h.x+5.6,5.0,h.z-6.3),V3(h.x+3,4.7,h.z-4.2),40);world.fill.intensity=0.6;world.fill.position.set(h.x+3,5,h.z-20);showOnly(['dad']);},
  zash_intro_wall:(u,t)=>{mood('day');const h=HOUSES[2];const b=h.g.localToWorld(V3(0,8.6,5.9));const P=place('leo',b.x,b.y,b.z,h.g.rotation.y);reset(P);BH.animate(P,t,{motion:'talk',expr:'default',talkMouth:false});mouth(P,'zash',t,'default');
    const f=h.g.localToWorld(V3(1.2,13.4,10));camAt(f,b.clone().add(V3(0,4.6,0)),40);showOnly(['leo']);},
  zash_ladder_shake:(u,t)=>{mood('day');const h=HOUSES[2];const lp=h.g.localToWorld(V3(1.0,0,7.3));const lp2=h.g.localToWorld(V3(1.0,0,7.1));const P=place('leo',lp2.x,3.2,lp2.z,h.g.rotation.y);reset(P);P.armL.rotation.set(-2.9,0,-0.3);P.armR.rotation.set(-2.9,0,0.3);P.legL.rotation.x=-0.3;face(P,'shocked');chars.leo.position.x+=Math.sin(t*40)*0.05;
    const f=h.g.localToWorld(V3(4,4.5,13));camAt(f,lp.clone().add(V3(0,7,0)),44);showOnly(['leo']);},
  tobi_laugh:(u,t)=>{mood('day');const P=place('tobi',-4,0,-4,0.3);reset(P);BH.animate(P,t,{motion:'talk',expr:'happy',talkMouth:false});P.armL.rotation.set(-0.6,0,-0.3);P.armR.rotation.set(-0.4,0,0.6);mouth(P,'tobi',t,'happy');const hp=head('tobi');camAt(hp.clone().add(V3(1.4,0.1,4.2)),hp.clone().add(V3(0,-0.2,0)),40);showOnly(['tobi']);},
  tobi_scream:(u,t)=>{mood('day');const P=place('tobi',-4,0.9,-4,0.3);reset(P);face(P,'shocked');P.armL.rotation.set(-2.6,0,-0.3);P.armR.rotation.set(-2.6,0,0.3);chars.tobi.position.x+=Math.sin(t*35)*0.06;const st=world.stool||(world.stool=(()=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(0.9,1,0.9,12),new THREE.MeshStandardMaterial({map:plankTex('#a8743a')}));scene.add(m);return m;})());st.visible=true;st.position.set(-4,0.45,-4);
    camAt(V3(-2.2,3.2,4.2),V3(-4,3.4,-4),46);showOnly(['tobi']);},
  tryout_banner:(u,t)=>{mood('day');camAt(V3(0,lerp(9,11,u),lerp(6,2,ease(u))),V3(0,12,-17),46);world.banner.rotation.y=Math.sin(t*1.3)*0.04;},
  scouts_march:(u,t)=>{mood('day');for(let i=0;i<4;i++){const P=place('sc'+i,-3+i%2*6,0,lerp(10,4,u)-Math.floor(i/2)*5,Math.PI);BH.animate(P,t*1.1+i*0.3,{motion:'walk',expr:'default',blend:0.01,face:false});face(P,'smug');}
    camAt(V3(0,1.6,-12),V3(0,4,8),52);showOnly(['sc0','sc1','sc2','sc3']);},
  scouts_gate:(u,t)=>{mood('day');for(let i=0;i<4;i++){const P=place('sc'+i,124+i*1.2,0,-6+i*4,Math.PI/2);reset(P);face(P,'default');}camAt(V3(lerp(110,114,u),4,-16),V3(126,5,0),48);showOnly(['sc0','sc1','sc2','sc3']);},
  somi_swing:(u,t)=>{mood('day');const A=V3(0,26,-6);const th=lerp(-1.0,1.0,ease(u));swing('somi',A,14,th,V3(1,0,0),t,'happy');S.overlay='speed';const sp=chars.somi.position;camAt(V3(sp.x*0.6,sp.y+5,sp.z+12),sp.clone().add(V3(0,4,0)),46);showOnly(['somi']);},
  zash_watch:(u,t)=>{mood('day');const P=place('leo',-2,0,10,Math.PI*0.9);reset(P);face(P,'happy');P.head.rotation.x=-0.25;const hp=head('leo');camAt(hp.clone().add(V3(0.8,0.2,-3.6)),hp.clone().add(V3(0,-0.1,0)),40);showOnly(['leo']);},
  somi_bird:(u,t,lt)=>{mood('day');const A=V3(0,26,-6);const th=lerp(-0.6,0.9,ease(u));const P=swing('somi',A,14,th,V3(1,0,0),t,'happy');P.armL.rotation.x=-2.4;
    const hl=chars.somi.localToWorld(V3(-1.5,6,0.5));const bird=world.bird;bird.visible=true;bird.position.copy(u<0.45?hl.clone().add(V3(-4+u*8,6-u*13,0)):hl);world.wings.forEach((w,i)=>w.rotation.z=(i?1:-1)*Math.sin(t*30)*0.8);
    S.overlay='speed';const sp2=chars.somi.position;camAt(V3(sp2.x*0.6,sp2.y+5,sp2.z+12),sp2.clone().add(V3(0,4,0)),46);showOnly(['somi']);},
  somi_land:(u,t)=>{mood('day');const h=HOUSES[4];const p=h.roofTop;const P=place('somi',p.x,p.y,p.z,h.g.rotation.y);reset(P);face(P,'smug');P.legL.rotation.x=-0.4*(1-ease(u));P.armL.rotation.x=-0.6;world.bird.visible=true;world.bird.position.copy(chars.somi.localToWorld(V3(-1.5,2.4,0.9)));
    camAt(p.clone().add(V3(0,4,0)).add(h.g.localToWorld(V3(4,0,12)).sub(h.g.position)),p.clone().add(V3(0,4,0)),42);showOnly(['somi']);},
  bell_ring1:(u,t,lt)=>{mood('golden');ringShot(lt);},
  bell_ring2:(u,t,lt)=>{mood('golden');ringShot(lt,1);},
  bell_ring3:(u,t,lt)=>{mood('golden');ringShot(lt,2);},
  crowd_freeze:(u,t)=>{mood('golden');['liza','tobi','mom','gus','benny'].forEach((id,i)=>{const P=place(id,-8+i*4,0,6-(i%2)*3,Math.PI*0.95);reset(P);face(P,'shocked');P.head.rotation.x=-0.3;});camAt(V3(0,4.6,-14),V3(0,4.4,5),52);showOnly(['liza','tobi','mom','gus','benny']);},
  wall_crack:(u,t,lt)=>{mood('golden');const k=easeIn(lt/1.4)*1.3;crackState(k,t);const P=place('giant',165-lt*6,0,0,-Math.PI/2);BH.animate(P,t*0.4,{motion:'walk',expr:'default',blend:0.01,face:false});face(P,'default');P.armR.rotation.x=-1.4;
    camAt(V3(96,6,lerp(18,14,u)),V3(140,24,0),56);shake(0.25,t);showOnly(['giant']);},
  giant_enter:(u,t)=>{mood('golden');crackState(1.3,t);const x=lerp(120,60,u);giantWalk('giant',x,0,-Math.PI/2,t);const f=chars.giant.position;dust(V3(f.x,0,f.z),(t*0.45%1));camAt(V3(lerp(20,24,u),1.2,-2.5),V3(x,20,0),56);shake(0.2,t);showOnly(['giant']);},
  rooftops_swing:(u,t)=>{mood('golden');for(let i=0;i<4;i++)swing('sc'+i,V3(-14+i*10,22,-8+(i%2)*6),10,lerp(-0.4,1.2,easeOut(u))-(i*0.15),V3(0.2,0,1),t,'shocked');S.overlay='speed';camAt(V3(0,5,24),V3(0,13,-2),54);showOnly(['sc0','sc1','sc2','sc3']);},
  somi_ground:(u,t)=>{mood('golden');const P=place('somi',2,0,10,Math.PI*0.6);reset(P);face(P,'shocked');P.legL.rotation.x=-1.4;P.legR.rotation.x=-1.4;P.torso.position.y=-1.6;P.armL.rotation.x=-0.4;
    const r=world.ropes.somi;setRope(r,chars.somi.localToWorld(V3(1.5,2.6,0)),chars.somi.localToWorld(V3(5,0.3,2)));camAt(V3(9,3.2,8.5),V3(2,2.6,10),46);showOnly(['somi']);},
  line_snap:(u,t,lt)=>{mood('golden');const a=V3(0,10,0),b=V3(0,0,0);const r=world.ropes.sc0;const k=lt>0.35?1:0;setRope(r,V3(0,6,0),V3(0,6+lerp(4,0.5,k?1:0),0));
    const r2=world.ropes.sc1;setRope(r2,V3(0.05,6.2+k*(lt-0.35)*-4,0),V3(0.1,5.4+k*(lt-0.35)*-6,0));camAt(V3(0,6.4,lerp(3,2.4,u)),V3(0,6.6,0),40);showOnly([]);world.snapAt=k?lt:null;},
  giant_smile_somi:(u,t)=>{mood('golden');crackState(1.3,t);const G=place('giant',SQ.x+14,0,SQ.z-2,-Math.PI/2-0.3);reset(G);face(G,'default');G.head.rotation.x=0.35;G.armR.rotation.x=-0.5;const P=place('somi',2,0,10,Math.PI*0.6);reset(P);face(P,'shocked');P.legL.rotation.x=-1.4;P.legR.rotation.x=-1.4;P.torso.position.y=-1.6;
    const hp=head('giant');camAt(V3(-1,3,13),hp.clone().add(V3(0,-2,0)),46);showOnly(['giant','somi']);},
  scouts_frozen:(u,t)=>{mood('golden');HOUSES.slice(0,4).forEach((h,i)=>{const p=h.roofTop;const P=place('sc'+i,p.x,p.y,p.z,h.g.rotation.y);reset(P);face(P,'shocked');});const p=HOUSES[1].roofTop;camAt(V3(0,9,0),p.clone().add(V3(0,4,0)),50);showOnly(['sc0','sc1','sc2','sc3']);},
  zash_tower_look:(u,t)=>{mood('golden');const P=place('leo',-4,0,-9,Math.PI);reset(P);face(P,'shocked');P.head.rotation.x=-0.35;camAt(V3(-3,4.6,-3),V3(-1.5,11,-24),60);showOnly(['leo']);},
  stairs_run:(u,t,lt)=>{mood('indoor');stairShot(lerp(2,20,u),t,'shocked',false);},
  stairs_dizzy:(u,t,lt)=>{mood('indoor');const g=world.stairs.position;camAt(V3(g.x+0.1,lerp(55,57,u),g.z+1.2),V3(g.x,0,g.z),lerp(70,58,u));cam.rotation.z+=t*0.4;showOnly([]);},
  stairs_legs:(u,t)=>{mood('indoor');stairShot(36+u*4,t,'sad',true);},
  stairs_top:(u,t)=>{mood('indoor');stairShot(64+u*6,t,'angry',false);},
  zash_think_tower:(u,t)=>{mood('golden');crackState(1.3,t);const G=place('giant',SQ.x,0,SQ.z,-Math.PI*0.75);reset(G);face(G,'default');const T=world.towerTop;const P=place('leo',T.x+1,T.y+0.5,T.z+3,Math.PI*0.85);reset(P);face(P,'default');P.head.rotation.x=0.4;
    const hp=head('leo');camAt(hp.clone().add(V3(1.7,0.3,-3.4)),hp.clone().add(V3(0,-0.4,0)),40);showOnly(['leo','giant']);},
  bell_hit:(u,t,lt)=>{mood('golden');const T=world.towerTop;const P=place('leo',T.x-2.6,T.y+0.5,T.z+1.2,Math.PI/2);reset(P);face(P,'angry');const k=easeOut((lt-0.15)/0.18);P.armR.rotation.x=lerp(-2.8,-1.2,k);P.armL.rotation.x=lerp(-2.8,-1.2,k);bellSwing(lt>0.3?Math.sin((lt-0.3)*6)*0.5*Math.exp(-(lt-0.3)):0);
    camAt(V3(T.x-13,T.y+5,T.z+3),V3(T.x-1,T.y+5,T.z+0.5),42);showOnly(['leo']);if(lt>0.3&&lt<0.42)S.flash=0.5;},
  bell_shockwave:(u,t,lt)=>{mood('golden');crackState(1.3,t);bellSwing(Math.sin(t*6)*0.4);const b=world.bell.getWorldPosition(V3());world.waves.forEach((w,i)=>{const k=((lt*0.9+i*0.33)%1);w.visible=true;w.position.copy(b);w.scale.setScalar(2+k*60);w.material.opacity=(1-k)*0.6;w.rotation.x=Math.PI/2;});
    const G=place('giant',SQ.x,0,SQ.z,-Math.PI*0.75);reset(G);face(G,'shocked');camAt(V3(50,30,40),V3(4,22,-10),50);showOnly(['giant']);},
  giant_turn:(u,t)=>{mood('golden');crackState(1.3,t);const G=place('giant',SQ.x,0,SQ.z,-Math.PI*0.75+u*Math.PI*1.4);BH.animate(G,t*0.5,{motion:'walk',expr:'shocked',blend:0.01,face:false});face(G,'shocked');G.head.rotation.y=Math.sin(t*3)*0.4;
    camAt(V3(-30,9,42),V3(SQ.x,17,SQ.z),50);shake(0.15,t);showOnly(['giant']);},
  giant_confused:(u,t)=>{mood('golden');const G=place('giant',SQ.x,0,SQ.z,-Math.PI*0.2);reset(G);face(G,'shocked');G.head.rotation.y=Math.sin(t*2.2)*0.6;G.head.rotation.z=Math.sin(t*1.3)*0.15;const hp=head('giant');camAt(hp.clone().add(V3(10,-3,22)),hp,40);showOnly(['giant']);},
  zash_above:(u,t)=>{mood('golden');const T=world.towerTop;const P=place('leo',T.x+1.6,T.y+0.5,T.z+4.4,0.4);reset(P);face(P,'smug');const G=place('giant',SQ.x,0,SQ.z,-Math.PI*0.2+Math.sin(t)*0.5);reset(G);face(G,'shocked');G.head.rotation.y=Math.sin(t*2)*0.5;
    camAt(V3(T.x-1.8,T.y+3.8,T.z+1.2),V3(SQ.x,26,SQ.z),54);showOnly(['leo','giant']);},
  overhead:(u,t)=>{mood('golden');const T=world.towerTop;const P=place('leo',T.x+1,T.y+0.5,T.z+4,0.4);reset(P);face(P,'smug');const G=place('giant',SQ.x,0,SQ.z,-Math.PI*0.2+Math.sin(t)*0.5);reset(G);face(G,'shocked');
    camAt(V3(T.x+2,lerp(80,72,u),T.z+18),V3(T.x+3,0,T.z+16),50);cam.rotation.z=0.4;showOnly(['leo','giant']);},
  somi_run:(u,t)=>{mood('golden');const P=place('somi',lerp(2,-10,u),0,lerp(10,14,u),-Math.PI/2+0.2);BH.animate(P,t*1.5,{motion:'walk',expr:'shocked',blend:0.01,face:false});face(P,'shocked');camAt(V3(-18,3,20),V3(chars.somi.position.x,3,12),44);showOnly(['somi']);},
  zash_jump:(u,t,lt)=>{mood('golden');const T=world.towerTop;const k=easeIn(lt/0.9);const P=place('leo',T.x+lerp(1,3,k),T.y+0.5+lerp(0,3,Math.sin(k*Math.PI))-k*6,T.z+lerp(4,9,k),0.4);reset(P);face(P,'shocked');P.armR.rotation.x=-2.8;P.armL.rotation.x=-2.2;P.legL.rotation.x=-0.6;
    camAt(V3(T.x-8,T.y+3,T.z+14),V3(T.x+2,T.y+1,T.z+6),50);S.overlay='speed';showOnly(['leo']);},
  swing_slowmo:(u,t)=>{mood('golden');const A=V3(-2,40,-10);const th=lerp(-0.5,0.2,u);swing('leo',A,22,th,V3(0,0,1),t*0.4,'happy');const hp=head('leo');camAt(hp.clone().add(V3(4,0.5,4)),hp,42);S.overlay='speed';showOnly(['leo','giant']);
    const G=place('giant',SQ.x,0,SQ.z,-Math.PI*0.2);reset(G);face(G,'shocked');},
  swing_wide:(u,t)=>{mood('golden');const A=V3(-2,40,-10);const th=lerp(-0.2,1.0,ease(u));swing('leo',A,22,th,V3(0,0,1),t,'happy');const G=place('giant',SQ.x,0,SQ.z,-Math.PI*0.2+Math.sin(t)*0.4);reset(G);face(G,'shocked');G.head.rotation.y=Math.sin(t*2)*0.5;
    camAt(V3(-46,14,30),V3(0,18,4),52);S.overlay='speed';showOnly(['leo','giant']);},
  land_face:(u,t,lt)=>{mood('golden');const k=easeIn(lt/0.35);const P=place('leo',-9,lerp(6,0,k),13,Math.PI/2);reset(P);face(P,lt<0.35?'happy':'shocked');chars.leo.rotation.x=lerp(0,Math.PI/2*0.95,k);chars.leo.position.y+=k*0.5;
    const S2=place('somi',-12,0,15.5,0.5);reset(S2);face(S2,'shocked');if(lt>0.35&&lt<0.5)shake(0.3,t);camAt(V3(-4,3.4,22),V3(-10,1.6,14),46);showOnly(['leo','somi']);},
  somi_smile:(u,t)=>{mood('golden');const P=place('somi',-12,0,15.5,0.6);reset(P);BH.animate(P,t,{motion:'talk',expr:'happy',talkMouth:false});mouth(P,'somi',t,'happy');P.armL.rotation.x=-0.3;const hp=head('somi');camAt(hp.clone().add(V3(2.2,0.1,3.6)),hp.clone().add(V3(0,-0.25,0)),38);showOnly(['somi']);},
  zash_proud:(u,t)=>{mood('golden');const P=place('leo',-9.5,0,13,-Math.PI*0.6);reset(P);P.armL.rotation.z=-0.7;P.armR.rotation.z=0.7;P.armL.rotation.x=-0.25;P.armR.rotation.x=-0.25;mouth(P,'zash',t,'smug');const hp=head('leo');camAt(hp.clone().add(V3(-3.4,0.0,1.6)),hp.clone().add(V3(0,-0.3,0)),38);showOnly(['leo']);},
  dad_door_wall:(u,t)=>{mood('dusk');const h=HOUSES[2];const b=h.g.localToWorld(V3(0,8.6,5.6));const D=place('dad',b.x,b.y,b.z,h.g.rotation.y);reset(D);face(D,'sad');D.armR.rotation.x=-1.1;const Z=place('leo',...h.g.localToWorld(V3(0.9,8.6,7.4)).toArray(),h.g.rotation.y+Math.PI-0.4);reset(Z);face(Z,'sad');
    world.launcher.visible=true;world.launcher.position.copy(D.armR.localToWorld(V3(0,-2.1,0.5)));world.launcher.rotation.y=h.g.rotation.y;camAt(h.g.localToWorld(V3(-7,12,11)),h.g.localToWorld(V3(0.4,12.4,6.4)),40);showOnly(['dad','leo']);},
  hook_gift:(u,t)=>{mood('dusk');const h=HOUSES[2];const b=h.g.localToWorld(V3(0,8.6,5.6));const D=place('dad',b.x,b.y,b.z,h.g.rotation.y);reset(D);D.armR.rotation.x=-1.1;const Z=place('leo',...h.g.localToWorld(V3(0,8.6,7.6)).toArray(),h.g.rotation.y+Math.PI);reset(Z);Z.armL.rotation.x=-1.1;Z.armR.rotation.x=-1.1;
    world.launcher.visible=true;const lp=D.armR.localToWorld(V3(0,-2.1,0.5));world.launcher.position.copy(lp);world.launcher.rotation.y=h.g.rotation.y;camAt(lp.clone().add(h.g.localToWorld(V3(2.4,1.2,1.4)).sub(h.g.position)),lp,40);showOnly(['dad','leo']);},
  giant_leave:(u,t)=>{mood('dusk');crackState(1.3,t);const x=lerp(70,128,u);giantWalk('giant',x,0,Math.PI/2,t);camAt(V3(20,30,-30),V3(x,16,0),48);showOnly(['giant']);},
  giant_stop:(u,t)=>{mood('dusk');crackState(1.3,t);const G=place('giant',132,0,0,Math.PI/2);reset(G);face(G,'default');camAt(V3(80,8,10),V3(132,20,0),46);showOnly(['giant']);},
  giant_lookup:(u,t,lt)=>{mood('dusk');crackState(1.3,t);const G=place('giant',132,0,0,Math.PI/2-ease(lt/1.0)*Math.PI*0.88);reset(G);face(G,'default');G.head.rotation.x=-ease((lt-0.8)/1.4)*0.75;const hp=head('giant');camAt(hp.clone().add(V3(-24,-8,6)),hp,36);showOnly(['giant']);},
  zash_eyes_twist:(u,t)=>{mood('dusk');const T=world.towerTop;const h=HOUSES[2];const b=h.g.localToWorld(V3(0,8.6,5.9));const P=place('leo',b.x,b.y,b.z,h.g.rotation.y);reset(P);face(P,'shocked');const hp=head('leo');camAt(hp.clone().add(h.g.localToWorld(V3(0,0,3.4)).sub(h.g.position)).add(V3(0,0.1,0)),hp.clone().add(V3(0,-0.1,0)),34);showOnly(['leo']);},
  giant_smile_wide:(u,t)=>{mood('dusk');crackState(1.3,t);const G=place('giant',132,0,0,-Math.PI*0.38);reset(G);G.setFace('happy');G.head.rotation.x=-0.75;const hp=head('giant');camAt(hp.clone().add(V3(-lerp(22,14,ease(u)),-3,lerp(8,5,u))),hp.clone().add(V3(0,-1,0)),34);showOnly(['giant']);},
  zash_confused_balcony:(u,t)=>{mood('dusk');const h=HOUSES[2];const b=h.g.localToWorld(V3(0,8.6,5.9));const P=place('leo',b.x,b.y,b.z,h.g.rotation.y);reset(P);P.setFace('sad');P.head.rotation.z=0.18;P.head.rotation.y=Math.sin(t*0.8)*0.2;P.armR.rotation.x=-1.3;P.armR.rotation.z=0.5;
    const f=h.g.localToWorld(V3(lerp(4,3,u),12.6,lerp(13,11,ease(u))));camAt(f,b.clone().add(V3(0,4.4,0)),40);showOnly(['leo']);},
  zash_confused_close:(u,t)=>{mood('dusk');const h=HOUSES[2];const b=h.g.localToWorld(V3(0,8.6,5.9));const P=place('leo',b.x,b.y,b.z,h.g.rotation.y);reset(P);P.setFace(u<0.5?'shocked':'sad');P.head.rotation.z=-0.15;
    const hp=head('leo');camAt(hp.clone().add(h.g.localToWorld(V3(0.4,0,lerp(3.4,2.6,ease(u)))).sub(h.g.position)).add(V3(0,0.15,0)),hp.clone().add(V3(0,-0.1,0)),34);showOnly(['leo']);},
  endcard:(u,t,lt)=>{mood('dusk');camAt(V3(lerp(-150,-130,u),110,150),V3(0,10,-10),46);showOnly([]);S.endcard=clamp((lt-0.3)/0.4,0,1);S.fade=clamp((lt-0.1)/0.5,0,0.55);},
};
function ringShot(lt,n){bellSwing(Math.sin(lt*7)*0.45*Math.exp(-lt*0.8));const b=world.bell.getWorldPosition(V3());const v=[[V3(9,-4,10),40],[V3(-6,-6,12),36],[V3(3,-1,6),32]][n||0];camAt(b.clone().add(v[0]),b.clone().add(V3(0,-1.6,0)),v[1]);if(lt<0.08)S.flash=0.3;if(n===2)shake(0.15,lt*10);showOnly([]);}
function stairShot(step,t,expr,tired){const g=world.stairs.position;const a=step*0.32;const P=place('leo',g.x+Math.cos(a)*3.3,step*0.36+0.2,g.z+Math.sin(a)*3.3,-a);BH.animate(P,t*(tired?0.6:1.4),{motion:'walk',expr,blend:0.01,face:false});face(P,expr);if(tired){P.torso.rotation.x=0.35;P.armL.rotation.x=-0.8;P.armR.rotation.x=-0.8;}
  const ca=a-0.9;camAt(V3(g.x+Math.cos(ca)*4.6,step*0.36+5.5,g.z+Math.sin(ca)*4.6),chars.leo.position.clone().add(V3(0,3.5,0)),56);showOnly(['leo']);}

/* ------------------------------------------------------------ captions + overlays */
function captionAt(t){for(const s of TL.segs){for(let i=0;i<s.words.length;i++){const w=s.words[i];const nx=s.words[i+1];const end=nx?nx.s:Math.min(w.e+0.25,s.end+0.25);if(t>=w.s&&t<end)return {w,since:t-w.s};}}return null;}
function drawCaption(t){const c=captionAt(t);if(!c)return;const text=c.w.w.toUpperCase();const base=W*0.118*(text.length>8?8/text.length*1.05:1);
  const k=c.since<0.04?lerp(1,1.08,c.since/0.04):c.since<0.08?lerp(1.08,1,(c.since-0.04)/0.04):1;
  og.save();og.translate(W/2,H*0.42);og.scale(k,k);og.font=`${base}px "Luckiest Guy", Impact, sans-serif`;og.textAlign='center';og.textBaseline='middle';og.lineJoin='round';
  og.shadowColor='rgba(0,0,0,0.55)';og.shadowBlur=base*0.25;og.shadowOffsetY=base*0.06;og.lineWidth=base*0.2;og.strokeStyle='#0d0d12';og.strokeText(text,0,0);og.shadowColor='transparent';
  og.fillStyle=c.w.red?'#ff3b3b':'#ffffff';og.fillText(text,0,0);og.restore();}
function drawOverlays(t){
  const vg=og.createRadialGradient(W/2,H/2,H*0.34,W/2,H/2,H*0.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.42)');og.fillStyle=vg;og.fillRect(0,0,W,H);
  if(S.overlay==='speed'){og.save();const r=rng('sp'+Math.floor(t*15));og.strokeStyle='rgba(255,255,255,0.55)';for(let i=0;i<46;i++){const a=r()*Math.PI*2,r0=H*(0.32+r()*0.15),r1=H*(0.75+r()*0.3);og.lineWidth=1+r()*4;og.beginPath();og.moveTo(W/2+Math.cos(a)*r0,H/2+Math.sin(a)*r0);og.lineTo(W/2+Math.cos(a)*r1,H/2+Math.sin(a)*r1);og.stroke();}og.restore();}
  if(world.snapAt!=null){const k=1-clamp(world.snapAt/0.25,0,1);if(k>0){og.fillStyle=`rgba(255,255,255,${k*0.6})`;og.fillRect(0,0,W,H);}}
  if(S.flash>0){og.fillStyle=`rgba(255,250,235,${S.flash})`;og.fillRect(0,0,W,H);}
  if(S.fade>0){og.fillStyle=`rgba(0,0,0,${S.fade})`;og.fillRect(0,0,W,H);}
  if(S.endcard>0){og.save();og.globalAlpha=S.endcard;og.textAlign='center';og.textBaseline='middle';og.lineJoin='round';
    og.font=`${W*0.13}px "Luckiest Guy", Impact`;og.lineWidth=W*0.022;og.strokeStyle='#0d0d12';og.strokeText('BLOCKHEADS',W/2,H*0.62);og.fillStyle='#ffd23f';og.fillText('BLOCKHEADS',W/2,H*0.62);
    og.font=`${W*0.058}px "Luckiest Guy", Impact`;og.lineWidth=W*0.014;og.font=`${W*0.085}px "Luckiest Guy", Impact`;og.lineWidth=W*0.018;og.strokeText('FOLLOW FOR PART 2',W/2,H*0.71);og.fillStyle='#ffffff';og.fillText('FOLLOW FOR PART 2',W/2,H*0.71);og.restore();}
  og.globalAlpha=0.04;og.drawImage(S.grain,(Math.random()*64)|0,(Math.random()*64)|0);og.globalAlpha=1;}

/* ------------------------------------------------------------ entry points */
S.init=async function(timeline,w,h,fontUrl){TL=timeline;W=w;H=h;
  const ff=new FontFace('Luckiest Guy',`url(${fontUrl})`);await ff.load();document.fonts.add(ff);
  R=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});R.setSize(W,H);R.setPixelRatio(1);R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.05;
  cam=new THREE.PerspectiveCamera(40,W/H,0.1,2000);
  buildWorld();buildChars();
  const [oc,o2]=cv(W,H);out=oc;og=o2;const [gc,gg]=cv(W+64,H+64);const id=gg.createImageData(W+64,H+64);for(let i=0;i<id.data.length;i+=4){const v=Math.random()*255;id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=255;}gg.putImageData(id,0,0);S.grain=gc;
  return true;};
S.frame=function(f,q){const t=f/TL.fps;const shot=TL.shots.find(s=>t>=s.s&&t<s.e)||TL.shots[TL.shots.length-1];
  S.overlay=null;S.flash=0;S.fade=0;S.endcard=0;world.snapAt=null;world.fill.intensity=0;scene.fog.near=80;
  hideRopes();world.crate.visible=false;world.bird.visible=false;world.launcher.visible=false;world.waves.forEach(w=>w.visible=false);world.dust.forEach(d=>d.material.opacity=0);if(world.stool)world.stool.visible=false;crackState(0,t);
  if(shot!==curShot){curShot=shot;showOnly([]);Object.values(chars).forEach(c=>{c.rotation.set(0,0,0);});}
  const u=(t-shot.s)/(shot.e-shot.s), lt=t-shot.s;
  scene.updateMatrixWorld(true);
  (SH[shot.name]||SH.tall_houses)(u,t,lt);
  world.clouds.forEach((c,i)=>c.position.x+=Math.sin(i)*0.02);
  R.render(scene,cam);og.drawImage(R.domElement,0,0);drawOverlays(t);drawCaption(t);
  return out.toDataURL('image/jpeg',q||0.9);};
})();
