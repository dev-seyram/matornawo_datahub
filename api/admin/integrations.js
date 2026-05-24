import { setCorsHeaders, requireAdmin } from '../../lib/adminAuth.js';
import { sendError } from '../../lib/apiError.js';
import { getPaystackSecretStatus } from '../../lib/paystack.js';
import { isAdminNotifyConfigured } from '../../lib/notifyAdmin.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAdmin(req, res)) return;

  try {
    const paystack = getPaystackSecretStatus();
    const telegram = isAdminNotifyConfigured();
    return res.status(200).json({
      paystack,
      telegram: {
        configured: telegram,
        reason: telegram
          ? null
          : 'Set TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID in Vercel environment variables.',
      },
      ready: paystack.valid && telegram,
    });
  } catch (error) {
    return sendError(res, error, 'admin/integrations');
  }
}
