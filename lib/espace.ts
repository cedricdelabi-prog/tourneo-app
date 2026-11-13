export type Espace = 'organisateur' | 'arbitre' | 'joueur' | 'admin';
export function liensEspace(espace: Espace): [string,string][] {
  if(espace==='admin')return [['/administration','Administration'],['/activite','Activité'],['/profil','Mon profil']];
  return espace === 'arbitre' ? [['/arbitrage','Mes arbitrages'],['/outils','Outils'],['/activite','Activité'],['/profil','Mon profil']]
    : espace === 'joueur' ? [['/mes-matchs','Mes matchs'],['/activite','Activité'],['/profil','Mon profil']]
    : [['/dashboard','Mes tournois'],['/outils','Outils'],['/activite','Activité'],['/profil','Mon profil']];
}
