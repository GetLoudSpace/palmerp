import bcrypt from "bcryptjs";
import db from "@/lib/db";

/**
 * Fuente única de verdad: un profesor SIEMPRE es un `User` real
 * (role PROFESSOR) + `EduTeacherProfile` con sus instrumentos.
 * No existen profesores huérfanos: la sección Profesor lista usuarios,
 * y crear un profesor crea un usuario.
 */

export const PROFESSOR_ROLE = "PROFESSOR" as const;
export const VALID_ROLES = ["ADMIN", "STAFF", "PROFESSOR", "DEV"] as const;

export function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "DEV";
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function normEmail(email: unknown) {
  const e = String(email ?? "").trim().toLowerCase();
  if (!e.includes("@")) throw new ApiError(400, "Email inválido");
  return e;
}

function normInstruments(instruments: unknown): string[] {
  if (!Array.isArray(instruments)) return [];
  return instruments.map((i) => String(i).trim().toUpperCase()).filter(Boolean);
}

export type ProfessorDTO = {
  userId: string;
  profileId: string | null;
  name: string;
  email: string;
  instruments: string[];
  isActive: boolean;
  createdAt: string;
};

/** Lista unificada: perfiles + usuarios PROFESSOR sin perfil (legado). */
export async function listProfessors(tenantId: string): Promise<ProfessorDTO[]> {
  const profiles = await (db as any).eduTeacherProfile.findMany({
    where: { tenantId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  const out: ProfessorDTO[] = [];
  const seen = new Set<string>();
  for (const p of profiles) {
    if (!p?.user) continue; // perfil huérfano sin user: se ignora (no se puede vincular a nada)
    seen.add(String(p.userId));
    out.push({
      userId: String(p.user.id),
      profileId: String(p.id),
      name: String(p.user.name),
      email: String(p.user.email),
      instruments: Array.isArray(p.instruments) ? p.instruments : [],
      isActive: Boolean(p.isActive),
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
    });
  }
  const orphans = await (db as any).user.findMany({
    where: { tenantId, role: "PROFESSOR" },
    orderBy: { createdAt: "desc" },
  });
  for (const u of orphans) {
    if (seen.has(String(u.id))) continue;
    out.push({
      userId: String(u.id),
      profileId: null,
      name: String(u.name),
      email: String(u.email),
      instruments: [],
      isActive: true,
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
    });
  }
  return out;
}

/** Crea User (role PROFESSOR) + EduTeacherProfile. Falla con 409 si el email ya existe. */
export async function createProfessorUser(
  tenantId: string,
  input: { name?: string; email?: string; password?: string; instruments?: unknown; invitedBy?: string },
) {
  const name = String(input.name ?? "").trim();
  if (!name) throw new ApiError(400, "Nombre requerido");
  const email = normEmail(input.email);
  const existing = await (db as any).user
    .findUnique({ where: { tenantId_email: { tenantId, email } } })
    .catch(() => null);
  if (existing) throw new ApiError(409, "Ya existe un usuario con ese email en este tenant");

  const tempPassword = String(input.password ?? "").trim() || `Prof-${Math.random().toString(36).slice(2, 10)}A1!`;
  const hash = await bcrypt.hash(tempPassword, 10);
  const user = await (db as any).user.create({
    data: { tenantId, name, email, passwordHash: hash, role: PROFESSOR_ROLE },
  });
  const profile = await (db as any).eduTeacherProfile.create({
    data: { tenantId, userId: user.id, instruments: normInstruments(input.instruments), isActive: true },
  });
  try {
    await (db as any).auditLog.create({
      data: {
        tenantId,
        userId: input.invitedBy ?? null,
        action: "EDU_TEACHER_INVITED",
        table: "User",
        recordId: user.id,
        details: `Profesor ${name} <${email}> role PROFESSOR instrumentos ${normInstruments(input.instruments).join(",")}`,
        success: true,
      },
    });
  } catch {}
  return { user, profile, tempPassword };
}

/** Edita nombre y/o instrumentos del profesor (usuario + perfil). */
export async function updateProfessor(
  tenantId: string,
  userId: string,
  input: { name?: string; instruments?: unknown; isActive?: boolean },
) {
  const user = await (db as any).user.findFirst({ where: { id: String(userId), tenantId } });
  if (!user) throw new ApiError(404, "Usuario no encontrado en este tenant");

  if (typeof input.name === "string" && input.name.trim()) {
    await (db as any).user.update({ where: { id: user.id }, data: { name: input.name.trim() } });
  }
  if (input.instruments !== undefined || input.isActive !== undefined) {
    const data: Record<string, unknown> = {};
    if (input.instruments !== undefined) data.instruments = normInstruments(input.instruments);
    if (input.isActive !== undefined) data.isActive = Boolean(input.isActive);
    const existingProfile = await (db as any).eduTeacherProfile.findUnique({ where: { userId: user.id } }).catch(() => null);
    if (existingProfile) {
      await (db as any).eduTeacherProfile.update({ where: { userId: user.id }, data });
    } else if (user.role === "PROFESSOR" || user.role === "STAFF") {
      // Usuario PROFESSOR legado sin perfil: se crea al editar (sigue siendo el mismo usuario)
      await (db as any).eduTeacherProfile.create({
        data: {
          tenantId,
          userId: user.id,
          instruments: normInstruments(input.instruments),
          isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
        },
      });
    } else {
      throw new ApiError(400, "Este usuario no es profesor: cámbiale el rol a PROFESOR primero");
    }
  }
  try {
    await (db as any).auditLog.create({
      data: {
        tenantId,
        action: "EDU_TEACHER_UPDATED",
        table: "User",
        recordId: user.id,
        details: `Profesor ${user.email} actualizado`,
        success: true,
      },
    });
  } catch {}
  return true;
}

/**
 * Archivar (hard=false): profile.isActive=false, mantiene histórico de clases.
 * Eliminar (hard=true): borra perfil + usuario; bloqueado con 409 si tiene clases.
 */
export async function deleteProfessor(tenantId: string, userId: string, hard: boolean) {
  const user = await (db as any).user.findFirst({ where: { id: String(userId), tenantId } });
  if (!user) throw new ApiError(404, "Usuario no encontrado en este tenant");
  const lessonCount = await (db as any).eduLesson.count({ where: { teacherId: user.id } }).catch(() => 0);
  if (hard && lessonCount > 0) {
    throw new ApiError(
      409,
      `No se puede eliminar: tiene ${lessonCount} clase(s) en el histórico. Archívalo en su lugar.`,
    );
  }
  if (hard) {
    await (db as any).eduTeacherProfile.deleteMany({ where: { userId: user.id } }).catch(() => null);
    await (db as any).user.delete({ where: { id: user.id } });
  } else {
    const existingProfile = await (db as any).eduTeacherProfile.findUnique({ where: { userId: user.id } }).catch(() => null);
    if (existingProfile) {
      await (db as any).eduTeacherProfile.update({ where: { userId: user.id }, data: { isActive: false } });
    } else {
      throw new ApiError(400, "Este usuario no tiene perfil de profesor que archivar");
    }
  }
  try {
    await (db as any).auditLog.create({
      data: {
        tenantId,
        action: hard ? "EDU_TEACHER_DELETED" : "EDU_TEACHER_ARCHIVED",
        table: "User",
        recordId: user.id,
        details: `Profesor ${user.email} ${hard ? "eliminado" : "archivado"}`,
        success: true,
      },
    });
  } catch {}
  return true;
}

/** Nº de clases impartidas (para avisos de borrado). */
export async function countTeacherLessons(userId: string) {
  return (db as any).eduLesson.count({ where: { teacherId: String(userId) } }).catch(() => 0);
}
