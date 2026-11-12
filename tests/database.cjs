// Local PostgreSQL/WASM regression checks. Auth/Storage schemas are minimal test doubles;
// these do not replace end-to-end Supabase Auth, REST, Storage or concurrency tests.
const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../supabase');
const bootstrap = `
create role anon nologin; create role authenticated nologin;
create schema auth; create schema storage;
create table auth.users(id uuid primary key,aud text,role text);
create function auth.uid() returns uuid language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'))::uuid;
$$;
grant usage on schema auth,storage,public to anon,authenticated;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
 select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1];
$$;`;
async function verifier(consolide) {
  const db = new PGlite();
  try {
    await db.exec(bootstrap);
    if (consolide) await db.exec(fs.readFileSync(path.join(root,'ACTIVER_V2.sql'),'utf8'));
    else for (const file of fs.readdirSync(path.join(root,'migrations')).filter(f=>f.endsWith('.sql')).sort()) {
      await db.exec(fs.readFileSync(path.join(root,'migrations',file),'utf8'));
    }
    for (const file of ['integration_v2.sql','partage_public_v2.sql','groupes_v2.sql']) {
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
