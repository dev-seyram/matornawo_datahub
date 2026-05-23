const ORDER_STATUSES = new Set(['Pending', 'Processing', 'Delivered', 'Failed']);
const NETWORKS = new Set(['MTN', 'AirtelTigo', 'Telecel']);
const NETWORK_STATES = new Set(['active', 'disabled', 'closed']);

export function validateEmail(email) {
  const value = String(email ?? '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
  return value;
}

export function validatePhone(phone) {
  const value = String(phone ?? '').trim();
  if (!/^0\d{9}$/.test(value)) return null;
  return value;
}

export function validateOrderId(orderId) {
  const value = String(orderId ?? '').trim().toUpperCase();
  if (!/^ORD-[A-Z0-9]{8}$/.test(value)) return null;
  return value;
}

export function validateOrderStatus(status) {
  const value = String(status ?? '').trim();
  if (!ORDER_STATUSES.has(value)) return null;
  return value;
}

export function validateNetwork(network) {
  const value = String(network ?? '').trim();
  if (!NETWORKS.has(value)) return null;
  return value;
}

export function validateNetworkState(state) {
  const value = String(state ?? '').trim();
  if (!NETWORK_STATES.has(value)) return null;
  return value;
}

export function calculateFees(price) {
  const bundlePrice = Number(price);
  if (!Number.isFinite(bundlePrice) || bundlePrice <= 0) return null;
  const serviceFee = Math.round(bundlePrice * 0.02 * 100) / 100;
  const total = Math.round((bundlePrice + serviceFee) * 100) / 100;
  return { price: bundlePrice, serviceFee, total };
}
