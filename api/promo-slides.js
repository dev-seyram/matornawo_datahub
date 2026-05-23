import { setCorsHeaders, requireAdmin } from '../lib/adminAuth.js';
import { ensureDb } from '../lib/db.js';
import { sendError } from '../lib/apiError.js';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

function normalizeHexColor(color) {
  if (typeof color !== 'string') return null;
  const trimmed = color.trim();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return HEX_COLOR.test(withHash) ? withHash.toLowerCase() : null;
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = await ensureDb();

    if (req.method === 'GET') {
      const slides = await db`
        SELECT * FROM promo_slides ORDER BY slide_index ASC
      `;
      return res.status(200).json(slides);
    }

    if (req.method === 'PATCH') {
      if (!requireAdmin(req, res)) return;
      const { slide_index, title, headline, background_color } = req.body ?? {};
      const index = Number(slide_index);
      if (![1, 2, 3].includes(index)) {
        return res.status(400).json({ error: 'slide_index must be 1, 2, or 3' });
      }

      const existing = await db`
        SELECT * FROM promo_slides WHERE slide_index = ${index}
      `;
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Slide not found' });
      }

      const nextTitle =
        title !== undefined ? String(title).trim().slice(0, 80) : existing[0].title;
      const nextHeadline =
        headline !== undefined
          ? String(headline).trim().slice(0, 120)
          : existing[0].headline;
      const nextColor =
        background_color !== undefined
          ? normalizeHexColor(background_color)
          : existing[0].background_color;

      if (!nextTitle || !nextHeadline) {
        return res.status(400).json({ error: 'Title and headline are required' });
      }
      if (background_color !== undefined && !nextColor) {
        return res.status(400).json({ error: 'background_color must be a hex color like #2563eb' });
      }

      const result = await db`
        UPDATE promo_slides
        SET title = ${nextTitle},
            headline = ${nextHeadline},
            background_color = ${nextColor ?? existing[0].background_color},
            updated_at = NOW()
        WHERE slide_index = ${index}
        RETURNING *
      `;
      return res.status(200).json(result[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return sendError(res, error, 'promo-slides');
  }
}
