import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { normalizePhoneES } from "@/lib/phone";
const prisma: any = db;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const body = await req.json();
    const { customerName, customerPhone, pickupPointId, pickupWindowId, pickupDate, items, notes, paymentProvider } = body;

    if (!customerName || !customerName.trim()) {
      return NextResponse.json({ error: "Indica tu nombre para el pedido." }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Selecciona al menos un producto." }, { status: 400 });
    }

    const shop = await prisma.shop.findFirst({
      where: {
        OR: [{ slug: slug }, { customDomain: slug }],
        isActive: true,
      },
    });

    if (!shop) {
      return NextResponse.json({ error: "Tienda no encontrada." }, { status: 404 });
    }

    // Validar franja si viene
    let targetWindow: any = null;
    if (pickupWindowId) {
      targetWindow = await prisma.pickupWindow.findFirst({ where: { id: pickupWindowId, isActive: true }, include: { pickupPoint: true } });
      if (!targetWindow) return NextResponse.json({ error: "Franja de recogida no válida." }, { status: 400 });
      if (String(targetWindow.pickupPoint.shopId) !== String(shop.id)) return NextResponse.json({ error: "Franja no pertenece a esta tienda." }, { status: 400 });
      // capacidad por franja y día
      const dateStr = pickupDate ? new Date(pickupDate).toISOString().slice(0,10) : new Date().toISOString().slice(0,10);
      const startOfDay = new Date(dateStr + "T00:00:00.000Z");
      const endOfDay = new Date(dateStr + "T23:59:59.999Z");
      const countInWindow = await prisma.order.count({ where: { shopId: shop.id, pickupWindowId: targetWindow.id, pickupDate: { gte: startOfDay, lte: endOfDay }, status: { not: "CANCELLED" } } });
      // sumar cantidades totales de items para esta franja y comparar con capacity (capacidad = nº pedidos aprox; usamos suma unidades)
      let unitsInWindow = 0;
      if (countInWindow > 0) {
        const orders = await prisma.order.findMany({ where: { shopId: shop.id, pickupWindowId: targetWindow.id, pickupDate: { gte: startOfDay, lte: endOfDay }, status: { not: "CANCELLED" } }, include: { lines: true } });
        for (const o of orders) for (const l of o.lines) unitsInWindow += Number(l.quantity);
      }
      const requestedUnits = items.reduce((a: number, it: any) => a + Number(it.quantity || 0), 0);
      if (unitsInWindow + requestedUnits > Number(targetWindow.capacity)) {
        return NextResponse.json({ error: `Franja "${targetWindow.label}" completa. Quedan ${Math.max(0, Number(targetWindow.capacity) - unitsInWindow)} huecos.` }, { status: 400 });
      }
    }

    // Atomic transaction: decrement Product.currentStock + consume BOM stockQty + create Order + pickupCode 4 dígitos
    const result = await prisma.$transaction(async (tx: any) => {
      let totalAmount = 0;
      const orderLinesData: any[] = [];

      // Generar código 4 dígitos único (reintenta si colisión)
      let pickupCode: string | null = null;
      for (let attempt = 0; attempt < 12; attempt++) {
        const c = String(1000 + Math.floor(Math.random() * 9000));
        const exists = await tx.order.findUnique({ where: { pickupCode: c } }).catch(() => null);
        if (!exists) { pickupCode = c; break; }
      }
      if (!pickupCode) pickupCode = String(1000 + Math.floor(Math.random() * 9000));

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || !product.isActive) {
          throw new Error(`El producto ya no está disponible.`);
        }

        if (product.currentStock < item.quantity) {
          throw new Error(`Lo sentimos, solo quedan ${product.currentStock} unidades de ${product.name}.`);
        }

        // Decrement stock terminado
        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: product.currentStock - item.quantity },
        });

        // Consumo BOM si producto está vinculado a CoreProduct manufacturado
        if (product.coreProductId) {
          const bomLines = await tx.bomLine.findMany({ where: { parentId: product.coreProductId }, include: { ingredient: true } });
          for (const line of bomLines) {
            const need = Number(line.quantity) * Number(item.quantity);
            if (!need || need <= 0) continue;
            // Lock ingredient
            const ingredient = await tx.coreProduct.findUnique({ where: { id: line.ingredientId } });
            if (!ingredient) continue;
            const stock = Number(ingredient.stockQty ?? 0);
            if (stock < need) {
              throw new Error(`Stock insuficiente de ${ingredient.name}: necesita ${need} ${line.uom} para ${item.quantity}× ${product.name}, quedan ${stock}.`);
            }
            await tx.coreProduct.update({ where: { id: ingredient.id }, data: { stockQty: stock - need } });
            // Movimiento trazable
            try {
              await tx.stockMovement.create({
                data: {
                  tenantId: ingredient.tenantId,
                  coreProductId: ingredient.id,
                  type: "OUT",
                  qty: need,
                  uom: line.uom || ingredient.uom || "kg",
                  reason: `ORDER ${pickupCode} - ${product.name} x${item.quantity}`,
                  orderId: null,
                },
              });
            } catch {}
          }
        }

        const lineTotal = Number(product.price) * item.quantity;
        totalAmount += lineTotal;

        orderLinesData.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.price,
        });
      }

      // Upsert contacto por teléfono (sin +34) para historial Belpane
      let contactId: string | null = null;
      let phoneNorm: string | null = null;
      if (customerPhone && String(customerPhone).trim()) {
        phoneNorm = normalizePhoneES(String(customerPhone));
        const tenantId = shop.tenantId;
        const existing = await tx.contact.findFirst({ where: { tenantId, OR: [{ phoneNormalized: phoneNorm }, { phone: String(customerPhone).trim() }] } });
        if (existing) {
          contactId = existing.id;
          // actualiza phoneNormalized si faltaba
          if (!existing.phoneNormalized) {
            try { await tx.contact.update({ where: { id: existing.id }, data: { phoneNormalized: phoneNorm } }); } catch {}
          }
        } else {
          const created = await tx.contact.create({
            data: { tenantId, name: String(customerName).trim(), phone: String(customerPhone).trim(), phoneNormalized: phoneNorm, contactType: "INDIVIDUAL" },
          });
          contactId = created.id;
        }
      }

      const order = await tx.order.create({
        data: {
          shopId: shop.id,
          pickupPointId: pickupPointId || null,
          pickupWindowId: targetWindow ? targetWindow.id : null,
          pickupDate: pickupDate ? new Date(pickupDate) : null,
          pickupCode,
          customerName: customerName.trim(),
          customerPhone: customerPhone ? customerPhone.trim() : null,
          customerPhoneNormalized: phoneNorm,
          contactId,
          paymentProvider: paymentProvider || shop.paymentProvider || "CASH",
          paymentStatus: (paymentProvider || shop.paymentProvider) === "REDSYS" ? "PENDING" : "PAID",
          notes: notes ? notes.trim() : null,
          totalAmount,
          lines: { create: orderLinesData },
        },
        include: {
          pickupPoint: true,
          pickupWindow: true,
          lines: { include: { product: true } },
        },
      });

      // Asignar orderId a movimientos creados sin orderId (update)
      if (order.pickupCode) {
        try {
          await tx.stockMovement.updateMany({ where: { reason: { contains: `ORDER ${order.pickupCode}` } }, data: { orderId: order.id } });
        } catch {}
      }

      return order;
    });

    return NextResponse.json({
      success: true,
      order: result,
      message: `¡Pedido #${result.pickupCode} creado! Código de recogida: ${result.pickupCode}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al procesar el pedido." }, { status: 400 });
  }
}
