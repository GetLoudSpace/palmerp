import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PLATFORM_SUBDOMAINS = new Set(["app", "platform", "superadmin", "www"]);
const RESERVED_SUBDOMAINS = new Set(["api", "admin", "login", "register", "_next", "favicon"]);

// Instancia independiente: PINNED_TENANT_SLUG fija el único tenant servido.
// (Inline aquí porque el middleware es Edge y no puede importar lib con Prisma.)
function getPinnedTenant(): string | null {
  const pin = process.env.PINNED_TENANT_SLUG;
  return pin && pin.trim() ? pin.trim().toLowerCase() : null;
}

function isSuperadminAllowed(): boolean {
  if (process.env.ALLOW_SUPERADMIN === "true") return true;
  if (process.env.ALLOW_SUPERADMIN === "false") return false;
  return getPinnedTenant() === null;
}

function getHostnameParts(hostHeader: string): string[] {
  return hostHeader.split(":")[0]?.split(".").filter(Boolean) ?? [];
}

function getPlatformUrl(req: NextRequest, pathname: string): URL {
  if (process.env.PALMERA_PLATFORM_URL) {
    return new URL(pathname, process.env.PALMERA_PLATFORM_URL);
  }
  const url = new URL(pathname, req.url);
  const host = req.headers.get("host") || "";
  const parts = getHostnameParts(host);
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    url.hostname = "localhost";
    return url;
  }
  if (parts.length > 2) {
    url.hostname = parts.slice(1).join(".");
  }
  return url;
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostname = req.headers.get("host") || "";
  const hostnameParts = getHostnameParts(hostname);
  const firstHostPart = hostnameParts[0] ?? "";
  const hostLower = hostname.toLowerCase();

  // Vercel preview / Supabase edge cases: *.vercel.app, *.supabase.co nunca son tenant
  const isVercelPreview = hostLower.includes(".vercel.app");
  const isSupabaseHost = hostLower.includes(".supabase.");

  // Detectar si es localhost / dev
  const isLocalhost = hostLower.includes("localhost") || hostLower.includes("127.0.0.1") || isVercelPreview;

  let tenantSlug = "";
  let isPlatformRoute = false;

  if (isLocalhost) {
    // gastroshows.localhost:3000  → tenantSlug = gastroshows
    // <slug>.vercel.app con query ?tenant= o header? En preview forzamos plataforma salvo subdominio explícito no-reservado
    if (
      hostnameParts.length > 1 &&
      firstHostPart !== "localhost" &&
      !PLATFORM_SUBDOMAINS.has(firstHostPart) &&
      !RESERVED_SUBDOMAINS.has(firstHostPart) &&
      !isSupabaseHost
    ) {
      // En vercel preview tenant via subdominio no es fiable; tratar como plataforma si no hay DB
      // pero si host es foo.localhost, sí es tenant
      if (hostLower.includes("localhost") || hostLower.includes("127.0.0.1")) {
        tenantSlug = firstHostPart.toLowerCase();
      } else if (isVercelPreview) {
        // preview: sin subdominio tenant fiable → plataforma
        isPlatformRoute = true;
      } else {
        tenantSlug = firstHostPart.toLowerCase();
      }
    } else {
      isPlatformRoute = true;
    }
  } else {
    // Producción: *.tudominio.com wildcard (Vercel wildcard domain)
    // tudominio.com, www.tudominio.com → plataforma
    // cliente.tudominio.com → tenant
    if (hostnameParts.length > 2 && !PLATFORM_SUBDOMAINS.has(firstHostPart) && !RESERVED_SUBDOMAINS.has(firstHostPart)) {
      tenantSlug = firstHostPart.toLowerCase();
    } else {
      isPlatformRoute = true;
    }
  }

  const isAdminRoute = url.pathname.startsWith("/admin");
  const isSuperadminRoute =
    url.pathname.startsWith("/superadmin") || url.pathname.startsWith("/api/superadmin");
  const isLoginRoute = url.pathname === "/login";
  const isRegisterRoute = url.pathname === "/register";
  const isTenantNotFoundRoute = url.pathname === "/tenant-not-found";
  const isApiRoute = url.pathname.startsWith("/api/");
  const isAuthApi = url.pathname.startsWith("/api/auth");

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Instancia pineada: este despliegue SOLO sirve a su tenant. Se ignora
  // cualquier subdominio/slug ajeno (belpane/gastroshows no existen aquí).
  const pinned = getPinnedTenant();
  if (pinned) {
    tenantSlug = pinned;
    isPlatformRoute = false;
  }

  // Consola fleet global: prohibida en instancia pineada (lista TODOS los
  // clientes de la DB compartida → fuga entre instancias).
  if (isSuperadminRoute && pinned && !isSuperadminAllowed()) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Superadmin disabled on pinned instance" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  // Sesión de otro tenant reutilizada aquí (cookie importada de otro despliegue):
  // denegar APIs aunque el JWT sea válido en origen.
  if (pinned && isApiRoute && !isAuthApi && token && (token as any).tenantSlug !== pinned) {
    return NextResponse.json({ error: "TenantMismatch" }, { status: 401 });
  }

  // Headers internos para server components / API
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-tenant-slug", tenantSlug);
  requestHeaders.set("x-is-platform", String(isPlatformRoute));

  // Rutas plataforma: permitir sin validación de tenant existente
  if (isPlatformRoute) {
    // Bloquear superadmin solo si no hay token? superadmin es global, se permite siempre en plataforma
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Ruta tenant: validar que tenantSlug no esté vacío ya está hecho; ahora manejar protección
  if (isSuperadminRoute) {
    // Tenant nunca puede acceder a /superadmin → redirect a plataforma (root)
    return NextResponse.redirect(getPlatformUrl(req, "/superadmin"));
  }

  // Nota: validación de existencia de tenant (404 controlado) no puede hacerse en Edge sin DB
  // por limitación de no usar Prisma en middleware. Se delega a layout/API con header x-tenant-slug
  // que verifica contra `Tenant` y responde 404 si no existe, NUNCA fallback silencioso.
  // Aquí solo inyectamos el slug; la verificación de existencia ocurre en server components via `src/lib/tenant.ts`
  // y en APIs con `where: { tenantId }`.

  if (isAdminRoute) {
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", url.pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (token.tenantSlug !== tenantSlug) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("error", "TenantMismatch");
      return NextResponse.redirect(loginUrl);
    }
  }

  if ((isLoginRoute || isRegisterRoute) && token) {
    if (token.tenantSlug === tenantSlug) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  // Evitar loop en /tenant-not-found
  if (isTenantNotFoundRoute) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    /*
     * Match all routes except static assets and Next internals.
     * Necesario para inyectar x-tenant-slug globalmente (wildcard subdominio Vercel).
     * Middleware sigue permitiendo rutas plataforma sin validación DB; solo protege /admin y /superadmin.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
