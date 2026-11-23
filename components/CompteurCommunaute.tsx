"use client";

import {useEffect, useState} from "react";
import {supabase} from "@/lib/supabase";
import {tr, trModele, useLangue} from "@/lib/langue";
import {lireMinimumCommunautaire} from "@/lib/compteur-communaute";
import styles from "./DecouvrirTourneo.module.css";

/** Hidden until the public aggregate is available; no made-up signup count. */
export default function CompteurCommunaute() {
  useLangue();
  const [minimum, setMinimum] = useState<number | null>(null);

  useEffect(() => {
    let actif = true;
    const charger = async () => {
      try {
        const {data, error} = await supabase.rpc("tourneo_communaute_publique");
        if (error || !actif) return;
        setMinimum(lireMinimumCommunautaire(data));
      } catch {
        // The database function is not yet deployed: hide the badge.
      }
    };
    void charger();
    return () => { actif = false; };
  }, []);

  if (minimum === null) return null;
  return <div className={styles.preuveSociale} role="status" aria-live="polite">
    <span aria-hidden="true" className={styles.preuveSocialeIcone}/>
    <strong className={styles.preuveSocialeNombre}>
      {trModele("Déjà {0}+ inscrits sur Tourneo", minimum)}
    </strong>
    <span className={styles.preuveSocialeDetail}>{tr("Comptes confirmés")}</span>
  </div>;
}
