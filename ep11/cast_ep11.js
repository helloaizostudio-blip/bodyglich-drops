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
