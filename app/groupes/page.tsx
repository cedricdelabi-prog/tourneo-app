"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import TourneoNav from "@/components/TourneoNav";
type Groupe = { id: string; user_id: string; nom: string; type: 'club' | 'accompagnement' };
type Participant = { id: string; nom: string };
type Membre = { user_id: string; role: 'accompagnateur' | 'lecture' };
type Identite = { id: string; display_name: string; player_code: string };
export default function Groupes() {
  const [user, setUser] = useState(''), [groupes, setGroupes] = useState<Groupe[]>([]), [selection, setSelection] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]), [membres, setMembres] = useState<Membre[]>([]), [identites, setIdentites] = useState<Identite[]>([]);
  const [nom, setNom] = useState(''), [type, setType] = useState<'club'|'accompagnement'>('club'), [noms, setNoms] = useState(''), [code, setCode] = useState(''), [role, setRole] = useState<'accompagnateur'|'lecture'>('lecture');
  const [occupe, setOccupe] = useState(false), [message, setMessage] = useState(''), [pret, setPret] = useState(false);
  const requete = useRef(0);
  const chargerGroupes = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) { window.location.href='/login'; return; }
    setUser(data.user.id);
    const r=await supabase.from('tourneo_groupes').select('id,user_id,nom,type').order('created_at',{ascending:false});
    if(r.error) setMessage('Chargement des groupes impossible.');
    else { setGroupes(r.data || []); setSelection(s=>r.data.some(g=>g.id===s)?s:r.data[0]?.id || ''); }
  }, []);
  const chargerDetails = useCallback(async () => {
    const numero=++requete.current;
    setPret(false); setParticipants([]); setMembres([]); setIdentites([]);
    if(!selection)return;
    const [p,m]=await Promise.all([supabase.from('tourneo_groupe_participants').select('id,nom').eq('groupe_id',selection).order('created_at').order('id'),supabase.from('tourneo_groupe_membres').select('user_id,role').eq('groupe_id',selection)]);
    if(numero!==requete.current)return;
    if(p.error||m.error){setMessage('Chargement impossible ou accès retiré. Actualisez vos groupes.');return;}
    setParticipants(p.data || []);setMembres(m.data || []);setPret(true);
    const ids=(m.data || []).map(x=>x.user_id);
    if(ids.length){const r=await supabase.rpc('tourneo_profils_publics',{p_ids:ids}).select('id,display_name,player_code');if(numero===requete.current&&Array.isArray(r.data))setIdentites(r.data);}
  }, [selection]);
  useEffect(()=>{void chargerGroupes();},[chargerGroupes]);
  useEffect(()=>{void chargerDetails();return()=>{requete.current++;};},[chargerDetails]);
  const groupe=groupes.find(g=>g.id===selection), proprietaire=groupe?.user_id===user;
  const peutModifier=pret&&(proprietaire||membres.some(m=>m.user_id===user&&m.role==='accompagnateur'));
  async function creer(e:React.FormEvent){e.preventDefault();setOccupe(true);setMessage('');const r=await supabase.from('tourneo_groupes').insert({nom:nom.trim(),type,user_id:user}).select('id').single();if(r.error)setMessage('Création impossible. Réessayez.');else{setNom('');await chargerGroupes();setSelection(r.data.id);}setOccupe(false);}
  async function ajouter(e:React.FormEvent){
    e.preventDefault();const deja=new Set(participants.map(p=>p.nom.trim().toLocaleLowerCase()));const lignes=noms.split('\n').map(n=>n.trim()).filter(n=>{const cle=n.toLocaleLowerCase();if(!n||deja.has(cle))return false;deja.add(cle);return true;});
    if(!lignes.length){setMessage('Ajoutez au moins un nouveau nom ou pseudo.');return;}
    if(lignes.some(n=>n.length>100)||participants.length+lignes.length>256){setMessage('Maximum 256 participants, avec des noms de 100 caractères au plus.');return;}
    setOccupe(true);const r=await supabase.from('tourneo_groupe_participants').insert(lignes.map(n=>({groupe_id:selection,nom:n})));
    if(r.error)setMessage('Ajout impossible : vérifiez les doublons, le quota et vos droits.');else{setNoms('');setMessage('Participants ajoutés.');await chargerDetails();}setOccupe(false);
  }
  async function retirerParticipant(id:string){setOccupe(true);const r=await supabase.from('tourneo_groupe_participants').delete().eq('id',id).eq('groupe_id',selection);if(r.error)setMessage('Retrait impossible.');else await chargerDetails();setOccupe(false);}
  async function partager(e:React.FormEvent){e.preventDefault();setOccupe(true);const r=await supabase.rpc('tourneo_partager_groupe',{p_groupe:selection,p_code:code.trim(),p_role:role});if(r.error)setMessage('Partage impossible : vérifiez le code joueur et vos droits.');else{setCode('');setMessage('Accès enregistré.');await chargerDetails();}setOccupe(false);}
  async function retirerAcces(id:string){setOccupe(true);const r=await supabase.from('tourneo_groupe_membres').delete().eq('groupe_id',selection).eq('user_id',id);if(r.error)setMessage('Retrait impossible.');else{await chargerGroupes();await chargerDetails();}setOccupe(false);}
  async function supprimer(){if(!confirm('Supprimer ce groupe et sa liste partagée ? Les tournois déjà créés conservent leurs participants.'))return;setOccupe(true);const r=await supabase.from('tourneo_groupes').delete().eq('id',selection).eq('user_id',user);if(r.error)setMessage('Suppression impossible.');else await chargerGroupes();setOccupe(false);}
  return <main className="v2-page"><div className="v2-shell"><TourneoNav/><section className="v2-card"><h1>Clubs et accompagnateurs</h1><p>Préparez une liste privée pour votre club ou votre groupe. Les participants n’ont pas besoin de smartphone ni de compte. Utilisez des pseudos et évitez les informations sensibles.</p><form className="v2-form" onSubmit={creer}><label>Nom du groupe<input required maxLength={100} value={nom} onChange={e=>setNom(e.target.value)}/></label><label>Usage<select value={type} onChange={e=>setType(e.target.value as typeof type)}><option value="club">Club / association</option><option value="accompagnement">Groupe accompagné / animation</option></select></label><button disabled={occupe||!user}>Créer le groupe</button></form><label>Mes groupes<select disabled={occupe} value={selection} onChange={e=>{setSelection(e.target.value);setMessage('');}}><option value="">Choisir…</option>{groupes.map(g=><option key={g.id} value={g.id}>{g.nom}{g.user_id===user?' · propriétaire':' · partagé'}</option>)}</select></label><button disabled={occupe} onClick={()=>void chargerGroupes()}>Actualiser</button><p role="status">{message}</p></section>{groupe&&<><section className="v2-card"><h2>{groupe.nom} · {participants.length} participant(s)</h2>{!pret?<p>Chargement de la liste…</p>:<><p>Créer un tournoi produit une copie de la liste : les changements du groupe ne modifient pas les tournois existants.</p><a href={`/tournoi/nouveau?groupe=${selection}`}>Créer un tournoi avec ce groupe</a><div>{participants.map(p=><p key={p.id}>{p.nom} {peutModifier&&<button aria-label={`Retirer ${p.nom}`} disabled={occupe} onClick={()=>void retirerParticipant(p.id)}>Retirer</button>}</p>)}</div>{peutModifier&&<form className="v2-form" onSubmit={ajouter}><label>Ajouter des participants · un nom ou pseudo par ligne<textarea value={noms} maxLength={26000} onChange={e=>setNoms(e.target.value)}/></label><button disabled={occupe||!noms.trim()}>Ajouter à la liste</button></form>}</>}</section><section className="v2-card"><h2>Accès au groupe</h2>{proprietaire&&<form className="v2-form" onSubmit={partager}><label>Code joueur Tourneo de l’accompagnateur<input required maxLength={50} value={code} onChange={e=>setCode(e.target.value)}/></label><label>Droits<select value={role} onChange={e=>setRole(e.target.value as typeof role)}><option value="lecture">Lecture de la liste</option><option value="accompagnateur">Accompagnateur · modifier la liste</option></select></label><button disabled={occupe||!pret}>Accorder cet accès</button></form>}{membres.map(m=><p key={m.user_id}>{identites.find(i=>i.id===m.user_id)?.display_name || 'Compte Tourneo'} · {m.role==='lecture'?'lecture':'accompagnateur'} <button disabled={occupe||!pret} onClick={()=>void retirerAcces(m.user_id)}>{m.user_id===user?'Quitter':'Retirer l’accès'}</button></p>)}{proprietaire&&<button disabled={occupe} onClick={()=>void supprimer()}>Supprimer ce groupe</button>}</section></>}</div></main>;
}
