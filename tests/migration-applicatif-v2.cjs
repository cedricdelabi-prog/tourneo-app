'use strict';
/* Tests locaux PGlite avec identites fictives : aucune connexion a Supabase. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {preparer,phase2,OWNER,OTHER,TOURNOI}=require('./migration-socle-v2.cjs');
const phase3=fs.readFileSync(path.join(__dirname,'../docs/sql/compatibilite_v1_v2_staging_PHASE3_APPLICATIF.sql'),'utf8');
const verify=fs.readFileSync(path.join(__dirname,'../docs/sql/verification_phase3_staging.sql'),'utf8');
const tables=['tourneo_inscriptions_config','tourneo_inscriptions','tourneo_evenements','tourneo_evenement_tournois','tourneo_arbitres','tourneo_scores_proposes'];
const query=async(db,sql)=>(await db.query(sql)).rows;
assert.match(phase3,/tourneo\.v1_copy_verified/);
assert.doesNotMatch(phase3,/create or replace function public\.tourneo_public_v2\s*\(/i);
assert.doesNotMatch(phase3,/\bdrop\s+(table|column)\b/i);
(async()=>{
 const db=await preparer();
 try{
  await db.exec("select set_config('tourneo.v1_copy_verified','true',false)");
  await db.exec(phase2);
  const historique=await query(db,'select id,user_id,nom,sport,donnees,partage_id,est_public from public.tournois');
  const profils=await query(db,'select id,display_name,player_code from public.profiles order by id');
  await db.exec("select set_config('tourneo.v1_copy_verified','false',false)");
  await assert.rejects(db.exec(phase3),/STAGING STOP/,'missing staging authorization must abort');
  await db.exec('rollback').catch(()=>{});
  await db.exec("select set_config('tourneo.v1_copy_verified','true',false)");
  await db.exec(phase3);
  assert.deepEqual(await query(db,'select id,user_id,nom,sport,donnees,partage_id,est_public from public.tournois'),historique);
  assert.deepEqual(await query(db,'select id,display_name,player_code from public.profiles order by id'),profils);
  const rapports=await query(db,verify);
  assert.ok(rapports.length>=13,'verify all new tables and grants');
  assert.ok(rapports.every(x=>x.status==='OK'),'Phase 3 failures: '+JSON.stringify(rapports.filter(x=>x.status!=='OK')));
  for(const table of tables){
   assert.equal((await query(db,"select to_regclass('public."+table+"') is not null as ok"))[0].ok,true);
   assert.equal((await query(db,"select relrowsecurity as ok from pg_class where oid=to_regclass('public."+table+"')"))[0].ok,true);
   assert.equal((await query(db,"select has_table_privilege('anon','public."+table+"','INSERT') as ok"))[0].ok,false);
  }
  assert.equal((await query(db,"select to_regprocedure('public.tourneo_public_v2(uuid)') is null as ok"))[0].ok,true,'unsafe public sharing RPC must not be created');
  assert.equal((await query(db,"select has_function_privilege('anon','public.tourneo_demarrer(uuid,jsonb,text,text)','EXECUTE') as ok"))[0].ok,false);
  await db.exec('begin');
  await db.exec("select set_config('request.jwt.claim.sub','"+OWNER+"',true)");
  await db.exec('set local role authenticated');
  await db.exec("select public.tourneo_configurer_inscriptions('"+TOURNOI+"',true,16,null,true)");
  const cfg=(await query(db,"select ouvert,capacite from public.tourneo_inscriptions_config where tournoi_id='"+TOURNOI+"'"))[0];
  assert.equal(cfg.ouvert,true);assert.equal(cfg.capacite,16);
  await db.exec('rollback');
  assert.equal((await query(db,'select count(*)::int as n from public.tourneo_inscriptions_config'))[0].n,0,'test must roll back its synthetic registration');
  await db.exec('begin');
  await db.exec("select set_config('request.jwt.claim.sub','"+OTHER+"',true)");
  await db.exec('set local role authenticated');
  await assert.rejects(db.exec("select public.tourneo_configurer_inscriptions('"+TOURNOI+"',true,16,null,true)"),/organisateur|requis|denied/i);
  await db.exec('rollback').catch(()=>{});
  assert.deepEqual(await query(db,'select id,user_id,nom,sport,donnees,partage_id,est_public from public.tournois'),historique);
  await assert.rejects(db.exec(phase3),/STAGING STOP/,'repeat phase 3 must not be accepted');
  await db.exec('rollback').catch(()=>{});
  console.log('Phase 3 fictive: 6 tables, RLS, droits, RPC organisateur, UUID/scores/liens et refus reinstallation: OK');
 }finally{await db.close();}
 const missing=await preparer();
 try{
  await missing.exec("select set_config('tourneo.v1_copy_verified','true',false)");
  await missing.exec(phase2);
  await missing.exec('update public.tournois set partage_id=null');
  await assert.rejects(missing.exec(phase3),/STAGING STOP/);
  await missing.exec('rollback').catch(()=>{});
  assert.equal((await query(missing,"select to_regclass('public.tourneo_inscriptions') is null as ok"))[0].ok,true,'broken legacy links block migration atomically');
  console.log('Phase 3 fictive: anciens liens manquants refusés sans installation partielle: OK');
 }finally{await missing.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
