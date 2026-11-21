import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const headers = { "Cache-Control": "private, no-store" };
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !uuid.test(id)) {
    return NextResponse.json({ error: "Lien de partage invalide." }, { status: 400, headers });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const token = process.env.TOURNEO_SHARE_SERVER_TOKEN;
  if (!url || !key || !token || process.env.NEXT_PUBLIC_TOURNEO_V2_PRODUCTION_APPROVED !== "true") {
    return NextResponse.json({ error: "Partage indisponible." }, { status: 503, headers });
  }

  const supabase = createClient(url, key, {
    global: { headers: { "x-tourneo-share-token": token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("tourneo_partage_web_v2", { p_id: id });

  if (error) {
    return NextResponse.json({ error: "Partage indisponible." }, { status: 502, headers });
  }
  if (!data) {
    return NextResponse.json({ error: "Tournoi introuvable." }, { status: 404, headers });
  }

  return NextResponse.json(data, { headers });
}
