import { NextResponse } from "next/server";

export const runtime = "nodejs";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

    if (!apiKey || !contactEmail) {
      return NextResponse.json(
        { error: "Le service de contact n’est pas correctement configuré." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const categorie = typeof body?.categorie === "string" ? body.categorie.trim() : "";
    const nom = typeof body?.nom === "string" ? body.nom.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!message || message.length < 3 || message.length > 5000) {
      return NextResponse.json({ error: "Le message n’est pas valide." }, { status: 400 });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "L’adresse e-mail n’est pas valide." }, { status: 400 });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Tourneo <onboarding@resend.dev>",
        to: [contactEmail],
        subject: `Tourneo - ${categorie || "Contact"}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#111827">
            <div style="padding:22px;border-radius:18px;background:#0B1220;color:#fff">
              <div style="font-size:12px;font-weight:700;color:#72E7FF;text-transform:uppercase">Nouveau message Tourneo</div>
              <h1 style="font-size:24px;margin:8px 0 0">${escapeHtml(categorie || "Contact")}</h1>
            </div>
            <div style="padding:22px">
              <p><strong>Nom / pseudo :</strong> ${escapeHtml(nom || "Non renseigné")}</p>
              <p><strong>E-mail :</strong> ${escapeHtml(email || "Non renseigné")}</p>
              <p><strong>Catégorie :</strong> ${escapeHtml(categorie || "Non renseignée")}</p>
              <div style="margin-top:24px;padding:18px;border-radius:14px;background:#F3F4F6;white-space:pre-wrap;line-height:1.6">${escapeHtml(message)}</div>
            </div>
          </div>`,
        text: `Nouveau message Tourneo\n\nCatégorie : ${categorie || "Non renseignée"}\nNom / pseudo : ${nom || "Non renseigné"}\nE-mail : ${email || "Non renseigné"}\n\n${message}`,
        ...(email ? { reply_to: email } : {}),
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("Erreur Resend :", data);
      return NextResponse.json(
        { error: "L’envoi du message a échoué. Réessayez dans quelques instants." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erreur API contact :", error);
    return NextResponse.json(
      { error: "Une erreur est survenue pendant l’envoi." },
      { status: 500 }
    );
  }
}
