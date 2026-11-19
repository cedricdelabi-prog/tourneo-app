'use strict';
// Execute les scripts SQL Tourneo V1->V2 sur des comptes et matchs fictifs PGlite.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {preparerPhase4,phase5}=require('./migration-partages-v2.cjs');
const {OWNER,OTHER,TOURNOI}=require('./migration-socle-v2.cjs');
const dir=path.join(__dirname,'../docs/sql');
const read=name=>fs.readFileSync(path.join(dir,name),'utf8');
const phase6=read('compatibilite_v1_v2_staging_PHASE6_GROUPES_LANGUES.sql');
const phase7=read('compatibilite_v1_v2_staging_PHASE7_PROFILS.sql');
const phase8=read('compatibilite_v1_v2_staging_PHASE8_TENNIS.sql');
const phase9=read('compatibilite_v1_v2_staging_PHASE9_OLYMPIADES.sql');
const phase10=read('compatibilite_v1_v2_staging_PHASE10_APPELS_AFFICHES.sql');
const verify=read('verification_phase10_staging.sql');
const get=async(db,sql)=>(await db.query(sql)).rows;
const api=(send)=>"select public.tourneo_appel_match('"+TOURNOI+"',1,"+send+") as v";
async function preparer(){
 const db=await preparerPhase4();
 for(const phase of [phase5,phase6,phase7,phase8,phase9])await db.exec(phase);
 return db;
}
const tableau=JSON.stringify({
 cree:true,
 equipes:[
  {id:'a',nom:'Joueur invité',profilId:OTHER},
  {id:'b',nom:'Organisateur',profilId:OWNER}
 ],
 matchs:[{id:1,equipe1Id:'a',equipe2Id:'b',score1:null,score2:null}],
 matchsValides:[]
});
assert.match(phase10,/tourneo\.v1_copy_verified/);
assert.match(phase10,/create table public\.tourneo_appels/);
assert.match(phase10,/create table public\.tourneo_modeles_affiche/);
assert.doesNotMatch(phase10,/\bdrop\s+(?:table|column)\b/i);
assert.doesNotMatch(phase10,/create or replace function public\.tourneo_public_v2\s*\(/i);
(async()=>{
 const db=await preparer();
 try{
  // Configurer un match fictif à score non encore saisi.
  await db.exec("update public.tournois set donnees='"+tableau+"'::jsonb where id='"+TOURNOI+"'");
  const before=await get(db,'select id,user_id,nom,sport,donnees,revision,partage_id,est_public from public.tournois');
  const profiles=await get(db,'select id,display_name,player_code from public.profiles order by id');
  await db.exec("select set_config('tourneo.v1_copy_verified','false',false)");
  await assert.rejects(db.exec(phase10),/STAGING STOP/,'refus de bascule sans autorisation staging');
  await db.exec('rollback').catch(()=>{});
  await db.exec("select set_config('tourneo.v1_copy_verified','true',false)");
  await db.exec(phase10);
  assert.deepEqual(await get(db,'select id,user_id,nom,sport,donnees,revision,partage_id,est_public from public.tournois'),before,'aucun tournoi historique modifié');
  assert.deepEqual(await get(db,'select id,display_name,player_code from public.profiles order by id'),profiles,'aucun profil V1 modifié');
  const checks=await get(db,verify);
  assert.ok(checks.length>=14);
  assert.ok(checks.every(x=>x.status==='OK'),'phase10: '+JSON.stringify(checks.filter(x=>x.status!=='OK')));
  assert.equal((await get(db,"select has_function_privilege('anon','public.tourneo_appel_match(uuid,integer,boolean)','EXECUTE') as v"))[0].v,false);
  assert.equal((await get(db,"select has_table_privilege('anon','public.tourneo_modeles_affiche','SELECT') as v"))[0].v,false);
  await db.exec('begin');
  await db.exec('set local role anon');
  await assert.rejects(db.exec(api('false')),/permission|denied/i,'appel anonyme interdit');
  await assert.rejects(db.exec('select * from public.tourneo_modeles_affiche'),/permission|denied/i,'modèles privés anonymes interdits');
  await db.exec('rollback').catch(()=>{});

  await db.exec('begin');
  await db.exec("select set_config('request.jwt.claim.sub','"+OTHER+"',true)");
  await db.exec('set local role authenticated');
  await assert.rejects(db.exec(api('true')),/organisateur|requis|denied/i,'autre utilisateur ne peut appeler un match');
  await db.exec('rollback').catch(()=>{});

  await db.exec('begin');
  await db.exec("select set_config('request.jwt.claim.sub','"+OWNER+"',true)");
  await db.exec('set local role authenticated');
  const preview=(await get(db,api('false')))[0].v;
  assert.equal(preview.match_id,1);
  assert.equal(preview.participants.length,2);
  assert.equal(preview.participants.every(x=>x.statut==='disponible'),true);
  const sent=(await get(db,api('true')))[0].v;
  assert.equal(sent.participants.length,2);
  assert.equal(sent.participants.every(x=>x.statut==='depose'),true);
  assert.equal((await get(db,'select count(*)::int as n from public.tourneo_appels'))[0].n,2);
  // Le réenvoi n'insère pas de doublon.
  await db.exec(api('true'));
  assert.equal((await get(db,'select count(*)::int as n from public.tourneo_appels'))[0].n,2);

  const create=(await get(db,
   "insert into public.tourneo_modeles_affiche(user_id,nom,titre,identite) values('"+OWNER+"','Affiche démo','Tournoi démo','{\"logo\": \"EXEMPLE\"}'::jsonb) returning id"))[0].id;
  assert.ok(create);
  assert.equal((await get(db,"select count(*)::int as n from public.tourneo_modeles_affiche where id='"+create+"'"))[0].n,1);
  await db.exec("select set_config('request.jwt.claim.sub','"+OTHER+"',true)");
  assert.equal((await get(db,"select count(*)::int as n from public.tourneo_modeles_affiche where id='"+create+"'"))[0].n,0,'autre joueur ne lit pas le modèle');
  await assert.rejects(db.exec(
   "insert into public.tourneo_modeles_affiche(user_id,nom) values('"+OWNER+"','Faux modèle')"),
   /policy|permission|denied/i,'un autre joueur ne peut écrire au nom du propriétaire');
  await db.exec('rollback').catch(()=>{});
  assert.equal((await get(db,'select count(*)::int as n from public.tourneo_appels'))[0].n,0);
  assert.equal((await get(db,'select count(*)::int as n from public.tourneo_modeles_affiche'))[0].n,0);
  await assert.rejects(db.exec(phase10),/STAGING STOP/,'refus de réinstaller la phase10');
  await db.exec('rollback').catch(()=>{});
  console.log('Phase10 fictive : appels match, anti-doublon, droits organisateur, modèles privés et données V1 conservées : OK');
 }finally{await db.close();}
 const broken=await preparer();
 try{
  await broken.exec('update public.tournois set partage_id=null');
  await assert.rejects(broken.exec(phase10),/STAGING STOP/);
  await broken.exec('rollback').catch(()=>{});
  assert.equal((await get(broken,"select to_regclass('public.tourneo_appels') is null as v"))[0].v,true);
  assert.equal((await get(broken,"select to_regclass('public.tourneo_modeles_affiche') is null as v"))[0].v,true);
  console.log('Phase10 fictive : ancien lien V1 manquant -> arrêt avant installation : OK');
 }finally{await broken.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
