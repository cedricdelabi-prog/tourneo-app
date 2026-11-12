const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
function load(path){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(id=>id.startsWith('@/')?load(id.slice(2)+'.ts'):require(id),m,m.exports);return m.exports;}
const {nomsPourTirage,tirerEquipes,tempsChrono,afficherDuree}=load('lib/outils-arbitre.ts');
for(const [total,nb] of [[21,3],[22,3],[2,2],[256,32],[33,8]]){const noms=Array.from({length:total},(_,i)=>`P${i}`);const eq=tirerEquipes(noms,nb);assert.equal(eq.length,nb);assert.equal(new Set(eq.flatMap(e=>e.joueurs)).size,total);assert.deepEqual(eq.flatMap(e=>e.joueurs).sort(),noms.sort());assert.ok(Math.max(...eq.map(e=>e.joueurs.length))-Math.min(...eq.map(e=>e.joueurs.length))<=1);if(total===21)assert.ok(eq.every(e=>e.joueurs.length===7));}
assert.throws(()=>nomsPourTirage('Alice\nalice'),/identiques/);assert.throws(()=>tirerEquipes(['A','B'],3));assert.throws(()=>tirerEquipes(['A','B'],2,()=>2));
const chrono={ecoule:2500,depuis:10000,limite:0};assert.equal(tempsChrono(chrono,70000),62500,'elapsed clock survives a suspended tab');assert.equal(tempsChrono({...chrono,depuis:null},70000),2500);assert.equal(tempsChrono(chrono,9000),2500);assert.equal(afficherDuree(3661000),'01:01:01');assert.equal(afficherDuree(-10),'00:00:00');
const {classementEpreuve,classementOlympiade,lireOlympiade,mesureOlympiade}=load('lib/olympiades.ts');
const equipes=['A','B','C'].map(id=>({id,nom:id,joueurs:[]}));
const relais={id:'r',nom:'Relais',unite:'secondes',sens:'moins',validee:true,mesures:{A:'12,5',B:'11',C:'11'}};
assert.deepEqual(classementEpreuve(relais,equipes).map(l=>[l.equipe.id,l.rang,l.points]),[['B',1,3],['C',1,3],['A',3,1]]);
const lancer={id:'l',nom:'Lancer',unite:'cm',sens:'plus',validee:true,mesures:{A:'200',B:'100',C:'150'}};
const d={version:1,nom:'Jeux',equipes,epreuves:[relais,lancer]};
assert.deepEqual(classementOlympiade(d).map(l=>[l.equipe.id,l.points]),[['C',5],['A',4],['B',4]]);
assert.deepEqual(classementOlympiade(d).map(l=>l.rang),[1,2,2]);
assert.equal(classementOlympiade({...d,epreuves:[{...lancer,validee:false}]}).every(l=>l.points===0),true);
assert.equal(classementEpreuve({...relais,mesures:{A:'12',B:'',C:'10'}},equipes).length,0);
assert.equal(mesureOlympiade(''),null);assert.equal(mesureOlympiade('0'),0);assert.equal(mesureOlympiade('-1'),null);assert.equal(mesureOlympiade('1e3'),null);
assert.deepEqual(lireOlympiade(JSON.stringify(d)),d);
assert.throws(()=>lireOlympiade(JSON.stringify({...d,epreuves:[{...relais,mesures:{}}]})),/tous ses résultats/);
assert.throws(()=>lireOlympiade(JSON.stringify({...d,equipes:[equipes[0],equipes[0]]})),/dupliqués/);
assert.equal(lireOlympiade(JSON.stringify({...d,epreuves:[{...relais,validee:false,mesures:{A:'1,'}}]})).epreuves[0].mesures.A,'1,','partial decimal drafts survive export');
console.log('Outils : 21/3, effectifs inégaux, doublons, chrono après veille ; Olympiades : unités, sens, ex æquo et validation : OK');
