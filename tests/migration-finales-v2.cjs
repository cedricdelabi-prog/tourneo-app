'use strict';
// Repetition des phases restantes sur une base PGlite FICTIVE; aucun acces Supabase.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup,phase16}=require('./migration-discussions-v2.cjs');
const {OWNER,TOURNOI}=require('./migration-socle-v2.cjs');
const read=name=>fs.readFileSync(path.join(__dirname,'../docs/sql',name),'utf8');
const phase17=read('compatibilite_v1_v2_staging_PHASE17_MODERATION.sql');
const phase18=read('compatibilite_v1_v2_staging_PHASE18_LIENS_TV.sql');
const phase19=read('compatibilite_v1_v2_staging_PHASE19_PRONOSTICS.sql');
const phase20=read('compatibilite_v1_v2_staging_PHASE20_SERVICES.sql');
const phases=[phase18,phase19,phase20];
const q=async(db,sql)=>(await db.query(sql)).rows;
for(const [i,sql] of phases.entries()){
 assert.match(sql,/current_setting\('tourneo\.v1_copy_verified'/,'Verrou staging manquant phase '+(18+i));
 assert.doesNotMatch(sql,/\bdrop\s+(?:table|column)\b/i,'Suppression de donnees V1 interdite');
 assert.match(sql,/^commit;\s*$/m,'Transaction de migration non finalisee');
}
(async()=>{
 const db=await setup();
 try{
  await db.exec(phase16);
  await db.exec(phase17);
  const original=await q(db,'select id,user_id,nom,sport,donnees,partage_id,est_public from public.tournois');
  const profiles=await q(db,'select id,display_name,player_code from public.profiles order by id');
  for(const [i,sql] of phases.entries()){
   const numero=18+i;
   await db.exec("select set_config('tourneo.v1_copy_verified','false',false)");
   await assert.rejects(db.exec(sql),/STAGING STOP|Expected Tourneo V1/i,'Phase '+numero+' doit refuser un environnement non arme');
   await db.exec('rollback').catch(()=>{});
   await db.exec("select set_config('tourneo.v1_copy_verified','true',false)");
   await db.exec(sql);
   assert.deepEqual(await q(db,'select id,user_id,nom,sport,donnees,partage_id,est_public from public.tournois'),original,'Phase '+numero+' doit conserver la V1');
   assert.deepEqual(await q(db,'select id,display_name,player_code from public.profiles order by id'),profiles,'Phase '+numero+' doit conserver les comptes');
   console.log('Phase '+numero+' : installation fictive et donnees historiques conservees');
  }
  assert.equal((await q(db,"select to_regclass('public.tourneo_tv_pilotage') is not null as ok"))[0].ok,true);
  assert.equal((await q(db,"select to_regclass('public.tourneo_pronostics_config') is not null as ok"))[0].ok,true);
  assert.equal((await q(db,"select to_regclass('public.tourneo_push_abonnements') is not null as ok"))[0].ok,true);
  assert.equal((await q(db,"select count(*)::int as n from public.tournois where partage_id is not null"))[0].n,1);
  await db.exec('begin');await db.exec('set local role anon');
  await assert.rejects(db.exec("select * from public.tourneo_tv_pilotage"),/permission denied/i);
  await db.exec('rollback');
  console.log('Phases 18-20 fictives : patrimoine V1 et refus anonymous TV controles');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
