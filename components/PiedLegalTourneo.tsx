"use client";
import Link from 'next/link';
import {tr,useLangue} from '@/lib/langue';
export default function PiedLegalTourneo(){
 useLangue();
 return <footer className="tourneo-legal-footer"><span>Tourneo</span><nav aria-label={tr('Informations et droits')}><Link href="/conditions-utilisation">{tr('Conditions d’utilisation')}</Link><Link href="/confidentialite">{tr('Confidentialité')}</Link><Link href="/suppression-compte">{tr('Suppression de compte')}</Link><Link href="/aide">{tr('Aide')}</Link><Link href="/contact">{tr('Contact')}</Link></nav></footer>;
}
