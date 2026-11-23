'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const path=require('node:path');
const file=fs.readFileSync(path.join(__dirname,'../lib/compteur-communaute.ts'),'utf8');
const js=ts.transpileModule(file,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const exported={};
new Function('exports',js)(exported);
const parse=exported.lireMinimumCommunautaire;
assert.equal(parse({minimum:50,maximum:59,mesure:'comptes_confirmes'}),50);
assert.equal(parse({minimum:10,maximum:19,mesure:'comptes_confirmes'}),10);
assert.equal(parse({minimum:100,maximum:199,mesure:'comptes_confirmes'}),100);
assert.equal(parse({minimum:1000,maximum:1999,mesure:'comptes_confirmes'}),1000);
for(const input of [null,{},false,{minimum:0,maximum:9,mesure:'comptes_confirmes'},{minimum:58,maximum:59,mesure:'comptes_confirmes'},{minimum:50,maximum:90,mesure:'comptes_confirmes'},{minimum:50,maximum:59,mesure:'visites'},{minimum:-10,maximum:-1,mesure:'comptes_confirmes'}]){
  assert.equal(parse(input),null,'Incorrect public signup badge should not display');
}
const home=fs.readFileSync(path.join(__dirname,'../components/DecouvrirTourneo.tsx'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'../components/CompteurCommunaute.tsx'),'utf8');
const sql=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261114171715_tourneo_v2_compteur_et_photos.sql'),'utf8');
assert.match(home,/<CompteurCommunaute\/>/);
assert.match(ui,/supabase\.rpc\("tourneo_communaute_publique"\)/);
assert.match(ui,/lireMinimumCommunautaire\(data\)/);
assert.doesNotMatch(ui,/\b(?:58|59)\b/);
assert.match(sql,/create function public\.tourneo_communaute_publique\(\)/);
assert.match(sql,/email_confirmed_at is not null/);
assert.match(sql,/is_anonymous,false/);
console.log('Compteur Tourneo V2 : bornes cohérentes, pas de faux utilisateurs, inscription confirmée : OK');
