import type {Equipe,Match} from '@/types';
import {genererMatchs} from '@/lib/tournoi';
import {planifierMatchs,joueursDuMatch} from '@/lib/planning';
import {genererPartenairesTournants} from '@/lib/rotation';
export type BesoinTournoi={participants:number;terrains:number;minutes:number;duree:number;repos:number;objectif:'convivial'|'competition'};
export type PropositionTournoi={format:'complet'|'suisse'|'elimination'|'rotation';titre:string;minutes:number;rencontres:number;minimum:number;maximum:number;rondes:number;dansLeTemps:boolean};
function mesurer(format:PropositionTournoi['format'],titre:string,equipes:Equipe[],matchs:Match[],b:BesoinTournoi,rondes=1):PropositionTournoi{
 const planning=planifierMatchs(matchs,b),compte=new Map(equipes.map(e=>[e.id,0]));for(const m of matchs)for(const id of joueursDuMatch(m))compte.set(id,(compte.get(id)||0)+1);
 const minutes=Math.max(0,...planning.map(c=>c.fin));return{format,titre,minutes,rencontres:matchs.length,minimum:Math.min(...compte.values()),maximum:Math.max(...compte.values()),rondes,dansLeTemps:minutes<=b.minutes};
}
export function conseillerTournoi(b:BesoinTournoi):PropositionTournoi[]{
 if(!Number.isInteger(b.participants)||b.participants<2||b.participants>128||!Number.isInteger(b.minutes)||b.minutes<5||b.minutes>1440)throw new Error('Prévoyez entre 2 et 128 participants et entre 5 minutes et 24 heures.');
 if(!Number.isInteger(b.terrains)||b.terrains<1||b.terrains>32||!Number.isInteger(b.duree)||b.duree<1||b.duree>240||!Number.isInteger(b.repos)||b.repos<0||b.repos>120)throw new Error('Vérifiez le nombre de terrains, la durée et le repos.');
 const equipes=Array.from({length:b.participants},(_,i)=>({id:'p'+i,nom:'Participant '+(i+1),emoji:'',couleur:''})),championnat=genererMatchs(equipes),propositions=[mesurer('complet','Tout le monde se rencontre',equipes,championnat,b,b.participants-1+b.participants%2)];
 // Swiss opponents depend on results. Round-robin pairings model the number of
 // games/rests only; the recommendation is an estimate, never a precomputed draw.
 let suisse:PropositionTournoi|undefined;for(let rondes=1;rondes<=Math.min(32,b.participants-1+b.participants%2);rondes++){const p=mesurer('suisse','Plusieurs matchs pour chacun',equipes,championnat.filter(m=>m.journee<=rondes),b,rondes);if(!suisse||p.dansLeTemps)suisse=p;if(!p.dansLeTemps)break;}if(suisse)propositions.push(suisse);
 // A full elimination estimate must include future rounds, not just round one.
 let ids=equipes.map(e=>e.id),tour=1;const elimination:Match[]=[];while(ids.length>1){const suivants:string[]=[];for(let i=0;i<ids.length;i+=2){suivants.push(ids[i]);if(ids[i+1])elimination.push({id:elimination.length+1,journee:tour,equipe1Id:ids[i],equipe2Id:ids[i+1],score1:'',score2:''});}ids=suivants;tour++;}
 const p=mesurer('elimination','Une coupe avec finale',equipes,elimination,b,tour-1);p.minimum=1;p.maximum=Math.ceil(Math.log2(b.participants));if((b.participants&(b.participants-1))===0)propositions.push(p);
 if(b.participants>=4&&b.objectif==='convivial'){let rotation:PropositionTournoi|undefined;for(let rondes=1;rondes<=32;rondes++){const r=mesurer('rotation','Jouer en double et changer de partenaire',equipes,genererPartenairesTournants(equipes,rondes),b,rondes);if(!rotation||r.dansLeTemps)rotation=r;if(!r.dansLeTemps)break;}if(rotation)propositions.push(rotation);}
 return propositions.sort((a,z)=>Number(z.dansLeTemps)-Number(a.dansLeTemps)||(b.objectif==='convivial'?z.minimum-a.minimum:(a.format==='elimination'?-1:z.format==='elimination'?1:0))||a.minutes-z.minutes);
}
export type AlertePreparation={niveau:'bloquant'|'attention';texte:string};
export function verifierPreparation(equipes:Equipe[],matchs:Match[],options:{terrains:number;duree:number;repos:number;budgetMinutes?:number}):AlertePreparation[]{
 const alertes:AlertePreparation[]=[];if(equipes.length<2)alertes.push({niveau:'bloquant',texte:'Ajoutez au moins deux participants.'});
 if(new Set(equipes.map(e=>e.id)).size!==equipes.length)alertes.push({niveau:'bloquant',texte:'Deux participants ont le même identifiant. Corrigez la liste.'});
 if(equipes.some(e=>!e.nom.trim()))alertes.push({niveau:'bloquant',texte:'Chaque participant doit avoir un nom.'});
 const normaliser=(s:string)=>s.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
 if(new Set(equipes.map(e=>normaliser(e.nom))).size!==equipes.length)alertes.push({niveau:'attention',texte:'Plusieurs participants portent le même nom. Ajoutez un repère pour les distinguer.'});
 const profils=equipes.map(e=>e.profilId).filter(Boolean);if(new Set(profils).size!==profils.length)alertes.push({niveau:'bloquant',texte:'Un même profil est inscrit plusieurs fois.'});
 const ids=new Set(equipes.map(e=>e.id));if(matchs.some(m=>joueursDuMatch(m).some(id=>!ids.has(id))||m.equipe1Id===m.equipe2Id))alertes.push({niveau:'bloquant',texte:'Une rencontre contient un participant absent ou opposé à lui-même.'});
 try{const p=planifierMatchs(matchs,options);if(options.budgetMinutes&&Math.max(0,...p.map(c=>c.fin))>options.budgetMinutes)alertes.push({niveau:'attention',texte:'Le planning dépasse le temps disponible. Ajustez la formule ou la durée estimée.'});}catch{alertes.push({niveau:'bloquant',texte:'Vérifiez le nombre de terrains, la durée et le repos.'});}
 return alertes;
}
