"use client";
import{useParams}from'next/navigation';import PronosticsGestion from'@/components/PronosticsGestion';import TourneoNav from'@/components/TourneoNav';
export default function GestionPronostics(){const{id}=useParams<{id:string}>();return <main className="v2-page"><div className="v2-shell"><TourneoNav active="tournoi" backHref={`/tournoi/${id}`} backLabel="Retour au tournoi"/><PronosticsGestion id={id}/></div></main>;}
