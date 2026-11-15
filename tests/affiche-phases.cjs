const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
function load(file){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(require,m,m.exports);return m.exports;}
const {pagesPhases,nomPhase}=load('lib/affiche-phases.ts');
const match=(id,journee=1,branche)=>({id,journee,branche,equipe1Id:'a',equipe2Id:'b',score1:id%2?'13':'',score2:id%2?'8':''});
const championnat=Array.from({length:37},(_,i)=>match(i+1));const copie=JSON.stringify(championnat);const pages=pagesPhases(championnat,'complet');
assert.deepEqual(pages.map(p=>p.matchs.length),[12,12,12,1]);assert.deepEqual(pages.map(p=>p.numero),[1,2,3,4]);assert.ok(pages.every(p=>p.total===4));assert.equal(pages[0].titre,'Journée 1');assert.equal(JSON.stringify(championnat),copie,'No source mutation');assert.deepEqual(pages.flatMap(p=>p.matchs.map(m=>m.id)),championnat.map(m=>m.id),'No match lost or duplicated');
const coupe=[...Array.from({length:4},(_,i)=>match(100001+i,4)),...Array.from({length:2},(_,i)=>match(100005+i,5)),match(100007,6)];
assert.deepEqual(pagesPhases(coupe,'poulesFinale').map(p=>p.titre),['Quarts de finale','Demi-finales','Finale']);
assert.equal(nomPhase([match(1)],'suisse',2),'Ronde 2');
const mixte=pagesPhases([match(1),match(100001)],'poulesFinale');assert.deepEqual(mixte.map(p=>p.titre),['Poules · journée 1','Finale']);assert.notEqual(mixte[0].cle,mixte[1].cle);
assert.deepEqual(pagesPhases([match(1,2,'principale'),match(2,2,'repechage'),match(3,3,'finale')],'doubleElimination').map(p=>p.titre),['Tour 2 · Tableau principal','Tour 2 · Repêchage','Finale']);assert.deepEqual(pagesPhases([],'complet'),[]);
console.log('Affiches par phase : pagination sans perte, journée, poules/finales séparées, quarts/demies/finale, suisse et branches : OK');
