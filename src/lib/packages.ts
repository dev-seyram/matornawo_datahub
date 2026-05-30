import { PACKAGES_STORAGE_KEY } from '../constants';
import type { Network, Package } from '../types';

export function loadCachedPackages(): Package[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PACKAGES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as Package[];
  } catch {
    // ignore
  }
  return [];
}

export function packageKey(pkg: { network: Network; size: string }) {
  return `${pkg.network}|${pkg.size}`;
}

export function packagesHaveMismatch(current: Package[], fresh: Package[]): boolean {
  const freshPrices = new Map(fresh.map((p) => [packageKey(p), p.price]));
  for (const pkg of current) {
    const dbPrice = freshPrices.get(packageKey(pkg));
    if (dbPrice === undefined || Math.abs(pkg.price - dbPrice) > 0.001) {
      return true;
    }
  }
  return false;
}
