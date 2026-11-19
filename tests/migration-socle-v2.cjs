
'use strict';
/* STAGING REHEARSAL ONLY: fake Auth/Storage on local PGlite, no production connection. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const dir=path.resolve(__dirname,'../docs/sql');
const phase1=fs.readFileSync(path.join(dir,'compatibilite_v1_v2_staging_DRAFT.sql'),'utf8');
const phase2=fs.readFileSync(path.join(dir,'compatibilite_v1_v2_staging_PHASE2_SOCLE.sql'),'utf8');
const verification=fs.readFileSync(path.join(dir,'verification_socle_phase2_staging.sql'),'utf8');
const OWNER='10000000-0000-4000-8000-000000000001',OTHER='10000000-0000-4000-8000-000000000002';
const TOURNOI='20000000-0000-4000-8000-000000000001';
const setup="\ncreate role anon nologin; create role authenticated nologin;\ncreate schema auth; create schema storage;\ncreate function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;\ncreate table auth.users(id uuid primary key,email text);\ncreate table public.profiles(id uuid primary key references auth.users(id),display_name text not null,player_code text not null unique,avatar_url text,favorite_color text,first_name text,last_name text,city text,created_at timestamptz default now());\ncreate table public.tournois(id uuid primary key,user_id uuid not null references auth.users(id),nom text not null,created_at timestamptz default now(),sport text not null,donnees jsonb not null,partage_id uuid,est_public boolean not null default true);\ncreate table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);\ncreate table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);\ncreate function storage.foldername(name text) returns text[] language sql immutable as $$\n select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]\n$$;\ngrant usage on schema auth,storage to anon,authenticated;\ngrant select on public.tournois to authenticated;\ngrant select,insert,update,delete on storage.objects to authenticated;\ngrant select on storage.objects to anon;\ninsert into auth.users(id,email) values\n ('10000000-0000-4000-8000-000000000001','owner@invalid.example'),\n ('10000000-0000-4000-8000-000000000002','other@invalid.example');\ninsert into public.profiles(id,display_name,player_code) values\n ('10000000-0000-4000-8000-000000000001','Ancien joueur','TRN-0001'),\n ('10000000-0000-4000-8000-000000000002','Autre joueur','TRN-0002');\ncreate function public.handle_new_tourneo_user() returns trigger language plpgsql as $\n begin\n  insert into public.profiles(id,display_name,player_code)\n   values(new.id,'Joueur créé par trigger V1','TRN-NEW-'||substr(new.id::text,1,8));\n  return new;\n end $;\ncreate trigger on_auth_user_created_tourneo after insert on auth.users\n for each row execute function public.handle_new_tourneo_user();\ninsert into public.tournois(id,user_id,nom,sport,donnees,partage_id,est_public)\n values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',\n 'Tournoi V1 simulé','petanque',\n '{\"equipes\":[{\"id\":\"a\",\"nom\":\"Equipe originale\"}],\"matchs\":[{\"id\":1,\"score1\":\"13\",\"score2\":\"7\"}],\"regles\":{\"ancien\":true}}'::jsonb,\n '30000000-0000-4000-8000-000000000001',true);\n";
async function preparer(){const db=new PGlite();await db.exec(setup);await db.exec(phase1);return db;}
async function query(db,sql){return(await db.query(sql)).rows;}
async function operationRefusee(db,sql){
 await db.exec('begin');
 let refused=false;
 try{await db.exec(sql);}catch(error){refused=true;assert.match(String(error),/policy|permission|row.level|denied|violates|permission denied/i);}
 finally{await db.exec('rollback').catch(()=>{});}
 assert.equal(refused,true,'an unauthorized insert was accepted');
}
(async()=>{
 const db=await preparer();
 try{
  const before=await query(db,'select id,user_id,nom,sport,donnees,partage_id,est_public from public.tournois');
  const profiles=await query(db,'select id,display_name,player_code from public.profiles order by id');
  await assert.rejects(db.exec(phase2),/STAGING STOP: copie restaurée non explicitement confirmée/,'phase 2 must reject absent staging authorization flag');
  await db.exec('rollback').catch(()=>{});
  await db.exec("select set_config('tourneo.v1_copy_verified','true',false)");
  await db.exec(phase2);
  assert.deepEqual(await query(db,'select id,user_id,nom,sport,donnees,partage_id,est_public from public.tournois'),before,'all scores, IDs, links and rules are preserved');
  assert.deepEqual(await query(db,'select id,display_name,player_code from public.profiles order by id'),profiles,'historical profiles preserved');
  assert.equal((await query(db,"select count(*)::int as n from pg_trigger where tgname='on_auth_user_created_tourneo' and not tgisinternal"))[0].n,1,'V1 Auth signup trigger remains installed');
  await db.exec("insert into auth.users(id,email) values('10000000-0000-4000-8000-000000000003','new@invalid.example')");
  assert.equal((await query(db,"select count(*)::int as n from public.profiles where id='10000000-0000-4000-8000-000000000003'"))[0].n,1,'new users still get their profiles from the V1 signup trigger');
  assert.equal((await query(db,'select count(*)::int as n from public.player_results'))[0].n,0,'no historical results invented');
  const bucket=(await query(db,"select id,public,file_size_limit,allowed_mime_types from storage.buckets where id='tourneo-media'"))[0];
  assert.equal(bucket.public,false,'storage media is private');
  assert.equal(String(bucket.file_size_limit),'5242880');
  assert.equal(bucket.allowed_mime_types.length,4);
  const verifications=await query(db,verification);
  assert.ok(verifications.length>=12,'phase 2 inventory checks are comprehensive');
  assert.ok(verifications.every(x=>x.status==='OK'),'read-only staged verification failed: '+JSON.stringify(verifications.filter(x=>x.status!=='OK')));
  assert.equal((await query(db,"select count(*)::int as n from pg_policies where schemaname='public' and tablename='player_results'"))[0].n,4);
  assert.equal((await query(db,"select count(*)::int as n from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'media_owner_%'"))[0].n,4);
  assert.equal((await query(db,"select has_table_privilege('anon','public.player_results','insert') as permitted"))[0].permitted,false);
  assert.equal((await query(db,"select has_table_privilege('authenticated','public.player_results','insert') as permitted"))[0].permitted,true);
  assert.equal((await query(db,"select to_regnamespace('tourneo_private') is not null as present"))[0].present,true);
  await db.exec('begin');
  await db.exec("select set_config('request.jwt.claim.sub','"+OWNER+"',true)");
  await db.exec('set local role authenticated');
  await db.exec("insert into public.player_results(tournament_id,profile_id,tournament_name,sport,placement,points) values('"+TOURNOI+"','"+OWNER+"','Fictif','petanque',1,100)");
  await db.exec('rollback');
  assert.equal((await query(db,'select count(*)::int as n from public.player_results'))[0].n,0);
  await operationRefusee(db,"select set_config('request.jwt.claim.sub','"+OTHER+"',true); set local role authenticated; insert into public.player_results(tournament_id,profile_id,tournament_name,sport,placement,points) values('"+TOURNOI+"','"+OTHER+"','Fraude','petanque',1,50)");
  await operationRefusee(db,"set local role anon; insert into public.player_results(tournament_id,profile_id,tournament_name,sport,placement,points) values('"+TOURNOI+"','"+OWNER+"','Fraude','petanque',1,50)");
  await assert.rejects(db.exec(phase2),/STAGING STOP|éléments|déjà présents|elements/i,'second install must fail closed');
  await db.exec('rollback').catch(()=>{});
  assert.deepEqual(await query(db,'select id,user_id,nom,sport,donnees,partage_id,est_public from public.tournois'),before);
  console.log('Phase 2 V1 -> V2 fictive: profils/UUID/scores/partages, RLS palmarès, bucket privé et refus de répétition: OK');
 }finally{await db.close();}
 const broken=await preparer();
 try{
  await broken.exec("select set_config('tourneo.v1_copy_verified','true',false)");
  await broken.exec('update public.tournois set partage_id=null');
  await assert.rejects(broken.exec(phase2),/STAGING STOP|restauration/i);
  await broken.exec('rollback').catch(()=>{});
  assert.equal((await query(broken,"select to_regclass('public.player_results') is null as absent"))[0].absent,true,'missing share ID stops the entire transaction');
  assert.equal((await query(broken,'select count(*)::int as n from storage.buckets'))[0].n,0,'bucket is not partially created');
  console.log('Phase 2 V1 -> V2 fictive: liens de partage manquants arrêtent la migration sans demi-écriture: OK');
 }finally{await broken.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
