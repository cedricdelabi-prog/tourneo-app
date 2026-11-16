const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');const cache=new Map();function load(file){if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(id=>id.startsWith('@/')?load(id.slice(2)+'.ts'):require(id),m,m.exports);return m.exports;}
const {preparerEdition}=load('lib/prochaine-edition.ts');
const {OPTIONS_V2}=load('lib/options-v2.ts');
const source={sport:'petanque',formatTournoi:'poulesFinale',modePoules:'taillePoules',nombrePoules:4,taillePoules:3,qualifiesParPoule:2,optionsV2:{...OPTIONS_V2,depart:'2026-11-15T14:00',rappelAvant:30,lieu:'Calais',terrains:3,exemptions:[{id:'old',ronde:1}],adaptationPlanning:{debutMinimum:60,terrainsFermes:[1],fixes:[]}},equipes:[{id:'inscription:old',nom:'Alex',emoji:'🏅',couleur:'#123456',profilId:'account',photo:'private.jpg',position:3,poule:1,historique:[{nom:'Ancien'}],joueurs:['Alice'],capitaine:'Alice'}],matchs:[{score1:'13'}],token:'private',partage:true};
const before=JSON.stringify(source);let n=0;
const copie=preparerEdition(source,true,()=>`new-${++n}`);
assert.equal(JSON.stringify(source),before,'original tournament must be untouched');
assert.equal(copie.optionsV2.terrains,3);assert.equal(copie.optionsV2.lieu,'Calais');
assert.equal(copie.optionsV2.depart,'');assert.equal(copie.optionsV2.rappelAvant,0);assert.deepEqual(copie.optionsV2.exemptions,[]);assert.equal(copie.optionsV2.adaptationPlanning,undefined);
assert.deepEqual(copie.matchs,[]);assert.deepEqual(copie.matchsValides,[]);assert.deepEqual(copie.poules,[]);assert.equal(copie.cree,false);assert.equal(copie.termine,false);
assert.equal(copie.token,undefined);assert.equal(copie.partage,undefined);
assert.equal(copie.equipes[0].id,'new-1');assert.equal(copie.equipes[0].profilId,'account');assert.equal(copie.equipes[0].photo,undefined);assert.equal(copie.equipes[0].historique,undefined);assert.equal(copie.equipes[0].position,undefined);assert.equal(copie.equipes[0].poule,undefined);
copie.equipes[0].joueurs.push('Bob');assert.deepEqual(source.equipes[0].joueurs,['Alice']);
assert.deepEqual(preparerEdition(source,false,()=>{throw Error('unused');}).equipes,[]);
console.log('Prochaine édition : brouillon privé, modèle conservé, date/rappels/planning réinitialisés, données privées et résultats exclus, participants facultatifs et indépendants : OK');
