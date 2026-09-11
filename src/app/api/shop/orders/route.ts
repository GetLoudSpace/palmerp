import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getToken } from "next-auth/jwt";
const prisma: any = db;

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const shop = await prisma.shop.findFirst({ where: { tenantId: token.tenantId } });
  if (!shop) {
    return NextResponse.json({ orders: [] });
  }

  const orders = await prisma.order.findMany({
    where: { shopId: shop.id },
    include: {
      pickupPoint: true,
      pickupWindow: true,
      lines: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, orders });
}

export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { orderId, status, code } = body;

    // Verificación por código 4 dígitos
    if (code !== undefined) {
      const order = await prisma.order.findFirst({ where: { id: orderId }, include: { shop: true } });
      if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
      if (String(order.tenantId ?? order.shop?.tenantId) !== String(token.tenantId) && order.shopId) {
        // fallback check via shop tenant
        const shop = await prisma.shop.findUnique({ where: { id: order.shopId } });
        if (shop && String(shop.tenantId) !== String(token.tenantId)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
      if (String(order.pickupCode) !== String(code).trim()) {
        return NextResponse.json({ error: "Código incorrecto. Verifica los 4 dígitos con el cliente." }, { status: 400 });
      }
      const updated = await prisma.order.update({ where: { id: orderId }, data: { status: "DELIVERED", verifiedAt: new Date(), verifiedById: String(token.sub || token.id || token.email || "admin") } });
      return NextResponse.json({ success: true, order: updated });
    }

    // Flujo normal status, con restauración de stock si cancela
    const existing = await prisma.order.findUnique({ where: { id: orderId }, include: { lines: true } });
    if (!existing) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

    if (status === "CANCELLED" && existing.status !== "CANCELLED") {
      // Restaurar Product.currentStock y CoreProduct.stockQty (revertir BOM)
      await prisma.$transaction(async (tx: any) => {
        for (const line of existing.lines) {
          const product = await tx.product.findUnique({ where: { id: line.productId } });
          if (product) {
            await tx.product.update({ where: { id: product.id }, data: { currentStock: Number(product.currentStock) + Number(line.quantity) } });
            if (product.coreProductId) {
              const bom = await tx.bomLine.findMany({ where: { parentId: product.coreProductId } });
              for (const b of bom) {
                const need = Number(b.quantity) * Number(line.quantity);
                const ing = await tx.coreProduct.findUnique({ where: { id: b.ingredientId } });
                if (ing) await tx.coreProduct.update({ where: { id: ing.id }, data: { stockQty: Number(ing.stockQty ?? 0) + need } });
                try { await tx.stockMovement.create({ data: { tenantId: String(token.tenantId), coreProductId: b.ingredientId, type: "IN", qty: need, uom: b.uom || "kg", reason: `CANCEL ORDER ${existing.pickupCode || existing.id.slice(-6)} - ${product.name} x${line.quantity}`, orderId: existing.id } }); } catch {}
              }
            }
          }
        }
        await tx.order.update({ where: { id: orderId }, data: { status } });
      });
      const order = await prisma.order.findUnique({ where: { id: orderId }, include: { pickupPoint: true, pickupWindow: true, lines: { include: { product: true } } } });
      return NextResponse.json({ success: true, order });
    }

    const order = await prisma.order.update({ where: { id: orderId }, data: { status } });
    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar estado del pedido" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json();
  const { orderId, code } = body;
  if (!orderId || !code) return NextResponse.json({ error: "orderId y code (4 dígitos) requeridos" }, { status: 400 });
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { shop: true } });
  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  if (String(order.pickupCode) !== String(code).trim()) return NextResponse.json({ error: "Código incorrecto" }, { status: 400 });
  const updated = await prisma.order.update({ where: { id: orderId }, data: { status: "DELIVERED", verifiedAt: new Date(), verifiedById: String(token.sub || token.id || "admin") } });
  return NextResponse.json({ success: true, order: updated });
}
