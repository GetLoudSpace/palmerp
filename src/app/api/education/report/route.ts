// src/app/api/education/report/route.ts
// Reporte fin de clase → WhatsApp multi-destinatario (tutor único + alumno según commsMode).
// Contact es fuente de verdad: el teléfono sale de Contact, nunca del studentId.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, hasRole } from '@/lib/auth';
import db from '@/lib/db';
import {
  getReportRecipients,
  sendableRecipients,
  type EduCommsMode,
  type RecipientRole,
} from '@/modules/education/lib/recipients';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  if (!hasRole(session.user, 'STAFF') && !hasRole(session.user, 'ADMIN') && !hasRole(session.user, 'PROFESSOR')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { studentId, lessonId, done, todo, commsMode: commsOverride, recipients: recipientsOverride, batchToken, link } = body as {
    studentId?: string;
    lessonId?: string;
    done?: string;
    todo?: string;
    commsMode?: EduCommsMode;
    recipients?: { contactId: string; role: RecipientRole }[];
    batchToken?: string;
    link?: string;
  };
  if (!studentId || !lessonId) {
    return NextResponse.json({ error: 'studentId and lessonId required' }, { status: 400 });
  }

  const tenantId = session.user.tenantId as string;

  // 1. Resolver EduStudent + Contact alumno + Contact tutor (teléfonos reales)
  const student = await db.eduStudent.findFirst({
    where: { id: studentId, tenantId },
    include: { contact: true, tutorContact: true },
  });
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

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

  // 2. Cuerpo del mensaje (misma plantilla que el cliente para coherencia)
  const message =
    `Hola,\nResumen de la clase de hoy:\n` +
    (done ? `Hecho: ${done}\n` : '') +
    (todo ? `Tarea: ${todo}\n` : '') +
    (link ? `Recursos: ${link}\n` : '');

  // 3. Envío Cloud API por destinatario (si hay credenciales; si no, el cliente hace wa.me)
  const whatsappToken = process.env.WHATSAPP_TOKEN;
  const whatsappPhoneId = process.env.WHATSAPP_PHONE_ID;
  const results: { contactId: string; role: string; toPhone: string; waMessageId: string | null; error?: string }[] = [];

  for (const r of sendable) {
    let waMessageId: string | null = null;
    let error: string | undefined;
    if (whatsappToken && whatsappPhoneId) {
      try {
        const resp = await fetch(`https://graph.facebook.com/v20.0/${whatsappPhoneId}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${whatsappToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: r.toPhone,
            type: 'text',
            text: { body: message },
          }),
        });
        const data = await resp.json().catch(() => ({}));
        if (resp.ok && data.messages?.[0]?.id) waMessageId = data.messages[0].id;
        else error = typeof data === 'string' ? data : JSON.stringify(data).slice(0, 500);
      } catch (e: any) {
        error = String(e?.message ?? e);
      }
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
    pendingWaMe: !whatsappToken ? sendable.length : results.filter((r) => !r.waMessageId).length,
    results,
    warnings,
    needsClientFallback: !whatsappToken,
  });
}
