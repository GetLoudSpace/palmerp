export const EDU_TRASH_RETENTION_DAYS = 30;

export function getTrashExpiresAt(from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + EDU_TRASH_RETENTION_DAYS);
  return d;
}

export function isTrashExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt);
}
