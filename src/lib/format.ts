const STATUS_UPDATE_THRESHOLD_MS = 60_000;

export function formatOrderDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GH', {
    timeZone: 'Africa/Accra',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function showStatusUpdatedAt(placedAt: string, updatedAt: string): boolean {
  const placed = new Date(placedAt).getTime();
  const updated = new Date(updatedAt).getTime();
  if (!Number.isFinite(placed) || !Number.isFinite(updated)) return false;
  return Math.abs(updated - placed) > STATUS_UPDATE_THRESHOLD_MS;
}

export function buildWhatsAppUrl(supportNumber: string, text: string): string {
  return `https://wa.me/${supportNumber}?text=${encodeURIComponent(text)}`;
}
