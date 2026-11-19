const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const root='http://127.0.0.1:3217';
const uid='b1000000-0000-4000-8000-000000000001';
const tid='b2000000-0000-4000-8000-000000000001';
const adresse='https://kmjfmjhdnokkaiolxiin.supabase.co';
const equipes=[{id:'a',nom:'Les Bleus'},{id:'b',nom:'Les Rouges'}];
const matchs=[{id:1,equipe1Id:'a',equipe2Id:'b',journee:1,ordre:1,terrain:1,score1:'',score2:''}];
const tournoi={nom:'Coupe Tourneo V2',donnees:{equipes,matchs,matchsValides:[],formatTournoi:'complet',optionsV2:{terrains:1,duree:10,repos:0,depart:'2026-12-01T14:00'}}};
const etat={reglages:null,revision:0,presence:null,patchs:[]};
function jeton(){return Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')+'.fixture';}
async function contexte(browser,viewport){
 const ctx=await browser.newContext({viewport,locale:'fr-FR'});
 await ctx.addInitScript(({uid,token})=>{
  const s={access_token:token,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:uid,aud:'authenticated',email:'fixture@example.invalid',user_metadata:{}}};
  localStorage.setItem('sb-kmjfmjhdnokkaiolxiin-auth-token',JSON.stringify(s));
  localStorage.setItem('tourneo-langue','fr');
 },{uid,token:jeton()});
 await ctx.route(adresse+'/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  let data=[];
  if(path.endsWith('/auth/v1/user'))data={id:uid,aud:'authenticated',email:'fixture@example.invalid',user_metadata:{}};
  else if(path.endsWith('/tournois'))data=tournoi;
  else if(path.endsWith('/tourneo_tv_pilotage')){
   data=etat.reglages===null?null:{reglages:etat.reglages,revision:etat.revision,derniere_tv_at:etat.presence};
  }else if(path.endsWith('/rpc/tv_pilotage_ping')){
   etat.presence=new Date().toISOString();
   if(etat.reglages===null){etat.reglages={};etat.revision=1;}
   data=etat.presence;
  }else if(path.endsWith('/rpc/tv_pilotage_appliquer')){
   const patch=req.postDataJSON().p_patch;
   assert.equal(Object.prototype.hasOwnProperty.call(patch,'brouillonAnnonce'),false,'private draft must never be sent');
   etat.patchs.push(patch);
   etat.reglages={...(etat.reglages||{}),...patch};
   etat.revision++;
   data=[{nouveaux_reglages:etat.reglages,nouvelle_revision:etat.revision}];
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 return ctx;
}
(async()=>{
 const env={...process.env,NEXT_PUBLIC_SUPABASE_URL:adresse,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_browser_fixture',NEXT_PUBLIC_TOURNEO_V2_PRODUCTION_APPROVED:'false',NEXT_TELEMETRY_DISABLED:'1'};
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3217'],{env,stdio:['ignore','pipe','pipe']});
 let browser,organisateur,publicTV;
 try{
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Next.js startup timeout')),50000);
   server.stdout.on('data',d=>{if(String(d).includes('Ready')){clearTimeout(timer);resolve();}});
   server.on('exit',code=>reject(Error('Next.js stopped: '+code)));
  });
  browser=await chromium.launch({args:['--no-sandbox'],...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});
  organisateur=await contexte(browser,{width:420,height:900});
  publicTV=await contexte(browser,{width:1280,height:720});
  const pc=await organisateur.newPage(),tv=await publicTV.newPage(),erreurs=[];
  for(const page of [pc,tv])page.on('pageerror',e=>erreurs.push(e.message));
  await pc.goto(root+'/tournoi/'+tid+'/tv',{waitUntil:'domcontentloaded'});
  await pc.getByRole('heading',{name:'Écran TV'}).waitFor({timeout:50000});
  await tv.goto(root+'/tournoi/'+tid+'/tv?ecran=1',{waitUntil:'domcontentloaded'});
  await tv.getByRole('heading',{name:'Coupe Tourneo V2'}).waitFor({timeout:50000});
  await pc.getByText('Une TV connectée à votre compte transmet des signaux récents.',{exact:false}).waitFor({timeout:30000});
  await pc.getByRole('button',{name:'Annonce buvette'}).click();
  await tv.getByText('La buvette est ouverte. Retrouvez-nous à l’espace buvette.',{exact:true}).waitFor({timeout:18000});
  assert.equal(etat.reglages.message.startsWith('La buvette est ouverte'),true);
  await pc.getByRole('button',{name:'Pause 10 min'}).click();
  await tv.getByRole('heading',{name:'Pause du tournoi'}).waitFor({timeout:18000});
  await pc.getByRole('button',{name:'Reprendre le tournoi'}).click();
  await tv.getByRole('heading',{name:'Pause du tournoi'}).waitFor({state:'hidden',timeout:18000});
  await pc.locator('details.tourneo-tv-fold').nth(3).locator('summary').click();
  await pc.getByLabel('Appeler un match sur la TV').selectOption('1');
  await tv.locator('.tourneo-tv-call-full').getByText('Prochain match : appel des joueurs').waitFor({timeout:18000});
  assert.match(await tv.locator('.tourneo-tv-call-full h2').innerText(),/Les Bleus.*Les Rouges/s);
  assert.equal(etat.reglages.appel,1);
  await pc.getByRole('button',{name:'Terminer l’appel et reprendre la diffusion'}).click();
  await tv.locator('.tourneo-tv-call-full').waitFor({state:'hidden',timeout:18000});
  await pc.getByLabel('Préparer une annonce au public').fill('Brouillon confidentiel');
  assert.equal(etat.patchs.some(p=>JSON.stringify(p).includes('Brouillon confidentiel')),false);
  await pc.getByRole('button',{name:'Diffuser l’annonce maintenant'}).click();
  await tv.getByText('Brouillon confidentiel',{exact:true}).waitFor({timeout:18000});
  assert.ok(!erreurs.length,'No React browser exceptions: '+erreurs.join('; '));
  assert.ok(await pc.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),'organizer cockpit fits 420px');
  assert.ok(await tv.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),'public TV fits desktop width');
  console.log('V2 TV multi-context: remote heartbeat, announcement, pause/resume, player call, draft privacy, responsive layout: OK');
 }finally{
  if(organisateur)await organisateur.close();
  if(publicTV)await publicTV.close();
  if(browser)await browser.close();
  server.kill();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
