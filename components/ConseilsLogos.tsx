"use client";
import {tr,useLangue} from '@/lib/langue';
export default function ConseilsLogos({sponsors=false}:{sponsors?:boolean}){
 useLangue();
 return <aside className="tourneo-logo-guide"><strong>{tr(sponsors?'Pour des sponsors nets et lisibles':'Pour un logo net sur votre affiche')}</strong><p>{tr(sponsors?'Logo horizontal : visez 600 × 300 px ou davantage. Logo carré : 400 × 400 px ou davantage.':'Visez 600 × 600 px pour un logo carré, ou au moins 600 px de large pour un logo horizontal.')}</p><p>{tr('Ces tailles sont des repères : gardez les proportions de votre logo, sans l’étirer ni le recadrer. PNG transparent conseillé ; JPG et WebP acceptés, 8 Mo maximum par fichier.')}</p><p>{tr('Utilisez le fichier original plutôt qu’une capture d’écran. Gardez une petite marge autour du logo et évitez les textes minuscules. Les logos apparaissent sur un fond blanc pour rester lisibles.')}</p><small>{tr('Vérifiez l’aperçu à taille réelle et faites une impression d’essai avant un grand tirage. Une petite image agrandie ne devient pas plus nette.')}</small></aside>;
}
