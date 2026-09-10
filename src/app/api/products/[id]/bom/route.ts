import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getToken } from "next-auth/jwt";
const prisma: any = db;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const bomLines = await prisma.bomLine.findMany({
      where: { parentId: id },
      include: {
        ingredient: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, bomLines });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener ingredientes" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: parentId } = await params;

  try {
    const body = await req.json();
    const { ingredientId, quantity, uom, notes } = body;

    if (!ingredientId || !quantity) {
      return NextResponse.json({ error: "El ingrediente y la cantidad son obligatorios." }, { status: 400 });
    }

    // Create BOM line
    const line = await prisma.bomLine.create({
      data: {
        parentId,
        ingredientId,
        quantity: parseFloat(quantity),
        uom: uom || "kg",
        notes: notes ? notes.trim() : null,
      },
      include: { ingredient: true },
    });

    // Auto-recalculate parent product total cost
    await recalculateParentCost(parentId);

    return NextResponse.json({ success: true, bomLine: line });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al añadir ingrediente" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: parentId } = await params;
  const { searchParams } = new URL(req.url);
  const lineId = searchParams.get("lineId");

  if (!lineId) {
    return NextResponse.json({ error: "lineId requerido" }, { status: 400 });
  }

  try {
    await prisma.bomLine.delete({ where: { id: lineId } });
    await recalculateParentCost(parentId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al eliminar ingrediente" }, { status: 500 });
  }
}

async function recalculateParentCost(parentId: string) {
  const lines = await prisma.bomLine.findMany({
    where: { parentId },
    include: { ingredient: true },
  });

  const totalCost = lines.reduce((sum: number, l: any) => {
    const ingCost = Number(l.ingredient.cost || 0);
    return sum + ingCost * l.quantity;
  }, 0);

  await prisma.coreProduct.update({
    where: { id: parentId },
    data: {
      cost: totalCost,
      // If parent type was STORABLE or CONSUMABLE, update to MANUFACTURED_KIT if lines > 0
      ...(lines.length > 0 ? { productType: "MANUFACTURED_KIT" } : {}),
    },
  });
}
