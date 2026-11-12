import { supabase } from "@/lib/supabase";

// Persist the object path, never a signed URL that will expire in saved tournaments.
export const referencePhoto = (path: string) => `media-prive:${path}`;

export async function urlPhotoPrivee(reference: string): Promise<string> {
  if (!reference) return "";
  if (reference.startsWith("data:image/") || reference.startsWith("blob:")) return reference;
  let path = reference.startsWith("media-prive:") ? reference.slice(12) : "";
  if (!path) {
    try {
      const url = new URL(reference);
      const attendu = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
      const prefix = "/storage/v1/object/public/tourneo-media/";
      if (url.origin === attendu.origin && url.pathname.startsWith(prefix)) path = decodeURIComponent(url.pathname.slice(prefix.length));
    } catch { /* Unknown references are not sent to external hosts. */ }
  }
  if (!path) return "";
  let duree = 3600;
  const dossiers = path.split("/");
  if (dossiers[1] === "tournois") {
    const r = await supabase.rpc("tourneo_duree_photo", { p_tournoi: dossiers[2] });
    if (r.error || typeof r.data !== "number" || r.data < 1) return "";
    duree = r.data;
  }
  const { data, error } = await supabase.storage.from("tourneo-media").createSignedUrl(path, duree);
  return error ? "" : data.signedUrl;
}
