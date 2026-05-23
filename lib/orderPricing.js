import { calculateFees } from './validate.js';
import { lookupPackagePrice } from './db.js';

export async function resolveOrderPricing(db, network, packageSize) {
  const price = await lookupPackagePrice(db, network, packageSize);
  if (price == null) return null;
  return calculateFees(price);
}
