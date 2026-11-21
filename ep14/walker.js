function skinTex(){return canvasTex(256,256,(g,w,h)=>{g.fillStyle='#b8b2a8';g.fillRect(0,0,w,h);const r=rng('wsk');for(let i=0;i<220;i++){g.fillStyle=`rgba(${60+r()*40},${50+r()*30},${50+r()*30},${0.05+r()*0.12})`;g.beginPath();g.ellipse(r()*w,r()*h,4+r()*20,2+r()*10,r()*3,0,7);g.fill();}
  g.strokeStyle='rgba(70,50,60,0.25)';g.lineWidth=1.2;for(let i=0;i<40;i++){let x=r()*w,y=r()*h;g.beginPath();g.moveTo(x,y);for(let k=0;k<5;k++){x+=(r()-0.5)*30;y+=r()*24;g.lineTo(x,y);}g.stroke();}});}
function walkerFaceTex(){return canvasTex(256,512,(g,w,h)=>{g.fillStyle='#c4beb4';g.fillRect(0,0,w,h);const sg=g.createLinearGradient(0,0,0,h);sg.addColorStop(0,'rgba(0,0,0,0.25)');sg.addColorStop(0.5,'rgba(0,0,0,0)');sg.addColorStop(1,'rgba(0,0,0,0.3)');g.fillStyle=sg;g.fillRect(0,0,w,h);
  const cx=w/2;
  // long hollow eye sockets
  [-1,1].forEach(s=>{const gr=g.createRadialGradient(cx+s*52,170,4,cx+s*52,175,58);gr.addColorStop(0,'#000');gr.addColorStop(0.7,'#0a0606');gr.addColorStop(1,'rgba(40,20,20,0)');g.fillStyle=gr;g.beginPath();g.ellipse(cx+s*52,175,34,62,s*0.12,0,7);g.fill();
    g.fillStyle='#f4f0e0';g.beginPath();g.arc(cx+s*50,180,4.5,0,7);g.fill();});
  // stretched grin with too many teeth
  g.fillStyle='#120808';g.beginPath();g.moveTo(cx-104,330);g.quadraticCurveTo(cx,420,cx+104,330);g.quadraticCurveTo(cx,366,cx-104,330);g.fill();
  g.fillStyle='#e8e0c8';for(let i=0;i<22;i++){const t=i/21,x=cx-96+t*192,yy=332+Math.sin(t*Math.PI)*22;g.beginPath();g.moveTo(x-4,yy);g.lineTo(x+4,yy);g.lineTo(x,yy+12+Math.sin(t*Math.PI)*8);g.closePath();g.fill();}
  g.strokeStyle='rgba(60,30,30,0.45)';g.lineWidth=2;[[-104,330,-120,300],[104,330,120,300]].forEach(([a,b,c2,d])=>{g.beginPath();g.moveTo(cx+a,b);g.lineTo(cx+c2,d);g.stroke();});
  g.strokeStyle='rgba(50,30,30,0.35)';g.lineWidth=1.5;const r=rng('fc');for(let i=0;i<14;i++){let x=cx+(r()-0.5)*200,y=40+r()*120;g.beginPath();g.moveTo(x,y);for(let k=0;k<4;k++){x+=(r()-0.5)*20;y+=r()*18;g.lineTo(x,y);}g.stroke();}});}
function seg(len,th,mat){const g=new THREE.Group();const m=cst(new THREE.Mesh(new THREE.CylinderGeometry(th*0.85,th,len,10),mat));m.position.y=-len/2;g.add(m);const j=cst(new THREE.Mesh(new THREE.SphereGeometry(th*1.08,10,8),mat));g.add(j);g.userData.len=len;return g;}
function makeHand(mat,scale){const h=new THREE.Group();const palm=cst(new THREE.Mesh(new THREE.BoxGeometry(0.75,1.0,0.28),mat));palm.position.y=-0.5;h.add(palm);h.userData.fingers=[];
  for(let i=0;i<4;i++){let par=h;const base=new THREE.Group();base.position.set(-0.3+i*0.2,-1.0,0);h.add(base);par=base;const f=[];for(let k=0;k<4;k++){const s=seg(0.95-k*0.12,0.07,mat);s.position.y=k?-par.userData.len:0;par.add(s);f.push(s);par=s;}h.userData.fingers.push(f);}
  const th=seg(0.8,0.08,mat);th.position.set(0.42,-0.4,0.1);th.rotation.z=-0.8;h.add(th);h.scale.setScalar(scale||1);return h;}
function curl(hand,k,spread){hand.userData.fingers.forEach((f,i)=>{f.forEach((s,j)=>{s.rotation.x=k*(0.35+j*0.12);s.rotation.z=j===0?(i-1.5)*(spread||0.12):0;});});}
function makeWalker(){const mat=SM({map:skinTex(),roughness:0.88,color:0xffffff});const g=new THREE.Group();const P={};
  const hips=new THREE.Group();hips.position.y=9.6;g.add(hips);P.hips=hips;cst(new THREE.Mesh(new THREE.BoxGeometry(1.6,0.9,0.9),mat)).position.set(0,0,0);hips.add(hips.children[0]||new THREE.Object3D());
  const pel=cst(new THREE.Mesh(new THREE.BoxGeometry(1.6,0.9,0.9),mat));hips.add(pel);
  [-1,1].forEach(s=>{const th=seg(4.9,0.33,mat);th.position.set(s*0.6,0,0);hips.add(th);const sh=seg(4.9,0.26,mat);sh.position.y=-4.9;th.add(sh);const ft=cst(new THREE.Mesh(new THREE.BoxGeometry(0.5,0.3,1.7),mat));ft.position.set(0,-4.9,0.5);sh.add(ft);P[s<0?'thL':'thR']=th;P[s<0?'shL':'shR']=sh;});
  const torso=new THREE.Group();hips.add(torso);P.torso=torso;const chest=cst(new THREE.Mesh(new THREE.BoxGeometry(1.7,5.8,1.0),mat));chest.position.y=2.9;torso.add(chest);
  for(let i=0;i<6;i++){const rib=new THREE.Mesh(new THREE.BoxGeometry(1.74,0.08,1.04),SM({color:'#8a8378',roughness:0.9}));rib.position.y=3.0+i*0.42;torso.add(rib);}
  const neck=new THREE.Group();neck.position.y=5.8;torso.add(neck);P.neck=neck;const nk=cst(new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.34,1.8,10),mat));nk.position.y=0.9;neck.add(nk);
  const headG=new THREE.Group();headG.position.y=1.8;neck.add(headG);P.head=headG;
  const fmat=[mat,mat,mat,mat,SM({map:walkerFaceTex(),roughness:0.85}),mat];const hd=cst(new THREE.Mesh(new THREE.BoxGeometry(1.35,2.6,1.25),fmat));hd.position.y=1.15;headG.add(hd);
  [-1,1].forEach(s=>{const sh=new THREE.Group();sh.position.set(s*1.0,5.4,0);torso.add(sh);const up=seg(4.8,0.24,mat);sh.add(up);const fo=seg(5.4,0.2,mat);fo.position.y=-4.8;up.add(fo);const hn=makeHand(mat,1.0);hn.position.y=-5.4;fo.add(hn);
    P[s<0?'shoL':'shoR']=sh;P[s<0?'upL':'upR']=up;P[s<0?'foL':'foR']=fo;P[s<0?'handL':'handR']=hn;});
  g.userData.P=P;scene.add(g);g.visible=false;return g;}
function wReset(){const P=world.walker.userData.P;[P.hips,P.torso,P.neck,P.head,P.thL,P.thR,P.shL,P.shR,P.shoL,P.shoR,P.upL,P.upR,P.foL,P.foR,P.handL,P.handR].forEach(o=>o.rotation.set(0,0,0));P.hips.position.set(0,9.6,0);world.walker.rotation.set(0,0,0);curl(P.handL,0.3);curl(P.handR,0.3);return P;}
function wStand(x,y,z,ry,t,opt){opt=opt||{};const g=world.walker;g.visible=true;g.position.set(x,y,z);const P=wReset();g.rotation.y=ry||0;
  P.torso.rotation.x=0.22;P.neck.rotation.x=0.25;P.head.rotation.z=(opt.tilt==null?0.35:opt.tilt)+Math.sin(t*0.7)*0.05;P.head.rotation.x=opt.headX||-0.15;
  P.thL.rotation.x=-0.18;P.thR.rotation.x=0.05;P.shL.rotation.x=0.3;P.shR.rotation.x=0.15;
  P.upL.rotation.set(0.05+Math.sin(t*0.9)*0.04,0,-0.08);P.upR.rotation.set(-0.05,0,0.08);P.foL.rotation.x=-0.1;P.foR.rotation.x=-0.25;return P;}
function wHead(){return lw0(world.walker.userData.P.head,V3(0,1.2,0.6));}