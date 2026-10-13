// src/app/api/contacts/import/route.ts
// Feature #11: migración localStorage → DB. Solo ADMIN/DEV.
// Recibe la lista tal cual la guarda /admin/contacts en
// `palmera_contacts_<slug>` y la upserta de forma idempotente:
// dedupe por phoneNormalized > email > nombre. Segunda pasada para
// los enlaces tutor→alumnos (tutoredStudentIds con ids locales).
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db, { withTenantContext } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import {
  validateContactPayload,
  contactDedupeKey,
  splitPhone,
} from "@/lib/contactSync";

type Tx = {
  contact: {
    findFirst: (a: unknown) => Promise<Record<string, unknown> | null>;
    create: (a: unknown) => Promise<Record<string, unknown>>;
    update: (a: unknown) => Promise<Record<string, unknown>>;
  };
  contactTutorStudent: { createMany: (a: unknown) => Promise<unknown> };
};

function scalarData(tenantId: string, d: {
  name: string; phone: string; email: string; contactType: string; category: string;
  instrument?: string; companyName: string; cif: string; billingStreet: string;
  billingZip: string; billingCity: string; billingCountry: string; notes: string; birthDate?: string;
}): Record<string, unknown> {
  const { phone, phoneNormalized } = splitPhone(d.phone);
  return {
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
    deletedAt: null,
  };
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const u = session?.user as unknown as { id: string; role: string; tenantId: string } | undefined;
  if (!u?.tenantId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (u.role !== "ADMIN" && u.role !== "DEV") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const tenantId = u.tenantId;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const list = Array.isArray(body.contacts) ? body.contacts : [];
  if (!list.length) return NextResponse.json({ error: "contacts vacío" }, { status: 400 });
  if (list.length > 2000) return NextResponse.json({ error: "Máximo 2000 contactos por importación" }, { status: 400 });

  let created = 0;
  let updated = 0;
  const skipped: { name: string; reason: string }[] = [];
  const seen = new Set<string>();
  // localId|dedupeKey → dbId para la 2ª pasada de tutores
  const idMap = new Map<string, string>();
  const tutorLinks: { tutorDbId: string; studentLocalIds: string[]; studentDedupeKeys: string[] }[] = [];

  const result = await withTenantContext(tenantId, async (tx) => {
    const t = (tx as unknown as { contact: Tx["contact"]; contactTutorStudent: Tx["contactTutorStudent"] });

    for (const raw of list as Record<string, unknown>[]) {
      const v = validateContactPayload(raw);
      const label = String((raw as Record<string, unknown>).name || "(sin nombre)");
      if (!v.ok) {
        skipped.push({ name: label.slice(0, 80), reason: v.error });
        continue;
      }
      const key = contactDedupeKey({
        phone: v.data.phone,
        phoneNormalized: splitPhone(v.data.phone).phoneNormalized,
        email: v.data.email,
        name: v.data.name,
      });
      if (seen.has(key)) {
        skipped.push({ name: v.data.name.slice(0, 80), reason: "Duplicado en el lote" });
        continue;
      }
      seen.add(key);

      const { phoneNormalized } = splitPhone(v.data.phone);
      let existing: Record<string, unknown> | null = null;
      if (phoneNormalized) {
        existing = await t.contact.findFirst({ where: { tenantId, phoneNormalized, deletedAt: null } });
      }
      if (!existing && v.data.email) {
        existing = await t.contact.findFirst({ where: { tenantId, email: v.data.email, deletedAt: null } });
      }

      let dbId: string;
      if (existing) {
        const row = await t.contact.update({ where: { id: String(existing.id) }, data: scalarData(tenantId, v.data) });
        dbId = String(row.id);
        updated++;
      } else {
        const row = await t.contact.create({ data: scalarData(tenantId, v.data) });
        dbId = String(row.id);
        created++;
      }
      const localId = String(raw.id || "");
      if (localId) idMap.set(`local:${localId}`, dbId);
      idMap.set(key, dbId);

      const tutored = Array.isArray(raw.tutoredStudentIds)
        ? (raw.tutoredStudentIds as unknown[]).map(String).filter(Boolean)
        : [];
      if (tutored.length) {
        tutorLinks.push({ tutorDbId: dbId, studentLocalIds: tutored, studentDedupeKeys: [] });
      }
    }

    // 2ª pasada: enlaces tutor→alumno (ids locales del lote → ids DB)
    let links = 0;
    for (const tl of tutorLinks) {
      const studentDbIds = new Set<string>();
      for (const lid of tl.studentLocalIds) {
        const mapped = idMap.get(`local:${lid}`);
        if (mapped && mapped !== tl.tutorDbId) studentDbIds.add(mapped);
      }
      if (studentDbIds.size) {
        await t.contactTutorStudent.createMany({
          data: [...studentDbIds].map((studentId) => ({ tenantId, tutorId: tl.tutorDbId, studentId })),
          skipDuplicates: true,
        });
        links += studentDbIds.size;
      }
    }
    return { links };
  }).catch((e: unknown) => ({ error: String((e as Error)?.message || e) }));

  if ("error" in result) {
    return NextResponse.json({ error: "Falló la importación (nada se guardó)" }, { status: 500 });
  }

  try {
    await (db as any).auditLog.create({
      data: {
        tenantId,
        userId: u.id,
        action: "CONTACT_IMPORTED",
        table: "Contact",
        recordId: "-",
        details: `Import localStorage→DB: ${created} creados, ${updated} actualizados, ${skipped.length} omitidos, ${result.links} enlaces tutor`,
        success: true,
      },
    });
  } catch {}

  return NextResponse.json({ success: true, created, updated, skipped, tutorLinks: result.links });
}
