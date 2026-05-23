import { notifyAdminNewOrder } from './notifyAdmin.js';

export function toPublicOrder(row) {
  const phone = String(row.recipient_phone ?? '');
  const masked = phone.length >= 4 ? `******${phone.slice(-4)}` : '****';
  return {
    order_id: row.order_id,
    network: row.network,
    package: row.package,
    status: row.status,
    created_at: row.created_at,
    recipient_phone: masked,
  };
}

export async function createVerifiedOrder(db, fields) {
  const {
    order_id,
    network,
    package: pkg,
    price,
    service_fee,
    total,
    recipient_phone,
    email,
    paystack_reference,
  } = fields;

  const inserted = await db`
    INSERT INTO orders (
      order_id, network, package, price, service_fee, total,
      recipient_phone, email, status, paystack_reference
    )
    VALUES (
      ${order_id}, ${network}, ${pkg}, ${price}, ${service_fee}, ${total},
      ${recipient_phone}, ${email}, 'Pending', ${paystack_reference}
    )
    ON CONFLICT (order_id) DO NOTHING
    RETURNING *
  `;

  if (inserted.length > 0) {
    try {
      await notifyAdminNewOrder(inserted[0]);
    } catch (err) {
      console.error(
        JSON.stringify({
          level: 'error',
          context: 'notifyAdminNewOrder',
          message: err?.message ?? String(err),
        })
      );
    }
    return { order: inserted[0], created: true };
  }

  const existing = await db`
    SELECT * FROM orders WHERE order_id = ${order_id} LIMIT 1
  `;
  return { order: existing[0] ?? null, created: false };
}
