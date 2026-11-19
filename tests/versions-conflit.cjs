'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const content=fs.readFileSync(path.resolve(__dirname,'../lib/versions-conflit.ts'),'utf8');
const m={exports:{}};
new Function('require','module','exports',
 ts.transpileModule(content,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
)(require,m,m.exports);
const {comparerVersionsTournoi}=m.exports;
const clone=x=>structuredClone(x);
const local={
 nom:'Tournoi A',sport:'petanque',formatTournoi:'complet',
 equipes:[{id:'a',nom:'Alice',joueurs:['Alice']},{id:'b',nom:'Bob'}],
 matchs:[{id:1,journee:1,equipe1Id:'a',equipe2Id:'b',score1:'13',score2:'7'}],
 matchsValides:[1],optionsV2:{terrains:1}
};
const distant=()=>({nom:local.nom,sport:local.sport,donnees:{
 equipes:clone(local.equipes),matchs:clone(local.matchs),matchsValides:clone(local.matchsValides),
 formatTournoi:local.formatTournoi,optionsV2:clone(local.optionsV2)
}});
const egal=comparerVersionsTournoi(local,distant());
assert.equal(egal.disponible,true);
assert.equal(egal.matchsDifferents,0);
assert.equal(egal.participantsDifferents,0);
assert.deepEqual(egal.champsDifferents,[]);
const sansValidation=distant();sansValidation.donnees.matchsValides=[];
const v=comparerVersionsTournoi(local,sansValidation);
assert.equal(v.matchsDifferents,1,'A score awaiting validation is not the same result');
assert.equal(v.local.valides,1);assert.equal(v.distant.valides,0);
assert.match(v.lignes[0].local,/✓/);
const scoreChange=distant();scoreChange.donnees.matchs[0].score2='8';
assert.equal(comparerVersionsTournoi(local,scoreChange).lignes[0].raison,'Score ou validation');
const modifie=distant();modifie.donnees.matchs[0].terrain=2;
assert.equal(comparerVersionsTournoi(local,modifie).lignes[0].raison,'Organisation du match');
const absent=distant();absent.donnees.matchs=[];
assert.equal(comparerVersionsTournoi(local,absent).lignes[0].distant,'Absent');
const joueurs=distant();joueurs.donnees.equipes[0].nom='Alice club';
joueurs.donnees.equipes[0].membresOrigine=[{id:'x',nom:'Alice'}];
assert.equal(comparerVersionsTournoi(local,joueurs).participantsDifferents,1);
const autre=distant();autre.nom='Nouvelle compétition';autre.donnees.optionsV2.terrains=3;
assert.deepEqual(comparerVersionsTournoi(local,autre).champsDifferents,['Nom du tournoi','Réglages']);
const incoherent=distant();incoherent.donnees.matchs.push({...incoherent.donnees.matchs[0]});
assert.equal(comparerVersionsTournoi(local,incoherent).disponible,false,'Duplicate cloud IDs invalidate comparison');
assert.equal(comparerVersionsTournoi(local,{nom:'Sans détails'}).disponible,false);
const differences=distant();differences.donnees.matchs=Array.from({length:15},(_,i)=>({
 ...local.matchs[0],id:i+2,score1:'0',score2:'0'
}));
const rapport=comparerVersionsTournoi(local,differences);
assert.equal(rapport.matchsDifferents,16);
assert.equal(rapport.lignes.length,8);
assert.equal(rapport.lignesMasquees,8);
const origine=clone(local),cloudOrigine=distant();
comparerVersionsTournoi(local,cloudOrigine);
assert.deepEqual(local,origine,'Local snapshot remains unmodified');
assert.deepEqual(cloudOrigine,distant(),'Remote snapshot remains unmodified');
const app=fs.readFileSync(path.resolve(__dirname,'../app/tournoi/[id]/page.tsx'),'utf8');
assert.match(app,/comparerVersionsTournoi\(/);
assert.match(app,/comparaisonConflit\.lignes\.map/);
assert.match(app,/disabled=\{!comparaisonConflit\?\.disponible\}/);
console.log('Versions concurrentes Tourneo : scores, validation, participants, formats, sécurité, limite de lignes : OK');
