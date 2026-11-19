'use strict';
/* Repetition du VRAI SQL de phase 6 sur PGlite et comptes fictifs uniquement. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {preparerPhase4,phase5}=require('./migration-partages-v2.cjs');
const {OWNER,OTHER,TOURNOI}=require('./migration-socle-v2.cjs');
const phase6=fs.readFileSync(path.join(__dirname,'../docs/sql/compatibilite_v1_v2_staging_PHASE6_GROUPES_LANGUES.sql'),'utf8');
const verify=fs.readFileSync(path.join(__dirname,'../docs/sql/verification_phase6_staging.sql'),'utf8');
const query=async(db,q)=>(await db.query(q)).rows;
const groups=['tourneo_groupes','tourneo_groupe_membres','tourneo_groupe_participants'];
assert.match(phase6,/tourneo\.v1_copy_verified/);
assert.match(phase6,/langue in \('fr','en','nl','de'\)/);
assert.doesNotMatch(phase6,/\bdrop\s+(?:table|column)\b/i);
assert.doesNotMatch(phase6,/create or replace function public\.tourneo_public_v2\s*\(/i);
(async()=>{
 const db=await preparerPhase4();
 try{
  await db.exec(phase5);
  const previous=await query(db,'select id,user_id,nom,sport,donnees,partage_id,est_public from public.tournois');
  const profiles=await query(db,'select id,display_name,player_code from public.profiles order by id');
  await db.exec("select set_config('tourneo.v1_copy_verified','false',false)");
  await assert.rejects(db.exec(phase6),/STAGING STOP/,'cannot install without explicit staging flag');
  await db.exec('rollback').catch(()=>{});
  await db.exec("select set_config('tourneo.v1_copy_verified','true',false)");
  await db.exec(phase6);
  assert.deepEqual(await query(db,'select id,user_id,nom,sport,donnees,partage_id,est_public from public.tournois'),previous,'historical scores and sharing remain unchanged');
  assert.deepEqual(await query(db,'select id,display_name,player_code from public.profiles order by id'),profiles,'existing profiles unchanged');
  const results=await query(db,verify);
  assert.ok(results.length>=15);
  assert.ok(results.every(r=>r.status==='OK'),'Staging phase 6 checks failed: '+JSON.stringify(results.filter(r=>r.status!=='OK')));
  for(const table of groups){
   assert.equal((await query(db,"select to_regclass('public."+table+"') is not null as ok"))[0].ok,true);
   assert.equal((await query(db,"select relrowsecurity as ok from pg_class where oid=to_regclass('public."+table+"')"))[0].ok,true);
   assert.equal((await query(db,"select has_table_privilege('anon','public."+table+"','SELECT') as ok"))[0].ok,false);
   assert.equal((await query(db,"select has_table_privilege('anon','public."+table+"','INSERT') as ok"))[0].ok,false);
  }
  assert.equal((await query(db,"select has_table_privilege('anon','public.player_results','SELECT') as ok"))[0].ok,false,'rankings must not expose account results to anonymous users');
  assert.equal((await query(db,"select has_table_privilege('authenticated','public.player_results','SELECT') as ok"))[0].ok,true);
  assert.equal((await query(db,"select has_function_privilege('anon','tourneo_private.role_groupe(uuid)','EXECUTE') as ok"))[0].ok,false);
  assert.equal((await query(db,"select has_function_privilege('authenticated','public.tourneo_partager_groupe(uuid,text,text)','EXECUTE') as ok"))[0].ok,true);
  for(const langue of ['fr','en','nl','de']){
   await db.exec('begin');
   await db.exec("insert into public.tourneo_preferences(user_id,langue) values('"+OWNER+"','"+langue+"')");
   assert.equal((await query(db,"select langue from public.tourneo_preferences where user_id='"+OWNER+"'"))[0].langue,langue);
   await db.exec('rollback');
  }
  await db.exec('begin');
  await assert.rejects(db.exec("insert into public.tourneo_preferences(user_id,langue) values('"+OWNER+"','xx')"),/check constraint|violates/i);
  await db.exec('rollback').catch(()=>{});
  await db.exec('begin');
  await db.exec("select set_config('request.jwt.claim.sub','"+OWNER+"',true)");
  await db.exec('set local role authenticated');
  const created=(await query(db,"insert into public.tourneo_groupes(nom,type) values('Club fictif','club') returning id"))[0];
  assert.ok(created.id,'owner must be allowed to create their club');
  await db.exec("select public.tourneo_partager_groupe('"+created.id+"','TRN-0002','lecture')");
  const member=(await query(db,"select role from public.tourneo_groupe_membres where groupe_id='"+created.id+"' and user_id='"+OTHER+"'"))[0];
  assert.equal(member.role,'lecture');
  await db.exec("select set_config('request.jwt.claim.sub','"+OTHER+"',true)");
  await assert.rejects(db.exec("select public.tourneo_partager_groupe('"+created.id+"','TRN-0001','accompagnateur')"),/propriétaire|proprietaire|requis|denied/i);
  await db.exec('rollback').catch(()=>{});
  assert.equal((await query(db,'select count(*)::int as n from public.tourneo_groupes'))[0].n,0,'all group test data must roll back');
  assert.equal((await query(db,"select to_regprocedure('public.tourneo_public_compat_v2(uuid)') is not null as ok"))[0].ok,true,'historic share compatibility remains installed');
  await assert.rejects(db.exec(phase6),/STAGING STOP/,'must not install groups twice');
  await db.exec('rollback').catch(()=>{});
  console.log('Phase 6 fictive : clubs, accompagnateurs, langues FR/EN/NL/DE, palmarès non anonymes, données V1 intactes : OK');
 } finally { await db.close(); }
 const damaged=await preparerPhase4();
 try{
  await damaged.exec(phase5);
  await damaged.exec('update public.tournois set partage_id=null');
  await assert.rejects(damaged.exec(phase6),/STAGING STOP/);
  await damaged.exec('rollback').catch(()=>{});
  assert.equal((await query(damaged,"select to_regclass('public.tourneo_groupes') is null as ok"))[0].ok,true);
  console.log('Phase 6 fictive : ancien lien manquant = refus sans installation partielle : OK');
 } finally { await damaged.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
