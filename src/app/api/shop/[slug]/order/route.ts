import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
const prisma: any = db;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const body = await req.json();
    const { customerName, customerPhone, pickupPointId, items, notes } = body;

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

    // Atomic transaction for order creation and stock decrement
    const result = await prisma.$transaction(async (tx: any) => {
      let totalAmount = 0;
      const orderLinesData = [];

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || !product.isActive) {
          throw new Error(`El producto ya no está disponible.`);
        }

        if (product.currentStock < item.quantity) {
          throw new Error(`Lo sentimos, solo quedan ${product.currentStock} unidades de ${product.name}.`);
        }

        // Decrement stock
        await tx.product.update({
          where: { id: product.id },
          data: {
            currentStock: product.currentStock - item.quantity,
          },
        });

        const lineTotal = Number(product.price) * item.quantity;
        totalAmount += lineTotal;

        orderLinesData.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.price,
        });
      }

      const order = await tx.order.create({
        data: {
          shopId: shop.id,
          pickupPointId: pickupPointId || null,
          customerName: customerName.trim(),
          customerPhone: customerPhone ? customerPhone.trim() : null,
          notes: notes ? notes.trim() : null,
          totalAmount,
          lines: {
            create: orderLinesData,
          },
        },
        include: {
          pickupPoint: true,
          lines: { include: { product: true } },
        },
      });

      return order;
    });

    return NextResponse.json({
      success: true,
      order: result,
      message: "¡Pedido realizado con éxito! Te esperamos en el punto de recogida.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al procesar el pedido." }, { status: 400 });
  }
}
