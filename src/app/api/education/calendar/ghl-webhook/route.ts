import { NextRequest, NextResponse } from "next/server";
import { getTenantIdFromHeaders } from "@/lib/tenant";
import db from "@/lib/db";
import {
  findLessonIdByAppointment,
  getGhlConfig,
  mapGhlStatusToLesson,
} from "@/modules/education/lib/gohighlevel";

/**
 * POST /api/education/calendar/ghl-webhook — entrada GHL → Palmera.
 * Configura en GHL (Workflow → Webhook POST) los eventos AppointmentCreate /
 * AppointmentUpdate / AppointmentCancelled apuntando aquí con `?secret=...`.
 *
 * Seguridad: el secreto debe coincidir con el Setting `ghl_webhook_secret`
 * (o env GHL_WEBHOOK_SECRET). Sin secreto configurado se rechaza todo.
 *
 * Comportamiento: siempre registra en AuditLog. Solo muta la clase si el
 * Setting `ghl_inbound_apply=true` (default false: Palmera es source of truth
 * y así se evitan bucles GHL ↔ Palmera).
 */
export async function POST(req: NextRequest) {
  try {
    const tenantId = await getTenantIdFromHeaders();
    if (!tenantId) return NextResponse.json({ success: false, error: "no tenant" }, { status: 400 });

    const cfg = await getGhlConfig(tenantId);
    if (!cfg.webhookSecret) {
      return NextResponse.json({ success: false, error: "webhook no configurado" }, { status: 403 });
    }
    const url = new URL(req.url);
    const given = url.searchParams.get("secret") || req.headers.get("x-ghl-webhook-secret");
    if (given !== cfg.webhookSecret) {
      return NextResponse.json({ success: false, error: "secreto inválido" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    // Formatos habituales: { type, appointment: {...} } o payload plano con appointmentId
    const type = String(body.type || body.event || body.eventType || "unknown");
    const appt = body.appointment || body.data || body;
    const appointmentId = String(appt?.id || appt?.appointmentId || appt?.eventId || "");
    const status = String(appt?.appointmentStatus || appt?.status || "");

    const lessonId = appointmentId ? await findLessonIdByAppointment(tenantId, appointmentId) : null;

    let applied: string | null = null;
    if (cfg.inboundApply && lessonId) {
      const next = mapGhlStatusToLesson(status);
      if (next) {
        try {
          await (db as any).eduLesson.update({ where: { id: lessonId }, data: { status: next } });
          applied = next;
        } catch {}
      }
    }

    try {
      await (db as any).auditLog.create({
        data: {
          tenantId,
          action: "EDU_GHL_WEBHOOK",
          table: "EduLesson",
          recordId: String(lessonId || appointmentId || "unknown"),
          details: `GHL inbound ${type} status=${status}${applied ? ` → aplicado ${applied}` : " (solo log)"}`,
          success: true,
        },
      });
    } catch {}

    return NextResponse.json({ success: true, matched: Boolean(lessonId), applied });
  } catch (e) {
    return NextResponse.json({ success: false, error: String((e as Error)?.message ?? e) }, { status: 500 });
  }
}
