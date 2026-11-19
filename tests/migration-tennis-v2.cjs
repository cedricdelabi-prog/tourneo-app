'use strict';
/* Vrai SQL tennis sur PGlite avec utilisateurs fictifs. Aucun acces production. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {preparerPhase4,phase5}=require('./migration-partages-v2.cjs');
const {OWNER,OTHER,TOURNOI}=require('./migration-socle-v2.cjs');
const read=n=>fs.readFileSync(path.join(__dirname,'../docs/sql',n),'utf8');
const phase6=read('compatibilite_v1_v2_staging_PHASE6_GROUPES_LANGUES.sql');
const phase7=read('compatibilite_v1_v2_staging_PHASE7_PROFILS.sql');
const phase8=read('compatibilite_v1_v2_staging_PHASE8_TENNIS.sql');
const verify=read('verification_phase8_staging.sql');
const get=async(db,q)=>(await db.query(q)).rows;
async function preparerTennis(){const db=await preparerPhase4();await db.exec(phase5);await db.exec(phase6);await db.exec(phase7);return db;}
const setsValides=JSON.stringify([{score1:'6',score2:'4'},{score1:'7',score2:'5'}]);
const setsInvalides=JSON.stringify([{score1:'6',score2:'5'},{score1:'6',score2:'4'}]);
const appel=(sets)=>"select public.tourneo_proposer_manches('"+TOURNOI+"',1,'"+sets+"'::jsonb)";
assert.match(phase8,/tourneo\.v1_copy_verified/);
assert.match(phase8,/alter table public\.tourneo_scores_proposes add column manches/i);
assert.doesNotMatch(phase8,/create or replace function public\.tourneo_public_v2\s*\(/i);
assert.doesNotMatch(phase8,/\bdrop\s+(?:table|column)\b/i);
(async()=>{
 const db=await preparerTennis();
 try{
  await db.exec("update public.tournois set sport='tennis',donnees=donnees||'{\"optionsV2\":{\"score\":\"sets\",\"setsGagnants\":2}}'::jsonb where id='"+TOURNOI+"'");
  await db.exec("insert into public.tourneo_arbitres(tournoi_id,user_id) values('"+TOURNOI+"','"+OTHER+"')");
  const existing=await get(db,'select id,user_id,nom,donnees,partage_id,est_public from public.tournois');
  const profiles=await get(db,'select id,display_name,player_code from public.profiles order by id');
  await db.exec("select set_config('tourneo.v1_copy_verified','false',false)");
  await assert.rejects(db.exec(phase8),/STAGING STOP/);
  await db.exec('rollback').catch(()=>{});
  await db.exec("select set_config('tourneo.v1_copy_verified','true',false)");
  await db.exec(phase8);
  assert.deepEqual(await get(db,'select id,user_id,nom,donnees,partage_id,est_public from public.tournois'),existing);
  assert.deepEqual(await get(db,'select id,display_name,player_code from public.profiles order by id'),profiles);
  const checks=await get(db,verify);
  assert.ok(checks.length>=10);
  assert.ok(checks.every(x=>x.status==='OK'),JSON.stringify(checks.filter(x=>x.status!=='OK')));
  assert.equal((await get(db,"select has_function_privilege('anon','public.tourneo_proposer_manches(uuid,integer,jsonb)','EXECUTE') as v"))[0].v,false);
  await db.exec('begin');
  await db.exec("select set_config('request.jwt.claim.sub','"+OTHER+"',true)");
  await db.exec('set local role authenticated');
  const arbitrages=(await get(db,'select public.tourneo_mes_arbitrages() as v'))[0].v;
  assert.equal(arbitrages.length,1);
  assert.equal(arbitrages[0].score,'sets');
  await db.exec(appel(setsValides));
  const row=(await get(db,"select score1,score2,manches,statut from public.tourneo_scores_proposes where tournoi_id='"+TOURNOI+"'"))[0];
  assert.equal(row.score1,2);assert.equal(row.score2,0);assert.equal(row.manches.length,2);
  assert.equal(row.statut,'propose');
  await db.exec('rollback');
  assert.equal((await get(db,'select count(*)::int as n from public.tourneo_scores_proposes'))[0].n,0);
  await db.exec('begin');
  await db.exec("select set_config('request.jwt.claim.sub','"+OTHER+"',true)");
  await db.exec('set local role authenticated');
  await assert.rejects(db.exec(appel(setsInvalides)),/set|manche|écart/i);
  await db.exec('rollback').catch(()=>{});
  await db.exec('begin');
  await db.exec("select set_config('request.jwt.claim.sub','"+OWNER+"',true)");
  await db.exec('set local role authenticated');
  await assert.rejects(db.exec(appel(setsValides)),/arbitre|requis|permission/i);
  await db.exec('rollback').catch(()=>{});
  await db.exec('begin');
  await db.exec('set local role anon');
  await assert.rejects(db.exec(appel(setsValides)),/permission|denied/i);
  await db.exec('rollback').catch(()=>{});
  await assert.rejects(db.exec(phase8),/STAGING STOP/,'reinstall must be forbidden');
  await db.exec('rollback').catch(()=>{});
  console.log('Phase 8 tennis fictive : sets corrects, arbitres autorises, scores invalides et anonymes refuses, V1 intacte : OK');
 }finally{await db.close();}
 const broken=await preparerTennis();
 try{
  await broken.exec('update public.tournois set partage_id=null');
  await assert.rejects(broken.exec(phase8),/STAGING STOP/);
  await broken.exec('rollback').catch(()=>{});
  assert.equal((await get(broken,"select to_regprocedure('public.tourneo_proposer_manches(uuid,integer,jsonb)') is null as v"))[0].v,true);
  console.log('Phase 8 tennis fictive : anciens liens manquants bloquent toute installation : OK');
 }finally{await broken.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
