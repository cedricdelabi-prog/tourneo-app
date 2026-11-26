'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {evaluerBascule,PREUVES,MANIFEST}=require('../scripts/controle-bascule-v2.cjs');
const m=JSON.parse(fs.readFileSync(MANIFEST,'utf8'));
const controle=m.controleLectureSeule;
assert.match(m.dateControle,/^\d{4}-\d{2}-\d{2}$/,'release inventory must have a valid date format');
assert.equal(controle?.date,m.dateControle,'read-only inventory and preflight manifest must refer to the same check date');
assert.equal(m.branchePreparation,'tourneo-v2-dev','release work must stay on dedicated V2 branch');
assert.equal(controle.production.comptes,m.inventaireV1.comptes);
assert.equal(controle.production.tournois,m.inventaireV1.tournois);
assert.equal(controle.production.profils,m.inventaireV1.profils);
assert.equal(controle.production.identitesAuth,m.inventaireV1.identitesAuth);
assert.equal(controle.production.objetsStorage,m.inventaireV1.objetsStorage);
assert.equal(controle.production.liensManquants,m.inventaireV1.partageManquants);
assert.equal(controle.production.liensDupliques,m.inventaireV1.partageDupliques);
assert.equal(controle.essaiV2.comptesSansProfil,1,'test environment has one profile to recreate');
assert.equal(controle.partageV1.accessibleAnonyme,false,'legacy public API must not remain callable by anon');
assert.equal(controle.partageV1.accessibleAuthenticated,false,'legacy public API must not remain callable by authenticated');
assert.equal(controle.verificationLiensPublicsHTTP.reponsesOKNouvelleAdresse,25);
assert.equal(controle.verificationLiensPublicsHTTP.reponsesOKAncienneAdresse,25);
assert.equal(m.preuves.urlsPartageHistoriquesVerifiees.statut,'valide','all 25 historical links are checked over HTTPS');
assert.equal(controle.partageV1.projectionDonneesJsonBrutes,true,'legacy unsanitized JSON must be hardened at cutover');
assert.equal(m.preuves.inventaireProductionActualise.statut,'a_faire','read-only counts are not proof of restorable backup');
assert.equal(m.preuves.droitsRlsEtFonctionsVerifies.statut,'a_faire','legacy function remains unprotected');
const report=evaluerBascule(m);
assert.equal(report.pret,false,'No production launch while backups and restore tests are missing');
assert.equal(report.comptes,m.inventaireV1.comptes);assert.equal(report.tournois,m.inventaireV1.tournois);
assert.equal(m.inventaireV1.tournois,25,'Most recent observed inventory');
assert.equal(m.inventaireV1.objetsStorage,1,'Backup must include the media object in production');
assert.equal(controle.controleCompatibilitePartage.liensParIdReconnusV2,25);
assert.equal(controle.controleCompatibilitePartage.aliasSecondairesReconnusV2,25);
assert.ok(report.blocages.some(s=>s.includes('Inventaire de production V1 récent')));
assert.ok(report.blocages.some(s=>s.includes('Sauvegarde complète')));
assert.equal(m.preuves.accordExpliciteMiseEnProduction.statut,'valide','user expressly authorized the full release');
assert.ok(!report.blocages.some(s=>s.includes('Accord final explicite')),'authorization is no longer a blocker');
assert.equal(report.blocages.length,PREUVES.length-2,'All technical gates must remain blocking despite user authorization');
const clone=x=>JSON.parse(JSON.stringify(x));
const invalidOwner=clone(m);invalidOwner.inventaireV1.tournoisOrphelins=1;
assert.ok(evaluerBascule(invalidOwner).blocages.some(s=>s.includes('Tournois sans propriétaire')));
const wrongTarget=clone(m);wrongTarget.cibleDeMigration='kmjfmjhdnokkaiolxiin';
assert.ok(evaluerBascule(wrongTarget).blocages.some(s=>s.includes('Cible incohérente')));
const noAccounts=clone(m);noAccounts.inventaireV1.comptes=0;
assert.ok(evaluerBascule(noAccounts).blocages.some(s=>s.includes('comptes/profils')));
const shortcut=clone(m);shortcut.preuves.sauvegardeRestaurableComplete={statut:'valide',preuve:''};
assert.ok(evaluerBascule(shortcut).blocages.some(s=>s.includes('Sauvegarde complète')),'Evidence cannot be a bare boolean');
const finished=clone(m);
for(const [cle] of PREUVES)finished.preuves[cle]={statut:'valide',preuve:'Dossier de contrôle signé et archivé'};
assert.equal(evaluerBascule(finished).pret,true,'A fully documented checklist can be reviewed manually');
const stale=clone(finished);stale.preuves.inventaireProductionActualise={statut:'a_faire',preuve:''};
assert.equal(evaluerBascule(stale).pret,false,'Outdated counts cannot authorize release');
const src=fs.readFileSync(path.join(__dirname,'../lib/supabase.ts'),'utf8');
assert.match(src,/NEXT_PUBLIC_TOURNEO_V2_PRODUCTION_APPROVED/);
assert.match(src,/productionApproved/);
assert.match(src,/kmjfmjhdnokkaiolxiin/);
assert.match(src,/gjtxlzhfqcecyfciyllc/);
const sql=fs.readFileSync(path.join(__dirname,'../docs/sql/preflight_v1_v2.sql'),'utf8');
assert.ok(!/\b(?:drop|truncate|delete|update|insert|alter)\s+(?:table|from|into|public\.)/i.test(sql),'Production preflight must remain read-only');
// Le diagnostic d'ecart ne doit jamais modifier la base de production.
const ecarts=fs.readFileSync(path.join(__dirname,'../docs/sql/verifier_ecarts_v2_20261126.sql'),'utf8');
assert.match(ecarts,/information_schema\.columns/,'missing column inventory must be checked');
assert.match(ecarts,/pg_proc/,'missing function inventory must be checked');
assert.match(ecarts,/to_regclass/,'missing table inventory must be checked');
assert.match(ecarts,/tourneo_android_appareils/);
assert.match(ecarts,/notifications_android/);
assert.match(ecarts,/tourneo_worker_prendre/);
assert.doesNotMatch(ecarts,/^\s*(?:insert\s+into|update\s+\S+\s+set|delete\s+from|truncate\s+|drop\s+|alter\s+|create\s+(?:table|function|policy|view|trigger))\b/im,
  'The read-only inventory must contain no SQL mutations');
// L'inventaire de securite des RPC de partage doit rester strictement consultatif.
const auditPartage=fs.readFileSync(path.join(__dirname,'../docs/sql/audit_rpc_partage_v1_v2_readonly.sql'),'utf8');
assert.match(auditPartage,/has_function_privilege/);
assert.match(auditPartage,/pg_get_function_identity_arguments/);
assert.match(auditPartage,/tourneo_public_v2/);
assert.match(auditPartage,/tourneo_partage_web_v2/);
assert.match(auditPartage,/tourneo_pronostics_lecture/);
assert.doesNotMatch(auditPartage,/^\\s*(?:insert\\s+into|update\\s+\\S+\\s+set|delete\\s+from|truncate\\s+|drop\\s+|alter\\s+|create\\s+(?:table|function|policy|view|trigger))\\b/im,
  'Audit RPC must not include SQL mutations');
// Comparaison des empreintes de sauvegarde : controles purement read-only.
const empreintes=fs.readFileSync(path.join(__dirname,'../docs/sql/empreintes_restauration_v1_readonly.sql'),'utf8');
for(const table of ['auth.users','auth.identities','public.profiles','public.tournois','storage.objects'])
 assert.ok(empreintes.includes(table),'Empreinte manquante pour '+table);
assert.match(empreintes,/string_agg/);
assert.match(empreintes,/md5/);
assert.match(empreintes,/to_jsonb\(t\)->>'partage_id'/);
assert.doesNotMatch(empreintes,/^\s*(?:insert\s+into|update\s+\S+\s+set|delete\s+from|truncate\s+|drop\s+|alter\s+|create\s+(?:table|function|policy|view|trigger))\b/im,
 'Le script des empreintes ne doit pas modifier la base');
const authTriggerStage=fs.readFileSync(path.join(__dirname,'../docs/sql/auth_v1_trigger_compatible_v2_staging.sql'),'utf8');
assert.match(authTriggerStage,/current_setting\('tourneo\.v1_copy_verified'/);
assert.match(authTriggerStage,/STAGING STOP/);
const draft=fs.readFileSync(path.join(__dirname,'../docs/sql/compatibilite_v1_v2_staging_DRAFT.sql'),'utf8');
assert.match(draft,/STAGING COPY/);
assert.match(draft,/current_setting\('tourneo\.v1_copy_verified'/);
assert.ok(!/drop\s+(?:table|column)/i.test(draft),'Staging compatibility cannot remove legacy columns');
assert.match(draft,/partage_id/);
const phase2=fs.readFileSync(path.join(__dirname,'../docs/sql/compatibilite_v1_v2_staging_PHASE2_SOCLE.sql'),'utf8');
assert.match(phase2,/tourneo\.v1_copy_verified/,'phase 2 needs staging opt-in');
assert.match(phase2,/on_auth_user_created_tourneo/,'V1 signup trigger must stay intact');
assert.match(phase2,/create table public\.player_results/i);
assert.match(phase2,/create policy results_owner_insert/i);
assert.match(phase2,/create policy media_owner_insert/i);
assert.ok(!/drop\s+(?:table|column)/i.test(phase2),'phase 2 must not drop V1 data');
const phase3=fs.readFileSync(path.join(__dirname,'../docs/sql/compatibilite_v1_v2_staging_PHASE3_APPLICATIF.sql'),'utf8');
assert.match(phase3,/tourneo\.v1_copy_verified/,'phase 3 must be staging-only');
assert.match(phase3,/create table if not exists public\.tourneo_inscriptions/i);
assert.match(phase3,/create table if not exists public\.tourneo_evenements/i);
assert.match(phase3,/create table if not exists public\.tourneo_arbitres/i);
assert.doesNotMatch(phase3,/create or replace function public\.tourneo_public_v2\s*\(/i);
assert.ok(!/drop\s+(?:table|column)/i.test(phase3),'cannot delete legacy data');
const phase4=fs.readFileSync(path.join(__dirname,'../docs/sql/compatibilite_v1_v2_staging_PHASE4_NOTIFICATIONS.sql'),'utf8');
assert.match(phase4,/tourneo\.v1_copy_verified/);
assert.match(phase4,/create table public\.tourneo_notifications\s*\(/i);
assert.match(phase4,/create table public\.tourneo_preferences\s*\(/i);
assert.match(phase4,/create table public\.tourneo_evaluations\s*\(/i);
assert.match(phase4,/create trigger notification_inscription/i);
assert.doesNotMatch(phase4,/create or replace function public\.tourneo_public_v2\s*\(/i);
assert.ok(!/drop\s+(?:table|column)/i.test(phase4));
const phase5=fs.readFileSync(path.join(__dirname,'../docs/sql/compatibilite_v1_v2_staging_PHASE5_PARTAGES.sql'),'utf8');
assert.match(phase5,/tourneo\.v1_copy_verified/);
assert.match(phase5,/tourneo_public_compat_v2/);
assert.match(phase5,/est_public is true/);
assert.match(phase5,/tourneo_private\.reference_publique/);
assert.ok(!/drop\s+(?:table|column)/i.test(phase5));
const phase6=fs.readFileSync(path.join(__dirname,'../docs/sql/compatibilite_v1_v2_staging_PHASE6_GROUPES_LANGUES.sql'),'utf8');
assert.match(phase6,/tourneo\.v1_copy_verified/);
assert.match(phase6,/create table public\.tourneo_groupes\s*\(/i);
assert.match(phase6,/create table public\.tourneo_groupe_membres\s*\(/i);
assert.match(phase6,/create table public\.tourneo_groupe_participants\s*\(/i);
assert.match(phase6,/langue in \('fr','en','nl','de'\)/);
assert.match(phase6,/revoke select on public\.player_results from anon/);
assert.doesNotMatch(phase6,/create or replace function public\.tourneo_public_v2\s*\(/i);
assert.ok(!/drop\s+(?:table|column)/i.test(phase6),'phase 6 must keep V1 data untouched');
const phase7=fs.readFileSync(path.join(__dirname,'../docs/sql/compatibilite_v1_v2_staging_PHASE7_PROFILS.sql'),'utf8');
assert.match(phase7,/tourneo\.v1_copy_verified/);
assert.match(phase7,/create function public\.tourneo_profils_publics\s*\(/i);
assert.match(phase7,/auth\.uid\(\) is not null/);
assert.match(phase7,/grant execute on function public\.tourneo_profils_publics\(text,uuid\[\]\) to authenticated/);
assert.doesNotMatch(phase7,/grant execute on function public\.tourneo_profils_publics.*to anon/i);
const phase8=fs.readFileSync(path.join(__dirname,'../docs/sql/compatibilite_v1_v2_staging_PHASE8_TENNIS.sql'),'utf8');
assert.match(phase8,/tourneo\.v1_copy_verified/);
assert.match(phase8,/tourneo_proposer_manches/);
assert.doesNotMatch(phase8,/create or replace function public\.tourneo_public_v2\s*\(/i);
assert.ok(!/drop\s+(?:table|column)/i.test(phase8));
const phase9=fs.readFileSync(path.join(__dirname,'../docs/sql/compatibilite_v1_v2_staging_PHASE9_OLYMPIADES.sql'),'utf8');
assert.match(phase9,/tourneo\.v1_copy_verified/);
assert.match(phase9,/create table public\.tourneo_olympiades\s*\(/i);
assert.match(phase9,/create trigger revision_tournoi/i);
assert.match(phase9,/as \$\$ select tourneo_private\.olympiade_publique\(p_id\); \$\$;/,'avoid malformed dollar quoting');
assert.match(phase9,/revoke execute on function tourneo_private\.olympiade_publique\(uuid\) from anon,authenticated/);
assert.doesNotMatch(phase9,/grant usage on schema tourneo_private to anon/i);
assert.ok(!/drop\s+(?:table|column)/i.test(phase9));
const phase10=fs.readFileSync(path.join(__dirname,'../docs/sql/compatibilite_v1_v2_staging_PHASE10_APPELS_AFFICHES.sql'),'utf8');
assert.match(phase10,/tourneo\.v1_copy_verified/);
assert.match(phase10,/create table public\.tourneo_appels\s*\(/i);
assert.match(phase10,/create table public\.tourneo_modeles_affiche\s*\(/i);
assert.match(phase10,/create function public\.tourneo_appel_match\s*\(/i);
assert.match(phase10,/create policy modeles_affiche_proprietaire/i);
assert.doesNotMatch(phase10,/\bdrop\s+(?:table|column)\b/i);
assert.doesNotMatch(phase10,/create or replace function public\.tourneo_public_v2\s*\(/i);
const phase11=fs.readFileSync(path.join(__dirname,'../docs/sql/compatibilite_v1_v2_staging_PHASE11_JOUEURS.sql'),'utf8');
assert.match(phase11,/tourneo\.v1_copy_verified/);
assert.match(phase11,/create function public\.tourneo_mes_participations\(\)/);
assert.match(phase11,/auth\.uid\(\)is null then raise exception/);
assert.match(phase11,/grant execute on function public\.tourneo_mes_participations\(\),tourneo_private\.mes_participations\(\)to authenticated/);
assert.doesNotMatch(phase11,/\bdrop\s+(?:table|column)\b/i);
const phase12=fs.readFileSync(path.join(__dirname,'../docs/sql/compatibilite_v1_v2_staging_PHASE12_ALBUM_PRIVE.sql'),'utf8');
assert.match(phase12,/tourneo\.v1_copy_verified/);
assert.match(phase12,/create table public\.tourneo_album_photos/i);
assert.match(phase12,/alter policy media_owner_insert/i);
assert.match(phase12,/create trigger date_conservation_photos/i);
assert.doesNotMatch(phase12,/alter table public\.tournois add column termine_at/i);
assert.doesNotMatch(phase12,/create function public\.tourneo_album_public/i);
assert.doesNotMatch(phase12,/\bdrop\s+(?:table|column)\b/i);
const phase13=fs.readFileSync(path.join(__dirname,'../docs/sql/compatibilite_v1_v2_staging_PHASE13_ALBUM_PARTAGE.sql'),'utf8');
assert.match(phase13,/tourneo\.v1_copy_verified/);
assert.match(phase13,/create table public\.tourneo_album_config/i);
assert.match(phase13,/create policy album_images_partagees/i);
assert.match(phase13,/p\.apercu_path is not null/);
assert.match(phase13,/storage\.allow_any_operation/);
assert.match(phase13,/language sql stable security definer set search_path='' as \$\$select tourneo_private\.album_public/);
assert.doesNotMatch(phase13,/\bdrop\s+(?:table|column)\b/i);
const phase14=fs.readFileSync(path.join(__dirname,'../docs/sql/compatibilite_v1_v2_staging_PHASE14_PLANNING_PUBLIC.sql'),'utf8');
assert.match(phase14,/tourneo\.v1_copy_verified/);
assert.match(phase14,/t\.id=p_id and t\.est_public is true/i);
assert.match(phase14,/'adaptationPlanning'/);
assert.match(phase14,/tourneo_private\.projection_planning_v2_marqueur/);
assert.match(phase14,/set search_path=''/);
assert.doesNotMatch(phase14,/\bdrop\s+(?:table|column)\b/i);
const phase15=fs.readFileSync(path.join(__dirname,'../docs/sql/compatibilite_v1_v2_staging_PHASE15_EQUIPES_INSCRITES.sql'),'utf8');
assert.match(phase15,/tourneo\.v1_copy_verified/);
assert.match(phase15,/membresOrigine/);
assert.match(phase15,/type_participant='individuel'/);
assert.match(phase15,/security definer set search_path=''/);
assert.match(phase15,/security definer set search_path='' as \$\$\s*declare/,'PL/pgSQL dollar quoting must remain valid');
assert.match(phase15,/tourneo_private\.equipes_inscrites_marqueur/);
assert.doesNotMatch(phase15,/\bdrop\s+(?:table|column)\b/i);
const phase16=fs.readFileSync(path.join(__dirname,'../docs/sql/compatibilite_v1_v2_staging_PHASE16_DISCUSSIONS.sql'),'utf8');
assert.match(phase16,/tourneo\.v1_copy_verified/);
assert.match(phase16,/create table public\.tourneo_discussions/);
assert.match(phase16,/create policy discussions_lecture/);
assert.match(phase16,/tourneo_private\.discussion_role/);
assert.match(phase16,/revoke all on public\.tourneo_discussions from public,anon,authenticated/);
assert.doesNotMatch(phase16,/\bdrop\s+(?:table|column)\b/i);
const phase17=fs.readFileSync(path.join(__dirname,'../docs/sql/compatibilite_v1_v2_staging_PHASE17_MODERATION.sql'),'utf8');
assert.match(phase17,/tourneo\.v1_copy_verified/);
assert.match(phase17,/create table tourneo_private\.signalements_discussions/);
assert.match(phase17,/create table tourneo_private\.sanctions_discussions/);
assert.match(phase17,/create table tourneo_private\.administrateurs/);
assert.match(phase17,/revoke all on tourneo_private\.administrateurs,tourneo_private\.journal_admin/);
assert.match(phase17,/tourneo_private\.moderation_admin/);
assert.doesNotMatch(phase17,/\bdrop\s+(?:table|column)\b/i);
console.log('Tourneo V2 : lancement bloqué sans sauvegarde/restauration/accord, inventaire agrégé et protection production : OK');

// Contrôles du futur domaine officiel : aucune activation implicite en test.
(() => {
  const vm = require('node:vm');
  const ts = require('typescript');
  const lire = relative => fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
  const transpile = ts.transpileModule(lire('lib/url-publique.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  function liens(production, domaine) {
    const exports = {};
    vm.runInNewContext(transpile, {
      exports,
      URL,
      process: { env: {
        NEXT_PUBLIC_TOURNEO_V2_PRODUCTION_APPROVED: production ? 'true' : 'false',
        NEXT_PUBLIC_TOURNEO_PUBLIC_ORIGIN: domaine,
      } },
    }, { timeout: 1000 });
    return exports;
  }
  const test = liens(false, 'https://www.tourneo.org');
  assert.equal(test.ORIGINE_PUBLIQUE_V2, 'https://tourneo-v2-test.vercel.app');
  assert.equal(test.urlPubliqueTournoi('id/ +&', 'inscriptions'), 'https://tourneo-v2-test.vercel.app/inscriptions/id%2F%20%2B%26');
  assert.equal(test.HOTE_PUBLIC_V2, 'tourneo-v2-test.vercel.app');

  const ancienne = liens(true);
  assert.equal(ancienne.ORIGINE_PUBLIQUE_V2, 'https://tourneo-app.vercel.app');
  assert.equal(ancienne.urlPubliqueTournoi('tournoi'), 'https://tourneo-app.vercel.app/partage/tournoi');

  const officielle = liens(true, 'https://www.tourneo.org');
  assert.equal(officielle.ORIGINE_PUBLIQUE_V2, 'https://www.tourneo.org');
  assert.equal(officielle.HOTE_PUBLIC_V2, 'www.tourneo.org');
  assert.equal(officielle.urlPubliqueTournoi('tournoi', 't'), 'https://www.tourneo.org/t/tournoi');

  for (const domaine of ['http://www.tourneo.org', 'https://tourneo.org', 'https://www.tourneo.org/', 'https://example.org']) {
    assert.equal(liens(true, domaine).ORIGINE_PUBLIQUE_V2, 'https://tourneo-app.vercel.app');
  }
  assert.match(lire('lib/affiche-pronostics.ts'), /HOTE_PUBLIC_V2/);
  assert.match(lire('lib/flyers-a6.ts'), /HOTE_PUBLIC_V2/);
  assert.doesNotMatch(lire('lib/flyers-a6.ts'), /tourneo-app\.vercel\.app/);
  assert.match(lire('app/tournoi/[id]/affiches/resultats/page.tsx'), /HOTE_PUBLIC_V2/);
  assert.doesNotMatch(lire('app/tournoi/[id]/affiches/resultats/page.tsx'), /tourneo-app\.vercel\.app/);
  assert.doesNotMatch(lire('lib/affiche-pronostics.ts'), /tourneo-app\.vercel\.app/);
  assert.match(lire('capacitor.config.ts'), /https:\/\/tourneo-v2-test\.vercel\.app/);
  assert.match(lire('app/login/page.tsx'), /window\.location\.origin/);
  console.log('Tourneo V2 : origine de domaine, QR codes, affiches et isolement test/production : OK');
})();
