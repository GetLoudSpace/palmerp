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
    return NextResponse.json({ pickupPoints: [] });
  }

  const pickupPoints = await prisma.pickupPoint.findMany({
    where: { shopId: shop.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ success: true, pickupPoints });
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
    const { id, name, address, schedule, isActive } = body;

    let point;
    if (id) {
      point = await prisma.pickupPoint.update({
        where: { id },
        data: {
          name,
          address,
          schedule,
          isActive: isActive !== undefined ? isActive : true,
        },
      });
    } else {
      point = await prisma.pickupPoint.create({
        data: {
          shopId: shop.id,
          name,
          address,
          schedule,
          isActive: isActive !== undefined ? isActive : true,
        },
      });
    }

    return NextResponse.json({ success: true, pickupPoint: point });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al guardar punto de recogida" }, { status: 500 });
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

  await prisma.pickupPoint.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
