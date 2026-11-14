const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const {chromium}=require('playwright');
const root='http://127.0.0.1:3210',uid='e1000000-0000-4000-8000-000000000002',tid='e2000000-0000-4000-8000-000000000001';
(async()=>{
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3210'],{env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'https://kmjfmjhdnokkaiolxiin.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_browser_fixture'},stdio:['ignore','pipe','pipe']});let browser;
 try{
  await new Promise((ok,non)=>{const t=setTimeout(()=>non(Error('Server timeout')),45000);server.stdout.on('data',d=>{if(d.toString().includes('Ready')){clearTimeout(t);ok();}});server.on('exit',n=>non(Error('Server exit '+n)));});
  browser=await chromium.launch({args:['--no-sandbox']});
  for(const width of [320,1366]){
   const ctx=await browser.newContext({viewport:{width,height:900}});let auth=false,role='superadmin',ouvertures=[];
   await ctx.route('https://kmjfmjhdnokkaiolxiin.supabase.co/**',async route=>{
    const req=route.request(),p=new URL(req.url()).pathname;let data=[];
    if(p.endsWith('/auth/v1/user'))data=auth?{id:uid,email:'test@example.invalid',aud:'authenticated',user_metadata:{}}:{user:null};
    else if(p.endsWith('/rpc/tourneo_communaute_publique'))data={minimum:20,maximum:29,mesure:'comptes_confirmes'};
    else if(p.endsWith('/rpc/tourneo_mon_role_admin'))data=role;
    else if(p.endsWith('/rpc/tourneo_admin_tableau'))data={comptes:22,nouveaux_comptes:2,connexions:1,tournois:1,expert_offert:0,sports:[],formats:[]};
    else if(p.endsWith('/rpc/tourneo_admin_albums_partages'))data=[{id:tid,nom:'Album partagé',photos:1}];
    else if(p.endsWith('/rpc/tourneo_admin_ouvrir_album')){ouvertures.push(req.postDataJSON());data={tournoi_id:tid,expire_at:new Date(Date.now()+300000).toISOString(),photos:[{id:'photo',path:'apercu.jpg',legende:'Souvenir partagé'}]};}
    else if(p.includes('/storage/v1/object/'))return route.fulfill({status:200,contentType:'image/png',body:fs.readFileSync('public/tourneo-icon.png')});
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
   });
   const page=await ctx.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
   console.log('Checking public counter',width);await page.goto(root+'/');await page.getByText('Entre 20 et 29 comptes confirmés',{exact:true}).waitFor({timeout:45000});
   assert.equal(await page.getByText(/Les visites sans compte ne sont pas incluses/).count(),1);
   await page.goto(root+'/login');await page.getByText('Entre 20 et 29 comptes confirmés',{exact:true}).waitFor();
   auth=true;await page.evaluate(({uid})=>{const token=btoa(JSON.stringify({alg:'HS256'}))+'.'+btoa(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600}))+'.fixture';localStorage.setItem('sb-kmjfmjhdnokkaiolxiin-auth-token',JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:uid,email:'test@example.invalid',aud:'authenticated',user_metadata:{}}}));},{uid});
   console.log('Checking help',width);await page.goto(root+'/tournoi/nouveau');await page.getByRole('heading',{name:'Créer votre tournoi',exact:true}).waitFor({timeout:45000});
   const aide=page.getByRole('button',{name:'Informations : Nom du tournoi',exact:true});await aide.scrollIntoViewIfNeeded();
   // The portal must remain attached visually even inside a transformed form.
   await aide.evaluate(el=>el.parentElement.style.transform='translateZ(0)');await aide.click();const note=page.getByRole('note');await note.waitFor();
   async function verifier(){const a=await aide.boundingBox(),p=await note.boundingBox();assert.ok(p.x>=10&&p.x+p.width<=width-10,'horizontal bounds');assert.ok(p.y>=10&&p.y+p.height<=902,'vertical bounds');assert.ok(Math.min(Math.abs(p.y-(a.y+a.height)),Math.abs(a.y-(p.y+p.height)))<=12,'help should remain next to the field');}
   await verifier();await page.mouse.wheel(0,90);await page.waitForTimeout(100);if(await note.isVisible())await verifier();
   await page.keyboard.press('Escape');assert.equal(await note.count(),0);assert.ok(await aide.evaluate(el=>el===document.activeElement));
   await aide.click();await page.getByRole('note').getByRole('button',{name:'Fermer',exact:true}).click();assert.equal(await note.count(),0);
   await aide.click();await page.getByRole('heading',{name:'Créer votre tournoi',exact:true}).click();assert.equal(await note.count(),0);

   console.log('Checking moderation',width);await page.goto(root+'/administration');await page.getByRole('button',{name:'Photos · modération',exact:true}).click();await page.getByRole('button',{name:'Examiner cet album',exact:true}).click();const ouvrir=page.getByRole('button',{name:'Ouvrir les aperçus pour cinq minutes',exact:true});assert.ok(await ouvrir.isDisabled());await page.getByLabel('Motif obligatoire',{exact:true}).fill('Vérification de la photo signalée');await ouvrir.click();await page.getByAltText('Souvenir partagé',{exact:true}).waitFor();assert.equal(ouvertures.length,1);assert.equal(ouvertures[0].p_tournoi,tid);
   await page.screenshot({path:`tests/screenshots/moderation-${width}.png`,fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'admin mobile overflow');
   await page.clock.install();await page.clock.fastForward(300001);await page.getByText('Consultation terminée. Indiquez un motif pour rouvrir un album.',{exact:true}).waitFor();assert.equal(await page.getByAltText('Souvenir partagé',{exact:true}).count(),0);
   role='admin';await page.reload();await page.getByText('Administrateur · consultation',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Photos · modération',exact:true}).count(),0);assert.deepEqual(errors,[]);
   await ctx.close();console.log(`Reprise ${width}px : compteur sans connexion, aide ancrée/scroll/clavier, modération motivée/expiration/superadmin : OK (API simulée)`);
  }
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
