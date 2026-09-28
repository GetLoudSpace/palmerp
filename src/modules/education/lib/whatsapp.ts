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
    if (!res.ok || !data.messages?.[0]?.id)
      return { success: false, error: typeof data === "string" ? data : JSON.stringify(data).slice(0, 500) };
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
