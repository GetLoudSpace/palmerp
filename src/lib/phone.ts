export function normalizePhoneES(raw: string): string {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  // Si es 9 dígitos (ES sin prefijo), antepone 34
  if (digits.length === 9) digits = "34" + digits;
  // Si es 11 y empieza por 34 ya está ok
  // Si empieza por 0034 -> quita 00
  if (digits.startsWith("0034") && digits.length === 13) digits = digits.slice(2);
  return digits;
}

export function validatePhoneES(normalized: string): boolean {
  return /^34\d{9}$/.test(normalized);
}
