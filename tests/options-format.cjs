const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const cache=new Map(),jsx=(type,props)=>({type,props});
function load(file){if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>{
 if(id==='react')return{useState:v=>[v,()=>{}]};if(id==='react/jsx-runtime')return{jsx,jsxs:jsx};if(id==='@/lib/langue')return{tr:v=>v,trModele:v=>v,useLangue(){}};
 if(id.startsWith('@/components/'))return{default:()=>null,ChampAide:()=>null};
 return id.startsWith('@/')?load(id.slice(2)+'.ts'):require(id);
},m,m.exports);return m.exports;}
function nodes(n){if(Array.isArray(n))return n.flatMap(nodes);return n&&typeof n==='object'?[n,...nodes(n.props?.children)]:[];}
const Component=load('components/OptionsTournoiV2.tsx').default,{OPTIONS_V2}=load('lib/options-v2.ts');
for(const format of ['complet','allerRetour','poules','poulesFinale','elimination','doubleElimination','consolante','suisse','rotation'])for(const score of ['points','sets'])for(const setsGagnants of [1,2]){
 const labels=nodes(Component({format,value:{...OPTIONS_V2,mode:'expert',score,setsGagnants},onChange(){}})).map(n=>n.props?.label).filter(Boolean);
 assert.equal(labels.includes('Rondes (suisse / partenaires tournants)'),['suisse','rotation'].includes(format),format+' rounds');
 const classement=!['elimination','doubleElimination','consolante'].includes(format);
 assert.equal(labels.includes('Points de classement : victoire'),classement,format+' points');
 assert.equal(labels.includes('Match nul'),classement&&score==='points',format+' draws');
 assert.equal(labels.includes('Nombre de sets gagnants'),score==='sets');
 assert.equal(labels.includes('Objectif manche décisive (0 = identique)'),score==='sets'&&setsGagnants>1);
 assert.ok(labels.includes('Terrains disponibles')&&labels.includes('Repos minimum (minutes)'));
}
console.log('Options : neuf formats, manches/points, rondes réservées aux formats concernés, barèmes masqués en élimination et manche décisive pertinente : OK');
