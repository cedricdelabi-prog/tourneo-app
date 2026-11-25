import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "How to organise a badminton tournament | Tourneo",
  description: "Plan badminton groups, match counts, court schedules and standings with Tourneo.",
  alternates: {"canonical":"https://www.tourneo.org/guides/tournoi-badminton/en","languages":{"fr":"https://www.tourneo.org/guides/tournoi-badminton","en":"https://www.tourneo.org/guides/tournoi-badminton/en","de":"https://www.tourneo.org/guides/tournoi-badminton/de","x-default":"https://www.tourneo.org/guides/tournoi-badminton"}},
};

export default function Page() {
  return <main lang="en" style={{ maxWidth: 840, margin: 'auto', padding: '48px 20px', color: 'white', lineHeight: 1.7 }}>
    <nav aria-label="Languages"><Link href="/guides/tournoi-badminton" lang="fr">Français</Link> · <Link href="/guides/tournoi-badminton/en" lang="en">English</Link> · <Link href="/guides/tournoi-badminton/de" lang="de">Deutsch</Link></nav>
    <h1>How to organise a badminton tournament</h1>
    <section><h2>Choose the format</h2><p>Decide whether participants play singles or doubles. Set the number of courts, scoring rules and tie-break rules before registration.</p></section>
    <section><h2>Example: 16 singles players</h2><p>Four groups of four players produce six matches each, or 24 group matches. If the top two in each group advance, quarter-finals, semi-finals and the final add seven matches, for 31 in total.</p></section>
    <section><h2>Plan the schedule</h2><p>With four courts and 20-minute slots, group play takes at least six slots or two hours. Allow extra time for breaks and delays, plus three slots for the knockout rounds.</p></section>
    <section><h2>Track results</h2><p>Enter players, prepare fixtures and record results as the tournament progresses.</p></section>
    <p><Link href="/login?mode=inscription">Create a badminton tournament</Link></p>
  </main>;
}
