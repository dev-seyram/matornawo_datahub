import { neon } from '@neondatabase/serverless';
import { setCorsHeaders, requireAdmin } from '../lib/adminAuth.js';
import { notifyAdminNewOrder } from '../lib/notifyAdmin.js';

const sql = neon(process.env.DATABASE_URL);

async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_id TEXT UNIQUE NOT NULL,
      network TEXT NOT NULL,
      package TEXT NOT NULL,
      price NUMERIC NOT NULL,
      service_fee NUMERIC NOT NULL,
      total NUMERIC NOT NULL,
      recipient_phone TEXT NOT NULL,
      email TEXT NOT NULL,
      status TEXT DEFAULT 'Pending',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await initDB();

    if (req.method === 'GET') {
      const rawId = req.query?.order_id;
      const orderId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (orderId) {
        const rows = await sql`
          SELECT * FROM orders WHERE order_id = ${String(orderId).toUpperCase()}
        `;
        if (rows.length === 0) {
          return res.status(404).json({ error: 'Order not found' });
        }
        return res.status(200).json(rows[0]);
      }
      if (!requireAdmin(req, res)) return;
      const orders = await sql`SELECT * FROM orders ORDER BY created_at DESC`;
      return res.status(200).json(orders);
    }

    if (req.method === 'POST') {
      const { order_id, network, package: pkg, price, service_fee, total, recipient_phone, email } = req.body;
      const result = await sql`
        INSERT INTO orders (order_id, network, package, price, service_fee, total, recipient_phone, email, status)
        VALUES (${order_id}, ${network}, ${pkg}, ${price}, ${service_fee}, ${total}, ${recipient_phone}, ${email}, 'Pending')
        RETURNING *
      `;
      const saved = result[0];
      try {
        await notifyAdminNewOrder(saved);
      } catch (err) {
        console.error('Failed to notify admin of new order:', err);
      }
      return res.status(201).json(saved);
    }

    if (req.method === 'PATCH') {
      if (!requireAdmin(req, res)) return;
      const { order_id, status } = req.body;
      const result = await sql`
        UPDATE orders SET status = ${status} WHERE order_id = ${order_id} RETURNING *
      `;
      return res.status(200).json(result[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: error.message });
  }
}
