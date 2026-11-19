'use strict';
// Phase 13 sur PGlite, profils/photo inventes, aucun acces Supabase distant.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {preparer,phase12}=require('./migration-album-prive-v2.cjs');
const {OWNER,OTHER,TOURNOI}=require('./migration-socle-v2.cjs');
const from=n=>fs.readFileSync(path.join(__dirname,'../docs/sql',n),'utf8');
const phase13=from('compatibilite_v1_v2_staging_PHASE13_ALBUM_PARTAGE.sql');
const verify=from('verification_phase13_staging.sql');
const q=async(db,sql)=>(await db.query(sql)).rows;
const PHOTO='a0000000-0000-4000-8000-000000000001';
const prefix=OWNER+'/tournois/'+TOURNOI+'/';
const raw=prefix+'album-'+PHOTO+'.jpg';
const full=prefix+'album-partage-'+PHOTO+'.jpg';
const preview=prefix+'album-apercu-'+PHOTO+'.jpg';
async function setup(){
 const db=await preparer();
 await db.exec(phase12);
 await db.exec("create function storage.allow_any_operation(ops text[]) returns boolean language sql stable as $$select coalesce(current_setting('storage.qa_operation',true)=any(ops),false)$$");
 await db.exec('grant execute on function storage.allow_any_operation(text[]) to anon,authenticated');
 return db;
}
const visible=async(db)=>q(db,"select name from storage.objects where bucket_id='tourneo-media' order by name");
const rpc=async(db)=>(await q(db,"select public.tourneo_album_public('"+TOURNOI+"') as v"))[0].v;
const anon=async(db,operation)=>{await db.exec('begin');await db.exec('set local role anon');await db.exec("select set_config('storage.qa_operation','"+operation+"',true)");};
const reset=async(db)=>db.exec('rollback').catch(()=>{});
assert.match(phase13,/tourneo\.v1_copy_verified/);
assert.match(phase13,/album_images_partagees/);
assert.match(phase13,/p\.apercu_path is not null/);
assert.match(phase13,/storage\.allow_any_operation/);
assert.match(phase13,/public\.tourneo_album_public\(p_tournoi uuid\).*security definer/i);
assert.doesNotMatch(phase13,/\bdrop\s+(?:table|column)\b/i);
(async()=>{
 const db=await setup();
 try{
  const tours=await q(db,'select id,user_id,nom,sport,donnees,partage_id,est_public,photos_expirent_at from public.tournois');
  const profiles=await q(db,'select id,display_name,player_code from public.profiles order by id');
  await db.exec("select set_config('tourneo.v1_copy_verified','false',false)");
  await assert.rejects(db.exec(phase13),/STAGING STOP/);
  await reset(db);
  await db.exec("select set_config('tourneo.v1_copy_verified','true',false)");
  await db.exec(phase13);
  assert.deepEqual(await q(db,'select id,user_id,nom,sport,donnees,partage_id,est_public,photos_expirent_at from public.tournois'),tours,'original tournament never rewritten');
  assert.deepEqual(await q(db,'select id,display_name,player_code from public.profiles order by id'),profiles);
  const checks=await q(db,verify);
  assert.ok(checks.length>=15);
  assert.ok(checks.every(x=>x.status==='OK'),JSON.stringify(checks.filter(x=>x.status!=='OK')));
  assert.equal((await q(db,"select has_schema_privilege('anon','tourneo_private','USAGE') as ok"))[0].ok,false);
  assert.equal((await q(db,"select has_table_privilege('anon','public.tourneo_album_config','SELECT') as ok"))[0].ok,false);
  assert.equal((await q(db,"select has_function_privilege('anon','public.tourneo_album_public(uuid)','EXECUTE') as ok"))[0].ok,true);
  await db.exec("insert into storage.objects(bucket_id,name) values('tourneo-media','"+raw+"'),('tourneo-media','"+full+"'),('tourneo-media','"+preview+"')");
  await db.exec("insert into public.tourneo_album_photos(id,tournoi_id,user_id,path,legende) values('"+PHOTO+"','"+TOURNOI+"','"+OWNER+"','"+raw+"','Image fictive')");
  await db.exec('begin');await db.exec("select set_config('request.jwt.claim.sub','"+OWNER+"',true)");await db.exec('set local role authenticated');
  await db.exec("insert into public.tourneo_album_config(tournoi_id,titre) values('"+TOURNOI+"','Album test')");
  await db.exec("insert into public.tourneo_album_partages(photo_id,tournoi_id,user_id,path,apercu_path) values('"+PHOTO+"','"+TOURNOI+"','"+OWNER+"','"+full+"','"+preview+"')");
  await db.exec('commit');

  await anon(db,'object.get_authenticated');
  assert.equal((await rpc(db)).actif,false,'opt-in off by default');
  assert.deepEqual(await visible(db),[],'no original or derivatives visible before opt-in');
  await reset(db);

  await db.exec('begin');await db.exec("select set_config('request.jwt.claim.sub','"+OTHER+"',true)");await db.exec('set local role authenticated');
  assert.deepEqual(await q(db,"update public.tourneo_album_config set partage=true where tournoi_id='"+TOURNOI+"' returning tournoi_id"),[],'other user cannot share');
  await db.exec('rollback');

  await db.exec("update public.tourneo_album_config set partage=true where tournoi_id='"+TOURNOI+"'");
  await anon(db,'object.get_authenticated');
  const published=await rpc(db);
  assert.equal(published.actif,true);
  assert.equal(published.photos.length,1);
  assert.equal(published.photos[0].path,preview);
  assert.equal(published.photos[0].telechargement_path,full);
  assert.equal(JSON.stringify(published).includes(raw),false,'original file path not in RPC');
  const allowed=(await visible(db)).map(x=>x.name);
  assert.deepEqual(allowed,[preview,full].sort(),'only preview and branded download are readable');
  assert.ok(!allowed.includes(raw),'original still private');
  await reset(db);

  await db.exec("update public.tourneo_album_config set telechargement=false where tournoi_id='"+TOURNOI+"'");
  await anon(db,'object.get_authenticated');
  const noDownload=await rpc(db);
  assert.equal(noDownload.actif,true);
  assert.equal(noDownload.telechargement,false);
  assert.equal(noDownload.photos[0].telechargement_path,null);
  assert.deepEqual((await visible(db)).map(x=>x.name),[preview],'quality file forbidden when downloads disabled');
  await reset(db);

  for(const op of ['object.list','object.sign']){
   await anon(db,op);
   assert.deepEqual(await visible(db),[],op+' must not list or sign image files');
   await reset(db);
  }
  await db.exec("update public.tourneo_album_config set partage=false where tournoi_id='"+TOURNOI+"'");
  await anon(db,'object.get_authenticated');
  assert.equal((await rpc(db)).actif,false);
  assert.deepEqual(await visible(db),[],'unsharing immediately revokes Storage');
  await reset(db);

  await db.exec('alter table public.tournois disable trigger date_conservation_photos');
  await db.exec("update public.tournois set photos_expirent_at=now()-interval '1 minute' where id='"+TOURNOI+"'");
  await db.exec('alter table public.tournois enable trigger date_conservation_photos');
  await db.exec("update public.tourneo_album_config set partage=true,telechargement=true where tournoi_id='"+TOURNOI+"'");
  await anon(db,'object.get_authenticated');
  assert.equal((await rpc(db)).actif,false,'expired tournament must close public album');
  assert.deepEqual(await visible(db),[],'expired photos no longer readable');
  await reset(db);
  await assert.rejects(db.exec(phase13),/STAGING STOP/,'phase13 cannot be repeated');
  await reset(db);
  console.log('Phase 13 fictive : partage opt-in, aperçu seul, originaux privés, blocages liste/signature, retrait et expiration : OK');
 }finally{await db.close();}
 const invalid=await setup();
 try{
  await invalid.exec("update public.tournois set partage_id=null");
  await assert.rejects(invalid.exec(phase13),/STAGING STOP/);
  await reset(invalid);
  assert.equal((await q(invalid,"select to_regclass('public.tourneo_album_config') is null as ok"))[0].ok,true);
  console.log('Phase 13 fictive : liens V1 manquants bloquent installation atomique : OK');
 }finally{await invalid.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
