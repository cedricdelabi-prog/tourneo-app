import { createClient } from "npm:@supabase/supabase-js@2.110.8";
import { executerPurge } from "./purge.mjs";
import { environnementPurgeValide } from "./config.mjs";
Deno.serve(async request => {
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 const ref=Deno.env.get("TOURNEO_PURGE_PROJECT_REF")||"kmjfmjhdnokkaiolxiin";
 // Le défaut conserve exclusivement le projet V2 de test. La production exige
 // TOURNEO_PURGE_PROJECT_REF configuré explicitement et correspondant à SUPABASE_URL.
 if(!environnementPurgeValide(url,ref)||!key)return new Response("Configuration V2 requise",{status:503});
 try {
  return await executerPurge(request,createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}));
 } catch { return new Response("Nettoyage momentanément indisponible",{status:503}); }
});
