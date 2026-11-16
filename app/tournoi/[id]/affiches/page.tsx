"use client";
import { useParams } from 'next/navigation';
import AffichesTournoi from '@/components/AffichesTournoi';
import TourneoNav from '@/components/TourneoNav';
import { tr, useLangue } from '@/lib/langue';

export default function CommunicationTournoi() {
  useLangue();
  const { id } = useParams<{ id: string }>();
  return <main className="v2-page"><div className="v2-shell">
    <TourneoNav />
    <p><a href={`/tournoi/${id}?etape=communication`}>{tr('Retour au tournoi')}</a></p>
    <AffichesTournoi id={id} />
  </div></main>;
}
