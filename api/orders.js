import { setCorsHeaders, requireAdmin } from '../lib/adminAuth.js';
import { ensureDb } from '../lib/db.js';
import { sendError } from '../lib/apiError.js';
import {
  validateOrderId,
  validateOrderStatus,
  validatePhone,
} from '../lib/validate.js';
import { toPublicOrder } from '../lib/orders.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = await ensureDb();

    if (req.method === 'GET') {
      const rawId = req.query?.order_id;
      const rawPhone = req.query?.phone;
      const orderIdInput = Array.isArray(rawId) ? rawId[0] : rawId;
      const phoneInput = Array.isArray(rawPhone) ? rawPhone[0] : rawPhone;
      const hasOrderIdParam = orderIdInput !== undefined && String(orderIdInput).trim() !== '';
      const hasPhoneParam = phoneInput !== undefined && String(phoneInput).trim() !== '';

      if (hasOrderIdParam || hasPhoneParam) {
        if (hasOrderIdParam && hasPhoneParam) {
          return res.status(400).json({
            error: 'Provide either order_id or phone, not both',
          });
        }

        if (hasOrderIdParam) {
          const orderId = validateOrderId(orderIdInput);
          if (!orderId) {
            return res.status(400).json({ error: 'Invalid order ID format' });
          }

          const rows = await db`
            SELECT * FROM orders
            WHERE order_id = ${orderId}
            LIMIT 1
          `;
          if (rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
          }
          return res.status(200).json(toPublicOrder(rows[0]));
        }

        const phone = validatePhone(phoneInput);
        if (!phone) {
          return res.status(400).json({ error: 'Invalid phone number format' });
        }

        const rows = await db`
          SELECT * FROM orders
          WHERE recipient_phone = ${phone}
          ORDER BY created_at DESC
          LIMIT 50
        `;
        return res.status(200).json(rows.map(toPublicOrder));
      }

      if (!requireAdmin(req, res)) return;

      const limit = Math.min(Math.max(Number(req.query?.limit) || 50, 1), 100);
      const offset = Math.max(Number(req.query?.offset) || 0, 0);
      const orders = await db`
        SELECT * FROM orders
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      return res.status(200).json(orders);
    }

    if (req.method === 'PATCH') {
      if (!requireAdmin(req, res)) return;
      const orderId = validateOrderId(req.body?.order_id);
      const status = validateOrderStatus(req.body?.status);
      if (!orderId || !status) {
        return res.status(400).json({ error: 'Invalid order update payload' });
      }

      const result = await db`
        UPDATE orders SET status = ${status}
        WHERE order_id = ${orderId}
        RETURNING *
      `;
      if (result.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      return res.status(200).json(result[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return sendError(res, error, 'orders');
  }
}
