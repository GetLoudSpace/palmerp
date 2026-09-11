import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
const prisma: any = db;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    let shop = await prisma.shop.findFirst({
      where: {
        OR: [
          { slug: slug },
          { customDomain: slug },
        ],
        isActive: true,
      },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
        pickupPoints: {
          where: { isActive: true },
          include: { windows: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { start: "asc" }] } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!shop) {
      return NextResponse.json({ error: "Tienda no encontrada o inactiva" }, { status: 404 });
    }

    return NextResponse.json({ success: true, shop });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al cargar la tienda" }, { status: 500 });
  }
}
