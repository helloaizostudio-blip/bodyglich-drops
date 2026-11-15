/* Episode 12 "The Cursed Grimoire": original fantasy-village cast. Zash (before/after training), brother Kai,
   the fire kid, Brick, Mom, villagers and the fire knight from the monster realm (built on the buff body). */
(function(){
const J=o=>JSON.parse(JSON.stringify(o));
const zash={id:'zash12',name:'Zash',role:'Narrator, zero magic',group:'Ep12',origin:'original',skin:'#e8b98f',hair:{style:'anime',color:'#2e1d14'},
  face:{eyeShape:'almond',eyes:'dot',eyeScale:0.85,eyeColor:'#5a3a22',brows:'normal',mouth:'smile',nose:'button'},
  torso:{inner:'#efe6d2',outer:{style:'waistcoat',color:'#7a5230'},belt:'#3a2416'},sleeves:{color:'#efe6d2',len:'rolled'},pants:{color:'#4a4238',fabric:'canvas',shoes:'#3a2a1e',shoeStyle:'boot'},extras:['wristband:#c0392b']};
const zb=Object.assign(J(zash),{id:'zashbuff12',body:'buff'});zb.sleeves={len:'none'};zb.torso={inner:'#efe6d2',belt:'#3a2416'};zb.face.brows='thick';
const kai={id:'kai12',name:'Kai',role:'The blessed brother',group:'Ep12',origin:'original',skin:'#ecc6a2',hair:{style:'swept',color:'#d8b45a'},
  face:{eyeShape:'sharp',eyes:'dot',eyeColor:'#3a6ad8',brows:'arched',mouth:'flat',nose:'button'},
  torso:{inner:'#f4f2ee',collar:true,outer:{style:'cloak',color:'#2f4a8a'}},sleeves:{color:'#f4f2ee',len:'full',cuff:'#d8b45a'},pants:{color:'#2a2f44',fabric:'wool',shoes:'#3a2a1e',shoeStyle:'boot'}};
const fantasy=(base,id,inner,outer,hairc)=>{const c=J(BH.castById(base));c.id=id;delete c.hat;c.extras=[];c.torso={inner:inner,outer:outer?{style:'waistcoat',color:outer}:undefined,belt:'#3a2416'};if(!outer)delete c.torso.outer;c.sleeves={color:inner,len:'rolled'};c.pants={color:'#4a4238',fabric:'canvas',shoes:'#3a2a1e',shoeStyle:'boot'};if(hairc)c.hair.color=hairc;if(c.face)delete c.face.glasses;return c;};
const knight={id:'knight12',name:'Fire Knight',role:'From the monster realm',group:'Ep12',origin:'original',body:'buff',skin:'#3a2c2c',hair:{style:'bald',color:'#111'},ears:false,
  face:{eyeShape:'sharp',eyes:'dot',eyeColor:'#ff5a1a',brows:'angry',mouth:'gritted',nose:'none'},
  torso:{inner:'#241414',fabric:'leather',belt:'#8a2a10'},sleeves:{color:'#241414',len:'full',cuff:'#c0501a',fabric:'leather'},pants:{color:'#1c1212',fabric:'leather',shoes:'#0e0808',shoeStyle:'boot'},extras:['gloves:#3a1a10']};
[zash,zb,kai,knight,fantasy('brick','brick12','#6a3a3a','#3a2a2a'),fantasy('rex','firekid12','#c0452a','#5a2418','#a8301a'),fantasy('mom','mom12','#b5545c','#6a4a3a'),
 fantasy('dave','v0','#7a8a5a','#4a3a2a'),fantasy('mia','v1','#8a6aa8',null),fantasy('theo','v2','#5a7a9a','#3a3a44'),fantasy('nana','v3','#a88a6a',null),fantasy('kip','v4','#6a9a8a',null),fantasy('sora','v5','#c8a85a',null)]
 .forEach(s=>{const i=CAST.findIndex(c=>c.id===s.id);if(i>=0)CAST[i]=s;else CAST.push(s);});
})();
