'use strict';
// Essai du vrai SQL de partage, exclusivement avec des tournois fictifs PGlite.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const read=n=>fs.readFileSync(path.join(__dirname,'../docs/sql',n),'utf8');
const secure=read('securiser_rpc_public_v2_post_migration.sql');
const compat=read('compatibilite_liens_partage_v1.sql');
const disable=read('desactiver_rpc_v1_non_filtre_post_migration.sql');
const check=read('preflight_partages_v1_v2.sql');
const publicId='22222222-2222-4222-8222-222222222222';
const publicAlias='33333333-3333-4333-8333-333333333333';
const privateId='44444444-4444-4444-8444-444444444444';
const privateAlias='55555555-5555-4555-8555-555555555555';
(async()=>{
 const db=new PGlite();
 try{
   await db.exec([
     'create role anon; create role authenticated;',
     'create table public.tournois(id uuid primary key,nom text not null,sport text not null,donnees jsonb not null,partage_id uuid,est_public boolean not null);',
     "insert into public.tournois values ('22222222-2222-4222-8222-222222222222','Exemple public','petanque','{\"equipes\":[],\"matchs\":[],\"secret\":\"NE_PAS_PUBLIER\"}'::jsonb,'33333333-3333-4333-8333-333333333333',true),",
     "('44444444-4444-4444-8444-444444444444','Exemple privé','tennis','{\"equipes\":[],\"matchs\":[],\"secret\":\"PRIVE\"}'::jsonb,'55555555-5555-4555-8555-555555555555',false);",
     'create function public.tourneo_public_v2(p_id uuid) returns jsonb language sql stable security definer set search_path = \'\' as $fn$',
     "select jsonb_build_object('id',t.id,'nom',t.nom,'donnees',jsonb_build_object('equipes',t.donnees->'equipes','matchs',t.donnees->'matchs'))",
     'from public.tournois t where t.id=p_id limit 1; $fn$;',
     "create function public.get_tourneo_public(p_id uuid) returns table(id uuid,nom text,sport text,donnees jsonb)",
     "language sql stable security definer set search_path = '' as $fn$",
     "select t.id,t.nom,t.sport,t.donnees from public.tournois t where t.id=p_id limit 1; $fn$;"
   ].join('\n'));
   const before=(await db.query(check)).rows[0];
   assert.equal(Number(before.tournois),2);
   assert.equal(Number(before.publics),1);
   assert.equal(Number(before.liens_uuid_reconnus_v1),1);
   assert.equal(Number(before.alias_reconnus_v1),0);
   await db.exec(secure); await db.exec(compat);
   const get=async(fn,id)=>(await db.query('select public.'+fn+"('"+id+"'::uuid) as result")).rows[0].result;
   const canonical=await get('tourneo_public_v2',publicId);
   assert.equal(canonical.id,publicId);
   assert.deepEqual(await get('tourneo_public_compat_v2',publicId),canonical);
   assert.deepEqual(await get('tourneo_public_compat_v2',publicAlias),canonical);
   assert.equal(JSON.stringify(canonical).includes('NE_PAS_PUBLIER'),false);
   for(const fn of ['tourneo_public_v2','tourneo_public_compat_v2'])
     for(const id of [privateId,privateAlias])
       assert.equal(await get(fn,id),null,fn+' reveals a private tournament');
   const privileges=(await db.query("select has_function_privilege('anon','public.tourneo_public_v2(uuid)','EXECUTE') as partage, has_function_privilege('anon','public.tourneo_public_v2_internal(uuid)','EXECUTE') as interne")).rows[0];
   assert.equal(privileges.partage,true);
   assert.equal(privileges.interne,false);
   await db.exec(disable);
   const permissions=(await db.query("select has_function_privilege('anon','public.get_tourneo_public(uuid)','EXECUTE') as anon, has_function_privilege('authenticated','public.get_tourneo_public(uuid)','EXECUTE') as member")).rows[0];
   assert.equal(permissions.anon,false);
   assert.equal(permissions.member,false);
   // Rejouer le scénario avec les droits d'un vrai visiteur anonyme,
   // au lieu d'appeler uniquement les fonctions comme propriétaire de la base.
   await db.exec('set role anon');
   try {
     for(const fn of ['tourneo_public_v2','tourneo_public_compat_v2']) {
       assert.equal((await db.query('select public.'+fn+"('"+publicId+"'::uuid) as result")).rows[0].result.id,publicId);
       for(const id of [privateId,privateAlias]) {
         const exposed=(await db.query('select public.'+fn+"('"+id+"'::uuid) as result")).rows[0].result;
         assert.equal(exposed,null,'Anon peut voir un tournoi prive via '+fn);
       }
     }
     await assert.rejects(db.query("select public.tourneo_public_v2_internal('"+publicId+"'::uuid)"),/permission denied|not allowed|permission/i);
     await assert.rejects(db.query("select * from public.get_tourneo_public('"+publicId+"'::uuid)"),/permission denied|not allowed|permission/i);
   } finally {
     await db.exec('reset role');
   }
   await db.exec("update public.tournois set est_public=false where id='"+publicId+"'");
   assert.equal(await get('tourneo_public_v2',publicId),null);
   assert.equal(await get('tourneo_public_compat_v2',publicAlias),null);
   console.log('Liens V1→V2 : alias, ID, confidentialité, désactivation RPC V1 et protection SQL : OK');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
