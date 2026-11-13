export function capitaineEquipe(value:unknown,joueurs:string[]):string|undefined{
 if(value===undefined||value===null||value==='')return undefined;
 if(typeof value!=='string'||!value.trim()||value.trim().length>100)throw new Error('Nom du capitaine invalide.');
 const nom=value.trim();if(joueurs.length&&!joueurs.includes(nom))throw new Error('Le capitaine doit figurer dans la liste des joueurs de l’équipe.');return nom;
}
