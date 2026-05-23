import { neon } from '@neondatabase/serverless';

export default async function handler(_req, res) {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(503).json({ ok: false, database: 'not_configured' });
    }
    const sql = neon(process.env.DATABASE_URL);
    await sql`SELECT 1`;
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(503).json({ ok: false });
  }
}
