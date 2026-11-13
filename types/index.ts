export type Equipe = {
  historique?: {date:string;nom:string;joueurs:string[];capitaine?:string}[];
  capitaine?: string;
  profilId?: string;
  niveau?: number;
  position?: number;
  poule?: number;
  id: string;
  nom: string;
  emoji: string;
  couleur: string;
  photo?: string;
  joueurs?: string[];
};

export type Match = {
  terrain?: number;
  joueurs1Ids?: string[];
  joueurs2Ids?: string[];
  ordre?: number;
  manches?: { score1: string; score2: string }[];
  branche?: "principale" | "repechage" | "consolante" | "finale";
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
