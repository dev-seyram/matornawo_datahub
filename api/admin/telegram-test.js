import { setCorsHeaders, requireAdmin } from '../../lib/adminAuth.js';
import { sendTelegramTestMessage } from '../../lib/notifyAdmin.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAdmin(req, res)) return;

  try {
    await sendTelegramTestMessage();
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Telegram test failed:', error);
    return res.status(500).json({ error: error.message });
  }
}
