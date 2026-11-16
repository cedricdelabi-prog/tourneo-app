"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import {ChampAide} from '@/components/AideInfo';
import ChampEntier from '@/components/ChampEntier';
import ChampDate from '@/components/ChampDate';
import { useState } from 'react';
import { normaliserOptionsV2, type OptionsV2 } from '@/lib/options-v2';
export default function OptionsTournoiV2({ value, onChange, disabled = false, format }: {
    value: OptionsV2;
    onChange: (v: OptionsV2) => void;
    disabled?: boolean;
    format: string;
}) {
    useLangue();
    const [message, setMessage] = useState('');
    const avecClassement = !['elimination','doubleElimination','consolante'].includes(format);
    const changer = (cle: keyof OptionsV2, v: unknown) => onChange(normaliserOptionsV2({ ...value, [cle]: v }));
    return <fieldset className="v2-settings"><legend>{tr("Organisation et r\u00E8gles")}</legend>
    <ChampAide label="Mode" aide="Simple garde les réglages courants. Expert affiche les barèmes avancés. Toutes les fonctions sont gratuites dans la V2."><select disabled={disabled} value={value.mode} onChange={e => changer('mode', e.target.value)}><option value="simple">{tr("Simple")}</option><option value="expert">{tr("Expert")}</option></select></ChampAide>
    <ChampAide label="Comptage du résultat" aide="Points / buts enregistre le score global. Sets / manches gagnantes permet de saisir chaque manche ; choisissez le barème adapté au sport."><select disabled={disabled} value={value.score} onChange={e => changer('score', e.target.value)}><option value="points">{tr("Points / buts")}</option><option value="sets">{tr("Sets / manches gagnantes")}</option></select></ChampAide>
    {value.score === 'sets' && <ChampAide label="Nombre de sets gagnants" aide="Un match est gagné dès qu’un participant atteint ce nombre de manches remportées."><ChampEntier disabled={disabled} min={1} max={5} value={value.setsGagnants} onValue={n => changer('setsGagnants', n)}/></ChampAide>}
    <ChampAide label="Date et heure de début (facultatives)" aide="Date et heure prévues pour le premier match. Elles sont reprises sur l’affiche. Sans date, le planning utilise des horaires relatifs."><ChampDate disabled={disabled} type="datetime-local" value={value.depart} onChange={e => changer('depart', e.target.value)}/></ChampAide>
    <label className="tourneo-field">{tr('Rappel avant le tournoi')}<select disabled={disabled||!value.depart} value={value.rappelAvant||0} onChange={e=>onChange({...value,rappelAvant:Number(e.target.value) as 0|15|30,fuseauHoraire:Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Paris'})}><option value={0}>{tr('Aucun rappel')}</option><option value={30}>{tr('30 minutes avant')}</option><option value={15}>{tr('15 minutes avant')}</option></select></label><p className="tourneo-tool-note">{tr(value.depart?'Pour les participants liés à un compte Tourneo, selon leurs préférences de notifications. Les alertes sur téléphone ou par e-mail nécessitent leur activation dans le profil.':'Ajoutez une date de début pour activer le rappel.')} {value.rappelAvant?trModele('Fuseau horaire : {0}',value.fuseauHoraire||'Europe/Paris'):''}</p>
    <ChampAide label="Lieu du tournoi" aide="Ce lieu sera repris automatiquement sur l’affiche. Indiquez le nom du site, de la salle ou du terrain."><input disabled={disabled} value={value.lieu||''} maxLength={180} placeholder={tr("Ex. Boulodrome municipal, Calais")} onChange={e=>onChange({...value,lieu:e.target.value})}/></ChampAide>
    <details className="tourneo-optional-panel"><summary>{tr("Nom de l’organisateur (facultatif)")}</summary><ChampAide label="Organisateur" aide="Nom affiché sur les supports du tournoi : club, association ou organisateur. Ce champ ne change pas les droits d’accès."><input disabled={disabled} value={value.organisateur||''} maxLength={150} placeholder={tr("Ex. Club, association, prénom…")} onChange={e=>onChange({...value,organisateur:e.target.value})}/></ChampAide></details>
    <label className="tourneo-check-line"><input disabled={disabled} type="checkbox" checked={value.diffuserBilan===true} onChange={e=>onChange({...value,diffuserBilan:e.target.checked})}/>{tr('Préparer automatiquement le bilan à la fin du tournoi')}</label><p className="tourneo-tool-note">{tr('Après validation du dernier résultat, les comptes liés reçoivent le bilan dans Tourneo. Les e-mails dépendent de leur accord et de l’activation du service d’envoi.')}</p>
    <details open={value.mode !== 'simple'} className="v2-regles-detail"><summary>{tr("R\u00E9glages du tirage, du classement et du planning")}</summary>
    {value.score === 'sets' && <><ChampAide label="Points pour gagner une manche (0 = libre)" aide="Objectif de points dans une manche. 0 laisse la saisie libre. Pour le tennis standard, une manche correspond à un set en jeux."><ChampEntier disabled={disabled} min={0} max={1000} value={value.cibleManche} onValue={n => changer('cibleManche', n)}/></ChampAide><ChampAide label="Écart minimum" aide="Avance minimale pour gagner une manche. Exemple : 11–10 ne suffit pas avec un écart minimum de 2."><ChampEntier disabled={disabled} min={1} max={10} value={value.ecartManche} onValue={n => changer('ecartManche', n)}/></ChampAide><ChampAide label="Plafond d’une manche (0 = sans plafond)" aide="Limite maximale de points autorisée dans une manche. 0 signifie que l’écart minimum continue de s’appliquer sans limite."><ChampEntier disabled={disabled} min={0} max={1000} value={value.plafondManche} onValue={n => changer('plafondManche', n)}/></ChampAide>{value.setsGagnants > 1 && <ChampAide label="Objectif manche décisive (0 = identique)" aide="Permet de raccourcir la dernière manche. 0 conserve le même objectif que les autres manches."><ChampEntier disabled={disabled} min={0} max={1000} value={value.cibleDecisive} onValue={n => changer('cibleDecisive', n)}/></ChampAide>}</>}
    <ChampAide label="Tirage" aide="Aléatoire mélange les participants. Équilibré utilise les niveaux renseignés. Manuel respecte les positions ou poules que vous avez définies."><select disabled={disabled} value={value.tirage} onChange={e => changer('tirage', e.target.value)}><option value="aleatoire">{tr("Al\u00E9atoire")}</option><option value="equilibre">{tr("\u00C9quilibr\u00E9 selon les niveaux")}</option><option value="manuel">{tr("Manuel selon les positions / poules")}</option></select></ChampAide>
    {value.mode !== 'simple' && avecClassement && <><ChampAide label="Points de classement : victoire" aide="Points ajoutés au classement pour un match gagné. Ce barème ne change pas le score de la rencontre."><ChampEntier disabled={disabled} min={0} max={100} value={value.pointsVictoire} onValue={n => changer('pointsVictoire', n)}/></ChampAide>{value.score === 'points' && <ChampAide label="Match nul" aide="Points attribués à chaque participant lorsque le format et le sport autorisent un résultat nul."><ChampEntier disabled={disabled} min={0} max={100} value={value.pointsNul} onValue={n => changer('pointsNul', n)}/></ChampAide>}<ChampAide label="Défaite" aide="Points attribués au classement pour une rencontre perdue."><ChampEntier disabled={disabled} min={0} max={100} value={value.pointsDefaite} onValue={n => changer('pointsDefaite', n)}/></ChampAide></>}
    {(format === "suisse" || format === "rotation") && <ChampAide label="Rondes (suisse / partenaires tournants)" aide="Une ronde est une série de rencontres. Ce réglage sert aux formats suisse et partenaires tournants, pas au championnat classique."><ChampEntier disabled={disabled} min={1} max={32} value={value.rondes} onValue={n => changer('rondes', n)}/></ChampAide>}
    <ChampAide label="Terrains disponibles" aide="Nombre de matchs pouvant se jouer en parallèle. Le planning estime ensuite les créneaux pour ces terrains."><ChampEntier disabled={disabled} min={1} max={32} value={value.terrains} onValue={n => changer('terrains', n)}/></ChampAide>
    <ChampAide label="Durée estimée d’un match (minutes)" aide="Cette durée sert à estimer le planning. Elle ne termine pas automatiquement un match."><ChampEntier disabled={disabled} min={1} max={240} value={value.duree} onValue={n => changer('duree', n)}/></ChampAide>
    <ChampAide label="Repos minimum (minutes)" aide="Temps minimal prévu entre deux rencontres du même participant dans le planning estimatif."><ChampEntier disabled={disabled} min={0} max={120} value={value.repos} onValue={n => changer('repos', n)}/></ChampAide>

    <div><button disabled={disabled} type="button" onClick={() => { try {
        localStorage.setItem('tourneo-modele-regles', JSON.stringify({ ...value, exemptions: [] }));
        setMessage('Modèle de règles enregistré sur cet appareil.');
    }
    catch {
        setMessage('Stockage indisponible.');
    } }}>{tr("Enregistrer ces r\u00E8gles comme mod\u00E8le")}</button>
    <button disabled={disabled} type="button" onClick={() => { try {
        const brut = localStorage.getItem('tourneo-modele-regles');
        if (brut) {
            onChange(normaliserOptionsV2(JSON.parse(brut)));
            setMessage('Modèle chargé.');
        }
        else
            setMessage('Aucun modèle enregistré.');
    }
    catch {
        setMessage('Modèle illisible.');
    } }}>{tr("Charger mon mod\u00E8le")}</button></div>
    </details>
    {tr(message) && <p role="status">{tr(message)}</p>}
  </fieldset>;
}
