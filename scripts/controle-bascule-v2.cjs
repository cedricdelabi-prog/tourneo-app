#!/usr/bin/env node
'use strict';
/**
 * Read-only release checklist, NOT a deployment script or authorization to change Supabase.
 * Only aggregated inventory and references to out-of-band validation proofs are accepted.
 */
const fs=require('node:fs'),path=require('node:path');
const MANIFEST=path.join(__dirname,'..','docs','bascule-v2-preflight.json');
const PREUVES=[
 ['sauvegardeRestaurableComplete','Sauvegarde complète restaurable (Auth, base, Storage, rôles et fonctions)'],
 ['restaurationIsoléeVerifiee','Répétition réelle de restauration dans un environnement isolé'],
 ['schemaV2CompatibleSurCopie','Migrations additives V2 validées sur une copie de V1'],
 ['comptesEtConnexionsConserves','Reprise des comptes, sessions et connexion des anciens utilisateurs'],
 ['urlsPartageHistoriquesVerifiees','Vérification de tous les anciens liens de partage'],
 ['droitsRlsEtFonctionsVerifies','Politiques RLS et fonctions publiques vérifiées sur la copie'],
 ['parcoursTournoiEtTvReelsVerifies','Création et modification de tournoi et TV essayées en situation réelle'],
 ['strategieAndroidValidee','Continuité de mise à jour Android et signature validée'],
 ['retourArriereRepete','Retour arrière et gestion des écritures après bascule répétés'],
 ['accordExpliciteMiseEnProduction','Accord final explicite du propriétaire de l’application']
];
function evaluerBascule(m){
 const blocages=[];
 if(m?.sourceProduction!=='gjtxlzhfqcecyfciyllc'||m?.cibleDeMigration!=='gjtxlzhfqcecyfciyllc')
  blocages.push('Cible incohérente : préserver la base et les identifiants de production existants.');
 if(m?.baseEssaisIndependante!=='kmjfmjhdnokkaiolxiin')
  blocages.push('La base de test indépendante doit rester séparée de la production.');
 const v=m?.inventaireV1||{};
 if(!Number.isInteger(v.comptes)||v.comptes<1||v.comptes!==v.profils)
  blocages.push('Inventaire comptes/profils V1 absent ou incohérent.');
 if(!Number.isInteger(v.tournois)||v.tournois<1)
  blocages.push('Inventaire tournois V1 absent.');
 if(!Number.isInteger(v.identitesAuth)||v.identitesAuth<v.comptes)
  blocages.push('Identités Auth V1 non recensées ou incomplètes.');
 for(const [cle,label] of [
   ['tournoisOrphelins','Tournois sans propriétaire'],
   ['profilsOrphelins','Profils sans compte'],
   ['partageManquants','Liens historiques manquants'],
   ['partageDupliques','Liens historiques en doublon'],
   ['resultatsJsonMalformes','Résultats V1 malformés']
 ]){
  if(!Number.isInteger(v[cle])||v[cle]!==0)blocages.push(label+' : résoudre les écarts avant toute bascule.');
 }
 for(const [cle,label] of PREUVES){
  const item=m?.preuves?.[cle];
  if(item?.statut!=='valide'||typeof item.preuve!=='string'||item.preuve.trim().length<8)
   blocages.push(label+' : preuve manquante.');
 }
 return{pret:blocages.length===0,blocages,comptes:v.comptes??null,tournois:v.tournois??null};
}
function afficher(rapport){
 process.stdout.write('TOURNEO V1 → V2 : '+(rapport.pret?'préparation documentée (validation manuelle obligatoire)':'BASCULE BLOQUÉE')+'\n');
 process.stdout.write('Comptes recensés : '+rapport.comptes+' ; tournois recensés : '+rapport.tournois+'\n');
 for(const [i,b] of rapport.blocages.entries())process.stdout.write((i+1)+'. '+b+'\n');
 if(rapport.pret)process.stdout.write('Attention : aucun déploiement, migration ou changement de clé n’est effectué par ce contrôle.\n');
}
if(require.main===module){
 try{
  const arg=process.argv.find(s=>s.startsWith('--manifest='));
  const file=arg?path.resolve(arg.slice(11)):MANIFEST;
  const report=evaluerBascule(JSON.parse(fs.readFileSync(file,'utf8')));
  afficher(report);
  if(!report.pret)process.exitCode=2;
 }catch(e){console.error('Manifeste de migration invalide : '+e.message);process.exitCode=2;}
}
module.exports={evaluerBascule,afficher,PREUVES,MANIFEST};
