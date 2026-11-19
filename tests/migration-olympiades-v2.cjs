'use strict';
/* Olympiades : SQL V2 reel sur PGlite, utilisateurs et classements inventes. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {preparerPhase4,phase5}=require('./migration-partages-v2.cjs');
const {OWNER,OTHER,TOURNOI}=require('./migration-socle-v2.cjs');
const read=n=>fs.readFileSync(path.join(__dirname,'../docs/sql',n),'utf8');
const phase6=read('compatibilite_v1_v2_staging_PHASE6_GROUPES_LANGUES.sql');
const phase7=read('compatibilite_v1_v2_staging_PHASE7_PROFILS.sql');
const phase8=read('compatibilite_v1_v2_staging_PHASE8_TENNIS.sql');
const phase9=read('compatibilite_v1_v2_staging_PHASE9_OLYMPIADES.sql');
const verify=read('verification_phase9_staging.sql');
const query=async(db,q)=>(await db.query(q)).rows;
async function preparerStaging(){
 const db=await preparerPhase4();
 await db.exec(phase5);await db.exec(phase6);await db.exec(phase7);await db.exec(phase8);
 return db;
}
const ID='88888888-8888-4888-8888-888888888888';
const fake={equipes:[{id:'raw-equipe',nom:'Bleus',email:'PRIVE_NE_PAS_AFFICHER'}],
 epreuves:[{id:'course',nom:'Course',unite:'secondes',sens:'min',validee:true,
   mesures:{'raw-equipe':35}}],
 contact:'NE_JAMAIS_PUBLIER'};
const publicCall="select public.tourneo_olympiade_publique('"+ID+"') as resultat";
assert.match(phase9,/tourneo\.v1_copy_verified/);
assert.doesNotMatch(phase9,/grant usage on schema tourneo_private to anon/i);
assert.doesNotMatch(phase9,/alter table public\.tournois add column revision/i);
assert.match(phase9,/create trigger revision_tournoi/);
assert.match(phase9,/create trigger revision_olympiade/);
(async()=>{
 const db=await preparerStaging();
 try{
  const previous=await query(db,'select id,user_id,nom,donnees,revision,partage_id,est_public from public.tournois');
  const profiles=await query(db,'select id,display_name,player_code from public.profiles order by id');
  await db.exec("select set_config('tourneo.v1_copy_verified','false',false)");
  await assert.rejects(db.exec(phase9),/STAGING STOP/);
  await db.exec('rollback').catch(()=>{});
  await db.exec("select set_config('tourneo.v1_copy_verified','true',false)");
  await db.exec(phase9);
  const checks=await query(db,verify);
  assert.ok(checks.length>=13);
  assert.ok(checks.every(c=>c.status==='OK'),JSON.stringify(checks.filter(c=>c.status!=='OK')));
  assert.deepEqual(await query(db,'select id,user_id,nom,donnees,revision,partage_id,est_public from public.tournois'),previous,'V1 historic tournament remains bit-for-bit unchanged');
  assert.deepEqual(await query(db,'select id,display_name,player_code from public.profiles order by id'),profiles);
  assert.equal((await query(db,"select has_function_privilege('anon','tourneo_private.olympiade_publique(uuid)','EXECUTE') as v"))[0].v,false);
  assert.equal((await query(db,"select has_function_privilege('anon','public.tourneo_olympiade_publique(uuid)','EXECUTE') as v"))[0].v,true);
  assert.equal((await query(db,"select has_schema_privilege('anon','tourneo_private','USAGE') as v"))[0].v,false,'private schema must not be exposed to anonymous clients');
  await db.exec("insert into public.tourneo_olympiades(id,user_id,nom,donnees,partage) values('"+ID+"','"+OWNER+"','Olympiade fictive','"+JSON.stringify(fake)+"'::jsonb,false)");
  const first=(await query(db,"select revision from public.tourneo_olympiades where id='"+ID+"'"))[0];
  assert.equal(Number(first.revision),0);
  await db.exec('begin');
  await db.exec('set local role anon');
  assert.equal((await query(db,publicCall))[0].resultat,null,'private olympiad is not anonymously visible');
  await assert.rejects(db.exec("select * from public.tourneo_olympiades"),/permission denied|permission/i);
  await db.exec('rollback').catch(()=>{});
  await db.exec("update public.tourneo_olympiades set partage=true where id='"+ID+"'");
  assert.equal(Number((await query(db,"select revision from public.tourneo_olympiades where id='"+ID+"'"))[0].revision),1);
  await db.exec('begin');
  await db.exec('set local role anon');
  const publ=(await query(db,publicCall))[0].resultat;
  assert.equal(publ.nom,'Olympiade fictive');
  assert.equal(publ.equipes[0].nom,'Bleus');
  assert.notEqual(publ.equipes[0].id,'raw-equipe');
  assert.equal(publ.epreuves.length,1);
  assert.equal(publ.epreuves[0].mesures[publ.equipes[0].id],35);
  const serialized=JSON.stringify(publ);
  assert.equal(serialized.includes('PRIVE_NE_PAS_AFFICHER'),false);
  assert.equal(serialized.includes('NE_JAMAIS_PUBLIER'),false);
  assert.equal(serialized.includes('raw-equipe'),false);
  await db.exec('rollback');
  await db.exec('begin');
  await db.exec("update public.tournois set nom='Nom test' where id='"+TOURNOI+"'");
  assert.equal(Number((await query(db,"select revision from public.tournois where id='"+TOURNOI+"'"))[0].revision),1);
  await db.exec('rollback');
  assert.deepEqual(await query(db,'select id,user_id,nom,donnees,revision,partage_id,est_public from public.tournois'),previous);
  await assert.rejects(db.exec(phase9),/STAGING STOP/,'phase 9 should not install twice');
  await db.exec('rollback').catch(()=>{});
  console.log('Phase 9 fictive : olympiades privees, partage anonyme limite, ID pseudonymise, revision monotone, V1 preservee : OK');
 }finally{await db.close();}
 const broken=await preparerStaging();
 try{
  await broken.exec('update public.tournois set partage_id=null');
  await assert.rejects(broken.exec(phase9),/STAGING STOP/);
  await broken.exec('rollback').catch(()=>{});
  assert.equal((await query(broken,"select to_regclass('public.tourneo_olympiades') is null as v"))[0].v,true);
  console.log('Phase 9 fictive : partage V1 manquant bloque la creation des olympiades : OK');
 }finally{await broken.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
