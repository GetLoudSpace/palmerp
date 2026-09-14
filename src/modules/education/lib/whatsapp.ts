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
  const toNorm = normalizePhoneES(opts.to);
  const url = `https://graph.facebook.com/v20.0/${opts.phoneNumberId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to: toNorm,
    type: "template",
    template: {
      name: opts.templateName,
      language: { code: opts.language ?? "es" },
      components: [{ type: "body", parameters: opts.params.map((p) => ({ type: "text", text: p })) }],
    },
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: JSON.stringify(data) };
    const waId = data.messages?.[0]?.id;
    return { success: true, waMessageId: waId };
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
