export type IdentiteAffiche = { logo: string; sponsors: string[]; message: string };
export type ModelePersonnel = { id: string; nom: string; sport: string; titre: string; lieu: string; organisateur: string; identite: IdentiteAffiche };
export const IDENTITE_VIDE: IdentiteAffiche = { logo: '', sponsors: [], message: '' };
export function normaliserIdentiteAffiche(value: unknown): IdentiteAffiche {
 const a = value && typeof value === 'object' ? value as Record<string, unknown> : {};
 const image = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v);
 return { logo: image(a.logo, 3000000) ? a.logo : '', sponsors: Array.isArray(a.sponsors) ? a.sponsors.filter(v => image(v, 500000)).slice(0, 6) : [], message: typeof a.message === 'string' ? a.message.slice(0, 200) : '' };
}
// Copy the design: later template changes must never affect an existing tournament.
export function copierIdentiteAffiche(value: unknown): IdentiteAffiche {
 const a = normaliserIdentiteAffiche(value);
 return { ...a, sponsors: [...a.sponsors] };
}
