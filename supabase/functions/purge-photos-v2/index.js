import { createClient } from "npm:@supabase/supabase-js@2.110.8";
import { executerPurge } from "./purge.mjs";
Deno.serve(async request => {
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(url!=="https://kmjfmjhdnokkaiolxiin.supabase.co"||!key)return new Response("Configuration V2 requise",{status:503});
 try {
  return await executerPurge(request,createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}));
 } catch { return new Response("Nettoyage momentanément indisponible",{status:503}); }
});
