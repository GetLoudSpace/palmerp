// src/app/api/education/report/route.ts
// Reporte fin de clase → WhatsApp multi-destinatario (tutor único + alumno según commsMode).
// Contact es fuente de verdad: el teléfono sale de Contact, nunca del studentId.
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireModuleAccess } from '@/lib/requireModule';
import {
  getReportRecipients,
  sendableRecipients,
  type EduCommsMode,
  type RecipientRole,
} from '@/modules/education/lib/recipients';
import { resolveWhatsAppConfig, vaultSourceKind } from '@/modules/education/lib/whatsappConfig';
import { sendWhatsAppTextApi } from '@/modules/education/lib/whatsapp';

export async function POST(request: Request) {
  const auth = await requireModuleAccess('EDUCACION');
  if ('error' in auth) return auth.error;
  const { session, tenantId } = auth;

  const body = await request.json().catch(() => ({}));
  const { studentId, lessonId, done, todo, commsMode: commsOverride, recipients: recipientsOverride, batchToken, link } = body as {
    studentId?: string;
    lessonId?: string;
    done?: string;
    todo?: string;
    commsMode?: EduCommsMode;
    recipients?: { contactId: string; role: RecipientRole; toPhone?: string; label?: string }[];
    batchToken?: string;
    link?: string;
  };
  if (!studentId || !lessonId) {
    return NextResponse.json({ error: 'studentId and lessonId required' }, { status: 400 });
  }

  // tenantId ya verificado por requireModuleAccess (sesión servidor).

  // Cuerpo del mensaje (misma plantilla que el cliente para coherencia)
  const message =
    `Hola,\nResumen de la clase de hoy:\n` +
    (done ? `Hecho: ${done}\n` : '') +
    (todo ? `Tarea: ${todo}\n` : '') +
    (link ? `Recursos: ${link}\n` : '');

  // 1. Resolver EduStudent + Contact alumno + Contact tutor (teléfonos reales).
  // Si la ficha aún solo vive en localStorage (sin Prisma), NO 404: el cliente
  // manda los destinatarios ya resueltos con teléfono y se envía por Cloud API
  // sin outbox (requiere studentId real). Ver src/app/api/education/report/route.ts:39.
  const student = await db.eduStudent.findFirst({
    where: { id: studentId, tenantId },
    include: { contact: true, tutorContact: true },
  });
  if (!student) {
    const localTargets = (Array.isArray(recipientsOverride) ? recipientsOverride : [])
      .filter((r) => r && typeof r.toPhone === 'string' && r.toPhone.trim().length > 0)
      .map((r) => ({ contactId: String(r.contactId), role: String(r.role), toPhone: String(r.toPhone).trim() }));
    const waLocal = await resolveWhatsAppConfig(tenantId);
    if (localTargets.length === 0 || !waLocal.configured) {
      // Sin teléfonos o sin credenciales: el cliente hace fallback wa.me, no es error.
      return NextResponse.json({ success: true, sent: 0, pendingWaMe: localTargets.length, results: [], warnings: [], needsClientFallback: true, whatsappConfigured: waLocal.configured, local: true });
    }
    const localResults: { contactId: string; role: string; toPhone: string; waMessageId: string | null; error?: string }[] = [];
    for (const t of localTargets) {
      const sent = await sendWhatsAppTextApi({ phoneNumberId: waLocal.phoneNumberId!, accessToken: waLocal.token!, to: t.toPhone, body: message });
      localResults.push({ contactId: t.contactId, role: t.role, toPhone: t.toPhone, waMessageId: sent.waMessageId ?? null, error: sent.error });
    }
    try {
      await db.auditLog.create({
        data: { tenantId, userId: session.user.id, action: 'EDU_CLASS_REPORT_SENT', table: 'EduOutboxMessage', recordId: lessonId, details: `Report local lesson ${lessonId} → ${localResults.map((r) => `${r.role}:${r.toPhone}${r.waMessageId ? '' : '(failed)'}`).join(', ')}`, success: localResults.some((r) => r.waMessageId) },
      });
    } catch {}
    return NextResponse.json({ success: true, sent: localResults.filter((r) => r.waMessageId).length, pendingWaMe: localResults.filter((r) => !r.waMessageId).length, results: localResults, warnings: [], needsClientFallback: false, whatsappConfigured: true, whatsappSource: vaultSourceKind(waLocal), local: true });
  }

  const commsMode: EduCommsMode =
    commsOverride ?? (student.commsMode as EduCommsMode) ?? 'TUTOR_ONLY';

  let computed = getReportRecipients({
    student: {
      id: student.contact.id,
      name: student.contact.name,
      phone: student.contact.phone,
      phoneNormalized: student.contact.phoneNormalized,
      birthDate: student.contact.birthDate,
      commsOptOut: student.contact.commsOptOut,
    },
    tutor: student.tutorContact
      ? {
          id: student.tutorContact.id,
          name: student.tutorContact.name,
          phone: student.tutorContact.phone,
          phoneNormalized: student.tutorContact.phoneNormalized,
          commsOptOut: student.tutorContact.commsOptOut,
        }
      : null,
    commsMode,
    tutorRelationLabel: student.guardianRelation ?? undefined,
  });

  // Override puntual desde el panel (chips): filtrar a los contactId elegidos
  if (Array.isArray(recipientsOverride) && recipientsOverride.length > 0) {
    const wanted = new Set(recipientsOverride.map((r) => r.contactId));
    computed = computed.filter((r) => wanted.has(r.contactId));
  }

  const sendable = sendableRecipients(computed);
  const warnings = computed.filter((r) => r.warning).map((r) => `${r.label}: ${r.warning}`);

  // 2. Envío Cloud API por destinatario (si hay credenciales; si no, el cliente hace wa.me)
  // Creds: Setting por tenant (whatsapp_token / whatsapp_phone_number_id) > env
  // (WHATSAPP_TOKEN|WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID|WHATSAPP_PHONE_ID).
  const waConfig = await resolveWhatsAppConfig(tenantId);
  const whatsappToken = waConfig.token;
  const whatsappPhoneId = waConfig.phoneNumberId;
  const results: { contactId: string; role: string; toPhone: string; waMessageId: string | null; error?: string }[] = [];

  for (const r of sendable) {
    let waMessageId: string | null = null;
    let error: string | undefined;
    if (whatsappToken && whatsappPhoneId) {
      const sent = await sendWhatsAppTextApi({
        phoneNumberId: whatsappPhoneId,
        accessToken: whatsappToken,
        to: r.toPhone,
        body: message,
      });
      waMessageId = sent.waMessageId ?? null;
      error = sent.error;
    }
    results.push({ contactId: r.contactId, role: r.role, toPhone: r.toPhone, waMessageId, error });

    // 4. Outbox: 1 fila por destinatario con el mismo batchToken/link
    await db.eduOutboxMessage.create({
      data: {
        tenantId,
        studentId: student.id,
        lessonId,
        channel: 'WHATSAPP_CLOUD',
        waMessageId: waMessageId ?? undefined,
        recipientContactId: r.contactId,
        recipientRole: r.role,
        toPhone: r.toPhone,
        body: message,
        link: link ?? undefined,
        batchToken: batchToken ?? undefined,
        status: waMessageId ? 'QUEUED' : 'FAILED',
        error: error ?? undefined,
        sentAt: waMessageId ? new Date() : undefined,
      },
    });
  }

  // 5. Audit único resumiendo el reparto
  const anySent = results.some((r) => r.waMessageId);
  await db.auditLog.create({
    data: {
      tenantId,
      userId: session.user.id,
      action: 'EDU_CLASS_REPORT_SENT',
      table: 'EduOutboxMessage',
      recordId: lessonId,
      details: `Report lesson ${lessonId} → ${results.map((r) => `${r.role}:${r.toPhone}${r.waMessageId ? '' : '(pending-wa.me)'}`).join(', ') || 'sin destinatarios'}`,
      success: anySent || (!whatsappToken && sendable.length > 0),
    },
  });

  return NextResponse.json({
    success: true,
    sent: results.filter((r) => r.waMessageId).length,
    pendingWaMe: !waConfig.configured ? sendable.length : results.filter((r) => !r.waMessageId).length,
    results,
    warnings,
    needsClientFallback: !waConfig.configured,
    whatsappConfigured: waConfig.configured,
    // Genérico a propósito: no revela nombres de vars del servidor a USUARIO.
    whatsappSource: vaultSourceKind(waConfig),
  });
}
