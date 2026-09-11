import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getToken } from "next-auth/jwt";
const prisma: any = db;

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const shop = await prisma.shop.findFirst({ where: { tenantId: token.tenantId } });
  if (!shop) {
    return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
  }

  try {
    const { coreProductIds } = await req.json();
    if (!coreProductIds || !Array.isArray(coreProductIds) || coreProductIds.length === 0) {
      return NextResponse.json({ error: "Selecciona al menos un producto del catálogo central." }, { status: 400 });
    }

    const coreProducts = await prisma.coreProduct.findMany({
      where: {
        id: { in: coreProductIds },
        tenantId: token.tenantId,
        isSellable: true,
        isComponent: false,
      },
    });
    if (coreProducts.length === 0) {
      return NextResponse.json({ error: "Solo se pueden importar productos vendibles (no materia prima). Marca el producto como 'Se puede Vender' y desmarca 'Es Ingrediente' en /admin/products." }, { status: 400 });
    }

    const imported = [];
    for (const cp of coreProducts) {
      // Check if already in shop
      const existing = await prisma.product.findFirst({
        where: { shopId: shop.id, coreProductId: cp.id },
      });

      if (!existing) {
        const newShopProd = await prisma.product.create({
          data: {
            shopId: shop.id,
            coreProductId: cp.id,
            name: cp.name,
            description: cp.description,
            price: cp.price,
            maxDaily: 50,
            currentStock: 50,
            isActive: true,
          },
        });
        imported.push(newShopProd);
      }
    }

    return NextResponse.json({
      success: true,
      importedCount: imported.length,
      message: `¡Se han importado ${imported.length} productos a tu E-Commerce!`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al importar productos" }, { status: 500 });
  }
}
