import type {Classement}from'@/types';
import {illustrationSport}from'@/lib/illustration-sport';
export type ModeleAffiche='inscriptions'|'resultats';
export type FormatAffiche='A4'|'A3'|'social';
export const FORMATS_AFFICHE={A4:[1240,1754],A3:[1754,2480],social:[1080,1350]}as const;
export type TexteAffiche={titre:string;date:string;lieu:string;message:string;logo:string;organisateur?:string};
export type ContexteAffiche={sport:string;libelleSport:string;illustration:boolean;capacite?:number;terrains?:number;locale?:string};
const borne=(v:unknown,max=180)=>typeof v==='string'?v.slice(0,max):'';
export function texteDepuisTournoi(nom:string,donnees:Record<string,unknown>,structure=''):TexteAffiche{const o=(donnees.optionsV2||{})as Record<string,unknown>;return{titre:borne(nom,150),date:borne(o.depart||donnees.date,100),lieu:borne(o.lieu||donnees.lieu||donnees.adresse),organisateur:borne(o.organisateur||donnees.organisateur||structure,150),message:'',logo:''};}
export function appliquerPersonnalisation(base:TexteAffiche,ancien:unknown):TexteAffiche{if(!ancien||typeof ancien!=='object')return base;const a=ancien as Record<string,unknown>,modifs=(a.version===2?a.modifications:a)as Record<string,unknown>;if(!modifs||typeof modifs!=='object')return base;const copie={...base};for(const k of Object.keys(base)as(keyof TexteAffiche)[]){const v=modifs[k];if(typeof v==='string'&&v.length<=(k==='logo'?3000000:300)&&(a.version===2||v.trim())){if(k==='logo'&&v&&!/^data:image\/(png|jpeg|webp);base64,/.test(v))continue;copie[k]=v;}}return copie;}
export function dateAffiche(date:string,locale='fr-FR'){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(date))return date;const d=new Date(date);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat(locale,{weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d):date;}
const images=new Map<string,Promise<HTMLImageElement>>();
function image(src:string):Promise<HTMLImageElement>{if(images.has(src))return images.get(src)!;const p=new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>{images.delete(src);reject(new Error('Image illisible'));};i.src=src;});if(images.size>8)images.clear();images.set(src,p);return p;}
export async function logoAffiche(f:File){if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>8*1024*1024)throw new Error('Choisissez un logo JPG, PNG ou WebP de moins de 8 Mo.');const url=URL.createObjectURL(f);try{const i=await image(url),c=document.createElement('canvas'),ratio=Math.min(1,700/Math.max(i.width,i.height));c.width=Math.max(1,Math.round(i.width*ratio));c.height=Math.max(1,Math.round(i.height*ratio));c.getContext('2d')!.drawImage(i,0,0,c.width,c.height);return c.toDataURL('image/png');}finally{images.delete(url);URL.revokeObjectURL(url);}}
export async function dessinerAffiche(canvas:HTMLCanvasElement,texte:TexteAffiche,modele:ModeleAffiche,format:FormatAffiche,classement:Classement[],officiel:boolean,qr:string,tr:(s:string)=>string,contexte?:ContexteAffiche){
 const[w,h]=FORMATS_AFFICHE[format];canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Aperçu indisponible.');const c:CanvasRenderingContext2D=ctx,k=w/1240,H=h/k;c.scale(k,k);
 const [marque,logo,qri]=await Promise.all([image('/tourneo-officiel.png'),texte.logo?image(texte.logo):null,qr?image(qr):null]);
 const g=c.createLinearGradient(0,0,1240,H);g.addColorStop(0,'#143c62');g.addColorStop(1,'#071424');c.fillStyle=g;c.fillRect(0,0,1240,H);c.fillStyle='#2cd9dc';c.fillRect(0,0,1240,12);
 c.drawImage(marque,75,52,105,105);c.fillStyle='#fff';c.font='900 38px Arial';c.fillText('TOURNEO',204,115);
 if(logo){const r=Math.min(130/logo.width,100/logo.height);c.fillStyle='#fff';c.fillRect(1000,52,165,110);c.drawImage(logo,1082-logo.width*r/2,107-logo.height*r/2,logo.width*r,logo.height*r);}
 function lignes(s:string,x:number,y:number,size:number,largeur:number,max=2,couleur='#fff',gras=true){c.font=`${gras?'bold':'normal'} ${size}px Arial`;c.fillStyle=couleur;let mot='',tab:string[]=[];for(const m of s.trim().split(/\s+/)){if(c.measureText(mot?mot+' '+m:m).width>largeur&&mot){tab.push(mot);mot=m;}else mot=mot?mot+' '+m:m;}if(mot)tab.push(mot);tab.slice(0,max).forEach((l,i)=>{if(i===max-1&&tab.length>max)l+='…';while(l.length>1&&c.measureText(l).width>largeur)l=l.slice(0,-2)+'…';c.fillText(l,x,y+i*(size+12));});return y+Math.min(max,tab.length)*(size+12);}
 lignes(tr(modele==='inscriptions'?'TOURNOI · INSCRIPTIONS':'TOURNOI · RÉSULTATS'),75,225,24,1090,1,'#8ae4e5');
 let y=lignes(contexte?.libelleSport.toLocaleUpperCase()||texte.titre,75,305,62,1090,2,'#43e5df');
 if(contexte?.libelleSport&&texte.titre.toLocaleLowerCase()!==contexte.libelleSport.toLocaleLowerCase())y=lignes(texte.titre,75,y+8,43,1090,2);
 const bas=H-455;
 if(modele==='inscriptions'){
  if(contexte?.illustration!==false){const espace=bas-y-110,haut=Math.max(100,Math.min(430,espace));illustrationSport(c,contexte?.sport||'autre',190,y+Math.max(10,(espace-haut)/2),860,haut);}
  lignes(texte.message||tr('À vous de jouer !'),75,bas-32,32,1090,2,'#e4f3ff');
 }else{
  if(contexte?.illustration!==false){c.save();c.globalAlpha=.1;illustrationSport(c,contexte?.sport||'autre',460,y+100,700,380);c.restore();}
  y+=14;if(!officiel)y=lignes(tr('Classement provisoire'),75,y,27,1090,1,'#ffd270');
  const n=Math.min(5,Math.max(0,Math.floor((bas-y-40)/80)));classement.slice(0,n).forEach((l,i)=>{c.fillStyle=i===0?'#ffd270':'#5be1df';c.font='900 39px Arial';c.fillText(String(i+1).padStart(2,'0'),75,y+38);lignes(l.equipe.nom,174,y+38,32,980,1);c.fillStyle='#42637b';c.fillRect(75,y+60,1090,1);y+=80;});if(!classement.length)lignes(tr('Les résultats seront disponibles après les matchs.'),75,y+25,30,1090,2);if(texte.message)lignes(texte.message,75,bas-25,25,1090,1,'#c4daeb');
 }
 c.fillStyle='#12344e';c.fillRect(55,bas+28,1130,370);c.fillStyle='#43e5df';c.fillRect(55,bas+28,7,370);
 let infoY=bas+86;const infoLargeur=qri?790:1040;
 if(texte.date)infoY=lignes(dateAffiche(texte.date,contexte?.locale),90,infoY,30,infoLargeur,2);
 if(texte.lieu)infoY=lignes(texte.lieu,90,infoY+8,29,infoLargeur,2,'#d3e9f6');
 if(texte.organisateur)infoY=lignes(texte.organisateur,90,infoY+8,24,infoLargeur,1,'#9bc4db');
 const extras=[];if(modele==='inscriptions'&&contexte?.capacite)extras.push(String(contexte.capacite)+' '+tr('places'));if(modele==='inscriptions'&&contexte?.terrains&&contexte.terrains>1)extras.push(String(contexte.terrains)+' '+tr('terrains'));if(extras.length)lignes(extras.join(' · '),90,Math.min(infoY+8,H-165),23,infoLargeur,1,'#a6cfdf');
 lignes(tr(modele==='inscriptions'?(qri?'Inscrivez-vous en ligne':'Inscriptions sur place'):'Merci à tous les participants !'),90,H-117,29,infoLargeur,1,'#43e5df');
 if(qri){c.fillStyle='#fff';c.fillRect(925,bas+83,220,220);c.drawImage(qri,937,bas+95,196,196);lignes(tr('Scannez ce code'),925,bas+340,18,220,1,'#d3e9f6');}
 lignes(tr('Créez. Jouez. Gagnez.'),75,H-25,20,1090,1,'#a5c8db',false);
}
