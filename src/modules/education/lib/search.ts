// Brave Search wrapper + cache hashing + LLM normalizer prompt
export function buildSearchQueryHash(tenantId: string, q: unknown): string {
  const s = JSON.stringify(q);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `${tenantId}_${Math.abs(h).toString(36)}`;
}

export interface SearchQuery {
  instrument: string;
  level?: string;
  skill?: string;
  text?: string;
  durationMax?: number;
}

export function buildBraveQuery(q: SearchQuery): string {
  const parts = [q.text ?? "", q.instrument !== "COMMON" ? q.instrument : "", q.skill ?? "", q.level ?? ""].filter(Boolean);
  return parts.join(" ").trim() + " ejercicio tablatura tutorial";
}

export const NORMALIZER_SYSTEM_PROMPT = `Eres un normalizador de ejercicios musicales. Dada una fuente (titulo, snippet, url, tipo), devuelve JSON con: {title, instrument (GUITARRA|BAJO|PIANO|BATERIA|VOZ|COMMON), level (INICIACION|BASICO|INTERMEDIO|AVANZADO), difficulty 1-5, estimatedMin (5-30), skillKeys array, description 120-280c, tabContent (tablatura en texto si existe, si no null), sourceUrl, sourceType (VIDEO|BLOG|TAB|IMAGE)}. Si falta dato, infiere razonable. Responde solo JSON.`;
