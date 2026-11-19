import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// This branch must never write into Tourneo V1, even after a deployment mistake.
const isTest = !!url && new URL(url).hostname === "kmjfmjhdnokkaiolxiin.supabase.co";
const isProduction = !!url && new URL(url).hostname === "gjtxlzhfqcecyfciyllc.supabase.co";
// Production is opt-in and MUST stay disabled until schema migration, backups and acceptance tests are complete.
const productionApproved = process.env.NEXT_PUBLIC_TOURNEO_V2_PRODUCTION_APPROVED === "true";
if (!isTest && !(isProduction && productionApproved)) {
  throw new Error("Tourneo V2 : base non autorisée. La production V1 exige une migration vérifiée et une activation explicite.");
}

export const supabase = createClient(
  url,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
