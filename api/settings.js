import { setCorsHeaders, requireAdmin } from '../lib/adminAuth.js';
import { ensureDb } from '../lib/db.js';
import { sendError } from '../lib/apiError.js';
import { validateNetwork, validateNetworkState } from '../lib/validate.js';

const DEFAULT_BUSINESS_NAME = 'MATOE CONNECT';
const MAX_BUSINESS_NAME_LENGTH = 80;
const DEFAULT_NETWORK_STATES = {
  MTN: 'active',
  AirtelTigo: 'disabled',
  Telecel: 'disabled',
};

function normalizeBusinessName(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_BUSINESS_NAME_LENGTH) return null;
  return trimmed;
}

function normalizeNetworkStates(value) {
  if (!value || typeof value !== 'object') return null;
  const next = { ...DEFAULT_NETWORK_STATES };
  for (const network of ['MTN', 'AirtelTigo', 'Telecel']) {
    if (value[network] === undefined) continue;
    const state = validateNetworkState(value[network]);
    if (!validateNetwork(network) || !state) return null;
    next[network] = state;
  }
  return next;
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = await ensureDb();

    if (req.method === 'GET') {
      const rows = await db`SELECT * FROM site_settings WHERE id = 1`;
      const row = rows[0];
      return res.status(200).json({
        business_name: row.business_name,
        whatsapp_order_reminder_enabled: row.whatsapp_order_reminder_enabled,
        network_states: row.network_states ?? DEFAULT_NETWORK_STATES,
        updated_at: row.updated_at,
      });
    }

    if (req.method === 'PATCH') {
      if (!requireAdmin(req, res)) return;

      const existing = await db`SELECT * FROM site_settings WHERE id = 1`;
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Settings not found' });
      }

      const { business_name, whatsapp_order_reminder_enabled, network_states } = req.body ?? {};
      let nextName = existing[0].business_name;
      let nextReminder = existing[0].whatsapp_order_reminder_enabled;
      let nextNetworkStates = existing[0].network_states ?? DEFAULT_NETWORK_STATES;

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

      if (network_states !== undefined) {
        const normalizedStates = normalizeNetworkStates(network_states);
        if (!normalizedStates) {
          return res.status(400).json({ error: 'Invalid network_states payload' });
        }
        nextNetworkStates = normalizedStates;
      }

      const result = await db`
        UPDATE site_settings
        SET business_name = ${nextName},
            whatsapp_order_reminder_enabled = ${nextReminder},
            network_states = ${nextNetworkStates},
            updated_at = NOW()
        WHERE id = 1
        RETURNING *
      `;
      return res.status(200).json({
        business_name: result[0].business_name,
        whatsapp_order_reminder_enabled: result[0].whatsapp_order_reminder_enabled,
        network_states: result[0].network_states,
        updated_at: result[0].updated_at,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return sendError(res, error, 'settings');
  }
}
