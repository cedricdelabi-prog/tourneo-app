const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const root = 'http://127.0.0.1:3215';
const api = 'https://kmjfmjhdnokkaiolxiin.supabase.co';

(async () => {
  let browser;
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3215'], {
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: api, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Server startup timeout')), 45000);
      server.stdout.on('data', d => { if (String(d).includes('Ready')) { clearTimeout(timer); resolve(); } });
      server.on('exit', code => { clearTimeout(timer); reject(Error('Server exit ' + code)); });
    });
    browser = await chromium.launch({ args: ['--no-sandbox'] });
    for (const width of [320, 390]) {
      const ctx = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, locale: 'fr-FR' });
      let active = false, indisponible = false, demandes = [];
      await ctx.route(api + '/**', async route => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith('/settings')) {
          return route.fulfill({ status: indisponible ? 503 : 200, contentType: 'application/json', body: JSON.stringify({ external: { google: active } }) });
        }
        if (url.pathname.endsWith('/authorize')) {
          demandes.push(url);
          return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<h1>Autorisation Google simulée</h1>' });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      });
      const page = await ctx.newPage(), erreurs = [];
      page.on('pageerror', e => erreurs.push(e.message));
      const google = page.getByRole('button', { name: 'Continuer avec Google', exact: false });
      await page.goto(root + '/login');
      await page.getByText('La connexion Google est indisponible sur la V2 pour le moment. La connexion par e-mail reste disponible.', { exact: true }).waitFor();
      assert.ok(await google.isDisabled());
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'login fits mobile');
      await page.screenshot({ path: `tests/screenshots/connexion-${width}.png`, fullPage: true });
      active = true;
      await page.reload();
      await google.waitFor();
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Continuer avec Google') && !b.disabled));
      await google.click();
      await page.getByRole('heading', { name: 'Autorisation Google simulée', exact: true }).waitFor();
      assert.equal(demandes.length, 1);
      assert.equal(demandes[0].searchParams.get('provider'), 'google');
      assert.equal(demandes[0].searchParams.get('redirect_to'), root + '/dashboard');
      const retour = '/partage/fa200000-0000-4000-8000-000000000001/pronostics';
      await page.goto(root + '/login?retour=' + encodeURIComponent(retour));
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Continuer avec Google') && !b.disabled));
      await google.click();
      await page.getByRole('heading', { name: 'Autorisation Google simulée', exact: true }).waitFor();
      assert.equal(demandes[1].searchParams.get('redirect_to'), root + retour);
      indisponible = true;
      await page.goto(root + '/login');
      await page.getByText('La connexion Google est indisponible sur la V2 pour le moment. La connexion par e-mail reste disponible.', { exact: true }).waitFor();
      assert.ok(await google.isDisabled());
      assert.deepEqual(erreurs, []);
      await ctx.close();
      console.log(`Connexion ${width}px : écran sans débordement, Google inactif/actif, erreur réseau, départ OAuth et retour pronostics : OK (API simulée, sans connexion Google réelle)`);
    }
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
