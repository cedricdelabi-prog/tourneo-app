export type EquipeTiree = {
    nom: string;
    joueurs: string[];
};
export function nomsPourTirage(texte: string): string[] {
    if (texte.length > 30000)
        throw new Error('Liste trop longue.');
    const noms = texte.split(/\r?\n/).map(n => n.trim()).filter(Boolean);
    if (noms.length < 2 || noms.length > 256)
        throw new Error('Ajoutez entre 2 et 256 personnes, une par ligne.');
    if (noms.some(n => n.length > 100))
        throw new Error('Un nom dépasse 100 caractères.');
    if (new Set(noms.map(n => n.toLocaleLowerCase('fr'))).size !== noms.length)
        throw new Error('Deux noms sont identiques : ajoutez une initiale pour les distinguer.');
    return noms;
}
function entierAleatoire(max: number): number {
    const limite = Math.floor(0x100000000 / max) * max, valeur = new Uint32Array(1);
    do {
        crypto.getRandomValues(valeur);
    } while (valeur[0] >= limite);
    return valeur[0] % max;
}
export function tirerEquipes(noms: string[], nombre: number, hasard: (max: number) => number = entierAleatoire): EquipeTiree[] {
    const verifies = nomsPourTirage(noms.join('\n'));
    if (!Number.isInteger(nombre) || nombre < 2 || nombre > 32 || nombre > verifies.length)
        throw new Error('Choisissez entre 2 et 32 équipes, sans dépasser le nombre de personnes.');
    for (let i = verifies.length - 1; i > 0; i--) {
        const j = hasard(i + 1);
        if (!Number.isInteger(j) || j < 0 || j > i)
            throw new Error('Tirage indisponible.');
        [verifies[i], verifies[j]] = [verifies[j], verifies[i]];
    }
    const equipes = Array.from({ length: nombre }, (_, i) => ({ nom: `Équipe ${i + 1}`, joueurs: [] as string[] }));
    verifies.forEach((nom, i) => equipes[i % nombre].joueurs.push(nom));
    return equipes;
}
export type Chrono = {
    ecoule: number;
    depuis: number | null;
    limite: number;
};
export function tempsChrono(chrono: Chrono, maintenant: number): number {
    return Math.max(0, chrono.ecoule + (chrono.depuis === null ? 0 : Math.max(0, maintenant - chrono.depuis)));
}
export function afficherDuree(ms: number): string {
    const s = Math.floor(Math.max(0, ms) / 1000);
    return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
export function texteEquipes(equipes: EquipeTiree[]): string { return equipes.map(e => `${e.nom} (${e.joueurs.length})\n${e.joueurs.join('\n')}`).join('\n\n'); }
