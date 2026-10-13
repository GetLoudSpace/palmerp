// src/app/api/contacts/notion-sync/route.ts
// Feature #10: sincroniza Alumnos/Tutores desde Notion
// ("Alumnos (Administrativa)") a Contact/ContactTutorStudent.
// Solo ADMIN/DEV. tenantId SIEMPRE de sesión. Sin credenciales → 501.
import { NextResponse } from "next/server";
import db, { withTenantContext } from "@/lib/db";
import { requireModuleAccess } from "@/lib/requireModule";
import { mapNotionStudent, NOTION_VERSION } from "@/config/notionContacts";
import { normalizePhoneES } from "@/lib/phone";

const NOTION_API = "https://api.notion.com/v1";

function notionEnv(): { token: string; dbId: string } | null {
  const token = (process.env.NOTION_TOKEN || "").trim();
  const dbId = (process.env.NOTION_CONTACTS_DB_ID || "").trim();
  if (!token || !dbId) return null;
  return { token, dbId };
}

async function notionQuery(token: string, dbId: string, cursor?: string): Promise<{ pages: unknown[]; next: string | null }> {
  const body: Record<string, unknown> = { page_size: 100 };
  if (cursor) body.start_cursor = cursor;
  const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Notion ${res.status}`);
  const data = (await res.json()) as { results?: unknown[]; has_more?: boolean; next_cursor?: string | null };
  return { pages: data.results || [], next: data.has_more ? data.next_cursor || null : null };
}

export async function GET() {
  const auth = await requireModuleAccess("contacts");
  if ("error" in auth) return auth.error;
  const { tenantId } = auth;
  let last: Record<string, unknown> | null = null;
  try {
    const log = await (db as any).auditLog.findFirst({
      where: { tenantId, action: "SYNC_NOTION_CONTACTS", success: true },
      orderBy: { createdAt: "desc" },
      select: { details: true, createdAt: true },
    });
    if (log) last = { details: (log as { details: string }).details, at: (log as { createdAt: Date }).createdAt };
  } catch {}
  return NextResponse.json({ success: true, configured: !!notionEnv(), lastSync: last });
}

type Tx = {
  contact: {
    findFirst: (a: unknown) => Promise<Record<string, unknown> | null>;
    create: (a: unknown) => Promise<Record<string, unknown>>;
    update: (a: unknown) => Promise<Record<string, unknown>>;
  };
  contactTutorStudent: {
    findFirst: (a: unknown) => Promise<Record<string, unknown> | null>;
    createMany: (a: unknown) => Promise<unknown>;
  };
};

const same = (a: unknown, b: unknown): boolean => String(a || "") === String(b || "");

export async function POST() {
  const auth = await requireModuleAccess("contacts");
  if ("error" in auth) return auth.error;
  const { tenantId } = auth;
  const caller = auth.session.user as unknown as { id: string; role: string };
  if (caller.role !== "ADMIN" && caller.role !== "DEV") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const env = notionEnv();
  if (!env) return NextResponse.json({ error: "Notion no configurado (falta NOTION_TOKEN o NOTION_CONTACTS_DB_ID)" }, { status: 501 });

  // 1. Paginar Notion completo (100/página).
  let pages: unknown[] = [];
  try {
    let cursor: string | null | undefined;
    do {
      const r = await notionQuery(env.token, env.dbId, cursor || undefined);
      pages = pages.concat(r.pages);
      cursor = r.next;
    } while (cursor);
  } catch {
    return NextResponse.json({ error: "No se pudo leer la base de datos de Notion" }, { status: 502 });
  }

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  const skipped: { name: string; reason: string }[] = [];
  const errors: string[] = [];

  // 2. Upsert en una transacción (RLS context + tenant primero).
  try {
    await withTenantContext(tenantId, async (tx) => {
      const t = tx as unknown as Tx;
      for (const pg of pages) {
        let m;
        try {
          m = mapNotionStudent(pg as { id?: string; properties?: Record<string, { type?: string; [k: string]: unknown }> });
        } catch {
          skipped.push({ name: "?", reason: "pagina-ilegible" });
          continue;
        }
        if (m.skipReason) {
          skipped.push({ name: m.name ? m.name.slice(0, 60) : "?" , reason: m.skipReason });
          continue;
        }
        const phoneNormalized = normalizePhoneES(m.phone);

        let student = phoneNormalized
          ? await t.contact.findFirst({ where: { tenantId, phoneNormalized, deletedAt: null } })
          : null;
        if (!student && m.email) {
          student = await t.contact.findFirst({ where: { tenantId, email: m.email, deletedAt: null } });
        }

        const ed = m.enrollmentDate ? new Date(m.enrollmentDate) : null;
        const scalars: Record<string, unknown> = {
          tenantId,
          name: m.name,
          phone: m.phone,
          phoneNormalized,
          email: m.email || null,
          contactType: "INDIVIDUAL",
          category: "ALUMNO",
          instrument: m.primaryInstrumentDb || null,
          billingCity: m.billingCity || null,
          billingStreet: m.billingStreet || null,
          billingCountry: "España",
          enrollmentDate: ed && !isNaN(ed.getTime()) ? ed : null,
          deletedAt: null,
        };

        let studentId: string;
        if (!student) {
          const row = await t.contact.create({ data: scalars });
          studentId = String(row.id);
          created++;
        } else {
          studentId = String(student.id);
          const sameScalars =
            same(student.name, scalars.name) &&
            same(student.phone, scalars.phone) &&
            same(student.email, scalars.email) &&
            same(student.instrument, scalars.instrument) &&
            same(student.billingCity, scalars.billingCity) &&
            (student.enrollmentDate ? new Date(String(student.enrollmentDate)).toISOString().slice(0, 10) : "") ===
              (m.enrollmentDate || "").slice(0, 10);
          if (sameScalars && !m.tutorName) {
            unchanged++;
          } else {
            await t.contact.update({ where: { id: studentId }, data: scalars });
            updated++;
          }
        }

        // 3. Tutor por nombre (Notion no da teléfono): crear si falta + enlazar.
        if (m.tutorName) {
          let tutor = await t.contact.findFirst({
            where: { tenantId, category: "TUTOR", name: m.tutorName, deletedAt: null },
          });
          if (!tutor) {
            tutor = await t.contact.create({
              data: {
                tenantId,
                name: m.tutorName,
                contactType: "INDIVIDUAL",
                category: "TUTOR",
                billingCountry: "España",
                deletedAt: null,
              },
            });
            created++;
          }
          const tutorId = String(tutor.id);
          if (tutorId !== studentId) {
            const link = await t.contactTutorStudent.findFirst({ where: { tutorId, studentId } });
            if (!link) {
              await t.contactTutorStudent.createMany({ data: [{ tenantId, tutorId, studentId }], skipDuplicates: true });
            }
          }
        }
      }
    });
  } catch {
    errors.push("Fallo escribiendo en la base de datos (nada parcial garantizado)");
    return NextResponse.json({ error: errors[0] }, { status: 500 });
  }

  try {
    await (db as any).auditLog.create({
      data: {
        tenantId,
        userId: caller.id,
        action: "SYNC_NOTION_CONTACTS",
        table: "Contact",
        recordId: "-",
        details: `Notion→DB: ${created} creados, ${updated} actualizados, ${unchanged} sin cambios, ${skipped.length} omitidos`,
        success: true,
      },
    });
  } catch {}

  return NextResponse.json({ success: true, created, updated, unchanged, skipped: skipped.slice(0, 100), errors });
}
