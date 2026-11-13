import {libellesSports} from '@/lib/catalogue-sports';
export const libelleSport = (code:string) => libellesSports[code] || code || 'Multisport';
