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
import { getPaystackSecret } from '../../lib/paystack.js';

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
    let secret;
    try {
      secret = getPaystackSecret();
    } catch (err) {
      console.error(
        JSON.stringify({
          level: 'error',
          context: 'paystack/verify',
          message: 'Paystack secret misconfigured',
          detail: err?.message,
        })
      );
      return res.status(503).json({
        error:
          'Payment verification is temporarily unavailable. Your payment may have succeeded — save your Order ID and contact support.',
        code: 'paystack_misconfigured',
      });
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
      console.error(
        JSON.stringify({
          level: 'error',
          context: 'paystack/verify',
          message: 'Paystack verification failed',
          httpStatus: verifyRes.status,
          statusText: verifyRes.statusText,
          payload,
          reference,
        })
      );

      if (verifyRes.status === 401 || payload?.code === 'invalid_Key') {
        return res.status(503).json({
          error:
            'Payment received but could not be confirmed automatically. Save your Order ID and contact support — we will verify manually.',
          code: 'paystack_auth_failed',
        });
      }

      const errorMessage = payload?.message || payload?.data?.message || 'Payment not verified';
      return res.status(400).json({ error: errorMessage });
    }

    const tx = payload.data;
    if (tx.currency !== 'GHS') {
      return res.status(400).json({ error: 'Invalid payment currency' });
    }

    const expectedKobo = Math.round(pricing.total * 100);
    if (Number(tx.amount) !== expectedKobo) {
      console.error(JSON.stringify({
        level: 'error',
        context: 'paystack/verify',
        message: 'Payment amount mismatch',
        expected_pesewas: expectedKobo,
        received_pesewas: tx.amount,
        pricing,
      }));
      return res.status(400).json({ error: 'Payment amount mismatch' });
    }

    let order;
    let created;
    try {
      const result = await createVerifiedOrder(db, {
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
      order = result.order;
      created = result.created;
    } catch (err) {
      console.error(
        JSON.stringify({
          level: 'error',
          context: 'paystack/verify',
          message: 'Failed to create verified order',
          order_id: orderId,
          paystack_reference: reference,
          error: err?.message ?? String(err),
          stack: err?.stack,
        })
      );
      return res.status(500).json({ error: 'Failed to record order', details: err?.message ?? 'Order insert error' });
    }

    if (!order) {
      console.error(
        JSON.stringify({
          level: 'error',
          context: 'paystack/verify',
          message: 'Order creation returned no order',
          order_id: orderId,
          created,
        })
      );
      return res.status(500).json({ error: 'Failed to record order' });
    }

    console.log(
      JSON.stringify({
        level: 'info',
        context: 'paystack/verify',
        message: 'ORDER SAVED',
        order_id: order.order_id,
        created,
      })
    );

    return res.status(created ? 201 : 200).json({
      order_id: order.order_id,
      status: order.status,
      created,
    });
  } catch (error) {
    return sendError(res, error, 'paystack/verify');
  }
}
