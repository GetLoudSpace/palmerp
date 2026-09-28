// src/app/api/admin/users/route.ts
// Gestión real de usuarios del tenant — SOLO ADMIN/DEV.
//
// Niveles: DEV (técnico externo, todo) · ADMIN (gerencia, todo funcional) ·
// USUARIO (empleado: roles de trabajo + módulos extra).
// Reglas DEV: solo un DEV crea/edita/desactiva usuarios DEV; un ADMIN ni los ve.
// La baja es lógica (isActive=false): el archivado no puede loguearse pero
// mantiene su histórico. Las contraseñas jamás se devuelven ni se auditan.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { WORK_ROLES, isAssignableModule, isWorkRole } from "@/lib/access";

type Caller = { id: string; role: string; tenantId: string };

async function requireManager(): Promise<{ caller: Caller } | { error: NextResponse }> {
  const session = await getServerSession(authOptions);
  const u = session?.user as unknown as Caller | undefined;
  if (!u?.tenantId) {
    return { error: NextResponse.json({ error: "Unauthenticated" }, { status: 401 }) };
  }
  if (u.role !== "ADMIN" && u.role !== "DEV") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { caller: u };
}

function sanitize(row: Record<string, unknown>) {
  const { passwordHash, ...rest } = row;
  return rest;
}

function genTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function GET(req: Request) {
  const auth = await requireManager();
  if ("error" in auth) return auth.error;
  const { caller } = auth;
  const url = new URL(req.url);
  const workRole = url.searchParams.get("workRole");

  const where: Record<string, unknown> = { tenantId: caller.tenantId };
  // Un ADMIN no ve ni gestiona usuarios DEV (solo otro DEV).
  if (caller.role !== "DEV") where.role = { not: "DEV" };
  if (workRole) where.workRoles = { has: workRole };

  const users = await (db as any).user.findMany({ where, orderBy: { createdAt: "desc" } });
  let profiles: any[] = [];
  try {
    profiles = await (db as any).eduTeacherProfile.findMany({
      where: { tenantId: caller.tenantId, userId: { in: users.map((u: any) => u.id) } },
    });
  } catch {}
  const byUser = new Map(profiles.map((p: any) => [p.userId, p]));
  return NextResponse.json({
    success: true,
    users: users.map((u: any) => ({
      ...sanitize(u),
      instruments: byUser.get(u.id)?.instruments ?? [],
    })),
    workRoles: WORK_ROLES,
  });
}

export async function POST(req: Request) {
  const auth = await requireManager();
  if ("error" in auth) return auth.error;
  const { caller } = auth;
  const body = await req.json().catch(() => ({}));

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const level = String(body.level || "USUARIO").toUpperCase();
  if (!name || !email.includes("@")) {
    return NextResponse.json({ error: "Nombre y email válido requeridos" }, { status: 400 });
  }
  if (!["ADMIN", "USUARIO", "DEV"].includes(level)) {
    return NextResponse.json({ error: "Nivel no válido" }, { status: 400 });
  }
  if (level === "DEV" && caller.role !== "DEV") {
    return NextResponse.json({ error: "Solo un DEV puede crear usuarios DEV" }, { status: 403 });
  }

  const workRoles: string[] = Array.isArray(body.workRoles) ? body.workRoles.filter(isWorkRole) : [];
  const extraModules: string[] = Array.isArray(body.extraModules) ? body.extraModules.filter(isAssignableModule) : [];
  const instruments: string[] = Array.isArray(body.instruments) ? body.instruments.map(String) : [];
  const password = typeof body.password === "string" && body.password ? body.password : genTempPassword();
  if (password.length < 8) return NextResponse.json({ error: "Mínimo 8 caracteres" }, { status: 400 });

  const existing = await (db as any).user
    .findUnique({ where: { tenantId_email: { tenantId: caller.tenantId, email } } })
    .catch(() => null);
  if (existing) return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });

  const user = await (db as any).user.create({
    data: {
      tenantId: caller.tenantId,
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: level,
      isActive: body.isActive === false ? false : true,
      workRoles: level === "USUARIO" ? workRoles : [],
      extraModules: level === "USUARIO" ? extraModules : [],
    },
  });

  if (level === "USUARIO" && workRoles.includes("PROFESOR")) {
    try {
      await (db as any).eduTeacherProfile.create({
        data: { tenantId: caller.tenantId, userId: user.id, instruments, isActive: true },
      });
    } catch {}
  }

  try {
    await (db as any).auditLog.create({
      data: {
        tenantId: caller.tenantId,
        userId: caller.id,
        action: "USER_CREATED",
        table: "User",
        recordId: user.id,
        details: `${name} <${email}> nivel ${level} roles ${workRoles.join(",") || "—"} extra ${extraModules.join(",") || "—"}`,
        success: true,
      },
    });
  } catch {}

  return NextResponse.json({ success: true, user: sanitize(user), tempPassword: password });
}

export async function PATCH(req: Request) {
  const auth = await requireManager();
  if ("error" in auth) return auth.error;
  const { caller } = auth;
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const target = await (db as any).user
    .findFirst({ where: { id, tenantId: caller.tenantId } })
    .catch(() => null);
  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  if (target.role === "DEV" && caller.role !== "DEV") {
    return NextResponse.json({ error: "Solo un DEV puede modificar usuarios DEV" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.isActive === "boolean") {
    if (body.isActive === false && id === caller.id) {
      return NextResponse.json({ error: "No puedes desactivarte a ti mismo" }, { status: 400 });
    }
    data.isActive = body.isActive;
  }
  if (typeof body.level === "string") {
    const level = body.level.toUpperCase();
    if (!["ADMIN", "USUARIO", "DEV"].includes(level)) {
      return NextResponse.json({ error: "Nivel no válido" }, { status: 400 });
    }
    if (level === "DEV" && caller.role !== "DEV") {
      return NextResponse.json({ error: "Solo un DEV puede dar nivel DEV" }, { status: 403 });
    }
    if (id === caller.id && level !== target.role) {
      return NextResponse.json({ error: "No puedes cambiar tu propio nivel" }, { status: 400 });
    }
    data.role = level;
    if (level !== "USUARIO") {
      data.workRoles = [];
      data.extraModules = [];
    }
  }
  const finalIsUsuario = String(data.role ?? target.role) === "USUARIO";
  if (Array.isArray(body.workRoles)) {
    if (!finalIsUsuario) return NextResponse.json({ error: "Los roles solo aplican a USUARIO" }, { status: 400 });
    data.workRoles = body.workRoles.filter(isWorkRole);
  }
  if (Array.isArray(body.extraModules)) {
    if (!finalIsUsuario) return NextResponse.json({ error: "Los extras solo aplican a USUARIO" }, { status: 400 });
    data.extraModules = body.extraModules.filter(isAssignableModule);
  }

  let tempPassword: string | undefined;
  if (typeof body.password === "string" && body.password) {
    if (body.password.length < 8) return NextResponse.json({ error: "Mínimo 8 caracteres" }, { status: 400 });
    data.passwordHash = await bcrypt.hash(body.password, 10);
    tempPassword = body.password;
  }

  const updated = await (db as any).user.update({ where: { id }, data });

  // Sincronizar perfil de profesor con el rol PROFESOR.
  const roles: string[] = (updated.workRoles as string[]) ?? [];
  try {
    if (finalIsUsuario && roles.includes("PROFESOR")) {
      const instruments: string[] = Array.isArray(body.instruments) ? body.instruments.map(String) : [];
      await (db as any).eduTeacherProfile.upsert({
        where: { userId: id },
        update: { instruments: instruments.length ? instruments : undefined, isActive: updated.isActive },
        create: { tenantId: caller.tenantId, userId: id, instruments, isActive: updated.isActive ?? true },
      });
    } else {
      await (db as any).eduTeacherProfile.updateMany({ where: { userId: id }, data: { isActive: false } });
    }
  } catch {}

  try {
    await (db as any).auditLog.create({
      data: {
        tenantId: caller.tenantId,
        userId: caller.id,
        action: "USER_UPDATED",
        table: "User",
        recordId: id,
        details: `${updated.name} <${updated.email}> nivel ${updated.role} roles ${(roles as string[]).join(",") || "—"} activo ${updated.isActive ? "sí" : "no"}`,
        success: true,
      },
    });
  } catch {}

  return NextResponse.json({ success: true, user: sanitize(updated), ...(tempPassword ? { tempPassword } : {}) });
}
