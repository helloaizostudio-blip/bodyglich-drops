/* Episode 10 "Don't Answer The Skinwalker": original characters (Leo, the "sister", Grandpa). The creature is built in scene_src.js. */
(function(){
const SPECS=[
 {id:'leo10',name:'Leo',role:'Narrator (horror)',group:'Ep10',origin:'original',skin:'#e6b48c',hair:{style:'messy',color:'#17110e'},
  face:{eyeShape:'almond',eyes:'dot',eyeScale:0.85,eyeColor:'#3a2a1a',brows:'normal',mouth:'flat',nose:'button'},
  torso:{inner:'#cfd2d8',outer:{style:'hoodie',color:'#2c3240',fabric:'fleece',strings:'#e8e8e8'}},sleeves:{color:'#2c3240',len:'full',fabric:'fleece'},pants:{color:'#3a3f4a',fabric:'cotton',shoes:'#d8d8d8'}},
 {id:'sis10',name:'"Sister"',role:'Not his sister',group:'Ep10',origin:'original',skin:'#ecc6a2',hair:{style:'ponytail',color:'#1b1414',tie:'#e86a8a'},
  face:{eyeShape:'round',eyes:'dot',eyeScale:0.9,eyeColor:'#1a1010',brows:'arched',mouth:'smile',nose:'button',lashes:true},
  torso:{inner:'#f2b8c8',pattern:'stripes',patternColor:'#f8d8e2'},sleeves:{color:'#f2b8c8',len:'full'},pants:{color:'#f2b8c8',pattern:'stripes',patternColor:'#f8d8e2',shoes:'#ecc6a2'}},
 {id:'gpa10',name:'Grandpa',role:'Cabin owner',group:'Ep10',origin:'original',skin:'#e2b896',hair:{style:'sides',color:'#ececec'},
  face:{eyeShape:'sleepy',eyes:'tired',brows:'bushy',browColor:'#dcdcdc',mouth:'flat',glasses:'round',beard:'short',beardColor:'#e4e4e4',age:'old'},
  torso:{inner:'#6a2a2a',pattern:'check',patternColor:'#3a1414',collar:true},sleeves:{color:'#6a2a2a',len:'rolled',pattern:'check',patternColor:'#3a1414'},pants:{color:'#3a3a40',fabric:'denim',shoes:'#3a2a1e',shoeStyle:'boot'}},
];
SPECS.forEach(s=>{const i=CAST.findIndex(c=>c.id===s.id);if(i>=0)CAST[i]=s;else CAST.push(s);});
})();
