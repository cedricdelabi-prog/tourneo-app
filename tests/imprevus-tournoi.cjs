const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const modules=new Map();
function charger(nom){
 const chemin=path.resolve(__dirname,'..',nom.replace(/^@\//,'')+'.ts');
 if(modules.has(chemin))return modules.get(chemin).exports;
 const module={exports:{}};modules.set(chemin,module);
 const code=ts.transpileModule(fs.readFileSync(chemin,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('require','module','exports',code)((id)=>id.startsWith('@/')?charger(id):require(id),module,module.exports);
 return module.exports;
}
const {OPTIONS_V2}=charger('lib/options-v2');
const {preparerImprevu,exporterComparaisonImprevu}=charger('lib/imprevus-tournoi');
const equipes=['a','b','c','d','e','f'].map((id,i)=>({id,nom:i===2?'=FORMULE(1)':'Équipe '+id,emoji:'',couleur:''}));
const matchs=[
 {id:1,journee:1,equipe1Id:'a',equipe2Id:'b',score1:'2',score2:'1',terrain:1},
 {id:2,journee:1,equipe1Id:'c',equipe2Id:'d',score1:'',score2:'',terrain:2},
 {id:3,journee:2,equipe1Id:'e',equipe2Id:'f',score1:'',score2:''}
];
const options={...OPTIONS_V2,terrains:2,duree:10,repos:0,depart:''};
const originaux=JSON.stringify([matchs,options]);
const proposition=preparerImprevu(matchs,[1],options,15,[2]);
assert.equal(proposition.proteges,1,'one finished match remains fixed');
assert.equal(proposition.bilan.total,3,'three scheduled matches');
assert.equal(proposition.bilan.restants,2,'only unscored matches may be moved');
assert.equal(proposition.bilan.deplaces,2,'two future matches move');
assert.equal(proposition.bilan.terrainsModifies,1,'one court reassignment');
assert.equal(proposition.bilan.horairesModifies,2,'two time changes');
assert.equal(proposition.bilan.inchanges,1,'the scored match did not change');
assert.equal(proposition.finAvant,20,'initial finish at minute 20');
assert.equal(proposition.finApres,35,'finish after delay and court closure');
assert.equal(proposition.bilan.variationFin,15);
assert.equal(proposition.bilan.retardMaximum,15);
const protection=proposition.options.adaptationPlanning.fixes.find(c=>c.matchId===1);
assert.deepEqual(protection,{matchId:1,terrain:1,debut:0,fin:10});
assert.deepEqual(proposition.options.adaptationPlanning.terrainsFermes,[2]);
assert.equal(JSON.stringify([matchs,options]),originaux,'preview did not modify match results or tournament options');
const aucun=preparerImprevu(matchs,[1],options,0,[]);
assert.equal(aucun.changements.length,0,'zero-delay, zero-closure preview does not replan');
assert.equal(aucun.bilan.variationFin,0);
assert.throws(()=>preparerImprevu(matchs,[1],options,15,[1,2]),/au moins un terrain ouvert/);
assert.throws(()=>preparerImprevu(matchs,[1],options,15,[3]),/terrains existants/);
assert.throws(()=>preparerImprevu(matchs,[1],options,-5,[]),/entre 0 et 240/);
assert.throws(()=>preparerImprevu(matchs,[1],options,241,[]),/entre 0 et 240/);
assert.throws(()=>preparerImprevu(matchs.slice(0,1),[1],options,10,[]),/Aucune rencontre sans score/);
const csv=exporterComparaisonImprevu(proposition.changements,matchs,equipes,'');
assert.ok(csv.startsWith('\uFEFF'),'Excel BOM present');
assert.ok(csv.includes('"Match";"Équipes";"Terrain avant"'),'clear column names');
assert.ok(csv.includes("'=FORMULE(1)"),'formula-like participant names cannot execute in Excel');
assert.ok(csv.includes('"2";"\'=FORMULE(1) / Équipe d"'),'participant names preserved');
assert.equal(csv.split('\r\n').filter(Boolean).length,3,'one CSV row per changed match');
assert.equal(JSON.stringify([matchs,options]),originaux,'CSV export leaves original scores intact');
const ecran=fs.readFileSync(path.resolve(__dirname,'../components/ImprevusTournoi.tsx'),'utf8');
assert.ok(ecran.includes("exporterComparaisonImprevu("),'organizer can download scenario');
assert.ok(ecran.includes("Confirmer le nouveau planning"),'a preview is required before applying');
assert.ok(ecran.includes("Annuler cette adaptation"),'undo is available');
console.log('Tourneo V2 imprévus : scénarios, résultats protégés, comparaison et export CSV : OK');
