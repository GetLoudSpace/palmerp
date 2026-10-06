import { normalizePhoneES } from "@/lib/phone";

export interface WhatsAppTemplateParams {
  studentName: string;
  instrumentLabel: string;
  skillsLabel?: string;
  link: string; // agregador
  count?: number;
}

export function buildLessonWhatsAppMessage(p: WhatsAppTemplateParams): string {
  const skills = p.skillsLabel ? ` hemos trabajado ${p.skillsLabel}` : "";
  const count = p.count ?? 0;
  return `¡Hola ${p.studentName}! 🎸 Hoy en tu clase de ${p.instrumentLabel}${skills}. Te dejo ${count || "tus"} recursos para esta semana. Entra aquí (1 link): ${p.link} — ¡a practicar!`;
}

export function buildWaMeUrl(phone: string, text: string): string {
  const clean = normalizePhoneES(phone) || phone.replace(/\D/g, "");
  return `https://api.whatsapp.com/send?phone=${encodeURIComponent(clean)}&text=${encodeURIComponent(text)}`;
}

export async function sendWhatsAppCloudApi(opts: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  templateName: string;
  language?: string;
  params: string[];
}): Promise<{ success: boolean; waMessageId?: string; error?: string }> {
  return postToGraph({
    phoneNumberId: opts.phoneNumberId,
    accessToken: opts.accessToken,
    to: opts.to,
    payload: {
      type: "template",
      template: {
        name: opts.templateName,
        language: { code: opts.language ?? "es" },
        components: [{ type: "body", parameters: opts.params.map((p) => ({ type: "text", text: p })) }],
      },
    },
  });
}

/** Envío de texto libre (ventana 24h). El report de fin de clase usa este.
 *  Fuera de la ventana 24h Meta exige template → usa sendWhatsAppCloudApi. */
export async function sendWhatsAppTextApi(opts: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  body: string;
}): Promise<{ success: boolean; waMessageId?: string; error?: string }> {
  return postToGraph({
    phoneNumberId: opts.phoneNumberId,
    accessToken: opts.accessToken,
    to: opts.to,
    payload: { type: "text", text: { body: opts.body } },
  });
}

/** POST común a Graph API: normaliza teléfono ES, controla no-JSON y unifica errores. */
async function postToGraph(opts: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  payload: Record<string, unknown>;
}): Promise<{ success: boolean; waMessageId?: string; error?: string }> {
  const toNorm = normalizePhoneES(opts.to);
  const url = `https://graph.facebook.com/v20.0/${opts.phoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: toNorm, ...opts.payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.messages?.[0]?.id) {
      const raw = typeof data === "string" ? data : JSON.stringify(data).slice(0, 500);
      // Errores Meta frecuentes, traducidos a acción:
      // 100/33 = phone_number_id inexistente o sin acceso (suele ser el Business Account ID).
      // 131030 = app en pruebas: el destinatario no está en la lista de autorizados.
      // 131047 = fuera de la ventana 24h: el texto libre no vale, hay que usar plantilla.
      // 190 = token caducado o inválido.
      const metaErr = (data as { error?: { code?: number; error_subcode?: number } })?.error;
      if (metaErr?.code === 100) {
        return { success: false, error: "Meta: el phone number ID no existe o el token no tiene acceso a ese número. Revisa que sea el Phone Number ID de WhatsApp > API Setup (no el Business Account ID) y que token y número sean del mismo negocio. Detalle: " + raw.slice(0, 200) };
      }
      if (metaErr?.code === 131030) {
        return { success: false, error: "Meta: tu móvil no está en la lista de destinatarios de prueba. Añádelo en WhatsApp > API Setup (apartado de destinatarios, te llegará un código para confirmar) o pon la app en modo Live. Detalle: " + raw.slice(0, 200) };
      }
      if (metaErr?.code === 131047) {
        return { success: false, error: "Meta: fuera de la ventana de 24h el texto libre no está permitido; hay que enviar una plantilla aprobada. Detalle: " + raw.slice(0, 200) };
      }
      if (metaErr?.code === 190) {
        return { success: false, error: "Meta: el token ha caducado o no es válido. Genera uno nuevo (System User con whatsapp_business_messaging) y guárdalo en Credenciales. Detalle: " + raw.slice(0, 200) };
      }
      return { success: false, error: raw };
    }
    return { success: true, waMessageId: data.messages[0].id as string };
  } catch (e: any) {
    return { success: false, error: String(e?.message ?? e) };
  }
}

export function getTenantSlugForLink(): string {
  if (typeof window !== "undefined") {
    const h = window.location.hostname.split(".")[0];
    return h || "app";
  }
  return "app";
}

export function buildBatchLink(batchToken: string): string {
  if (typeof window !== "undefined") return `${window.location.origin}/r/batch/${batchToken}`;
  return `/r/batch/${batchToken}`;
}
