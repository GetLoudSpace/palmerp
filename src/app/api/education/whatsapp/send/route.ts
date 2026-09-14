import { NextRequest, NextResponse } from "next/server";
import db, { withTenantContext } from "@/lib/db";
import { getTenantIdFromHeaders, getTenantSlugFromHeaders } from "@/lib/tenant";
import { sendWhatsAppCloudApi } from "@/modules/education/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(()=> ({}));
    const { to, batchToken, lessonId, link, body: textBody } = body as { to?: string; batchToken?: string; lessonId?: string; link?: string; body?: string };
    if (!to || !link) return NextResponse.json({ success:false, error:"to y link requeridos" }, { status:400 });

    const tenantId = await getTenantIdFromHeaders();
    const tenantSlug = await getTenantSlugFromHeaders();
    // Try DB settings for Cloud API creds (Setting keys: whatsapp_phone_id, whatsapp_token, whatsapp_template)
    let phoneId: string | null = null;
    let token: string | null = null;
    let template = "edu_lesson_followup";
    if (tenantId) {
      try {
        const settings = await db.setting.findMany({ where: { tenantId, key: { in: ["whatsapp_phone_id","whatsapp_token","whatsapp_template"] } } });
        phoneId = settings.find(s=>s.key==="whatsapp_phone_id")?.value ?? null;
        token = settings.find(s=>s.key==="whatsapp_token")?.value ?? null;
        template = settings.find(s=>s.key==="whatsapp_template")?.value ?? template;
      } catch {}
      // fallback env
      phoneId = phoneId || process.env.WHATSAPP_PHONE_NUMBER_ID || null;
      token = token || process.env.WHATSAPP_ACCESS_TOKEN || null;
    } else {
      phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || null;
      token = process.env.WHATSAPP_ACCESS_TOKEN || null;
    }

    if (!phoneId || !token) {
      // dryRun: no creds → tell frontend to use wa.me
      return NextResponse.json({ success:true, dryRun:true, waMeFallback:true, link }, { status:200 });
    }

    // Extract studentName for template params — body parsing
    const studentName = (textBody || "").split("!")[0]?.replace("¡Hola ","").trim() || "alumno";
    const instrument = "clase";
    const result = await sendWhatsAppCloudApi({ phoneNumberId: phoneId, accessToken: token, to, templateName: template, params: [studentName, instrument, link] });

    if (tenantId && result.success) {
      try {
        await withTenantContext(tenantId, async (tx)=>{
          // log outbox
          const student = await (tx as any).eduStudent?.findFirst?.({ where:{ tenantId } }).catch(()=>null);
          // we log without strict FK if student not found (demo)
          if ((tx as any).eduOutboxMessage?.create) {
            await (tx as any).eduOutboxMessage.create({ data:{ tenantId, studentId: student?.id ?? (await (tx as any).eduStudent.findFirst({where:{tenantId}}))?.id ?? "unknown", lessonId: lessonId || null, toPhone: to, body: textBody || link, link, batchToken: batchToken || null, status:"SENT", waMessageId: result.waMessageId || null, sentAt: new Date() } });
          }
          if ((tx as any).auditLog?.create) {
            await (tx as any).auditLog.create({ data:{ tenantId, action:"EDU_WHATSAPP_SENT", table:"EduOutboxMessage", recordId: batchToken || "batch", details: `WhatsApp Cloud API a ${to} link ${link}`, success:true } });
          }
        });
      } catch {}
    }

    if (!result.success) return NextResponse.json({ success:false, error: result.error, fallbackWaMe:true, link }, { status:500 });
    return NextResponse.json({ success:true, waMessageId: result.waMessageId, link });
  } catch (e:any) {
    return NextResponse.json({ success:false, error: String(e?.message ?? e) }, { status:500 });
  }
}
