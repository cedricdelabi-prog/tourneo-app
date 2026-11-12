import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// This branch must never write into Tourneo V1, even after a deployment mistake.
if (!url || new URL(url).hostname !== "kmjfmjhdnokkaiolxiin.supabase.co") {
  throw new Error("Tourneo V2 : configurez le projet Supabase tourneo-v2-test avant de démarrer.");
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
