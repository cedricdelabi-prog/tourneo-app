const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const modules = new Map();
function load(file) {
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} }; modules.set(file, module);
  const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('require', 'module', 'exports', js)(id => id.startsWith('@/') ? load(id.slice(2) + '.ts') : require(id), module, module.exports);
  return module.exports;
}
const { passagesJoueur, notifierPassage } = load('lib/suivi-matchs.ts');
const { planifierMatchs, joueursDuMatch } = load('lib/planning.ts');
const options = { terrains: 2, duree: 10, repos: 5 };
const a = { id: 1, journee: 1, equipe1Id: 'a', equipe2Id: 'b', joueurs1Ids: [], joueurs2Ids: [], score1: '', score2: '' };
const b = { ...a, id: 2, equipe2Id: 'c' };
assert.deepEqual(joueursDuMatch(a), ['a', 'b']);
const planning = planifierMatchs([a, b], options);
assert.equal(planning[1].debut, 15, 'empty arrays from public projection still enforce player rest across courts');
let passages = passagesJoueur('a', [a, b], options, []);
assert.equal(passages[0].statut, 'prochain'); assert.equal(passages[1].avant, 1);
assert.equal(passages[1].statut, 'attente');
passages = passagesJoueur('a', [{ ...a, score1: '2', score2: '0' }, b], options, []);
assert.equal(passages[0].statut, 'validation'); assert.equal(passages[1].statut, 'attente');
passages = passagesJoueur('a', [{ ...a, score1: '2', score2: '0' }, b], options, [1]);
assert.equal(passages.length, 1); assert.equal(passages[0].match.id, 2); assert.equal(passages[0].statut, 'prochain');
assert.deepEqual(passagesJoueur('exempt', [a], options, []), []);
assert.equal(passagesJoueur('a', [{ ...a, ordre: 2 }, { ...b, ordre: 1 }], options, [])[0].match.id, 2, 'manual order preserved');
assert.deepEqual(joueursDuMatch({ ...a, equipe1Id: 'duo:a|b', equipe2Id: 'duo:c|d' }), ['a', 'b', 'c', 'd']);
assert.equal(passagesJoueur('d', [{ ...a, equipe1Id: 'duo:a|b', equipe2Id: 'duo:c|d' }], options, []).length, 1);
async function run() {
  const notifications = [];
  global.window = {};
  global.Notification = class { static permission = 'denied'; constructor() { throw new Error('Must prefer service worker'); } };
  window.Notification = Notification;
  Object.defineProperty(global, 'navigator', { configurable: true, value: { serviceWorker: { async getRegistration() { return { active: {}, async showNotification(title, value) { notifications.push({ title, ...value }); } }; } } } });
  assert.equal(await notifierPassage('t', 2, 'Terrain 2'), false);
  Notification.permission = 'granted';
  assert.equal(await notifierPassage('t', 2, 'Terrain 2'), true);
  assert.equal(notifications[0].data.url, '/partage/t#match-2');
  assert.equal(notifications.length, 1);
  navigator.serviceWorker.getRegistration = async () => { throw new Error('Not supported'); };
  assert.equal(await notifierPassage('t', 2, 'Terrain 2'), false, 'mobile permission or API failures stay non-fatal');
  const handlers = {}, opened = [], origin = 'https://example.test';
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/sw-v2.js'), 'utf8'), { URL, self: {
    location: { origin }, addEventListener(name, fn) { handlers[name] = fn; },
    clients: { async matchAll() { return []; }, async openWindow(url) { opened.push(url); } },
  } });
  async function click(url) { let pending; handlers.notificationclick({ notification: { data: { url }, close() {} }, waitUntil(value) { pending = value; } }); await pending; }
  await click('https://outside.test/partage/t#match-2'); await click('/profil#match-2');
  assert.equal(opened.length, 0, 'notification clicks cannot navigate outside the match viewer');
  await click('/partage/t#match-2'); assert.deepEqual(opened, [origin + '/partage/t#match-2']);
  console.log('Suivi : repos public, ordre manuel, attente de validation, rotations, notifications mobiles et liens de retour : OK');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
