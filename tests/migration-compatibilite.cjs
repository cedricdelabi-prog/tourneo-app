'use strict';
/* Non-production rehearsal of the REAL draft SQL with synthetic legacy records only.
 * No network, user credentials, projects or Supabase production resources are used. */
const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sql=fs.readFileSync(path.resolve(__dirname,'../docs/sql/compatibilite_v1_v2_staging_DRAFT.sql'),'utf8');
const preflight=fs.readFileSync(path.resolve(__dirname,'../docs/sql/preflight_v1_v2.sql'),'utf8');
const userId='11111111-1111-4111-8111-111111111111',tournoiId='22222222-2222-4222-8222-222222222222';
const partageId='33333333-3333-4333-8333-333333333333';
async function preparer({nom='Tournoi fictif',partage=true}={}){
 const db=new PGlite();
 await db.exec(`
 create schema auth; create schema storage;
 create table auth.users(id uuid primary key,email text);
 create table auth.identities(id uuid primary key,user_id uuid references auth.users(id));
 create table storage.objects(id uuid primary key,bucket_id text,name text);
 create table public.profiles(
  id uuid primary key references auth.users(id),
  display_name text not null,player_code text not null,avatar_url text,
  favorite_color text,first_name text,last_name text,city text,
  created_at timestamptz not null default now()
 );
 create table public.tournois(
  id uuid primary key,user_id uuid not null references auth.users(id),
  nom text not null,created_at timestamptz not null default now(),sport text not null,
  donnees jsonb not null,partage_id uuid,est_public boolean not null default true
 );
 insert into auth.users(id,email) values('${userId}','fixture@invalid.local');
 insert into auth.identities(id,user_id) values('44444444-4444-4444-8444-444444444444','${userId}');
 insert into public.profiles(id,display_name,player_code) values('${userId}','Profil fictif','TRN-FAKE');
 insert into public.tournois(id,user_id,nom,sport,donnees,partage_id,est_public)
 values('${tournoiId}','${userId}',${JSON.stringify(nom).replace(/^"|"$/g,"'")},'petanque',
 '{"equipes":[{"id":"e-1","nom":"Fictif"}],"matchs":[{"id":1,"score1":"13","score2":"7"}]}'::jsonb,
 ${partage?"'"+partageId+"'":"null"},true);
 `);
 return db;
}
(async()=>{
 const db=await preparer();
 try{
  const pre=(await db.query(preflight)).rows[0];
  assert.equal(Number(pre.comptes),1);assert.equal(Number(pre.identites_auth),1);
  assert.equal(Number(pre.tournois),1);assert.equal(Number(pre.liens_partage_dupliques),0);
  assert.equal(Number(pre.donnees_json_malformees),0);
  const before=(await db.query('select id,user_id,nom,sport,donnees,partage_id,est_public from public.tournois')).rows;
  await db.exec(sql);
  const after=(await db.query('select id,user_id,nom,sport,donnees,partage_id,est_public from public.tournois')).rows;
  assert.deepEqual(after,before,'additive compatibility must preserve scores, IDs, user IDs and original sharing');
  const row=(await db.query('select revision,ville_publique from public.tournois t cross join public.profiles p limit 1')).rows[0];
  assert.equal(String(row.revision),'0');
  assert.equal(row.ville_publique,false);
  assert.equal((await db.query("select count(*)::int as n from information_schema.columns where table_schema='public' and table_name='tournois' and column_name in ('termine_at','updated_at','photos_expirent_at','revision')")).rows[0].n,4);
  assert.equal((await db.query("select count(*)::int as n from public.tournois")).rows[0].n,1);
  console.log('Migration additive sur V1 fictive : conservations des UUID, scores, profils et partage : OK');
 }finally{await db.close();}
 const production=await preparer({nom:'    '});
 try{
  const extension=fs.readFileSync(path.resolve(__dirname,'../docs/sql/production_v2_colonnes_compatibilite.sql'),'utf8');
  const historique=async()=> (await production.query('select id,user_id,nom,donnees,partage_id,est_public from public.tournois')).rows;
  const avant=await historique();
  await production.exec(extension);
  assert.deepEqual(await historique(),avant);
  const contrainteRevision=fs.readFileSync(path.resolve(__dirname,'../docs/sql/production_v2_revision_tournois.sql'),'utf8');
  await production.exec(contrainteRevision);
  await assert.rejects(production.exec('update public.tournois set revision=-1'),/tourneo_v2_compat_revision_check/);
  assert.deepEqual(await historique(),avant);
  const result=(await production.query('select revision,termine_at,photos_expirent_at,ville_publique,updated_at is not null as horodate from public.tournois cross join public.profiles')).rows[0];
  assert.deepEqual({...result,revision:String(result.revision)},{revision:'0',termine_at:null,photos_expirent_at:null,ville_publique:false,horodate:true});
  await production.exec("update public.tournois set nom='Tournoi corrigé par la V1'");
  assert.equal((await historique())[0].nom,'Tournoi corrigé par la V1');
  console.log('Extension de production : données et écriture V1 préservées');
 }finally{await production.close();}

 const invalide=await preparer({nom:'    '});
 try{
  await assert.rejects(invalide.exec(sql),/violates|invalid|constraint|Legacy data|constraints|nom/i,'draft migration must reject invalid legacy names');
  await invalide.exec('rollback;').catch(()=>{});
  const existing=(await invalide.query("select count(*)::int as n from information_schema.columns where table_schema='public' and table_name='tournois' and column_name='updated_at'")).rows[0].n;
  assert.equal(existing,0,'failed transaction never persists a partially migrated schema');
  console.log('Migration additive : données incompatibles bloquées sans demi-migration : OK');
 }finally{await invalide.close();}
 const partageAbsent=await preparer({partage:false});
 try{
  await assert.rejects(partageAbsent.exec(sql),/Legacy sharing IDs|restored|partage/i,'missing legacy share ID must stop staging test');
  await partageAbsent.exec('rollback;').catch(()=>{});
  console.log('Migration additive : anciens liens manquants détectés : OK');
 }finally{await partageAbsent.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
