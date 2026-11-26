'use strict';
// Archive synthetique uniquement, aucun compte et aucun fichier Tourneo reel.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {verifier,ATTENDUS}=require('../scripts/auditer-archive-ipv4-v1.cjs');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tourneo-fixture-archive-'));
 const fixtures={
  '04-data-public.sql':[
    'COPY public.profiles (id, display_name) FROM stdin;',
    'fictif-1\tNom invente','fictif-2\tNom invente','\\.',
    'COPY public.tournois (id, nom) FROM stdin;','t1\tTournoi fictif','\\.'
  ].join('\n'),
  '05-data-auth.sql':[
    'COPY auth.users (id, email) FROM stdin;',
    'fictif-1\texemple@invalid.local','fictif-2\texemple2@invalid.local','\\.',
    'COPY auth.identities (id, user_id) FROM stdin;',
    'i1\tfictif-1','i2\tfictif-2','\\.'
  ].join('\n'),
  '06-data-storage.sql':'COPY storage.objects (id, bucket_id) FROM stdin;\no1\ttourneo-media\n\\.\n'
 };
 try{
  for(const name of ATTENDUS)fs.writeFileSync(path.join(dir,name),fixtures[name]||('-- Schema fictif '+name+'\n'+'select 1;\n'));
  fs.writeFileSync(path.join(dir,'photo-test.png'),Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),Buffer.alloc(24)]));
  let r=await verifier(dir);
  assert.equal(r.fichiersSql,7);assert.equal(r.mediasPng,1);
  assert.equal(r.comptes,2);assert.equal(r.profils,2);assert.equal(r.identites,2);assert.equal(r.tournois,1);
  assert.equal(r.restaurationValidee,false);
  fs.appendFileSync(path.join(dir,'05-data-auth.sql'),'\n');
  r=await verifier(dir); // le script n'invente pas de hash d'origine pour comparer; il recalcule
  assert.equal(r.comptes,2);
  fs.writeFileSync(path.join(dir,'05-data-auth.sql'),fixtures['05-data-auth.sql'].replace('i2\tfictif-2'+String.fromCharCode(92)+'n',''));
  await assert.rejects(verifier(dir),/incoherents/);
  fs.writeFileSync(path.join(dir,'05-data-auth.sql'),fixtures['05-data-auth.sql'].replace('\\.\nCOPY auth.identities','COPY auth.identities'));
  await assert.rejects(verifier(dir),/COPY incomplet|COPY/);
  fs.writeFileSync(path.join(dir,'05-data-auth.sql'),fixtures['05-data-auth.sql']);
  fs.rmSync(path.join(dir,'photo-test.png'));
  await assert.rejects(verifier(dir),/PNG/);
  fs.writeFileSync(path.join(dir,'photo-test.png'),Buffer.from('faux png'));
  await assert.rejects(verifier(dir),/PNG/);
  fs.rmSync(path.join(dir,'04-data-public.sql'));
  await assert.rejects(verifier(dir),/absent/);
  console.log('Audit archive IPv4 local: 7 SQL, COPY, nombres, PNG, pertes refuses : OK');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
