import {
  setCorsHeaders,
  verifyAdminPassword,
  signAdminToken,
  setAuthCookie,
} from '../../lib/adminAuth.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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
    console.error('Admin login error:', error);
    return res.status(500).json({ error: 'Authentication is not configured' });
  }
}
