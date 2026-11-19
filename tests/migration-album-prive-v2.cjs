'use strict';
/* Teste la vraie phase 12 dans PostgreSQL embarqué, avec comptes inventés. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {preparerPhase4,phase5}=require('./migration-partages-v2.cjs');
const {OWNER,OTHER,TOURNOI}=require('./migration-socle-v2.cjs');
const read=n=>fs.readFileSync(path.join(__dirname,'../docs/sql',n),'utf8');
const stages=[phase5,...['PHASE6_GROUPES_LANGUES','PHASE7_PROFILS','PHASE8_TENNIS','PHASE9_OLYMPIADES','PHASE10_APPELS_AFFICHES','PHASE11_JOUEURS'].map(x=>read('compatibilite_v1_v2_staging_'+x+'.sql'))];
const phase12=read('compatibilite_v1_v2_staging_PHASE12_ALBUM_PRIVE.sql');
const verify=read('verification_phase12_staging.sql');
const q=async(db,sql)=>(await db.query(sql)).rows;
const ALBUM='a0000000-0000-4000-8000-000000000001';
const EXPIRED='20000000-0000-4000-8000-000000000098';
const EXPERT='20000000-0000-4000-8000-000000000099';
const pathOwner=OWNER+'/tournois/'+TOURNOI+'/album-'+ALBUM+'.jpg';
async function preparer(){
 const db=await preparerPhase4();
 for(const s of stages)await db.exec(s);
 await db.exec('create role service_role nologin');
 await db.exec('grant usage on schema storage to service_role');
 await db.exec('grant select on storage.objects to service_role');
 await db.exec('alter table storage.objects add column created_at timestamptz not null default now()');
 return db;
}
function prochaine(date,duree){return Math.abs(new Date(date).getTime()-Date.now()-duree*86400000)<120000;}
assert.match(phase12,/tourneo\.v1_copy_verified/);
assert.match(phase12,/alter policy media_owner_read/i);
assert.match(phase12,/alter policy media_owner_insert/i);
assert.match(phase12,/create table public\.tourneo_album_photos/i);
assert.doesNotMatch(phase12,/alter table public\.tournois add column termine_at/i);
assert.doesNotMatch(phase12,/create function public\.tourneo_album_public/i);
(async()=>{
 const db=await preparer();
 try{
  const prior=await q(db,'select id,user_id,donnees,partage_id,est_public,photos_expirent_at from public.tournois');
  await db.exec("select set_config('tourneo.v1_copy_verified','false',false)");
  await assert.rejects(db.exec(phase12),/STAGING STOP/);
  await db.exec('rollback').catch(()=>{});
  await db.exec("select set_config('tourneo.v1_copy_verified','true',false)");
  await db.exec(phase12);
  assert.deepEqual(await q(db,'select id,user_id,donnees,partage_id,est_public,photos_expirent_at from public.tournois'),prior);
  const results=await q(db,verify);
  assert.ok(results.length>=15);
  assert.ok(results.every(r=>r.status==='OK'),JSON.stringify(results.filter(r=>r.status!=='OK')));
  const anon=(await q(db,"select has_table_privilege('anon','public.tourneo_album_photos','SELECT') as a,has_function_privilege('anon','public.tourneo_photos_a_supprimer()','EXECUTE') as b"))[0];
  assert.equal(anon.a,false);assert.equal(anon.b,false);

  await db.exec("insert into public.tournois(id,user_id,nom,sport,donnees,partage_id) values"+
   "('"+EXPIRED+"','"+OWNER+"','Simple test','petanque','{\"termine\":true}'::jsonb,'40000000-0000-4000-8000-000000000098'),"+
   "('"+EXPERT+"','"+OWNER+"','Expert test','petanque','{\"termine\":true,\"optionsV2\":{\"mode\":\"expert\"}}'::jsonb,'40000000-0000-4000-8000-000000000099')");
  const dates=await q(db,"select id,photos_expirent_at from public.tournois where id in ('"+EXPIRED+"','"+EXPERT+"') order by id");
  assert.equal(prochaine(dates[0].photos_expirent_at,15),true,'standard expiry 15 days');
  assert.equal(prochaine(dates[1].photos_expirent_at,90),true,'expert expiry 90 days');
  await db.exec("update public.tournois set photos_expirent_at=now()+interval '365 days' where id='"+EXPIRED+"'");
  assert.equal((await q(db,"select photos_expirent_at from public.tournois where id='"+EXPIRED+"'"))[0].photos_expirent_at,dates[0].photos_expirent_at,'deadline immutable');

  await db.exec("insert into storage.objects(bucket_id,name) values('tourneo-media','"+pathOwner+"')");
  await db.exec('begin');await db.exec('set local role anon');
  await assert.rejects(db.exec('select * from public.tourneo_album_photos'),/permission|denied/i);
  await db.exec('rollback').catch(()=>{});

  await db.exec('begin');
  await db.exec("select set_config('request.jwt.claim.sub','"+OTHER+"',true)");
  await db.exec('set local role authenticated');
  await assert.rejects(db.exec("insert into public.tourneo_album_photos(id,tournoi_id,user_id,path) values('"+ALBUM+"','"+TOURNOI+"','"+OTHER+"','"+pathOwner+"')"),/policy|permission|denied|violates|transf|photo/i);
  await db.exec('rollback').catch(()=>{});

  await db.exec('begin');
  await db.exec("select set_config('request.jwt.claim.sub','"+OWNER+"',true)");
  await db.exec('set local role authenticated');
  await db.exec("insert into public.tourneo_album_photos(id,tournoi_id,user_id,path) values('"+ALBUM+"','"+TOURNOI+"','"+OWNER+"','"+pathOwner+"')");
  assert.equal((await q(db,'select count(*)::int as n from public.tourneo_album_photos'))[0].n,1);
  await db.exec("select set_config('request.jwt.claim.sub','"+OTHER+"',true)");
  assert.equal((await q(db,'select count(*)::int as n from public.tourneo_album_photos'))[0].n,0,'other user cannot read album');
  await db.exec('rollback');
  assert.equal((await q(db,'select count(*)::int as n from public.tourneo_album_photos'))[0].n,0);

  await db.exec('alter table public.tournois disable trigger date_conservation_photos');
  await db.exec("update public.tournois set photos_expirent_at=now()-interval '1 minute' where id='"+EXPIRED+"'");
  await db.exec('alter table public.tournois enable trigger date_conservation_photos');
  const expiredPath=OWNER+'/tournois/'+EXPIRED+'/album-'+ALBUM+'.jpg';
  await db.exec("insert into storage.objects(bucket_id,name) values('tourneo-media','"+expiredPath+"')");
  await db.exec('begin');
  await db.exec("select set_config('request.jwt.claim.sub','"+OWNER+"',true)");
  await db.exec('set local role authenticated');
  assert.equal((await q(db,"select public.tourneo_duree_photo('"+EXPIRED+"') as n"))[0].n,0);
  assert.equal((await q(db,"select count(*)::int as n from storage.objects where name='"+expiredPath+"'"))[0].n,0);
  await db.exec('rollback');
  await db.exec('begin');
  await db.exec("select set_config('request.jwt.claim.sub','"+OWNER+"',true)");
  await db.exec('set local role authenticated');
  await assert.rejects(db.exec("insert into storage.objects(bucket_id,name) values('tourneo-media','"+OWNER+"/tournois/"+EXPIRED+"/new.jpg')"),/policy|permission|denied/i);
  await db.exec('rollback').catch(()=>{});
  await db.exec('begin');await db.exec('set local role service_role');
  const purge=await q(db,'select name from public.tourneo_photos_a_supprimer()');
  assert.ok(purge.some(x=>x.name===expiredPath),'expiry purge candidate detected');
  await db.exec('rollback');
  await assert.rejects(db.exec(phase12),/STAGING STOP/);
  await db.exec('rollback').catch(()=>{});
  console.log('Phase 12 fictive : album privé, expiration 15/90 jours, accès propriétaire, purge et refus anonyme : OK');
 }finally{await db.close();}
 const bad=await preparer();
 try{
  await bad.exec('update public.tournois set partage_id=null');
  await assert.rejects(bad.exec(phase12),/STAGING STOP/);
  await bad.exec('rollback').catch(()=>{});
  assert.equal((await q(bad,"select to_regclass('public.tourneo_album_photos') is null as a"))[0].a,true);
  console.log('Phase 12 fictive : mauvais anciens liens bloquent la migration : OK');
 }finally{await bad.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
