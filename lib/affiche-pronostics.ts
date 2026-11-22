import {HOTE_PUBLIC_V2} from '@/lib/url-publique';
import {peindreVisuelAffiche} from '@/lib/visuel-affiche';
import type {TexteAffiche,ContexteAffiche} from '@/lib/affiche';
import {illustrationSport} from '@/lib/illustration-sport';
// Fixed print regions keep long event names, six sponsors and the QR apart.
export function peindreAffichePronostics(c:CanvasRenderingContext2D,H:number,t:TexteAffiche,marque:HTMLImageElement,logo:HTMLImageElement|null,qr:HTMLImageElement|null,sponsors:HTMLImageElement[],tr:(s:string)=>string,contexte?:ContexteAffiche,photo?:HTMLImageElement|null){
 const text=(s:string,x:number,y:number,size:number,width:number,max=2,color='#fff')=>{c.font=`bold ${size}px Arial`;c.fillStyle=color;const lines:string[]=[];let line='';for(const word of s.trim().split(/\s+/)){if(line&&c.measureText(line+' '+word).width>width){lines.push(line);line=word;}else line=line?line+' '+word:word;}if(line)lines.push(line);for(let i=0;i<Math.min(max,lines.length);i++){let l=lines[i];if(i===max-1&&lines.length>max)l+='…';while(l.length>1&&c.measureText(l).width>width)l=l.slice(0,-2)+'…';c.fillText(l,x,y+i*(size+12));}};
 c.save();c.globalAlpha=.08;c.fillStyle='#43e5df';c.beginPath();c.arc(1180,140,400,0,Math.PI*2);c.fill();c.restore();
 c.drawImage(marque,72,48,140,140);text('TOURNEO',238,113,46,640,1);text(tr('Créez. Jouez. Gagnez.'),240,158,23,640,1,'#a8d8e8');
 if(logo){c.fillStyle='#fff';c.fillRect(1000,58,165,115);const r=Math.min(145/logo.width,95/logo.height);c.drawImage(logo,1082-logo.width*r/2,115-logo.height*r/2,logo.width*r,logo.height*r);}
 text(tr('PRONOSTICS · PUBLIC'),75,245,25,1090,1,'#77ecdf');
 text(t.titre,75,326,57,1090,2);text(contexte?.libelleSport||'',75,493,31,1090,1,'#43e5df');
 if(contexte?.illustration!==false){c.save();c.globalAlpha=.12;if(photo){c.globalAlpha=.9;peindreVisuelAffiche(c,photo,820,410,320,110);}else illustrationSport(c,contexte?.sport||'autre',820,410,320,220);c.restore();}
 text(t.message||tr('À vous de pronostiquer !'),75,552,29,1090,2,'#deedf5');
 const infoTop=H-380-(sponsors.length?110:0),taille=330,top=Math.min(Math.round(H*.42),infoTop-taille-110);
 c.fillStyle='#163c56';c.fillRect(55,top-25,1130,taille+98);
 if(qr){c.fillStyle='#fff';c.fillRect(80,top,taille,taille);c.drawImage(qr,98,top+18,taille-36,taille-36);}
 text(tr('Scannez pour participer'),80,top+365,22,380,1,'#b8e7ee');
 text(tr('FAITES VOTRE CHOIX'),480,top+64,43,660,2);
 text(tr(contexte?.sansCompte?'Sans compte · votre nom suffit':'Participez gratuitement'),480,top+190,29,660,2,'#43e5df');
 text(contexte?.cloturePronostics||tr('Pronostiquez avant le lancement du tournoi'),480,top+286,23,660,2,'#cce4f1');
 c.fillStyle='#102e46';c.fillRect(55,infoTop,1130,210);c.fillStyle='#43e5df';c.fillRect(55,infoTop,6,210);
 const rows=[t.date,t.lieu,t.organisateur].filter(Boolean);if(t.date)text(t.date,85,infoTop+40,24,1065,1,'#e3edf7');if(t.lieu)text(t.lieu,85,infoTop+92,23,1065,2,'#e3edf7');if(t.organisateur)text(t.organisateur,85,infoTop+185,21,1065,1,'#a8d0e2');
 if(!rows.length)text(tr('Horaires et lieu : renseignez-vous auprès de l’organisateur.'),85,infoTop+70,27,1065,2,'#c3dce9');
 if(sponsors.length){text(tr('Avec le soutien de'),75,H-152,18,1090,1,'#a9d0df');const cellule=1090/sponsors.length;for(let i=0;i<sponsors.length;i++){const s=sponsors[i],mw=Math.min(155,cellule-18),mh=65,r=Math.min(mw/s.width,mh/s.height),x=75+i*cellule+cellule/2;c.fillStyle='#fff';c.fillRect(x-mw/2-6,H-139,mw+12,77);c.drawImage(s,x-s.width*r/2,H-133+(65-s.height*r)/2,s.width*r,s.height*r);}}
 text(tr('Organisez vos tournois avec Tourneo')+' · '+HOTE_PUBLIC_V2,75,H-24,21,1090,1,'#8cbbcf');
}
