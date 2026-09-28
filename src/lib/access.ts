// src/lib/access.ts
// Modelo de accesos — PURO (sin Prisma ni Node): se importa en middleware (Edge),
// APIs, sidebar y ficha de usuarios con la misma lógica.
//
// NIVELES (quién es):
//   DEV     → técnico externo: ve TODO (incl. técnico: Actualizaciones, Tech).
//   ADMIN   → gerencia: ve TODO lo funcional (incl. Usuarios no-DEV, Credenciales, Modos).
//   USUARIO → empleado: solo sus roles de trabajo + módulos extra.
//
// ROLES DE TRABAJO (qué hace el USUARIO, en español). Cada rol abre módulos:
//   PROFESOR → EDUCACION + Contactos + Conversaciones
//   COMERCIAL → VENTAS + Contactos + Conversaciones + Comunicación
//   FINANZAS  → FINANZAS + Conversaciones
// Excepciones: `extraModules` abre módulos sueltos (jamás "settings").

export type AccessLevel = "DEV" | "ADMIN" | "USUARIO";

export interface WorkRoleDef {
  id: string;
  label: string;
  description: string;
  modules: string[];
}

export const WORK_ROLES: readonly WorkRoleDef[] = [
  {
    id: "PROFESOR",
    label: "Profesor",
    description: "Clases, agenda, alumnos, biblioteca y artista. Más Contactos.",
    modules: ["EDUCACION", "contacts", "conversations"],
  },
  {
    id: "COMERCIAL",
    label: "Comercial",
    description: "Ventas, embudo, contactos y campañas. Sin educación ni finanzas.",
    modules: ["VENTAS", "contacts", "conversations", "COMUNICACION"],
  },
  {
    id: "FINANZAS",
    label: "Finanzas",
    description: "Contabilidad, facturas y caja. Sin CRM ni educación.",
    modules: ["FINANZAS", "conversations"],
  },
];

const WORK_ROLE_IDS = new Set(WORK_ROLES.map((r) => r.id));

export function isWorkRole(id: unknown): id is string {
  return typeof id === "string" && WORK_ROLE_IDS.has(id);
}

/** Módulos asignables como extra (settings queda fuera a propósito). */
export const ASSIGNABLE_MODULES: readonly { id: string; label: string }[] = [
  { id: "EDUCACION", label: "Educación" },
  { id: "VENTAS", label: "Ventas" },
  { id: "FINANZAS", label: "Finanzas" },
  { id: "COMUNICACION", label: "Comunicación" },
  { id: "GESTION_EQUIPO", label: "Gestión de equipo" },
  { id: "DIRECCION", label: "Dirección" },
  { id: "COMPRAS_INTELIGENTES", label: "Compras inteligentes" },
  { id: "RESTAURANTE", label: "Restaurante" },
  { id: "HOTEL", label: "Hotel" },
  { id: "LOGISTICA", label: "Logística" },
  { id: "TECNOLOGICO", label: "Tech" },
  { id: "GESTION_PROYECTOS", label: "Gestión de proyectos" },
  { id: "ATENCION_CLIENTE", label: "Atención al cliente" },
  { id: "CREATIVO", label: "Creativo" },
  { id: "contacts", label: "Contactos" },
  { id: "conversations", label: "Conversaciones" },
];

const ASSIGNABLE_IDS = new Set(ASSIGNABLE_MODULES.map((m) => m.id));

export function isAssignableModule(id: unknown): id is string {
  return typeof id === "string" && ASSIGNABLE_IDS.has(id);
}

/** Base de todo empleado aunque no tenga roles: agenda de contactos y avisos. */
const BASE_MODULES = ["contacts", "conversations"];

export type ResolvedAccess = { all: true } | { all: false; modules: Set<string> };

export function resolveAccess(input: {
  role?: string | null;
  workRoles?: string[] | null;
  extraModules?: string[] | null;
}): ResolvedAccess {
  const role = (input.role || "").toUpperCase();
  if (role === "DEV" || role === "ADMIN") return { all: true };
  // Compat tokens antiguos (JWT previos al cambio): PROFESSOR/STAFF → USUARIO.
  const work = new Set<string>();
  for (const w of input.workRoles || []) if (isWorkRole(w)) work.add(w);
  if (role === "PROFESSOR") work.add("PROFESOR");
  const modules = new Set<string>(BASE_MODULES);
  for (const w of work) {
    const def = WORK_ROLES.find((r) => r.id === w);
    if (def) def.modules.forEach((m) => modules.add(m));
  }
  for (const m of input.extraModules || []) if (isAssignableModule(m)) modules.add(m);
  return { all: false, modules };
}

export function canAccessModule(access: ResolvedAccess, moduleId: string): boolean {
  if (access.all) return true;
  return access.modules.has(moduleId);
}

/** Etiquetas humanas del acceso (para la tarjeta "qué verá" de la ficha). */
export function describeAccess(access: ResolvedAccess): string[] {
  if (access.all) return ["Todo (acceso total)"];
  const labels = ASSIGNABLE_MODULES.filter((m) => access.modules.has(m.id)).map((m) => m.label);
  return labels.length ? labels : ["Sin módulos (solo panel principal)"];
}

/** Ruta → módulo requerido. null = sin restricción (login, panel, enlaces públicos). */
export function pathToModule(pathname: string): string | null {
  if (pathname === "/admin" || pathname === "/admin/") return null;
  const table: [string, string][] = [
    ["/admin/settings", "settings"],
    ["/api/admin/users", "settings"],
    ["/api/admin/credentials", "settings"],
    ["/api/admin/modes", "settings"],
    ["/api/admin/updates", "settings"],
    ["/api/admin/dashboard", "settings"],
    ["/api/admin/restore", "settings"],
    ["/admin/contacts", "contacts"],
    ["/admin/conversations", "conversations"],
    ["/admin/education", "EDUCACION"],
    ["/api/education", "EDUCACION"],
    ["/admin/sales", "VENTAS"],
    ["/admin/products", "VENTAS"],
    ["/admin/crm", "VENTAS"],
    ["/admin/communication", "COMUNICACION"],
    ["/admin/finance", "FINANZAS"],
    ["/admin/team", "GESTION_EQUIPO"],
    ["/admin/purchasing", "COMPRAS_INTELIGENTES"],
    ["/admin/restaurant", "RESTAURANTE"],
    ["/admin/hotel", "HOTEL"],
    ["/admin/logistics", "LOGISTICA"],
    ["/admin/tech", "TECNOLOGICO"],
    ["/admin/executive", "DIRECCION"],
    ["/admin/support", "ATENCION_CLIENTE"],
    ["/admin/projects", "GESTION_PROYECTOS"],
    ["/admin/creative", "CREATIVO"],
  ];
  for (const [prefix, mod] of table) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return mod;
  }
  return null;
}
