import { setCorsHeaders, requireAdmin } from '../lib/adminAuth.js';
import { ensureDb } from '../lib/db.js';
import { sendError } from '../lib/apiError.js';
import { rateLimit } from '../lib/rateLimit.js';
import { parsePublicTrackQuery } from '../lib/orderTrack.js';
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
      const trackQuery = parsePublicTrackQuery(req.query);

      if (trackQuery.kind !== 'none') {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
        if (!rateLimit(`orders-track:${ip}`, 30, 60_000)) {
          return res.status(429).json({ error: 'Too many requests' });
        }

        if (trackQuery.kind === 'invalid') {
          return res.status(400).json({ error: trackQuery.error });
        }

        if (trackQuery.kind === 'orderId') {
          const orderId = validateOrderId(trackQuery.orderIdInput);
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

        const phone = validatePhone(trackQuery.phoneInput);
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
        UPDATE orders SET status = ${status}, updated_at = NOW()
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
