'use strict';
/* Vrai SQL phase 5 sur PGlite fictif, aucune donnée ou connexion de production. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {preparer,phase2,OWNER,OTHER,TOURNOI}=require('./migration-socle-v2.cjs');
const sql=n=>fs.readFileSync(path.join(__dirname,'../docs/sql',n),'utf8');
const phase3=sql('compatibilite_v1_v2_staging_PHASE3_APPLICATIF.sql');
const phase4=sql('compatibilite_v1_v2_staging_PHASE4_NOTIFICATIONS.sql');
const phase5=sql('compatibilite_v1_v2_staging_PHASE5_PARTAGES.sql');
const verify=sql('verification_phase5_staging.sql');
const SHARE='30000000-0000-4000-8000-000000000001';
const PRIVATE='20000000-0000-4000-8000-000000000002';
const PRIVATE_SHARE='30000000-0000-4000-8000-000000000002';
const query=async(db,sql)=>(await db.query(sql)).rows;
const legacy=[
"create function public.get_tourneo_public(p_id uuid)",
"returns table(id uuid,nom text,sport text,donnees jsonb)",
"language sql stable security definer set search_path = '' as $fn$",
"select t.id,t.nom,t.sport,t.donnees from public.tournois t where t.id=p_id limit 1;",
"$fn$;"
].join('\n');
async function preparerPhase4(){
 const db=await preparer();
 await db.exec(legacy);
 await db.exec("select set_config('tourneo.v1_copy_verified','true',false)");
 await db.exec(phase2);await db.exec(phase3);await db.exec(phase4);
 return db;
}
assert.match(phase5,/tourneo\.v1_copy_verified/);
assert.match(phase5,/t\.est_public is true/i);
assert.doesNotMatch(phase5,/\bdrop\s+(?:table|column)\b/i);
(async()=>{
 const db=await preparerPhase4();
 try{
  await db.exec("insert into public.tournois(id,user_id,nom,sport,donnees,partage_id,est_public) values("+
   "'"+PRIVATE+"','"+OTHER+"','Tournoi secret','tennis',"+
   "'{\"equipes\":[{\"id\":\"p\",\"nom\":\"Cache\"}],\"matchs\":[],\"secret\":\"CONFIDENTIEL\"}'::jsonb,"+
   "'"+PRIVATE_SHARE+"',false)");
  const before=await query(db,'select id,user_id,nom,sport,donnees,partage_id,est_public from public.tournois order by id');
  const profils=await query(db,'select id,display_name,player_code from public.profiles order by id');
  await db.exec("select set_config('tourneo.v1_copy_verified','false',false)");
  await assert.rejects(db.exec(phase5),/STAGING STOP/);
  await db.exec('rollback').catch(()=>{});
  await db.exec("select set_config('tourneo.v1_copy_verified','true',false)");
  await db.exec(phase5);
  assert.deepEqual(await query(db,'select id,user_id,nom,sport,donnees,partage_id,est_public from public.tournois order by id'),before);
  assert.deepEqual(await query(db,'select id,display_name,player_code from public.profiles order by id'),profils);
  const checks=await query(db,verify);
  assert.ok(checks.length>=9);
  assert.ok(checks.every(c=>c.status==='OK'),JSON.stringify(checks.filter(c=>c.status!=='OK')));
  const get=async(fn,id)=>(await query(db,"select public."+fn+"('"+id+"'::uuid) as value"))[0].value;
  const canonical=await get('tourneo_public_v2',TOURNOI);
  assert.equal(canonical.id,TOURNOI);
  assert.deepEqual(await get('tourneo_public_compat_v2',TOURNOI),canonical);
  assert.deepEqual(await get('tourneo_public_compat_v2',SHARE),canonical);
  const projection=JSON.stringify(canonical);
  assert.equal(projection.includes('"ancien"'),false,'private V1 settings should not be published');
  assert.equal(projection.includes('"user_id"'),false,'account owner must not be exposed');
  assert.equal(canonical.donnees.equipes[0].nom,'Equipe originale');
  assert.equal(canonical.donnees.matchs[0].score1,'13');
  assert.notEqual(canonical.donnees.equipes[0].id,'a','participant references should be pseudonymized');
  for(const id of [PRIVATE,PRIVATE_SHARE]){
   assert.equal(await get('tourneo_public_compat_v2',id),null,'private tournament must stay hidden');
  }
  assert.equal(await get('tourneo_public_v2',PRIVATE),null,'direct public RPC must not bypass privacy');
  const rights=(await query(db,"select "+
   "has_function_privilege('anon','public.tourneo_public_v2(uuid)','EXECUTE') as pub,"+
   "has_function_privilege('anon','public.tourneo_public_compat_v2(uuid)','EXECUTE') as alias,"+
   "has_function_privilege('anon','tourneo_private.reference_publique(uuid,text)','EXECUTE') as helper"))[0];
  assert.equal(rights.pub,true);assert.equal(rights.alias,true);assert.equal(rights.helper,false);
  await db.exec('begin');
  await db.exec("update public.tournois set est_public=false where id='"+TOURNOI+"'");
  assert.equal(await get('tourneo_public_v2',TOURNOI),null);
  assert.equal(await get('tourneo_public_compat_v2',SHARE),null);
  await db.exec('rollback');
  assert.equal((await query(db,"select to_regprocedure('public.get_tourneo_public(uuid)') is not null as exists"))[0].exists,true,'legacy V1 RPC remains available until planned retirement');
  await assert.rejects(db.exec(phase5),/STAGING STOP/,'re-installation should be denied');
  await db.exec('rollback').catch(()=>{});
  console.log('Phase 5 fictive : partage public V2, anciens alias, tournoi privé caché, données internes absentes : OK');
 }finally{await db.close();}
 const broken=await preparerPhase4();
 try{
  await broken.exec('update public.tournois set partage_id=null');
  await assert.rejects(broken.exec(phase5),/STAGING STOP/);
  await broken.exec('rollback').catch(()=>{});
  assert.equal((await query(broken,"select to_regprocedure('public.tourneo_public_compat_v2(uuid)') is null as absent"))[0].absent,true);
  console.log('Phase 5 fictive : absence lien historique = arrêt transactionnel : OK');
 }finally{await broken.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
