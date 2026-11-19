'use strict';
/* Simulation du vrai SQL phase 4 sur une base fictive PGlite. Aucune connexion Supabase. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {preparer,phase2,OWNER,OTHER,TOURNOI}=require('./migration-socle-v2.cjs');
const phase3=fs.readFileSync(path.join(__dirname,'../docs/sql/compatibilite_v1_v2_staging_PHASE3_APPLICATIF.sql'),'utf8');
const phase4=fs.readFileSync(path.join(__dirname,'../docs/sql/compatibilite_v1_v2_staging_PHASE4_NOTIFICATIONS.sql'),'utf8');
const verify=fs.readFileSync(path.join(__dirname,'../docs/sql/verification_phase4_staging.sql'),'utf8');
const tables=['tourneo_preferences','tourneo_notifications','tourneo_evaluations'];
const query=async(db,sql)=>(await db.query(sql)).rows;
assert.match(phase4,/tourneo\.v1_copy_verified/);
assert.doesNotMatch(phase4,/create or replace function public\.tourneo_public_v2\s*\(/i);
assert.doesNotMatch(phase4,/\bdrop\s+(?:table|column)\b/i);
(async()=>{
 const db=await preparer();
 try{
  await db.exec("select set_config('tourneo.v1_copy_verified','true',false)");
  await db.exec(phase2);await db.exec(phase3);
  const prev=await query(db,'select id,user_id,nom,sport,donnees,partage_id,est_public from public.tournois');
  const players=await query(db,'select id,display_name,player_code from public.profiles order by id');
  await db.exec("select set_config('tourneo.v1_copy_verified','false',false)");
  await assert.rejects(db.exec(phase4),/STAGING STOP/);
  await db.exec('rollback').catch(()=>{});
  await db.exec("select set_config('tourneo.v1_copy_verified','true',false)");
  await db.exec(phase4);
  assert.deepEqual(await query(db,'select id,user_id,nom,sport,donnees,partage_id,est_public from public.tournois'),prev);
  assert.deepEqual(await query(db,'select id,display_name,player_code from public.profiles order by id'),players);
  const result=await query(db,verify);
  assert.ok(result.length>=14);
  assert.ok(result.every(x=>x.status==='OK'),'Phase 4 failed: '+JSON.stringify(result.filter(x=>x.status!=='OK')));
  for(const table of tables){
   assert.equal((await query(db,"select to_regclass('public."+table+"') is not null as ok"))[0].ok,true);
   assert.equal((await query(db,"select relrowsecurity as ok from pg_class where oid=to_regclass('public."+table+"')"))[0].ok,true);
   assert.equal((await query(db,"select has_table_privilege('anon','public."+table+"','INSERT') as ok"))[0].ok,false);
  }
  assert.equal((await query(db,"select has_function_privilege('anon','tourneo_private.peut_evaluer(uuid)','EXECUTE') as ok"))[0].ok,false);
  assert.equal((await query(db,"select to_regprocedure('public.tourneo_public_v2(uuid)') is null as ok"))[0].ok,true);
  await db.exec('begin');
  await db.exec("insert into public.tourneo_preferences(user_id,communications_tourneo) values('"+OTHER+"',true)");
  assert.equal((await query(db,"select consentement_promotion_at is not null as ok from public.tourneo_preferences where user_id='"+OTHER+"'"))[0].ok,true);
  await db.exec("insert into public.tourneo_arbitres(tournoi_id,user_id) values('"+TOURNOI+"','"+OTHER+"')");
  const notif=(await query(db,"select type from public.tourneo_notifications where user_id='"+OTHER+"'"))[0];
  assert.equal(notif.type,'arbitrage');
  await db.exec('rollback');
  assert.equal((await query(db,'select count(*)::int as n from public.tourneo_notifications'))[0].n,0);
  assert.equal((await query(db,'select count(*)::int as n from public.tourneo_preferences'))[0].n,0);
  await assert.rejects(db.exec(phase4),/STAGING STOP/,'reinstall phase4 must fail');
  await db.exec('rollback').catch(()=>{});
  assert.deepEqual(await query(db,'select id,user_id,nom,sport,donnees,partage_id,est_public from public.tournois'),prev);
  console.log('Phase 4 fictive : 3 tables RLS, consentement, notifications arbitre, protections et données V1 conservées : OK');
 }finally{await db.close();}
 const broken=await preparer();
 try{
  await broken.exec("select set_config('tourneo.v1_copy_verified','true',false)");
  await broken.exec(phase2);await broken.exec(phase3);
  await broken.exec('update public.tournois set partage_id=null');
  await assert.rejects(broken.exec(phase4),/STAGING STOP/);
  await broken.exec('rollback').catch(()=>{});
  assert.equal((await query(broken,"select to_regclass('public.tourneo_preferences') is null as ok"))[0].ok,true);
  console.log('Phase 4 fictive : partage V1 manquant = arrêt avant écriture : OK');
 }finally{await broken.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
