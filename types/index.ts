export type Equipe = {
  id: string;
  nom: string;
  emoji: string;
  couleur: string;
  photo?: string;
  joueurs?: string[];
};

export type Match = {
  id: number;
  journee: number;
  equipe1Id: string;
  equipe2Id: string;
  score1: string;
  score2: string;
};

export type Classement = {
  equipe: Equipe;
  mj: number;
  v: number;
  n: number;
  d: number;
  pour: number;
  contre: number;
  diff: number;
  pts: number;
};
