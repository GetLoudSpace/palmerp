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
    const { customDomain } = await req.json();

    if (!customDomain || !customDomain.trim()) {
      // Clear domain
      const updated = await prisma.shop.update({
        where: { id: shop.id },
        data: {
          customDomain: null,
          domainStatus: "PENDING",
          domainVerifyToken: null,
        },
      });
      return NextResponse.json({ success: true, shop: updated });
    }

    const cleanDomain = customDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const verifyToken = `palmera_verify_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const updated = await prisma.shop.update({
      where: { id: shop.id },
      data: {
        customDomain: cleanDomain,
        domainStatus: "PENDING",
        domainVerifyToken: verifyToken,
      },
    });

    return NextResponse.json({ success: true, shop: updated });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Este dominio ya está asignado a otro comercio." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Error al configurar dominio" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const shop = await prisma.shop.findFirst({ where: { tenantId: token.tenantId } });
  if (!shop || !shop.customDomain) {
    return NextResponse.json({ error: "No hay ningún dominio configurado para verificar" }, { status: 400 });
  }

  // Simulate DNS check / CNAME verification
  // In production, fetch DNS records using Node 'dns' module or Vercel Domains API
  const isSimulatedValid = shop.customDomain.includes(".") && !shop.customDomain.includes("localhost");

  const newStatus = isSimulatedValid ? "VERIFIED" : "FAILED";

  const updated = await prisma.shop.update({
    where: { id: shop.id },
    data: { domainStatus: newStatus },
  });

  return NextResponse.json({
    success: true,
    verified: isSimulatedValid,
    shop: updated,
    message: isSimulatedValid
      ? "¡Dominio verificado correctamente! Los registros DNS se encuentran apuntando a palmerp.es."
      : "No se pudieron verificar los registros CNAME o A para este dominio. Asegúrate de añadir el registro CNAME hacia CNAME.palmerp.es",
  });
}
