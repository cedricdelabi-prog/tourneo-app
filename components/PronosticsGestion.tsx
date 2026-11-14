"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {QRCodeSVG} from 'qrcode.react';
import {supabase} from '@/lib/supabase';
import {MODES_PRONOSTICS,nombrePronostics,reglePronostics,erreurPronostics,type EtatPronostics,type ModePronostic} from '@/lib/pronostics';
import {classementTournoi,tournoiEstTermine} from '@/lib/resultats';
import {normaliserOptionsV2} from '@/lib/options-v2';
import {urlPubliqueTournoi} from '@/lib/url-publique';
import {tr,trModele,useLangue} from '@/lib/langue';
import {ChampAide} from '@/components/AideInfo';
import ChampDate from '@/components/ChampDate';
import AffichePronostics from '@/components/AffichePronostics';
import type {Equipe,Match} from '@/types';
type Tournoi={nom:string;sport:string;revision:number;donnees:{equipes:Equipe[];matchs:Match[];formatTournoi:string;matchsValides:number[];optionsV2?:Parameters<typeof normaliserOptionsV2>[0]}};
export default function PronosticsGestion({id,afficheSeule=false}:{id:string;afficheSeule?:boolean}){
 useLangue();const[tournoi,setTournoi]=useState<Tournoi|null>(null),[uid,setUid]=useState(''),[etat,setEtat]=useState<EtatPronostics|null>(null),[mode,setMode]=useState<ModePronostic>('vainqueur'),[actif,setActif]=useState(true),[cloture,setCloture]=useState(''),[message,setMessage]=useState(''),[occupe,setOccupe]=useState(false),[pret,setPret]=useState(false),verrou=useRef(false);
 const charger=useCallback(async()=>{const auth=await supabase.auth.getUser();if(!auth.data.user){location.href='/login';return;}const[r,c]=await Promise.all([supabase.from('tournois').select('nom,sport,revision,donnees').eq('id',id).eq('user_id',auth.data.user.id).single(),supabase.rpc('tourneo_pronostics_lecture',{p_id:id})]);if(r.error||!r.data||c.error)throw new Error('Accès organisateur requis');setUid(auth.data.user.id);setTournoi(r.data);setEtat(c.data);setMode(c.data.mode||'vainqueur');setActif(c.data.mode?c.data.actif:true);const date=c.data.cloture_at?new Date(c.data.cloture_at):null;setCloture(date?new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16):'');setPret(true);},[id]);
 useEffect(()=>{void Promise.resolve().then(charger).catch(e=>{setMessage(erreurPronostics(e));setPret(true);});},[charger]);
 async function action(fn:()=>Promise<void>){if(verrou.current)return;verrou.current=true;setOccupe(true);setMessage('');try{await fn();}catch(e){setMessage(erreurPronostics(e));}finally{verrou.current=false;setOccupe(false);}}
 const d=tournoi?.donnees,regles=normaliserOptionsV2(d?.optionsV2),termine=!!d&&tournoiEstTermine(d.formatTournoi,d.equipes||[],d.matchs||[],regles,d.matchsValides||[]),lien=urlPubliqueTournoi(id)+'/pronostics',fige=!!etat?.nombre||!!etat?.ferme||!!etat?.demarre;
 const minimum=Math.max(2,nombrePronostics(mode)),assez=(d?.equipes?.length||0)>=minimum;
 async function enregistrer(){if(!assez)throw new Error('Le nombre de participants ne permet pas ce format');const r=await supabase.rpc('tourneo_pronostics_configurer',{p_id:id,p_actif:actif,p_mode:mode,p_cloture:cloture?new Date(cloture).toISOString():null});if(r.error)throw r.error;window.location.assign(`/tournoi/${id}?etape=configuration&pronostics=enregistres`);}
 async function publier(){if(!tournoi||!d)return;const r=await supabase.rpc('tourneo_pronostics_publier',{p_id:id,p_revision:tournoi.revision,p_classement:classementTournoi(d.formatTournoi,d.equipes,d.matchs,regles).map(l=>l.equipe.id)});if(r.error)throw r.error;setEtat(r.data);setMessage('Le classement des pronostiqueurs est publié.');}
 return <section className="v2-card tournoi-predictions"><span className="v2-eyebrow">{tr(afficheSeule?'Inviter les spectateurs':'Animation du public')}</span><h1>{tr(afficheSeule?'Affiche spectateurs et QR':'Pronostics du public')}</h1>{tournoi?.nom&&<h2>{tournoi.nom}</h2>}
  {!afficheSeule&&<p>{tr('Choisissez le jeu du public, enregistrez, puis retrouvez votre tournoi. L’affiche avec QR est accessible depuis sa configuration.')}</p>}{message&&<p role="status">{tr(message)}</p>}
  {!pret?<p>{tr('Chargement…')}</p>:tournoi&&<>
   {!afficheSeule&&<><fieldset disabled={occupe}><legend>{tr('Préparer le jeu')}</legend><label className="tourneo-check-line"><input type="checkbox" checked={actif} disabled={!!etat?.ferme&&!etat?.actif} onChange={e=>setActif(e.target.checked)}/>{tr('Activer les pronostics du public')}</label>
    {fige&&<p role="status" className="tourneo-creation-check">{tr(etat?.demarre?'Le tournoi a démarré : les pronostics sont fermés.':etat?.ferme?'Ce jeu a été clôturé. Il ne peut pas être rouvert.':'Des spectateurs ont déjà participé : le format et l’échéance restent fixes pour garder les mêmes règles.')}</p>}
    <fieldset className="tourneo-prono-modes" disabled={fige}><legend>{tr('Format du pronostic')}</legend>{Object.entries(MODES_PRONOSTICS).map(([m,nom])=><label key={m} className={mode===m?'choisi':''}><input type="radio" name="mode-pronostic" aria-label={tr(nom)} value={m} checked={mode===m} onChange={()=>setMode(m as ModePronostic)}/><span><strong>{tr(nom)}</strong><small>{trModele('À partir de {0} participants',Math.max(2,nombrePronostics(m as ModePronostic)))}</small></span></label>)}</fieldset>
    {!assez&&<p role="status">{trModele('Ajoutez au moins {0} participants au tournoi pour enregistrer ce jeu.',minimum)} <a href={`/tournoi/${id}?etape=participants`}>{tr('Ajouter les participants')}</a></p>}
    <ChampAide label="Clôture anticipée (facultative)" aide="Sans date, le jeu ferme automatiquement au lancement du tournoi. Cette date permet de le fermer plus tôt. Une clôture ne peut pas être annulée."><ChampDate type="datetime-local" value={cloture} disabled={fige} onChange={e=>setCloture(e.target.value)}/></ChampAide>
    <p>{tr(reglePronostics(mode))} {tr('En cas d’égalité, les pronostiqueurs partagent le même rang.')}</p><p>{tr('Participation gratuite, sans mise d’argent. Aucune récompense n’est prévue par Tourneo.')}</p>
    <button type="button" disabled={!assez||!!etat?.demarre&&(!etat?.actif||actif)} onClick={()=>void action(enregistrer)}>{tr('Enregistrer et revenir au tournoi')}</button>
   </fieldset>
   <div className="tourneo-tool-actions"><a className="tourneo-nav-primary" href={`/tournoi/${id}/pronostics/affiche`}>{tr('Ouvrir l’affiche spectateurs avec QR')}</a><a href={`/tournoi/${id}?etape=configuration`}>{tr('Retour à la configuration du tournoi')}</a></div>
   {etat?.mode&&<><p>{tr(etat.ferme?'Pronostics fermés':'Pronostics ouverts')} · {etat.nombre||0} {tr('participation(s)')}</p>{etat.compatible===false&&<p role="alert">{tr('Les participants du tournoi ont changé. Le jeu est suspendu pour vérification par l’organisateur.')}</p>}<div className="tourneo-tool-actions"><button type="button" disabled={occupe} onClick={()=>void action(charger)}>{tr('Actualiser')}</button>{!etat.ferme&&<button type="button" disabled={occupe} onClick={()=>{if(window.confirm(tr('Fermer définitivement les pronostics de ce tournoi ?')))void action(async()=>{const r=await supabase.rpc('tourneo_pronostics_fermer',{p_id:id});if(r.error)throw r.error;setEtat(r.data);setMessage('Les pronostics sont maintenant verrouillés.');});}}>{tr('Fermer les pronostics maintenant')}</button>}{termine&&<button type="button" disabled={occupe} onClick={()=>void action(publier)}>{tr('Publier le classement du public')}</button>}</div></>}
   </>}
   {afficheSeule&&(etat?.actif&&etat?.mode?<><p>{tr('Imprimez cette affiche ou partagez-la : son QR ouvre directement le jeu des spectateurs.')}</p><div className="tourneo-prediction-qr"><QRCodeSVG value={lien} size={180} marginSize={3}/><p className="tourneo-share-url">{lien}</p><a className="tourneo-nav-primary" href={lien}>{tr('Tester le parcours spectateur')}</a></div><AffichePronostics id={id} uid={uid} nom={tournoi.nom} sport={tournoi.sport} donnees={tournoi.donnees} etat={etat}/></>:<p>{tr('Enregistrez d’abord le jeu de pronostics pour préparer son affiche.')} <a href={`/tournoi/${id}/pronostics`}>{tr('Configurer les pronostics')}</a></p>)}
  </>}
 </section>;
}
