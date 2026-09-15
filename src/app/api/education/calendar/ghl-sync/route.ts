import { NextRequest, NextResponse } from "next/server";
import { getTenantIdFromHeaders } from "@/lib/tenant";
import db from "@/lib/db";
import {
  clearGhlAppointmentId,
  createGhlAppointment,
  deleteGhlAppointment,
  ensureGhlContact,
  getGhlAppointmentId,
  getGhlConfig,
  saveGhlAppointmentId,
  triggerGhlWorkflow,
  updateGhlAppointment,
} from "@/modules/education/lib/gohighlevel";

/**
 * POST /api/education/calendar/ghl-sync — espeja una clase en GoHighLevel.
 * body: { lessonId, lesson }
 * - Sin config (token/location/calendar o sync desactivado) → { skipped: true }.
 * - Crea el contacto del alumno si no existe, crea o actualiza el appointment.
 * - Dispara el workflow de "clase creada" si hay URL configurada.
 * Palmera sigue siendo source of truth; GHL es espejo + workflows.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { lessonId, lesson } = body as { lessonId?: string; lesson?: any };
    if (!lesson) return NextResponse.json({ success: false, error: "lesson requerido" }, { status: 400 });
    const tenantId = (await getTenantIdFromHeaders()) || lesson?.tenantId || null;
    if (!tenantId) return NextResponse.json({ success: true, skipped: true, reason: "no tenant" });

    const cfg = await getGhlConfig(tenantId);
    if (!cfg.enabled || !cfg.apiToken || !cfg.locationId || !cfg.calendarId) {
      return NextResponse.json({ success: true, skipped: true, reason: "GHL no configurado" });
    }

    const contact = await ensureGhlContact({
      token: cfg.apiToken,
      locationId: cfg.locationId,
      name: lesson.studentName || "Alumno",
      email: lesson.studentEmail || undefined,
      phone: lesson.studentPhone || undefined,
    });
    if (!contact.contactId) {
      return NextResponse.json({ success: false, error: contact.error || "Sin contacto GHL" }, { status: 502 });
    }

    const mapped = lessonId ? await getGhlAppointmentId(tenantId, lessonId) : null;
    let appointmentId = mapped;
    if (mapped) {
      const upd = await updateGhlAppointment({ token: cfg.apiToken, appointmentId: mapped, lesson });
      if (!upd.ok && upd.error?.includes("404")) appointmentId = null; // ya no existe → recrear
      else if (!upd.ok) return NextResponse.json({ success: false, error: upd.error }, { status: 502 });
    }
    if (!appointmentId) {
      const created = await createGhlAppointment({
        token: cfg.apiToken,
        locationId: cfg.locationId,
        calendarId: cfg.calendarId,
        contactId: contact.contactId,
        lesson,
      });
      if (!created.appointmentId) {
        return NextResponse.json({ success: false, error: created.error }, { status: 502 });
      }
      appointmentId = created.appointmentId;
      if (lessonId) await saveGhlAppointmentId(tenantId, lessonId, appointmentId).catch(() => null);
    }

    // Workflow de GHL (recordatorios, follow-ups…): fire-and-forget
    triggerGhlWorkflow(cfg.workflowClassCreatedUrl, {
      event: "class_created",
      lessonId: lessonId || null,
      appointmentId,
      studentName: lesson.studentName,
      instrument: lesson.instrument,
      date: lesson.date,
      durationMin: lesson.durationMin,
    }).catch(() => null);

    try {
      await (db as any).auditLog.create({
        data: {
          tenantId,
          action: "EDU_GHL_SYNCED",
          table: "EduLesson",
          recordId: String(lessonId || ""),
          details: `Clase espejada en GHL appointment ${appointmentId}`,
          success: true,
        },
      });
    } catch {}

    return NextResponse.json({ success: true, appointmentId });
  } catch (e) {
    return NextResponse.json({ success: false, error: String((e as Error)?.message ?? e) }, { status: 500 });
  }
}

/**
 * DELETE /api/education/calendar/ghl-sync — borra el espejo en GHL.
 * body: { lessonId?, appointmentId? } (uno de los dos)
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { lessonId, appointmentId } = body as { lessonId?: string; appointmentId?: string };
    const tenantId = await getTenantIdFromHeaders();
    if (!tenantId) return NextResponse.json({ success: true, skipped: true, reason: "no tenant" });

    const cfg = await getGhlConfig(tenantId);
    if (!cfg.enabled || !cfg.apiToken) {
      return NextResponse.json({ success: true, skipped: true, reason: "GHL no configurado" });
    }
    const apptId = appointmentId || (lessonId ? await getGhlAppointmentId(tenantId, lessonId) : null);
    if (!apptId) return NextResponse.json({ success: true, skipped: true, reason: "sin espejo" });

    const del = await deleteGhlAppointment({ token: cfg.apiToken, appointmentId: apptId });
    if (lessonId) await clearGhlAppointmentId(tenantId, lessonId).catch(() => null);

    triggerGhlWorkflow(cfg.workflowClassCancelledUrl, {
      event: "class_cancelled",
      lessonId: lessonId || null,
      appointmentId: apptId,
    }).catch(() => null);

    try {
      await (db as any).auditLog.create({
        data: {
          tenantId,
          action: "EDU_GHL_DELETED",
          table: "EduLesson",
          recordId: String(lessonId || ""),
          details: `Espejo GHL ${apptId} eliminado`,
          success: del.ok,
          error: del.ok ? null : del.error,
        },
      });
    } catch {}

    return NextResponse.json({ success: del.ok, error: del.error });
  } catch (e) {
    return NextResponse.json({ success: false, error: String((e as Error)?.message ?? e) }, { status: 500 });
  }
}
