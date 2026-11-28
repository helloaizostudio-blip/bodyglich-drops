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
