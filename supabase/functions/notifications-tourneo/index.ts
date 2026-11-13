import {createClient} from '@supabase/supabase-js';
import webpush from 'web-push';
import {traiterEnvois} from './transport.ts';
const url=Deno.env.get('SUPABASE_URL')||'';
if(new URL(url).hostname!=='kmjfmjhdnokkaiolxiin.supabase.co')throw new Error('Projet V2 requis');
const db=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',{auth:{persistSession:false,autoRefreshToken:false}});
const site='https://tourneo-v2-test-tourneo.vercel.app';
const emailActif=Boolean(Deno.env.get('RESEND_API_KEY')&&Deno.env.get('TOURNEO_EMAIL_FROM'));
async function initialiser(){const cles=webpush.generateVAPIDKeys();const r=await db.rpc('tourneo_worker_initialiser',{p_publique:cles.publicKey,p_privee:cles.privateKey,p_email:emailActif});if(r.error)throw r.error;return r.data;}
let config:ReturnType<typeof initialiser>|undefined;
function reponse(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}
async function memeSecret(a:string,b:string){const e=new TextEncoder();const [x,y]=await Promise.all([crypto.subtle.digest('SHA-256',e.encode(a)),crypto.subtle.digest('SHA-256',e.encode(b))]);const yy=new Uint8Array(y);let difference=0;new Uint8Array(x).forEach((v,i)=>{difference|=v^yy[i];});return difference===0;}
Deno.serve(async req=>{
 if(req.method!=='POST')return reponse(405,{erreur:'Méthode non autorisée'});
 try{config??=initialiser().catch(e=>{config=undefined;throw e;});const cfg=await config;
  if(!await memeSecret(req.headers.get('x-tourneo-token')||'',cfg.jeton))return reponse(401,{erreur:'Accès refusé'});
  webpush.setVapidDetails(site,cfg.publique,cfg.privee);const r=await db.rpc('tourneo_worker_prendre',{p_email:emailActif});if(r.error)throw r.error;
  const resultat=await traiterEnvois(r.data||[],site,async(s,p,id)=>{
   const d=webpush.generateRequestDetails({endpoint:s.endpoint,keys:s.keys},JSON.stringify(p),{TTL:300,topic:id.replaceAll('-','').slice(0,32)});const headers={...d.headers};delete headers['Content-Length'];
   const reponse=await fetch(d.endpoint,{method:'POST',headers,body:d.body,redirect:'error',signal:AbortSignal.timeout(10000)});return reponse.status;
  },async(j,lien)=>{
   const textes=j.langue==='en'?{titre:'Tourneo · Tournament update',texte:'A new update is waiting for you in Tourneo.',prefs:'Manage your sports alerts'}:j.langue==='nl'?{titre:'Tourneo · Toernooi-update',texte:'Er staat een nieuw bericht voor je klaar in Tourneo.',prefs:'Beheer je sportmeldingen'}:{titre:'Tourneo · Information sur votre tournoi',texte:'Une nouvelle information vous attend dans Tourneo.',prefs:'Gérer vos alertes sportives'};
   const reponse=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${Deno.env.get('RESEND_API_KEY')}`,'Content-Type':'application/json','Idempotency-Key':`tourneo-${j.id}`},body:JSON.stringify({from:Deno.env.get('TOURNEO_EMAIL_FROM'),to:[j.email],subject:textes.titre,text:`${textes.texte}\n\n${lien}\n\n${textes.prefs} : ${site}/profil`}),signal:AbortSignal.timeout(10000)});return reponse.ok;
  },async(j,ok,expires)=>{const fin=await db.rpc('tourneo_worker_finir',{p_id:j.id,p_bail:j.bail,p_ok:ok,p_expires:expires});if(fin.error)throw fin.error;});
  return reponse(200,resultat);
 }catch{return reponse(503,{erreur:'Traitement temporairement indisponible'});}
});
