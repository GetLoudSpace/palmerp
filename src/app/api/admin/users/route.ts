import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import {
  ApiError,
  VALID_ROLES,
  createProfessorUser,
  isAdminRole,
} from "@/lib/professors";

function err(e: unknown) {
  if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: String((e as Error)?.message ?? e) }, { status: 500 });
}

/** GET /api/admin/users — usuarios reales del tenant (solo ADMIN/DEV). */
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isAdminRole(token.role as string)) return NextResponse.json({ error: "Solo ADMIN" }, { status: 403 });
  try {
    const tenantId = String(token.tenantId);
    const users = await (db as any).user.findMany({
      where: { tenantId },
      include: { eduTeacherProfile: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      success: true,
      users: users.map((u: any) => ({
        id: String(u.id),
        name: String(u.name),
        email: String(u.email),
        role: String(u.role),
        createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : null,
        isProfessor: Boolean(u.eduTeacherProfile) || u.role === "PROFESSOR",
        instruments: Array.isArray(u.eduTeacherProfile?.instruments) ? u.eduTeacherProfile.instruments : [],
        profileActive: u.eduTeacherProfile ? Boolean(u.eduTeacherProfile.isActive) : null,
      })),
    });
  } catch (e) {
    return err(e);
  }
}

/**
 * POST /api/admin/users — crea un usuario real (solo ADMIN/DEV).
 * body: { name, email, password?, role: ADMIN|STAFF|PROFESSOR|DEV, instruments? }
 * Con role=PROFESSOR crea además EduTeacherProfile → aparece en Profesor vinculado.
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isAdminRole(token.role as string)) return NextResponse.json({ error: "Solo ADMIN" }, { status: 403 });
  try {
    const tenantId = String(token.tenantId);
    const body = await req.json().catch(() => ({}));
    const role = String(body.role ?? "STAFF").toUpperCase();
    if (!(VALID_ROLES as readonly string[]).includes(role)) {
      return NextResponse.json({ error: "Rol inválido. Usa ADMIN, STAFF, PROFESSOR o DEV." }, { status: 400 });
    }
    if (role === "PROFESSOR") {
      const { user, tempPassword } = await createProfessorUser(tenantId, {
        name: body.name,
        email: body.email,
        password: body.password,
        instruments: body.instruments,
        invitedBy: String(token.id || token.sub || ""),
      });
      return NextResponse.json({
        success: true,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, isProfessor: true },
        tempPassword,
      });
    }
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!name || !email.includes("@")) return NextResponse.json({ error: "Nombre y email válido requeridos" }, { status: 400 });
    const existing = await (db as any).user
      .findUnique({ where: { tenantId_email: { tenantId, email } } })
      .catch(() => null);
    if (existing) return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
    const tempPassword = String(body.password ?? "").trim() || `Palmera-${Math.random().toString(36).slice(2, 10)}A1!`;
    const user = await (db as any).user.create({
      data: { tenantId, name, email, passwordHash: await bcrypt.hash(tempPassword, 10), role },
    });
    try {
      await (db as any).auditLog.create({
        data: {
          tenantId,
          userId: String(token.id || token.sub || ""),
          action: "USER_CREATED",
          table: "User",
          recordId: user.id,
          details: `Usuario ${name} <${email}> role ${role}`,
          success: true,
        },
      });
    } catch {}
    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, isProfessor: false },
      tempPassword,
    });
  } catch (e) {
    return err(e);
  }
}
