import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  ApiError,
  countTeacherLessons,
  createProfessorUser,
  deleteProfessor,
  isAdminRole,
  listProfessors,
  updateProfessor,
} from "@/lib/professors";

function err(e: unknown) {
  if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: String((e as Error)?.message ?? e) }, { status: 500 });
}

/**
 * POST /api/education/teachers — crea un PROFESOR (solo ADMIN/DEV).
 * Un profesor siempre es un User real (role PROFESSOR) + EduTeacherProfile.
 * body: { name, email, phone?, instruments?, password? }
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isAdminRole(token.role as string)) {
    return NextResponse.json({ error: "Solo ADMIN puede crear profesores" }, { status: 403 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const { user, profile, tempPassword } = await createProfessorUser(String(token.tenantId), {
      name: body.name,
      email: body.email,
      password: body.password,
      instruments: body.instruments,
      invitedBy: String(token.id || token.sub || ""),
    });
    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, role: user.role, isProfessor: true },
      profile: { id: profile.id, instruments: profile.instruments },
      tempPassword,
    });
  } catch (e) {
    return err(e);
  }
}

/** GET /api/education/teachers — profesores reales del tenant (usuarios vinculados). */
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const tenantId = String(token.tenantId);
    const teachers = await listProfessors(tenantId);
    const withLessons = await Promise.all(
      teachers.map(async (t) => ({ ...t, lessonCount: await countTeacherLessons(t.userId) })),
    );
    return NextResponse.json({ success: true, teachers: withLessons, users: withLessons });
  } catch (e) {
    return err(e);
  }
}

/**
 * PATCH /api/education/teachers — edita o archiva/activa (solo ADMIN/DEV).
 * body: { userId, name?, instruments?, isActive? }
 */
export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isAdminRole(token.role as string)) {
    return NextResponse.json({ error: "Solo ADMIN puede modificar profesores" }, { status: 403 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.userId) return NextResponse.json({ error: "userId requerido" }, { status: 400 });
    await updateProfessor(String(token.tenantId), String(body.userId), {
      name: body.name,
      instruments: body.instruments,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return err(e);
  }
}

/**
 * DELETE /api/education/teachers?userId=...[&hard=1] — archiva o elimina (solo ADMIN/DEV).
 * Sin hard: archiva (isActive=false, mantiene clases). Con hard=1: elimina usuario+perfil,
 * bloqueado con 409 si tiene clases en el histórico.
 */
export async function DELETE(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isAdminRole(token.role as string)) {
    return NextResponse.json({ error: "Solo ADMIN puede eliminar profesores" }, { status: 403 });
  }
  try {
    const userId = new URL(req.url).searchParams.get("userId");
    const hard = new URL(req.url).searchParams.get("hard") === "1";
    if (!userId) return NextResponse.json({ error: "userId requerido" }, { status: 400 });
    await deleteProfessor(String(token.tenantId), userId, hard);
    return NextResponse.json({ success: true });
  } catch (e) {
    return err(e);
  }
}
