import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import { setCorsHeaders, requireAdmin, isAdminRequest } from '../lib/adminAuth.js';

const sql = neon(process.env.DATABASE_URL);
const MAX_MESSAGE_LENGTH = 500;

async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS notices (
      id SERIAL PRIMARY KEY,
      notice_id TEXT UNIQUE NOT NULL,
      message TEXT NOT NULL,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

function newNoticeId() {
  return `notice-${crypto.randomUUID()}`;
}

function normalizeMessage(message) {
  if (typeof message !== 'string') return null;
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) return null;
  return trimmed;
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await initDB();

    if (req.method === 'GET') {
      const notices = isAdminRequest(req)
        ? await sql`SELECT * FROM notices ORDER BY created_at DESC`
        : await sql`SELECT * FROM notices WHERE active = true ORDER BY created_at DESC`;
      return res.status(200).json(notices);
    }

    if (req.method === 'POST') {
      if (!requireAdmin(req, res)) return;
      const message = normalizeMessage(req.body?.message);
      if (!message) {
        return res.status(400).json({ error: 'Message is required (max 500 characters)' });
      }
      const notice_id = newNoticeId();
      const result = await sql`
        INSERT INTO notices (notice_id, message, active)
        VALUES (${notice_id}, ${message}, true)
        RETURNING *
      `;
      return res.status(201).json(result[0]);
    }

    if (req.method === 'PATCH') {
      if (!requireAdmin(req, res)) return;
      const { notice_id, message, active } = req.body ?? {};
      if (!notice_id || typeof notice_id !== 'string') {
        return res.status(400).json({ error: 'notice_id is required' });
      }

      const existing = await sql`SELECT * FROM notices WHERE notice_id = ${notice_id}`;
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Notice not found' });
      }

      let nextMessage = existing[0].message;
      if (message !== undefined) {
        const normalized = normalizeMessage(message);
        if (!normalized) {
          return res.status(400).json({ error: 'Message is required (max 500 characters)' });
        }
        nextMessage = normalized;
      }

      const nextActive =
        active === undefined ? existing[0].active : Boolean(active);

      const result = await sql`
        UPDATE notices
        SET message = ${nextMessage}, active = ${nextActive}, updated_at = NOW()
        WHERE notice_id = ${notice_id}
        RETURNING *
      `;
      return res.status(200).json(result[0]);
    }

    if (req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      const { notice_id } = req.body ?? {};
      if (!notice_id || typeof notice_id !== 'string') {
        return res.status(400).json({ error: 'notice_id is required' });
      }
      await sql`DELETE FROM notices WHERE notice_id = ${notice_id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Notices API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
