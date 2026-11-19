'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const m={exports:{}};
new Function('require','module','exports',
 ts.transpileModule(fs.readFileSync('lib/compatibilite-v1.ts','utf8'),
  {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
)(require,m,m.exports);
const {lireValidationsHistoriques}=m.exports;
const matchs=[
 {id:1,journee:1,equipe1Id:'a',equipe2Id:'b',score1:'13',score2:'7'},
 {id:2,journee:1,equipe1Id:'a',equipe2Id:'c',score1:'',score2:''},
 {id:3,journee:2,equipe1Id:'b',equipe2Id:'c',score1:'0',score2:'13'}
];
assert.deepEqual(lireValidationsHistoriques({cree:true,equipes:[{id:'a',nom:'Alice'}],matchs}),[1,3]);
assert.deepEqual(lireValidationsHistoriques({matchs,matchsValides:[]}),[],'explicit empty validation is intentional');
assert.deepEqual(lireValidationsHistoriques({matchs,matchsValides:[3,3,5,-1]}),[3,5],'explicit validations take priority over scores');
assert.deepEqual(lireValidationsHistoriques({matchs,matchsValides:null}),[],'explicit null is not legacy absence');
assert.deepEqual(lireValidationsHistoriques({matchs:[{...matchs[0],score1:'13abc'}]}),[]);
assert.deepEqual(lireValidationsHistoriques({matchs:[{...matchs[0],score1:'-1'}]}),[]);
assert.deepEqual(lireValidationsHistoriques({matchs:[{...matchs[0],score1:13}]}),[]);
assert.deepEqual(lireValidationsHistoriques({matchs:[{...matchs[0],score1:'99999999999999999999'}]}),[]);
assert.deepEqual(lireValidationsHistoriques({matchs:[{...matchs[0],id:'1'}]}),[]);
assert.deepEqual(lireValidationsHistoriques({matchs:[...matchs,matchs[0]]}),[1,3]);
assert.deepEqual(lireValidationsHistoriques({matchs:'invalid'}),[]);
assert.deepEqual(lireValidationsHistoriques(null),[]);
const p=fs.readFileSync('app/tournoi/[id]/page.tsx','utf8');
assert.match(p,/setMatchsValides\(lireValidationsHistoriques\(data\)\)/);
assert.match(p,/setMatchsValides\(lireValidationsHistoriques\(donnees\)\)/);
const partage=fs.readFileSync('app/partage/[id]/page.tsx','utf8');
assert.match(partage,/const validationsHistoriques = lireValidationsHistoriques\(donnees\);/);
assert.doesNotMatch(partage,/donnees\.matchsValides/,'Public results should consume the same compatibility calculation');
const original={matchs:structuredClone(matchs)};lireValidationsHistoriques(original);
assert.deepEqual(original,{matchs},'Legacy tournament is never mutated');
console.log('Compatibilité des anciens tournois : scores historiques conservés, nouvelles validations prioritaires, aucune réécriture : OK');
