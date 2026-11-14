const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const cache=new Map();function load(file){if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(id=>id.startsWith('@/')?load(id.slice(2)+'.ts'):require(id),m,m.exports);return m.exports;}
const {CATALOGUE_SPORTS}=load('lib/catalogue-sports.ts'),{REGLES_SPORTS}=load('lib/regles-sports.ts'),{REGLES_COMPLEMENTAIRES,traductionsRegles}=load('lib/regles-complementaires.ts'),{tr,changerLangue}=load('lib/langue.ts');
assert.equal(CATALOGUE_SPORTS.length,57);
const stats={fiche:0,variante:0,cadre:0};
for(const s of CATALOGUE_SPORTS){const f=REGLES_SPORTS[s.code];assert.ok(f,`Missing guide ${s.code}`);assert.ok(f.titre&&f.reperes.length>=2,`Empty guide ${s.code}`);assert.ok(['fiche','variante','cadre'].includes(f.nature),s.code);stats[f.nature]++;assert.match(f.verifieLe,/^\d{4}-\d{2}-\d{2}$/);if(f.nature==='fiche')assert.ok(f.sources.length,'Specific game needs sources: '+s.code);for(const source of f.sources)assert.equal(new URL(source.url).protocol,'https:');}
for(const [fr,v]of Object.entries(traductionsRegles)){for(const l of['en','nl']){assert.ok(v[l]?.trim(),fr+' '+l);assert.deepEqual([...fr.matchAll(/\{\d+\}/g)].map(x=>x[0]),[...v[l].matchAll(/\{\d+\}/g)].map(x=>x[0]),fr);changerLangue(l);assert.equal(tr(fr),v[l]);}}
for(const f of Object.values(REGLES_COMPLEMENTAIRES))for(const t of[f.titre,...f.reperes])assert.ok(traductionsRegles[t]?.en&&traductionsRegles[t]?.nl,'Missing translation: '+t);
// Distinct variants must never silently reuse a misleading generic guide.
assert.notDeepEqual(REGLES_SPORTS.beachvolley.reperes,REGLES_SPORTS.volley.reperes);
assert.match(REGLES_SPORTS.rugby7.reperes.join(' '),/Touch FIT/);assert.equal(REGLES_SPORTS.rugby7.nature,'variante');
assert.match(REGLES_SPORTS.molkky.reperes.join(' '),/25/);assert.match(REGLES_SPORTS.tarot.reperes.join(' '),/négatifs/);
assert.equal(REGLES_SPORTS.autre.nature,'cadre');assert.equal(REGLES_SPORTS.esport.nature,'cadre');
changerLangue('fr');console.log('Catalogue complet :',CATALOGUE_SPORTS.length,'entrées ;',stats,'; sources, limites et traductions FR/EN/NL : OK');
