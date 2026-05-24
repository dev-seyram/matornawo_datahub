import { setCorsHeaders } from '../../lib/adminAuth.js';
import { ensureDb } from '../../lib/db.js';
import { sendError } from '../../lib/apiError.js';
import { rateLimit } from '../../lib/rateLimit.js';
import {
  validateEmail,
  validateNetwork,
  validateOrderId,
  validatePhone,
} from '../../lib/validate.js';
import { resolveOrderPricing } from '../../lib/orderPricing.js';
import { createVerifiedOrder } from '../../lib/orders.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(`paystack-verify:${ip}`, 15, 60_000)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  try {
    const secret = process.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!secret) {
      return res.status(503).json({ error: 'Payment verification unavailable' });
    }

    const body = req.body ?? {};
    const orderId = validateOrderId(body.order_id);
    const network = validateNetwork(body.network);
    const packageSize = String(body.package ?? '').trim();
    const recipientPhone = validatePhone(body.recipient_phone);
    const email = validateEmail(body.email);
    const reference = String(body.reference ?? '').trim();

    if (!orderId || !network || !packageSize || !recipientPhone || !email || !reference) {
      return res.status(400).json({ error: 'Invalid payment verification payload' });
    }

    if (reference.toUpperCase() !== orderId) {
      return res.status(400).json({ error: 'Payment reference mismatch' });
    }

    const db = await ensureDb();
    const pricing = await resolveOrderPricing(db, network, packageSize);
    if (!pricing) {
      return res.status(400).json({ error: 'Unknown package' });
    }

    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } }
    );
    const payload = await verifyRes.json();

    if (!verifyRes.ok || !payload?.status || payload.data?.status !== 'success') {
      return res.status(400).json({ error: 'Payment not verified' });
    }

    const tx = payload.data;
    if (tx.currency !== 'GHS') {
      return res.status(400).json({ error: 'Invalid payment currency' });
    }

    const expectedKobo = Math.round(pricing.total * 100);
    if (Number(tx.amount) !== expectedKobo) {
      return res.status(400).json({ error: 'Payment amount mismatch' });
    }

    const { order, created } = await createVerifiedOrder(db, {
      order_id: orderId,
      network,
      package: packageSize,
      price: pricing.price,
      service_fee: pricing.serviceFee,
      total: pricing.total,
      recipient_phone: recipientPhone,
      email,
      paystack_reference: reference,
    });

    if (!order) {
      return res.status(500).json({ error: 'Failed to record order' });
    }

    return res.status(created ? 201 : 200).json({
      order_id: order.order_id,
      status: order.status,
      created,
    });
  } catch (error) {
    return sendError(res, error, 'paystack/verify');
  }
}
