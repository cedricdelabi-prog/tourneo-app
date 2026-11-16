'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { logoAffiche } from '@/lib/affiche';
import { IDENTITE_VIDE, normaliserIdentiteAffiche, type ModelePersonnel } from '@/lib/modeles-affiche';
import { libellesSports } from '@/lib/catalogue-sports';
import { tr, useLangue } from '@/lib/langue';
const vide = (): ModelePersonnel => ({ id: '', nom: '', sport: 'petanque', titre: '', lieu: '', organisateur: '', identite: { ...IDENTITE_VIDE, sponsors: [] } });
export default function ModelesAffiche({ onChoisir }: { onChoisir?: (modele: ModelePersonnel) => void }) {
 useLangue();
 const [modeles, setModeles] = useState<ModelePersonnel[]>([]), [form, setForm] = useState(vide), [edition, setEdition] = useState(false), [uid, setUid] = useState(''), [pret, setPret] = useState(false), [occupe, setOccupe] = useState(false), [message, setMessage] = useState('');
 const verrou = useRef(false);
 useEffect(() => { let actif = true; void (async () => {
  const a = await supabase.auth.getUser(); if (!a.data.user) throw new Error('Connectez-vous pour retrouver vos modèles.');
  const r = await supabase.from('tourneo_modeles_affiche').select('*').eq('user_id', a.data.user.id).order('nom');
  if (r.error) throw new Error('Les modèles d’affiche ne sont pas encore disponibles.');
  if (actif) { setUid(a.data.user.id); setModeles((r.data || []).map(m => ({ ...m, identite: normaliserIdentiteAffiche(m.identite) }))); setPret(true); }
 })().catch(e => { if (actif) setMessage(e.message); }); return () => { actif = false; }; }, []);
 async function enregistrer(e: React.FormEvent) {
  e.preventDefault(); if (verrou.current || !uid || !form.nom.trim()) return;
  verrou.current = true; setOccupe(true); setMessage('');
  try { const { id, ...champs } = form; const payload = { ...champs, nom: form.nom.trim(), user_id: uid };
   const r = id ? await supabase.from('tourneo_modeles_affiche').update(payload).eq('id', id).eq('user_id', uid).select('*').single() : await supabase.from('tourneo_modeles_affiche').insert(payload).select('*').single();
   if (r.error || !r.data) throw new Error();
   setModeles(v => [...v.filter(m => m.id !== r.data.id), { ...r.data, identite: normaliserIdentiteAffiche(r.data.identite) }].sort((a,b) => a.nom.localeCompare(b.nom))); setEdition(false); setMessage('Modèle enregistré dans votre compte.');
  } catch { setMessage('Enregistrement impossible. Votre saisie est conservée ; réessayez.'); } finally { verrou.current = false; setOccupe(false); }
 }
 async function images(fichiers: File[], sponsors: boolean) {
  if (verrou.current || !fichiers.length) return; verrou.current = true; setOccupe(true);
  try { const logos = await Promise.all(fichiers.map(logoAffiche)); if (logos.some(l => l.length > (sponsors ? 500000 : 3000000))) throw new Error('Choisissez des logos sponsors plus petits.');
   setForm(f => ({ ...f, identite: { ...f.identite, ...(sponsors ? { sponsors: [...f.identite.sponsors, ...logos].slice(0,6) } : { logo: logos[0] || '' }) } }));
  } catch(e) { setMessage(e instanceof Error ? e.message : 'Image illisible.'); } finally { verrou.current = false; setOccupe(false); }
 }
 return <section className="v2-card" id="modeles-affiche"><h2>{tr('Modèles d’affiche')}</h2><p>{tr(onChoisir ? 'Partez de votre modèle ou remplissez directement les réglages ci-dessous.' : 'Préparez vos logos, sponsors et lieux habituels une seule fois. Chaque tournoi conserve sa propre copie.')}</p>
 {modeles.length > 0 && <div className="tourneo-modeles-grid">{modeles.map(m => <article key={m.id}>{m.identite.logo && <img src={m.identite.logo} alt="" width={64} height={64}/>}<strong>{m.nom}</strong><span>{tr(libellesSports[m.sport] || m.sport)} · {m.lieu}</span>{onChoisir ? <button type="button" onClick={() => { onChoisir(m); setMessage('Modèle repris. Choisissez la date et l’heure du tournoi.'); }}>{tr('Utiliser ce modèle')}</button> : <button type="button" disabled={occupe} onClick={() => { setForm({ ...m, identite: normaliserIdentiteAffiche(m.identite) }); setEdition(true); }}>{tr('Modifier')}</button>}</article>)}</div>}
 {!onChoisir && pret && !edition && <button type="button" onClick={() => { setForm(vide()); setEdition(true); }}>{tr('Créer un modèle')}</button>}
 {onChoisir && <Link href="/profil#modeles-affiche">{tr('Gérer mes modèles d’affiche')}</Link>}
 {edition && <form className="v2-form" onSubmit={enregistrer}><fieldset disabled={occupe} style={{ border: 0, padding: 0, display: 'grid', gap: 12 }}>
 {(['nom','titre','organisateur','lieu'] as const).map(k => <label key={k}>{tr({nom:'Nom du modèle',titre:'Nom habituel du tournoi',organisateur:'Club, camping ou organisateur',lieu:'Lieu ou terrain habituel'}[k])}<input required={k==='nom'} value={form[k]} maxLength={{nom:100,titre:150,organisateur:150,lieu:180}[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))}/></label>)}
 <label>{tr('Activité')}<select value={form.sport} onChange={e => setForm(f => ({...f,sport:e.target.value}))}>{Object.entries(libellesSports).map(([code,nom]) => <option key={code} value={code}>{tr(nom)}</option>)}</select></label>
 <label>{tr('Informations complémentaires (facultatif)')}<textarea maxLength={200} value={form.identite.message} onChange={e => setForm(f => ({...f,identite:{...f.identite,message:e.target.value}}))}/></label>
 <label>{tr('Logo de mon organisation')}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { const f=e.target.files?.[0];e.target.value='';if(f)void images([f],false); }}/></label>{form.identite.logo && <div><img src={form.identite.logo} alt={tr('Logo de mon organisation')} width={80} height={80}/><button type="button" onClick={() => setForm(f => ({...f,identite:{...f.identite,logo:''}}))}>{tr('Retirer mon logo')}</button></div>}
 <label>{tr('Logos des sponsors (6 maximum)')}<input type="file" multiple disabled={form.identite.sponsors.length>=6} accept="image/png,image/jpeg,image/webp" onChange={e => { const f=Array.from(e.target.files||[]).slice(0,6-form.identite.sponsors.length);e.target.value='';void images(f,true); }}/></label>
 <div className="tourneo-sponsor-list">{form.identite.sponsors.map((s,i) => <div key={i}><img src={s} alt={`${tr('Sponsor')} ${i+1}`}/><button type="button" aria-label={`${tr('Retirer le sponsor')} ${i+1}`} onClick={() => setForm(f => ({...f,identite:{...f.identite,sponsors:f.identite.sponsors.filter((_,j)=>j!==i)}}))}>{tr('Retirer')}</button></div>)}</div>
 <button type="submit">{tr('Enregistrer le modèle')}</button><button type="button" onClick={() => setEdition(false)}>{tr('Annuler')}</button></fieldset></form>}{message && <p role="status">{tr(message)}</p>}</section>;
}
