import {
  setCorsHeaders,
  verifyAdminPassword,
  signAdminToken,
  setAuthCookie,
} from '../../lib/adminAuth.js';
import { rateLimit } from '../../lib/rateLimit.js';
import { sendError } from '../../lib/apiError.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(`admin-login:${ip}`, 5, 15 * 60_000)) {
    return res.status(429).json({ error: 'Too many login attempts' });
  }

  try {
    const { password } = req.body ?? {};
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (!verifyAdminPassword(password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signAdminToken();
    setAuthCookie(res, token);
    return res.status(200).json({ ok: true });
  } catch (error) {
    return sendError(res, error, 'admin/login');
  }
}
