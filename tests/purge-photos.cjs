const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
(async () => {
  const { executerPurge } = await import(pathToFileURL(path.resolve(__dirname,'../supabase/functions/purge-photos-v2/purge.mjs')).href);
  const token='a0000000-0000-4000-8000-000000000001';
  const requete = body => new Request('https://example.invalid/purge',{method:'POST',body:JSON.stringify(body)});
  let appels=0;
  const interdit={rpc:async()=>{appels++;throw new Error('Must not access DB');}};
  assert.equal((await executerPurge(requete({}),interdit)).status,401); assert.equal(appels,0);
  assert.equal((await executerPurge(new Request('https://example.invalid'),interdit)).status,405);
  const sansDroit={rpc:async()=>({data:false,error:null})};
  assert.equal((await executerPurge(requete({token}),sansDroit)).status,401);
  let lots=0,nettoye=false,supprime=[];
  const db={rpc:async(n)=>{
    if(n==='tourneo_consomme_job_photo')return {data:true,error:null};
    if(n==='tourneo_photos_a_supprimer')return {data:lots++?[ ]:[{name:'owner/tournois/id/expire.png'}],error:null};
    if(n==='tourneo_nettoyer_photos_inline'){nettoye=true;return {error:null};}
    throw new Error('Unexpected RPC');
  },storage:{from:bucket=>{assert.equal(bucket,'tourneo-media');return {remove:async(paths)=>{supprime=paths;return {error:null};}};}}};
  const succes=await executerPurge(requete({token}),db);
  assert.equal(succes.status,200);assert.equal((await succes.json()).supprimees,1);
  assert.deepEqual(supprime,['owner/tournois/id/expire.png']);assert.equal(nettoye,true);
  lots=0;nettoye=false;db.storage.from=()=>({remove:async()=>({error:{message:'Temporary Storage failure'}})});
  assert.equal((await executerPurge(requete({token}),db)).status,503);
  assert.equal(nettoye,false,'Do not erase DB references after a failed Storage deletion');
  console.log('Purge photos : requêtes non autorisées refusées, suppression ciblée et échec Storage récupérable : OK');
})().catch(e=>{console.error(e);process.exitCode=1;});
