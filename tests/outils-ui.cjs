const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
let appelsAuth=0;Object.defineProperty(global,'navigator',{configurable:true,value:{onLine:true}});
let hooks=[],cursor=0,effects=[],timers=[],intervals=[],clock=1000;
const realNow=Date.now;Date.now=()=>clock;
const storage=new Map();global.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
global.window={confirm:()=>true,location:{href:'',search:''},history:{replaceState(){}}};global.document={addEventListener(){},removeEventListener(){}};
const oldTimeout=global.setTimeout,oldInterval=global.setInterval,oldClear=global.clearInterval;
global.setTimeout=fn=>(timers.push(fn),timers.length);global.setInterval=fn=>(intervals.push(fn),intervals.length);global.clearInterval=()=>{};
const react={useSyncExternalStore: (_subscribe,read)=>read(),useMemo:fn=>fn(),useState(initial){const i=cursor++;if(!(i in hooks))hooks[i]=typeof initial==='function'?initial():initial;return[hooks[i],v=>{hooks[i]=typeof v==='function'?v(hooks[i]):v;}];},useRef(initial){const i=cursor++;return hooks[i]||={current:initial};},useEffect(fn,deps){const i=cursor++;if(!hooks[i]||deps.some((d,n)=>d!==hooks[i][n]))effects.push(fn);hooks[i]=deps;}};
const jsx=(type,props)=>({type,props}),cache=new Map();
function load(file){if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;new Function('require','module','exports',js)(id=>{if(id==='react')return react;if(id==='react/jsx-runtime')return{jsx,jsxs:jsx};if(id==='@/lib/supabase')return {supabase:{auth:{async getUser(){appelsAuth++;return{data:{user:null}};}}}};if(id.startsWith('@/components/'))return{default:()=>null};if(id.startsWith('@/'))return load(id.slice(2)+'.ts');return require(id);},m,m.exports);return m.exports;}
function render(Component,props={}){cursor=0;const t=Component(props);const run=effects;effects=[];run.forEach(f=>f());return t;}
function all(n){if(Array.isArray(n))return n.flatMap(all);return n&&typeof n==='object'?[n,...all(n.props?.children)]:[];}
function text(n){return Array.isArray(n)?n.map(text).join(''):n&&typeof n==='object'?text(n.props?.children):n==null?'':String(n);}
function button(t,label){const n=all(t).find(n=>n.type==='button'&&text(n)===label);assert.ok(n,label);return n;}
(async()=>{try{
 const Page=load('app/outils/page.tsx').default;render(Page);await new Promise(resolve=>setImmediate(resolve));let tree=render(Page);
 button(tree,'Démarrer / reprendre').props.onClick();tree=render(Page);clock=11000;intervals.at(-1)();tree=render(Page);
 assert.equal(text(all(tree).find(n=>n.props.role==='timer')),'00:00:10');
 button(tree,'Pause').props.onClick();tree=render(Page);clock=21000;tree=render(Page);assert.equal(text(all(tree).find(n=>n.props.role==='timer')),'00:00:10');
 all(tree).find(n=>n.type==='textarea').props.onChange({target:{value:Array.from({length:21},(_,i)=>`J${i}`).join('\n')}});tree=render(Page);
 button(tree,'Lancer la roulette').props.onClick();button(tree,'Lancer la roulette').props.onClick();assert.equal(timers.length,1,'rapid double clicks cannot run two draws');timers[0]();tree=render(Page);
 await new Promise(resolve=>setImmediate(resolve));const equipes=JSON.parse(storage.get('tourneo-outils-v1')).equipes;assert.deepEqual(equipes.map(e=>e.joueurs.length),[7,7,7]);assert.equal(new Set(equipes.flatMap(e=>e.joueurs)).size,21);
 button(tree,'Créer un tournoi').props.onClick();assert.equal(window.location.href,'/tournoi/nouveau?equipes=tirage');assert.equal(JSON.parse(storage.get('tourneo-tirage-equipes:v1')).equipes.length,3);
 hooks=[];effects=[];const Counter=load('components/CompteurArbitre.tsx').default;let proposed;
 const props={noms:['Bleus','Rouges'],cle:'test:compteur',surCopie:(a,b)=>proposed=[a,b]};render(Counter,props);await new Promise(resolve=>setImmediate(resolve));tree=render(Counter,props);
 all(tree).find(n=>n.props['aria-label']==='+3 pour Bleus').props.onClick();tree=render(Counter,props);all(tree).find(n=>n.props['aria-label']==='+1 pour Rouges').props.onClick();tree=render(Counter,props);
 button(tree,'Annuler le dernier point').props.onClick();tree=render(Counter,props);button(tree,'Reporter dans la proposition').props.onClick();assert.deepEqual(proposed,[3,0]);
 await new Promise(resolve=>setImmediate(resolve));hooks=[];effects=[];render(Counter,props);await new Promise(resolve=>setImmediate(resolve));tree=render(Counter,props);assert.equal(text(all(tree).find(n=>n.props['aria-label']==='Points de Bleus')),'3','counter survives reload');
 hooks=[];effects=[];const Olympia=load('app/olympiades/page.tsx').default;render(Olympia);await new Promise(resolve=>setImmediate(resolve));tree=render(Olympia);
 function champEquipe(t){return all(all(t).find(n=>n.type==='label'&&text(n)==='Nouvelle équipe')).find(n=>n.type==='input');}
 champEquipe(tree).props.onChange({target:{value:'A'}});tree=render(Olympia);button(tree,'Ajouter').props.onClick();tree=render(Olympia);
 assert.match(text(tree),/A/,'the first team can be added on its own');
 champEquipe(tree).props.onChange({target:{value:'B'}});tree=render(Olympia);button(tree,'Ajouter').props.onClick();tree=render(Olympia);
 all(tree).find(n=>n.props.placeholder==='Relais, lancer de précision, quiz…').props.onChange({target:{value:'Quiz'}});tree=render(Olympia);button(tree,'Ajouter l’épreuve').props.onClick();tree=render(Olympia);
 all(tree).find(n=>n.props['aria-label']==='Quiz — A (points)').props.onChange({target:{value:'3'}});tree=render(Olympia);all(tree).find(n=>n.props['aria-label']==='Quiz — B (points)').props.onChange({target:{value:'2'}});tree=render(Olympia);
 assert.equal(button(tree,'Valider cette épreuve').props.disabled,false);button(tree,'Valider cette épreuve').props.onClick();tree=render(Olympia);
 assert.equal(all(tree).find(n=>n.props['aria-label']==='Quiz — A (points)').props.disabled,true);button(tree,'Corriger les résultats').props.onClick();tree=render(Olympia);assert.equal(all(tree).find(n=>n.props['aria-label']==='Quiz — A (points)').props.disabled,false);
 const idOffline='11111111-1111-4111-8111-111111111111';window.location.search=`?id=${idOffline}`;navigator.onLine=false;
 const cacheOffline={version:1,nom:'Hors réseau',equipes:[{id:'A',nom:'Bleus',joueurs:[]},{id:'B',nom:'Rouges',joueurs:[]}],epreuves:[]};
 storage.set(`tourneo-olympiade-locale:v1:${idOffline}`,JSON.stringify({donnees:cacheOffline,revision:4,partage:false,signature:''}));
 const avantAuth=appelsAuth;hooks=[];effects=[];render(Olympia);await new Promise(resolve=>setImmediate(resolve));tree=render(Olympia);
 assert.equal(appelsAuth,avantAuth,'offline recovery does not wait for an unavailable account');assert.ok(all(tree).some(n=>n.type==='input'&&n.props.value==='Hors réseau'));assert.match(text(tree),/Hors connexion/);
 console.log('Outils UI : chrono/pause, double clic roulette, transfert 21/3, annulation de point et compteur persistant : OK');
}finally{Date.now=realNow;global.setTimeout=oldTimeout;global.setInterval=oldInterval;global.clearInterval=oldClear;}})().catch(e=>{console.error(e);process.exitCode=1;});
