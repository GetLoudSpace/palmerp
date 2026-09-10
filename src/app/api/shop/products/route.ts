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
    return NextResponse.json({ products: [] });
  }

  const products = await prisma.product.findMany({
    where: { shopId: shop.id },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ success: true, products });
}

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
    const body = await req.json();
    const { id, name, description, price, maxDaily, currentStock, isActive, image } = body;

    let product;
    if (id) {
      product = await prisma.product.update({
        where: { id },
        data: {
          name,
          description,
          price: parseFloat(price),
          maxDaily: parseInt(maxDaily),
          currentStock: parseInt(currentStock ?? maxDaily),
          isActive: isActive !== undefined ? isActive : true,
          ...(image !== undefined && { image }),
        },
      });
    } else {
      product = await prisma.product.create({
        data: {
          shopId: shop.id,
          name,
          description,
          price: parseFloat(price || 0),
          maxDaily: parseInt(maxDaily || 50),
          currentStock: parseInt(currentStock || maxDaily || 50),
          isActive: isActive !== undefined ? isActive : true,
          image,
        },
      });
    }

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al guardar producto" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
