export type EquipeOlympiade = {
    id: string;
    nom: string;
    joueurs: string[];
};
export type EpreuveOlympiade = {
    id: string;
    nom: string;
    unite: string;
    sens: 'plus' | 'moins';
    validee: boolean;
    mesures: Record<string, string>;
};
export type Olympiade = {
    version: 1;
    nom: string;
    equipes: EquipeOlympiade[];
    epreuves: EpreuveOlympiade[];
};
export function mesureOlympiade(v: unknown): number | null { if (typeof v !== 'string' || !/^\d{1,9}(?:[.,]\d{1,3})?$/.test(v.trim()))
    return null; const n = Number(v.replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : null; }
export function classementEpreuve(e: EpreuveOlympiade, equipes: EquipeOlympiade[]) {
    const lignes = equipes.map(equipe => ({ equipe, valeur: mesureOlympiade(e.mesures[equipe.id]) }));
    if (equipes.length < 2 || lignes.some(l => l.valeur === null))
        return [];
    lignes.sort((a, b) => (e.sens === 'moins' ? 1 : -1) * (a.valeur! - b.valeur!) || a.equipe.nom.localeCompare(b.equipe.nom));
    return lignes.map(l => { const premier = lignes.findIndex(a => a.valeur === l.valeur); return { ...l, rang: premier + 1, points: equipes.length - premier }; });
}
export function classementOlympiade(d: Olympiade) {
    const lignes = new Map(d.equipes.map(e => [e.id, { equipe: e, points: 0, epreuves: 0, premieresPlaces: 0 }]));
    for (const e of d.epreuves.filter(e => e.validee))
        for (const r of classementEpreuve(e, d.equipes)) {
            const l = lignes.get(r.equipe.id)!;
            l.points += r.points;
            l.epreuves++;
            if (r.rang === 1)
                l.premieresPlaces++;
        }
    const tries = [...lignes.values()].sort((a, b) => b.points - a.points || a.equipe.nom.localeCompare(b.equipe.nom));
    return tries.map(l => ({ ...l, rang: tries.findIndex(a => a.points === l.points) + 1 }));
}
export function lireOlympiade(texte: string): Olympiade {
    if (texte.length > 1000000)
        throw new Error('Fichier trop volumineux.');
    const d = JSON.parse(texte);
    if (!d || d.version !== 1 || typeof d.nom !== 'string' || d.nom.length > 100 || !Array.isArray(d.equipes) || d.equipes.length > 32 || !Array.isArray(d.epreuves) || d.epreuves.length > 32)
        throw new Error('Olympiade invalide.');
    const identifiant = (v: unknown) => typeof v === 'string' && /^[a-zA-Z0-9:_-]{1,100}$/.test(v);
    const equipes: EquipeOlympiade[] = d.equipes.map((e: EquipeOlympiade) => { if (!e || !identifiant(e.id) || typeof e.nom !== 'string' || !e.nom.trim() || e.nom.length > 100 || !Array.isArray(e.joueurs) || e.joueurs.length > 256 || e.joueurs.some(n => typeof n !== 'string' || n.length > 100))
        throw new Error('Équipe invalide.'); return { id: e.id, nom: e.nom.trim(), joueurs: e.joueurs }; });
    if (new Set(equipes.map(e => e.id)).size !== equipes.length || new Set(equipes.map(e => e.nom.toLocaleLowerCase('fr'))).size !== equipes.length)
        throw new Error('Identifiants ou noms d’équipes dupliqués.');
    const epreuves: EpreuveOlympiade[] = d.epreuves.map((e: EpreuveOlympiade) => { if (!e || !identifiant(e.id) || typeof e.nom !== 'string' || !e.nom.trim() || e.nom.length > 100 || typeof e.unite !== 'string' || e.unite.length > 30 || !['plus', 'moins'].includes(e.sens) || !e.mesures || typeof e.mesures !== 'object' || Array.isArray(e.mesures))
        throw new Error('Épreuve invalide.'); const mesures: Record<string, string> = {}; for (const t of equipes) {
        const v = e.mesures[t.id];
        if (v !== undefined && (typeof v !== 'string' || !/^\d{0,9}(?:[.,]\d{0,3})?$/.test(v)))
            throw new Error('Résultat invalide.');
        mesures[t.id] = v || '';
    } const resultat = { id: e.id, nom: e.nom.trim(), unite: e.unite, sens: e.sens, validee: e.validee === true, mesures }; if (resultat.validee && (equipes.length < 2 || classementEpreuve(resultat, equipes).length !== equipes.length))
        throw new Error('Une épreuve validée doit avoir tous ses résultats.'); return resultat; });
    if (new Set(epreuves.map(e => e.id)).size !== epreuves.length)
        throw new Error('Identifiants d’épreuves dupliqués.');
    return { version: 1, nom: d.nom.trim() || 'Mes Olympiades', equipes, epreuves };
}
export function exporterOlympiade(d: Olympiade) { const url = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'tourneo-olympiades.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
