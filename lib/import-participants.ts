/** Read a UTF-8 Excel CSV (semicolon/comma) or a one-name-per-line list. */
export function lireParticipantsCSV(source: string): string[] {
  const texte = source.replace(/^\uFEFF/, "");
  if (texte.length > 500_000) throw new Error("Fichier trop volumineux (500 Ko maximum).");
  const premiereLigne = texte.split(/\r?\n/, 1)[0];
  let dansGuillemets = false, virgules = 0, pointsVirgules = 0;
  for (let i = 0; i < premiereLigne.length; i++) {
    if (premiereLigne[i] === '"') {
      if (dansGuillemets && premiereLigne[i + 1] === '"') i++;
      else dansGuillemets = !dansGuillemets;
    } else if (!dansGuillemets) {
      if (premiereLigne[i] === ';') pointsVirgules++;
      if (premiereLigne[i] === ',') virgules++;
    }
  }
  const separateur = pointsVirgules > virgules ? ";" : ",";
  const lignes: string[][] = [];
  let ligne: string[] = [], champ = "", guillemets = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (c === '"') {
      if (guillemets && texte[i + 1] === '"') { champ += '"'; i++; }
      else guillemets = !guillemets;
    } else if (!guillemets && c === separateur) { ligne.push(champ); champ = ""; }
    else if (!guillemets && (c === "\n" || c === "\r")) {
      if (c === "\r" && texte[i + 1] === "\n") i++;
      ligne.push(champ); lignes.push(ligne); ligne = []; champ = "";
    } else champ += c;
  }
  if (guillemets) throw new Error("Guillemets non fermés dans le CSV.");
  ligne.push(champ); lignes.push(ligne);
  return lireLignesParticipants(lignes);
}

export function lireLignesParticipants(lignes: unknown[][]): string[] {
  lignes = lignes.filter(l => l.some(c => c != null && String(c).trim() !== ''));
  const entetes = lignes[0]?.map(c => typeof c === 'string' ? c.trim().toLocaleLowerCase('fr') : '') ?? [];
  const indexNom = entetes.findIndex(c => ['nom', 'participant', 'joueur', 'équipe', 'equipe', 'name', 'pseudo', 'nom affiché', 'nom / pseudo'].includes(c));
  const noms = (indexNom >= 0 ? lignes.slice(1) : lignes).map(l => {
    const valeur = l[indexNom >= 0 ? indexNom : 0];
    if (valeur == null) return '';
    if (typeof valeur !== 'string' && typeof valeur !== 'number') throw new Error('La colonne Nom doit contenir des noms ou des pseudos.');
    return String(valeur).trim();
  }).filter(Boolean);
  if (noms.some((nom) => nom.length > 100)) throw new Error("Un nom dépasse 100 caractères.");
  if (noms.length > 256) throw new Error("Import limité à 256 participants.");
  return [...new Map(noms.map((nom) => [nom.toLocaleLowerCase("fr"), nom])).values()];
}

export function nomsAAjouter(existants: readonly string[], importes: readonly string[]): string[] {
  const vus = new Set(existants.map(n => n.trim().toLocaleLowerCase('fr')));
  const ajouts = importes.filter(n => { const cle = n.trim().toLocaleLowerCase('fr'); if (vus.has(cle)) return false; vus.add(cle); return true; });
  if (existants.length + ajouts.length > 256) throw new Error('Le tournoi dépasserait 256 participants. Réduisez la liste avant de réessayer.');
  return ajouts;
}

// Inspect ZIP metadata before decompression so a small compressed file cannot
// expand into hundreds of megabytes in the player's browser.
export function verifierArchiveExcel(buffer: ArrayBuffer) {
  const v = new DataView(buffer);
  const invalide = () => { throw new Error('Fichier Excel invalide. Utilisez un fichier .xlsx non chiffré ou exportez en CSV.'); };
  if (v.byteLength < 22) return invalide();
  let fin = -1;
  for (let i = v.byteLength - 22; i >= Math.max(0, v.byteLength - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50 && i + 22 + v.getUint16(i + 20, true) === v.byteLength) { fin = i; break; }
  }
  if (fin < 0 || v.getUint16(fin + 4, true) || v.getUint16(fin + 6, true)) return invalide();
  const nombre = v.getUint16(fin + 10, true), taille = v.getUint32(fin + 12, true), debut = v.getUint32(fin + 16, true);
  if (!nombre || nombre > 512 || v.getUint16(fin + 8, true) !== nombre || debut + taille !== fin) return invalide();
  let position = debut, total = 0;
  const noms = new Set<string>();
  for (let i = 0; i < nombre; i++) {
    if (position + 46 > fin || v.getUint32(position, true) !== 0x02014b50) return invalide();
    const flags = v.getUint16(position + 8, true), methode = v.getUint16(position + 10, true);
    const compresse = v.getUint32(position + 20, true), brut = v.getUint32(position + 24, true);
    const nomTaille = v.getUint16(position + 28, true), extra = v.getUint16(position + 30, true), commentaire = v.getUint16(position + 32, true);
    const local = v.getUint32(position + 42, true), suivant = position + 46 + nomTaille + extra + commentaire;
    if (suivant > fin || flags & 1 || ![0, 8].includes(methode) || local + 30 > debut || v.getUint32(local, true) !== 0x04034b50) return invalide();
    if (local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true) + compresse > debut) return invalide();
    total += brut;
    if (total > 10_000_000) throw new Error('Classeur trop complexe après décompression (10 Mo maximum). Copiez la liste dans un nouveau fichier ou exportez en CSV.');
    const nom = new TextDecoder().decode(new Uint8Array(buffer, position + 46, nomTaille));
    if (noms.has(nom)) return invalide();
    noms.add(nom); position = suivant;
  }
  if (position !== fin || !noms.has('xl/workbook.xml') || !noms.has('[Content_Types].xml')) return invalide();
}

export async function lireFichierParticipants(fichier: File): Promise<string[]> {
  if (fichier.size > 500_000) throw new Error('Fichier trop volumineux (500 Ko maximum).');
  if (/\.xls$/i.test(fichier.name)) throw new Error('Enregistrez ce classeur au format .xlsx ou CSV avant de l’importer.');
  if (/\.xlsx$/i.test(fichier.name)) {
    verifierArchiveExcel(await fichier.arrayBuffer());
    const { readSheet } = await import('read-excel-file/browser');
    const lignes = await readSheet(fichier, 1);
    return lireLignesParticipants(lignes);
  }
  if (!/\.(csv|txt)$/i.test(fichier.name)) throw new Error('Choisissez un fichier Excel .xlsx, CSV ou texte.');
  return lireParticipantsCSV(await fichier.text());
}
