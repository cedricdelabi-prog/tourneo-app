"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
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
    return <fieldset disabled={disabled} className="v2-settings"><legend>{tr("Organisation et r\u00E8gles")}</legend>
    <label>{tr("Mode")}<select value={value.mode} onChange={e => changer('mode', e.target.value)}><option value="simple">{tr("Simple")}</option><option value="expert">{tr("Expert")}</option></select></label>
    <label>{tr("Comptage du r\u00E9sultat")}<select value={value.score} onChange={e => changer('score', e.target.value)}><option value="points">{tr("Points / buts")}</option><option value="sets">{tr("Sets / manches gagnantes")}</option></select></label>
    {value.score === 'sets' && <label>{tr("Nombre de sets gagnants")}<input type="number" min={1} max={5} value={value.setsGagnants} onChange={e => changer('setsGagnants', Number(e.target.value))}/></label>}
    <details open={value.mode !== 'simple'} className="v2-regles-detail"><summary>{tr("R\u00E9glages du tirage, du classement et du planning")}</summary>
    {value.score === 'sets' && <><label>{tr("Points pour gagner une manche (0 = libre)")}<input type="number" min={0} max={1000} value={value.cibleManche} onChange={e => changer('cibleManche', Number(e.target.value))}/></label><label>{tr("\u00C9cart minimum")}<input type="number" min={1} max={10} value={value.ecartManche} onChange={e => changer('ecartManche', Number(e.target.value))}/></label><label>{tr("Plafond d\u2019une manche (0 = sans plafond)")}<input type="number" min={0} max={1000} value={value.plafondManche} onChange={e => changer('plafondManche', Number(e.target.value))}/></label><label>{tr("Objectif manche d\u00E9cisive (0 = identique)")}<input type="number" min={0} max={1000} value={value.cibleDecisive} onChange={e => changer('cibleDecisive', Number(e.target.value))}/></label></>}
    <label>{tr("Tirage")}<select value={value.tirage} onChange={e => changer('tirage', e.target.value)}><option value="aleatoire">{tr("Al\u00E9atoire")}</option><option value="equilibre">{tr("\u00C9quilibr\u00E9 selon les niveaux")}</option><option value="manuel">{tr("Manuel selon les positions / poules")}</option></select></label>
    {value.mode !== 'simple' && <><label>{tr("Points de classement : victoire")}<input type="number" min={0} max={100} value={value.pointsVictoire} onChange={e => changer('pointsVictoire', Number(e.target.value))}/></label><label>{tr("Match nul")}<input type="number" min={0} max={100} value={value.pointsNul} onChange={e => changer('pointsNul', Number(e.target.value))}/></label><label>{tr("D\u00E9faite")}<input type="number" min={0} max={100} value={value.pointsDefaite} onChange={e => changer('pointsDefaite', Number(e.target.value))}/></label></>}
    <label>{tr("Rondes (suisse / partenaires tournants)")}<input type="number" min={1} max={32} value={value.rondes} onChange={e => changer('rondes', Number(e.target.value))}/></label>
    <label>{tr("Terrains disponibles")}<input type="number" min={1} max={32} value={value.terrains} onChange={e => changer('terrains', Number(e.target.value))}/></label>
    <label>{tr("Dur\u00E9e estim\u00E9e d\u2019un match (minutes)")}<input type="number" min={1} max={240} value={value.duree} onChange={e => changer('duree', Number(e.target.value))}/></label>
    <label>{tr("Repos minimum (minutes)")}<input type="number" min={0} max={120} value={value.repos} onChange={e => changer('repos', Number(e.target.value))}/></label>
    <label>{tr("D\u00E9but (facultatif)")}<input type="datetime-local" value={value.depart} onChange={e => changer('depart', e.target.value)}/></label>
    <div><button type="button" onClick={() => { try {
        localStorage.setItem('tourneo-modele-regles', JSON.stringify({ ...value, exemptions: [] }));
        setMessage('Modèle de règles enregistré sur cet appareil.');
    }
    catch {
        setMessage('Stockage indisponible.');
    } }}>{tr("Enregistrer ces r\u00E8gles comme mod\u00E8le")}</button>
    <button type="button" onClick={() => { try {
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
