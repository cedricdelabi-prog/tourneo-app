'use strict';
// Phase 17 : signalements et sanctions sur données fictives uniquement (PGlite).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup,phase16,PLAYER,OUTSIDE}=require('./migration-discussions-v2.cjs');
const {OWNER,OTHER,TOURNOI}=require('./migration-socle-v2.cjs');
const read=n=>fs.readFileSync(path.join(__dirname,'../docs/sql',n),'utf8');
const phase17=read('compatibilite_v1_v2_staging_PHASE17_MODERATION.sql');
const verify=read('verification_phase17_staging.sql');
const MESSAGE='80000000-0000-4000-8000-000000000021';
const REPORT='90000000-0000-4000-8000-000000000021';
const q=async(db,s)=>(await db.query(s)).rows;
const sender="select public.tourneo_discussion_envoyer('"+MESSAGE+"','"+TOURNOI+"','tous','Un message à signaler') as id";
const newSender="select public.tourneo_discussion_envoyer('80000000-0000-4000-8000-000000000022','"+TOURNOI+"','tous','Encore un message') as id";
const report="select public.tourneo_discussion_signaler('"+REPORT+"','"+MESSAGE+"','harcelement','Propos inappropriés') as id";
const decide=(action,motif)=>"select public.tourneo_moderation_decider('"+REPORT+"','"+action+"','"+motif+"')";
const role=async(db,user)=>{await db.exec('begin');await db.exec("select set_config('request.jwt.claim.sub','"+user+"',true)");await db.exec('set local role authenticated');};
const reset=async(db)=>db.exec('rollback').catch(()=>{});
async function fixture(){const db=await setup();await db.exec(phase16);return db;}
assert.match(phase17,/tourneo\.v1_copy_verified/);
assert.match(phase17,/create table tourneo_private\.signalements_discussions/);
assert.match(phase17,/create table tourneo_private\.sanctions_discussions/);
assert.match(phase17,/create function tourneo_private\.moderation_admin/);
assert.match(phase17,/not masque and tourneo_private\.discussion_visible/);
assert.doesNotMatch(phase17,/\bdrop\s+(?:table|column)\b/i);
(async()=>{
 const db=await fixture();
 try{
  const historique=await q(db,'select id,user_id,nom,donnees,revision,partage_id,est_public from public.tournois');
  const profils=await q(db,'select id,display_name,player_code from public.profiles order by id');
  await db.exec("select set_config('tourneo.v1_copy_verified','false',false)");
  await assert.rejects(db.exec(phase17),/STAGING STOP/);
  await reset(db);
  await db.exec("select set_config('tourneo.v1_copy_verified','true',false)");
  await db.exec(phase17);
  const checks=await q(db,verify);
  assert.ok(checks.length>=15);
  assert.ok(checks.every(x=>x.status==='OK'),JSON.stringify(checks.filter(x=>x.status!=='OK')));
  assert.deepEqual(await q(db,'select id,user_id,nom,donnees,revision,partage_id,est_public from public.tournois'),historique);
  assert.deepEqual(await q(db,'select id,display_name,player_code from public.profiles order by id'),profils);
  assert.equal((await q(db,'select count(*)::int as n from tourneo_private.administrateurs'))[0].n,0,'never bootstrap admin automatically');
  assert.equal((await q(db,"select has_table_privilege('anon','tourneo_private.signalements_discussions','SELECT') as ok"))[0].ok,false);
  assert.equal((await q(db,"select has_function_privilege('anon','public.tourneo_moderation_liste(text,integer)','EXECUTE') as ok"))[0].ok,false);

  await db.exec('begin');await db.exec('set local role anon');
  await assert.rejects(db.exec(report),/permission|denied/i);
  await reset(db);
  await role(db,OTHER);
  assert.equal((await q(db,sender))[0].id,MESSAGE);
  await db.exec('commit');
  await role(db,OUTSIDE);
  await assert.rejects(db.exec(report),/inaccessible|accès|membre/i);
  await reset(db);

  await role(db,PLAYER);
  assert.equal((await q(db,report))[0].id,REPORT);
  assert.equal((await q(db,report))[0].id,REPORT,'duplicate report must not create another record');
  assert.equal((await q(db,"select public.tourneo_moderation_compteur() as n"))[0].n,null,'non-admin cannot see security queue');
  await assert.rejects(db.exec("select public.tourneo_moderation_liste('tous',0)"),/super administrateur|administrateur/i);
  await reset(db);
  // Create the report outside the intentional failed transaction.
  await role(db,PLAYER);
  await q(db,report);
  await db.exec('commit');

  await role(db,OWNER);
  assert.equal((await q(db,"select public.tourneo_moderation_compteur() as n"))[0].n,null,'organizer is NOT automatically super-admin');
  await assert.rejects(db.exec("select public.tourneo_moderation_liste('tous',0)"),/super administrateur|administrateur/i);
  await reset(db);

  // Manuel et uniquement dans cette simulation : 1 superadmin fictif choisi.
  await db.exec("insert into tourneo_private.administrateurs(user_id,role) values('"+OWNER+"','superadmin')");
  await role(db,OWNER);
  assert.equal(Number((await q(db,"select public.tourneo_moderation_compteur() as n"))[0].n),1);
  const liste=(await q(db,"select public.tourneo_moderation_liste('tous',0) as x"))[0].x;
  assert.equal(liste.length,1);
  assert.equal(liste[0].raison,'harcelement');
  assert.equal(liste[0].signale_par,PLAYER);
  assert.ok(JSON.stringify(liste[0].contexte).includes('Un message à signaler'));
  await q(db,decide('masquer','Masquer les propos signalés'));
  assert.equal((await q(db,"select count(*)::int as n from public.tourneo_discussions where id='"+MESSAGE+"'"))[0].n,0,'masked message is hidden by RLS even from organizer');
  await q(db,decide('suspendre_24h','Suspendre temporairement le compte'));
  const first=(await q(db,"select actif,jusquau from tourneo_private.sanctions_discussions where user_id='"+OTHER+"'"))[0];
  assert.equal(first.actif,true);assert.ok(first.jusquau);
  await q(db,decide('suspendre_24h','Suspendre temporairement le compte'));
  assert.equal(new Date((await q(db,"select jusquau from tourneo_private.sanctions_discussions where user_id='"+OTHER+"'"))[0].jusquau).getTime(),new Date(first.jusquau).getTime(),'replay must not extend sanctions');
  const journal=(await q(db,"select count(*)::int as n from tourneo_private.journal_admin"))[0].n;
  assert.equal(journal,2,'only original decisions should be audited');
  await db.exec('commit');
  assert.equal((await q(db,"select masque from public.tourneo_discussions where id='"+MESSAGE+"'"))[0].masque,true,'message remains flagged for audit');

  await role(db,PLAYER);
  assert.equal((await q(db,"select count(*)::int as n from public.tourneo_discussions where id='"+MESSAGE+"'"))[0].n,0,'masked content invisible');
  await reset(db);
  await role(db,OTHER);
  await assert.rejects(db.exec(newSender),/Messagerie suspendue/i);
  await reset(db);

  await role(db,OWNER);
  await q(db,decide('retablir','Accès restauré après examen'));
  await db.exec('commit');
  await role(db,OTHER);
  assert.ok((await q(db,newSender))[0].id);
  await reset(db);

  await assert.rejects(db.exec(phase17),/STAGING STOP/,'repeat installation forbidden');
  await reset(db);
  console.log('Phase 17 fictive : signalements privés, superadmin explicite, masquage, suspension non prolongeable et audit : OK');
 } finally{await db.close();}
 const invalid=await fixture();
 try{
  await invalid.exec('update public.tournois set partage_id=null');
  await assert.rejects(invalid.exec(phase17),/STAGING STOP/);
  await reset(invalid);
  assert.equal((await q(invalid,"select to_regclass('tourneo_private.signalements_discussions') is null as ok"))[0].ok,true);
  console.log('Phase 17 fictive : anciens liens manquants -> arrêt sans sanction ni table : OK');
 } finally{await invalid.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
