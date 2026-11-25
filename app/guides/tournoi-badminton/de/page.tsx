import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Ein Badmintonturnier organisieren | Tourneo",
  description: "Gruppen, Spielanzahl, Spielfelder und Tabellen für ein Badminton-Freizeitturnier mit Tourneo planen.",
  alternates: {"canonical":"https://www.tourneo.org/guides/tournoi-badminton/de","languages":{"fr":"https://www.tourneo.org/guides/tournoi-badminton","en":"https://www.tourneo.org/guides/tournoi-badminton/en","de":"https://www.tourneo.org/guides/tournoi-badminton/de","x-default":"https://www.tourneo.org/guides/tournoi-badminton"}},
};

export default function Page() {
  return <main lang="de" style={{ maxWidth: 840, margin: 'auto', padding: '48px 20px', color: 'white', lineHeight: 1.7 }}>
    <nav aria-label="Languages"><Link href="/guides/tournoi-badminton" lang="fr">Français</Link> · <Link href="/guides/tournoi-badminton/en" lang="en">English</Link> · <Link href="/guides/tournoi-badminton/de" lang="de">Deutsch</Link></nav>
    <h1>Ein Badmintonturnier organisieren</h1>
    <section><h2>Turnierformat wählen</h2><p>Legen Sie Einzel oder Doppel, die Anzahl der Felder und die Wertungsregeln vor der Anmeldung fest.</p></section>
    <section><h2>Beispiel: 16 Einzelspieler</h2><p>Vier Gruppen mit je vier Personen ergeben sechs Spiele pro Gruppe, also 24 Gruppenspiele. Qualifizieren sich die jeweils besten zwei, kommen sieben Spiele im Viertelfinale, Halbfinale und Finale hinzu: insgesamt 31 Spiele.</p></section>
    <section><h2>Zeitplan vorbereiten</h2><p>Bei vier Feldern und 20 Minuten je Spielblock dauert die Gruppenphase mindestens sechs Blöcke, also zwei Stunden. Planen Sie Pausen und Verzögerungen sowie drei weitere Blöcke für die Finalrunde ein.</p></section>
    <section><h2>Ergebnisse erfassen</h2><p>Mit Tourneo tragen Sie Spieler und Ergebnisse ein, planen Begegnungen und verfolgen die Tabelle.</p></section>
    <p><Link href="/login?mode=inscription">Badmintonturnier erstellen</Link></p>
  </main>;
}
