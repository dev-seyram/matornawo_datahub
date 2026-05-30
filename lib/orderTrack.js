/**
 * Parse public GET /api/orders tracking query (order_id XOR phone).
 * @returns {{ kind: 'none' } | { kind: 'invalid', error: string } | { kind: 'orderId', orderIdInput: string } | { kind: 'phone', phoneInput: string }}
 */
export function parsePublicTrackQuery(query) {
  const rawId = query?.order_id;
  const rawPhone = query?.phone;
  const orderIdInput = Array.isArray(rawId) ? rawId[0] : rawId;
  const phoneInput = Array.isArray(rawPhone) ? rawPhone[0] : rawPhone;
  const hasOrderIdParam = orderIdInput !== undefined && String(orderIdInput).trim() !== '';
  const hasPhoneParam = phoneInput !== undefined && String(phoneInput).trim() !== '';

  if (!hasOrderIdParam && !hasPhoneParam) {
    return { kind: 'none' };
  }

  if (hasOrderIdParam && hasPhoneParam) {
    return { kind: 'invalid', error: 'Provide either order_id or phone, not both' };
  }

  if (hasOrderIdParam) {
    return { kind: 'orderId', orderIdInput: String(orderIdInput).trim() };
  }

  return { kind: 'phone', phoneInput: String(phoneInput).trim() };
}
