/**
 * Instancia independiente: slug fijado por entorno.
 * En despliegues single-tenant (ej. Get Loud) define NEXT_PUBLIC_PINNED_TENANT_SLUG
 * y todo el cliente opera bajo ese slug aunque el hostname sea localhost plano.
 */
export function getPinnedSlugClient(): string | null {
  const pin = process.env.NEXT_PUBLIC_PINNED_TENANT_SLUG;
  return pin && pin.trim() ? pin.trim().toLowerCase() : null;
}

/** Fallback cuando el hostname no identifica tenant: pin > "gastroshows" legacy. */
export function getDefaultSlug(): string {
  return getPinnedSlugClient() ?? "gastroshows";
}

/**
 * Client-side utility to get tenant-specific localStorage keys based on hostname.
 */
export function getTenantStorageKey(baseKey: string): string {
  if (typeof window === "undefined") return baseKey;

  const pinned = getPinnedSlugClient();
  if (pinned) return `${baseKey}_${pinned}`;

  const hostname = window.location.hostname;
  const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1");
  let slug = getDefaultSlug();
  
  if (isLocalhost) {
    const parts = hostname.split(".");
    if (parts.length > 1 && parts[0] !== "localhost" && parts[0] !== "www") {
      slug = parts[0];
    }
  } else {
    const parts = hostname.split(".");
    if (parts.length > 2 && parts[0] !== "www") {
      slug = parts[0];
    }
  }
  
  return `${baseKey}_${slug.toLowerCase()}`;
}

export function getTenantSlugClient(): string {
  const pinned = typeof window !== "undefined" ? getPinnedSlugClient() : null;
  if (pinned) return pinned;
  if (typeof window === "undefined") return getDefaultSlug();

  const hostname = window.location.hostname;
  const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1");
  let slug = getDefaultSlug();
  
  if (isLocalhost) {
    const parts = hostname.split(".");
    if (parts.length > 1 && parts[0] !== "localhost" && parts[0] !== "www") {
      slug = parts[0];
    }
  } else {
    const parts = hostname.split(".");
    if (parts.length > 2 && parts[0] !== "www") {
      slug = parts[0];
    }
  }
  
  return slug.toLowerCase();
}