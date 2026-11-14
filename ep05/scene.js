/* Episode 5 "Screen Time": every hour on your phone ages you one day. HQ renderer (supersampling, soft shadows, bloom, grade).
   Entry points: SAMPLE.init(timeline, W, H, fontUrl), SAMPLE.frame(f) */
(function(){
const S=window.SAMPLE={};
let TL,W,H,R,scene,cam,out,og,world={},chars={},curShot=null,SS=1.5;
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const lerp=(a,b,t)=>a+(b-a)*t,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);},easeOut=t=>1-Math.pow(1-clamp(t,0,1),3),easeIn=t=>Math.pow(clamp(t,0,1),2);
const rnd=rng('screentime');
const FONT='"Luckiest Guy", Impact, sans-serif';
const HX=300,RX=1200,BX2=930,DX=1500,LX=1800,BENCH=V3(-12,0,12);

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
  const ct=canvasTex(256,128,(g)=>{for(let i=0;i<9;i++){const gr=g.createRadialGradient(40+i*22,70-(i%3)*10,0,40+i*22,70-(i%3)*10,44);gr.addColorStop(0,'rgba(255,255,255,0.95)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,256,128);}});
  for(let i=0;i<18;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:ct,transparent:true,depthWrite:false,fog:false,opacity:0.85}));const a=rnd()*6.28,d=260+rnd()*260;s.position.set(Math.cos(a)*d,90+rnd()*100,Math.sin(a)*d);s.scale.set(140+rnd()*100,56+rnd()*30,1);scene.add(s);}
  // ---- park / school yard
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
  const tg=new THREE.SphereGeometry(3.2,10,8);tg.translate(0,7.5,0);const tk=new THREE.CylinderGeometry(0.5,0.7,5,6);tk.translate(0,2.5,0);
  const tm=new THREE.InstancedMesh(tg,SM({color:0x4f8a3e,roughness:1}),30),km=new THREE.InstancedMesh(tk,SM({color:0x6a4a30,roughness:1}),30);tm.castShadow=km.castShadow=true;const m4=new THREE.Matrix4(),q=new THREE.Quaternion();
  for(let i=0;i<30;i++){let x,z;if(i<12){x=(i%2?-1:1)*(18+rnd()*26);z=-14+rnd()*50;}else{x=(rnd()-0.5)*240;z=46+rnd()*14;}const s=0.8+rnd()*0.6;m4.compose(V3(x,0,z),q,V3(s,s,s));tm.setMatrixAt(i,m4);km.setMatrixAt(i,m4);}scene.add(tm);scene.add(km);
  // bench
  const bw=SM({map:plankTex('#9a6a3a'),roughness:0.8}),bm=METAL('#3a3d46',0.5);const bench=new THREE.Group();bench.position.copy(BENCH);scene.add(bench);
  const seat=cst(new THREE.Mesh(new THREE.BoxGeometry(8,0.3,1.8),bw));seat.position.y=1.6;bench.add(seat);const back=cst(new THREE.Mesh(new THREE.BoxGeometry(8,1.6,0.25),bw));back.position.set(0,2.8,-0.85);bench.add(back);
  [-3.4,3.4].forEach(x=>{const l=cst(new THREE.Mesh(new THREE.BoxGeometry(0.3,1.6,1.6),bm));l.position.set(x,0.8,0);bench.add(l);});
  // flying phone + phone screen glow lights
  world.phoneLight=new THREE.PointLight(0x7ab8ff,0,6,1.6);scene.add(world.phoneLight);world.phoneLight2=new THREE.PointLight(0x7ab8ff,0,6,1.6);scene.add(world.phoneLight2);
  world.flyPhone=makePhone();scene.add(world.flyPhone);world.flyPhone.visible=false;
  world.roomLights=[];
  buildHall();buildRoom();buildBath();buildDining();buildLibrary();
}
function makePhone(){const g=new THREE.Group();const b=rbox(0.5,0.92,0.07,0.06,MAT('#16171c',0.3));g.add(b);const scr=new THREE.Mesh(new THREE.PlaneGeometry(0.42,0.82),new THREE.MeshBasicMaterial({map:world.appTex||(world.appTex=appTex()),toneMapped:false}));scr.position.z=0.04;g.add(scr);g.userData.scr=scr;return g;}
function appTex(){return canvasTex(128,256,(g)=>{const gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#ff4a8a');gr.addColorStop(0.5,'#7a5aff');gr.addColorStop(1,'#2ac8ff');g.fillStyle=gr;g.fillRect(0,0,128,256);g.fillStyle='rgba(255,255,255,0.85)';g.beginPath();g.moveTo(52,108);g.lineTo(80,128);g.lineTo(52,148);g.fill();for(let i=0;i<3;i++){g.beginPath();g.arc(112,150+i*28,7,0,7);g.fill();}g.fillRect(10,220,70,8);g.fillRect(10,234,50,6);});}
function roomBox(x,w,h,d,wallMap,floorMap,lightCol){const g=new THREE.Group();g.position.set(x,0,0);scene.add(g);
  const r=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),SM({map:wallMap,roughness:0.95,side:THREE.BackSide}));r.position.y=h/2;r.receiveShadow=true;g.add(r);
  const f=rcv(new THREE.Mesh(new THREE.PlaneGeometry(w,d),SM({map:floorMap,roughness:0.7})));f.rotation.x=-Math.PI/2;f.position.y=0.03;g.add(f);
  const L=new THREE.PointLight(lightCol||0xfff0d8,0.9,Math.max(w,d)*1.6,1.3);L.position.set(0,h-1.5,0);g.add(L);world.roomLights.push(L);g.userData.L=L;return g;}
function buildHall(){const ft=tileTex('#e8e2d4','#c8d0dc');ft.wrapS=ft.wrapT=THREE.RepeatWrapping;ft.repeat.set(3,15);
  const g=world.hall=roomBox(HX,12,9,64,hatTex('#e6dcc8','cotton'),ft);const lg=new THREE.BoxGeometry(0.8,5.4,1.4);const lm=new THREE.InstancedMesh(lg,SM({roughness:0.5,metalness:0.3}),84);const m4=new THREE.Matrix4(),col=new THREE.Color();let k=0;
  for(const s of [-1,1])for(let i=0;i<42;i++){m4.makeTranslation(s*5.55,2.7,-30+i*1.45);lm.setMatrixAt(k,m4);col.set(['#3a6ea8','#3464a0','#4278b4'][i%3]).convertSRGBToLinear();lm.setColorAt(k,col);k++;}g.add(lm);
  const pst=new THREE.Mesh(new THREE.PlaneGeometry(1.6,2),new THREE.MeshBasicMaterial({map:signTex('NO PHONES','#c0392b','#fff8dc',300,380,58,'save your youth')}));pst.position.set(-5.12,4.2,-2);pst.rotation.y=Math.PI/2;g.add(pst);
  for(let i=0;i<5;i++){const L=new THREE.Mesh(new THREE.BoxGeometry(2,0.15,5),new THREE.MeshBasicMaterial({color:0xfffbe8}));L.position.set(0,8.9,-26+i*13);g.add(L);}}
function buildRoom(){const g=world.room=roomBox(RX,14,8,14,hatTex('#5a6a8a','cotton'),plankTex('#8a6a4a'),0xfff0d8);
  const bed=new THREE.Group();bed.position.set(-4,0,-3.5);g.add(bed);const fr=cst(rbox(4.2,1,7,0.1,MAT('#e8e2d4',0.6)));fr.position.y=0.5;bed.add(fr);const mt=cst(rbox(4,0.6,6.6,0.2,MAT('#f4f2ee',0.9)));mt.position.y=1.25;bed.add(mt);
  const pil=cst(rbox(2.6,0.5,1.2,0.25,MAT('#ffffff',0.9)));pil.position.set(0,1.75,-2.6);bed.add(pil);const bl=cst(rbox(4.1,0.4,4.2,0.18,SM({map:hatTex('#d9a23a','knit'),roughness:0.95})));bl.position.set(0,1.65,1.0);bed.add(bl);
  const desk=cst(rbox(5,0.25,2,0.05,SM({map:plankTex('#6a4a32')})));desk.position.set(4,2.4,-5.8);g.add(desk);
  const post=new THREE.Mesh(new THREE.PlaneGeometry(2.4,3.2),new THREE.MeshBasicMaterial({map:signTex('7 DAYS','#ffd23f','#15161c',300,400,72,'no phone')}));post.position.set(0,5,-6.95);g.add(post);
  const win=new THREE.Mesh(new THREE.PlaneGeometry(3.6,2.6),new THREE.MeshBasicMaterial({color:0xbfe0ff}));win.position.set(4,5.2,-6.96);g.add(win);}
function buildBath(){const g=world.bath=roomBox(BX2,10,9,10,tileTex('#dfeef0','#c8e0e4'),tileTex('#f2f6f6','#d8e4e6'),0xeaf6ff);
  const mf=new THREE.Mesh(new THREE.BoxGeometry(4.4,4.8,0.1),SM({color:0xf2f2f2}));mf.position.set(0,5,-4.99);g.add(mf);const mir=new THREE.Mesh(new THREE.PlaneGeometry(4,4.4),SM({color:0xbfe0f0,metalness:0.9,roughness:0.08}));mir.position.set(0,5,-4.93);g.add(mir);
  const sink=cst(new THREE.Mesh(new THREE.BoxGeometry(4,0.5,1.6),SM({color:0xffffff,roughness:0.2})));sink.position.set(0,2.4,-4.2);g.add(sink);}
function buildDining(){const g=world.din=roomBox(DX,16,9,14,hatTex('#e8d8b8','cotton'),plankTex('#8a5a3a'),0xffe4bc);
  const tb=cst(rbox(7,0.3,3.6,0.08,SM({map:plankTex('#6a4428'),roughness:0.6})));tb.position.set(0,2.5,0);g.add(tb);[[-3.2,-1.5],[3.2,-1.5],[-3.2,1.5],[3.2,1.5]].forEach(([x,z])=>{const l=cst(new THREE.Mesh(new THREE.BoxGeometry(0.3,2.4,0.3),SM({color:0x5a3a22})));l.position.set(x,1.2,z);g.add(l);});
  const cloth=rcv(new THREE.Mesh(new THREE.PlaneGeometry(6,3),SM({map:hatTex('#c0392b','cotton','dots'),roughness:0.9})));cloth.rotation.x=-Math.PI/2;cloth.position.set(0,2.67,0);g.add(cloth);
  [[-1.8,0],[0,0.2],[1.8,0]].forEach(([x,z],i)=>{const p=cst(new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.5,0.12,18),SM({color:0xffffff,roughness:0.3})));p.position.set(x,2.74,z);g.add(p);const f=cst(new THREE.Mesh(new THREE.SphereGeometry(0.32,10,8),SM({color:[0xd9a23a,0x5aa05a,0xc0392b][i],roughness:0.8})));f.scale.y=0.5;f.position.set(x,2.88,z);g.add(f);});
  const pot=cst(new THREE.Mesh(new THREE.CylinderGeometry(0.7,0.6,0.8,16),METAL('#c9ccd2',0.35)));pot.position.set(0,3.05,-0.9);g.add(pot);
  world.chairs=[];[[-2,-2.4,0],[2,-2.4,0],[-2,2.4,Math.PI],[2,2.4,Math.PI],[-4.6,0,Math.PI/2],[4.6,0,-Math.PI/2]].forEach(([x,z,r])=>{const c=new THREE.Group();c.position.set(x,0,z);c.rotation.y=r;const s=cst(new THREE.Mesh(new THREE.BoxGeometry(1.8,0.25,1.8),SM({color:0x7a4a2a})));s.position.y=1.6;c.add(s);const b=cst(new THREE.Mesh(new THREE.BoxGeometry(1.8,2.2,0.2),SM({color:0x7a4a2a})));b.position.set(0,2.8,-0.85);c.add(b);g.add(c);world.chairs.push(c);});
  const pic=new THREE.Mesh(new THREE.PlaneGeometry(3,2),new THREE.MeshBasicMaterial({map:signTex('HOME','#3a2a1c','#f6e6c8',300,200,90,'sweet home')}));pic.position.set(0,6,-6.95);pic.visible=false;g.add(pic);
  world.sandwich=(()=>{const s=new THREE.Group();[['#e8c88a',0],['#5aa05a',0.09],['#d84a4a',0.15],['#f2c040',0.21],['#e8c88a',0.3]].forEach(([c,y],i)=>{const m=cst(rbox(i%4===0?0.9:0.95,i%4===0?0.12:0.06,0.9,0.03,MAT(c,0.9)));m.position.y=y;s.add(m);});return s;})();}
function buildLibrary(){const g=world.lib=roomBox(LX,18,10,16,hatTex('#6a4a3a','wool'),plankTex('#5a3a22'),0xffe0b0);
  const N=480;const bg=new THREE.BoxGeometry(0.32,1.1,0.9);const bk=new THREE.InstancedMesh(bg,SM({roughness:0.8}),N);const m4=new THREE.Matrix4(),col=new THREE.Color();const r=rng('books');let k=0;
  for(let sh=0;sh<4;sh++)for(let i=0;i<120&&k<N;i++){const x=-8+i*0.135*1+((i/40|0)*0);const xx=-8+(i%60)*0.27,y=1.2+sh*1.7+0.55,z=i<60?-7.4:-7.4;const hh=0.8+r()*0.4;m4.compose(V3(xx,y-(1.1-hh)/2,z),new THREE.Quaternion(),V3(1,hh/1.1,1));bk.setMatrixAt(k,m4);col.set(['#8a2a2a','#2a4a6a','#3a6a3a','#c8a040','#5a3a6a','#a85a2a'][Math.floor(r()*6)]).convertSRGBToLinear();bk.setColorAt(k,col);k++;}
  g.add(bk);for(let sh=0;sh<5;sh++){const p=cst(new THREE.Mesh(new THREE.BoxGeometry(17,0.15,1.2),SM({map:plankTex('#4a2a18')})));p.position.set(0,1.15+sh*1.7,-7.4);g.add(p);}
  const desk=cst(rbox(7,2.6,2.2,0.08,SM({map:plankTex('#7a4a2a'),roughness:0.6})));desk.position.set(0,1.3,-1);g.add(desk);
  const sg=new THREE.Mesh(new THREE.PlaneGeometry(5,1.1),new THREE.MeshBasicMaterial({map:signTex('QUIET PLEASE','#f6f0dc','#2a3a2a',500,110,70)}));sg.position.set(0,9,-7.9);g.add(sg);
  const stk=new THREE.Group();[['#2a4a6a',0],['#8a2a2a',0.22],['#c8a040',0.44]].forEach(([c,y])=>{const b=rbox(1.2,0.2,0.9,0.03,MAT(c,0.8));b.position.y=y;stk.add(b);});stk.position.set(-2.4,2.72,-1);g.add(stk);}

/* ---------------- characters */
function clone(id,nid,mod){const c=JSON.parse(JSON.stringify(BH.castById(id)));c.id=nid;if(mod)mod(c);return c;}
function hold(P,obj,side){(side==='L'?P.armL:P.armR).add(obj);obj.position.set(0,-2.15,0.25);obj.rotation.set(0,0,0);return obj;}
function buildChars(){
  const add=(id,spec,sc)=>{const g=buildChar(spec||BH.castById(id));if(sc)g.scale.setScalar(sc);scene.add(g);g.visible=false;chars[id]=g;return g;};
  add('zash',BH.castById('leo'));
  add('zkid',clone('leo','zkid',c=>{Object.assign(c.face,{eyes:'big',brows:'raised'});}),0.66);chars.zkid.userData.P.head.scale.setScalar(1.22);
  add('told',clone('tobi','told',c=>{c.hair.color='#d6d6d2';Object.assign(c.face,{eyes:'tired',brows:'bushy',browColor:'#e8e8e4',beard:'full',beardColor:'#dcdcd8',glasses:'round',glassColor:'#8a7a5a',mouth:'flat',age:'old'});c.extras=[];}));
  add('tkid',clone('tobi','tkid',c=>{Object.assign(c.face,{eyes:'big',brows:'raised',mouth:'grin'});c.extras=[];}),0.66);chars.tkid.userData.P.head.scale.setScalar(1.2);
  add('lib',{id:'lib',name:'Librarian',skin:'#f0cba8',hair:{style:'slick',color:'#6a4a2a'},face:{eyes:'big',eyeColor:'#4a3a22',brows:'raised',mouth:'smile',glasses:'round',glassColor:'#2a2a2a',nose:'button',blush:true},
    torso:{inner:'#f1ede4',tie:{color:'#c0392b',style:'bow'},collar:true,outer:{style:'waistcoat',color:'#3a5a8a',btn:'#d4af37'}},sleeves:{color:'#f1ede4',len:'full'},pants:{color:'#5a4a3a',fabric:'wool',shoes:'#3a2416',shoeStyle:'dress'}},0.7);
  chars.lib.userData.P.head.scale.setScalar(1.18);
  ['somi','grimm','benny','mom','dad','max','mia','pixel','dex','nova'].forEach(id=>add(id));
  // props: phones in hands
  world.ph={};['zash','zkid','told','tkid','benny','mia','pixel','dex','nova'].forEach(id=>{const p=makePhone();hold(chars[id].userData.P,p);p.visible=false;world.ph[id]=p;});
  const cane=new THREE.Group();const m=SM({color:0x5a3b24,roughness:0.5});const s=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,2.2,10),m);s.position.y=-1.1;cane.add(s);const hd=new THREE.Mesh(new THREE.TorusGeometry(0.16,0.06,6,12,Math.PI),m);hd.position.set(0,0,0.16);hd.rotation.y=Math.PI/2;cane.add(hd);
  chars.told.userData.P.armL.add(cane);cane.position.set(0,-2.1,0.2);world.cane=cane;
  const mg=new THREE.Group();const ring=new THREE.Mesh(new THREE.TorusGeometry(0.42,0.07,8,24),METAL('#d4af37',0.3));mg.add(ring);const gl=new THREE.Mesh(new THREE.CircleGeometry(0.4,24),SM({color:0xbfe8ff,transparent:true,opacity:0.35,roughness:0.05}));mg.add(gl);const hn=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.8,8),SM({color:0x3a2416}));hn.position.y=-0.82;mg.add(hn);
  chars.grimm.userData.P.armR.add(mg);mg.position.set(0,-2.6,0.35);mg.rotation.x=Math.PI/2;world.mag=mg;
  const book=new THREE.Group();const cv1=rbox(1.5,1.1,0.12,0.02,MAT('#2a5a8a',0.7));book.add(cv1);const pg=rbox(1.42,1.02,0.14,0.01,MAT('#f6f0dc',0.9));pg.position.z=0.02;book.add(pg);world.book=book;scene.add(book);book.visible=false;
  chars.zash.userData.P.armL.add(world.sandwich);world.sandwich.position.set(0,-2.2,0.3);world.sandwich.visible=false;
}
function showOnly(ids){Object.keys(chars).forEach(k=>chars[k].visible=ids.includes(k));}
function place(id,x,y,z,ry){const c=chars[id];c.position.set(x,y,z);c.rotation.set(0,ry||0,0);c.visible=true;return c.userData.P;}
function reset(P){['armL','armR','legL','legR','head'].forEach(k=>P[k].rotation.set(0,0,0));P.torso.rotation.set(0,0,0);P.torso.position.y=0;P._anim=null;P.armL.position.set(-1.5,4,0);P.armR.position.set(1.5,4,0);}
function st(id,x,y,z,ry,e){const P=place(id,x,y,z,ry);reset(P);if(e)P.setFace(e);return P;}
function mouth(P,who,t,e){const env=TL.mouth[who];const f=Math.round(t*TL.fps);const a=env?env[f]||0:0;P.setFace(e||P.expr||'default',{mouthOpen:a>0.12?Math.min(1,a*1.1):0});}
function walk(P,t,sp,e){BH.animate(P,t*(sp||1),{motion:'walk',blend:0.01,face:false});P.setFace(e||'default');}
function lw0(o,v){let r=o;while(r.parent&&r.parent!==scene)r=r.parent;r.updateMatrixWorld(true);return o.localToWorld(v);}
const head=id=>lw0(chars[id].userData.P.head,V3(0,0.6,0));
const faceCam=(id,x,y,d)=>lw0(chars[id].userData.P.head,V3(x,0.6+y,d));
function close(id,d,x,y,fov){const hp=head(id);const s=chars[id].scale.x;camAt(faceCam(id,x==null?0.5:x,y==null?0.05:y,(d||3.4)*1.75),hp.clone().add(V3(0,-0.05*s,0)),fov||36);}
/* phone in front of the chest, screen to the face */
function phoneUp(id,k,scroll,t){const P=chars[id].userData.P;const p=world.ph[id];p.visible=true;P.armR.rotation.set((id==='told'?-0.85:-1.25)*k,0,0.55*k);p.position.set(0.05,-2.2,0.12);p.rotation.set(-0.35,-0.5,0.15);if(scroll)P.armR.rotation.x+=Math.sin(t*9)*0.04;
  const L=world.phoneLight.intensity>0?world.phoneLight2:world.phoneLight;L.intensity=1.1;L.position.copy(lw0(p,V3(0,0,0.5)));return P;}
function slouchOld(P){P.torso.rotation.x=0.34;P.head.rotation.x=-0.12;P.legL.rotation.x=-0.12;P.legR.rotation.x=-0.12;}
function sit(id,x,y,z,ry,e){const P=st(id,x,y,z,ry,e);P.legL.rotation.x=-1.5;P.legR.rotation.x=-1.5;chars[id].position.y=y+1.6-2.0*chars[id].scale.x+0.15;return P;}

/* ---------------- look */
function sky(a,b,c){const [cc,g]=world.skyCanvas;const gr=g.createLinearGradient(0,0,0,512);gr.addColorStop(0,a);gr.addColorStop(0.6,b);gr.addColorStop(1,c);g.fillStyle=gr;g.fillRect(0,0,16,512);world.skyTex.needsUpdate=true;}
function mood(m){if(world.mood===m)return;world.mood=m;const M={day:['#3f86dc','#9ccaf4','#e8f2f8',0xdfeeff,0.85,0xfff2d8,1.25,[0.45,0.8,0.4],0.9],indoor:['#3f86dc','#9ccaf4','#e8f2f8',0xfff0e0,0.75,0xfff2d8,0.55,[0.3,0.9,0.5],0.95],
  night:['#05060c','#0a0c18','#101428',0x3a4a8a,0.22,0xffffff,0.0,[0.3,0.9,0.5],0.25],gold:['#3a5a9a','#f0a868','#ffd8a0',0xffd8b0,0.8,0xffb070,1.4,[-0.6,0.45,0.5],0.9]}[m];
  sky(M[0],M[1],M[2]);world.hemi.color.setHex(M[3]);world.hemi.intensity=M[4];world.sun.color.setHex(M[5]);world.sun.intensity=M[6];world.sunDir.set(...M[7]).normalize();world.roomLights.forEach(L=>L.intensity=M[8]);}
function camAt(p,l,fov){cam.position.copy(p);cam.lookAt(l);cam.fov=fov||40;cam.updateProjectionMatrix();world.look.copy(l);}
function shake(a,t){cam.position.x+=Math.sin(t*23.1)*a+Math.sin(t*41.7)*a*0.5;cam.position.y+=Math.cos(t*19.3)*a;}
const seg=id=>TL.segs.find(x=>x.id===id);
const wordT=(sid,w)=>{const s=seg(sid);const x=s&&s.words.find(q=>q.w.toLowerCase().replace(/[^a-z0-9]/g,'')===w);return x?x.s:(s?s.start:0);};
function day(n,col){S.tag={text:'DAY '+n,col:col||'#ffd23f'};}

/* ---------------- shots */
const SH={
  tobi_old_reveal:(u,t)=>{mood('day');const P=st('told',2,0,4,-0.25,'default');slouchOld(P);phoneUp('told',1,true,t);P.head.rotation.x=0.18;close('told',lerp(3.4,2.7,ease(u)),0.55,0.05,38);showOnly(['told']);S.tag={text:'AGE: 15',col:'#ffffff'};},
  phone_timer:(u,t)=>{mood('day');const P=st('zash',0,0,6,0.2,'default');phoneUp('zash',1,true,t);P.head.rotation.x=0.3;camAt(V3(2.2,6.4,10.5),V3(0.4,4.2,6),40);showOnly(['zash']);S.phoneUI={t:t,k:u};},
  age_tick:(u,t,lt)=>{mood('day');const P=st('zash',0,0,6,0.2,lt>0.6?'shocked':'default');phoneUp('zash',1,false,t);close('zash',lerp(3.6,3.0,ease(u)),0.3,0.1,36);showOnly(['zash']);S.ageTick=lt;},
  warning_box:(u,t)=>{mood('day');const P=st('zash',0,0,6,0.2,'default');phoneUp('zash',1,true,t);camAt(V3(2.2,6.4,12),V3(0.4,4.6,6),44);showOnly(['zash']);S.dim=0.45;S.warn=easeOut(u*4);S.capY=0.8;},
  teacher_check:(u,t)=>{mood('indoor');const B=st('benny',HX,0,-2,Math.PI/2,'shocked');const G=st('grimm',HX-2.6,0,-2.2,Math.PI/2+0.25,'angry');world.mag.visible=true;G.armR.rotation.set(-2.35+Math.sin(t*3)*0.05,0,0.25);G.torso.rotation.x=0.1;
    camAt(V3(HX-1.2+lerp(0.3,-0.3,u),5.4,lerp(9.5,8.5,u)),V3(HX-1.2,5.0,-2.1),44);showOnly(['benny','grimm']);S.tag={text:'GRAY HAIR CHECK',col:'#ffffff'};if(u>0.55)S.stamp={text:'2 GRAYS',t:(u-0.55)*4};},
  librarian:(u,t,lt)=>{mood('indoor');const P=st('lib',LX+0.6,0,-3.2,0,'happy');P.armR.rotation.x=-0.9-Math.abs(Math.sin(t*5))*0.3;P.armL.rotation.x=-0.6;chars.lib.position.y=0.9;
    const tw=wordT('lib','twelve');const fz=wordT('lib','forty');camAt(V3(LX+lerp(1.6,1.0,u),4.8,lerp(10,7,ease(u))),V3(LX+0.4,4.4,-3),40);showOnly(['lib']);
    const at=TL.shots.find(s=>s.name==='librarian').s+lt;if(at>=fz)S.tag={text:at>=tw?'LOOKS: 12':'AGE: 40',col:at>=tw?'#5ac88a':'#ffffff'};S.sparkle=0.4;},
  tobi_back:(u,t,lt)=>{mood('day');const P=st('told',2,0,4,0.5,'sad');slouchOld(P);P.torso.rotation.x=0.55;P.head.rotation.x=-0.3;P.armL.rotation.set(0.6,0,-0.3);P.armR.rotation.set(0.6,0,0.3);camAt(V3(2+lerp(12,11,u),4.6,4+lerp(6,5,u)),V3(2,3.6,4),40);showOnly(['told']);S.tag={text:'SCREEN TIME: 9H / DAY',col:'#ff6a6a'};if(lt>0.9)S.ow=lt-0.9;},
  tobi_cane:(u,t)=>{mood('day');const x=lerp(-1,2,u);const P=place('told',x,0,5,Math.PI/2-0.25);reset(P);walk(P,t,0.35,'default');slouchOld(P);phoneUp('told',1,true,t);P.armL.rotation.set(-0.35,0,0);world.cane.rotation.x=0.35;
    camAt(V3(x+9,4.8,10.5),V3(x+0.5,3.8,5),40);showOnly(['told']);S.tag={text:'RETIREMENT PLAN: READY',col:'#ffd23f'};},
  tobi_scroll:(u,t)=>{mood('day');const P=st('told',2,0,4,-0.3);slouchOld(P);phoneUp('told',1,true,t);P.head.rotation.x=0.05;mouth(P,'tobi',t,'default');close('told',lerp(4.2,3.6,u),0.6,0.0,38);showOnly(['told']);},
  tobi_beard:(u,t,lt)=>{mood('day');const P=st('tkid',2,0,4,-0.3,'happy');phoneUp('tkid',1,true,t);close('tkid',lerp(4.6,4.0,u),0.4,0.1,40);showOnly(['tkid']);S.sepia=1;S.tag={text:'5 YEARS AGO',col:'#f6e6c8'};S.bubble={text:'ONE MORE REEL',k:easeOut((lt-0.3)/0.15),side:-1};},
  somi_walkup:(u,t)=>{mood('day');const P=st('zash',-0.6,0,6,0.6,'default');phoneUp('zash',1,true,t);const x=lerp(5,2.0,ease(u));const Q=place('somi',x,0,6.4,-Math.PI/2+0.3);reset(Q);if(u<0.85)walk(Q,t,0.8,'smug');else Q.setFace('smug');
    camAt(V3(0.7,4.6,23),V3(0.7,4.2,6),40);showOnly(['zash','somi']);},
  somi_bet:(u,t,lt)=>{mood('day');const P=st('somi',2,0,6.4,-0.5);mouth(P,'somi',t,'smug');const wk=wordT('somi','week')-TL.shots.find(s=>s.name==='somi_bet').s;if(lt>wk-0.2){P.armR.rotation.set(-2.3,0,0.2);}
    close('somi',lerp(4.6,3.8,ease(u)),-0.55,0.05,38);showOnly(['somi']);S.tag={text:'THE BET: 7 DAYS. NO PHONE.',col:'#ffffff'};if(t>wordT('somi','date'))S.hearts=t-wordT('somi','date');},
  zash_smug_phone:(u,t,lt)=>{mood('day');const P=st('zash',-1.5,0,6,0.4);mouth(P,'zash',t,'smug');const k=easeOut(lt/0.25);P.armR.rotation.set(-2.6*k,0,0.2);world.ph.zash.visible=lt<0.25;if(lt>=0.25){const f=world.flyPhone;f.visible=true;const q=(lt-0.25);f.position.set(-0.6+q*6,8.5+q*9-q*q*9,6+q*2);f.rotation.set(q*14,q*9,0);}
    close('zash',lerp(4.4,4.0,u),0.4,0.15,40);showOnly(['zash']);},
  grass_touch:(u,t)=>{mood('day');const P=st('zash',0,0,7,0.35,'happy');chars.zash.position.y=-0.9;P.legL.rotation.x=-1.4;P.legR.rotation.x=0.5;P.torso.rotation.x=0.4;P.armR.rotation.set(-0.55,0,0.1);P.armL.rotation.set(-0.3,0,-0.2);P.head.rotation.x=0.2;
    camAt(V3(lerp(8.5,7.8,u),4.0,lerp(19,18,u)),V3(0.6,2.4,7),40);showOnly(['zash']);day(1,'#5ac88a');S.sparkle=0.5;},
  family_dinner:(u,t)=>{mood('indoor');const C=world.chairs;const at=(i,id,e)=>{const c=C[i];const P=sit(id,DX+c.position.x,0,c.position.z,c.rotation.y,e);if(id==='max')chars.max.position.y=0.4;return P;};
    const Z=at(0,'zash','happy');const M=at(1,'mom','happy');const D=at(4,'dad','happy');const X=at(5,'max','happy');D.armR.rotation.x=-1.2+Math.sin(t*6)*0.2;M.head.rotation.z=Math.sin(t*4)*0.08;X.armL.rotation.x=-2.4;
    camAt(V3(DX+lerp(1.4,0.6,u),12.5,lerp(15,14,u)),V3(DX,2.6,0),48);showOnly(['zash','mom','dad','max']);day(2,'#ff9a5a');},
  phantom_buzz:(u,t,lt)=>{mood('indoor');const P=st('zash',RX,0,1,0.1,'shocked');const tw=Math.sin(lt*30)*Math.exp(-((lt*1.4)%1)*5);P.armR.rotation.set(0.25,0,0.35+tw*0.1);P.head.rotation.y=Math.sin(lt*7)*0.3;P.torso.rotation.z=tw*0.05;
    close('zash',lerp(5.2,4.6,u),0.2,0.0,42);shake(0.03*Math.abs(tw),t);showOnly(['zash']);day(3,'#ff6a6a');S.notifs=lt;},
  read_book:(u,t,lt)=>{mood('indoor');const P=sit('zash',RX-4,0,-0.6,0.5,'default');P.armL.rotation.set(-1.25,0,0.45);P.armR.rotation.set(-1.25,0,-0.45);P.head.rotation.x=0.35;const b=world.book;b.visible=true;b.position.copy(lw0(P.armL,V3(0.0,-2.0,0.2)).add(lw0(P.armR,V3(0,-2.0,0.2))).multiplyScalar(0.5));b.lookAt(head('zash'));b.rotateX(-0.2);
    if(lt>1.0)P.setFace('happy');camAt(V3(RX-lerp(0.4,0.8,u),4.6,6.2),V3(RX-4,3.6,-0.6),40);showOnly(['zash']);day(4,'#4aa8f0');},
  scroll_sandwich:(u,t)=>{mood('indoor');const P=st('zash',DX,0,4.4,1.45,'tired');world.sandwich.visible=true;P.armL.rotation.set(-1.05,0,0.45);P.armR.rotation.set(-1.0,0,-0.45+Math.sin(t*10)*0.12);P.head.rotation.x=0.4;
    camAt(V3(DX+lerp(7.5,7.0,u),7.2,lerp(2.2,2.6,u)),V3(DX,4.0,4.4),40);showOnly(['zash']);day(5,'#ff6a6a');S.swipe=t;},
  day7_win:(u,t,lt)=>{mood('day');const P=st('zash',0,0,6,0,'happy');const j=Math.abs(Math.sin(lt*5.5));chars.zash.position.y=j*1.6;P.armL.rotation.set(-2.8,0,-0.3);P.armR.rotation.set(-2.8,0,0.3);P.legL.rotation.x=-0.4*j;P.legR.rotation.x=0.3*j;
    camAt(V3(0,2.6,lerp(16,14,u)),V3(0,5.6,6),46);showOnly(['zash']);day(7,'#ffd23f');S.confetti=t;const dt=wordT('day7','did');if(t>=dt&&t<dt+0.15)S.flash=0.5*(1-(t-dt)/0.15);},
  mirror_young:(u,t,lt)=>{mood('indoor');const sw=wordT('young','younger')-TL.shots.find(s=>s.name==='mirror_young').s;const kid=lt>=sw;const id=kid?'zkid':'zash';const P=st(id,BX2,0,-2.6,0,kid?'shocked':'happy');if(kid){P.armL.rotation.set(-2.2,0,-0.6);P.armR.rotation.set(-2.2,0,0.6);}
    close(id,kid?lerp(4.6,4.0,u):3.8,0.2,kid?0.3:0.1,40);showOnly([id]);if(lt>=sw&&lt<sw+0.22)S.flash=0.85*(1-(lt-sw)/0.22);if(kid){S.tag={text:'SCREEN AGE: -4 YEARS',col:'#5ac88a'};S.sparkle=0.8;}},
  run_to_somi:(u,t)=>{mood('day');const x=lerp(-10,-2,u);const P=place('zkid',x,0,7,Math.PI/2);reset(P);walk(P,t,1.6,'happy');const Q=st('somi',3,0,7,-Math.PI/2,'default');
    camAt(V3(x-1.2,2.8,14),V3(x+0.6,2.6,7),44);showOnly(['zkid','somi']);S.speed=1;},
  somi_no_kid:(u,t)=>{mood('day');const Q=st('somi',3,0,7,-Math.PI/2+0.25);mouth(Q,'somi',t,'default');Q.head.rotation.x=0.35;const P=st('zkid',0.8,0,7,Math.PI/2-0.2,'happy');P.head.rotation.x=-0.35;
    camAt(V3(1.9,3.6,20.5),V3(1.9,3.8,7),42);showOnly(['zkid','somi']);},
  kid_zash_shock:(u,t,lt)=>{mood('day');const P=st('zkid',0.8,0,7,0.2,'shocked');P.setFace('shocked',{mouthOpen:1});P.head.rotation.x=-0.2;close('zkid',lerp(4.0,2.8,easeOut(lt/0.2)),0.2,0.1,38);showOnly(['zkid']);S.sweat=1;if(lt<0.12)S.flash=0.3;},
  kid_zash_phone:(u,t)=>{mood('gold');const P=sit('zkid',BENCH.x+1.2,0,BENCH.z+0.1,0,'angry');phoneUp('zkid',1,true,t);P.head.rotation.x=0.15;mouth(P,'zash',t,'angry');close('zkid',lerp(4.8,4.2,u),0.5,0.1,40);showOnly(['zkid']);S.tag={text:'NEEDED: 1,000+ HOURS',col:'#ffd23f'};},
  tobi_welcome:(u,t)=>{mood('gold');const P=sit('zkid',BENCH.x+1.2,0,BENCH.z+0.1,0,'shocked');phoneUp('zkid',1,true,t);const T=sit('told',BENCH.x-1.4,0,BENCH.z+0.1,0.15);slouchOld(T);T.legL.rotation.x=-1.5;T.legR.rotation.x=-1.5;mouth(T,'tobi',t,'happy');T.armR.rotation.set(-1.4,0,-0.9);
    camAt(V3(BENCH.x+lerp(-0.4,0.2,u),4.2,BENCH.z+lerp(10,9,u)),V3(BENCH.x,3.6,BENCH.z),40);showOnly(['zkid','told']);},
  endcard:(u,t,lt)=>{mood('gold');const P=sit('zkid',BENCH.x+1.2,0,BENCH.z+0.1,0,'default');phoneUp('zkid',1,true,t);const T=sit('told',BENCH.x-1.4,0,BENCH.z+0.1,0);slouchOld(T);T.legL.rotation.x=-1.5;T.legR.rotation.x=-1.5;phoneUp('told',1,true,t);
    camAt(V3(BENCH.x+lerp(-2,2,u),5.2,BENCH.z-12),V3(BENCH.x,3.2,BENCH.z),44);showOnly(['zkid','told']);S.endcard=clamp((lt-0.6)/0.35,0,1);S.dim=clamp((lt-0.4)/0.4,0,0.55);S.capY=0.9;},
};

/* ---------------- 2D overlays */
function T(text,x,y,size,fill,stroke,lw,align){og.font=`${size}px ${FONT}`;og.textAlign=align||'center';og.textBaseline='middle';og.lineJoin='round';if(stroke){og.lineWidth=lw||size*0.18;og.strokeStyle=stroke;og.strokeText(text,x,y);}og.fillStyle=fill;og.fillText(text,x,y);}
function RR(x,y,w,h,r){og.beginPath();og.moveTo(x+r,y);og.arcTo(x+w,y,x+w,y+h,r);og.arcTo(x+w,y+h,x,y+h,r);og.arcTo(x,y+h,x,y,r);og.arcTo(x,y,x+w,y,r);og.closePath();}
function drawPhoneUI(p){const w=W*0.5,h=w*1.75,x=(W-w)/2,y=H*0.07;og.save();og.fillStyle='#111216';RR(x,y,w,h,w*0.12);og.fill();og.fillStyle='#f4f4f8';RR(x+w*0.05,y+w*0.05,w*0.9,h-w*0.1,w*0.09);og.fill();
  T('SCREEN TIME',W/2,y+h*0.14,W*0.05,'#15161c');const sec=Math.floor(3590+p.k*14);const hh=Math.floor(sec/3600),mm=Math.floor(sec%3600/60),ss=sec%60;const pad=n=>String(n).padStart(2,'0');
  T(`${hh}:${pad(mm)}:${pad(ss)}`,W/2,y+h*0.32,W*0.11,sec>=3600?'#d62a2a':'#15161c');
  og.fillStyle='#e2e2ea';RR(x+w*0.12,y+h*0.45,w*0.76,h*0.05,h*0.025);og.fill();og.fillStyle=sec>=3600?'#d62a2a':'#4aa8f0';RR(x+w*0.12,y+h*0.45,w*0.76*Math.min(1,sec/3600),h*0.05,h*0.025);og.fill();
  if(sec>=3600){const k=easeOut((p.k-0.72)/0.1);og.translate(W/2,y+h*0.66);og.scale(0.6+0.4*k,0.6+0.4*k);og.fillStyle='#d62a2a';RR(-w*0.42,-h*0.07,w*0.84,h*0.14,h*0.04);og.fill();T('+1 DAY OLDER',0,4,W*0.06,'#ffffff');}og.restore();}
function drawAgeTick(lt){const n=lt<0.6?0:Math.min(1,Math.floor((lt-0.6)*8)+1);const y=H*0.15;og.save();og.fillStyle='rgba(13,13,18,0.85)';RR(W*0.16,y-H*0.05,W*0.68,H*0.1,H*0.03);og.fill();
  T('AGE',W*0.28,y,W*0.06,'#a0a4ae');T(`15Y ${n?'1':'0'}D`,W*0.6,y,W*0.1,n?'#ff6a6a':'#ffffff');og.restore();if(n){const k=easeOut((lt-0.6)/0.2);og.globalAlpha=k;T('+1',W*0.74,y-H*0.065-k*H*0.02,W*0.08,'#ff6a6a','#0d0d12');og.globalAlpha=1;}}
function drawWarn(k){const w=W*0.84,h=H*0.3,x=(W-w)/2,y=H*0.1;og.save();og.translate(W/2,y+h/2);og.scale(0.7+0.3*k,0.7+0.3*k);og.translate(-W/2,-(y+h/2));og.globalAlpha=k;og.fillStyle='#ffffff';og.fillRect(x,y,w,h);og.lineWidth=W*0.022;og.strokeStyle='#0d0d12';og.strokeRect(x+W*0.02,y+W*0.02,w-W*0.04,h-W*0.04);
  T('WARNING',W/2,y+h*0.2,W*0.12,'#0d0d12');og.fillStyle='#0d0d12';og.fillRect(x+w*0.1,y+h*0.33,w*0.8,H*0.004);
  ['THIS PHONE CAUSES','WRINKLES, BACK PAIN','AND GRAY HAIR'].forEach((l,i)=>T(l,W/2,y+h*(0.48+i*0.15),W*0.062,'#0d0d12'));og.restore();}
function drawBubble(b){if(b.k<=0)return;const x=W*(b.side>0?0.3:0.62),y=H*0.24;og.save();og.translate(x,y);og.scale(b.k,b.k);og.rotate(b.side*-0.06);const w=W*0.05*b.text.length+W*0.12,h=H*0.08;og.fillStyle='#ffffff';RR(-w/2,-h/2,w,h,h*0.4);og.fill();og.lineWidth=W*0.012;og.strokeStyle='#0d0d12';og.stroke();
  og.beginPath();og.moveTo(-b.side*w*0.1,h/2-2);og.lineTo(-b.side*w*0.28,h/2+H*0.04);og.lineTo(-b.side*w*0.25,h/2-2);og.fillStyle='#ffffff';og.fill();og.stroke();og.fillRect(-b.side*w*0.24-W*0.02,h/2-W*0.012,W*0.07,W*0.012);
  T(b.text,0,4,W*0.07,'#15161c');og.restore();}
const NOTIFS=[['SOMI','u up?'],['TOBI','bro look at this reel'],['GROUP CHAT','47 new messages'],['MOM','dinner!'],['APP','you have 1 new follower']];
function drawNotifs(lt){NOTIFS.forEach((n,i)=>{const s=i*0.45+0.1;const k=easeOut((lt-s)/0.12);if(k<=0)return;const y=H*(0.19+i*0.075);const x=W*0.08+(1-k)*W*0.5;og.save();og.globalAlpha=Math.min(1,k)*(lt>s+0.9?0.45:1);og.fillStyle='rgba(250,250,252,0.96)';RR(x,y,W*0.84,H*0.064,H*0.02);og.fill();
    og.fillStyle=['#ff6fa5','#2fb39a','#4aa8f0','#d9a23a','#7a5aff'][i];RR(x+W*0.025,y+H*0.012,H*0.04,H*0.04,H*0.01);og.fill();T(n[0],x+W*0.15,y+H*0.022,W*0.036,'#15161c',null,0,'left');og.font=`${W*0.032}px ${FONT}`;og.fillStyle='#5a5e6a';og.textAlign='left';og.fillText(n[1],x+W*0.15,y+H*0.047);
    if(lt>s+0.9){og.globalAlpha=1;og.save();og.translate(x+W*0.7,y+H*0.032);og.rotate(-0.12);og.strokeStyle='#d62a2a';og.lineWidth=W*0.007;RR(-W*0.12,-H*0.02,W*0.24,H*0.04,W*0.01);og.stroke();T('NOT REAL',0,2,W*0.04,'#d62a2a');og.restore();}og.restore();});}
function drawWelcome(){}
function drawOverlays(t){
  const vg=og.createRadialGradient(W/2,H/2,H*0.36,W/2,H/2,H*0.78);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.34)');og.fillStyle=vg;og.fillRect(0,0,W,H);
  if(S.speed){og.strokeStyle='rgba(255,255,255,0.55)';og.lineWidth=W*0.006;const r=rng('sl'+Math.floor(t*12));for(let i=0;i<9;i++){const y=r()*H*0.8+H*0.05,x=r()*W*0.4;og.beginPath();og.moveTo(x,y);og.lineTo(x+W*(0.2+r()*0.3),y);og.stroke();}}
  if(S.dim){og.fillStyle=`rgba(8,10,20,${S.dim})`;og.fillRect(0,0,W,H);}
  if(S.sparkle){const r=rng('sp'+Math.floor(t*6));og.fillStyle='rgba(255,246,200,0.95)';for(let i=0;i<Math.round(10*S.sparkle);i++){const x=r()*W,y=r()*H*0.75,s=W*(0.012+r()*0.02);og.beginPath();og.moveTo(x,y-s);og.quadraticCurveTo(x,y,x+s,y);og.quadraticCurveTo(x,y,x,y+s);og.quadraticCurveTo(x,y,x-s,y);og.quadraticCurveTo(x,y,x,y-s);og.fill();}}
  if(S.confetti!=null){const r=rng('cf');for(let i=0;i<46;i++){const x=(r()*W+Math.sin(S.confetti*2+i)*W*0.03),y=((r()*H+S.confetti*H*0.35*(0.6+r()*0.6))%H);og.save();og.translate(x,y);og.rotate(S.confetti*4+i);og.fillStyle=['#ffd23f','#ff4a8a','#4aa8f0','#5ac88a','#ff8a3a'][i%5];og.fillRect(-W*0.009,-W*0.004,W*0.018,W*0.008);og.restore();}}
  if(S.sweat){og.fillStyle='rgba(140,205,255,0.95)';[[0.7,0.3],[0.76,0.36],[0.26,0.33]].forEach(([fx,fy],i)=>{const x=W*fx,y=H*fy+((t*120+i*40)%60);og.beginPath();og.moveTo(x,y);og.quadraticCurveTo(x+W*0.02,y+H*0.02,x,y+H*0.026);og.quadraticCurveTo(x-W*0.02,y+H*0.02,x,y);og.fill();});}
  if(S.hearts!=null){for(let i=0;i<5;i++){const k=(S.hearts*0.8+i*0.2)%1;const x=W*(0.2+i*0.15),y=H*(0.5-k*0.25);og.globalAlpha=1-k;const s=W*0.03;og.fillStyle='#ff4a6a';og.beginPath();og.moveTo(x,y+s);og.bezierCurveTo(x-s*2,y-s*0.5,x-s*0.6,y-s*1.8,x,y-s*0.5);og.bezierCurveTo(x+s*0.6,y-s*1.8,x+s*2,y-s*0.5,x,y+s);og.fill();og.globalAlpha=1;}}
  if(S.ow!=null){const k=easeOut(S.ow/0.15);og.save();og.translate(W*0.72,H*0.26);og.rotate(0.15);og.scale(k,k);T('CRACK!',0,0,W*0.1,'#ff6a6a','#0d0d12');og.restore();}
  if(S.swipe!=null){const k=(S.swipe*1.6)%1;og.save();og.globalAlpha=1-k;og.strokeStyle='#ffffff';og.lineWidth=W*0.012;og.lineCap='round';const y=H*(0.3-k*0.08);og.beginPath();og.moveTo(W*0.5,H*0.32);og.lineTo(W*0.5,y);og.stroke();og.beginPath();og.moveTo(W*0.46,y+H*0.02);og.lineTo(W*0.5,y);og.lineTo(W*0.54,y+H*0.02);og.stroke();og.restore();T('SWIPE?',W*0.5,H*0.22,W*0.07,'#ffffff','#0d0d12');}
  if(S.phoneUI)drawPhoneUI(S.phoneUI);
  if(S.ageTick!=null)drawAgeTick(S.ageTick);
  if(S.warn)drawWarn(S.warn);
  if(S.notifs!=null)drawNotifs(S.notifs);
  if(S.tag){og.font=`${W*0.05}px ${FONT}`;const tw=og.measureText(S.tag.text).width+W*0.08;og.fillStyle='rgba(13,13,18,0.82)';RR((W-tw)/2,H*0.115,tw,H*0.05,H*0.025);og.fill();T(S.tag.text,W/2,H*0.142,W*0.05,S.tag.col);}
  if(S.stamp){const k=easeOut(S.stamp.t/0.5);if(k>0){og.save();og.translate(W*0.5,H*0.24);og.rotate(-0.15);og.scale(2.2-1.2*k,2.2-1.2*k);og.globalAlpha=k;og.lineWidth=W*0.014;og.strokeStyle='#d62a2a';RR(-W*0.28,-H*0.045,W*0.56,H*0.09,W*0.02);og.stroke();T(S.stamp.text,0,4,W*0.1,'#d62a2a');og.restore();}}
  if(S.bubble)drawBubble(S.bubble);
  if(S.follow>0){const k=S.follow;const y=H*0.2;og.save();og.translate(W/2,y);const p=1+Math.sin(t*8)*0.03;og.scale(k*p,k*p);og.fillStyle='#ffd23f';RR(-W*0.36,-H*0.035,W*0.72,H*0.07,H*0.035);og.fill();og.lineWidth=W*0.01;og.strokeStyle='#0d0d12';og.stroke();T('FOLLOW FOR MORE',0,3,W*0.064,'#0d0d12');og.restore();}
  if(S.flash>0){og.fillStyle=`rgba(255,250,235,${S.flash})`;og.fillRect(0,0,W,H);}
  if(S.endcard>0){og.save();og.globalAlpha=S.endcard;T('BLOCKHEADS',W/2,H*0.28,W*0.14,'#ffd23f','#0d0d12',W*0.024);
    ['SEND THIS TO','YOUR FRIEND WHO\'S','ALWAYS ON','THEIR PHONE'].forEach((l,i)=>T(l,W/2,H*(0.37+i*0.058),W*0.085,i===3?'#ff6a6a':'#ffffff','#0d0d12',W*0.018));
    og.fillStyle='#ffd23f';RR(W*0.16,H*0.62,W*0.68,H*0.07,H*0.035);og.fill();og.lineWidth=W*0.01;og.strokeStyle='#0d0d12';og.stroke();T('FOLLOW FOR MORE',W/2,H*0.655,W*0.064,'#0d0d12');og.restore();}
}
function captionAt(t){for(const s of TL.segs){for(let i=0;i<s.words.length;i++){const w=s.words[i];const nx=s.words[i+1];const end=nx?nx.s:Math.min(w.e+0.25,s.end+0.25);if(t>=w.s&&t<end)return {w,since:t-w.s};}}return null;}
function drawCaption(t){const c=captionAt(t);if(!c)return;const text=c.w.w.toUpperCase();const base=W*0.118*(text.length>8?8/text.length*1.05:1);const k=c.since<0.04?lerp(1,1.08,c.since/0.04):c.since<0.08?lerp(1.08,1,(c.since-0.04)/0.04):1;
  og.save();og.translate(W/2,H*(S.capY||0.72));og.scale(k,k);og.font=`${base}px ${FONT}`;og.textAlign='center';og.textBaseline='middle';og.lineJoin='round';og.shadowColor='rgba(0,0,0,0.55)';og.shadowBlur=base*0.25;og.shadowOffsetY=base*0.06;og.lineWidth=base*0.2;og.strokeStyle='#0d0d12';og.strokeText(text,0,0);og.shadowColor='transparent';og.fillStyle=c.w.red?'#ff3b3b':'#ffffff';og.fillText(text,0,0);og.restore();}

/* ---------------- entry points */
S.init=async function(timeline,w,h,fontUrl){TL=timeline;W=w;H=h;SS=window.BH_SS||1.5;
  const ff=new FontFace('Luckiest Guy',`url(${fontUrl})`);await ff.load();document.fonts.add(ff);
  R=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});R.setPixelRatio(1);R.setSize(Math.round(W*SS),Math.round(H*SS));R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.08;R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
  cam=new THREE.PerspectiveCamera(40,W/H,0.1,2000);
  buildWorld();buildChars();
  const [oc,o2]=cv(W,H);out=oc;og=o2;og.imageSmoothingEnabled=true;og.imageSmoothingQuality='high';scene.updateMatrixWorld(true);return true;};
const KEYS=['flash','dim','capY','tag','stamp','bubble','sparkle','sweat','phoneUI','ageTick','warn','notifs','sepia','hearts','ow','swipe','confetti','speed','follow','endcard'];
S.frame=function(f,q){const t=f/TL.fps;const shot=TL.shots.find(s=>t>=s.s&&t<s.e)||TL.shots[TL.shots.length-1];
  KEYS.forEach(k=>S[k]=null);
  world.phoneLight.intensity=0;world.phoneLight2.intensity=0;Object.values(world.ph).forEach(p=>p.visible=false);world.flyPhone.visible=false;world.mag.visible=false;world.book.visible=false;world.sandwich.visible=false;world.cane.rotation.set(0,0,0);
  world.mood=null;cam.up.set(0,1,0);
  if(shot!==curShot){curShot=shot;showOnly([]);}
  Object.values(chars).forEach(c=>{c.rotation.set(0,0,0);});
  const u=(t-shot.s)/(shot.e-shot.s),lt=t-shot.s;scene.updateMatrixWorld(true);
  (SH[shot.name]||SH.endcard)(u,t,lt);
  // mid-video follow prompt: right after "Easy." for ~3 s
  const es=seg('easy');if(es){const a=es.end+0.05,b=a+3.0;if(t>=a&&t<b)S.follow=Math.min(easeOut((t-a)/0.2),clamp((b-t)/0.2,0,1));}
  world.cane.visible=chars.told.visible;
  world.sun.target.position.copy(world.look);world.sun.position.copy(world.look).addScaledVector(world.sunDir,110);
  scene.updateMatrixWorld(true);R.render(scene,cam);
  og.globalAlpha=1;og.globalCompositeOperation='source-over';og.filter=S.sepia?'sepia(0.75) contrast(1.05) brightness(1.02)':'contrast(1.05) saturate(1.14)';og.drawImage(R.domElement,0,0,W,H);
  og.filter=`blur(${Math.round(W*0.014)}px) brightness(1.15)`;og.globalCompositeOperation='screen';og.globalAlpha=0.2;og.drawImage(R.domElement,0,0,W,H);og.filter='none';og.globalCompositeOperation='source-over';og.globalAlpha=1;
  drawOverlays(t);drawCaption(t);
  return out.toDataURL('image/jpeg',q||0.95);};
})();
