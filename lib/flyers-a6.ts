import {peindreVisuelAffiche} from '@/lib/visuel-affiche';
import type {TexteAffiche,ContexteAffiche} from '@/lib/affiche';
// A4 at 300 dpi, four identical A6 cards; content stays inside printer margins.
export function peindreFlyersA6(canvas:HTMLCanvasElement,t:TexteAffiche,marque:HTMLImageElement,logo:HTMLImageElement|null,qr:HTMLImageElement|null,sponsors:HTMLImageElement[],tr:(s:string)=>string,contexte?:ContexteAffiche,photo?:HTMLImageElement|null){
 canvas.width=2480;canvas.height=3508;const c=canvas.getContext('2d');if(!c)throw new Error('Aperçu indisponible.');c.fillStyle='#fff';c.fillRect(0,0,2480,3508);
 const wrap=(s:string,size:number,width:number)=>{c.font=`bold ${size}px Arial`;const lines:string[]=[];let line='';for(const word of s.trim().split(/\s+/)){if(line&&c.measureText(line+' '+word).width>width){lines.push(line);line=word;}else line=line?line+' '+word:word;}if(line)lines.push(line);return lines;};
 const text=(s:string,x:number,y:number,size:number,max=2,color='#153851',width=1080)=>{const lines=wrap(s,size,width);c.fillStyle=color;lines.slice(0,max).forEach((line,i)=>{let l=line;if(i===max-1&&lines.length>max)l+='…';while(c.measureText(l).width>width&&l.length>1)l=l.slice(0,-2)+'…';c.fillText(l,x,y+i*(size+12));});};
 for(let row=0;row<2;row++)for(let col=0;col<2;col++){
  c.save();c.translate(col*1240,row*1754);c.fillStyle='#123c5c';c.fillRect(55,55,1130,140);c.drawImage(marque,70,65,120,120);text('TOURNEO',215,143,50,1,'#fff',730);
  if(logo){const r=Math.min(160/logo.width,105/logo.height);c.fillStyle='#fff';c.fillRect(990,72,175,108);c.drawImage(logo,1077-logo.width*r/2,126-logo.height*r/2,logo.width*r,logo.height*r);}
  text(tr('TOURNOI · INSCRIPTIONS'),80,250,28,1,'#187d87');text(contexte?.libelleSport||'',80,308,38,1);
  const maxLignes=photo?3:4;let size=photo?48:62;while(size>32&&wrap(t.titre,size,1080).length>maxLignes)size-=2;text(t.titre,80,395,size,maxLignes);if(photo){const top=395+(Math.min(maxLignes,wrap(t.titre,size,1080).length)-1)*(size+12)+24;peindreVisuelAffiche(c,photo,80,top,1080,Math.max(0,680-top));}
  if(t.date)text(t.date,80,760,32,2);if(t.lieu)text(t.lieu,80,850,34,2);if(t.organisateur)text(t.organisateur,80,950,28,1,'#526b7b');
  if(qr){text(tr('Scannez pour vous inscrire'),80,1050,40,1,'#137b85');c.drawImage(qr,sponsors.length?420:390,1085,sponsors.length?400:460,sponsors.length?400:460);}
  else {text(tr(contexte?.liens?.principal?'Inscrivez-vous en ligne':'Inscriptions sur place'),80,1070,42,2,'#137b85');if(contexte?.liens?.principal)text(contexte.liens.principal,80,1180,24,3);}
  if(t.message)text(t.message,80,sponsors.length?1525:1590,26,2,'#526b7b',1080);
  // Sponsor logos are optional and kept apart from the QR and practical details.
  if(sponsors.length){const y=1650,cell=1060/sponsors.length;for(let i=0;i<sponsors.length;i++){const s=sponsors[i],r=Math.min((cell-18)/s.width,55/s.height);c.drawImage(s,90+i*cell+(cell-s.width*r)/2,y-50,s.width*r,s.height*r);}}
  text('tourneo-app.vercel.app',80,1690,27,1,'#526b7b');c.restore();
 }
 c.save();c.strokeStyle='#7f949f';c.lineWidth=2;c.setLineDash([12,12]);c.beginPath();c.moveTo(1240,20);c.lineTo(1240,3488);c.moveTo(20,1754);c.lineTo(2460,1754);c.stroke();c.restore();
}
