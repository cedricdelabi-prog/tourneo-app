const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
let hooks=[],cursor=0,effects=[],calls=[],dropResponse=false;
let participants=[{participant_id:'a',nom:'Alice',statut:'disponible'},{participant_id:'b',nom:'Bob',statut:'sans_profil'}];
const react={useSyncExternalStore: (_subscribe,read)=>read(),
 useState(v){const i=cursor++;if(!(i in hooks))hooks[i]=v;return[hooks[i],next=>{hooks[i]=typeof next==='function'?next(hooks[i]):next;}];},
 useRef(v){const i=cursor++;return hooks[i]||=( {current:v} );},
 useCallback(fn,deps){const i=cursor++;if(!hooks[i]||deps.some((v,n)=>v!==hooks[i].deps[n]))hooks[i]={deps,fn};return hooks[i].fn;},
 useEffect(fn,deps){const i=cursor++;if(!hooks[i]||deps.some((v,n)=>v!==hooks[i][n]))effects.push(fn);hooks[i]=deps;},
};
const jsx=(type,props)=>({type,props});
const supabase={async rpc(name,args){
 calls.push({name,args});
 if(args.p_envoyer){participants=participants.map(p=>p.statut==='disponible'?{...p,statut:'depose'}:p);if(dropResponse)throw new Error('Connection lost after commit');}
 return {data:{match_id:1,participants},error:null};
}};
const source=fs.readFileSync(path.join(__dirname,'../components/AppelTournoi.tsx'),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
const moduleUnderTest={exports:{}};
new Function('require','module','exports',js)(id=>id==='@/lib/langue'?{useLangue:()=> 'fr',tr:v=>v,trModele:(s,...vs)=>vs.reduce((r,v,i)=>r.replaceAll('{'+i+'}',String(v)),s)}:id==='react'?react:id==='react/jsx-runtime'?{jsx,jsxs:jsx}:{supabase},moduleUnderTest,moduleUnderTest.exports);
global.setInterval=()=>1;global.clearInterval=()=>{};global.document={visibilityState:'visible'};
function all(n){if(Array.isArray(n))return n.flatMap(all);if(!n||typeof n!=='object')return[];return[n,...all(n.props?.children)];}
function text(n){if(Array.isArray(n))return n.map(text).join('');return n&&typeof n==='object'?text(n.props?.children):n==null?'':String(n);}
function render(){cursor=0;const tree=moduleUnderTest.exports.default({tournoiId:'test',matchId:1});const todo=effects;effects=[];todo.forEach(fn=>fn());return tree;}
function button(tree,label){const n=all(tree).find(n=>n.type==='button'&&text(n)===label);assert.ok(n,label);return n;}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function run(){
 render();await tick();let tree=render();
 assert.ok(calls.every(c=>c.args.p_envoyer===false),'opening a match must never send calls');
 assert.match(text(tree),/BobÀ prévenir sur place/);assert.match(text(tree),/AliceEnvoi possible/);
 const send=button(tree,'Envoyer dans Tourneo').props.onClick;send();send();await tick();tree=render();
 assert.equal(calls.filter(c=>c.args.p_envoyer).length,1,'rapid clicks send only one request');
 assert.match(text(tree),/Déposé dans Tourneo · non marqué comme lu/);
 assert.equal(button(tree,'Envoyer dans Tourneo').props.disabled,true);
 participants=participants.map(p=>p.participant_id==='a'?{...p,statut:'lu'}:p);
 button(tree,'Actualiser l’état').props.onClick();await tick();tree=render();assert.match(text(tree),/Marqué comme lu dans Tourneo/);
 hooks=[];cursor=0;effects=[];calls=[];participants=[{participant_id:'a',nom:'Alice',statut:'disponible'}];dropResponse=true;
 render();await tick();tree=render();button(tree,'Envoyer dans Tourneo').props.onClick();await tick();tree=render();
 assert.match(text(tree),/Envoi non confirmé/);assert.equal(button(tree,'Envoyer dans Tourneo').props.disabled,true);
 button(tree,'Actualiser l’état').props.onClick();await tick();tree=render();
 assert.match(text(tree),/Déposé dans Tourneo/);assert.equal(calls.filter(c=>c.args.p_envoyer).length,1,'lost acknowledgement is recovered by reading, not sending again');
 console.log('Appels UI : consultation sans envoi, profil absent, clics rapides, dépôt/lecture et réponse réseau perdue : OK');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
