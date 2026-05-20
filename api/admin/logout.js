import { setCorsHeaders, clearAuthCookie } from '../../lib/adminAuth.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  clearAuthCookie(res);
  return res.status(200).json({ ok: true });
}
