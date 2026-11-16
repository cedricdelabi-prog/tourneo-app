const assert=require('node:assert/strict'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
const root='http://127.0.0.1:3217',uid='c1000000-0000-4000-8000-000000000001',tid='c2000000-0000-4000-8000-000000000001',mid='c3000000-0000-4000-8000-000000000001';
(async()=>{let browser;const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3217'],{env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'https://kmjfmjhdnokkaiolxiin.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'},stdio:['ignore','pipe','pipe']});try{
 await new Promise((ok,no)=>{const t=setTimeout(()=>no(Error('startup timeout')),45000);server.stdout.on('data',d=>{if(String(d).includes('Ready')){clearTimeout(t);ok();}});server.on('exit',n=>{clearTimeout(t);no(Error('server '+n));});});
 browser=await chromium.launch({args:['--no-sandbox']});
 for(const width of [390,1366]){
  const ctx=await browser.newContext({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500,locale:'fr-FR'});
  await ctx.addInitScript(({uid})=>{const token=btoa(JSON.stringify({alg:'HS256'}))+'.'+btoa(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600}))+'.fixture';localStorage.setItem('sb-kmjfmjhdnokkaiolxiin-auth-token',JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:uid,aud:'authenticated'}}));},{uid});
  const message={id:mid,tournoi_id:tid,auteur_id:'c1000000-0000-4000-8000-000000000002',auteur_nom:'Joueur test',audience:'tous',contenu:'Message de démonstration signalé',created_at:'2026-11-16T12:00:00Z'};
  let admin=false,reported=false,closed=false,reports=[],decisions=[];
  await ctx.route('https://kmjfmjhdnokkaiolxiin.supabase.co/**',async route=>{
   const req=route.request(),p=new URL(req.url()).pathname;let data=[],status=200;
   if(p.endsWith('/auth/v1/user'))data={id:uid,aud:'authenticated'};
   else if(p.endsWith('/rpc/tourneo_discussion_tournois'))data=[{id:tid,nom:'Tournoi de démonstration',role:'joueurs'}];
   else if(p.endsWith('/tourneo_discussions'))data=[message];
   else if(p.endsWith('/rpc/tourneo_discussion_signaler')){reports.push(req.postDataJSON());reported=true;if(reports.length===1){status=503;data={message:'response lost'};}else data=reports[0].p_id;}
   else if(p.endsWith('/rpc/tourneo_mon_role_admin'))data=admin?'superadmin':null;
   else if(p.endsWith('/rpc/tourneo_moderation_compteur'))data=admin?(reported&&!closed?1:0):null;
   else if(p.endsWith('/rpc/tourneo_moderation_liste'))data=reported&&!closed?[{id:reports[0].p_id,message_id:mid,tournoi_nom:'Tournoi de démonstration',raison:'menace',precision:'À examiner',contexte:[message],statut:'nouveau',decision:null,motif_decision:null,created_at:message.created_at,suspension_active:false,jusquau:null}]:[];
   else if(p.endsWith('/rpc/tourneo_moderation_decider')){decisions.push(req.postDataJSON());closed=true;data=null;}
   else if(p.endsWith('/rpc/tourneo_admin_tableau'))data={comptes:2,nouveaux_comptes:1,connexions:1,tournois:1,expert_offert:0,sports:[],formats:[],usages:[]};
   await route.fulfill({status,contentType:'application/json; charset=utf-8',body:JSON.stringify(data)});
  });
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(root+'/messages');await page.getByRole('heading',{name:'Échanges du tournoi',exact:true}).waitFor({timeout:45000});
  const report=page.locator('.tourneo-report-form');await report.locator('summary').click();await report.getByLabel('Motif du signalement',{exact:true}).selectOption('menace');await report.getByLabel('Précisions (facultatives)',{exact:true}).fill('À examiner');
  await report.getByRole('button',{name:'Transmettre le signalement',exact:true}).click();await report.getByRole('alert').waitFor();assert.equal(await report.getByLabel('Précisions (facultatives)',{exact:true}).inputValue(),'À examiner');
  await report.getByRole('button',{name:'Transmettre le signalement',exact:true}).click();await report.getByText('Signalement transmis à la modération. Merci.',{exact:true}).waitFor();assert.equal(reports.length,2);assert.equal(reports[0].p_id,reports[1].p_id);assert.equal(reports[1].p_message,mid);
  admin=true;await page.goto(root+'/administration');await page.getByRole('button',{name:'Sécurité (1)',exact:true}).waitFor();await page.getByRole('button',{name:'Examiner les signalements',exact:true}).click();
  await page.getByRole('heading',{name:'Sécurité · signalements',exact:true}).waitFor();await page.getByText('Voir le message et son contexte',{exact:true}).click();await page.getByText(message.contenu,{exact:true}).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'moderation fits mobile');
  await page.screenshot({path:`tests/screenshots/moderation-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'Intervenir',exact:true}).click();const decision=page.locator('.tourneo-moderation-decision');await decision.getByLabel('Action',{exact:true}).selectOption('suspendre_24h');await decision.getByLabel('Motif obligatoire',{exact:true}).fill('Propos examinés par la modération');page.once('dialog',d=>d.accept());await decision.getByRole('button',{name:'Confirmer la décision',exact:true}).click();
  await page.getByText('Décision enregistrée dans l’historique.',{exact:true}).waitFor();await page.getByRole('button',{name:'Sécurité (0)',exact:true}).waitFor();assert.equal(decisions.length,1);assert.equal(decisions[0].p_action,'suspendre_24h');assert.deepEqual(errors,[]);
  await ctx.close();console.log(`Modération ${width}px : signalement, réponse perdue/reprise sans doublon, alerte admin, contexte, décision motivée et compteur actualisé : OK (API simulée)`);
 }
 }finally{if(browser)await browser.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
