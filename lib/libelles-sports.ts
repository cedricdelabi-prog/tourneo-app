const SPORTS: Record<string, string> = {
  multisport: 'Multisport', football: 'Football', futsal: 'Futsal', basket: 'Basket-ball',
  handball: 'Handball', volley: 'Volley-ball', rugby7: 'Rugby à 7 / Touch rugby', hockey: 'Hockey',
  tennis: 'Tennis', padel: 'Padel', badminton: 'Badminton', squash: 'Squash',
  'ping-pong': 'Tennis de table', petanque: 'Pétanque', flechettes: 'Fléchettes', bowling: 'Bowling',
  billard: 'Billard', babyfoot: 'Baby-foot', cornhole: 'Cornhole', palets: 'Palets', molkky: 'Mölkky',
  spikeball: 'Roundnet / Spikeball', esport: 'E-sport', echecs: 'Échecs', dames: 'Jeu de dames',
  cartes: 'Jeux de cartes', jeuxsociete: 'Jeux de société compétitifs', autre: 'Autre sport / jeu',
};
export const libelleSport = (code: string) => SPORTS[code] || code || 'Multisport';
