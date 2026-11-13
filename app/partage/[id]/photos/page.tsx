"use client";
import {useParams}from'next/navigation';import AlbumPublic from'@/components/AlbumPublic';import TourneoRetour from'@/components/TourneoRetour';import SelecteurLangue from'@/components/SelecteurLangue';import{tr,useLangue}from'@/lib/langue';
export default function PhotosPartagees(){useLangue();const{id}=useParams<{id:string}>();return <main className="v2-page"><div className="v2-shell"><div className="tourneo-section-heading"><TourneoRetour href={`/partage/${id}`}>{tr('Retour au tournoi')}</TourneoRetour><SelecteurLangue/></div><AlbumPublic id={id}/></div></main>;}
