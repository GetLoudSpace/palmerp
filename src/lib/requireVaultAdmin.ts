// src/lib/requireVaultAdmin.ts
// Guard del vault — SOLO SERVIDOR (next-auth + sesión). No importar desde cliente.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface SessionUser {
  id: string;
  role: string;
  tenantId: string;
  tenantSlug: string;
}

export function getSessionUser(session: unknown): SessionUser | null {
  const u = (session as { user?: Partial<SessionUser> })?.user;
  if (!u?.id || !u?.role || !u?.tenantId) return null;
  return { id: u.id, role: u.role, tenantId: u.tenantId, tenantSlug: u.tenantSlug ?? "" };
}

/** Guard compartido: solo ADMIN/DEV con tenant. Devuelve el usuario o la respuesta de error. */
export async function requireVaultAdmin(): Promise<{ user: SessionUser } | { error: NextResponse }> {
  const session = await getServerSession(authOptions);
  const user = getSessionUser(session);
  if (!user) return { error: NextResponse.json({ error: "Unauthenticated" }, { status: 401 }) };
  if (user.role !== "ADMIN" && user.role !== "DEV") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}
