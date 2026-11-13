"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import {ChampAide} from '@/components/AideInfo';
import ChampDate from '@/components/ChampDate';
import { useState } from 'react';
import { normaliserOptionsV2, type OptionsV2 } from '@/lib/options-v2';
export default function OptionsTournoiV2({ value, onChange, disabled = false }: {
    value: OptionsV2;
    onChange: (v: OptionsV2) => void;
    disabled?: boolean;
}) {
    useLangue();
    const [message, setMessage] = useState('');
    const changer = (cle: keyof OptionsV2, v: unknown) => onChange(normaliserOptionsV2({ ...value, [cle]: v }));
    return <fieldset className="v2-settings"><legend>{tr("Organisation et r\u00E8gles")}</legend>
    <ChampAide label="Mode" aide="Simple garde les réglages courants. Expert affiche les barèmes avancés. Toutes les fonctions sont gratuites dans la V2."><select disabled={disabled} value={value.mode} onChange={e => changer('mode', e.target.value)}><option value="simple">{tr("Simple")}</option><option value="expert">{tr("Expert")}</option></select></ChampAide>
    <ChampAide label="Comptage du résultat" aide="Points / buts enregistre le score global. Sets / manches gagnantes permet de saisir chaque manche ; choisissez le barème adapté au sport."><select disabled={disabled} value={value.score} onChange={e => changer('score', e.target.value)}><option value="points">{tr("Points / buts")}</option><option value="sets">{tr("Sets / manches gagnantes")}</option></select></ChampAide>
    {value.score === 'sets' && <ChampAide label="Nombre de sets gagnants" aide="Un match est gagné dès qu’un participant atteint ce nombre de manches remportées."><input disabled={disabled} type="number" min={1} max={5} value={value.setsGagnants} onChange={e => changer('setsGagnants', Number(e.target.value))}/></ChampAide>}
    <ChampAide label="Début (facultatif)" aide="Date et heure prévues pour le premier match. Elles sont reprises sur l’affiche. Sans date, le planning utilise des horaires relatifs."><ChampDate disabled={disabled} type="datetime-local" value={value.depart} onChange={e => changer('depart', e.target.value)}/></ChampAide>
    <ChampAide label="Lieu du tournoi" aide="Ce lieu sera repris automatiquement sur l’affiche. Indiquez le nom du site, de la salle ou du terrain."><input disabled={disabled} value={value.lieu||''} maxLength={180} placeholder={tr("Ex. Boulodrome municipal, Calais")} onChange={e=>onChange({...value,lieu:e.target.value})}/></ChampAide>
    <details className="tourneo-optional-panel"><summary>{tr("Nom de l’organisateur (facultatif)")}</summary><ChampAide label="Organisateur" aide="Nom affiché sur les supports du tournoi : club, association ou organisateur. Ce champ ne change pas les droits d’accès."><input disabled={disabled} value={value.organisateur||''} maxLength={150} placeholder={tr("Ex. Club, association, prénom…")} onChange={e=>onChange({...value,organisateur:e.target.value})}/></ChampAide></details>
    <label className="tourneo-check-line"><input disabled={disabled} type="checkbox" checked={value.diffuserBilan===true} onChange={e=>onChange({...value,diffuserBilan:e.target.checked})}/>{tr('Préparer automatiquement le bilan à la fin du tournoi')}</label><p className="tourneo-tool-note">{tr('Après validation du dernier résultat, les comptes liés reçoivent le bilan dans Tourneo. Les e-mails dépendent de leur accord et de l’activation du service d’envoi.')}</p>
    <details open={value.mode !== 'simple'} className="v2-regles-detail"><summary>{tr("R\u00E9glages du tirage, du classement et du planning")}</summary>
    {value.score === 'sets' && <><ChampAide label="Points pour gagner une manche (0 = libre)" aide="Objectif de points dans une manche. 0 laisse la saisie libre. Pour le tennis standard, une manche correspond à un set en jeux."><input disabled={disabled} type="number" min={0} max={1000} value={value.cibleManche} onChange={e => changer('cibleManche', Number(e.target.value))}/></ChampAide><ChampAide label="Écart minimum" aide="Avance minimale pour gagner une manche. Exemple : 11–10 ne suffit pas avec un écart minimum de 2."><input disabled={disabled} type="number" min={1} max={10} value={value.ecartManche} onChange={e => changer('ecartManche', Number(e.target.value))}/></ChampAide><ChampAide label="Plafond d’une manche (0 = sans plafond)" aide="Limite maximale de points autorisée dans une manche. 0 signifie que l’écart minimum continue de s’appliquer sans limite."><input disabled={disabled} type="number" min={0} max={1000} value={value.plafondManche} onChange={e => changer('plafondManche', Number(e.target.value))}/></ChampAide><ChampAide label="Objectif manche décisive (0 = identique)" aide="Permet de raccourcir la dernière manche. 0 conserve le même objectif que les autres manches."><input disabled={disabled} type="number" min={0} max={1000} value={value.cibleDecisive} onChange={e => changer('cibleDecisive', Number(e.target.value))}/></ChampAide></>}
    <ChampAide label="Tirage" aide="Aléatoire mélange les participants. Équilibré utilise les niveaux renseignés. Manuel respecte les positions ou poules que vous avez définies."><select disabled={disabled} value={value.tirage} onChange={e => changer('tirage', e.target.value)}><option value="aleatoire">{tr("Al\u00E9atoire")}</option><option value="equilibre">{tr("\u00C9quilibr\u00E9 selon les niveaux")}</option><option value="manuel">{tr("Manuel selon les positions / poules")}</option></select></ChampAide>
    {value.mode !== 'simple' && <><ChampAide label="Points de classement : victoire" aide="Points ajoutés au classement pour un match gagné. Ce barème ne change pas le score de la rencontre."><input disabled={disabled} type="number" min={0} max={100} value={value.pointsVictoire} onChange={e => changer('pointsVictoire', Number(e.target.value))}/></ChampAide><ChampAide label="Match nul" aide="Points attribués à chaque participant lorsque le format et le sport autorisent un résultat nul."><input disabled={disabled} type="number" min={0} max={100} value={value.pointsNul} onChange={e => changer('pointsNul', Number(e.target.value))}/></ChampAide><ChampAide label="Défaite" aide="Points attribués au classement pour une rencontre perdue."><input disabled={disabled} type="number" min={0} max={100} value={value.pointsDefaite} onChange={e => changer('pointsDefaite', Number(e.target.value))}/></ChampAide></>}
    <ChampAide label="Rondes (suisse / partenaires tournants)" aide="Une ronde est une série de rencontres. Ce réglage sert aux formats suisse et partenaires tournants, pas au championnat classique."><input disabled={disabled} type="number" min={1} max={32} value={value.rondes} onChange={e => changer('rondes', Number(e.target.value))}/></ChampAide>
    <ChampAide label="Terrains disponibles" aide="Nombre de matchs pouvant se jouer en parallèle. Le planning estime ensuite les créneaux pour ces terrains."><input disabled={disabled} type="number" min={1} max={32} value={value.terrains} onChange={e => changer('terrains', Number(e.target.value))}/></ChampAide>
    <ChampAide label="Durée estimée d’un match (minutes)" aide="Cette durée sert à estimer le planning. Elle ne termine pas automatiquement un match."><input disabled={disabled} type="number" min={1} max={240} value={value.duree} onChange={e => changer('duree', Number(e.target.value))}/></ChampAide>
    <ChampAide label="Repos minimum (minutes)" aide="Temps minimal prévu entre deux rencontres du même participant dans le planning estimatif."><input disabled={disabled} type="number" min={0} max={120} value={value.repos} onChange={e => changer('repos', Number(e.target.value))}/></ChampAide>

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
