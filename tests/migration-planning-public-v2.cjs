'use strict';
// Tourneo phase 14 : projection TV et planning adaptatif sur PostgreSQL fictif.
// AUCUNE connexion a Supabase / aucune modification des anciens tournois V1.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup,phase13}=require('./migration-album-partage-v2.cjs');
const {OWNER,OTHER,TOURNOI}=require('./migration-socle-v2.cjs');
const read=n=>fs.readFileSync(path.join(__dirname,'../docs/sql',n),'utf8');
const sql=read('compatibilite_v1_v2_staging_PHASE14_PLANNING_PUBLIC.sql');
const verify=read('verification_phase14_staging.sql');
const q=async(db,s)=>(await db.query(s)).rows;
const SHARE='30000000-0000-4000-8000-000000000001';
const PRIVATE='20000000-0000-4000-8000-000000000002';
const PRIVATE_SHARE='30000000-0000-4000-8000-000000000002';
const data={
 cree:true,
 equipes:[
  {id:'joueur-a',nom:'Les Bleus',emoji:'💙',couleur:'bleu',email:'contact-prive@invalid.example'},
  {id:'joueur-b',nom:'Les Rouges',telephone:'+33000000000'}
 ],
 matchs:[
  {id:1,equipe1Id:'joueur-a',equipe2Id:'joueur-b',score1:13,score2:10,
   terrain:2,ordre:1,branche:'poule',joueurs1Ids:['joueur-a'],joueurs2Ids:['joueur-b'],
   manches:[{score1:6,score2:4,arbitreSecret:'non'}],arbitrePrive:'cache'},
  {id:2,equipe1Id:'joueur-b',equipe2Id:'joueur-a',terrain:1,ordre:2}
 ],
 matchsValides:[1],termine:false,formatTournoi:'championnat',
 optionsV2:{
  score:'points',terrains:3,repos:5,
  adaptationPlanning:{
   debutMinimum:120,terrainsFermes:[1,'private',3],
   fixes:[
    {matchId:1,terrain:2,debut:120,fin:165,commentaire:'PRIVE_PLANNING'},
    {matchId:'invalid',terrain:1,debut:150,fin:180,contact:'PRIVE'},
    {matchId:2,terrain:1,debut:'ne-pas-afficher',fin:180}
   ],commentaire:'PRIVE_OPTIONS'
  },
  exemptions:[{ronde:2,id:'joueur-a',secret:'NE_PAS_PARTAGER'}],
  coordinateur:'INFO_PRIVEE',
  secretNotes:'NE_JAMAIS_AFFICHER'
 },
 messagesPrives:['un message privé'],
 contacts:{portable:'NON_PUBLIC'}
};
const anonRead=async(db,statement)=>{
 await db.exec('begin');
 await db.exec('set local role anon');
 try{return (await q(db,statement))[0].result;}
 finally{await db.exec('rollback').catch(()=>{});}
};
const rpc=(fn,id)=>"select public."+fn+"('"+id+"') as result";
async function fixture(){
 const db=await setup();await db.exec(phase13);return db;
}
assert.match(sql,/tourneo\.v1_copy_verified/);
assert.match(sql,/t\.id=p_id and t\.est_public is true/i);
assert.match(sql,/security definer set search_path=''/i,'public RPC must use empty search_path');
assert.match(sql,/'adaptationPlanning'/);
assert.doesNotMatch(sql,/\bdrop\s+(?:table|column)\b/i);
(async()=>{
 const db=await fixture();
 try{
  await db.exec("update public.tournois set donnees='"+JSON.stringify(data)+"'::jsonb where id='"+TOURNOI+"'");
  await db.exec("insert into public.tournois(id,user_id,nom,sport,donnees,partage_id,est_public) values"+
   "('"+PRIVATE+"','"+OTHER+"','Événement privé','petanque','{\"secret\":\"CACHE\"}'::jsonb,'"+PRIVATE_SHARE+"',false)");
  const previous=await q(db,'select id,user_id,nom,sport,donnees,partage_id,est_public,revision from public.tournois order by id');
  const profiles=await q(db,'select id,display_name,player_code from public.profiles order by id');
  await db.exec("select set_config('tourneo.v1_copy_verified','false',false)");
  await assert.rejects(db.exec(sql),/STAGING STOP/);
  await db.exec('rollback').catch(()=>{});
  await db.exec("select set_config('tourneo.v1_copy_verified','true',false)");
  await db.exec(sql);
  const checks=await q(db,verify);
  assert.ok(checks.length>=13);
  assert.ok(checks.every(x=>x.status==='OK'),JSON.stringify(checks.filter(x=>x.status!=='OK')));
  assert.deepEqual(await q(db,'select id,user_id,nom,sport,donnees,partage_id,est_public,revision from public.tournois order by id'),previous);
  assert.deepEqual(await q(db,'select id,display_name,player_code from public.profiles order by id'),profiles);
  const publicData=await anonRead(db,rpc('tourneo_public_v2',TOURNOI));
  const alias=await anonRead(db,rpc('tourneo_public_compat_v2',SHARE));
  assert.deepEqual(alias,publicData,'legacy alias must return the same sanitized planning');
  assert.equal(publicData.id,TOURNOI);
  const info=publicData.donnees;
  assert.equal(info.matchs[0].terrain,2);
  assert.equal(info.matchs[0].score1,13);
  assert.equal(info.matchs[0].manches[0].score1,6);
  assert.equal(info.optionsV2.adaptationPlanning.debutMinimum,120);
  assert.deepEqual(info.optionsV2.adaptationPlanning.terrainsFermes,[1,3]);
  assert.equal(info.optionsV2.adaptationPlanning.fixes.length,1,'malformed fixtures filtered');
  assert.deepEqual(info.optionsV2.adaptationPlanning.fixes[0],{matchId:1,terrain:2,debut:120,fin:165});
  assert.equal(info.optionsV2.exemptions.length,1);
  assert.notEqual(info.optionsV2.exemptions[0].id,'joueur-a','participant ids anonymized');
  assert.notEqual(info.equipes[0].id,'joueur-a','teams anonymized');
  assert.notEqual(info.matchs[0].equipe1Id,'joueur-a');
  const publicText=JSON.stringify(publicData);
  for(const secret of ['contact-prive@invalid.example','+33000000000','NON_PUBLIC',
   'PRIVE_PLANNING','PRIVE_OPTIONS','PRIVE','NE_PAS_PARTAGER','NE_JAMAIS_AFFICHER','arbitrePrive','arbitreSecret','coordinateur','secretNotes']){
   assert.equal(publicText.includes(secret),false,'secret field leaked: '+secret);
  }
  assert.equal(await anonRead(db,rpc('tourneo_public_v2',PRIVATE)),null,'private tournament direct RPC denied');
  assert.equal(await anonRead(db,rpc('tourneo_public_compat_v2',PRIVATE_SHARE)),null,'private historical alias denied');
  assert.equal(await anonRead(db,rpc('tourneo_public_compat_v2',PRIVATE)),null,'private ID alias denied');
  await db.exec('begin');
  await db.exec("update public.tournois set est_public=false where id='"+TOURNOI+"'");
  assert.equal((await q(db,rpc('tourneo_public_v2',TOURNOI)))[0].result,null);
  assert.equal((await q(db,rpc('tourneo_public_compat_v2',SHARE)))[0].result,null);
  await db.exec('rollback');
  assert.ok(await anonRead(db,rpc('tourneo_public_v2',TOURNOI)),'public link reenabled');
  assert.equal((await q(db,"select to_regprocedure('public.get_tourneo_public(uuid)') is not null as value"))[0].value,true,'V1 RPC intentionally preserved pending cutover');
  await assert.rejects(db.exec(sql),/STAGING STOP/,'phase 14 reinstall refused');
  await db.exec('rollback').catch(()=>{});
  console.log('Phase 14 fictive : TV/terrains/horaires sûrs, anciens liens, données privées masquées : OK');
 }finally{await db.close();}
 const missing=await fixture();
 try{
  await missing.exec('update public.tournois set partage_id=null');
  await assert.rejects(missing.exec(sql),/STAGING STOP/);
  await missing.exec('rollback').catch(()=>{});
  assert.equal((await q(missing,"select to_regprocedure('tourneo_private.projection_planning_v2_marqueur()') is null as value"))[0].value,true);
  console.log('Phase 14 fictive : lien V1 manquant bloque la migration sans installation partielle : OK');
 }finally{await missing.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
