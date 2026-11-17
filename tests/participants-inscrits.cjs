const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync('lib/participants-inscrits.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(require,m,m.exports);const {fusionnerInscrits,sourcesParticipants}=m.exports;
const inscrits=[{id:'a',nom:'Alice',joueurs:[],user_id:'u',type_participant:'individuel'}];const liste=fusionnerInscrits([],inscrits);assert.equal(liste.length,1);assert.equal(fusionnerInscrits(liste,inscrits).length,1);
const equipe={id:'team',nom:'Bleus',membresOrigine:liste};assert.equal(fusionnerInscrits([equipe],inscrits).length,1,'grouped registration must never return as an additional player');
assert.throws(()=>fusionnerInscrits([equipe],[]),/retirée/);
assert.throws(()=>fusionnerInscrits([equipe],[...inscrits,{...inscrits[0],id:'b',nom:'Bob',user_id:'other'}]),/nouveaux inscrits/);
assert.equal(sourcesParticipants([equipe,{...equipe,id:'team2'}]).length,1,'one registration split into several teams is recovered once');
assert.equal(fusionnerInscrits([{id:'inscription:removed',nom:'Old'}],[]).length,0);
console.log('Participants : récupération sans doublon, équipes conservées au lancement, annulation et nouveaux inscrits détectés : OK');
