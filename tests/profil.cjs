// Exercise the actual profile event handlers with delayed browser/network APIs.
// This is not a browser/Auth integration test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const profile = { id: 'player', display_name: 'Alice', player_code: 'TRN-TEST', avatar_url: 'new-avatar' };
let hooks = [], cursor = 0, updates = [], uploads = [], encode, rejectSave = false;
const react = {useSyncExternalStore: (_subscribe,read)=>read(),
  useEffect() {},
  useState(initial) {
    const i = cursor++;
    if (!(i in hooks)) hooks[i] = initial === null ? profile : initial === true ? false : initial;
    return [hooks[i], value => { hooks[i] = typeof value === 'function' ? value(hooks[i]) : value; }];
  },
  useRef(initial) { const i = cursor++; return hooks[i] ||= { current: initial }; },
};
const jsx = (type, props) => ({ type, props });
const query = {
  update(value) { updates.push(value); return this; }, eq() { return this; }, select() { return this; },
  async single() { if (rejectSave) throw new Error('Network unavailable'); return { data: profile, error: null }; },
};
const supabase = { from: () => query, storage: { from: () => ({
  async upload(name) { uploads.push(name); return { error: null }; },
}) } };
const moduleUnderTest = { exports: {} };
const source = fs.readFileSync(path.join(__dirname, '../app/profil/page.tsx'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
new Function('require', 'module', 'exports', js)(id => {
  if (id === '@/lib/langue') return {useLangue:()=> 'fr',tr:v=>v,trModele:(s,...vs)=>vs.reduce((r,v,i)=>r.replaceAll('{'+i+'}',String(v)),s)};
  if (id === 'react') return react;
  if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
  if (id === '@/lib/supabase') return { supabase };
  if (id === '@/lib/media-prive') return { referencePhoto: value => `media-prive:${value}` };
  return {};
}, moduleUnderTest, moduleUnderTest.exports);
global.window = { location: { origin: 'https://example.test' } };
global.document = { createElement: () => ({ getContext: () => ({ fillText() {} }), toBlob(callback) { encode = callback; } }) };
function render() { cursor = 0; return moduleUnderTest.exports.default(); }
function all(node) {
  if (Array.isArray(node)) return node.flatMap(all);
  if (!node || typeof node !== 'object') return [];
  return [node, ...all(node.props?.children)];
}
function button(tree, label) { return all(tree).find(n => n.type === 'button' && (n.props['aria-label'] === label || n.props.children === label)); }
function reset() { hooks = []; cursor = 0; updates = []; uploads = []; rejectSave = false; }
async function tick() { await new Promise(resolve => setImmediate(resolve)); }
async function run() {
  let tree = render();
  const first = button(tree, 'Choisir : Sourire').props.onClick;
  first(); first();
  assert.equal(uploads.length, 0, 'encoding is still pending');
  tree = render();
  assert.equal(button(tree, 'Choisir : Sourire').props.disabled, true, 'feedback starts before encoding');
  encode(new Blob(['emoji'], { type: 'image/png' }));
  await tick();
  assert.equal(uploads.length, 1, 'rapid clicks must produce only one upload');
  assert.equal(updates.length, 1);
  assert.equal(button(render(), 'Choisir : Sourire').props.disabled, false);

  reset(); tree = render();
  button(tree, 'Choisir : Sourire').props.onClick();
  encode(null); await tick();
  assert.equal(button(render(), 'Choisir : Sourire').props.disabled, false, 'encoding failure releases controls');
  assert.equal(uploads.length, 0);

  reset(); tree = render();
  all(tree).find(n => n.type === 'input' && n.props.placeholder === 'Ex. JeanD').props.onChange({ target: { value: 'Alice' } });
  tree = render(); rejectSave = true;
  const save = button(tree, 'Enregistrer mon profil').props.onClick;
  await Promise.all([save(), save()]);
  assert.equal(updates.length, 1, 'rapid save clicks must produce one update');
  assert.equal('avatar_url' in updates[0], false, 'identity edits cannot overwrite a newer avatar from another tab');
  tree = render();
  assert.equal(button(tree, 'Enregistrer mon profil').props.disabled, false, 'network failure releases the save button');
  rejectSave = false;
  await button(tree, 'Enregistrer mon profil').props.onClick();
  assert.equal(updates.length, 2, 'retry after network failure succeeds');
  console.log('Profil : clics concurrents, préparation emoji, échec réseau, nouvelle tentative et avatar récent : OK');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
