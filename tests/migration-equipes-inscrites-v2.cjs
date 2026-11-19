'use strict';
// Démarrage d'un tournoi avec inscriptions acceptées : SQL réel, comptes fictifs.
// Aucune connexion aux bases Supabase, aucun accès production.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {fixture,phase14}=require('./migration-planning-public-v2.cjs');
const {OWNER,OTHER,TOURNOI}=require('./migration-socle-v2.cjs');
const read=n=>fs.readFileSync(path.join(__dirname,'../docs/sql',n),'utf8');
const phase15=read('compatibilite_v1_v2_staging_PHASE15_EQUIPES_INSCRITES.sql');
const verify=read('verification_phase15_staging.sql');
const rows=async(db,s)=>(await db.query(s)).rows;
const ACCEPTED='60000000-0000-4000-8000-000000000001';
const TOKEN='70000000-0000-4000-8000-000000000001';
const note=(label)=>JSON.stringify({cree:false,
 equipes:[
  {id:label,nom:'Club fictif',membresOrigine:label==='groupe-valide'?[{id:'inscription:'+ACCEPTED}]:[]},
  {id:'adversaire',nom:'Equipe adverse'}
 ],
 matchs:[{id:1,equipe1Id:label,equipe2Id:'adversaire',terrain:1,score1:null,score2:null}]
});
const direct=JSON.stringify({cree:false,
 equipes:[{id:'inscription:'+ACCEPTED,nom:'Club inscrit'},{id:'adversaire',nom:'Adversaire'}],
 matchs:[{id:1,equipe1Id:'inscription:'+ACCEPTED,equipe2Id:'adversaire'}]});
const individuel=JSON.stringify({cree:false,
 equipes:[{id:'membre-direct',profilId:OTHER,nom:'Joueur inscrit'},{id:'autre',nom:'Adversaire'}],
 matchs:[{id:1,equipe1Id:'membre-direct',equipe2Id:'autre'}]});
const request=payload=>"select public.tourneo_demarrer('"+TOURNOI+"','"+payload+"'::jsonb,'Tournoi commencé','petanque') as id";
async function preparer(){
 const db=await fixture();
 await db.exec(phase14);
 return db;
}
assert.match(phase15,/tourneo\.v1_copy_verified/);
assert.match(phase15,/e->'membresOrigine'/);
assert.match(phase15,/e->>'profilId'/);
assert.match(phase15,/security definer set search_path=''/);
assert.match(phase15,/security definer set search_path='' as \$\$\s*declare/,'PL/pgSQL dollar quoting must remain valid');
assert.doesNotMatch(phase15,/\bdrop\s+(?:table|column)\b/i);
(async()=>{
 const db=await preparer();
 try{
  await db.exec("insert into public.tourneo_inscriptions(id,tournoi_id,user_id,jeton,nom,type_participant,joueurs,statut) values("+
    "'"+ACCEPTED+"','"+TOURNOI+"','"+OTHER+"','"+TOKEN+"','Club invité','equipe',ARRAY['Joueur 1','Joueur 2'],'accepte')");
  await db.exec("insert into public.tourneo_inscriptions_config(tournoi_id,ouvert,capacite) values('"+TOURNOI+"',true,16)");
  const prev=await rows(db,'select id,user_id,nom,sport,donnees,revision,partage_id,est_public from public.tournois');
  const profiles=await rows(db,'select id,display_name,player_code from public.profiles order by id');
  const registrations=await rows(db,'select id,tournoi_id,user_id,statut,joueurs from public.tourneo_inscriptions');
  await db.exec("select set_config('tourneo.v1_copy_verified','false',false)");
  await assert.rejects(db.exec(phase15),/STAGING STOP/,'no staging permission');
  await db.exec('rollback').catch(()=>{});
  await db.exec("select set_config('tourneo.v1_copy_verified','true',false)");
  await db.exec(phase15);
  const audit=await rows(db,verify);
  assert.ok(audit.length>=11);
  assert.ok(audit.every(x=>x.status==='OK'),JSON.stringify(audit.filter(x=>x.status!=='OK')));
  assert.deepEqual(await rows(db,'select id,user_id,nom,sport,donnees,revision,partage_id,est_public from public.tournois'),prev);
  assert.deepEqual(await rows(db,'select id,display_name,player_code from public.profiles order by id'),profiles);
  assert.deepEqual(await rows(db,'select id,tournoi_id,user_id,statut,joueurs from public.tourneo_inscriptions'),registrations);
  assert.equal((await rows(db,"select has_function_privilege('anon','public.tourneo_demarrer(uuid,jsonb,text,text)','EXECUTE') as ok"))[0].ok,false);
  assert.equal((await rows(db,"select has_function_privilege('authenticated','public.tourneo_demarrer(uuid,jsonb,text,text)','EXECUTE') as ok"))[0].ok,true);

  await db.exec('begin');await db.exec('set local role anon');
  await assert.rejects(db.exec(request(direct)),/permission|denied/i);
  await db.exec('rollback').catch(()=>{});

  await db.exec('begin');
  await db.exec("select set_config('request.jwt.claim.sub','"+OTHER+"',true)");
  await db.exec('set local role authenticated');
  await assert.rejects(db.exec(request(direct)),/organisateur|requis|denied/i);
  await db.exec('rollback').catch(()=>{});

  // Aucune inscription acceptée ne peut disparaître lors du démarrage.
  await db.exec('begin');
  await db.exec("select set_config('request.jwt.claim.sub','"+OWNER+"',true)");
  await db.exec('set local role authenticated');
  await assert.rejects(db.exec(request(note('club-non-inclus'))),/inscriptions acceptées|rechargez/i);
  await db.exec('rollback').catch(()=>{});

  // L'inscription d'une équipe est acceptée si l'ID figure dans membresOrigine.
  await db.exec('begin');
  await db.exec("select set_config('request.jwt.claim.sub','"+OWNER+"',true)");
  await db.exec('set local role authenticated');
  assert.equal((await rows(db,request(note('groupe-valide'))))[0].id,TOURNOI);
  assert.equal((await rows(db,"select donnees->>'cree' as cree from public.tournois where id='"+TOURNOI+"'"))[0].cree,'true');
  assert.equal((await rows(db,"select ouvert from public.tourneo_inscriptions_config where tournoi_id='"+TOURNOI+"'"))[0].ouvert,false,'registration closes at start');
  await assert.rejects(db.exec(request(note('groupe-valide'))),/déjà démarré|already/i);
  await db.exec('rollback').catch(()=>{});

  // Les anciens identifiants d'inscription doivent aussi être reconnus directement.
  await db.exec('begin');
  await db.exec("select set_config('request.jwt.claim.sub','"+OWNER+"',true)");
  await db.exec('set local role authenticated');
  assert.equal((await rows(db,request(direct)))[0].id,TOURNOI);
  await db.exec('rollback');

  // Pour un individuel, profilId est reconnu sans répétition du marqueur.
  await db.exec('begin');
  await db.exec("update public.tourneo_inscriptions set type_participant='individuel',joueurs='{}' where id='"+ACCEPTED+"'");
  await db.exec("select set_config('request.jwt.claim.sub','"+OWNER+"',true)");
  await db.exec('set local role authenticated');
  assert.equal((await rows(db,request(individuel)))[0].id,TOURNOI);
  await db.exec('rollback');
  assert.deepEqual(await rows(db,'select id,user_id,nom,sport,donnees,revision,partage_id,est_public from public.tournois'),prev);
  assert.deepEqual(await rows(db,'select id,tournoi_id,user_id,statut,joueurs from public.tourneo_inscriptions'),registrations);
  await assert.rejects(db.exec(phase15),/STAGING STOP/,'reinstall fails closed');
  await db.exec('rollback').catch(()=>{});
  console.log('Phase 15 fictive : inscription équipe/membre et individu reconnus, oubli bloqué, organisateur seul, V1 conservée : OK');
 } finally {await db.close();}
 const damaged=await preparer();
 try{
  await damaged.exec('update public.tournois set partage_id=null');
  await assert.rejects(damaged.exec(phase15),/STAGING STOP/);
  await damaged.exec('rollback').catch(()=>{});
  assert.equal((await rows(damaged,"select to_regprocedure('tourneo_private.equipes_inscrites_marqueur()') is null as ok"))[0].ok,true);
  console.log('Phase 15 fictive : lien historique manquant => installation annulée : OK');
 } finally {await damaged.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
