'use strict';
// Phase 11 : essais avec comptes et matchs inventés sur PGlite (aucune vraie donnée).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {preparerPhase4,phase5}=require('./migration-partages-v2.cjs');
const {OWNER,OTHER,TOURNOI}=require('./migration-socle-v2.cjs');
const read=name=>fs.readFileSync(path.join(__dirname,'../docs/sql',name),'utf8');
const phases=[
 phase5,
 read('compatibilite_v1_v2_staging_PHASE6_GROUPES_LANGUES.sql'),
 read('compatibilite_v1_v2_staging_PHASE7_PROFILS.sql'),
 read('compatibilite_v1_v2_staging_PHASE8_TENNIS.sql'),
 read('compatibilite_v1_v2_staging_PHASE9_OLYMPIADES.sql'),
 read('compatibilite_v1_v2_staging_PHASE10_APPELS_AFFICHES.sql')
];
const phase11=read('compatibilite_v1_v2_staging_PHASE11_JOUEURS.sql');
const verify=read('verification_phase11_staging.sql');
const query=async(db,sql)=>(await db.query(sql)).rows;
const request='select public.tourneo_mes_participations() as resultat';
async function preparer(){
 const db=await preparerPhase4();
 for(const phase of phases)await db.exec(phase);
 return db;
}
const donnees=JSON.stringify({
 cree:true,
 equipes:[
  {id:'a',nom:'Joueur invité',profilId:OTHER},
  {id:'b',nom:'Organisateur',profilId:OWNER},
  {id:'x',nom:'Concurrent hors match'}
 ],
 matchs:[
  {id:1,equipe1Id:'a',equipe2Id:'b',score1:'13',score2:'7',terrain:2},
  {id:2,equipe1Id:'x',equipe2Id:'x',score1:'11',score2:'9',terrain:3}
 ],
 matchsValides:[1],
 contact:'COORDONNEES_NE_PAS_EXPOSER',
 parametresPrives:{email:'EXEMPLE_SECRET'}
});
assert.match(phase11,/tourneo\.v1_copy_verified/);
assert.match(phase11,/create function public\.tourneo_mes_participations\(\)/);
assert.match(phase11,/auth\.uid\(\)is null then raise exception/);
assert.doesNotMatch(phase11,/\bdrop\s+(?:table|column)\b/i);
(async()=>{
 const db=await preparer();
 try{
  // Données inventées uniquement, avant l'instantané dont on teste la conservation.
  await db.exec("update public.tournois set donnees='"+donnees+"'::jsonb where id='"+TOURNOI+"'");
  const historiques=await query(db,'select id,user_id,nom,sport,donnees,revision,partage_id,est_public from public.tournois');
  const profils=await query(db,'select id,display_name,player_code from public.profiles order by id');
  await db.exec("select set_config('tourneo.v1_copy_verified','false',false)");
  await assert.rejects(db.exec(phase11),/STAGING STOP/);
  await db.exec('rollback').catch(()=>{});
  await db.exec("select set_config('tourneo.v1_copy_verified','true',false)");
  await db.exec(phase11);
  const checks=await query(db,verify);
  assert.ok(checks.length>=10);
  assert.ok(checks.every(x=>x.status==='OK'),JSON.stringify(checks.filter(x=>x.status!=='OK')));
  assert.deepEqual(await query(db,'select id,user_id,nom,sport,donnees,revision,partage_id,est_public from public.tournois'),historiques);
  assert.deepEqual(await query(db,'select id,display_name,player_code from public.profiles order by id'),profils);

  await db.exec('begin');
  await db.exec('set local role anon');
  await assert.rejects(db.exec(request),/permission|denied/i,'les visiteurs anonymes ne peuvent ouvrir un espace joueur');
  await db.exec('rollback').catch(()=>{});

  await db.exec('begin');
  await db.exec('set local role authenticated');
  await assert.rejects(db.exec(request),/Connexion requise|connection/i,'rôle authentifié sans JWT valide refusé');
  await db.exec('rollback').catch(()=>{});

  await db.exec('begin');
  await db.exec("select set_config('request.jwt.claim.sub','"+OTHER+"',true)");
  await db.exec('set local role authenticated');
  const result=(await query(db,request))[0].resultat;
  assert.equal(result.length,1);
  assert.equal(result[0].id,TOURNOI);
  assert.equal(result[0].matchs.length,1,'la rencontre des autres joueurs doit rester cachée');
  assert.equal(result[0].matchs[0].id,1);
  assert.equal(result[0].matchs[0].valide,true);
  assert.equal(result[0].matchs[0].score1,'13');
  assert.equal(result[0].matchs[0].participant1,'Joueur invité');
  const serialized=JSON.stringify(result);
  assert.equal(serialized.includes('COORDONNEES_NE_PAS_EXPOSER'),false);
  assert.equal(serialized.includes('EXEMPLE_SECRET'),false);
  assert.equal(serialized.includes('"profilId"'),false);
  assert.equal(serialized.includes('"id":2'),false);
  await db.exec("select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true)");
  assert.deepEqual((await query(db,request))[0].resultat,[],'un autre joueur ne voit pas les rencontres privées');
  await db.exec('rollback');

  await assert.rejects(db.exec(phase11),/STAGING STOP/,'refuser la réinstallation');
  await db.exec('rollback').catch(()=>{});
  assert.deepEqual(await query(db,'select id,user_id,nom,sport,donnees,revision,partage_id,est_public from public.tournois'),historiques);
  console.log('Phase 11 fictive : rencontres personnelles seules, scores validés, JSON privé masqué et anonymes refusés : OK');
 }finally{await db.close();}
 const broken=await preparer();
 try{
  await broken.exec('update public.tournois set partage_id=null');
  await assert.rejects(broken.exec(phase11),/STAGING STOP/);
  await broken.exec('rollback').catch(()=>{});
  assert.equal((await query(broken,"select to_regprocedure('public.tourneo_mes_participations()') is null as v"))[0].v,true);
  console.log('Phase 11 fictive : lien V1 absent = arrêt transactionnel : OK');
 }finally{await broken.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
