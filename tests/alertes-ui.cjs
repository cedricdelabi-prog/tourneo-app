const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
let hooks=[],cursor=0,effects=[],native=false,available=true,permission='granted',requests=0,inserts=0,deletes=0,unsubscribes=0,upsertFails=false,current=null;
const react={useState(v){const i=cursor++;if(!(i in hooks))hooks[i]=v;return[hooks[i],v=>hooks[i]=typeof v==='function'?v(hooks[i]):v]},useRef(v){const i=cursor++;return hooks[i]||=( {current:v} )},useEffect(f){const i=cursor++;if(!hooks[i]){hooks[i]=true;effects.push(f)}}};
const subscription={endpoint:'https://fcm.googleapis.com/fake',toJSON:()=>({keys:{p256dh:'key',auth:'key'}}),async unsubscribe(){unsubscribes++;current=null;return true}};
const registration={pushManager:{async getSubscription(){return current},async subscribe(){current=subscription;return subscription}}};
const serviceWorker={getRegistration:async()=>registration,register:async()=>registration,ready:Promise.resolve(registration)};
Object.defineProperty(global,'navigator',{value:{serviceWorker},configurable:true});global.Notification={async requestPermission(){requests++;return permission}};global.window={PushManager:function(){},Notification,addEventListener(){},removeEventListener(){}};
const supabase={auth:{getUser:async()=>({data:{user:{id:'qa'}}})},rpc:async()=>({data:available?{push:true,cle:'public',email:false}:{},error:null}),from(table){return{select(){return this},eq(){return this},maybeSingle:async()=>({data:table==='tourneo_preferences'?{notifications_sportives:true,notifications_push:false,notifications_email:false}:null,error:null}),insert:async()=>{inserts++;return{}},delete(){deletes++;return{eq(){return this},then(ok){return Promise.resolve({error:null}).then(ok)}}},upsert:async()=>({error:upsertFails?new Error('offline'):null})}}};
const m={exports:{}};const jsx=(type,props)=>({type,props});const source=ts.transpileModule(fs.readFileSync('components/AlertesExternes.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('require','module','exports',source)(id=>id==='react'?react:id==='react/jsx-runtime'?{jsx,jsxs:jsx}:id==='@capacitor/core'?{Capacitor:{isNativePlatform:()=>native,getPlatform:()=>'android'}}:id==='@/lib/supabase'?{supabase}:id==='@/lib/push-client'?{clePush:()=>new ArrayBuffer(1)}:{tr:v=>v,useLangue:()=> 'fr'},m,m.exports);
function text(n){if(Array.isArray(n))return n.map(text).join('');return n&&typeof n==='object'?text(n.props?.children):n==null?'':String(n)}
function all(n){if(Array.isArray(n))return n.flatMap(all);return n&&typeof n==='object'?[n,...all(n.props?.children)]:[]}
function render(){cursor=0;const tree=m.exports.default();const todo=effects;effects=[];todo.forEach(f=>f());return tree}
const tick=()=>new Promise(r=>setImmediate(r));async function loaded(){render();await tick();await tick();return render()}
function button(t,label){const b=all(t).find(n=>n.type==='button'&&text(n)===label);assert.ok(b,label);return b}
function reset(){hooks=[];cursor=0;effects=[];current=null;requests=inserts=deletes=unsubscribes=0;upsertFails=false;native=false;available=true;permission='granted'}
(async()=>{
 reset();let t=await loaded();assert.equal(requests,0,'No permission prompt on opening');assert.equal(button(t,'Activer les e-mails sportifs').props.disabled,true,'No email provider');
 permission='denied';button(t,'Activer sur cet appareil').props.onClick();await tick();t=render();assert.equal(inserts,0);assert.match(text(t),/Autorisation non accordée/);
 reset();t=await loaded();upsertFails=true;const click=button(t,'Activer sur cet appareil').props.onClick;click();click();await tick();await tick();t=render();assert.equal(requests,1,'Rapid clicks serialized');assert.equal(unsubscribes,1,'New device rolled back after failed save');assert.equal(deletes,1);assert.match(text(t),/Activation impossible/);
 reset();native=true;t=await loaded();assert.equal(all(t).filter(n=>n.type==='button'&&text(n)==='Activer sur cet appareil').length,0,'Native APK uses its dedicated native alert control');
 reset();available=false;t=await loaded();assert.equal(button(t,'Activer sur cet appareil').props.disabled,true,'No server configuration');
 reset();t=await loaded();button(t,'Activer sur cet appareil').props.onClick();await tick();await tick();t=render();assert.equal(button(t,'Désactiver cet appareil').props.disabled,false);button(t,'Désactiver cet appareil').props.onClick();await tick();t=render();assert.equal(unsubscribes,1);assert.match(text(t),/Alertes désactivées/);
 console.log('Alertes UI : opt-in explicite, refus, double clic, rollback réseau, e-mail absent, APK incompatible et désactivation : OK');
})().catch(e=>{console.error(e);process.exitCode=1});
