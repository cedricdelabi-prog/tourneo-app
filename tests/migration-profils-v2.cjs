'use strict';
/* Profil public connecte : essai du VRAI SQL phase 7 sur PGlite fictif, jamais V1. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {preparerPhase4,phase5}=require('./migration-partages-v2.cjs');
const {OWNER,OTHER}=require('./migration-socle-v2.cjs');
const sql=name=>fs.readFileSync(path.join(__dirname,'../docs/sql',name),'utf8');
const phase6=sql('compatibilite_v1_v2_staging_PHASE6_GROUPES_LANGUES.sql');
const phase7=sql('compatibilite_v1_v2_staging_PHASE7_PROFILS.sql');
const verify=sql('verification_phase7_staging.sql');
const query=async(db,s)=>(await db.query(s)).rows;
assert.match(phase7,/tourneo\.v1_copy_verified/);
assert.match(phase7,/auth\.uid\(\) is not null/);
assert.match(phase7,/null::text,p\.favorite_color/);
assert.match(phase7,/cardinality\(p_ids\) between 1 and 256/);
assert.doesNotMatch(phase7,/\bdrop\s+(?:table|column)\b/i);
(async()=>{
 const db=await preparerPhase4();
 try{
  await db.exec(phase5);
  await db.exec(phase6);
  await db.exec("update public.profiles set first_name='PRENOM_CACHE',last_name='NOM_CACHE',city='VILLE_CACHE',avatar_url='PHOTO_PRIVEE' where id='"+OTHER+"'");
  const profils=await query(db,'select id,display_name,player_code,first_name,last_name,city,avatar_url from public.profiles order by id');
  const tournois=await query(db,'select id,user_id,nom,donnees,partage_id,est_public from public.tournois order by id');
  await db.exec("select set_config('tourneo.v1_copy_verified','false',false)");
  await assert.rejects(db.exec(phase7),/STAGING STOP/);
  await db.exec('rollback').catch(()=>{});
  await db.exec("select set_config('tourneo.v1_copy_verified','true',false)");
  await db.exec(phase7);
  assert.deepEqual(await query(db,'select id,display_name,player_code,first_name,last_name,city,avatar_url from public.profiles order by id'),profils);
  assert.deepEqual(await query(db,'select id,user_id,nom,donnees,partage_id,est_public from public.tournois order by id'),tournois);
  const validations=await query(db,verify);
  assert.ok(validations.length>=9);
  assert.ok(validations.every(v=>v.status==='OK'),JSON.stringify(validations.filter(v=>v.status!=='OK')));
  const privileges=(await query(db,"select "+
   "has_function_privilege('anon','public.tourneo_profils_publics(text,uuid[])','EXECUTE') as anonymes,"+
   "has_function_privilege('authenticated','public.tourneo_profils_publics(text,uuid[])','EXECUTE') as connectes"))[0];
  assert.equal(privileges.anonymes,false);
  assert.equal(privileges.connectes,true);
  await db.exec('begin');
  await db.exec('set local role authenticated');
  assert.equal((await query(db,"select count(*)::int as n from public.tourneo_profils_publics(p_code=>'TRN-0002')"))[0].n,0,'login must be required, not only authenticated role');
  await db.exec("select set_config('request.jwt.claim.sub','"+OWNER+"',true)");
  const codes=await query(db,"select * from public.tourneo_profils_publics(p_code=>' trn-0002 ')");
  assert.equal(codes.length,1);
  assert.equal(codes[0].id,OTHER);
  assert.equal(codes[0].player_code,'TRN-0002');
  assert.equal(codes[0].avatar_url,null,'private avatar must never be exposed');
  assert.deepEqual(Object.keys(codes[0]).sort(),['avatar_url','display_name','favorite_color','id','player_code'].sort(),'no real name, city, email or contact column');
  const byIds=await query(db,"select id from public.tourneo_profils_publics(p_ids=>ARRAY['"+OWNER+"'::uuid,'"+OTHER+"'::uuid]) order by id");
  assert.equal(byIds.length,2);
  const oversize=Array.from({length:257},()=>"'"+OWNER+"'::uuid").join(",");
  const refused=await query(db,"select count(*)::int as n from public.tourneo_profils_publics(p_ids=>ARRAY["+oversize+"])");
  assert.equal(refused[0].n,0,'bulk lookup must limit input to 256 references');
  await db.exec('rollback');
  await db.exec('begin');
  await db.exec('set local role anon');
  await assert.rejects(db.exec("select * from public.tourneo_profils_publics(p_code=>'TRN-0002')"),/permission denied|permission/i,'anonymous lookup must not be executable');
  await db.exec('rollback').catch(()=>{});
  await assert.rejects(db.exec(phase7),/STAGING STOP/,'second install should fail');
  await db.exec('rollback').catch(()=>{});
  console.log('Phase 7 fictive : recherche de joueurs connectés, groupes, données privées cachées, entrée en masse bornée, anonymes refusés : OK');
 } finally { await db.close(); }
 const damaged=await preparerPhase4();
 try{
  await damaged.exec(phase5);
  await damaged.exec(phase6);
  await damaged.exec('update public.tournois set partage_id=null');
  await assert.rejects(damaged.exec(phase7),/STAGING STOP/);
  await damaged.exec('rollback').catch(()=>{});
  assert.equal((await query(damaged,"select to_regprocedure('public.tourneo_profils_publics(text,uuid[])') is null as ok"))[0].ok,true);
  console.log('Phase 7 fictive : anciens liens manquants = arrêt avant toute fonction publique : OK');
 } finally { await damaged.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
