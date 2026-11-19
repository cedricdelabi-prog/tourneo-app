/** Compatibilité des résultats des premiers tournois V1.
 * Avant l'introduction de matchsValides, un score saisi faisait foi.
 * Une liste de validations explicitement présente (même vide) garde TOUJOURS la priorité.
 * Aucun accès réseau ni modification du tournoi historique. */
export function lireValidationsHistoriques(donnees: unknown): number[] {
  if(!donnees || typeof donnees!=='object' || Array.isArray(donnees))return [];
  const d=donnees as Record<string,unknown>;
  if(Object.prototype.hasOwnProperty.call(d,'matchsValides')){
    return Array.isArray(d.matchsValides)?[...new Set(d.matchsValides.filter((id:unknown):id is number=>
      typeof id==='number'&&Number.isSafeInteger(id)&&id>0))]:[];
  }
  if(!Array.isArray(d.matchs))return [];
  const valides:number[]=[];
  const scoresSaisis=(v:unknown):boolean=>typeof v==='string'&&/^(0|[1-9]\d*)$/.test(v)&&Number.isSafeInteger(Number(v));
  for(const ligne of d.matchs){
    if(!ligne||typeof ligne!=='object'||Array.isArray(ligne))continue;
    const m=ligne as Record<string,unknown>;
    if(typeof m.id==='number'&&Number.isSafeInteger(m.id)&&m.id>0&&
       scoresSaisis(m.score1)&&scoresSaisis(m.score2))valides.push(m.id);
  }
  return [...new Set(valides)];
}
