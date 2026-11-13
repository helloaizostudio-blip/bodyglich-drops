/* Episode 8 "The Worst Cursed Fruit": original pirate crew (anime-adventure inspired, not copied).
   Loaded after builder.js + cast.js; adds specs to CAST so scenes can use BH.castById('mako') etc. */
(function(){
const SPECS=[
 {id:'mako',name:'Mako',role:'Rowboat Captain',group:'Ep8',origin:'original',
  skin:'#e3ad80',hair:{style:'spiky',color:'#17323a'},hat:{style:'headband',color:'#e2453a'},
  face:{eyes:'big',eyeColor:'#2b6f8a',brows:'thick',mouth:'grin',nose:'button',bandage:true},
  torso:{inner:'#f6c945',outer:{style:'open',color:'#f4f1e8',fabric:'cotton'}},
  sleeves:{color:'#f4f1e8',len:'short'},pants:{color:'#2c4a73',style:'shorts',fabric:'canvas',shoes:'#8a5a32',shoeStyle:'flat'},
  extras:['wristband:#e2453a']},
 {id:'pip',name:'Pip',role:'Navigator',group:'Ep8',origin:'original',
  skin:'#f1cfae',hair:{style:'bun',color:'#9a7fd1'},
  face:{eyes:'big',eyeColor:'#4a3a78',brows:'arched',mouth:'smile',nose:'button',freckles:true,lashes:true},
  torso:{inner:'#f7f4ee',outer:{style:'fieldjacket',color:'#3f7fb8'}},
  sleeves:{color:'#3f7fb8',len:'rolled'},pants:{color:'#c79a5a',fabric:'canvas',cargo:true,shoes:'#5a3a22',shoeStyle:'boot'},
  extras:['map']},
 {id:'gorr',name:'Captain Gorr',role:'The Billion-Coin Pirate',group:'Ep8',origin:'original',body:'buff',
  skin:'#c98b62',hair:{style:'buzz',color:'#141212'},hat:{style:'captain',color:'#18181c'},
  face:{eyes:'sharp',eyeColor:'#8a1f1f',brows:'angry',mouth:'smirk',nose:'wide',beard:'full',beardColor:'#141212',scar:'l'},
  torso:{inner:'#16161a',outer:{style:'coat2',color:'#6a1a20',length:'long'}},
  sleeves:{color:'#6a1a20',len:'full',cuff:'#c9a227'},pants:{color:'#2a2622',fabric:'leather',shoes:'#141212',shoeStyle:'boot'},
  extras:['gloves:#8d939c']},
];
SPECS.forEach(s=>{const i=CAST.findIndex(c=>c.id===s.id);if(i>=0)CAST[i]=s;else CAST.push(s);});
})();
