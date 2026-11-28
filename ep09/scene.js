/* Episode 9 "I Wasted All Three Wishes" (narrator Zash). Warm birthday-party look, magical Wish Lady sparkle, a soft
   sepia flashback. Original characters and sets. ep09/scene.js is generated from this + cast_ep09.js (build_scene.py).
   Entry points: SAMPLE.init(timeline, W, H, fontUrl), SAMPLE.frame(f) */
(function(){
/* Episode 9 "I Wasted All Three Wishes": extra original characters (Wish Lady, Grandpa, bald Dad, Max with no mouth). */
(function(){
const J=o=>JSON.parse(JSON.stringify(o));
const dad=J(BH.castById('dad')), max=J(BH.castById('max'));
const SPECS=[
 {id:'wishlady',name:'The Wish Lady',role:'Grants birthday wishes',group:'Ep9',origin:'original',
  skin:'#f3d9e6',hair:{style:'long',color:'#d8c8ff'},
  face:{eyeShape:'cat',eyes:'dot',eyeColor:'#d4a017',brows:'arched',mouth:'smile',lashes:true,lips:'#c0508a',blush:true},
  torso:{inner:'#f4eaff',outer:{style:'cloak',color:'#5b3fa8'}},
  sleeves:{color:'#5b3fa8',len:'full',cuff:'#e8c860'},pants:{color:'#5b3fa8',style:'dress',shoes:'#e8c860',shoeStyle:'flat'},
  extras:['earrings:#e8c860','necklace:#e8c860']},
 {id:'gpa',name:'Grandpa',role:'Has not spoken since 1998',group:'Ep9',origin:'original',
  skin:'#e2b896',hair:{style:'sides',color:'#ececec'},
  face:{eyeShape:'sleepy',eyes:'tired',brows:'bushy',browColor:'#dcdcdc',mouth:'flat',glasses:'round',age:'old'},
  torso:{inner:'#e9e4d8',collar:true,outer:{style:'cardigan',color:'#7a5a3a'}},
  sleeves:{color:'#7a5a3a',len:'full',fabric:'knit'},pants:{color:'#5a5a60',fabric:'wool',shoes:'#3a2a1e',shoeStyle:'dress'}},
 Object.assign(J(dad),{id:'dadbald',hair:{style:'bald',color:dad.hair.color}}),
 Object.assign(J(max),{id:'maxnm',face:Object.assign(J(max.face||{}),{mouth:'none'})}),
];
SPECS.forEach(s=>{const i=CAST.findIndex(c=>c.id===s.id);if(i>=0)CAST[i]=s;else CAST.push(s);});
})();

const S=window.SAMPLE={};
let TL,W,H,R,scene,cam,out,og,world={},chars={},curShot=null,SS=1.25;
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const lerp=(a,b,t)=>a+(b-a)*t,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);},easeOut=t=>1-Math.pow(1-clamp(t,0,1),3),easeIn=t=>Math.pow(clamp(t,0,1),2);
const FONT='"Luckiest Guy", Impact, sans-serif';
const HOSP=200;

/* ---------------- textures */
function canvasTex(w,h,draw){const [c,g]=cv(w,h);draw(g,w,h);const t=tex(c);t._c=c;return t;}
function glowTex(col){return canvasTex(128,128,(g)=>{const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.3,col);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);});}
function starTex(){return canvasTex(64,64,(g)=>{g.translate(32,32);g.fillStyle='#fff';g.beginPath();for(let i=0;i<8;i++){const a=i/8*Math.PI*2,r=i%2?7:30;g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();g.fill();const gr=g.createRadialGradient(0,0,0,0,0,30);gr.addColorStop(0,'rgba(255,240,200,0.9)');gr.addColorStop(1,'rgba(255,200,255,0)');g.fillStyle=gr;g.fillRect(-32,-32,64,64);});}
function puffTex(){return canvasTex(128,128,(g)=>{for(let i=0;i<7;i++){const x=40+(i*23)%50,y=40+(i*31)%50,r=30+(i*7)%14;const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(255,240,255,0.95)');gr.addColorStop(1,'rgba(220,200,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);}});}
function plankTex(col){return canvasTex(256,256,(g,w,h)=>{fabricFill(g,0,0,w,h,col,'canvas');g.strokeStyle='rgba(0,0,0,0.22)';g.lineWidth=3;for(let y=0;y<h;y+=42){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}});}
function wallTex(col,stripe){return canvasTex(256,256,(g,w,h)=>{fabricFill(g,0,0,w,h,col,'cotton');if(stripe){g.fillStyle=stripe;for(let x=0;x<w;x+=40)g.fillRect(x,0,14,h);}});}
function bannerTex(){return canvasTex(1024,200,(g,w,h)=>{const cols=['#ff6b8a','#ffd23f','#5ec8ff','#8be38b','#c08bff'];const txt='HAPPY 13TH ZASH';const n=txt.length;for(let i=0;i<n;i++){const x=i*w/n;g.fillStyle=cols[i%5];g.beginPath();g.moveTo(x+4,10);g.lineTo(x+w/n-4,10);g.lineTo(x+w/n/2,h-6);g.closePath();g.fill();
  g.fillStyle='#fff';g.font='bold 54px "Luckiest Guy", Impact, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(txt[i],x+w/n/2,70);}});}
function listCanvas(){const [c,g]=cv(512,640);g.fillStyle='#fbf7ea';g.fillRect(0,0,512,640);g.fillStyle='rgba(0,0,0,0.05)';for(let y=110;y<640;y+=60)g.fillRect(0,y,512,2);g.fillStyle='rgba(255,100,100,0.4)';g.fillRect(70,0,3,640);
  g.fillStyle='#1d2a5a';g.font='64px "Luckiest Guy", Impact, sans-serif';g.textAlign='left';g.fillText('MY 3 WISHES',90,90);g.font='56px "Luckiest Guy", Impact, sans-serif';
  [['1.','RICH','💰'],['2.','TALL','📏'],['3.','FAMOUS','⭐']].forEach(([n,w2,e],i)=>{g.fillStyle='#1d2a5a';g.fillText(n+' '+w2,100,220+i*120);g.font='50px sans-serif';g.fillText(e,380,220+i*120);g.font='56px "Luckiest Guy", Impact, sans-serif';});
  g.strokeStyle='#e0447a';g.lineWidth=6;g.beginPath();g.moveTo(100,580);g.bezierCurveTo(180,560,300,600,420,570);g.stroke();return c;}

const SM=(o)=>new THREE.MeshStandardMaterial(o);
function cst(m){m.castShadow=true;m.receiveShadow=true;return m;}
function box(w,h,d,mat,x,y,z,parent){const m=cst(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat.isMaterial?mat:SM({color:mat,roughness:0.8})));m.position.set(x,y,z);(parent||scene).add(m);return m;}
function sprite(t,s,parent,op){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,opacity:op==null?1:op}));m.scale.set(s,s,1);(parent||scene).add(m);return m;}
function pl(col,int,dist,x,y,z,parent){const L=new THREE.PointLight(col,int,dist,1.6);L.position.set(x,y,z);(parent||scene).add(L);return L;}

/* ---------------- world */
function buildWorld(){
  scene=new THREE.Scene();scene.background=new THREE.Color('#1a1428');scene.fog=new THREE.Fog(0x2a1e30,60,160);
  world.hemi=new THREE.HemisphereLight(0xffe8d0,0x4a3040,0.6);scene.add(world.hemi);
  const key=world.key=new THREE.DirectionalLight(0xffe2c0,0.9);key.castShadow=true;key.shadow.mapSize.set(2048,2048);const sc=key.shadow.camera;sc.left=-25;sc.right=25;sc.top=25;sc.bottom=-25;sc.near=1;sc.far=120;key.shadow.bias=-0.0004;key.shadow.normalBias=0.05;scene.add(key);scene.add(key.target);
  world.look=V3(0,0,0);world.keyDir=V3(0.4,0.8,0.6).normalize();
  world.T={glow:glowTex('rgba(255,200,120,0.9)'),magic:glowTex('rgba(200,150,255,0.9)'),star:starTex(),puff:puffTex()};
  buildHouse();buildHospital();buildFX();
}
function buildHouse(){const g=world.house=new THREE.Group();scene.add(g);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(60,60),SM({map:plankTex('#a7774a'),roughness:0.7}));floor.material.map.wrapS=floor.material.map.wrapT=THREE.RepeatWrapping;floor.material.map.repeat.set(6,6);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;g.add(floor);
  const wm=SM({map:wallTex('#f0d9c2','#ead0b6'),roughness:0.9});box(40,22,0.5,wm,0,11,-12,g);box(0.5,22,40,wm,-16,11,0,g);box(0.5,22,40,wm,16,11,0,g);
  box(40,0.6,0.6,SM({color:'#c9a07a'}),0,1.2,-11.7,g);
  // window with night
  box(7,6,0.2,SM({color:'#14204a',emissive:0x0a1430,emissiveIntensity:1}),7,9,-11.7,g);box(7.6,0.4,0.4,SM({color:'#fff'}),7,6,-11.6,g);box(7.6,0.4,0.4,SM({color:'#fff'}),7,12,-11.6,g);box(0.3,6,0.4,SM({color:'#fff'}),7,9,-11.6,g);
  // banner
  const ban=new THREE.Mesh(new THREE.PlaneGeometry(14,2.7),SM({map:bannerTex(),transparent:true,side:THREE.DoubleSide,roughness:0.8}));ban.position.set(-1,15,-11.6);g.add(ban);
  // balloons
  world.balloons=[];[['#ff6b8a',-9,-9],['#ffd23f',-11,-8],['#5ec8ff',10,-9],['#c08bff',12,-7],['#8be38b',-7,-10],['#ff8c42',11.5,-10.5]].forEach(([c,x,z],i)=>{const b=cst(new THREE.Mesh(new THREE.SphereGeometry(1.1,24,18),SM({color:c,roughness:0.25,metalness:0.05})));b.scale.y=1.2;b.position.set(x,11+((i*7)%3),z);g.add(b);
    const s=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,8,4),SM({color:'#eee'}));s.position.set(x,6.5+((i*7)%3),z);g.add(s);world.balloons.push(b);});
  // table + cake
  const tm=SM({map:plankTex('#6a4428'),roughness:0.6});box(10,0.4,4.4,tm,0,3.4,0,g);[[-4.6,-1.9],[4.6,-1.9],[-4.6,1.9],[4.6,1.9]].forEach(([x,z])=>box(0.4,3.2,0.4,tm,x,1.6,z,g));
  const cloth=box(10.4,0.06,4.8,SM({color:'#f6f0ff',roughness:0.9}),0,3.63,0,g);
  const cake=world.cake=new THREE.Group();cake.position.set(0,3.66,0.3);g.add(cake);
  const t1=cst(new THREE.Mesh(new THREE.CylinderGeometry(1.4,1.4,1.0,40),SM({color:'#ffb3c8',roughness:0.6})));t1.position.y=0.5;cake.add(t1);
  const t2=cst(new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.0,0.8,40),SM({color:'#fff5e6',roughness:0.6})));t2.position.y=1.4;cake.add(t2);
  const drip=new THREE.Mesh(new THREE.TorusGeometry(1.38,0.12,8,40),SM({color:'#fff5e6',roughness:0.5}));drip.rotation.x=Math.PI/2;drip.position.y=0.98;cake.add(drip);
  world.flames=[];for(let i=0;i<5;i++){const a=i/5*Math.PI*2;const c=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.6,8),SM({color:['#5ec8ff','#ffd23f','#ff6b8a','#8be38b','#c08bff'][i]}));c.position.set(Math.cos(a)*0.6,2.1,Math.sin(a)*0.6);cake.add(c);
    const f=sprite(world.T.glow,0.5,cake);f.position.set(Math.cos(a)*0.6,2.55,Math.sin(a)*0.6);world.flames.push(f);}
  world.cakeL=pl(0xffb060,0.9,10,0,6.5,0.5,g);
  // plates + gifts
  [[-3,0.6],[3,0.6]].forEach(([x,z])=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.55,0.08,20),SM({color:'#fff',roughness:0.3}));p.position.set(x,3.68,z);g.add(p);});
  [['#5ec8ff',-12,4],['#ff6b8a',-11,6],['#ffd23f',12,5]].forEach(([c,x,z])=>{box(2,1.6,2,SM({color:c,roughness:0.6}),x,0.8,z,g);box(2.1,0.3,0.3,SM({color:'#fff'}),x,1.62,z,g);});
  // couch
  const cm=SM({color:'#6a4a8a',roughness:0.95});box(9,1.6,3,cm,-9,1.4,-8.5,g);box(9,3,1,cm,-9,3,-10,g);box(1,2.4,3,cm,-13.5,2,-8.5,g);box(1,2.4,3,cm,-4.5,2,-8.5,g);
  world.lamp=pl(0xffc890,1.2,26,-6,9,-4,g);pl(0xffd8b0,0.8,30,6,10,4,g);
  // the list prop (in Zash's hand)
  world.listTexCanvas=listCanvas();const lm=SM({map:tex(world.listTexCanvas),roughness:0.9,side:THREE.DoubleSide});world.listProp=new THREE.Mesh(new THREE.PlaneGeometry(0.9,1.15),lm);world.listProp.visible=false;
}
function buildHospital(){const g=world.hosp=new THREE.Group();g.position.set(HOSP,0,0);scene.add(g);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(50,50),SM({color:'#d8dde0',roughness:0.5}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;g.add(floor);
  const wm=SM({color:'#eef2f0',roughness:0.9});box(40,22,0.5,wm,0,11,-10,g);box(0.5,22,40,wm,-14,11,0,g);
  box(8,7,0.2,SM({color:'#fff6e0',emissive:0xfff0d0,emissiveIntensity:1.2}),5,9,-9.7,g);
  box(8,1.6,4,SM({color:'#ffffff',roughness:0.8}),-6,1.8,-6,g);box(8,0.4,4,SM({color:'#9aa8b0',metalness:0.5}),-6,0.8,-6,g);box(0.4,3,4,SM({color:'#9aa8b0',metalness:0.5}),-10,2.5,-6,g);
  world.hospL=pl(0xfff0d0,1.4,40,4,10,2,g);
  // baby bundle
  const b=world.baby=new THREE.Group();scene.add(b);const bl=cst(new THREE.Mesh(new THREE.SphereGeometry(0.75,20,14),SM({color:'#bfe0ff',roughness:0.95})));bl.scale.set(1,0.75,1.5);b.add(bl);
  const hd=cst(new THREE.Mesh(new THREE.SphereGeometry(0.42,20,14),SM({color:'#f1c9a5',roughness:0.7})));hd.position.set(0,0.3,0.85);b.add(hd);
}
function buildFX(){world.stars=[];for(let i=0;i<40;i++){const s=sprite(world.T.star,0.5,scene);s.visible=false;world.stars.push(s);}
  world.puffs=[];for(let i=0;i<16;i++){const s=sprite(world.T.puff,2,scene,0.9);s.visible=false;world.puffs.push(s);}
  world.ladyGlow=sprite(world.T.magic,9,scene,0.55);world.ladyGlow.visible=false;world.ladyL=pl(0xc8a0ff,0,24,0,0,0);
  world.orb=sprite(world.T.magic,1.3,scene,1);world.orb.visible=false;}
function hideFX(){world.stars.forEach(s=>s.visible=false);world.puffs.forEach(s=>s.visible=false);world.ladyGlow.visible=false;world.ladyL.intensity=0;world.orb.visible=false;world.listProp.visible=false;world.baby.visible=false;}
function sparkleAround(c,r,t,n,h){for(let i=0;i<(n||24);i++){const s=world.stars[i];s.visible=true;const a=i*2.39996+t*0.8,rr=r*(0.4+((i*37)%10)/12),y=((t*0.6+i*0.13)%1)*(h||6);s.position.set(c.x+Math.cos(a)*rr,c.y+y-1,c.z+Math.sin(a)*rr);const k=0.25+0.35*Math.abs(Math.sin(t*5+i));s.scale.set(k,k,1);}}
function poofAt(c,k){for(let i=0;i<world.puffs.length;i++){const s=world.puffs[i];const a=i/world.puffs.length*Math.PI*2;s.visible=k<1;const r=0.4+k*2.6;s.position.set(c.x+Math.cos(a)*r,c.y+Math.sin(a)*r*0.7,c.z+0.3);const sc=1.4+k*1.6;s.scale.set(sc,sc,1);s.material.opacity=0.9*(1-k);}}

/* ---------------- characters */
function buildChars(){
  const add=(id,spec,sc)=>{const g=buildChar(spec);if(sc)g.scale.setScalar(sc);scene.add(g);g.visible=false;chars[id]=g;return g;};
  add('zash',BH.castById('leo'));add('max',BH.castById('max'),0.82);add('maxnm',BH.castById('maxnm'),0.82);add('dad',BH.castById('dadbald'));add('dadyoung',BH.castById('dad'));
  add('nana',BH.castById('nana'));add('gpa',BH.castById('gpa'));add('lady',BH.castById('wishlady'));
}
function showOnly(ids){Object.keys(chars).forEach(k=>chars[k].visible=ids.includes(k));}
function reset(P){['armL','armR','legL','legR','head'].forEach(k=>P[k].rotation.set(0,0,0));P.torso.rotation.set(0,0,0);P.torso.position.y=0;P._anim=null;P.armL.position.set(-1.5,4,0);P.armR.position.set(1.5,4,0);}
function st(id,x,y,z,ry,e){const c=chars[id];c.position.set(x,y,z);c.rotation.set(0,ry||0,0);c.visible=true;const P=c.userData.P;reset(P);if(e)P.setFace(e);return P;}
function sit(P){P.legL.rotation.x=-1.5;P.legR.rotation.x=-1.5;}
function mouth(P,who,t,e){const env=TL.mouth[who];const f=Math.round(t*TL.fps);const a=env?env[f]||0:0;P.setFace(e||P.expr||'default',{mouthOpen:a>0.12?Math.min(1,a*1.1):0});}
function lw0(o,v){let r=o;while(r.parent&&r.parent!==scene)r=r.parent;r.updateMatrixWorld(true);return o.localToWorld(v);}
const head=id=>lw0(chars[id].userData.P.head,V3(0,0.6,0));
const faceCam=(id,x,y,d)=>lw0(chars[id].userData.P.head,V3(x,0.6+y,d));
function close(id,d,x,y,fov){const hp=head(id);const sc=chars[id].scale.x;camAt(faceCam(id,x==null?0.5:x,y==null?0.05:y,(d||3.4)*1.75/sc*Math.max(1,sc)),hp.clone().add(V3(0,-0.05,0)),fov||36);}
function camAt(p,l,fov){cam.position.copy(p);cam.lookAt(l);cam.fov=fov||40;cam.updateProjectionMatrix();world.look.copy(l);}
function shake(a,t){cam.position.x+=Math.sin(t*23.1)*a+Math.sin(t*41.7)*a*0.5;cam.position.y+=Math.cos(t*19.3)*a;}
function holdList(P){P.armR.rotation.set(-1.25,0,-0.25);const L=world.listProp;P.armR.add(L);L.position.set(0,-2.05,0.35);L.rotation.set(Math.PI/2-1.25+1.2,0,0);L.visible=true;}
function lady(t,x,y,z,ry,e){const P=st('lady',x,y+Math.sin(t*2)*0.25,z,ry,e);P.armL.rotation.set(-0.4,0,0.35);P.armR.rotation.set(-0.4,0,-0.35);P.legL.rotation.x=0.2;P.legR.rotation.x=0.1;
  const c=chars.lady.position.clone();world.ladyGlow.visible=true;world.ladyGlow.position.copy(c).add(V3(0,3.5,-0.5));world.ladyL.position.copy(c).add(V3(0,5,2));world.ladyL.intensity=1.6;sparkleAround(c.clone().add(V3(0,0.5,0)),2.6,t,20,5);return P;}
// party layout
function party(t,who){const out={};if(who.includes('zash'))out.zash=st('zash',0,0,3.6,0,'happy');if(who.includes('dad'))out.dad=st('dad',-5.2,0,4.2,0.45,'happy');if(who.includes('max'))out.max=st('max',4.8,0,4.4,-0.45,'happy');
  if(who.includes('nana')){out.nana=st('nana',-11,0.9,-8.3,0.45,'happy');sit(out.nana);}if(who.includes('gpa')){out.gpa=st('gpa',-7,0.9,-8.3,0.3,'default');sit(out.gpa);}return out;}
function flames(t){world.flames.forEach((f,i)=>{const k=0.45+0.08*Math.sin(t*23+i*2)+0.05*Math.sin(t*41+i);f.scale.set(k,k*1.3,1);});}

/* ---------------- shots */
const SH={
  cake_candles:(u,t)=>{flames(t);const c=V3(0,5.6,0.3);camAt(V3(lerp(1.2,0.4,u),lerp(5.6,5.2,u),lerp(6.5,4.6,ease(u))),c.clone().add(V3(0,-0.3,0)),36);showOnly([]);S.sparkle=1;S.tag={text:'13TH BIRTHDAY',col:'#ffd23f'};},
  lady_poof:(u,t,lt)=>{flames(t);const p=party(t,['zash','dad','max']);p.zash.setFace('shocked');p.max.setFace('shocked');p.dad.setFace('shocked');const k=easeOut(lt/0.5);const L=lady(t,0,2.2,10.5,Math.PI,'happy');chars.lady.scale.setScalar(Math.max(0.01,k));
    poofAt(V3(0,6,10.5),clamp(lt/0.8,0,1));camAt(V3(8,8,17),V3(0,5.5,6.5),46);showOnly(['zash','dad','max','lady']);if(lt<0.15)S.flash=0.6;},
  rules_card:(u,t)=>{flames(t);party(t,['zash','dad','max','nana','gpa']);lady(t,0,2.2,10.5,Math.PI,'smug');camAt(V3(lerp(-6,-3,u),9,24),V3(-1,5,3),46);showOnly(['zash','dad','max','nana','gpa','lady']);S.rules=u;S.blur=1;},
  grandpa_silent:(u,t,lt)=>{flames(t);const p=party(t,['nana','gpa']);p.nana.setFace('happy',{mouthOpen:Math.abs(Math.sin(t*9))*0.7});p.nana.armL.rotation.set(-1.0,0,0.3+Math.sin(t*6)*0.1);p.nana.armR.rotation.set(-1.0,0,-0.3-Math.sin(t*6)*0.1);
    p.gpa.setFace('default',{blink:(t%2.3)<0.12});p.gpa.head.rotation.y=-0.15;camAt(V3(lerp(-6.5,-8,u),6.4,lerp(4,1.5,ease(u))),V3(-9,4.8,-8.3),40);showOnly(['nana','gpa']);if(u>0.55)S.tag={text:'SINCE 1998',col:'#ff9a3a'};},
  dad_bald:(u,t,lt)=>{flames(t);const p=party(t,['dad']);mouth(p.dad,'zash',t,'happy');p.dad.setFace('happy');close('dad',lerp(4.4,3.6,u),0.4,0.25,38);showOnly(['dad']);const ph=(lt%1.6)/1.6;S.glint={x:0.47,y:0.27,k:Math.max(0,1-Math.abs(ph-0.3)*6)};},
  list_reveal:(u,t,lt)=>{flames(t);const p=party(t,['zash']);holdList(p.zash);p.zash.setFace('happy');close('zash',lerp(5.2,4.6,u),0.2,-0.4,40);showOnly(['zash']);S.list={k:easeOut(lt/0.4),strike:0};},
  lady_close:(u,t)=>{flames(t);lady(t,0,2.2,10.5,Math.PI,'smug');close('lady',lerp(4,3.4,u),-0.3,0.05,38);showOnly(['lady']);},
  zash_sweat:(u,t)=>{flames(t);const p=party(t,['zash']);p.zash.setFace('shocked');close('zash',lerp(3.6,3.0,u),0.3,0.05,36);showOnly(['zash']);S.shakeA=0.015;},
  lady_ask:(u,t)=>{flames(t);const L=lady(t,0,2.2,10.5,Math.PI,'smug');mouth(L,'lady',t,'smug');L.armR.rotation.set(-1.6,0,-0.3);world.orb.visible=true;world.orb.position.copy(lw0(L.armR,V3(0,-2.3,0.3)));world.orb.scale.setScalar(1.2+0.2*Math.sin(t*6));
    close('lady',lerp(4.6,4.0,u),0.6,0.05,38);showOnly(['lady']);},
  list_poof:(u,t,lt)=>{flames(t);const p=party(t,['zash']);holdList(p.zash);world.listProp.visible=lt>0.25;mouth(p.zash,'zash',t,'happy');const hp=lw0(p.zash.armR,V3(0,-2.05,0.4));poofAt(hp,clamp(lt/0.7,0,1));
    close('zash',lerp(5,4.6,u),0.2,-0.3,40);showOnly(['zash']);if(lt<0.12)S.flash=0.4;},
  counter_two:(u,t,lt)=>{flames(t);const p=party(t,['zash']);holdList(p.zash);p.zash.setFace('sad');close('zash',4.8,0.2,-0.2,40);showOnly(['zash']);S.counter={from:3,to:2,k:lt};S.dim=0.35;},
  max_scream:(u,t,lt)=>{flames(t);const p=party(t,['zash','max']);p.max.setFace('angry',{mouthOpen:0.6+0.4*Math.abs(Math.sin(t*16))});p.max.armL.rotation.set(-0.3,0,0.4+Math.sin(t*14)*0.3);p.max.armR.rotation.set(-0.3,0,-0.4-Math.sin(t*14)*0.3);
    p.zash.setFace('angry');p.zash.armL.rotation.set(-2.9,0,0.7);p.zash.armR.rotation.set(-2.9,0,-0.7);camAt(V3(9,5.5,15),V3(2.5,4.5,4),42);showOnly(['zash','max']);S.shakeA=0.05;S.speed={k:0.5,col:'#ffffff'};},
  zash_yell:(u,t,lt)=>{flames(t);const p=party(t,['zash']);mouth(p.zash,'zash',t,'angry');p.zash.armR.rotation.set(-1.5,0,-0.2);close('zash',lerp(3.8,3.0,easeOut(u)),-0.4,0.05,36);showOnly(['zash']);S.speed={k:0.8,col:'#ffe0e0'};S.zoomPunch=u>0.75?1:0;},
  max_nomouth:(u,t,lt)=>{flames(t);const P=st('maxnm',4.8,0,4.4,-0.45,'shocked');P.armL.rotation.set(-2.2,0,0.3);P.armR.rotation.set(-2.2,0,-0.3);const hp=head('maxnm');poofAt(hp.clone().add(V3(0,-0.4,0.6)),clamp(lt/0.5,0,1));
    close('maxnm',lerp(4.4,3.4,ease(u)),0.2,0.05,36);showOnly(['maxnm']);S.dim=0.3;S.shakeA=0.008;if(lt<0.1)S.flash=0.4;},
  list_vs_max:(u,t,lt)=>{flames(t);const p=party(t,['zash']);holdList(p.zash);p.zash.setFace('sad');p.zash.head.rotation.y=-0.5;const M=st('maxnm',4.8,0,4.4,-0.45,'sad');camAt(V3(lerp(-3,-1,u),6.4,16),V3(2.4,4.6,4),42);showOnly(['zash','maxnm']);S.vs=easeOut(lt/0.4);},
  zash_wish:(u,t,lt)=>{flames(t);const p=party(t,['zash']);p.zash.setFace('sad',{blink:true});p.zash.armL.rotation.set(-1.4,0,0.5);p.zash.armR.rotation.set(-1.4,0,-0.5);close('zash',lerp(3.4,2.9,u),0.2,0.05,36);showOnly(['zash']);S.rays={k:1};S.sparkle=1;},
  max_back:(u,t,lt)=>{flames(t);const P=st('max',4.8,0,4.4,-0.45,'shocked');P.setFace('shocked',{mouthOpen:0.5});const hp=head('max');poofAt(hp.clone().add(V3(0,-0.4,0.6)),clamp(lt/0.5,0,1));sparkleAround(hp.clone().add(V3(0,-3,0)),1.6,t,16,4);
    close('max',lerp(3.6,3.4,u),0.3,0.05,36);showOnly(['max']);if(lt<0.12)S.flash=0.5;},
  max_angry:(u,t)=>{flames(t);const P=st('max',4.8,0,4.4,-0.45,'angry');mouth(P,'max',t,'angry');P.armL.rotation.set(0,0,0.6);P.armR.rotation.set(0,0,-0.6);close('max',lerp(3.8,3.4,u),0.3,0.05,36);showOnly(['max']);},
  lady_secret:(u,t)=>{flames(t);const L=lady(t,0,2.2,10.5,Math.PI,'default');mouth(L,'lady',t,'default');L.head.rotation.z=0.12;close('lady',lerp(4.2,3.2,ease(u)),0.4,0.0,36);showOnly(['lady']);S.dim=0.15;},
  flash_baby:(u,t,lt)=>{const D=st('dadyoung',HOSP-1,0,-2,0.4,'happy');D.armL.rotation.set(-1.2,0,0.45);D.armR.rotation.set(-1.2,0,-0.45);D.head.rotation.x=0.35;const b=world.baby;b.visible=true;b.position.copy(lw0(D.torso,V3(0,3.0,1.4)));b.rotation.set(0,0.4,0);
    const L=lady(t,HOSP+4,2.5,1,-1.2,'happy');camAt(V3(HOSP+lerp(5,3,u),6.5,lerp(13,10,u)),V3(HOSP+1,5,-1),42);showOnly(['dadyoung','lady']);S.flashback=1;S.tag={text:'13 YEARS AGO',col:'#fff3d0'};},
  zash_dad:(u,t)=>{flames(t);const Z=st('zash',0,0,3.6,-0.6,'sad');Z.head.rotation.x=-0.15;const D=st('dad',-3,0,3.2,0.8,'happy');D.armL.rotation.set(-1.0,0,1.2);camAt(V3(lerp(2,1,u),5.6,13),V3(-1.4,5.2,3.4),40);showOnly(['zash','dad']);},
  dad_bald_end:(u,t,lt)=>{flames(t);const D=st('dad',-3,0,3.2,0.4,'happy');mouth(D,'dad',t,'happy');D.armR.rotation.set(-2.8,0.3,-0.9+Math.sin(t*6)*0.12);close('dad',lerp(4.0,3.6,u),0.3,0.25,38);showOnly(['dad']);
    const ph=(lt%1.4)/1.4;S.glint={x:0.47,y:0.27,k:Math.max(0,1-Math.abs(ph-0.5)*6)};S.black=clamp((lt-1.7)/0.55,0,1);},
};

/* ---------------- 2D overlays */
function T(text,x,y,size,fill,stroke,lw,align){og.font=`${size}px ${FONT}`;og.textAlign=align||'center';og.textBaseline='middle';og.lineJoin='round';if(stroke){og.lineWidth=lw||size*0.18;og.strokeStyle=stroke;og.strokeText(text,x,y);}og.fillStyle=fill;og.fillText(text,x,y);}
function RR(x,y,w,h,r){og.beginPath();og.moveTo(x+r,y);og.arcTo(x+w,y,x+w,y+h,r);og.arcTo(x+w,y+h,x,y+h,r);og.arcTo(x,y+h,x,y,r);og.arcTo(x,y,x+w,y,r);og.closePath();}
function star2(x,y,s){og.beginPath();og.moveTo(x,y-s*2);og.lineTo(x+s*0.4,y-s*0.4);og.lineTo(x+s*2,y);og.lineTo(x+s*0.4,y+s*0.4);og.lineTo(x,y+s*2);og.lineTo(x-s*0.4,y+s*0.4);og.lineTo(x-s*2,y);og.lineTo(x-s*0.4,y-s*0.4);og.closePath();og.fill();}
function drawSparkle(t){const r=rng('spk');og.save();og.fillStyle='rgba(255,245,220,0.9)';for(let i=0;i<16;i++){const x=r()*W,y=r()*H*0.65,ph=r()*6,s=W*(0.008+r()*0.014)*(0.5+0.5*Math.sin(t*6+ph));star2(x,y,s);}og.restore();}
function drawRules(u){const k=easeOut(u*2.5);og.save();og.globalAlpha=k;og.translate(W/2,H*0.36);og.rotate(-0.03);og.scale(lerp(0.8,1,k),lerp(0.8,1,k));const w=W*0.82,h=H*0.3;og.fillStyle='#fbf3dc';og.shadowColor='rgba(0,0,0,0.5)';og.shadowBlur=W*0.04;RR(-w/2,-h/2,w,h,W*0.03);og.fill();og.shadowBlur=0;
  T('THE RULES',0,-h*0.32,W*0.085,'#5b3fa8');const lines=['NO WISHING FOR MORE WISHES','NO TAKE-BACKS'];lines.forEach((l,i)=>{const a=clamp(u*3-0.6-i*0.6,0,1);og.globalAlpha=k*a;T('✗',-w*0.38,h*(0.02+i*0.24),W*0.07,'#e0304a');T(l,w*0.05,h*(0.02+i*0.24),W*0.05,'#2a1f3a');});og.restore();}
function drawList(L){const k=L.k;og.save();og.globalAlpha=k;og.translate(W*0.5,H*0.3);og.rotate(-0.05);og.scale(lerp(0.6,1,k),lerp(0.6,1,k));const w=W*0.62,h=w*1.25;og.shadowColor='rgba(0,0,0,0.5)';og.shadowBlur=W*0.04;og.drawImage(world.listTexCanvas,-w/2,-h/2,w,h);og.restore();}
function drawCounter(c){const k=c.k;og.save();og.translate(W/2,H*0.3);const s=W*0.4;og.fillStyle='rgba(20,10,40,0.85)';RR(-s*0.8,-s*0.55,s*1.6,s*1.1,W*0.04);og.fill();T('WISHES LEFT',0,-s*0.33,W*0.06,'#d8c8ff');
  const flip=clamp((k-0.35)/0.3,0,1);const num=flip<0.5?c.from:c.to;og.save();og.scale(1,Math.abs(1-flip*2)||0.02);T(String(num),0,s*0.12,W*0.26,flip<0.5?'#ffd23f':'#ff5a5a','#000',W*0.02);og.restore();
  if(k>0.4&&k<0.6){og.fillStyle=`rgba(255,255,255,${1-(k-0.4)/0.2})`;og.fillRect(-s*0.8,-s*0.55,s*1.6,s*1.1);}og.restore();}
function drawVS(k){og.save();og.globalAlpha=k;T('RICH. TALL. FAMOUS.',W*0.5,H*0.14,W*0.065,'#ffd23f','#0a0a12');T('OR',W*0.5,H*0.21,W*0.09,'#ffffff','#0a0a12');T('MAX',W*0.5,H*0.28,W*0.09,'#7fd3ff','#0a0a12');og.restore();}
function drawRays(k,t){og.save();og.globalCompositeOperation='screen';const cx=W*0.5,cy=H*0.33;for(let i=0;i<14;i++){const a=i/14*Math.PI*2+t*0.25;og.fillStyle=`rgba(255,220,170,${0.07*k})`;og.beginPath();og.moveTo(cx,cy);og.arc(cx,cy,H,a,a+0.12);og.closePath();og.fill();}
  const gr=og.createRadialGradient(cx,cy,0,cx,cy,W*0.5);gr.addColorStop(0,`rgba(255,230,190,${0.35*k})`);gr.addColorStop(1,'rgba(255,230,190,0)');og.fillStyle=gr;og.fillRect(0,0,W,H);og.restore();}
function drawSpeed(sp,t){const r=rng('sp'+Math.floor(t*30));og.save();og.translate(W/2,H/2);og.strokeStyle=sp.col;for(let i=0;i<60;i++){const a=r()*Math.PI*2,r0=H*(0.3+r()*0.1),r1=H*(0.75+r()*0.2);og.globalAlpha=sp.k*(0.25+r()*0.4);og.lineWidth=W*(0.002+r()*0.005);og.beginPath();og.moveTo(Math.cos(a)*r0,Math.sin(a)*r0);og.lineTo(Math.cos(a)*r1,Math.sin(a)*r1);og.stroke();}og.restore();}
function drawOverlays(t){
  if(S.dim){og.fillStyle=`rgba(10,5,25,${S.dim})`;og.fillRect(0,0,W,H);}
  if(S.flashback){const vg=og.createRadialGradient(W/2,H*0.45,H*0.2,W/2,H/2,H*0.7);vg.addColorStop(0,'rgba(255,250,235,0)');vg.addColorStop(1,'rgba(255,244,220,0.85)');og.fillStyle=vg;og.fillRect(0,0,W,H);}
  if(S.rays)drawRays(S.rays.k,t);
  if(S.speed)drawSpeed(S.speed,t);
  if(S.sparkle)drawSparkle(t);
  if(S.glint&&S.glint.k>0){og.save();og.fillStyle=`rgba(255,255,255,${S.glint.k})`;star2(W*S.glint.x,H*S.glint.y,W*0.035*S.glint.k);og.restore();}
  if(S.rules!=null)drawRules(S.rules);
  if(S.list)drawList(S.list);
  if(S.counter)drawCounter(S.counter);
  if(S.vs)drawVS(S.vs);
  if(S.tag){og.font=`${W*0.05}px ${FONT}`;const tw=og.measureText(S.tag.text).width+W*0.08;og.save();og.translate(W/2,H*0.1);og.rotate(-0.03);og.fillStyle='rgba(0,0,0,0.7)';RR(-tw/2,-H*0.026,tw,H*0.052,H*0.02);og.fill();T(S.tag.text,0,0,W*0.05,S.tag.col);og.restore();}
  const vg=og.createRadialGradient(W/2,H*0.48,H*0.32,W/2,H/2,H*0.78);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(20,5,20,0.35)');og.fillStyle=vg;og.fillRect(0,0,W,H);
  if(S.flash>0){og.fillStyle=`rgba(255,250,240,${S.flash})`;og.fillRect(0,0,W,H);}
  if(S.black>0){og.fillStyle=`rgba(0,0,0,${S.black})`;og.fillRect(0,0,W,H);}
}
function captionAt(t){for(const s of TL.segs){for(let i=0;i<s.words.length;i++){const w=s.words[i];const nx=s.words[i+1];const end=nx?nx.s:Math.min(w.e+0.25,s.end+0.25);if(t>=w.s&&t<end)return {w,since:t-w.s,who:s.who};}}return null;}
function drawCaption(t){const c=captionAt(t);if(!c)return;const text=c.w.w.toUpperCase();const base=W*0.11*(text.length>8?8/text.length*1.05:1);const k=c.since<0.06?lerp(1.25,1,c.since/0.06):1;
  og.save();og.translate(W/2,H*0.7);og.scale(k,k);og.font=`${base}px ${FONT}`;og.textAlign='center';og.textBaseline='middle';og.lineJoin='round';og.shadowColor='rgba(0,0,0,0.6)';og.shadowBlur=base*0.25;og.lineWidth=base*0.22;og.strokeStyle='#0a0a12';og.strokeText(text,0,0);og.shadowColor='transparent';
  og.fillStyle=c.w.red?'#ffd23f':(c.who==='lady'?'#d8c0ff':c.who==='max'?'#8fd8ff':c.who==='dad'?'#ffb070':'#ffffff');og.fillText(text,0,0);og.restore();}

/* ---------------- entry points */
S.init=async function(timeline,w,h,fontUrl){TL=timeline;W=w;H=h;SS=window.BH_SS||1.25;
  const ff=new FontFace('Luckiest Guy',`url(${fontUrl})`);await ff.load();document.fonts.add(ff);
  R=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});R.setPixelRatio(1);R.setSize(Math.round(W*SS),Math.round(H*SS));R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.15;R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
  cam=new THREE.PerspectiveCamera(40,W/H,0.1,1000);
  buildWorld();buildChars();
  const [oc,o2]=cv(W,H);out=oc;og=o2;og.imageSmoothingEnabled=true;og.imageSmoothingQuality='high';scene.updateMatrixWorld(true);return true;};
const KEYS=['flash','tag','black','shakeA','zoomPunch','speed','rays','sparkle','dim','glint','rules','list','counter','vs','flashback','blur'];
S.frame=function(f,q){const t=f/TL.fps;const shot=TL.shots.find(s=>t>=s.s&&t<s.e)||TL.shots[TL.shots.length-1];
  KEYS.forEach(k=>S[k]=null);hideFX();
  if(shot!==curShot){curShot=shot;showOnly([]);}
  Object.values(chars).forEach(c=>{c.rotation.set(0,0,0);});chars.lady.scale.setScalar(1);
  world.balloons.forEach((b,i)=>{b.position.y=11+((i*7)%3)+Math.sin(t*1.2+i)*0.25;});
  const u=(t-shot.s)/(shot.e-shot.s),lt=t-shot.s;scene.updateMatrixWorld(true);
  (SH[shot.name]||SH.dad_bald_end)(u,t,lt);
  if(S.shakeA)shake(S.shakeA,t);
  world.key.target.position.copy(world.look);world.key.position.copy(world.look).addScaledVector(world.keyDir,60);
  scene.updateMatrixWorld(true);R.render(scene,cam);
  og.globalAlpha=1;og.globalCompositeOperation='source-over';og.filter=S.flashback?'sepia(0.45) contrast(0.95) brightness(1.08) saturate(0.9)':S.blur?'blur(3px) brightness(0.8) saturate(1.1)':'contrast(1.05) saturate(1.18)';
  if(S.zoomPunch){const z=1+0.07*S.zoomPunch;og.drawImage(R.domElement,(W-W*z)/2,(H-H*z)/2,W*z,H*z);}else og.drawImage(R.domElement,0,0,W,H);
  og.filter=`blur(${Math.round(W*0.014)}px) brightness(1.15)`;og.globalCompositeOperation='screen';og.globalAlpha=0.2;og.drawImage(R.domElement,0,0,W,H);og.filter='none';og.globalCompositeOperation='source-over';og.globalAlpha=1;
  drawOverlays(t);drawCaption(t);
  return out.toDataURL('image/jpeg',q||0.94);};
})();
