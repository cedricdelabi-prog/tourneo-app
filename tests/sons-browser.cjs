const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');
const root = 'http://127.0.0.1:3216';
(async()=>{
 let browser;
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3216'],{env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'https://kmjfmjhdnokkaiolxiin.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'},stdio:['ignore','pipe','pipe']});
 try{
  await new Promise((ok,no)=>{const t=setTimeout(()=>no(Error('startup timeout')),45000);server.stdout.on('data',d=>{if(String(d).includes('Ready')){clearTimeout(t);ok();}});server.on('exit',n=>{clearTimeout(t);no(Error('server '+n));});});
  browser=await chromium.launch({args:['--no-sandbox']});
  for(const width of [390,1366]){
   const ctx=await browser.newContext({viewport:{width,height:844},isMobile:width<500,hasTouch:width<500,locale:'fr-FR'});
   await ctx.addInitScript(()=>{
    window.__audio=[];window.__contexts=[];
    const NativeAudio=window.Audio;
    window.Audio=function(...args){const a=new NativeAudio(...args);window.__audio.push(a);return a;};window.Audio.prototype=NativeAudio.prototype;
    const NativeContext=window.AudioContext;
    window.AudioContext=class extends NativeContext{constructor(...args){super(...args);window.__contexts.push(this);}};
   });
   await ctx.route('https://kmjfmjhdnokkaiolxiin.supabase.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
   const page=await ctx.newPage();
   const response=await page.goto(root+'/outils');
   assert.equal(response.headers()['x-content-type-options'],'nosniff');
   assert.equal(response.headers()['referrer-policy'],'no-referrer');
   assert.equal(response.headers()['x-frame-options'],'SAMEORIGIN');
   assert.match(response.headers()['permissions-policy'],/camera=\(self\)/);
   assert.match(response.headers()['content-security-policy'],/object-src 'none'/);
   const tabs=page.getByRole('group',{name:'Choisir un outil',exact:true});
   await tabs.getByRole('button',{name:'Pile ou face',exact:true}).click();
   const coin=page.locator('.tourneo-coin');
   assert.equal(await coin.getByRole('button',{name:'Son de la pièce activé',exact:true}).getAttribute('aria-pressed'),'true');
   await coin.getByRole('button',{name:'Lancer la pièce',exact:true}).click();
   await page.waitForFunction(()=>window.__audio.some(a=>a.src.includes('piece')&&a.currentTime>0&&!a.paused&&!a.muted)&&window.__contexts.some(c=>c.state==='running'));
   await tabs.getByRole('button',{name:'Chrono',exact:true}).click();
   assert.ok(await page.evaluate(()=>window.__audio.every(a=>a.paused)),'leaving the coin stops sound');
   await tabs.getByRole('button',{name:'Pile ou face',exact:true}).click();
   await coin.getByRole('button',{name:'Son de la pièce activé',exact:true}).click();
   await page.reload();
   await tabs.getByRole('button',{name:'Pile ou face',exact:true}).click();
   await coin.getByRole('button',{name:'Son de la pièce coupé',exact:true}).waitFor();
   await coin.getByRole('button',{name:'Écouter le son',exact:true}).click();
   await page.waitForFunction(()=>window.__audio.some(a=>a.src.includes('piece')&&a.currentTime>0&&!a.paused));
   await tabs.getByRole('button',{name:'Tirage des équipes',exact:true}).click();
   await page.getByLabel('Une personne par ligne',{exact:true}).fill('Alice\nBob\nCamille\nDavid');
   await page.getByLabel('Nombre d’équipes',{exact:true}).fill('2');
   await page.getByRole('button',{name:'Lancer la roulette',exact:true}).click();
   await page.waitForFunction(()=>window.__audio.some(a=>a.src.includes('roue')&&a.currentTime>0&&!a.paused&&!a.muted));
   const niveaux=await page.evaluate(async()=>{
    const context=new AudioContext(),result={};
    for(const nom of ['roue','piece']){
     const data=await fetch('/audio/tourneo-'+nom+'.wav').then(r=>r.arrayBuffer());
     const buffer=await context.decodeAudioData(data),samples=buffer.getChannelData(0);
     let pic=0;for(const s of samples)pic=Math.max(pic,Math.abs(s));
     result[nom]={duree:buffer.duration,pic};
    }
    await context.close();return result;
   });
   for(const son of Object.values(niveaux)){assert.ok(son.duree>.1);assert.ok(son.pic>.05,'audio file contains a non-silent waveform');}
   await tabs.getByRole('button',{name:'Chrono',exact:true}).click();
   assert.ok(await page.evaluate(()=>window.__audio.every(a=>a.paused)));
   await ctx.close();
   console.log(`Sons ${width}px : lecture réelle pièce/roulette, contexte audio actif, fichiers non silencieux, préférence muette mémorisée, aperçu et arrêt au changement d’onglet : OK ; protections HTTP : OK`);
  }
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
