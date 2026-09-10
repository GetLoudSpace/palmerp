import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getToken } from "next-auth/jwt";
import { callShopBuilderAI } from "@/lib/ai-service";
const prisma: any = db;

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const shop = await prisma.shop.findFirst({
    where: { tenantId: token.tenantId },
    include: { products: true, pickupPoints: true },
  });

  if (!shop) {
    return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
  }

  try {
    const { message, history, aiConfig } = await req.json();

    const businessContext = `
NOMBRE COMERCIO: ${shop.name}
DESCRIPCIÓN: ${shop.description || "Obrador artesanal"}
DOMINIO/SLUG: ${shop.slug}
PRODUCTOS DISPONIBLES (${shop.products.length}):
${shop.products.map((p: any) => `- ${p.name}: ${p.price}€ (Stock max diario: ${p.maxDaily})`).join("\n")}
PUNTOS DE RECOGIDA (${shop.pickupPoints.length}):
${shop.pickupPoints.map((pt: any) => `- ${pt.name} (${pt.address || ""}) - ${pt.schedule || ""}`).join("\n")}
${shop.businessContext ? `CONTEXTO ADICIONAL: ${shop.businessContext}` : ""}
    `.trim();

    const formattedHistory = (history || []).map((h: any) => ({
      role: h.role,
      content: h.content,
    }));

    formattedHistory.push({ role: "user", content: message });

    const aiRes = await callShopBuilderAI(formattedHistory, businessContext, aiConfig);

    // Save session in DB
    await prisma.shopAISession.create({
      data: {
        shopId: shop.id,
        messages: JSON.parse(JSON.stringify(formattedHistory.concat([{ role: "assistant", content: aiRes.message }]))),
        snapshot: aiRes.customHtml ? { html: aiRes.customHtml, css: aiRes.customCss } : undefined,
      },
    });

    if (aiRes.customHtml) {
      await prisma.shop.update({
        where: { id: shop.id },
        data: {
          customHtml: aiRes.customHtml,
          customCss: aiRes.customCss || "",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: aiRes.message,
      customHtml: aiRes.customHtml,
      customCss: aiRes.customCss,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al comunicarse con la IA" }, { status: 500 });
  }
}
