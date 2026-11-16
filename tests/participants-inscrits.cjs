const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');const cache=new Map();function load(file){if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(id=>id.startsWith('@/')?load(id.slice(2)+'.ts'):require(id),m,m.exports);return m.exports;}
const {fusionnerInscriptions}=load('lib/participants-inscrits.ts');
const manuel={id:'m',nom:'Manuel',emoji:'x',couleur:'#123456'},ancien={id:'inscription:annule',nom:'Annulé',emoji:'x',couleur:'#123456'},profil={id:'p',profilId:'account',nom:'Compte',emoji:'x',couleur:'#123456'};
const donnees=[manuel,ancien,profil];const snapshot=JSON.stringify(donnees);
const inscrits=[{id:'accepte',nom:'Compte',user_id:'account',type_participant:'individuel'}];
const r=fusionnerInscriptions(donnees,inscrits);assert.equal(r.length,2);assert.ok(r.some(e=>e.id==='m'));assert.ok(!r.some(e=>e.id==='inscription:annule'));assert.equal(r.find(e=>e.id==='inscription:accepte').profilId,'account');assert.equal(JSON.stringify(donnees),snapshot);
assert.deepEqual(fusionnerInscriptions(r,inscrits),r,'refresh is idempotent');assert.deepEqual(fusionnerInscriptions(r,[]),[manuel],'cancelled registration removed on launch recheck');
assert.throws(()=>fusionnerInscriptions([manuel],[{id:'i',nom:' manuel '}]),/participant manuel/);
assert.equal(fusionnerInscriptions([],[{id:'team',nom:'Équipe',type_participant:'equipe',user_id:'captain',joueurs:['A','B']}])[0].profilId,undefined,'a team is not the captain’s individual profile');
console.log('Inscriptions : fusion sans doublons, comptes reconnus, annulations retirées au démarrage, homonymes explicites et équipes distinctes des profils : OK');
