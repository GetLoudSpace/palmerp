// src/app/api/admin/credentials/test/route.ts
// Prueba una credencial del vault SIN revelarla: el servidor descifra en memoria,
// envía un mensaje de prueba y devuelve solo éxito/error. SOLO ADMIN/DEV.
import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireVaultAdmin } from "@/lib/requireVaultAdmin";
import { resolveWhatsAppConfig } from "@/modules/education/lib/whatsappConfig";
import { sendWhatsAppTextApi } from "@/modules/education/lib/whatsapp";

function maskPhone(to: string): string {
  const digits = to.replace(/\D/g, "");
  return digits.length > 3 ? `***${digits.slice(-3)}` : "***";
}

export async function POST(request: Request) {
  const auth = await requireVaultAdmin();
  if ("error" in auth) return auth.error;
  const { tenantId, id: userId } = auth.user;

  const body = await request.json().catch(() => ({}));
  const { to } = body as { to?: unknown };
  if (typeof to !== "string" || to.replace(/\D/g, "").length < 9) {
    return NextResponse.json({ error: "Indica un móvil válido para la prueba" }, { status: 400 });
  }

  const wa = await resolveWhatsAppConfig(tenantId);
  if (!wa.configured || !wa.token || !wa.phoneNumberId) {
    return NextResponse.json(
      { success: false, error: "WhatsApp no configurado en el vault (guarda token + phone number id primero)" },
      { status: 400 }
    );
  }

  const sent = await sendWhatsAppTextApi({
    phoneNumberId: wa.phoneNumberId,
    accessToken: wa.token,
    to,
    body: "✅ Prueba Palmera: tus credenciales de WhatsApp funcionan. (Puedes borrar este mensaje)",
  });

  try {
    await db.auditLog.create({
      data: {
        tenantId,
        userId,
        action: "CREDENTIAL_TESTED",
        table: "Setting",
        recordId: "whatsapp_token",
        details: `Prueba WhatsApp → ${maskPhone(to)}: ${sent.success ? "OK" : "FALLO"}`,
        success: sent.success,
        error: sent.success ? undefined : sent.error?.slice(0, 300),
      },
    });
  } catch {}

  if (!sent.success) {
    return NextResponse.json({ success: false, error: sent.error ?? "Meta rechazó el envío" }, { status: 502 });
  }
  return NextResponse.json({ success: true, waMessageId: sent.waMessageId, to: maskPhone(to) });
}
