const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const equipes = [{ id: alice, nom: 'Alice', emoji: '', couleur: '' }, { id: bob, nom: 'Bob', emoji: '', couleur: '' }];
const matchs = [{ id: 1, journee: 1, equipe1Id: alice, equipe2Id: bob, score1:'', score2:'' }];
let hooks = [], cursor = 0, effects = [], rpcCalls = [], lookupError = false, copied = '';
const react = {
  Fragment: 'fragment',
  useState(initial) { const i=cursor++; if (!(i in hooks)) hooks[i]=initial; return [hooks[i],v=>{ hooks[i]=typeof v==='function'?v(hooks[i]):v; }]; },
  useRef(initial) { const i=cursor++; return hooks[i] ||= {current:initial}; },
  useEffect(fn,deps) { const i=cursor++; if (!hooks[i] || deps.some((d,n)=>d!==hooks[i][n])) effects.push(fn); hooks[i]=deps; },
};
const jsx = (type,props)=>({type,props});
const supabase={rpc(name,args){rpcCalls.push({name,args});return{async select(){return {data:[{id:alice}],error:lookupError?new Error('offline'):null};}};}};
const cache=new Map();
function load(file){
  if(cache.has(file))return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const js=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
  new Function('require','module','exports',js)(id=>{
    if(id==='react')return react;
    if(id==='react/jsx-runtime')return {jsx,jsxs:jsx};
    if(id==='@/lib/supabase')return {supabase};
    if(id.startsWith('@/components/'))return {default:()=>null};
    if(id.startsWith('@/'))return load(id.slice(2)+'.ts');
    return require(id);
  },module,module.exports);return module.exports;
}
const Page=load('components/PlanningTournoi.tsx').default;
const {reperesAppel}=load('lib/reperes-appel.ts');
const {OPTIONS_V2}=load('lib/options-v2.ts');
Object.defineProperty(global,'navigator',{configurable:true,value:{clipboard:{async writeText(value){copied=value;}}}});
function render(){cursor=0;const tree=Page({equipes,matchs,options:OPTIONS_V2,onChange(){}});const callbacks=effects;effects=[];callbacks.forEach(fn=>fn());return tree;}
function all(n){if(Array.isArray(n))return n.flatMap(all);if(!n||typeof n!=='object')return[];return[n,...all(n.props?.children)];}
function text(n){if(Array.isArray(n))return n.map(text).join('');return n&&typeof n==='object'?text(n.props?.children):n==null?'':String(n);}
function bouton(tree,label){const found=all(tree).find(n=>n.type==='button'&&text(n)===label);assert.ok(found,label);return found;}
async function run(){
  let tree=render();assert.match(text(tree),/Profil non vérifié/);
  await new Promise(resolve=>setImmediate(resolve));tree=render();
  const marqueurs=all(tree).filter(n=>n.type==='span'&&n.props.className?.includes('tourneo-player-marker'));
  assert.ok(marqueurs.some(n=>text(n)==='Alice · Profil lié'));
  assert.ok(marqueurs.some(n=>text(n)==='Bob · Sans profil lié'),'manual UUIDs are not assumed to be app accounts');
  bouton(tree,'Annonce sur place').props.onClick({ currentTarget: { focus() {} } });tree=render();
  assert.match(text(tree),/Cette annonce et sa copie n’envoient aucune notification/);
  await bouton(tree,'Copier l’annonce').props.onClick();tree=render();
  assert.match(copied,/terrain 1 : Alice contre Bob/);
  assert.ok(rpcCalls.every(c=>c.name==='tourneo_profils_publics'),'preparing or copying an announcement must not pretend to send notifications');
  lookupError=true;bouton(tree,'Vérifier les profils liés').props.onClick();render();await new Promise(resolve=>setImmediate(resolve));tree=render();
  assert.equal(all(tree).filter(n=>n.type==='span'&&n.props.className?.includes('tourneo-player-marker')).every(n=>text(n).includes('non vérifié')),true,'failed verification never labels an account as unreachable or reachable');
  const rotation={...matchs[0],equipe1Id:`duo:${alice}|${bob}`,equipe2Id:'duo:c|d',joueurs1Ids:[alice,bob],joueurs2Ids:['c','d']};
  assert.equal(reperesAppel(rotation,[...equipes,{id:'c',nom:'C',profilId:alice},{id:'d',nom:'D'}],new Set([alice])).filter(r=>r.statut==='profil').length,2);
  console.log('Annonces : profils vérifiés, UUID sans compte, erreur réseau, doubles tournants et aucune fausse confirmation d’envoi : OK');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
