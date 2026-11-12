const assert=require('node:assert/strict'),fs=require('node:fs'),{spawn}=require('node:child_process');
const {chromium}=require('playwright');
const {traductions}=(()=>{const source=fs.readFileSync('lib/traductions.ts','utf8');return {traductions:JSON.parse(source.slice(source.indexOf('=')+1).trim().replace(/;$/,''))};})();
const base='http://127.0.0.1:3199';
function texte(v,lang){return lang==='fr'?v:traductions[v]?.[lang]||v;}
(async()=>{
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3199'],{env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'https://kmjfmjhdnokkaiolxiin.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_browser-fixture'},stdio:['ignore','pipe','pipe']});let browser;
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server did not become ready')),45000);server.stdout.on('data',v=>{if(v.toString().includes('Ready')){clearTimeout(timer);resolve();}});server.stderr.on('data',v=>{if(!v.toString().includes('Cross origin request'))process.stderr.write(v);});server.on('exit',n=>reject(Error('Server exit '+n)));});
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const [lang,width]of [['fr',320],['en',390],['nl',768],['fr',1366]]){
   const ctx=await browser.newContext({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500});await ctx.addInitScript(lang=>localStorage.setItem('tourneo-langue',lang),lang);
   const page=await ctx.newPage();const erreurs=[];page.on('pageerror',e=>erreurs.push(e.message));
   await page.goto(base+'/outils');await page.getByRole('heading',{name:texte('Boîte à outils',lang),exact:true}).waitFor({timeout:45000});
   await page.waitForTimeout(250);const largeurs=await page.evaluate(()=>({page:document.documentElement.scrollWidth,ecran:innerWidth}));assert.ok(largeurs.page<=largeurs.ecran+2,`${lang}/${width}: overflow ${JSON.stringify(largeurs)}`);
   await page.locator('button[aria-pressed]').nth(2).click();await page.locator('textarea').fill(Array.from({length:21},(_,i)=>`Personne ${i+1}`).join('\n'));await page.locator('input[min="2"]').fill('3');await page.getByRole('button',{name:texte('Lancer la roulette',lang),exact:true}).click();await page.locator('.tourneo-drawn-teams article').first().waitFor();
   assert.equal(await page.locator('.tourneo-drawn-teams article').count(),3);for(const a of await page.locator('.tourneo-drawn-teams article').all())assert.equal(await a.locator('li').count(),7);
   assert.equal(new Set(await page.locator('.tourneo-drawn-teams li').allTextContents()).size,21);
   await page.screenshot({path:`tests/screenshots/outils-${lang}-${width}.png`,fullPage:true});assert.deepEqual(erreurs,[],lang+' browser errors');await ctx.close();
   console.log(`Browser ${lang} ${width}px : mise en page et tirage 21/3 : OK`);
  }
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await ctx.addInitScript(()=>{const equipes=['Alice','Bob','Camille','David'].map((nom,i)=>({id:String(i+1),nom,emoji:'🏅',couleur:'#3B82F6',joueurs:[]}));const matchs=[{id:1,journee:1,equipe1Id:'1',equipe2Id:'2',score1:'13',score2:'6'},{id:2,journee:1,equipe1Id:'3',equipe2Id:'4',score1:'',score2:''}];localStorage.setItem('tourneo-v04:browser-test',JSON.stringify({nomTournoi:'Contrôle mobile',tournoiId:'browser-test',sport:'petanque',formatTournoi:'complet',cree:true,equipes,matchs,matchsValides:[1],poules:[],optionsV2:{terrains:1,duree:15,repos:0}}));});
  const page=await ctx.newPage();await page.goto(base+'/tournoi/browser-test');await page.getByRole('heading',{name:'Contrôle mobile',exact:true}).waitFor({timeout:45000});await page.locator('.tourneo-tournament-more summary').click();await page.getByRole('button',{name:'Modifier les équipes',exact:true}).click();await page.getByRole('button',{name:'Modifier',exact:true}).first().click();
  const dialog=page.getByRole('dialog');await dialog.getByPlaceholder('Ex. Les Lions ou Cédric').fill('Équipe corrigée');
  await dialog.locator('input[type="file"]').setInputFiles({name:'photo-fixture.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4X0AAAAASUVORK5CYII=','base64')});
  await dialog.getByRole('button',{name:'Enregistrer les modifications',exact:true}).click();await page.getByText('Équipe corrigée',{exact:true}).first().waitFor();await page.waitForTimeout(600);
  const donnees=await page.evaluate(()=>JSON.parse(localStorage.getItem('tourneo-v04:browser-test')));assert.equal(donnees.matchs[0].score1,'13');assert.equal(donnees.matchs[0].score2,'6');assert.deepEqual(donnees.matchsValides,[1]);assert.equal(donnees.equipes[0].id,'1');assert.equal(donnees.equipes[0].historique[0].nom,'Alice');assert.match(donnees.equipes[0].photo,/^data:image\/jpeg/);
  await page.screenshot({path:'tests/screenshots/modification-photo-mobile.png',fullPage:true});console.log('Browser mobile : photo préparée, équipe modifiée, historique et résultat 13–6 conservés : OK');await ctx.close();
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
