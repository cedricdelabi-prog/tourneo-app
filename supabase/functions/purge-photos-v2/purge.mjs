export async function executerPurge(request, db) {
  const json = (body, status=200) => new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
  if(request.method!=="POST")return json({error:"Méthode refusée"},405);
  let body;
  try { const raw=await request.text();if(raw.length>2048)return json({error:"Requête invalide"},400);body=JSON.parse(raw); }
  catch {return json({error:"Requête invalide"},400);}
  if(typeof body?.token!=="string"||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.token))return json({error:"Accès refusé"},401);
  const auth=await db.rpc("tourneo_consomme_job_photo",{p_token:body.token});
  if(auth.error)return json({error:"Vérification indisponible"},503);
  if(auth.data!==true)return json({error:"Accès refusé"},401);
  let supprimees=0;
  // Bound each run; failed deletions remain in Storage and are retried next run.
  for(let lot=0;lot<10;lot++){
    const r=await db.rpc("tourneo_photos_a_supprimer");
    if(r.error)return json({error:"Lecture des échéances impossible",supprimees},503);
    const paths=(r.data||[]).map(x=>x.name);
    if(!paths.length)break;
    const del=await db.storage.from("tourneo-media").remove(paths);
    if(del.error)return json({error:"Suppression incomplète",supprimees},503);
    supprimees+=paths.length;
  }
  const clean=await db.rpc("tourneo_nettoyer_photos_inline");
  if(clean.error)return json({error:"Nettoyage des aperçus incomplet",supprimees},503);
  return json({ok:true,supprimees});
}
