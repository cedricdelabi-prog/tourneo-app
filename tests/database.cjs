// Local PostgreSQL/WASM regression checks. Auth/Storage schemas are minimal test doubles;
// these do not replace end-to-end Supabase Auth, REST, Storage or concurrency tests.
const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../supabase');
const stripExternalExtensions = sql => sql.replace(/^create extension if not exists pg_(?:cron|net);\s*$/gm, '');
const bootstrap = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema storage; create schema net; create schema cron;
create table auth.users(id uuid primary key,aud text,role text,email text,email_confirmed_at timestamptz,created_at timestamptz default now(),last_sign_in_at timestamptz,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'))::uuid;
$$;
grant usage on schema auth,storage,public to anon,authenticated,service_role;
create function storage.allow_any_operation(ops text[])returns boolean language sql stable as $$select coalesce(current_setting('storage.qa_operation',true),'')=any(ops)$$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,created_at timestamptz not null default now());
grant select on storage.objects to service_role,authenticated;
alter table storage.objects enable row level security;
create table net.qa_calls(id bigint generated always as identity,url text,body jsonb);
create function net.http_post(url text,body jsonb default '{}'::jsonb,params jsonb default '{}'::jsonb,headers jsonb default '{}'::jsonb,timeout_milliseconds integer default 2000) returns bigint language sql as $$with i as(insert into net.qa_calls(url,body)values(url,body)returning id)select id from i$$;
create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;
create function storage.foldername(name text) returns text[] language sql immutable as $$
 select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1];
$$;`;
async function verifier(consolide) {
  const db = new PGlite();
  try {
    await db.exec(bootstrap);
    if (consolide) await db.exec(stripExternalExtensions(fs.readFileSync(path.join(root,'ACTIVER_V2.sql'),'utf8')));
    else for (const file of fs.readdirSync(path.join(root,'migrations')).filter(f=>f.endsWith('.sql')).sort()) {
      await db.exec(stripExternalExtensions(fs.readFileSync(path.join(root,'migrations',file),'utf8')));
    }
    for (const file of ['integration_v2.sql','partage_public_v2.sql','groupes_v2.sql','conservation_photos_v2.sql','appels_v2.sql','synchronisation_v2.sql','olympiades_v2.sql','alertes_externes_v2.sql','android_v2.sql','espaces_album_v2.sql','tennis_v2.sql','administration_v2.sql','album_partage_v2.sql','bilans_v2.sql','pronostics_v2.sql']) {
      await db.exec(fs.readFileSync(path.join(root,'tests',file),'utf8'));
      assert.equal((await db.query('select count(*)::integer as n from auth.users')).rows[0].n,0,'Test data was not rolled back');
      console.log(`${consolide?'Activation consolidée':'Migrations ordonnées'} · ${file} : OK`);
    }
    return {
      columns:(await db.query("select table_name,column_name,data_type,is_nullable from information_schema.columns where table_schema='public' order by table_name,ordinal_position")).rows,
      policies:(await db.query("select tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname='public' order by tablename,policyname")).rows,
    };
  } finally { await db.close(); }
}
(async()=>{
  const migrations=await verifier(false),consolide=await verifier(true);
  assert.deepEqual(consolide,migrations,'Consolidated activation differs from recorded migrations');
  console.log('Schéma et politiques identiques entre migrations et activation consolidée : OK');
})().catch(error=>{ console.error(error.message); if(error.where)console.error(error.where); process.exitCode=1; });
