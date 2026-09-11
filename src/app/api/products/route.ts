import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getToken } from "next-auth/jwt";
const prisma: any = db;

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const isComponent = searchParams.get("isComponent");
  const isSellable = searchParams.get("isSellable");
  const search = searchParams.get("search");

  // Guard: client stale (hot-reload after `prisma generate`)
  if (!(prisma as any)?.coreProduct) {
    return NextResponse.json(
      {
        error: "Prisma client desactualizado: ejecuta 'npx prisma generate' y reinicia el servidor (npm run dev). Si no tienes BBDD, configura DATABASE_URL (Supabase pooler 6543) y luego 'npx prisma db push'.",
        code: "PRISMA_STALE",
        hint: "El delegate prisma.coreProduct no existe en el cliente cargado en memoria. Reinicia next dev.",
      },
      { status: 500 }
    );
  }

  try {
    let products = await prisma.coreProduct.findMany({
      where: {
        tenantId: token.tenantId,
        ...(type && type !== "ALL" ? { productType: type as any } : {}),
        ...(isComponent === "true" ? { isComponent: true } : {}),
        ...(isSellable === "true" ? { isSellable: true } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { code: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        bomLinesAsParent: {
          include: { ingredient: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // Auto-seed initial bakery pillar products if catalog is completely empty
    if (products.length === 0 && (!type || type === "ALL") && !search) {
      await seedInitialBakeryCatalog(token.tenantId);
      products = await prisma.coreProduct.findMany({
        where: { tenantId: token.tenantId },
        include: {
          bomLinesAsParent: {
            include: { ingredient: true },
          },
        },
        orderBy: { name: "asc" },
      });
    }

    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    console.error("[GET /api/products]", error);
    const isNoDb = error?.code === "P1001" || /Can't reach database/i.test(error?.message || "");
    const isNoTable = error?.code === "P2021" || /does not exist/i.test(error?.message || "");
    if (isNoDb) {
      return NextResponse.json(
        {
          error: `Base de datos no disponible (${error.code || "P1001"}): ${error.message}. Configura DATABASE_URL (Supabase pooler 6543 ?pgbouncer=true) y ejecuta 'npx prisma db push'.`,
          code: error.code,
          stack: error.stack?.slice(0, 4000),
          hint: "Sin BBDD no se puede guardar productos. Para dev sin DB, usa docker: docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=palmera postgres:16",
        },
        { status: 503 }
      );
    }
    if (isNoTable) {
      return NextResponse.json(
        {
          error: `Tablas no creadas (${error.code || "P2021"}): ${error.message}. Ejecuta 'npx prisma db push' contra tu DATABASE_URL.`,
          code: error.code,
          stack: error.stack?.slice(0, 4000),
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message || "Error al obtener productos", code: error.code, stack: error.stack?.slice(0, 4000) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!(prisma as any)?.coreProduct) {
    return NextResponse.json(
      {
        error: "Prisma client desactualizado: ejecuta 'npx prisma generate' y reinicia el servidor (npm run dev).",
        code: "PRISMA_STALE",
        hint: "prisma.coreProduct no existe en el cliente en memoria.",
      },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { id, name, code, description, productType, price, cost, uom, isSellable, isPurchasable, isComponent, image, stockQty, lowStockThreshold } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "El nombre del producto es obligatorio." }, { status: 400 });
    }

    const stockVal = stockQty !== undefined && stockQty !== "" ? parseFloat(String(stockQty)) : undefined;
    const lowStockVal = lowStockThreshold !== undefined && lowStockThreshold !== "" && lowStockThreshold !== null ? parseFloat(String(lowStockThreshold)) : null;

    let product;
    if (id) {
      product = await prisma.coreProduct.update({
        where: { id },
        data: {
          name: name.trim(),
          code: code ? code.trim() : null,
          description: description ? description.trim() : null,
          productType: productType || "STORABLE",
          price: parseFloat(price || 0),
          cost: parseFloat(cost || 0),
          uom: uom || "ud",
          isSellable: isSellable !== undefined ? Boolean(isSellable) : true,
          isPurchasable: isPurchasable !== undefined ? Boolean(isPurchasable) : true,
          isComponent: isComponent !== undefined ? Boolean(isComponent) : false,
          image,
          ...(stockVal !== undefined && !Number.isNaN(stockVal) ? { stockQty: stockVal } : {}),
          ...(lowStockThreshold !== undefined ? { lowStockThreshold: lowStockVal } : {}),
        },
      });
      if (stockVal !== undefined && !Number.isNaN(stockVal)) {
        const prev = await prisma.coreProduct.findUnique({ where: { id } }).catch(() => null);
        // movimiento de ajuste manual se registra como ADJUST si cambia stock
        try {
          const diff = stockVal - Number((prev as any)?.stockQty ?? 0);
          if (Math.abs(diff) > 0.0001) {
            await prisma.stockMovement.create({ data: { tenantId: token.tenantId, coreProductId: id, type: "ADJUST", qty: Math.abs(diff), uom: uom || "kg", reason: `AJUSTE MANUAL ${diff > 0 ? "+" : ""}${diff}` } });
          }
        } catch {}
      }
    } else {
      product = await prisma.coreProduct.create({
        data: {
          tenantId: token.tenantId,
          name: name.trim(),
          code: code ? code.trim() : null,
          description: description ? description.trim() : null,
          productType: productType || "STORABLE",
          price: parseFloat(price || 0),
          cost: parseFloat(cost || 0),
          uom: uom || "ud",
          isSellable: isSellable !== undefined ? Boolean(isSellable) : true,
          isPurchasable: isPurchasable !== undefined ? Boolean(isPurchasable) : true,
          isComponent: isComponent !== undefined ? Boolean(isComponent) : false,
          image,
          stockQty: stockVal !== undefined && !Number.isNaN(stockVal) ? stockVal : 0,
          lowStockThreshold: lowStockVal,
        },
      });
    }

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    console.error("[POST /api/products]", error);
    const isNoDb = error?.code === "P1001" || /Can't reach database/i.test(error?.message || "");
    const isNoTable = error?.code === "P2021" || /does not exist/i.test(error?.message || "");
    // Detect stale client (undefined delegate)
    const isStale = /Cannot read properties of undefined.*create/i.test(error?.message || "") || /coreProduct/i.test(error?.message || "");
    if (isNoDb) {
      return NextResponse.json(
        {
          error: `Base de datos no disponible (${error.code || "P1001"}): ${error.message}. Causa: no tienes BBDD conectada. Configura DATABASE_URL (Supabase pooler 6543 ?pgbouncer=true) y ejecuta 'npx prisma db push'.`,
          code: error.code,
          stack: error.stack?.slice(0, 5000),
          hint: "Para dev local sin Supabase: docker run --name palmera-pg -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=palmera -d postgres:16",
        },
        { status: 503 }
      );
    }
    if (isStale) {
      return NextResponse.json(
        {
          error: `Prisma client desactualizado: ${error.message}. Ejecuta 'npx prisma generate' y REINICIA el servidor (cerrar npm run dev y volver a iniciarlo).`,
          code: error.code || "PRISMA_STALE",
          stack: error.stack?.slice(0, 5000),
        },
        { status: 500 }
      );
    }
    if (isNoTable) {
      return NextResponse.json(
        {
          error: `Tablas no creadas (${error.code}): ${error.message}. Ejecuta 'npx prisma db push'.`,
          code: error.code,
          stack: error.stack?.slice(0, 4000),
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message || "Error al guardar producto", code: error.code, stack: error.stack?.slice(0, 5000) }, { status: 500 });
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

  await prisma.coreProduct.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

async function seedInitialBakeryCatalog(tenantId: string) {
  const flour = await prisma.coreProduct.create({
    data: {
      tenantId,
      name: "Harina de Trigo Tradicional (Fuerza W250)",
      code: "ING-HAR-01",
      description: "Harina de trigo de gran fuerza para panificación artesanal",
      productType: "CONSUMABLE",
      price: 0,
      cost: 0.85,
      uom: "kg",
      isSellable: false,
      isPurchasable: true,
      isComponent: true,
      stockQty: 50,
      lowStockThreshold: 5,
    },
  });

  const salt = await prisma.coreProduct.create({
    data: {
      tenantId,
      name: "Sal Marina Grano Fino",
      code: "ING-SAL-01",
      description: "Sal marina natural para masa de pan",
      productType: "CONSUMABLE",
      price: 0,
      cost: 0.30,
      uom: "kg",
      isSellable: false,
      isPurchasable: true,
      isComponent: true,
      stockQty: 10,
      lowStockThreshold: 1,
    },
  });

  const yeast = await prisma.coreProduct.create({
    data: {
      tenantId,
      name: "Levadura Madre Ecológica",
      code: "ING-LEV-01",
      description: "Masa madre natural viva de cultivo propio",
      productType: "CONSUMABLE",
      price: 0,
      cost: 1.20,
      uom: "kg",
      isSellable: false,
      isPurchasable: true,
      isComponent: true,
      stockQty: 5,
      lowStockThreshold: 0.5,
    },
  });

  const bread = await prisma.coreProduct.create({
    data: {
      tenantId,
      name: "Pan de Masa Madre Artesano (1kg)",
      code: "PAN-MM-01",
      description: "Pan de fermentación lenta de 24h horneado a la suela",
      productType: "MANUFACTURED_KIT",
      price: 3.50,
      cost: 0.55, // Estimated calculated cost
      uom: "ud",
      isSellable: true,
      isPurchasable: false,
      isComponent: false,
    },
  });

  // Link ingredients to Pan de Masa Madre (BOM)
  await prisma.bomLine.createMany({
    data: [
      { parentId: bread.id, ingredientId: flour.id, quantity: 0.6, uom: "kg", notes: "600g Harina" },
      { parentId: bread.id, ingredientId: salt.id, quantity: 0.015, uom: "kg", notes: "15g Sal" },
      { parentId: bread.id, ingredientId: yeast.id, quantity: 0.05, uom: "kg", notes: "50g Masa Madre" },
    ],
  });
}
