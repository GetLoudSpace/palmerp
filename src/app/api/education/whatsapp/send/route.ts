import { NextResponse } from "next/server";
import db, { withTenantContext } from "@/lib/db";
import { requireModuleAccess } from "@/lib/requireModule";
import { sendWhatsAppCloudApi } from "@/modules/education/lib/whatsapp";
import { resolveWhatsAppConfig, vaultSourceKind } from "@/modules/education/lib/whatsappConfig";

function maskPhone(to: string): string {
  const digits = to.replace(/\D/g, "");
  return digits.length > 3 ? `***${digits.slice(-3)}` : "***";
}

export async function POST(req: Request) {
  const auth = await requireModuleAccess("EDUCACION");
  if ("error" in auth) return auth.error;
  // Tenant SIEMPRE de la sesión (servidor). Nunca de headers/body: el middleware
  // no fija x-tenant-id y el body lo controla el cliente.
  const { tenantId } = auth;

  try {
    const body = await req.json().catch(()=> ({}));
    const { to, batchToken, lessonId, link, body: textBody } = body as { to?: string; batchToken?: string; lessonId?: string; link?: string; body?: string };
    if (!to || !link) return NextResponse.json({ success:false, error:"to y link requeridos" }, { status:400 });

    // Fuente única: vault cifrado por tenant > env (acepta ambos nombres históricos).
    const waConfig = await resolveWhatsAppConfig(tenantId);
    const phoneId = waConfig.phoneNumberId;
    const token = waConfig.token;
    const template = waConfig.template;

    if (!phoneId || !token) {
      // dryRun: no creds → tell frontend to use wa.me
      return NextResponse.json({ success:true, dryRun:true, waMeFallback:true, link, whatsappConfigured:false, whatsappSource: vaultSourceKind(waConfig) }, { status:200 });
    }

    // Extract studentName for template params — body parsing
    const studentName = (textBody || "").split("!")[0]?.replace("¡Hola ","").trim() || "alumno";
    const instrument = "clase";
    const result = await sendWhatsAppCloudApi({ phoneNumberId: phoneId, accessToken: token, to, templateName: template, params: [studentName, instrument, link] });

    if (result.success) {
      try {
        await withTenantContext(tenantId, async (tx)=>{
          // log outbox
          const student = await (tx as any).eduStudent?.findFirst?.({ where:{ tenantId } }).catch(()=>null);
          // we log without strict FK if student not found (demo)
          if ((tx as any).eduOutboxMessage?.create) {
            await (tx as any).eduOutboxMessage.create({ data:{ tenantId, studentId: student?.id ?? (await (tx as any).eduStudent.findFirst({where:{tenantId}}))?.id ?? "unknown", lessonId: lessonId || null, toPhone: to, body: textBody || link, link, batchToken: batchToken || null, status:"SENT", waMessageId: result.waMessageId || null, sentAt: new Date() } });
          }
          if ((tx as any).auditLog?.create) {
            await (tx as any).auditLog.create({ data:{ tenantId, action:"EDU_WHATSAPP_SENT", table:"EduOutboxMessage", recordId: batchToken || "batch", details: `WhatsApp Cloud API a ${maskPhone(to)} link ${link}`, success:true } });
          }
        });
      } catch {}
    }

    if (!result.success) return NextResponse.json({ success:false, error: result.error, fallbackWaMe:true, link }, { status:500 });
    return NextResponse.json({ success:true, waMessageId: result.waMessageId, link, whatsappConfigured:true, whatsappSource: vaultSourceKind(waConfig) });
  } catch (e:any) {
    return NextResponse.json({ success:false, error: String(e?.message ?? e) }, { status:500 });
  }
}
