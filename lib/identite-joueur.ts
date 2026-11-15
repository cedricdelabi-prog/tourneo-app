export function nomAvecVille(p:{display_name?:string|null;nom?:string|null;player_code?:string|null;city?:string|null}){
 const nom=(p.display_name||p.nom||p.player_code||'Joueur').trim();const ville=(p.city||'').trim();return ville&&!nom.toLocaleLowerCase().endsWith(' · '+ville.toLocaleLowerCase())?`${nom} · ${ville}`:nom;
}
