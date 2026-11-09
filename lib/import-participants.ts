/** Read a UTF-8 Excel CSV (semicolon/comma) or a one-name-per-line list. */
export function lireParticipantsCSV(source: string): string[] {
  const texte = source.replace(/^\uFEFF/, "");
  if (texte.length > 500_000) throw new Error("Fichier trop volumineux (500 Ko maximum).");
  const premiereLigne = texte.split(/\r?\n/, 1)[0];
  const separateur = premiereLigne.includes(";") ? ";" : ",";
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
  const entetes = lignes[0]?.map((c) => c.trim().toLocaleLowerCase("fr")) ?? [];
  const indexNom = entetes.findIndex((c) => ["nom", "participant", "joueur", "équipe", "equipe", "name"].includes(c));
  const noms = (indexNom >= 0 ? lignes.slice(1) : lignes).map((l) => (l[indexNom >= 0 ? indexNom : 0] ?? "").trim()).filter(Boolean);
  if (noms.some((nom) => nom.length > 100)) throw new Error("Un nom dépasse 100 caractères.");
  if (noms.length > 256) throw new Error("Import limité à 256 participants.");
  return [...new Map(noms.map((nom) => [nom.toLocaleLowerCase("fr"), nom])).values()];
}
