// src/lib/userGuards.ts
// Feature #12: reglas PURAS sobre quién puede tocar a quién en Usuarios.
// Solo ADMIN/DEV llegan aquí (el middleware + requireManager lo garantizan;
// el USUARIO/profesor ni ve el módulo settings). Sin Prisma ni Node.
export interface GuardCaller {
  id: string;
  role: string;
}

export interface GuardTarget {
  id: string;
  role: string;
}

/** Editar ficha (incl. cambiar email): ADMIN/DEV, y DEV solo tocado por DEV. */
export function canEditUser(caller: GuardCaller, target: GuardTarget): boolean {
  if (caller.role !== "ADMIN" && caller.role !== "DEV") return false;
  if (target.role === "DEV" && caller.role !== "DEV") return false;
  return true;
}

/** Borrado real: como editar + nunca a sí mismo. */
export function canDeleteUser(caller: GuardCaller, target: GuardTarget): boolean {
  if (!canEditUser(caller, target)) return false;
  if (caller.id === target.id) return false;
  return true;
}

/** Email válido de login (minúsculas, formato básico). null si inválido. */
export function normalizeLoginEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

/** PIN de fichaje: 4-8 dígitos. */
export function isValidClockPin(raw: unknown): boolean {
  return typeof raw === "string" && /^\d{4,8}$/.test(raw.trim());
}
