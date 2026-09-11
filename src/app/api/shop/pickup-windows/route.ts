import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getToken } from "next-auth/jwt";
const prisma: any = db;

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const shop = await prisma.shop.findFirst({ where: { tenantId: token.tenantId } });
  if (!shop) return NextResponse.json({ windows: [] });
  const points = await prisma.pickupPoint.findMany({ where: { shopId: shop.id }, select: { id: true } });
  const ids = points.map((p: any) => p.id);
  const windows = await prisma.pickupWindow.findMany({ where: { pickupPointId: { in: ids } }, orderBy: [{ sortOrder: "asc" }, { start: "asc" }] });
  return NextResponse.json({ success: true, windows });
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json();
  const { id, pickupPointId, label, start, end, capacity, isActive, sortOrder } = body;
  if (!pickupPointId || !label || !start || !end) return NextResponse.json({ error: "pickupPointId, label, start y end son obligatorios" }, { status: 400 });
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return NextResponse.json({ error: "Formato horario HH:MM" }, { status: 400 });
  const cap = capacity !== undefined ? Math.max(1, Math.min(500, parseInt(String(capacity), 10) || 30)) : 30;
  try {
    let win;
    if (id) {
      win = await prisma.pickupWindow.update({ where: { id }, data: { label: String(label).trim(), start, end, capacity: cap, isActive: isActive !== undefined ? !!isActive : true, sortOrder: sortOrder !== undefined ? parseInt(String(sortOrder), 10) : 0 } });
    } else {
      win = await prisma.pickupWindow.create({ data: { pickupPointId, label: String(label).trim(), start, end, capacity: cap, isActive: isActive !== undefined ? !!isActive : true, sortOrder: sortOrder !== undefined ? parseInt(String(sortOrder), 10) : 0 } });
    }
    return NextResponse.json({ success: true, window: win });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error guardando franja" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  await prisma.pickupWindow.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
