'use strict';
// Phase 16 : SQL de messagerie sur PGlite et utilisateurs strictement fictifs.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {fixture,phase14}=require('./migration-planning-public-v2.cjs');
const {OWNER,OTHER,TOURNOI}=require('./migration-socle-v2.cjs');
const read=n=>fs.readFileSync(path.join(__dirname,'../docs/sql',n),'utf8');
const phase15=read('compatibilite_v1_v2_staging_PHASE15_EQUIPES_INSCRITES.sql');
const phase16=read('compatibilite_v1_v2_staging_PHASE16_DISCUSSIONS.sql');
const verify=read('verification_phase16_staging.sql');
const PLAYER='10000001-0000-4000-8000-000000000003';
const OUTSIDE='10000002-0000-4000-8000-000000000004';
const IDS=['80000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000002',
'80000000-0000-4000-8000-000000000003','80000000-0000-4000-8000-000000000004'];
const esc=s=>s.replace(/'/g,"''");
const request=(id,audience,contenu)=>"select public.tourneo_discussion_envoyer('"+id+"','"+TOURNOI+"','"+esc(audience)+"','"+esc(contenu)+"') as id";
const rows=async(db,q)=>(await db.query(q)).rows;
async function setup(){
 const db=await fixture();
 await db.exec(phase14);
 await db.exec(phase15);
 // Auth réel possède ces colonnes : les ajouter uniquement au schéma simulé.
 await db.exec('alter table auth.users add column deleted_at timestamptz,add column banned_until timestamptz');
 await db.exec("insert into auth.users(id,email) values('"+PLAYER+"','joueur@invalid.example'),('"+OUTSIDE+"','visiteur@invalid.example')");
 await db.exec("insert into public.tourneo_arbitres(tournoi_id,user_id) values('"+TOURNOI+"','"+OTHER+"')");
 await db.exec("update public.tournois set donnees=jsonb_build_object('equipes',jsonb_build_array(jsonb_build_object('id','personne','profilId','"+PLAYER+"')),'matchs','[]'::jsonb) where id='"+TOURNOI+"'");
 return db;
}
const asUser=async(db,user)=>{await db.exec('begin');await db.exec("select set_config('request.jwt.claim.sub','"+user+"',true)");await db.exec('set local role authenticated');};
const asAnon=async(db)=>{await db.exec('begin');await db.exec('set local role anon');};
const end=async(db)=>db.exec('rollback').catch(()=>{});
const messages=async(db)=>rows(db,"select contenu,audience,auteur_id from public.tourneo_discussions order by id");
assert.match(phase16,/tourneo\.v1_copy_verified/);
assert.match(phase16,/create table public\.tourneo_discussions/);
assert.match(phase16,/create policy discussions_lecture/);
assert.match(phase16,/grant execute on function tourneo_private\.discussion_role/);
assert.doesNotMatch(phase16,/\bdrop\s+(?:table|column)\b/i);
(async()=>{
 const db=await setup();
 try{
  const before=await rows(db,"select id,user_id,nom,donnees,revision,partage_id,est_public from public.tournois");
  const profiles=await rows(db,"select id,display_name,player_code from public.profiles order by id");
  await db.exec("select set_config('tourneo.v1_copy_verified','false',false)");
  await assert.rejects(db.exec(phase16),/STAGING STOP/);
  await end(db);
  await db.exec("select set_config('tourneo.v1_copy_verified','true',false)");
  await db.exec(phase16);
  const audit=await rows(db,verify);
  assert.ok(audit.length>=12);
  assert.ok(audit.every(x=>x.status==='OK'),JSON.stringify(audit.filter(x=>x.status!=='OK')));
  assert.deepEqual(await rows(db,"select id,user_id,nom,donnees,revision,partage_id,est_public from public.tournois"),before);
  assert.deepEqual(await rows(db,"select id,display_name,player_code from public.profiles order by id"),profiles);
  await asAnon(db);
  await assert.rejects(db.exec(request(IDS[0],'tous','Public interdit')),/permission|denied/i);
  await end(db);

  await asUser(db,OUTSIDE);
  await assert.rejects(db.exec(request(IDS[0],'tous','Intrus')),/réservé|accès|membres/i);
  await end(db);

  await asUser(db,OWNER);
  assert.equal((await rows(db,request(IDS[0],'tous','Bienvenue aux membres')))[0].id,IDS[0]);
  assert.equal((await rows(db,request(IDS[0],'tous','Bienvenue aux membres')))[0].id,IDS[0],'same message ID is idempotent');
  assert.equal((await rows(db,request(IDS[1],'organisateur','Note confidentielle du responsable')))[0].id,IDS[1]);
  await db.exec('commit');
  await asUser(db,OTHER);
  assert.equal((await rows(db,request(IDS[2],'arbitres','Arbitres uniquement')))[0].id,IDS[2]);
  await assert.rejects(db.exec(request('80000000-0000-4000-8000-000000000099','joueurs','Cible impossible')),/Destinataires|autorisé/i);
  await end(db);
  // Recréer le message d'arbitre hors de la transaction volontairement annulée.
  await asUser(db,OTHER);
  await rows(db,request(IDS[2],'arbitres','Arbitres uniquement'));
  await db.exec('commit');
  await asUser(db,PLAYER);
  assert.equal((await rows(db,request(IDS[3],'joueurs','Équipe prête')))[0].id,IDS[3]);
  await db.exec('commit');

  await asUser(db,OWNER);
  assert.deepEqual((await messages(db)).map(m=>m.contenu).sort(),
   ['Arbitres uniquement','Bienvenue aux membres','Note confidentielle du responsable','Équipe prête'].sort());
  await end(db);
  await asUser(db,OTHER);
  assert.deepEqual((await messages(db)).map(m=>m.contenu).sort(),
   ['Arbitres uniquement','Bienvenue aux membres'].sort(),'referee cannot read team/private organizer chat');
  await end(db);
  await asUser(db,PLAYER);
  assert.deepEqual((await messages(db)).map(m=>m.contenu).sort(),
   ['Bienvenue aux membres','Équipe prête'].sort(),'player cannot read referees or organizer chat');
  const inbox=(await rows(db,'select public.tourneo_discussion_tournois() as t'))[0].t;
  assert.equal(inbox.length,1);assert.equal(inbox[0].role,'joueurs');
  await end(db);
  await asUser(db,OUTSIDE);
  assert.equal((await messages(db)).length,0);
  assert.deepEqual((await rows(db,'select public.tourneo_discussion_tournois() as t'))[0].t,[]);
  await end(db);

  await asUser(db,OTHER);
  const erased=await rows(db,"delete from public.tourneo_discussions where id='"+IDS[3]+"' returning id");
  assert.equal(erased.length,0,'referee cannot erase another author');
  await end(db);

  await asUser(db,OWNER);
  assert.equal((await rows(db,"delete from public.tourneo_discussions where id='"+IDS[3]+"' returning id")).length,1,'organizer can moderate own tournament');
  await end(db);

  await db.exec("update auth.users set banned_until=now()+interval '7 days' where id='"+PLAYER+"'");
  await asUser(db,PLAYER);
  assert.equal((await messages(db)).length,0,'banned user cannot continue reading chat');
  await assert.rejects(db.exec(request('80000000-0000-4000-8000-000000000008','tous','Encore')),/réservé|accès|membres/i);
  await end(db);
  await assert.rejects(db.exec(phase16),/STAGING STOP/,'reinstallation forbidden');
  await end(db);
  console.log('Phase 16 fictive : audiences privées, refus anonyme/intrus, auteur, organisateur, idempotence et bannissement : OK');
 } finally {await db.close();}
 const broken=await setup();
 try{
  await broken.exec('update public.tournois set partage_id=null');
  await assert.rejects(broken.exec(phase16),/STAGING STOP/);
  await end(broken);
  assert.equal((await rows(broken,"select to_regclass('public.tourneo_discussions') is null as ok"))[0].ok,true);
  console.log('Phase 16 fictive : anciens liens manquants bloquent installation : OK');
 } finally {await broken.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
