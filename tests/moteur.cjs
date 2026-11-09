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
