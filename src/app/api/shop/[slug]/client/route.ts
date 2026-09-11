import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { normalizePhoneES } from "@/lib/phone";
const prisma: any = db;

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const phone = new URL(req.url).searchParams.get("phone") || "";
  const normalized = normalizePhoneES(phone);
  if (!phone || !normalized) return NextResponse.json({ error: "Teléfono requerido" }, { status: 400 });

  const shop = await prisma.shop.findFirst({ where: { OR: [{ slug }, { customDomain: slug }], isActive: true } });
  if (!shop) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const tenantId = shop.tenantId;
  // Buscar contacto por phoneNormalized o phone crudo
  let contact = await prisma.contact.findFirst({ where: { tenantId, OR: [{ phoneNormalized: normalized }, { phone: phone.trim() }] } });
  if (!contact) {
    // No existe -> devolver vacío, el cliente podrá crear pedido igualmente (se creará contacto al pedir)
    return NextResponse.json({ success: true, contact: null, orders: [], normalized });
  }

  const orders = await prisma.order.findMany({
    where: { shopId: shop.id, OR: [{ contactId: contact.id }, { customerPhoneNormalized: normalized }, { customerPhone: phone.trim() }] },
    include: { pickupPoint: true, pickupWindow: true, lines: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({ success: true, contact, orders, normalized });
}
