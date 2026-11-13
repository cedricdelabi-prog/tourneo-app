import type {Classement} from '@/types';
export type ModeleAffiche='inscriptions'|'resultats';
export type FormatAffiche='A4'|'A3'|'social';
export const FORMATS_AFFICHE={A4:[1240,1754],A3:[1754,2480],social:[1080,1350]}as const;
export type TexteAffiche={titre:string;date:string;lieu:string;message:string;logo:string};
function image(src:string):Promise<HTMLImageElement>{return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Image illisible'));i.src=src;});}
export async function logoAffiche(f:File){
 if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>8*1024*1024)throw new Error('Choisissez un logo JPG, PNG ou WebP de moins de 8 Mo.');
 const url=URL.createObjectURL(f);try{const i=await image(url);const c=document.createElement('canvas');const ratio=Math.min(1,700/Math.max(i.width,i.height));c.width=Math.max(1,Math.round(i.width*ratio));c.height=Math.max(1,Math.round(i.height*ratio));c.getContext('2d')!.drawImage(i,0,0,c.width,c.height);return c.toDataURL('image/png');}finally{URL.revokeObjectURL(url);}
}
export async function dessinerAffiche(canvas:HTMLCanvasElement,texte:TexteAffiche,modele:ModeleAffiche,format:FormatAffiche,classement:Classement[],officiel:boolean,qr:string,libelle:(s:string)=>string){
 const [w,h]=FORMATS_AFFICHE[format];canvas.width=w;canvas.height=h;const contexte=canvas.getContext('2d');if(!contexte)throw new Error('Aperçu indisponible.');const c:CanvasRenderingContext2D=contexte;
 const k=w/1240; c.scale(k,k);const hauteur=h/k;const marge=90;const largeur=1240-2*marge;
 c.fillStyle='#081325';c.fillRect(0,0,1240,hauteur);const g=c.createLinearGradient(0,0,1240,hauteur);g.addColorStop(0,'#173963');g.addColorStop(1,'#081325');c.fillStyle=g;c.fillRect(0,0,1240,hauteur);c.fillStyle='#36d6f5';c.fillRect(marge,235,100,8);
 const marque=await image('/tourneo-officiel.png');c.drawImage(marque,marge,48,150,150);c.fillStyle='#fff';c.font='900 48px Arial';c.fillText('TOURNEO',marge+175,130);
 if(texte.logo){const i=await image(texte.logo);const ratio=Math.min(160/i.width,160/i.height);c.fillStyle='#fff';c.fillRect(990,48,160,160);c.drawImage(i,990+(160-i.width*ratio)/2,48+(160-i.height*ratio)/2,i.width*ratio,i.height*ratio);}
 c.fillStyle='#36d6f5';c.font='bold 27px Arial';c.fillText(libelle(modele==='inscriptions'?'INSCRIPTIONS':'RÉSULTATS'),marge,302);
 function lignes(s:string,y:number,size:number,max:number,couleur='#fff'){
  c.font=`bold ${size}px Arial`;c.fillStyle=couleur;const mots=s.trim().split(/\s+/);const lignes:string[]=[];let ligne='';for(const mot of mots){if(c.measureText(ligne?ligne+' '+mot:mot).width>largeur&&ligne){lignes.push(ligne);ligne=mot;}else ligne=ligne?ligne+' '+mot:mot;}if(ligne)lignes.push(ligne);const visibles=lignes.slice(0,max);visibles.forEach((l,i)=>{if(i===max-1&&lignes.length>max)l+='…';while(c.measureText(l).width>largeur&&l.length>1)l=l.slice(0,-2)+'…';c.fillText(l,marge,y+i*(size+12));});return y+visibles.length*(size+12);
 }
 let y=lignes(texte.titre,385,64,3)+25;
 if(texte.date)y=lignes(texte.date,y,31,1,'#b9d5ef');if(texte.lieu)y=lignes(texte.lieu,y,31,2,'#b9d5ef');
 if(modele==='resultats'){
  if(!officiel){y+=20;y=lignes(libelle('Classement provisoire'),y,28,1,'#ffd270');}
  const espaceDisponible=hauteur-335-y;const n=Math.max(0,Math.min(5,Math.floor(espaceDisponible/86)));y+=25;
  classement.slice(0,n).forEach((l,i)=>{c.fillStyle=i===0?'#ffd270':'#36d6f5';c.font='900 44px Arial';c.fillText(String(i+1).padStart(2,'0'),marge,y+40);const nom=l.equipe.nom; c.font='bold 35px Arial';c.fillStyle='#fff';let t=nom;while(c.measureText(t).width>largeur-120&&t.length>1)t=t.slice(0,-2)+'…';c.fillText(t,marge+115,y+37);c.fillStyle='#315173';c.fillRect(marge,y+65,largeur,1);y+=86;});
  if(!classement.length)lignes(libelle('Les résultats seront disponibles après les matchs.'),y+30,30,2);
 }else if(texte.message){lignes(texte.message,y+50,36,3);}
 if(modele==='resultats'&&texte.message)lignes(texte.message,hauteur-270,25,2,'#b9d5ef');
 if(qr){const i=await image(qr);c.fillStyle='#fff';c.fillRect(958,hauteur-235,192,192);c.drawImage(i,970,hauteur-223,168,168);c.font='bold 28px Arial';c.fillStyle='#fff';c.fillText(libelle(modele==='inscriptions'?"Scannez pour vous inscrire":'Scannez pour les résultats'),marge,hauteur-155);}
 else {c.font='bold 30px Arial';c.fillStyle='#fff';c.fillText(libelle(modele==='inscriptions'?'Inscriptions sur place':'Merci à tous les participants !'),marge,hauteur-130);}
 c.fillStyle='#b9d5ef';c.font='24px Arial';c.fillText(libelle('Créez. Jouez. Gagnez.'),marge,hauteur-58);
}
