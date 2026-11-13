/* Episode 8 "The Worst Cursed Fruit": original pirate crew (anime-adventure inspired, not copied).
   Loaded after builder.js + cast.js; adds specs to CAST so scenes can use BH.castById('mako') etc. */
(function(){
const SPECS=[
 {id:'mako',name:'Mako',role:'Rowboat Captain',group:'Ep8',origin:'original',
  skin:'#e3ad80',hair:{style:'anime',color:'#17323a'},
  face:{eyeShape:'round',eyes:'big',eyeColor:'#2b6f8a',brows:'thick',mouth:'grin',nose:'button',bandage:true},
  torso:{inner:'#f6c945',outer:{style:'open',color:'#f4f1e8',fabric:'cotton'}},
  sleeves:{color:'#f4f1e8',len:'short'},pants:{color:'#2c4a73',style:'shorts',fabric:'canvas',shoes:'#8a5a32',shoeStyle:'flat'},
  extras:['wristband:#e2453a']},
 {id:'pip',name:'Pip',role:'Navigator',group:'Ep8',origin:'original',
  skin:'#f1cfae',hair:{style:'bob',color:'#9a7fd1'},
  face:{eyeShape:'sleepy',eyes:'dot',eyeColor:'#4a3a78',brows:'arched',mouth:'smile',nose:'button',freckles:true,lashes:true},
  torso:{inner:'#f6efe2',pattern:'stripes',patternColor:'#e0664f'},
  sleeves:{color:'#f6efe2',len:'short',cuff:'#e0664f'},pants:{color:'#6f7a3a',style:'shorts',fabric:'canvas',shoes:'#6a3a24',shoeStyle:'boot'},
  extras:['map']},
 {id:'basil',name:'Basil',role:'The Cook (can\'t cook)',group:'Ep8',origin:'original',
  skin:'#e6bb94',hair:{style:'emo',color:'#c9ced6'},
  face:{eyeShape:'droopy',eyes:'dot',eyeColor:'#2f6b4f',brows:'normal',mouth:'smirk',nose:'button'},
  torso:{inner:'#f4f2ec',collar:true,outer:{style:'waistcoat',color:'#2f5a46'}},
  sleeves:{color:'#f4f2ec',len:'rolled'},pants:{color:'#23262b',fabric:'twill',shoes:'#3a2a1e',shoeStyle:'dress'},
  extras:['apron:#f2f0ea','spoon']},
 {id:'crate',name:'Crate',role:'The Strongman (wears a box)',group:'Ep8',origin:'original',body:'buff',
  skin:'#d8a77a',hair:{style:'anime',color:'#d9682c'},
  face:{eyeShape:'wide',eyes:'dot',eyeColor:'#5a3a22',brows:'thick',mouth:'grin',nose:'button'},
  torso:{inner:'#c49460',fabric:'canvas',graphic:{shape:'text',text:'FRAGILE',color:'#7a4a22',size:17}},
  sleeves:{len:'none'},pants:{color:'#c49460',fabric:'canvas',shoes:'#5a3a22',shoeStyle:'boot'},
  extras:['wristband:#7a4a22']},
 {id:'gorr',name:'Captain Gorr',role:'The Billion-Coin Pirate',group:'Ep8',origin:'original',body:'buff',
  skin:'#c98b62',hair:{style:'buzz',color:'#141212'},hat:{style:'captain',color:'#18181c'},
  face:{eyeShape:'sharp',eyes:'sharp',eyeColor:'#8a1f1f',brows:'angry',mouth:'smirk',nose:'wide',beard:'full',beardColor:'#141212',scar:'l'},
  torso:{inner:'#16161a',outer:{style:'coat2',color:'#6a1a20',length:'long'}},
  sleeves:{color:'#6a1a20',len:'full',cuff:'#c9a227'},pants:{color:'#2a2622',fabric:'leather',shoes:'#141212',shoeStyle:'boot'},
  extras:['gloves:#8d939c']},
];
SPECS.forEach(s=>{const i=CAST.findIndex(c=>c.id===s.id);if(i>=0)CAST[i]=s;else CAST.push(s);});
})();
