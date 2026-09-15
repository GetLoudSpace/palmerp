import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { ApiError, VALID_ROLES, isAdminRole } from "@/lib/professors";

function err(e: unknown) {
  if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: String((e as Error)?.message ?? e) }, { status: 500 });
}

async function requireUser(tenantId: string, id: string) {
  const user = await (db as any).user.findFirst({
    where: { id: String(id), tenantId },
    include: { eduTeacherProfile: true },
  });
  if (!user) throw new ApiError(404, "Usuario no encontrado en este tenant");
  return user;
}

/**
 * PATCH /api/admin/users/:id — edita usuario real (solo ADMIN/DEV).
 * body: { name?, email?, role?, instruments?, isActive?, password? }
 * - Pasar a PROFESSOR crea el perfil (aparece en Profesor). Salir de PROFESSOR lo elimina.
 * - isActive solo aplica a profesores (vive en EduTeacherProfile; User no tiene ese campo).
 * - password resetea la contraseña y devuelve tempPassword para mostrar una sola vez.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isAdminRole(token.role as string)) return NextResponse.json({ error: "Solo ADMIN" }, { status: 403 });
  try {
    const tenantId = String(token.tenantId);
    const { id } = await params;
    const user = await requireUser(tenantId, id);
    const body = await req.json().catch(() => ({}));

    if (typeof body.email === "string" && body.email.trim()) {
      const email = body.email.trim().toLowerCase();
      if (!email.includes("@")) return NextResponse.json({ error: "Email inválido" }, { status: 400 });
      if (email !== user.email) {
        const clash = await (db as any).user
          .findUnique({ where: { tenantId_email: { tenantId, email } } })
          .catch(() => null);
        if (clash) return NextResponse.json({ error: "Ya existe otro usuario con ese email" }, { status: 409 });
        await (db as any).user.update({ where: { id: user.id }, data: { email } });
      }
    }
    if (typeof body.name === "string" && body.name.trim()) {
      await (db as any).user.update({ where: { id: user.id }, data: { name: body.name.trim() } });
    }
    let nextRole = String(user.role);
    if (typeof body.role === "string" && body.role.trim()) {
      const role = body.role.trim().toUpperCase();
      if (!(VALID_ROLES as readonly string[]).includes(role)) {
        return NextResponse.json({ error: "Rol inválido. Usa ADMIN, STAFF, PROFESSOR o DEV." }, { status: 400 });
      }
      if (role !== user.role) {
        await (db as any).user.update({ where: { id: user.id }, data: { role } });
        nextRole = role;
      }
    }
    const instruments = Array.isArray(body.instruments)
      ? body.instruments.map((i: unknown) => String(i).trim().toUpperCase()).filter(Boolean)
      : undefined;

    // Sincronizar perfil de profesor con el rol resultante
    if (nextRole === "PROFESSOR") {
      const data: Record<string, unknown> = {};
      if (instruments !== undefined) data.instruments = instruments;
      if (typeof body.isActive === "boolean") data.isActive = body.isActive;
      if (user.eduTeacherProfile) {
        if (Object.keys(data).length) {
          await (db as any).eduTeacherProfile.update({ where: { userId: user.id }, data });
        }
      } else {
        await (db as any).eduTeacherProfile.create({
          data: { tenantId, userId: user.id, instruments: instruments ?? [], isActive: typeof body.isActive === "boolean" ? body.isActive : true },
        });
      }
    } else {
      if (user.eduTeacherProfile) {
        await (db as any).eduTeacherProfile.delete({ where: { userId: user.id } }).catch(() => null);
      }
      if (typeof body.isActive === "boolean") {
        return NextResponse.json(
          { error: "Solo los profesores tienen estado activo/archivado. Para el resto usa eliminar." },
          { status: 400 },
        );
      }
      if (instruments !== undefined) {
        return NextResponse.json({ error: "Solo los profesores tienen instrumentos" }, { status: 400 });
      }
    }

    let tempPassword: string | undefined;
    if (typeof body.password === "string" && body.password.trim()) {
      const newPass: string = body.password.trim();
      tempPassword = newPass;
      await (db as any).user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPass, 10) } });
    }
    try {
      await (db as any).auditLog.create({
        data: {
          tenantId,
          userId: String(token.id || token.sub || ""),
          action: "USER_UPDATED",
          table: "User",
          recordId: user.id,
          details: `Usuario ${user.email} actualizado (rol ${nextRole})`,
          success: true,
        },
      });
    } catch {}
    const fresh = await requireUser(tenantId, id);
    return NextResponse.json({
      success: true,
      user: {
        id: String(fresh.id),
        name: String(fresh.name),
        email: String(fresh.email),
        role: String(fresh.role),
        isProfessor: Boolean(fresh.eduTeacherProfile) || fresh.role === "PROFESSOR",
        instruments: Array.isArray(fresh.eduTeacherProfile?.instruments) ? fresh.eduTeacherProfile.instruments : [],
        profileActive: fresh.eduTeacherProfile ? Boolean(fresh.eduTeacherProfile.isActive) : null,
      },
      ...(tempPassword ? { tempPassword } : {}),
    });
  } catch (e) {
    return err(e);
  }
}

/**
 * DELETE /api/admin/users/:id — elimina el usuario (solo ADMIN/DEV).
 * Bloqueado con 409 si el profesor tiene clases en el histórico (archívalo antes).
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isAdminRole(token.role as string)) return NextResponse.json({ error: "Solo ADMIN" }, { status: 403 });
  try {
    const tenantId = String(token.tenantId);
    const { id } = await params;
    const user = await requireUser(tenantId, id);
    const lessonCount = await (db as any).eduLesson.count({ where: { teacherId: user.id } }).catch(() => 0);
    if (lessonCount > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: tiene ${lessonCount} clase(s) en el histórico. Archívalo como profesor en su lugar.` },
        { status: 409 },
      );
    }
    if (String(token.id || token.sub || "") === String(user.id)) {
      return NextResponse.json({ error: "No puedes eliminar tu propio usuario" }, { status: 400 });
    }
    await (db as any).eduTeacherProfile.deleteMany({ where: { userId: user.id } }).catch(() => null);
    await (db as any).user.delete({ where: { id: user.id } });
    try {
      await (db as any).auditLog.create({
        data: {
          tenantId,
          userId: String(token.id || token.sub || ""),
          action: "USER_DELETED",
          table: "User",
          recordId: user.id,
          details: `Usuario ${user.email} eliminado`,
          success: true,
        },
      });
    } catch {}
    return NextResponse.json({ success: true });
  } catch (e) {
    return err(e);
  }
}
