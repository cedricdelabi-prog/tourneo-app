const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const m={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('supabase/functions/notifications-tourneo/transport.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports);
(async()=>{const site='https://v2.example.test',base={id:'job',bail:'bail',canal:'push',lien:'/activite',email:null,abonnements:[{id:'device'}]};let sent=0,acks=[];const ack=async(j,ok,expired)=>acks.push({ok,expired});
 await m.exports.traiterEnvois([base],site,async()=>{sent++;return 201},async()=>false,ack);assert.equal(sent,1);assert.equal(acks.pop().ok,true);
 await m.exports.traiterEnvois([base],site,async()=>410,async()=>false,ack);assert.deepEqual(acks.pop(),{ok:false,expired:['device']});
 await m.exports.traiterEnvois([{...base,lien:'https://outside.test/activite'}],site,async()=>{throw new Error('Must not send')},async()=>false,ack);assert.equal(acks.pop().ok,false);
 await m.exports.traiterEnvois([base],site,async()=>500,async()=>false,ack);assert.equal(acks.pop().ok,false);
 const webpush=require('web-push'),crypto=require('node:crypto'),ecdh=crypto.createECDH('prime256v1');ecdh.generateKeys();const keys=webpush.generateVAPIDKeys();webpush.setVapidDetails(site,keys.publicKey,keys.privateKey);const d=webpush.generateRequestDetails({endpoint:'https://fcm.googleapis.com/never-sent',keys:{p256dh:ecdh.getPublicKey().toString('base64url'),auth:crypto.randomBytes(16).toString('base64url')}},'test');assert.ok(d.body.length>0);
 const handlers={},shown=[];vm.runInNewContext(fs.readFileSync('public/sw-v2.js','utf8'),{URL,self:{location:{origin:site},addEventListener:(n,f)=>handlers[n]=f,registration:{showNotification:async(t,p)=>shown.push(p)}}});
 async function push(p){let pending;handlers.push({data:{json:()=>p},waitUntil:v=>pending=v});await pending;}
 await push({url:'https://outside.test/activite',body:'private'});assert.equal(shown.length,0);await push({url:'/activite',body:'Tourneo'});assert.equal(shown.length,1);assert.equal(shown[0].data.url,'/activite');
 console.log('Alertes : chiffrement sans envoi, transport simulé, appareils expirés, erreurs, liens sûrs et service worker : OK');
})().catch(e=>{console.error(e);process.exitCode=1;});
