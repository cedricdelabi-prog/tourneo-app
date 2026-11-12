const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function charger(nom) {
  const fichier = path.resolve(__dirname, '..', nom.replace(/^@\//, '') + '.ts');
  if (cache.has(fichier)) return cache.get(fichier).exports;
  const module = { exports: {} }; cache.set(fichier, module);
  const js = ts.transpileModule(fs.readFileSync(fichier, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('require', 'module', 'exports', js)((id) => id.startsWith('@/') ? charger(id) : require(id), module, module.exports);
  return module.exports;
}
const { genererMatchs, genererMatchsAllerRetour, calculerClassement } = charger('lib/tournoi');
const { lireParticipantsCSV } = charger('lib/import-participants');
const { classementCSV, prochaineRondeSuisse, resultatSerie } = charger('lib/formats-avances');
for (const n of [0, 1, 2, 3, 4, 7, 16, 31, 64]) {
  const equipes = Array.from({ length: n }, (_, i) => ({ id: String(i), nom: `J${i}`, emoji: '', couleur: '' }));
  const aller = genererMatchs(equipes), double = genererMatchsAllerRetour(equipes);
  assert.equal(aller.length, n * Math.max(0, n - 1) / 2);
  assert.equal(double.length, n * Math.max(0, n - 1));
  assert.equal(new Set(double.map(m => m.id)).size, double.length);
  for (const journee of new Set(double.map(m => m.journee))) {
    const ids = double.filter(m => m.journee === journee).flatMap(m => [m.equipe1Id, m.equipe2Id]);
    assert.equal(new Set(ids).size, ids.length, `double programmation: ${n}/${journee}`);
  }
  for (const match of aller) assert.equal(double.filter(m => m.equipe1Id === match.equipe2Id && m.equipe2Id === match.equipe1Id).length, 1);
}
assert.deepEqual(lireParticipantsCSV('\uFEFFNom;Club\r\n"Alice; A";X\r\nBob;Y\r\nbob;Z'), ['Alice; A', 'bob']);
assert.deepEqual(lireParticipantsCSV('Alice\nBob\n'), ['Alice', 'Bob']);
assert.deepEqual(lireParticipantsCSV('Nom,Club\n"Alice ""A""",X'), ['Alice "A"']);
assert.throws(() => lireParticipantsCSV('"incomplet'));
assert.throws(() => lireParticipantsCSV('a'.repeat(101)));
const equipes = [{id:'a',nom:'=CMD()',emoji:'',couleur:''},{id:'b',nom:'Bob',emoji:'',couleur:''}];
const match = {id:1,journee:1,equipe1Id:'a',equipe2Id:'b',score1:'2',score2:'0'};
assert.equal(calculerClassement(equipes,[match])[0].pts,3);
assert.equal(calculerClassement(equipes,[{...match,score1:'-1'}])[0].mj,0);
assert.match(classementCSV(equipes,[match]), /'\=CMD/);
assert.equal(resultatSerie([{score1:'2',score2:'0'},{score1:'1',score2:'0'},{score1:'0',score2:'3'}],2).vainqueur,1);
assert.throws(() => prochaineRondeSuisse(equipes,[{...match,score1:''}],2));
console.log('Tests moteur, aller-retour, import CSV, classement et séries : OK');
const { prochainTourParcours, classementParcours, parcoursTermine } = charger('lib/parcours');
const { planifierMatchs } = charger('lib/planning');
const { tournoiEstTermine,classementTournoi }=charger('lib/resultats');
const { OPTIONS_V2,normaliserOptionsV2 }=charger('lib/options-v2');
for(const n of [2,3,4,5,7,8,15,16,31,32,63,64])for(let seed=0;seed<8;seed++){
  const es=Array.from({length:n},(_,i)=>({id:String(i),nom:`J${i}`,emoji:'',couleur:''}));
  let ms=[],tours=0;const pertes=new Map(es.map(e=>[e.id,0]));
  while(true){const prochain=prochainTourParcours('doubleElimination',es,ms);if(!prochain.length)break;
    assert.ok(++tours<100,'boucle de double élimination');
    const vus=new Set();
    for(const m of prochain){assert.ok(!vus.has(m.equipe1Id)&&!vus.has(m.equipe2Id));vus.add(m.equipe1Id);vus.add(m.equipe2Id);assert.ok(pertes.get(m.equipe1Id)<2&&pertes.get(m.equipe2Id)<2,'participant déjà éliminé');const gagne=((m.id*17+seed*31)%7)>2;m.score1=gagne?'2':'0';m.score2=gagne?'0':'2';const perdant=gagne?m.equipe2Id:m.equipe1Id;pertes.set(perdant,pertes.get(perdant)+1);}
    ms.push(...prochain);
  }
  assert.ok(parcoursTermine('doubleElimination',es,ms));
  assert.equal([...pertes.values()].filter(p=>p<2).length,1);
  assert.ok(ms.length===2*n-2||ms.length===2*n-1,`matchs double élimination ${n}: ${ms.length}`);
  assert.ok(pertes.get(classementParcours('doubleElimination',es,ms)[0].id)<2);
  const planning=planifierMatchs(ms,{terrains:3,duree:15,repos:7});
  for(let i=0;i<planning.length;i++)for(let j=i+1;j<planning.length;j++){
    const a=planning[i],b=planning[j],ma=ms.find(m=>m.id===a.matchId),mb=ms.find(m=>m.id===b.matchId);
    if(a.terrain===b.terrain)assert.ok(a.fin<=b.debut||b.fin<=a.debut);
    if([ma.equipe1Id,ma.equipe2Id].some(id=>id===mb.equipe1Id||id===mb.equipe2Id))assert.ok(a.fin+7<=b.debut||b.fin+7<=a.debut);
  }
}
for(const n of [2,4,8,16,32,64]){
 const es=Array.from({length:n},(_,i)=>({id:String(i),nom:`J${i}`,emoji:'',couleur:''}));let ms=[];
 for(let tour=0;tour<20;tour++){const suite=prochainTourParcours('consolante',es,ms);if(!suite.length)break;ms.push(...suite.map(m=>({...m,score1:'1',score2:'0'})));}
 assert.equal(ms.length,n===2?1:n*1.5-2);
 assert.ok(parcoursTermine('consolante',es,ms));assert.equal(classementParcours('consolante',es,ms)[0].id,'0');
}
assert.equal(resultatSerie([{score1:'',score2:''},{score1:'2',score2:'0'}],1).vainqueur,null);
assert.equal(normaliserOptionsV2({terrains:0,rondes:Infinity}).terrains,1);
assert.equal(calculerClassement(equipes,[match],{pointsVictoire:2,pointsDefaite:1})[0].pts,2);
assert.equal(calculerClassement(equipes,[],{exemptions:[{id:'b',ronde:1}]})[0].equipe.id,'b');
assert.equal(tournoiEstTermine('elimination',equipes,[{...match,score1:'',score2:''}]),false);
console.log('Tests parcours double élimination/consolante, planning et règles V2 : OK');
const { genererPartenairesTournants }=charger('lib/rotation');
const { repartirPoules }=charger('lib/tirages');
const { lireSauvegarde }=charger('lib/sauvegarde');
for(const n of [4,5,6,7,8,11,16,32]){
 const es=Array.from({length:n},(_,i)=>({id:String(i),nom:`J${i}`,niveau:i%5,emoji:'',couleur:'#123456'}));const ms=genererPartenairesTournants(es,8);
 assert.equal(ms.length,Math.floor(n/4)*8);
 for(let ronde=1;ronde<=8;ronde++){const ids=ms.filter(m=>m.journee===ronde).flatMap(m=>[...m.joueurs1Ids,...m.joueurs2Ids]);assert.equal(new Set(ids).size,ids.length);}
 const joues=ms.map(m=>({...m,score1:'2',score2:'0'}));assert.equal(calculerClassement(es,joues).reduce((s,l)=>s+l.mj,0),ms.length*4);
 const sauvegarde=lireSauvegarde(JSON.stringify({version:2,nomTournoi:'Test',sport:'padel',formatTournoi:'rotation',equipes:es,matchs:joues,matchsValides:[],optionsV2:OPTIONS_V2}));assert.equal(sauvegarde.matchs.length,ms.length);
 const groupes=repartirPoules(es,2,'equilibre');assert.ok(Math.abs(groupes[0].length-groupes[1].length)<=1);
}
assert.throws(()=>lireSauvegarde('{"version":1}'));
console.log('Tests rotation, tirages équilibrés et sauvegardes : OK');
for(const n of [4,5,8]){
 const es=Array.from({length:n},(_,i)=>({id:String(i),nom:`J${i}`,emoji:'',couleur:''}));let ms=[],exemptions=[];
 for(let ronde=1;ronde<=(n%2?n:n-1);ronde++){
  const tour=prochaineRondeSuisse(es,ms,ronde,exemptions.map(e=>e.id),{exemptions});
  if(tour.exemptId){assert.ok(!exemptions.some(e=>e.id===tour.exemptId));exemptions.push({id:tour.exemptId,ronde});}
  for(const m of tour.matchs)assert.ok(!ms.some(a=>[a.equipe1Id,a.equipe2Id].sort().join('|')===[m.equipe1Id,m.equipe2Id].sort().join('|')),'répétition suisse évitable');
  ms.push(...tour.matchs.map((m,i)=>({...m,score1:String((i+ronde)%3),score2:String(i%3)})));
 }
}
console.log('Tests appariements suisses et rotation des exemptions : OK');
const {reglesPourSport,erreurScoreSport}=charger('lib/sports');
assert.equal(erreurScoreSport('petanque',13,12,OPTIONS_V2),'');assert.ok(erreurScoreSport('petanque',14,12,OPTIONS_V2));
const badminton={...OPTIONS_V2,...reglesPourSport('badminton')};
assert.equal(erreurScoreSport('badminton',2,0,badminton,[{score1:'21',score2:'15'},{score1:'30',score2:'29'}]),'');
assert.ok(erreurScoreSport('badminton',2,0,badminton,[{score1:'21',score2:'20'},{score1:'21',score2:'15'}]));
console.log('Tests scores par discipline et manches gagnantes : OK');

const {statistiquesTournois}=charger('lib/statistiques');
const joueursStats=[{id:'a',profilId:'p1',nom:'A',emoji:'',couleur:''},{id:'b',profilId:'p2',nom:'B',emoji:'',couleur:''}];
const matchStats={id:1,journee:1,equipe1Id:'a',equipe2Id:'b',score1:'3',score2:'1'};
const bilanStats=statistiquesTournois([
 {id:'t1',sport:'football',donnees:{equipes:joueursStats,matchs:[matchStats],matchsValides:[],cree:true}},
 {id:'t2',sport:'football',donnees:{equipes:joueursStats,matchs:[matchStats],matchsValides:[1],cree:true}},
 {id:'t3',sport:'petanque',donnees:null}
]);
assert.equal(bilanStats.tournois,3);assert.equal(bilanStats.termines,1);assert.equal(bilanStats.brouillons,1);
assert.equal(bilanStats.participations,4);assert.equal(bilanStats.joueursIdentifies,2);
assert.equal(bilanStats.valides,1);assert.equal(bilanStats.tauxValidation,50);
assert.equal(statistiquesTournois([]).tauxValidation,0);
assert.equal(statistiquesTournois([{id:'t',sport:'suisse',donnees:{equipes:joueursStats,matchs:[matchStats],cree:true,formatTournoi:'suisse',optionsV2:{rondes:4}}}]).termines,0);
console.log('Tests statistiques : participations distinctes, validation et tournoi suisse incomplet : OK');
