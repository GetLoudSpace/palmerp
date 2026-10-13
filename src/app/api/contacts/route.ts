// src/app/api/contacts/route.ts
// Feature #11 (contacts_shared_db): CRUD de Contactos sobre Prisma/Supabase,
// scoped SIEMPRE por tenantId de sesión. Así PC y móvil ven los mismos datos.
//
// - GET: lista paginada + búsqueda + filtros. USUARIO con rol PROFESOR solo
//   ve sus alumnos asignados (teacherId de sus EduLesson) y sus tutores.
// - POST/PATCH: cualquier usuario con módulo contacts. Alta/edición + enlaces
//   tutor→alumno (tutorIds) + AuditLog. Dedupe por phoneNormalized (409).
// - DELETE: solo ADMIN/DEV, borrado lógico (deletedAt) + AuditLog.
import { NextResponse } from "next/server";
import db, { withTenantContext } from "@/lib/db";
import { requireModuleAccess } from "@/lib/requireModule";
import {
  validateContactPayload,
  mapInstrumentFromDb,
  splitPhone,
  type ContactPayload,
} from "@/lib/contactSync";

type Caller = { id: string; role: string; workRoles?: string[]; tenantId: string };

// Decisión usuario 2026-10-13: los contactos del tenant se ven desde
// CUALQUIER usuario (incl. profesor). Sin filtro por alumnos asignados:
// la asignación vive en EduLesson local y filtrar por la tabla DB vacía
// dejaba la lista a cero.

const CONTACT_INCLUDE = {
  tutorsOfMe: { include: { tutor: { select: { id: true, name: true, phone: true, phoneNormalized: true } } } },
  tutoredStudents: { include: { student: { select: { id: true, name: true, phone: true, phoneNormalized: true } } } },
} as const;

/** Forma apta para la UI (instrumento en clave UI, birthDate ISO). */
function toClient(c: Record<string, unknown>): Record<string, unknown> {
  const tutorsOfMe = (c.tutorsOfMe ?? []) as { relation: string | null; tutor: Record<string, unknown> }[];
  const tutoredStudents = (c.tutoredStudents ?? []) as { relation: string | null; student: Record<string, unknown> }[];
  return {
    id: c.id,
    name: c.name,
    phone: c.phone ?? "",
    phoneNormalized: c.phoneNormalized ?? "",
    email: c.email ?? "",
    contactType: c.contactType,
    category: c.category,
    instrument: mapInstrumentFromDb(c.instrument),
    companyName: c.companyName ?? "",
    cif: c.cif ?? "",
    billingStreet: c.billingStreet ?? "",
    billingZip: c.billingZip ?? "",
    billingCity: c.billingCity ?? "",
    billingCountry: c.billingCountry ?? "España",
    notes: c.notes ?? "",
    birthDate: c.birthDate ? (c.birthDate as Date).toISOString() : undefined,
    enrollmentDate: c.enrollmentDate ? (c.enrollmentDate as Date).toISOString().slice(0, 10) : undefined,
    commsOptOut: c.commsOptOut ?? false,
    tutors: tutorsOfMe.map((t) => ({ ...t.tutor, relation: t.relation })),
    tutorIds: tutorsOfMe.map((t) => String((t.tutor as { id: string }).id)),
    students: tutoredStudents.map((t) => ({ ...t.student, relation: t.relation })),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

async function audit(
  tenantId: string,
  userId: string,
  action: string,
  recordId: string,
  details: string,
): Promise<void> {
  try {
    await (db as any).auditLog.create({
      data: { tenantId, userId, action, table: "Contact", recordId, details, success: true },
    });
  } catch {}
}

export async function GET(req: Request) {
  const auth = await requireModuleAccess("contacts");
  if ("error" in auth) return auth.error;
  const { tenantId } = auth;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const category = (url.searchParams.get("category") || "").toUpperCase();
  const contactType = (url.searchParams.get("contactType") || "").toUpperCase();
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(500, Math.max(1, parseInt(url.searchParams.get("pageSize") || "100", 10) || 100));

  const where: Record<string, unknown> = { tenantId, deletedAt: null };
  if (["NONE", "ALUMNO", "TUTOR", "PROFESOR"].includes(category)) where.category = category;
  if (["INDIVIDUAL", "COMPANY"].includes(contactType)) where.contactType = contactType;
  if (q) {
    const contains = { contains: q, mode: "insensitive" as const };
    where.OR = [
      { name: contains },
      { email: contains },
      { phone: contains },
      { phoneNormalized: contains },
      { cif: contains },
      { companyName: contains },
      { billingCity: contains },
    ];
  }

  const [total, rows] = await Promise.all([
    (db as any).contact.count({ where }),
    (db as any).contact.findMany({
      where,
      include: CONTACT_INCLUDE,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    success: true,
    contacts: (rows as Record<string, unknown>[]).map(toClient),
    total,
    page,
    pageSize,
  });
}

function contactData(tenantId: string, d: ContactPayload): Record<string, unknown> {
  const { phone, phoneNormalized } = splitPhone(d.phone);
  const data: Record<string, unknown> = {
    tenantId,
    name: d.name,
    phone,
    phoneNormalized,
    email: d.email || null,
    contactType: d.contactType,
    category: d.category,
    instrument: d.instrument || null,
    companyName: d.companyName || null,
    cif: d.cif || null,
    billingStreet: d.billingStreet || null,
    billingZip: d.billingZip || null,
    billingCity: d.billingCity || null,
    billingCountry: d.billingCountry || "España",
    notes: d.notes || null,
    birthDate: d.birthDate ? new Date(d.birthDate) : null,
  };
  // La fecha de inscripción solo la escribe la sync de Notion: si el
  // llamante no la envía, se conserva (no se borra con null).
  if (d.enrollmentDate) data.enrollmentDate = new Date(d.enrollmentDate);
  return data;
}

async function assertTutorsInTenant(tx: unknown, tenantId: string, tutorIds: string[], selfId?: string) {
  const contact = (tx as { contact: { findMany: (a: unknown) => Promise<{ id: string }[]> } }).contact;
  const clean = tutorIds.filter((t) => t && t !== selfId);
  if (!clean.length) return clean;
  const found = await contact.findMany({ where: { tenantId, id: { in: clean }, deletedAt: null }, select: { id: true } });
  const ok = new Set(found.map((f) => f.id));
  const missing = clean.filter((t) => !ok.has(t));
  if (missing.length) throw new Error(`Tutor no encontrado en tu instancia (${missing.length})`);
  return clean;
}

export async function POST(req: Request) {
  const auth = await requireModuleAccess("contacts");
  if ("error" in auth) return auth.error;
  const { tenantId } = auth;
  const caller = auth.session.user as unknown as Caller;

  const v = validateContactPayload(await req.json().catch(() => ({})));
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  try {
    const created = await withTenantContext(tenantId, async (tx) => {
      const t = tx as unknown as {
        contact: {
          findFirst: (a: unknown) => Promise<{ id: string; name: string } | null>;
          create: (a: unknown) => Promise<Record<string, unknown>>;
          findUnique: (a: unknown) => Promise<Record<string, unknown> | null>;
        };
        contactTutorStudent: { createMany: (a: unknown) => Promise<unknown> };
      };
      const { phoneNormalized } = splitPhone(v.data.phone);
      if (phoneNormalized) {
        const dup = await t.contact.findFirst({ where: { tenantId, phoneNormalized, deletedAt: null } });
        if (dup) {
          const err = new Error(`Ya existe "${dup.name}" con ese teléfono`) as Error & { status?: number; existingId?: string };
          err.status = 409;
          err.existingId = dup.id;
          throw err;
        }
      }
      const row = await t.contact.create({ data: contactData(tenantId, v.data) });
      const tutorIds = await assertTutorsInTenant(t, tenantId, v.data.tutorIds, String(row.id));
      if (tutorIds.length) {
        await t.contactTutorStudent.createMany({
          data: tutorIds.map((tutorId) => ({ tenantId, tutorId, studentId: String(row.id) })),
          skipDuplicates: true,
        });
      }
      return t.contact.findUnique({ where: { id: String(row.id) }, include: CONTACT_INCLUDE });
    });

    await audit(tenantId, caller.id, "CONTACT_CREATED", String((created as Record<string, unknown>)?.id), `${v.data.name} (${v.data.category})`);
    return NextResponse.json({ success: true, contact: toClient((created ?? {}) as Record<string, unknown>) });
  } catch (e: unknown) {
    const err = e as Error & { status?: number; existingId?: string };
    if (err.status === 409) return NextResponse.json({ error: err.message, existingId: err.existingId }, { status: 409 });
    if (String(err.message || "").startsWith("Tutor no encontrado")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "No se pudo crear el contacto" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireModuleAccess("contacts");
  if ("error" in auth) return auth.error;
  const { tenantId } = auth;
  const caller = auth.session.user as unknown as Caller;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  const v = validateContactPayload(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  try {
    const updated = await withTenantContext(tenantId, async (tx) => {
      const t = tx as unknown as {
        contact: {
          findFirst: (a: unknown) => Promise<{ id: string } | null>;
          update: (a: unknown) => Promise<Record<string, unknown>>;
          findUnique: (a: unknown) => Promise<Record<string, unknown> | null>;
        };
        contactTutorStudent: { deleteMany: (a: unknown) => Promise<unknown>; createMany: (a: unknown) => Promise<unknown> };
      };
      const target = await t.contact.findFirst({ where: { id, tenantId, deletedAt: null } });
      if (!target) {
        const err = new Error("Contacto no encontrado") as Error & { status?: number };
        err.status = 404;
        throw err;
      }
      const { phoneNormalized } = splitPhone(v.data.phone);
      if (phoneNormalized) {
        const dup = await t.contact.findFirst({ where: { tenantId, phoneNormalized, deletedAt: null, id: { not: id } } });
        if (dup) {
          const err = new Error("Otro contacto ya usa ese teléfono") as Error & { status?: number };
          err.status = 409;
          throw err;
        }
      }
      await t.contact.update({ where: { id }, data: contactData(tenantId, v.data) });
      if (Array.isArray(body.tutorIds)) {
        const tutorIds = await assertTutorsInTenant(t, tenantId, v.data.tutorIds, id);
        await t.contactTutorStudent.deleteMany({ where: { tenantId, studentId: id } });
        if (tutorIds.length) {
          await t.contactTutorStudent.createMany({
            data: tutorIds.map((tutorId) => ({ tenantId, tutorId, studentId: id })),
            skipDuplicates: true,
          });
        }
      }
      return t.contact.findUnique({ where: { id }, include: CONTACT_INCLUDE });
    });

    await audit(tenantId, caller.id, "CONTACT_UPDATED", id, `${v.data.name} (${v.data.category})`);
    return NextResponse.json({ success: true, contact: toClient((updated ?? {}) as Record<string, unknown>) });
  } catch (e: unknown) {
    const err = e as Error & { status?: number };
    if (err.status === 404 || err.status === 409) return NextResponse.json({ error: err.message }, { status: err.status });
    if (String(err.message || "").startsWith("Tutor no encontrado")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "No se pudo actualizar el contacto" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireModuleAccess("contacts");
  if ("error" in auth) return auth.error;
  const { tenantId } = auth;
  const caller = auth.session.user as unknown as Caller;
  if (caller.role !== "ADMIN" && caller.role !== "DEV") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const target = await (db as any).contact
    .findFirst({ where: { id, tenantId, deletedAt: null }, select: { id: true, name: true } })
    .catch(() => null);
  if (!target) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });

  await withTenantContext(tenantId, async (tx) =>
    (tx as unknown as { contact: { update: (a: unknown) => Promise<unknown> } }).contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
  );
  await audit(tenantId, caller.id, "CONTACT_DELETED", id, `${(target as { name: string }).name} (borrado lógico)`);
  return NextResponse.json({ success: true });
}
