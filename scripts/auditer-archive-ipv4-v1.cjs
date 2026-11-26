#!/usr/bin/env node
'use strict';
// Tourneo: audit local OFFLINE et strictement en lecture seule d'une archive pg_dump IPv4.
// Ne transmet rien, n'affiche ni noms/IDs/valeurs SQL, ne modifie aucun fichier.
// Usage: node scripts/auditer-archive-ipv4-v1.cjs "CHEMIN_DU_DOSSIER_PRIVE"
const fs=require('node:fs'),path=require('node:path'),readline=require('node:readline'),crypto=require('node:crypto');
const ATTENDUS=['01-roles.sql','02-schema-public.sql','03-schema-auth.sql','03-schema-storage.sql','04-data-public.sql','05-data-auth.sql','06-data-storage.sql'];
const BLOCS=[
 {file:'04-data-public.sql',schema:'public',table:'profiles',label:'profils'},
 {file:'04-data-public.sql',schema:'public',table:'tournois',label:'tournois'},
 {file:'05-data-auth.sql',schema:'auth',table:'users',label:'comptes'},
 {file:'05-data-auth.sql',schema:'auth',table:'identities',label:'identites'},
 {file:'06-data-storage.sql',schema:'storage',table:'objects',label:'objets_storage'}
];
const STOP=(message)=>{throw new Error('ARCHIVE NON VALIDEE : '+message);};
function nomCorrect(n){return /^(?:0[1-6]-[\w-]+\.sql)$/i.test(n);}
async function compterCopie(fichier,schema,table){
 const pattern=new RegExp('^\\s*COPY\\s+(?:"?'+schema+'"?)\\.(?:"?'+table+'"?)\\s*\\([^)]*\\)\\s+FROM\\s+stdin\\s*;','i');
 const reader=readline.createInterface({input:fs.createReadStream(fichier,{encoding:'utf8'}),crlfDelay:Infinity});
 let dansBloc=false,vu=false,termine=false,n=0;
 try {
  for await(const ligne of reader){
   if(!dansBloc){if(pattern.test(ligne)){if(vu)STOP('plusieurs blocs '+schema+'.'+table);vu=true;dansBloc=true;}continue;}
   if(ligne==='\\.'){dansBloc=false;termine=true;continue;}
   if(ligne.length===0)STOP('ligne vide a l interieur du bloc COPY '+schema+'.'+table);
   if(ligne.trimStart().toUpperCase().startsWith('COPY '))STOP('COPY imbrique ou terminateur manquant '+schema+'.'+table);
   if(termine)STOP('COPY supplementaire '+schema+'.'+table);
   n++;
  }
 }finally{reader.close();}
 if(!vu||!termine||dansBloc)STOP('COPY incomplet ou manquant : '+schema+'.'+table);
 return n;
}
async function verifier(archive){
 if(!archive||!fs.existsSync(archive)||!fs.statSync(archive).isDirectory())STOP('dossier local absent');
 const root=fs.realpathSync(archive);
 const result={dossierVerifie:true,fichiersSql:0,mediasPng:0,comptes:0,profils:0,identites:0,tournois:0,objets_storage:0,sha256Calcules:0,restaurationValidee:false};
 for(const nom of ATTENDUS){
  if(!nomCorrect(nom))STOP('nom export non conforme');
  const cible=path.join(root,nom);
  if(!fs.existsSync(cible)||!fs.statSync(cible).isFile()||fs.statSync(cible).size<20)STOP('fichier SQL absent ou trop petit : '+nom);
  const buffer=fs.createReadStream(cible);const hash=crypto.createHash('sha256');
  for await(const chunk of buffer)hash.update(chunk);
  hash.digest('hex'); // calcul de controle; pas de transmission ni impression
  result.fichiersSql++;result.sha256Calcules++;
 }
 for(const bloc of BLOCS)result[bloc.label]=await compterCopie(path.join(root,bloc.file),bloc.schema,bloc.table);
 if(!result.comptes||!result.profils||!result.tournois||result.comptes!==result.profils||result.identites<result.comptes)
  STOP('comptes/profils/identites/tournois incoherents');
 const medias=fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isFile()&&e.name.toLowerCase().endsWith('.png'));
 for(const media of medias){
  const file=path.join(root,media.name);const fd=fs.openSync(file,'r');const sig=Buffer.alloc(8);
  try{if(fs.readSync(fd,sig,0,8,0)!==8||!sig.equals(Buffer.from('89504e470d0a1a0a','hex')))STOP('PNG incomplet ou invalide');}
  finally{fs.closeSync(fd);}
  result.mediasPng++;
 }
 if(result.objets_storage>0&&result.mediasPng===0)STOP('objet Storage signale mais aucune photo PNG sauvegardee');
 if(result.objets_storage!==result.mediasPng)
  result.avertissementMedias='Le nombre de PNG locaux differe des objets Storage SQL: verifier les buckets et les autres types de fichiers.';
 return result;
}
async function main(){
 try{
  const rapport=await verifier(process.argv[2]);
  process.stdout.write('TOURNEO — AUDIT ARCHIVE HORS LIGNE : STRUCTURE COHERENTE (PAS UNE RESTAURATION)\n');
  process.stdout.write('SQL : '+rapport.fichiersSql+' | PNG : '+rapport.mediasPng+' | Comptes : '+rapport.comptes+' | Profils : '+rapport.profils+' | Identites : '+rapport.identites+' | Tournois : '+rapport.tournois+' | Storage SQL : '+rapport.objets_storage+'\n');
  if(rapport.avertissementMedias)process.stdout.write('ATTENTION : '+rapport.avertissementMedias+'\n');
  process.stdout.write('Restauration validee : NON. Fichiers prives non envoyes ni modifies.\n');
 }catch(e){console.error(e.message);process.exitCode=2;}
}
if(require.main===module)main();
module.exports={verifier,compterCopie,ATTENDUS};
