export type Abonnement={id:string;endpoint:string;keys:{p256dh:string;auth:string}};
export type Envoi={id:string;bail:string;canal:'push'|'email';lien:string;email:string|null;langue?:string;abonnements:Abonnement[]};
export async function traiterEnvois(jobs:Envoi[],site:string,envoyerPush:(s:Abonnement,p:Record<string,string>,id:string)=>Promise<number>,envoyerMail:(j:Envoi,url:string)=>Promise<boolean>,confirmer:(j:Envoi,ok:boolean,expires:string[])=>Promise<void>){
 let transmis=0,echecs=0;
 for(const j of jobs){let ok=false;const expires:string[]=[];try{
  const lien=new URL(j.lien,site);if(lien.origin!==site||lien.search||!((lien.pathname==='/activite'&&!lien.hash)||(/^\/partage\/[^/]+$/.test(lien.pathname)&&/^#match-\d+$/.test(lien.hash))))throw new Error('Lien invalide');
  if(j.canal==='push'){
   const body=j.langue==='en'?'A new update is waiting for you in Tourneo.':j.langue==='nl'?'Er staat een nieuw bericht voor je klaar in Tourneo.':'Une nouvelle information vous attend dans Tourneo.';
   const resultats=await Promise.all(j.abonnements.map(async s=>{try{const status=await envoyerPush(s,{title:'Tourneo',body,url:lien.pathname+lien.hash,tag:j.id},j.id);if(status===404||status===410)expires.push(s.id);return status>=200&&status<300;}catch{return false;}}));
   ok=resultats.some(Boolean)&&resultats.every((v,i)=>v||expires.includes(j.abonnements[i].id));
  }else if(j.email)ok=await envoyerMail(j,lien.href);
 }catch{ok=false;}
 await confirmer(j,ok,expires);if(ok)transmis++;else echecs++;
 }return{transmis,echecs};
}
