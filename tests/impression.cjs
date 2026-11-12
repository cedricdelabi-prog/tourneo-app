// Test print preparation from an offline tournament cache, without Auth or a browser.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
let hooks = [], cursor = 0, started = false, effects = [];
const react = {useSyncExternalStore: (_subscribe,read)=>read(),
  useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = initial; return [hooks[i], next => { hooks[i] = typeof next === 'function' ? next(hooks[i]) : next; }]; },
  useEffect(callback) { if (!started) effects.push(callback); },
};
const jsx = (type, props) => ({ type, props });
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('require', 'module', 'exports', js)(id => {
    if (id === 'react') return react;
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id === 'next/navigation') return { useParams: () => ({ id: 'offline-test' }) };
    if (id === 'qrcode.react') return { QRCodeSVG: 'qr' };
    if (id.startsWith('@/components/')) return { default: 'retour' };
    if (id === '@/lib/supabase') return { supabase: { auth: { getUser() { throw new Error('Offline cache should not require Auth'); } } } };
    if (id.startsWith('@/')) return load(id.slice(2) + '.ts');
    return require(id);
  }, module, module.exports);
  return module.exports;
}
const participants = ['Alice', 'Bob', 'Charlie', 'Dana'].map((nom, i) => ({ id: String(i), nom, emoji: '', couleur: '', photo: 'private-photo' }));
const { genererMatchs } = load('lib/tournoi.ts');
const matchs = genererMatchs(participants).map(m => ({ ...m, score1: '2', score2: '0' }));
global.window = { location: { origin: 'https://example.test' } };
global.localStorage = { getItem(key) {
  assert.equal(key, 'tourneo-v04:offline-test');
  return JSON.stringify({ tournoiId: 'offline-test', nomTournoi: 'Camping', equipes: participants, matchs, formatTournoi: 'complet', poules: [{ id: 'a', nom: 'Poule A', equipes: participants.slice(0,2) }, { id: 'b', nom: 'Poule B', equipes: participants.slice(2) }] });
} };
const Page = load('app/tournoi/[id]/imprimer/page.tsx').default;
function render() { cursor = 0; const tree = Page(); const pending = effects; effects = []; started = true; pending.forEach(fn => fn()); return tree; }
function all(n) { if (Array.isArray(n)) return n.flatMap(all); if (!n || typeof n !== 'object') return []; return [n, ...all(n.props?.children)]; }
function text(n) { if (Array.isArray(n)) return n.map(text).join(''); if (n && typeof n === 'object') return text(n.props?.children); return n == null ? '' : String(n); }
function check(tree, label, value) { const n = all(tree).find(n => n.type === 'label' && text(n) === label); assert.ok(n, label); all(n).find(n => n.type === 'input').props.onChange({ target: { checked: value } }); }
render();
let tree = render();
assert.match(text(tree), /Camping/);
assert.equal(all(tree).filter(n => n.type === 'tbody')[0].props.children.length, 6, 'four players produce six score rows offline');
check(tree, 'Scores vierges pour la saisie papier', true);
tree = render();
assert.match(text(tree), /___ – ___/);
assert.equal(all(tree).filter(n => n.type === 'tbody')[1].props.children.length, 4, 'blank score sheets retain the independent ranking');
check(tree, 'Participants et pointage', true);
tree = render();
assert.equal(all(tree).filter(n => n.type === 'tbody').length, 3);
const selects = all(tree).filter(n => n.type === 'select');
selects[0].props.onChange({ target: { value: 'A3' } });
selects[1].props.onChange({ target: { value: 'landscape' } });
tree = render();
assert.match(text(all(tree).find(n => n.type === 'style')), /size: A3 landscape/);
assert.ok(!JSON.stringify(tree).includes('private-photo'), 'paper never includes participant photos');
check(tree, 'Poules et classements par poule', true);
check(tree, 'Tableaux par tour et branche', true);
check(tree, 'QR par match (128 rencontres maximum par impression)', true);
tree = render();
assert.match(text(tree), /Poule A/); assert.match(text(tree), /Poule B/);
assert.ok(all(tree).some(n => n.type === 'qr' && n.props.value.endsWith('#match-1')), 'match QR opens its public anchor');
all(tree).filter(n => n.type === 'select')[2].props.onChange({ target: { value: '1' } });
tree = render();
assert.equal(all(tree).filter(n => n.type === 'tbody')[0].props.children.length, 4, 'participant list remains complete');
assert.equal(all(tree).filter(n => n.type === 'tbody')[1].props.children.length, 2, 'round filter limits printed matches');
check(tree, 'Poules et classements par poule', false);
check(tree, 'Tableaux par tour et branche', false);
for (const label of ['Participants et pointage', 'Planning et feuilles de scores', 'Classement']) check(tree, label, false);
tree = render();
assert.equal(all(tree).find(n => n.type === 'button').props.disabled, true, 'cannot print without a selected section');
console.log('Impression : cache local, six rencontres, poules, tableaux, QR match, filtre par tour, A3 et absence de photos : OK');
