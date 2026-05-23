import { neon } from '@neondatabase/serverless';
import { setCorsHeaders, requireAdmin } from '../lib/adminAuth.js';

const sql = neon(process.env.DATABASE_URL);
const DEFAULT_BUSINESS_NAME = 'MATOE CONNECT';
const MAX_BUSINESS_NAME_LENGTH = 80;

async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS site_settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      business_name TEXT NOT NULL DEFAULT 'MATOE CONNECT',
      whatsapp_order_reminder_enabled BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    INSERT INTO site_settings (id, business_name, whatsapp_order_reminder_enabled)
    VALUES (1, ${DEFAULT_BUSINESS_NAME}, true)
    ON CONFLICT (id) DO NOTHING
  `;
}

function normalizeBusinessName(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_BUSINESS_NAME_LENGTH) return null;
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
      const rows = await sql`SELECT * FROM site_settings WHERE id = 1`;
      const row = rows[0];
      return res.status(200).json({
        business_name: row.business_name,
        whatsapp_order_reminder_enabled: row.whatsapp_order_reminder_enabled,
        updated_at: row.updated_at,
      });
    }

    if (req.method === 'PATCH') {
      if (!requireAdmin(req, res)) return;

      const existing = await sql`SELECT * FROM site_settings WHERE id = 1`;
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Settings not found' });
      }

      const { business_name, whatsapp_order_reminder_enabled } = req.body ?? {};
      let nextName = existing[0].business_name;
      let nextReminder = existing[0].whatsapp_order_reminder_enabled;

      if (business_name !== undefined) {
        const normalized = normalizeBusinessName(business_name);
        if (!normalized) {
          return res.status(400).json({
            error: `business_name is required (max ${MAX_BUSINESS_NAME_LENGTH} characters)`,
          });
        }
        nextName = normalized;
      }

      if (whatsapp_order_reminder_enabled !== undefined) {
        nextReminder = Boolean(whatsapp_order_reminder_enabled);
      }

      const result = await sql`
        UPDATE site_settings
        SET business_name = ${nextName},
            whatsapp_order_reminder_enabled = ${nextReminder},
            updated_at = NOW()
        WHERE id = 1
        RETURNING *
      `;
      return res.status(200).json({
        business_name: result[0].business_name,
        whatsapp_order_reminder_enabled: result[0].whatsapp_order_reminder_enabled,
        updated_at: result[0].updated_at,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Settings API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
