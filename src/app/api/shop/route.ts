import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getToken } from "next-auth/jwt";
const prisma: any = db;

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    let shop = await prisma.shop.findFirst({
      where: { tenantId: token.tenantId },
      include: {
        products: { orderBy: { sortOrder: "asc" } },
        pickupPoints: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!shop) {
      // Auto create a default shop for this tenant
      const tenant = await prisma.tenant.findUnique({ where: { id: token.tenantId } });
      const slug = tenant?.slug || `tienda-${Date.now()}`;
      
      shop = await prisma.shop.create({
        data: {
          tenantId: token.tenantId,
          slug,
          name: tenant?.name || "Mi Obrador & Pedidos",
          description: "Encarga tu pan y productos artesanales para recogida local.",
          templateId: "obrador-tradicional",
          mode: "MINIMAL",
          businessContext: `Negocio artesanal de ${tenant?.name || "panadería"}. Elaboración propia y reparto local.`,
          pickupPoints: {
            create: [
              { name: "Obrador Principal", address: "Plaza Mayor, 1", schedule: "09:00 - 13:30" },
              { name: "Punto Reparto Pueblo", address: "Entrada del Parque", schedule: "11:00 - 11:30" },
            ],
          },
          products: {
            create: [
              { name: "Pan de Masa Madre (1kg)", description: "Fermentación lenta de 24h", price: 3.50, maxDaily: 30, currentStock: 30 },
              { name: "Barra Rústica", description: "Corteza crujiente y miga alveolada", price: 1.50, maxDaily: 50, currentStock: 50 },
            ],
          },
        },
        include: {
          products: true,
          pickupPoints: true,
        },
      });
    }

    return NextResponse.json({ success: true, shop });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener tienda" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, description, mode, templateId, isActive, businessContext, customHtml, customCss } = body;

    let shop = await prisma.shop.findFirst({ where: { tenantId: token.tenantId } });

    if (shop) {
      shop = await prisma.shop.update({
        where: { id: shop.id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(mode !== undefined && { mode }),
          ...(templateId !== undefined && { templateId }),
          ...(isActive !== undefined && { isActive }),
          ...(businessContext !== undefined && { businessContext }),
          ...(customHtml !== undefined && { customHtml }),
          ...(customCss !== undefined && { customCss }),
        },
      });
    }

    return NextResponse.json({ success: true, shop });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar tienda" }, { status: 500 });
  }
}
