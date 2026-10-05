// src/lib/requireModule.ts
// Guard de APIs por módulo (solo servidor). El middleware ya filtra por defecto,
// pero cada ruta sensible lo verifica además con la sesión (defensa en profundidad).
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveAccess, canAccessModule } from "@/lib/access";

export async function requireModuleAccess(moduleId: string) {
  const session = await getServerSession(authOptions);
  const u = session?.user;
  if (!u) {
    return { error: NextResponse.json({ error: "Unauthenticated" }, { status: 401 }) as NextResponse };
  }
  const access = resolveAccess({
    role: (u as { role?: string }).role,
    workRoles: (u as { workRoles?: string[] }).workRoles,
    extraModules: (u as { extraModules?: string[] }).extraModules,
  });
  if (!canAccessModule(access, moduleId)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) as NextResponse };
  }
  const tenantId = (u as { tenantId?: string }).tenantId;
  if (!tenantId) {
    return { error: NextResponse.json({ error: "No tenant" }, { status: 400 }) as NextResponse };
  }
  return { session, tenantId };
}
