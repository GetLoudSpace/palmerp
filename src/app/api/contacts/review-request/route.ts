// src/app/api/contacts/review-request/route.ts
// Feature #14: registra que se solicitó reseña Google a un contacto.
// Cualquier usuario con módulo contacts (incl. profesor). Sella
// googleReviewRequestedAt + AuditLog. El mensaje wa.me lo abre el cliente.
import { NextResponse } from "next/server";
import db, { withTenantContext } from "@/lib/db";
import { requireModuleAccess } from "@/lib/requireModule";

export async function POST(req: Request) {
  const auth = await requireModuleAccess("contacts");
  if ("error" in auth) return auth.error;
  const { tenantId } = auth;
  const caller = auth.session.user as unknown as { id: string };

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  const greetedAs = String(body.greetedAs || "").slice(0, 80);

  const target = await (db as any).contact
    .findFirst({ where: { id, tenantId, deletedAt: null }, select: { id: true, name: true } })
    .catch(() => null);
  if (!target) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });

  const now = new Date();
  await withTenantContext(tenantId, async (tx) =>
    ((tx as unknown as { contact: { update: (a: unknown) => Promise<unknown> } }).contact.update({
      where: { id },
      data: { googleReviewRequestedAt: now },
    })),
  );

  try {
    await (db as any).auditLog.create({
      data: {
        tenantId,
        userId: caller.id,
        action: "REVIEW_REQUESTED",
        table: "Contact",
        recordId: id,
        details: `Reseña Google solicitada a ${(target as { name: string }).name}${greetedAs ? ` (saludo: ${greetedAs})` : ""} vía wa.me`,
        success: true,
      },
    });
  } catch {}

  return NextResponse.json({ success: true, requestedAt: now.toISOString() });
}
