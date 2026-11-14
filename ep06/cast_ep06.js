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
