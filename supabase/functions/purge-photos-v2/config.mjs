// La purge ne doit fonctionner que pour le projet Supabase auquel elle appartient.
// Refus des URLs externes, des migrations de clé entre projets et des domaines trompeurs.
export function environnementPurgeValide(url,reference){
 if(typeof url!=='string'||typeof reference!=='string'||!/^[a-z0-9]{20}$/.test(reference))return false;
 return url==='https://'+reference+'.supabase.co';
}
