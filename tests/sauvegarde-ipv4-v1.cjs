'use strict';
// Controle statique, aucune connexion a la production, aucune donnee utilisateur.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const script = fs.readFileSync('scripts/sauvegarder-v1-ipv4-prive.ps1', 'utf8');
assert.match(script, /gjtxlzhfqcecyfciyllc/);
assert.match(script, /aws-0-eu-west-1\.pooler\.supabase\.com/);
assert.match(script, /New-Object System\.Net\.NetworkCredential/);
assert.match(script, /Read-Host .* -AsSecureString/);
assert.match(script, /Remove-Item Env:PGPASSWORD/);
assert.match(script, /finally\s*\{/);
assert.match(script, /--rm/);
assert.match(script, /-e', 'PGPASSWORD'/);
assert.match(script, /--schema=public/);
assert.match(script, /--schema=auth/);
assert.match(script, /--schema=storage/);
assert.match(script, /--roles-only/);
assert.match(script, /--schema-only/);
assert.match(script, /--data-only/);
assert.match(script, /restaurationValidee\s*=\s*\$false/);
assert.match(script, /mediasBinairesInclus\s*=\s*\$false/);
assert.match(script, /Get-FileHash/);
assert.match(script, /auth';t='users/);
assert.match(script, /auth';t='identities/);
assert.doesNotMatch(script, /--linked|--db-url|db\s+reset|db\s+push|storage\s+rm|git\s+push/i);
assert.doesNotMatch(script, /PGPASSWORD\s*=\s*['"][^$]/);
assert.doesNotMatch(script, /postgresql:\/\//i);
const expected = [
 '01-roles.sql','02-schema-public.sql','03-schema-auth.sql','03-schema-storage.sql',
 '04-data-public.sql','05-data-auth.sql','06-data-storage.sql'
];
for (const file of expected) assert.ok(script.includes(file), 'Export manquant: '+file);
assert.match(script, /Test-Path -LiteralPath \$dossier/,'Refus de remplacer une archive existante');
console.log('Sauvegarde IPv4 V1 : controles statiques de confidentialite et de lecture seule OK');
