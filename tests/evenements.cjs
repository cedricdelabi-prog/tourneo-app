const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
let hooks = [], cursor = 0, started = false, effects = [];
const react = {
  useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = initial; return [hooks[i], next => { hooks[i] = typeof next === 'function' ? next(hooks[i]) : next; }]; },
  useRef(initial) { const i = cursor++; return hooks[i] ||= { current: initial }; },
  useMemo(fn) { return fn(); }, useEffect(fn) { if (!started) effects.push(fn); },
};
const jsx = (type, props) => ({ type, props });
const participants = ['Alice','Bob'].map((nom,i) => ({ id: String(i), profilId: String(i), nom, emoji: '', couleur: '' }));
const tournoi = (id, nom, depart) => ({ id, nom, sport: 'Tennis', donnees: { equipes: participants, matchs: [{ id: 1, journee: 1, equipe1Id: '0', equipe2Id: '1', score1:'2', score2:'0' }], matchsValides: [1], formatTournoi: 'complet', optionsV2: { depart, duree: 15 } } });
const data = {
  tourneo_evenements: [{ id: 'event', nom: 'Camping Été' }],
  tournois: [tournoi('late', 'Après-midi', '2026-11-12T15:00'), tournoi('other', 'Hors programme', ''), tournoi('early', 'Matin', '2026-11-12T09:00')],
  tourneo_evenement_tournois: [{ evenement_id: 'event', tournoi_id: 'late' }, { evenement_id: 'event', tournoi_id: 'early' }],
};
const supabase = { auth: { async getUser() { return { data: { user: { id: 'owner' } } }; } }, from(table) {
  return { select() { return this; }, eq() { return this; }, order() { return this; }, then(resolve) { return Promise.resolve({ data: data[table], error: null }).then(resolve); } };
} };
const modules = new Map();
function load(file) {
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} }; modules.set(file, module);
  const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('require','module','exports',js)(id => {
    if (id === 'react') return react;
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id === '@/lib/supabase') return { supabase };
    if (id.startsWith('@/components/')) return {};
    if (id.startsWith('@/')) return load(id.slice(2) + '.ts');
    return require(id);
  },module,module.exports); return module.exports;
}
function all(n) { if (Array.isArray(n)) return n.flatMap(all); if (!n || typeof n !== 'object') return []; return [n,...all(n.props?.children)]; }
function text(n) { if (Array.isArray(n)) return n.map(text).join(''); return n && typeof n === 'object' ? text(n.props?.children) : n == null ? '' : String(n); }
const Page = load('app/evenements/page.tsx').default;
function render() { cursor = 0; const tree = Page(); const pending = effects; effects=[]; started=true; pending.forEach(fn=>fn()); return tree; }
async function run() {
  render(); await new Promise(resolve=>setImmediate(resolve));
  const tree = render();
  const print = all(tree).filter(n=>n.type==='section'&&n.props.className==='v2-card');
  const programme = text(print[0]);
  assert.match(programme,/Camping Été/); assert.match(programme,/Matin/); assert.match(programme,/Après-midi/);
  assert.ok(!programme.includes('Hors programme'), 'unselected tournaments never appear in the printed programme');
  assert.ok(programme.indexOf('Matin')<programme.indexOf('Après-midi'), 'programme follows scheduled start times');
  assert.match(programme,/15 min estimées/);
  const classement = text(print[1]); assert.match(classement,/200 points/); assert.match(classement,/140 points/);
  assert.match(text(all(tree).find(n=>n.type==='style')),/v2-event-editor.*display:none/);
  console.log('Événements : programme sélectionné, ordre horaire, durées et classement multi-tournois : OK');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
