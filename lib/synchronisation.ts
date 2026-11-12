import type { SupabaseClient } from '@supabase/supabase-js';
export type CopieTournoi = {
    nom: string;
    sport: string;
    donnees: Record<string, unknown>;
};
export type VersionTournoi = {
    id: string;
    revision: number;
    photos_expirent_at: string | null;
    updated_at?: string;
    nom?: string;
    donnees?: Record<string, unknown>;
};
export type ResultatSynchronisation = {
    statut: 'sauve';
    version: VersionTournoi;
} | {
    statut: 'conflit';
    version: VersionTournoi;
};
export function lireRevision(valeur: unknown): number | null {
    if (valeur === null || valeur === undefined || valeur === '')
        return null;
    const revision = Number(valeur);
    return Number.isSafeInteger(revision) && revision >= 0 ? revision : null;
}
function canonique(valeur: unknown): string {
    if (Array.isArray(valeur))
        return `[${valeur.map(canonique).join(',')}]`;
    if (valeur && typeof valeur === 'object')
        return `{${Object.entries(valeur).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonique(v)}`).join(',')}}`;
    return JSON.stringify(valeur) ?? 'null';
}
// Compare-and-swap: a stale or unknown base never overwrites the remote tournament.
export async function synchroniserTournoi(client: SupabaseClient, id: string, proprietaire: string, revision: number | null, copie: CopieTournoi): Promise<ResultatSynchronisation> {
    if (revision !== null) {
        const r = await client.from('tournois').update(copie).eq('id', id).eq('user_id', proprietaire).eq('revision', revision).select('id,revision,photos_expirent_at,updated_at').maybeSingle();
        if (r.error)
            throw r.error;
        if (r.data)
            return { statut: 'sauve', version: r.data };
    }
    const r = await client.from('tournois').select('id,nom,sport,donnees,revision,photos_expirent_at,updated_at').eq('id', id).eq('user_id', proprietaire).maybeSingle();
    if (r.error)
        throw r.error;
    if (!r.data)
        throw new Error('Tournoi inaccessible : votre copie locale reste conservée.');
    if (lireRevision(r.data.revision) === null)
        throw new Error('Version cloud indisponible : votre copie locale reste conservée.');
    const identique = r.data.nom === copie.nom && r.data.sport === copie.sport && canonique(r.data.donnees) === canonique(copie.donnees);
    return { statut: identique ? 'sauve' : 'conflit', version: r.data };
}
