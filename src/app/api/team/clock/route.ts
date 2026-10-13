// src/app/api/team/clock/route.ts
// Feature #13: fichajes reales. Terminal compartida tras login (cualquier
// usuario activo del tenant): el empleado marca su PIN (4-8 dígitos,
// configurado por ADMIN/DEV en su ficha) y se registra ENTRADA/SALIDA.
// Sin sesión → 401. Todo scoped por tenantId de sesión + AuditLog.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import db, { withTenantContext } from "@/lib/db";
import { authOptions } from "@/lib/auth";

type Caller = { id: string; role: string; tenantId: string };

async function requireClockUser(): Promise<{ caller: Caller } | { error: NextResponse }> {
  const session = await getServerSession(authOptions);
  const u = session?.user as unknown as (Caller & { isActive?: boolean }) | undefined;
  if (!u?.tenantId) return { error: NextResponse.json({ error: "Unauthenticated" }, { status: 401 }) };
  if (u.isActive === false) return NextResponse.json({ error: "Forbidden" }, { status: 403 }) as never;
  return { caller: { id: u.id, role: u.role, tenantId: u.tenantId } };
}

function dayBounds(d = new Date()): { from: Date; to: Date } {
  const from = new Date(d);
  from.setHours(0, 0, 0, 0);
  const to = new Date(d);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

/** GET ?today=1 (defecto): fichajes de hoy del tenant + mi último estado. */
export async function GET(req: Request) {
  const auth = await requireClockUser();
  if ("error" in auth) return auth.error;
  const { caller } = auth;
  const url = new URL(req.url);

  const userId = url.searchParams.get("userId");
  if (userId && userId !== caller.id && caller.role !== "ADMIN" && caller.role !== "DEV") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const who = userId || caller.id;

  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const { from: todayFrom, to: todayTo } = dayBounds();
  const from = fromParam ? new Date(fromParam) : todayFrom;
  const to = toParam ? new Date(toParam) : todayTo;

  const [mine, today] = await Promise.all([
    (db as any).teamClockEntry.findFirst({
      where: { tenantId: caller.tenantId, userId: who },
      orderBy: { at: "desc" },
      select: { kind: true, at: true },
    }),
    (db as any).teamClockEntry.findMany({
      where: { tenantId: caller.tenantId, at: { gte: todayFrom, lte: todayTo } },
      orderBy: { at: "desc" },
      take: 200,
      select: { id: true, userName: true, kind: true, at: true },
    }),
  ]);

  return NextResponse.json({
    success: true,
    myLast: mine ? { kind: (mine as { kind: string }).kind, at: (mine as { at: Date }).at } : null,
    // Estado actual: dentro si mi último registro (de hoy) fue ENTRADA.
    inside:
      !!mine &&
      (mine as { kind: string }).kind === "IN" &&
      new Date((mine as { at: Date }).at) >= todayFrom,
    from: from.toISOString(),
    to: to.toISOString(),
    today,
  });
}

/** POST { pin, kind?: "IN"|"OUT"|"AUTO" }: registra fichaje del dueño del PIN. */
export async function POST(req: Request) {
  const auth = await requireClockUser();
  if ("error" in auth) return auth.error;
  const { caller } = auth;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const pin = String(body.pin || "").trim();
  if (!/^\d{4,8}$/.test(pin)) return NextResponse.json({ error: "PIN de 4-8 dígitos" }, { status: 400 });
  const want = String(body.kind || "AUTO").toUpperCase();
  if (want !== "IN" && want !== "OUT" && want !== "AUTO") {
    return NextResponse.json({ error: "kind no válido (IN/OUT/AUTO)" }, { status: 400 });
  }

  const candidates = (await (db as any).user.findMany({
    where: { tenantId: caller.tenantId, isActive: true, clockPin: { not: null } },
    select: { id: true, name: true, clockPin: true },
  })) as { id: string; name: string; clockPin: string }[];

  let owner: { id: string; name: string } | null = null;
  for (const c of candidates) {
    try {
      if (await bcrypt.compare(pin, c.clockPin)) {
        owner = { id: c.id, name: c.name };
        break;
      }
    } catch {}
  }
  if (!owner) return NextResponse.json({ error: "PIN no reconocido" }, { status: 401 });

  const last = (await (db as any).teamClockEntry.findFirst({
    where: { tenantId: caller.tenantId, userId: owner.id },
    orderBy: { at: "desc" },
    select: { kind: true, at: true },
  })) as { kind: string; at: Date } | null;

  const { from: todayFrom } = dayBounds();
  let kind: string = want;
  if (want === "AUTO") {
    kind = last && last.kind === "IN" && new Date(last.at) >= todayFrom ? "OUT" : "IN";
  }

  const entry = await withTenantContext(caller.tenantId, async (tx) =>
    ((tx as unknown as { teamClockEntry: { create: (a: unknown) => Promise<Record<string, unknown>> } }).teamClockEntry.create({
      data: {
        tenantId: caller.tenantId,
        userId: owner!.id,
        userName: owner!.name,
        kind,
        source: "TERMINAL",
      },
    })),
  );

  try {
    await (db as any).auditLog.create({
      data: {
        tenantId: caller.tenantId,
        userId: caller.id,
        action: kind === "IN" ? "CLOCK_IN" : "CLOCK_OUT",
        table: "TeamClockEntry",
        recordId: String((entry as Record<string, unknown>).id),
        details: `${owner.name} fichó ${kind === "IN" ? "ENTRADA" : "SALIDA"} en terminal (por ${caller.id === owner.id ? "sí mismo" : "terminal compartido"})`,
        success: true,
      },
    });
  } catch {}

  return NextResponse.json({
    success: true,
    kind,
    userName: owner.name,
    at: (entry as Record<string, unknown>).at,
  });
}
